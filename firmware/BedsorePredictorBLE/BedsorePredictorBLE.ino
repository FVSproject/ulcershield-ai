/*
 * ============================================================================
 *  UlcerShield AI  -  Bedsore Early Prediction  -  ESP32 BLE Peripheral  v5.2
 *  نظام التنبؤ المبكر بقرحة الفراش
 * ============================================================================
 *  Pairs with the web platform (https://ulcershield-ai.vercel.app) over
 *  Web Bluetooth. No WiFi, no app: the browser connects straight to the ESP32.
 *
 *  v5.2 -- bed tilt servo (demo bed v2)
 *    - MG996R on GPIO 13 rolls the pillow tray on its long axis. This is the
 *      "Intervene" step of the loop: applying a lateral-tilt recommendation
 *      on the platform turns the patient automatically.
 *    - Command "tilt:<deg>" takes the CLINICAL angle (+ = right side down,
 *      0 = flat). The demo tray only rolls +-20 deg, so it moves at half the
 *      clinical angle: 30 -> 15, 35 -> 17.5, 40 -> 20 deg (TILT_SCALE).
 *    - Moves slowly (5 deg/s) and counts a completed tilt as a turn.
 *    - State packets carry "tl" (current, clinical deg), "tt" (target,
 *      clinical deg) and "tb" (current tray deg).
 *
 *  v5.1 -- pairing fixes
 *    - Device name now goes in the scan response. In v5 it overflowed the
 *      31-byte advertisement (flags + 128-bit UUID + name = 37 B) and was
 *      dropped, so the browser listed an unnamed device.
 *    - The ESP32 requests a 247-byte MTU itself on connect. Phones that never
 *      negotiate (Android < 14) otherwise cut every JSON packet at 20 bytes.
 *    - Keeps advertising while connected (up to 3 screens at once), and after
 *      a disconnect, so a page reload can re-pair immediately.
 *    - Sends a status event + fresh state the moment a browser subscribes.
 *    - Failed mass calibration is reported as an "alert", not as success.
 *    - JSON is built with snprintf (ArduinoJson no longer needed).
 *    - Status LED: blinking = waiting for a browser, solid = paired.
 *
 *  GATT layout (must match platform/src/lib/sources/ble-source.ts):
 *    Service   0000fd00-1212-efde-1523-785feabcd123
 *      Notify  0000fd01-...abcd123   state packets (JSON, 1 Hz)
 *      Write   0000fd02-...abcd123   commands (ASCII: cal_zero|cal_a|cal_b|reset|tilt:<deg>)
 *      Notify  0000fd03-...abcd123   event packets (JSON)
 *
 *  State packet:
 *  {"u":<uptime_s>,
 *   "l":[n,mmhg,g,peak,sat,loaded],
 *   "r":[n,mmhg,g,peak,sat,loaded],
 *   "c":<cop>, "t":<turns>, "st":<since_turn_min>,
 *   "b":<body_c|null>, "h":<humidity|null>, "occ":0|1,
 *   "tl":<tilt>, "tt":<tilt_target>, "tb":<tray_deg>}   (tilt fields only with a servo)
 *
 *  Event packet:  {"k":"turn|calibration|reset|alert|connect","x":"<text>","u":<s>}
 *
 *  Pairing:
 *    1. Flash this sketch, open Serial Monitor (115200) -> "[BLE] advertising".
 *    2. Open the platform in Chrome / Edge (desktop or Android), sign in,
 *       go to Device -> Pair device, pick "UlcerShield-01".
 *    Do NOT pair the ESP32 from the OS Bluetooth settings; the browser
 *    connects to it directly. iOS Safari has no Web Bluetooth.
 *
 *  Serial commands (115200 baud):
 *    c = zero calibration      1 = cal zone A       2 = cal zone B
 *    r = reset turn counter    ? = BLE status + calibration constants
 *    < = tilt left 30          > = tilt right 30    0 = flat
 *
 *  Servo wiring (MG996R):
 *    signal (orange) -> GPIO 13
 *    V+ (red)        -> separate 5-6 V supply, >= 3 A
 *    GND (brown)     -> supply GND AND ESP32 GND (common ground)
 *    Never power the servo from the ESP32 5V/3V3 pin: each move browns out
 *    the board and drops the Bluetooth link.
 *
 *  Required libraries:
 *    - NimBLE-Arduino 2.x  (by h2zero)
 *    - DHT sensor library  (by Adafruit)
 *    - Adafruit MLX90614 Library
 *
 *  NOT a certified medical device.
 * ============================================================================
 */

#include <Wire.h>
#include <DHT.h>
#include <Adafruit_MLX90614.h>
#include <NimBLEDevice.h>
#if defined(CONFIG_NIMBLE_CPP_IDF)
#  include "host/ble_gatt.h"
#else
#  include "nimble/nimble/host/include/host/ble_gatt.h"
#endif

// ==========================================================================
//  Device identity + BLE UUIDs
// ==========================================================================
#define FW_VERSION        "5.2"
// One name per bed. Keep the "UlcerShield" prefix: the browser filters on it.
// Max 29 characters (scan response limit).
#define US_DEVICE_NAME    "UlcerShield-01"

#define US_SERVICE_UUID   "0000fd00-1212-efde-1523-785feabcd123"
#define US_STATE_UUID     "0000fd01-1212-efde-1523-785feabcd123"
#define US_CMD_UUID       "0000fd02-1212-efde-1523-785feabcd123"
#define US_EVENT_UUID     "0000fd03-1212-efde-1523-785feabcd123"

const uint16_t BLE_MTU    = 247;   // 244-byte payload; state packets are < 200 B

// On-board LED of most ESP32 DevKits. Set to -1 if GPIO 2 is used elsewhere.
#define STATUS_LED_PIN    2

// ==========================================================================
//  Bed tilt servo (MG996R, demo bed v2: tray rolls +-20 deg, + = right down)
// ==========================================================================
#define SERVO_PIN         13       // -1 = no servo (tilt commands are rejected)
#define SERVO_INVERT      0        // set to 1 if "tilt right" rolls the tray left

const float SERVO_CENTER_US   = 1500.0f;          // pulse that holds the tray flat; trim per build
const float SERVO_US_PER_DEG  = 2000.0f / 180.0f; // MG996R: ~500-2500 us over ~180 deg
const float TILT_SCALE        = 0.5f;   // tray deg per clinical deg (40 clinical -> 20 tray)
const float TILT_MAX_TRAY_DEG = 20.0f;  // mechanical limit of the v2 tray
const float TILT_MAX_CLINICAL = 40.0f;  // EPUAP/NPUAP ceiling, same as the platform
const float TILT_SPEED_DEG_S  = 5.0f;   // tray deg per second
const float TILT_SERIAL_DEG   = 30.0f;  // clinical angle for the '<' / '>' serial keys

// ==========================================================================
//  Wiring + FSR model (unchanged from v4)
// ==========================================================================
#define FSR_WIRING_PULLUP   1
#define FSR1_PIN            34
#define FSR2_PIN            35
#define DHT_PIN             4
#define DHT_TYPE            DHT22
#define I2C_SDA             21
#define I2C_SCL             22

const float R_FIXED       = 10000.0f;
const float V_SUPPLY_MV   = 3300.0f;
const int   ADC_SAMPLES   = 16;
const float LOAD_AREA_M2  = 1.267e-4f;
const float FSR_N         = 1.0f;
float fsrC_A              = 29430.0f;
float fsrC_B              = 29430.0f;
const float CAL_MASS_KG   = 1.0f;
const float R_NO_LOAD     = 100000.0f;
const float R_SATURATED   = 500.0f;
const float F_MAX_N       = 25.0f;
const float P_DISPLAY_CAP = 300.0f;

const float P_CAPILLARY_MMHG  = 32.0f;
const float P_HIGH_MMHG       = 60.0f;
const float P_CRITICAL_MMHG   = 100.0f;
const float P_OCCUPIED_MMHG   = 8.0f;
const float TURN_INTERVAL_MIN = 120.0f;
const float DOSE_LIMIT        = 3000.0f;

const float    COP_TURN_DELTA  = 0.35f;
const uint32_t TURN_STABLE_MS  = 4000;
const uint32_t OFFLOAD_MS      = 3000;
const uint32_t TURN_LOCKOUT_MS = 20000;
const uint32_t BOOT_GRACE_MS   = 15000;

const uint32_t T_FAST_MS       = 1000;
const uint32_t T_NOTIFY_MS     = 1000;
const uint32_t T_DHT_MS        = 2500;

// ==========================================================================
//  Sensor state (unchanged)
// ==========================================================================
DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_MLX90614 mlx = Adafruit_MLX90614();

struct Zone {
  const char* name;
  uint8_t pin;
  float*  calC;
  uint16_t mv;
  float rFsr;
  float forceN;
  float kPa;
  float mmHg;
  float grams;
  float mmHgPeak;
  float dose;
  float rNoLoad;
  bool  primed;
  bool  saturated;
  bool  loaded;
};

Zone zoneA = {"LEFT",  FSR1_PIN, &fsrC_A, 0,0,0,0,0,0,0,0, 0,false,false,false};
Zone zoneB = {"RIGHT", FSR2_PIN, &fsrC_B, 0,0,0,0,0,0,0,0, 0,false,false,false};

float humidity = NAN, ambientT = NAN, skinT = NAN, mlxAmbientT = NAN;
bool  mlxOK = false, dhtOK = false;
float baselineSkinT = NAN;

float cop = 0, copRef = 0, copCandidate = 0;
bool  copPending = false;
uint32_t copPendingSince = 0;

uint32_t turnCount = 0, lastTurnMs = 0, lastTurnLogged = 0;
bool     occupied = false;
uint32_t unoccupiedSince = 0, bootMs = 0;
uint32_t tFast = 0, tDht = 0, tDose = 0, tNotify = 0;

// Tilt: tray angles are physical degrees, the target is kept in clinical degrees.
float    trayDeg = 0, trayTargetDeg = 0, tiltTargetClinical = 0;
bool     tiltMoving = false;
uint32_t tTilt = 0;

// ==========================================================================
//  BLE
// ==========================================================================
NimBLEServer         *bleServer = nullptr;
NimBLECharacteristic *stateChar = nullptr;
NimBLECharacteristic *cmdChar   = nullptr;
NimBLECharacteristic *eventChar = nullptr;

// Set from BLE callbacks (NimBLE host task), consumed in loop().
volatile char pendingCmd   = 0;      // 'z'=zero, 'a'=cal A, 'b'=cal B, 'r'=reset
volatile bool helloPending = false;  // a browser subscribed to events
volatile bool statePending = false;  // a browser subscribed to state
volatile bool  tiltPending   = false; // "tilt:<deg>" received
volatile float tiltPendingDeg = 0;    // clinical degrees, + = right side down

bool registerTurn(const char* reason);
void broadcastState();
void broadcastEvent(const char* kind, const char* text);

static bool bleLinked() { return bleServer && bleServer->getConnectedCount() > 0; }

// ==========================================================================
//  FSR reading (unchanged)
// ==========================================================================
uint16_t readMilliVoltsAvg(uint8_t pin) {
  uint32_t acc = 0;
  for (int i = 0; i < ADC_SAMPLES; i++) { acc += analogReadMilliVolts(pin); delayMicroseconds(200); }
  return (uint16_t)(acc / ADC_SAMPLES);
}

float mvToResistance(uint16_t mv) {
  float v = (float)mv;
#if FSR_WIRING_PULLUP
  if (v >= V_SUPPLY_MV - 25.0f) return INFINITY;
  if (v <= 5.0f)                return 0.5f;
  return R_FIXED * v / (V_SUPPLY_MV - v);
#else
  if (v <= 25.0f)               return INFINITY;
  if (v >= V_SUPPLY_MV - 5.0f)  return 0.5f;
  return R_FIXED * (V_SUPPLY_MV - v) / v;
#endif
}

void readZone(Zone &z) {
  z.mv   = readMilliVoltsAvg(z.pin);
  z.rFsr = mvToResistance(z.mv);
  float noLoadLimit = (z.rNoLoad > 1000.0f) ? (z.rNoLoad * 0.7f) : R_NO_LOAD;

  float rawF;
  if (isinf(z.rFsr) || z.rFsr > noLoadLimit) {
    rawF = 0.0f; z.loaded = false; z.saturated = false;
  } else {
    rawF = *z.calC / powf(z.rFsr, FSR_N);
    z.loaded = true;
    z.saturated = (z.rFsr < R_SATURATED);
    if (rawF > F_MAX_N) { rawF = F_MAX_N; z.saturated = true; }
  }
  if (!z.primed) { z.forceN = rawF; z.primed = true; }
  else           { z.forceN = 0.7f * z.forceN + 0.3f * rawF; }

  z.kPa   = (z.forceN / LOAD_AREA_M2) / 1000.0f;
  z.mmHg  = z.kPa * 7.50062f;
  z.grams = z.forceN / 9.80665f * 1000.0f;
  if (z.mmHg > P_DISPLAY_CAP) z.mmHg = P_DISPLAY_CAP;
  if (z.mmHg > z.mmHgPeak)    z.mmHgPeak = z.mmHg;
}

// ==========================================================================
//  Turn detection (unchanged)
// ==========================================================================
void updateTurnDetection() {
  uint32_t now = millis();
  float total = zoneA.mmHg + zoneB.mmHg;
  bool nowOccupied = (total > P_OCCUPIED_MMHG * 2.0f);
  if (nowOccupied) cop = (zoneB.mmHg - zoneA.mmHg) / total;

  if (now - bootMs < BOOT_GRACE_MS) { occupied = nowOccupied; copRef = cop; return; }

  if (!nowOccupied && occupied) unoccupiedSince = now;
  if (nowOccupied && !occupied) {
    if (unoccupiedSince && (now - unoccupiedSince) > OFFLOAD_MS)
      registerTurn("off-load");
    unoccupiedSince = 0;
  }
  occupied = nowOccupied;
  // While the bed is rolling the CoP sweeps on purpose; the tilt registers
  // its own turn when it finishes.
  if (!occupied || tiltMoving) { copPending = false; return; }

  if (fabs(cop - copRef) > COP_TURN_DELTA) {
    if (!copPending) { copPending = true; copPendingSince = now; copCandidate = cop; }
    else if (fabs(cop - copCandidate) >= 0.15f) { copCandidate = cop; copPendingSince = now; }
    else if ((now - copPendingSince) > TURN_STABLE_MS) {
      registerTurn("posture shift");
      copPending = false;
    }
  } else {
    copPending = false;
  }
}

bool registerTurn(const char* reason) {
  uint32_t now = millis();
  if (now - lastTurnLogged < TURN_LOCKOUT_MS) return false;
  turnCount++;
  lastTurnMs = lastTurnLogged = now;
  copRef = cop;
  zoneA.dose = zoneB.dose = 0;
  zoneA.mmHgPeak = zoneA.mmHg;
  zoneB.mmHgPeak = zoneB.mmHg;
  Serial.printf(">>> TURN #%lu (%s) CoP=%+0.2f\r\n", (unsigned long)turnCount, reason, cop);
  broadcastEvent("turn", reason);
  return true;
}

void updateDose(float dtMin) {
  if (!occupied) return;
  if (zoneA.mmHg > P_CAPILLARY_MMHG) zoneA.dose += (zoneA.mmHg - P_CAPILLARY_MMHG) * dtMin;
  if (zoneB.mmHg > P_CAPILLARY_MMHG) zoneB.dose += (zoneB.mmHg - P_CAPILLARY_MMHG) * dtMin;
}

void resetCounters() {
  turnCount = 0;
  lastTurnMs = lastTurnLogged = millis();
  zoneA.dose = zoneB.dose = 0;
  zoneA.mmHgPeak = zoneB.mmHgPeak = 0;
  copRef = cop;
  Serial.println(F("*** counters reset ***"));
}

// ==========================================================================
//  Calibration
// ==========================================================================
void zeroCalibration() {
  Serial.println(F("\r\n--- ZERO: remove ALL load ---"));
  delay(1500);
  for (Zone *z : {&zoneA, &zoneB}) {
    uint32_t acc = 0;
    for (int i = 0; i < 32; i++) { acc += analogReadMilliVolts(z->pin); delay(8); }
    z->rNoLoad = mvToResistance(acc / 32);
    z->primed  = false;
    z->mmHgPeak = 0;
  }
  if (mlxOK) {
    float s = 0; int n = 0;
    for (int i = 0; i < 5; i++) { float v = mlx.readObjectTempC();
                                  if (!isnan(v)) { s += v; n++; } delay(120); }
    if (n) baselineSkinT = s / n;
  }
}

bool massCalibration(Zone &z) {
  Serial.printf("--- CAL %s with %.2f kg ---\r\n", z.name, CAL_MASS_KG);
  delay(3000);
  uint32_t acc = 0;
  for (int i = 0; i < 32; i++) { acc += analogReadMilliVolts(z.pin); delay(10); }
  float r = mvToResistance(acc / 32);
  if (isinf(r) || r > R_NO_LOAD) { Serial.println(F("FAILED: no load")); return false; }
  float f = CAL_MASS_KG * 9.80665f;
  *z.calC = f * powf(r, FSR_N);
  z.primed = false;
  Serial.printf("C=%.0f\r\n", *z.calC);
  return true;
}

// Runs in loop() so the BLE host task is never blocked by the calibration delays.
void runPendingCommand() {
  char cmd = pendingCmd;
  if (!cmd) return;
  pendingCmd = 0;
  switch (cmd) {
    case 'z':
      zeroCalibration();
      broadcastEvent("calibration", "zero");
      break;
    case 'a':
      if (massCalibration(zoneA)) broadcastEvent("calibration", "left calibrated");
      else                        broadcastEvent("alert", "left calibration failed: no load on the pad");
      break;
    case 'b':
      if (massCalibration(zoneB)) broadcastEvent("calibration", "right calibrated");
      else                        broadcastEvent("alert", "right calibration failed: no load on the pad");
      break;
    case 'r':
      resetCounters();
      broadcastEvent("reset", "counters reset");
      break;
  }
}

// ==========================================================================
//  Bed tilt
// ==========================================================================
void servoWriteTray(float deg) {
#if SERVO_PIN >= 0
  if (SERVO_INVERT) deg = -deg;
  float us = SERVO_CENTER_US + deg * SERVO_US_PER_DEG;
  ledcWrite(SERVO_PIN, (uint32_t)(us * 16384.0f / 20000.0f));   // 50 Hz, 14-bit duty
#endif
}

static void describeTilt(char* out, size_t n, float clinical) {
  if (fabsf(clinical) < 0.5f) snprintf(out, n, "bed flat");
  else snprintf(out, n, "bed tilt %.0f deg %s", fabsf(clinical), clinical > 0 ? "right" : "left");
}

// `clinical` in degrees, + = right side down, 0 = flat. Non-blocking: the
// tray is ramped toward the target from loop() by updateTilt().
void startTilt(float clinical) {
#if SERVO_PIN < 0
  broadcastEvent("alert", "bed tilt requested but no servo is configured");
#else
  tiltTargetClinical = constrain(clinical, -TILT_MAX_CLINICAL, TILT_MAX_CLINICAL);
  trayTargetDeg = constrain(tiltTargetClinical * TILT_SCALE, -TILT_MAX_TRAY_DEG, TILT_MAX_TRAY_DEG);
  tiltMoving = fabsf(trayTargetDeg - trayDeg) > 0.05f;
  Serial.printf("[TILT] target %+.0f clinical -> %+.1f tray deg\r\n",
                tiltTargetClinical, trayTargetDeg);
  statePending = true;   // let the dashboard show the new target right away
#endif
}

void updateTilt(uint32_t now) {
  // Cap the step so a blocking calibration doesn't become a sudden lurch.
  float dt = fminf((now - tTilt) / 1000.0f, 0.1f);
  tTilt = now;
  if (!tiltMoving) return;

  float step = TILT_SPEED_DEG_S * dt;
  float diff = trayTargetDeg - trayDeg;
  if (fabsf(diff) <= step) { trayDeg = trayTargetDeg; tiltMoving = false; }
  else                     { trayDeg += (diff > 0) ? step : -step; }
  servoWriteTray(trayDeg);

  if (!tiltMoving) {
    char reason[40];
    describeTilt(reason, sizeof(reason), tiltTargetClinical);
    // A completed tilt is a repositioning. Inside the turn lockout it still
    // shows on the timeline, it just isn't counted twice.
    if (!registerTurn(reason)) broadcastEvent("turn", reason);
  }
}

// ==========================================================================
//  BLE callbacks
// ==========================================================================
class ServerCB : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* srv, NimBLEConnInfo& info) override {
    Serial.printf("[BLE] connected: %s  (%u/%u screens)\r\n",
                  info.getAddress().toString().c_str(),
                  srv->getConnectedCount(), (unsigned)CONFIG_BT_NIMBLE_MAX_CONNECTIONS);
    // Request the large MTU from our side too; Chrome on Android < 14 never
    // asks, and at the default 23-byte MTU every packet is cut at 20 bytes.
    ble_gattc_exchange_mtu(info.getConnHandle(), nullptr, nullptr);
    // Advertising stops on connect. Restart it so another screen, or the same
    // browser after a page reload, can connect without waiting for a timeout.
    if (srv->getConnectedCount() < CONFIG_BT_NIMBLE_MAX_CONNECTIONS) NimBLEDevice::startAdvertising();
  }
  void onDisconnect(NimBLEServer* srv, NimBLEConnInfo& info, int reason) override {
    // Advertising restarts automatically (advertiseOnDisconnect).
    Serial.printf("[BLE] disconnected: %s  reason 0x%02X\r\n",
                  info.getAddress().toString().c_str(), reason);
  }
  void onMTUChange(uint16_t mtu, NimBLEConnInfo& info) override {
    Serial.printf("[BLE] MTU %u\r\n", mtu);
    if (mtu < 200) Serial.println(F("[BLE] WARNING: MTU too small, JSON packets will be truncated"));
  }
};

class CmdCB : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo& info) override {
    std::string v = c->getValue();
    while (!v.empty() && isspace((unsigned char)v.back())) v.pop_back();
    Serial.printf("[BLE] cmd: %s\r\n", v.c_str());
    if      (v == "cal_zero") pendingCmd = 'z';
    else if (v == "cal_a")    pendingCmd = 'a';
    else if (v == "cal_b")    pendingCmd = 'b';
    else if (v == "reset")    pendingCmd = 'r';
    else if (v.rfind("tilt:", 0) == 0) {
      const char* num = v.c_str() + 5;
      char* end = nullptr;
      float deg = strtof(num, &end);
      if (end != num && *end == '\0' && isfinite(deg)) { tiltPendingDeg = deg; tiltPending = true; }
      else Serial.println(F("[BLE] bad tilt command"));
    }
    else Serial.println(F("[BLE] unknown command"));
  }
};

class NotifyCB : public NimBLECharacteristicCallbacks {
  void onSubscribe(NimBLECharacteristic* c, NimBLEConnInfo& info, uint16_t subValue) override {
    if (!subValue) return;
    if (c == eventChar) helloPending = true;
    else                statePending = true;
  }
};

// ==========================================================================
//  BLE broadcast (fixed-format JSON)
// ==========================================================================
static float safeNum(float v) { return (isnan(v) || isinf(v)) ? 0.0f : v; }

static void fmtZone(char* out, size_t n, const Zone &z) {
  snprintf(out, n, "[%.1f,%.1f,%.1f,%.1f,%d,%d]",
           safeNum(z.forceN), safeNum(z.mmHg), safeNum(z.grams), safeNum(z.mmHgPeak),
           z.saturated ? 1 : 0, z.loaded ? 1 : 0);
}

static void fmtOptional(char* out, size_t n, bool ok, float v, const char* fmt) {
  if (ok && !isnan(v) && !isinf(v)) snprintf(out, n, fmt, v);
  else                              snprintf(out, n, "null");
}

void broadcastState() {
  if (!stateChar || !bleLinked()) return;

  char l[48], r[48], b[16], h[16];
  fmtZone(l, sizeof(l), zoneA);
  fmtZone(r, sizeof(r), zoneB);
  fmtOptional(b, sizeof(b), mlxOK, skinT,    "%.2f");
  fmtOptional(h, sizeof(h), dhtOK, humidity, "%.1f");

  // Tilt fields are omitted without a servo; the platform hides its bed controls then.
  char tilt[48] = "";
#if SERVO_PIN >= 0
  snprintf(tilt, sizeof(tilt), ",\"tl\":%.1f,\"tt\":%.1f,\"tb\":%.1f",
           trayDeg / TILT_SCALE, tiltTargetClinical, trayDeg);
#endif

  // "st" is rounded to 0.1 min on purpose: the platform resets its own
  // since-turn timer when it sees st == 0 together with a new turn count.
  char buf[240];
  int n = snprintf(buf, sizeof(buf),
                   "{\"u\":%lu,\"l\":%s,\"r\":%s,\"c\":%.3f,\"t\":%lu,\"st\":%.1f,"
                   "\"b\":%s,\"h\":%s,\"occ\":%d%s}",
                   (unsigned long)((millis() - bootMs) / 1000), l, r, safeNum(cop),
                   (unsigned long)turnCount, (millis() - lastTurnMs) / 60000.0f,
                   b, h, occupied ? 1 : 0, tilt);
  if (n <= 0 || n >= (int)sizeof(buf)) return;
  stateChar->setValue((const uint8_t*)buf, n);
  stateChar->notify();
}

// `text` must not contain quotes or backslashes (it is not JSON-escaped).
void broadcastEvent(const char* kind, const char* text) {
  if (!eventChar || !bleLinked()) return;
  char buf[200];
  int n = snprintf(buf, sizeof(buf), "{\"k\":\"%s\",\"x\":\"%s\",\"u\":%lu}",
                   kind, text, (unsigned long)((millis() - bootMs) / 1000));
  if (n <= 0 || n >= (int)sizeof(buf)) return;
  eventChar->setValue((const uint8_t*)buf, n);
  eventChar->notify();
}

// First thing a newly paired browser sees in its event timeline.
void broadcastHello() {
  char text[120];
  snprintf(text, sizeof(text), "%s fw %s - skin temp %s, humidity %s - %u screen(s)",
           US_DEVICE_NAME, FW_VERSION,
           mlxOK ? "ok" : "MISSING", dhtOK ? "ok" : "MISSING",
           bleServer ? bleServer->getConnectedCount() : 0);
  broadcastEvent("connect", text);
}

// ==========================================================================
//  Status LED + serial diagnostics
// ==========================================================================
void updateStatusLed(uint32_t now) {
#if STATUS_LED_PIN >= 0
  bool on = bleLinked() || ((now / 500) % 2 == 0);
  digitalWrite(STATUS_LED_PIN, on ? HIGH : LOW);
#endif
}

void printStatus() {
  Serial.println(F("\r\n--- STATUS ---"));
  Serial.printf("  firmware : v%s\r\n", FW_VERSION);
  Serial.printf("  BLE name : %s   MAC %s\r\n", US_DEVICE_NAME,
                NimBLEDevice::getAddress().toString().c_str());
  Serial.printf("  screens  : %u connected (max %u)\r\n",
                bleServer ? bleServer->getConnectedCount() : 0,
                (unsigned)CONFIG_BT_NIMBLE_MAX_CONNECTIONS);
  Serial.printf("  sensors  : MLX90614 %s, DHT22 %s\r\n",
                mlxOK ? "ok" : "MISSING", dhtOK ? "ok" : "MISSING");
  Serial.printf("  F = C / R^%.2f   C_A = %.0f   C_B = %.0f\r\n", FSR_N, fsrC_A, fsrC_B);
#if SERVO_PIN >= 0
  Serial.printf("  bed tilt : tray %+.1f deg -> %+.1f (clinical target %+.0f), servo GPIO %d\r\n",
                trayDeg, trayTargetDeg, tiltTargetClinical, SERVO_PIN);
#else
  Serial.println(F("  bed tilt : no servo configured"));
#endif
  Serial.println(F("--------------"));
}

// ==========================================================================
//  Setup / loop
// ==========================================================================
void setupBLE() {
  NimBLEDevice::init(US_DEVICE_NAME);
  NimBLEDevice::setPower(9);          // dBm, ESP32 maximum
  NimBLEDevice::setMTU(BLE_MTU);

  bleServer = NimBLEDevice::createServer();
  bleServer->setCallbacks(new ServerCB());
  bleServer->advertiseOnDisconnect(true);

  NimBLEService *svc = bleServer->createService(US_SERVICE_UUID);
  static NotifyCB notifyCB;

  stateChar = svc->createCharacteristic(
    US_STATE_UUID,
    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
  );
  stateChar->setCallbacks(&notifyCB);

  cmdChar = svc->createCharacteristic(
    US_CMD_UUID,
    NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR
  );
  cmdChar->setCallbacks(new CmdCB());

  eventChar = svc->createCharacteristic(
    US_EVENT_UUID,
    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
  );
  eventChar->setCallbacks(&notifyCB);

  // No svc->start(): NimBLE 2.x starts the GATT server when advertising starts.

  // Order matters: with the scan response enabled first, setName() puts the
  // name there. Otherwise it is appended to the advertisement, where the
  // 128-bit service UUID leaves no room, and is silently dropped.
  NimBLEAdvertising *adv = NimBLEDevice::getAdvertising();
  adv->enableScanResponse(true);
  adv->addServiceUUID(US_SERVICE_UUID);
  adv->setName(US_DEVICE_NAME);
  NimBLEDevice::startAdvertising();

  Serial.printf("[BLE] advertising as %s  (MAC %s)\r\n",
                US_DEVICE_NAME, NimBLEDevice::getAddress().toString().c_str());
}

void setup() {
  Serial.begin(115200);
  delay(400);
  Serial.printf("\r\nUlcerShield BLE peripheral v%s\r\n", FW_VERSION);

#if STATUS_LED_PIN >= 0
  pinMode(STATUS_LED_PIN, OUTPUT);
#endif

#if SERVO_PIN >= 0
  ledcAttach(SERVO_PIN, 50, 14);
  servoWriteTray(0);     // start flat
#endif
  tTilt = millis();

  analogReadResolution(12);
  analogSetPinAttenuation(FSR1_PIN, ADC_11db);
  analogSetPinAttenuation(FSR2_PIN, ADC_11db);

  dht.begin();
  Wire.begin(I2C_SDA, I2C_SCL);
  mlxOK = mlx.begin();
  Serial.println(mlxOK ? F("[OK]   MLX90614") : F("[FAIL] MLX90614"));
  dhtOK = !isnan(dht.readHumidity());
  Serial.println(dhtOK ? F("[OK]   DHT22") : F("[WARN] DHT22"));

  bootMs = tDose = millis();
  lastTurnMs = lastTurnLogged = millis();

  setupBLE();
}

void loop() {
  uint32_t now = millis();

  // Serial commands share the BLE command queue, so the platform sees the
  // same calibration/reset events whichever side triggered them.
  while (Serial.available()) {
    char c = Serial.read();
    switch (c) {
      case 'c': case 'C': pendingCmd = 'z'; break;
      case '1':           pendingCmd = 'a'; break;
      case '2':           pendingCmd = 'b'; break;
      case 'r': case 'R': pendingCmd = 'r'; break;
      case '?':           printStatus();    break;
      case '<':           startTilt(-TILT_SERIAL_DEG); break;
      case '>':           startTilt( TILT_SERIAL_DEG); break;
      case '0':           startTilt(0);     break;
    }
  }

  runPendingCommand();
  if (tiltPending) { tiltPending = false; startTilt(tiltPendingDeg); }
  updateTilt(now);

  readZone(zoneA);
  readZone(zoneB);
  updateTurnDetection();

  if (now - tDose >= 1000) { updateDose((now - tDose) / 60000.0f); tDose = now; }

  if (now - tDht >= T_DHT_MS) {
    tDht = now;
    float h = dht.readHumidity(), t = dht.readTemperature();
    if (!isnan(h) && !isnan(t)) { humidity = h; ambientT = t; dhtOK = true; }
    else dhtOK = false;
    if (mlxOK) {
      float o = mlx.readObjectTempC(), a = mlx.readAmbientTempC();
      if (!isnan(o) && o > -20 && o < 120) { skinT = o; mlxAmbientT = a; }
    }
  }

  if (helloPending) { helloPending = false; broadcastHello(); }
  if (statePending) { statePending = false; broadcastState(); tNotify = now; }

  if (now - tFast   >= T_FAST_MS)   { tFast   = now;
    Serial.printf("L=%6.1f mmHg  R=%6.1f mmHg  CoP%+0.2f  T=%s  H=%s  BLE=%u\r\n",
                  zoneA.mmHg, zoneB.mmHg, cop,
                  mlxOK && !isnan(skinT) ? String(skinT,1).c_str() : "--",
                  dhtOK && !isnan(humidity) ? String(humidity,0).c_str() : "--",
                  bleServer ? bleServer->getConnectedCount() : 0);
  }
  if (now - tNotify >= T_NOTIFY_MS) { tNotify = now; broadcastState(); }

  updateStatusLed(now);
  delay(20);
}
