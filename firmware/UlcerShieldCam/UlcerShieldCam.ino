/*
 * ============================================================================
 *  UlcerShield AI  -  Bed camera  -  ESP32-CAM (AI Thinker / HW-818)  v1.0
 *  كاميرا السرير للبث المباشر
 * ============================================================================
 *  Live MJPEG stream of the demo bed for the platform's "Live feed" card
 *  (https://ulcershield-ai.vercel.app/dashboard).
 *
 *  The camera joins the same Wi-Fi as the laptop/phone running the platform.
 *  The browser loads the stream straight from the camera; Chrome asks once
 *  to "access devices on your local network" -> Allow.
 *
 *  Endpoints (all send Access-Control-Allow-Origin: *):
 *    port 80  /                    test page with the stream
 *             /status              JSON: fw, on, clients, fps, res, rssi, ip, uptime
 *             /control?camera=on   power the camera up   (JSON {"on":true})
 *             /control?camera=off  stop streams, power the camera down
 *             /capture             one JPEG
 *    port 81  /stream              MJPEG (multipart/x-mixed-replace)
 *  The stream has its own server so a running stream never blocks /status.
 *  One live viewer at a time (the stream server has a single task).
 *
 *  Address: http://ulcershield-cam.local  (mDNS), or the IP printed on Serial.
 *  If WIFI_SSID can't be joined within 20 s the camera starts its own access
 *  point "UlcerShield-CAM" (password "ulcershield", http://192.168.4.1).
 *
 *  Arduino IDE: Board "AI Thinker ESP32-CAM", Serial Monitor 115200.
 *  Power it from a solid 5 V / 2 A supply: weak USB power causes
 *  "Brownout detector was triggered" resets when Wi-Fi starts.
 *
 *  No extra libraries: esp32-camera, esp_http_server and mDNS ship with the
 *  ESP32 Arduino core 3.x.
 * ============================================================================
 */

#include <atomic>
#include <WiFi.h>
#include <ESPmDNS.h>
#include "esp_camera.h"
#include "esp_http_server.h"

// ==========================================================================
//  Settings  -- edit WIFI_SSID / WIFI_PASS for your network
// ==========================================================================
#define WIFI_SSID      "YOUR_WIFI_NAME"
#define WIFI_PASS      "YOUR_WIFI_PASSWORD"
#define CAM_HOSTNAME   "ulcershield-cam"     // -> http://ulcershield-cam.local
#define AP_SSID        "UlcerShield-CAM"     // fallback access point
#define AP_PASS        "ulcershield"
#define FW_VERSION     "1.0"

// Image orientation on the mast; flip if the bed shows upside down / mirrored.
#define CAM_VFLIP      0
#define CAM_HMIRROR    0

const uint32_t WIFI_TIMEOUT_MS = 20000;

// ==========================================================================
//  AI Thinker ESP32-CAM pin map
// ==========================================================================
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22
#define FLASH_LED_GPIO     4    // white flash LED, kept off
#define RED_LED_GPIO      33    // small red LED, active LOW: on = Wi-Fi up

// ==========================================================================
//  State
// ==========================================================================
httpd_handle_t ctrlServer = nullptr, streamServer = nullptr;
SemaphoreHandle_t camLock;

// Shared between the two HTTP server tasks and loop().
std::atomic<bool>     camOn{false};
std::atomic<int>      framesOut{0};       // frame buffers handed out and not yet returned
std::atomic<int>      streamClients{0};
std::atomic<uint32_t> framesSent{0};
float             fps = 0;
bool              apMode = false;
const char*       frameSizeName = "VGA";

// ==========================================================================
//  Camera
// ==========================================================================
bool cameraStart() {
  camera_config_t c = {};
  c.pin_pwdn = PWDN_GPIO_NUM;   c.pin_reset = RESET_GPIO_NUM;  c.pin_xclk = XCLK_GPIO_NUM;
  c.pin_sccb_sda = SIOD_GPIO_NUM; c.pin_sccb_scl = SIOC_GPIO_NUM;
  c.pin_d7 = Y9_GPIO_NUM; c.pin_d6 = Y8_GPIO_NUM; c.pin_d5 = Y7_GPIO_NUM; c.pin_d4 = Y6_GPIO_NUM;
  c.pin_d3 = Y5_GPIO_NUM; c.pin_d2 = Y4_GPIO_NUM; c.pin_d1 = Y3_GPIO_NUM; c.pin_d0 = Y2_GPIO_NUM;
  c.pin_vsync = VSYNC_GPIO_NUM; c.pin_href = HREF_GPIO_NUM; c.pin_pclk = PCLK_GPIO_NUM;
  c.xclk_freq_hz = 20000000;
  c.ledc_timer = LEDC_TIMER_0;
  c.ledc_channel = LEDC_CHANNEL_0;
  c.pixel_format = PIXFORMAT_JPEG;
  c.grab_mode = CAMERA_GRAB_LATEST;   // always the newest frame: low latency
  if (psramFound()) {
    c.frame_size = FRAMESIZE_VGA;  c.jpeg_quality = 12; c.fb_count = 2; c.fb_location = CAMERA_FB_IN_PSRAM;
    frameSizeName = "VGA";
  } else {
    c.frame_size = FRAMESIZE_QVGA; c.jpeg_quality = 15; c.fb_count = 1; c.fb_location = CAMERA_FB_IN_DRAM;
    frameSizeName = "QVGA";
  }
  esp_err_t err = esp_camera_init(&c);
  if (err != ESP_OK) {
    Serial.printf("[CAM] init failed 0x%x\r\n", err);
    return false;
  }
  sensor_t* s = esp_camera_sensor_get();
  if (s) { s->set_vflip(s, CAM_VFLIP); s->set_hmirror(s, CAM_HMIRROR); }
  Serial.printf("[CAM] on (%s)\r\n", frameSizeName);
  return true;
}

// Turning the camera on/off while a stream holds a frame buffer would crash
// the driver, so frames are handed out under camLock and counted.
bool cameraOn() {
  xSemaphoreTake(camLock, portMAX_DELAY);
  if (!camOn) camOn = cameraStart();
  bool ok = camOn;
  xSemaphoreGive(camLock);
  return ok;
}

void cameraOff() {
  xSemaphoreTake(camLock, portMAX_DELAY);
  bool wasOn = camOn;
  camOn = false;                       // streams stop at their next frame
  xSemaphoreGive(camLock);
  if (!wasOn) return;
  for (int i = 0; i < 300 && framesOut > 0; i++) delay(10);   // let in-flight frames finish
  xSemaphoreTake(camLock, portMAX_DELAY);
  esp_camera_deinit();
  pinMode(PWDN_GPIO_NUM, OUTPUT);
  digitalWrite(PWDN_GPIO_NUM, HIGH);   // sensor power-down
  xSemaphoreGive(camLock);
  Serial.println(F("[CAM] off"));
}

camera_fb_t* takeFrame() {
  xSemaphoreTake(camLock, portMAX_DELAY);
  camera_fb_t* fb = camOn ? esp_camera_fb_get() : nullptr;
  if (fb) framesOut++;
  xSemaphoreGive(camLock);
  return fb;
}

void giveFrame(camera_fb_t* fb) {
  xSemaphoreTake(camLock, portMAX_DELAY);
  esp_camera_fb_return(fb);
  framesOut--;
  xSemaphoreGive(camLock);
}

// ==========================================================================
//  HTTP handlers
// ==========================================================================
static void addCors(httpd_req_t* req) {
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Private-Network", "true");
  httpd_resp_set_hdr(req, "Cache-Control", "no-store");
}

static esp_err_t sendJson(httpd_req_t* req, const char* status, const char* json) {
  addCors(req);
  httpd_resp_set_status(req, status);
  httpd_resp_set_type(req, "application/json");
  return httpd_resp_sendstr(req, json);
}

static esp_err_t statusHandler(httpd_req_t* req) {
  char json[256];
  IPAddress ip = apMode ? WiFi.softAPIP() : WiFi.localIP();
  snprintf(json, sizeof(json),
           "{\"fw\":\"%s\",\"on\":%s,\"clients\":%d,\"fps\":%.1f,\"res\":\"%s\","
           "\"rssi\":%d,\"ip\":\"%s\",\"ap\":%s,\"uptime\":%lu}",
           FW_VERSION, camOn ? "true" : "false", streamClients.load(), fps, frameSizeName,
           apMode ? 0 : (int)WiFi.RSSI(), ip.toString().c_str(), apMode ? "true" : "false",
           (unsigned long)(millis() / 1000));
  return sendJson(req, "200 OK", json);
}

static esp_err_t controlHandler(httpd_req_t* req) {
  char query[64] = "", value[8] = "";
  if (httpd_req_get_url_query_str(req, query, sizeof(query)) != ESP_OK ||
      httpd_query_key_value(query, "camera", value, sizeof(value)) != ESP_OK) {
    return sendJson(req, "400 Bad Request", "{\"error\":\"use /control?camera=on|off\"}");
  }
  if (strcmp(value, "on") == 0) {
    if (!cameraOn()) return sendJson(req, "500 Internal Server Error", "{\"on\":false,\"error\":\"camera init failed\"}");
    return sendJson(req, "200 OK", "{\"on\":true}");
  }
  if (strcmp(value, "off") == 0) {
    cameraOff();
    return sendJson(req, "200 OK", "{\"on\":false}");
  }
  return sendJson(req, "400 Bad Request", "{\"error\":\"camera must be on or off\"}");
}

static esp_err_t captureHandler(httpd_req_t* req) {
  camera_fb_t* fb = takeFrame();
  if (!fb) return sendJson(req, "503 Service Unavailable", "{\"error\":\"camera is off\"}");
  addCors(req);
  httpd_resp_set_type(req, "image/jpeg");
  esp_err_t res = httpd_resp_send(req, (const char*)fb->buf, fb->len);
  giveFrame(fb);
  return res;
}

#define PART_BOUNDARY "ulcershieldframe"
static const char* STREAM_TYPE     = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* STREAM_PART     = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

static esp_err_t streamHandler(httpd_req_t* req) {
  if (!camOn) return sendJson(req, "503 Service Unavailable", "{\"error\":\"camera is off\"}");
  addCors(req);
  httpd_resp_set_type(req, STREAM_TYPE);
  streamClients++;
  Serial.println(F("[STREAM] viewer connected"));

  char part[64];
  esp_err_t res = ESP_OK;
  while (res == ESP_OK) {
    camera_fb_t* fb = takeFrame();
    if (!fb) break;                                  // camera switched off
    size_t n = snprintf(part, sizeof(part), STREAM_PART, (unsigned)fb->len);
    res = httpd_resp_send_chunk(req, STREAM_BOUNDARY, strlen(STREAM_BOUNDARY));
    if (res == ESP_OK) res = httpd_resp_send_chunk(req, part, n);
    if (res == ESP_OK) res = httpd_resp_send_chunk(req, (const char*)fb->buf, fb->len);
    giveFrame(fb);
    if (res == ESP_OK) framesSent++;
  }
  if (res == ESP_OK) httpd_resp_send_chunk(req, nullptr, 0);   // camera off: end cleanly
  streamClients--;
  Serial.println(F("[STREAM] viewer left"));
  return ESP_OK;
}

static esp_err_t rootHandler(httpd_req_t* req) {
  static const char page[] =
    "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'>"
    "<title>UlcerShield camera</title>"
    "<body style='margin:0;background:#0b1220;color:#cbd5e1;font-family:system-ui;text-align:center'>"
    "<h3>UlcerShield bed camera</h3><img id=s style='max-width:100%'>"
    "<p id=t></p><script>"
    "fetch('/control?camera=on').then(()=>{s.src=location.protocol+'//'+location.hostname+':81/stream'});"
    "setInterval(()=>fetch('/status').then(r=>r.json()).then(j=>t.textContent="
    "j.res+' \\u00b7 '+j.fps+' fps \\u00b7 '+j.rssi+' dBm'),2000);"
    "</script>";
  addCors(req);
  httpd_resp_set_type(req, "text/html");
  return httpd_resp_send(req, page, HTTPD_RESP_USE_STRLEN);
}

void startServers() {
  httpd_config_t cfg = HTTPD_DEFAULT_CONFIG();
  cfg.server_port = 80;
  cfg.max_uri_handlers = 8;
  httpd_uri_t uris[] = {
    { "/",        HTTP_GET, rootHandler,    nullptr },
    { "/status",  HTTP_GET, statusHandler,  nullptr },
    { "/control", HTTP_GET, controlHandler, nullptr },
    { "/capture", HTTP_GET, captureHandler, nullptr },
  };
  if (httpd_start(&ctrlServer, &cfg) == ESP_OK) {
    for (auto& u : uris) httpd_register_uri_handler(ctrlServer, &u);
  }

  cfg.server_port = 81;
  cfg.ctrl_port += 1;                 // each server needs its own control socket
  httpd_uri_t stream = { "/stream", HTTP_GET, streamHandler, nullptr };
  if (httpd_start(&streamServer, &cfg) == ESP_OK) {
    httpd_register_uri_handler(streamServer, &stream);
  }
}

// ==========================================================================
//  Wi-Fi
// ==========================================================================
void startWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(CAM_HOSTNAME);
  WiFi.setSleep(false);               // modem sleep stalls the stream
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.printf("[WIFI] joining \"%s\"", WIFI_SSID);
  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < WIFI_TIMEOUT_MS) {
    digitalWrite(RED_LED_GPIO, (millis() / 250) % 2);   // blink while joining
    delay(250);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    apMode = true;
    WiFi.disconnect(true);
    WiFi.mode(WIFI_AP);
    WiFi.softAP(AP_SSID, AP_PASS);
    Serial.printf("[WIFI] could not join; access point \"%s\" (password \"%s\")\r\n", AP_SSID, AP_PASS);
  }
  digitalWrite(RED_LED_GPIO, LOW);    // solid on

  IPAddress ip = apMode ? WiFi.softAPIP() : WiFi.localIP();
  if (MDNS.begin(CAM_HOSTNAME)) MDNS.addService("http", "tcp", 80);
  Serial.printf("[WIFI] camera address: %s  (or %s.local)\r\n", ip.toString().c_str(), CAM_HOSTNAME);
  Serial.printf("[WIFI] enter it in the platform: Dashboard -> Live feed -> camera address\r\n");
}

// ==========================================================================
//  Setup / loop
// ==========================================================================
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.printf("\r\nUlcerShield bed camera v%s\r\n", FW_VERSION);

  pinMode(FLASH_LED_GPIO, OUTPUT);
  digitalWrite(FLASH_LED_GPIO, LOW);
  pinMode(RED_LED_GPIO, OUTPUT);
  digitalWrite(RED_LED_GPIO, HIGH);   // off

  camLock = xSemaphoreCreateMutex();
  Serial.printf("[CAM] PSRAM %s\r\n", psramFound() ? "found" : "missing (QVGA only)");
  cameraOn();

  startWiFi();
  startServers();
}

void loop() {
  static uint32_t tFps = 0, lastFrames = 0;
  uint32_t now = millis();
  if (now - tFps >= 1000) {
    uint32_t f = framesSent;
    fps = (f - lastFrames) * 1000.0f / (now - tFps);
    lastFrames = f;
    tFps = now;
  }
  // Reconnect if the router dropped us (STA mode only).
  if (!apMode && WiFi.status() != WL_CONNECTED) {
    static uint32_t tRetry = 0;
    if (now - tRetry > 5000) { tRetry = now; WiFi.reconnect(); }
  }
  delay(50);
}
