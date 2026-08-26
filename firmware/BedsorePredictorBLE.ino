/*
 * ============================================================================
 *  UlcerShield AI  -  Bedsore Early Prediction  -  ESP32 BLE Peripheral  v5
 *  نظام التنبؤ المبكر بقرحة الفراش
 * ============================================================================
 *  v5 -- BLE peripheral (Web Bluetooth)
 *    - WiFi AP + HTTP + SPIFFS SPA + user store + CSV logs REMOVED.
 *      The web platform is now hosted online. This firmware only exposes
 *      a BLE GATT service the browser subscribes to via Web Bluetooth.
 *    - Compact JSON packets on notify characteristic (<= 240 bytes to fit MTU).
 *
 *  GATT layout (must match platform/src/lib/sources/ble-source.ts):
 *    Service   0000fd00-1212-efde-1523-785feabcd123
 *      Notify  0000fd01-...abcd123   state packets (JSON)
 *      Write   0000fd02-...abcd123   commands (ASCII: cal_zero|cal_a|cal_b|reset)
 *      Notify  0000fd03-...abcd123   event packets (JSON)
 *
 *  State packet (JSON):
 *  {"u":<uptime_s>,
 *   "l":[n,mmhg,g,peak,sat,loaded],
 *   "r":[n,mmhg,g,peak,sat,loaded],
 *   "c":<cop>, "t":<turns>, "st":<since_turn_min>,
 *   "b":<body_c|null>, "h":<humidity|null>, "occ":0|1}
 *
 *  Serial commands still available (115200 baud):
 *    c = zero calibration      1 = cal zone A       2 = cal zone B
 *    r = reset turn counter    m = print pressure map
 *    ? = print calibration constants
 *
 *  Required libraries:
 *    - NimBLE-Arduino  (by h2zero)
 *    - ArduinoJson     (by Benoit Blanchon)
 *    - DHT sensor library (by Adafruit)
 *    - Adafruit MLX90614 Library
 *
 *  NOT a certified medical device.
 * ============================================================================
 */

#include <Wire.h>
#include <DHT.h>
#include <Adafruit_MLX90614.h>
#include <NimBLEDevice.h>
#include <ArduinoJson.h>

// ==========================================================================
//  BLE UUIDs
// ==========================================================================
#define US_SERVICE_UUID   "0000fd00-1212-efde-1523-785feabcd123"
#define US_STATE_UUID     "0000fd01-1212-efde-1523-785feabcd123"
#define US_CMD_UUID       "0000fd02-1212-efde-1523-785feabcd123"
#define US_EVENT_UUID     "0000fd03-1212-efde-1523-785feabcd123"
#define US_DEVICE_NAME    "UlcerShield-01"

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

// ==========================================================================
//  BLE
// ==========================================================================
NimBLECharacteristic *stateChar = nullptr;
NimBLECharacteristic *cmdChar   = nullptr;
NimBLECharacteristic *eventChar = nullptr;
bool bleConnected = false;
volatile char pendingCmd = 0;   // 'z'=zero, 'a'=cal A, 'b'=cal B, 'r'=reset

void registerTurn(const char* reason);
void broadcastState();
void broadcastEvent(const char* kind, const char* text);
static float round1(float v);

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
  if (!occupied) { copPending = false; return; }

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

void registerTurn(const char* reason) {
  uint32_t now = millis();
  if (now - lastTurnLogged < TURN_LOCKOUT_MS) return;
  turnCount++;
  lastTurnMs = lastTurnLogged = now;
  copRef = cop;
  zoneA.dose = zoneB.dose = 0;
  zoneA.mmHgPeak = zoneA.mmHg;
  zoneB.mmHgPeak = zoneB.mmHg;
  Serial.printf(">>> TURN #%lu (%s) CoP=%+0.2f\r\n", turnCount, reason, cop);
  broadcastEvent("turn", reason);
}

void updateDose(float dtMin) {
  if (!occupied) return;
  if (zoneA.mmHg > P_CAPILLARY_MMHG) zoneA.dose += (zoneA.mmHg - P_CAPILLARY_MMHG) * dtMin;
  if (zoneB.mmHg > P_CAPILLARY_MMHG) zoneB.dose += (zoneB.mmHg - P_CAPILLARY_MMHG) * dtMin;
}

// ==========================================================================
//  Calibration (unchanged)
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

void massCalibration(Zone &z) {
  Serial.printf("--- CAL %s with %.2f kg ---\r\n", z.name, CAL_MASS_KG);
  delay(3000);
  uint32_t acc = 0;
  for (int i = 0; i < 32; i++) { acc += analogReadMilliVolts(z.pin); delay(10); }
  float r = mvToResistance(acc / 32);
  if (isinf(r) || r > R_NO_LOAD) { Serial.println(F("FAILED: no load")); return; }
  float f = CAL_MASS_KG * 9.80665f;
  *z.calC = f * powf(r, FSR_N);
  z.primed = false;
  Serial.printf("C=%.0f\r\n", *z.calC);
}

// ==========================================================================
//  BLE callbacks
// ==========================================================================
class ServerCB : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* srv, NimBLEConnInfo& info) override {
    bleConnected = true;
    Serial.printf("[BLE] connected: %s\r\n", info.getAddress().toString().c_str());
    broadcastEvent("connect", "browser paired");
  }
  void onDisconnect(NimBLEServer* srv, NimBLEConnInfo& info, int reason) override {
    bleConnected = false;
    Serial.printf("[BLE] disconnected (reason %d), restarting advertising\r\n", reason);
    NimBLEDevice::startAdvertising();
  }
};

class CmdCB : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c, NimBLEConnInfo& info) override {
    std::string v = c->getValue();
    Serial.printf("[BLE] cmd: %s\r\n", v.c_str());
    if      (v == "cal_zero") pendingCmd = 'z';
    else if (v == "cal_a")    pendingCmd = 'a';
    else if (v == "cal_b")    pendingCmd = 'b';
    else if (v == "reset")    pendingCmd = 'r';
  }
};

void runPendingCommand() {
  char cmd = pendingCmd;
  if (!cmd) return;
  pendingCmd = 0;
  switch (cmd) {
    case 'z': zeroCalibration();      broadcastEvent("calibration", "zero");             break;
    case 'a': massCalibration(zoneA); broadcastEvent("calibration", "left calibrated");  break;
    case 'b': massCalibration(zoneB); broadcastEvent("calibration", "right calibrated"); break;
    case 'r':
      turnCount = 0;
      lastTurnMs = lastTurnLogged = millis();
      zoneA.dose = zoneB.dose = 0;
      zoneA.mmHgPeak = zoneB.mmHgPeak = 0;
      copRef = cop;
      broadcastEvent("reset", "counters reset");
      break;
  }
}

// ==========================================================================
//  BLE broadcast (compact JSON)
// ==========================================================================
static float safeNum(float v) { return (isnan(v) || isinf(v)) ? 0.0f : v; }

void broadcastState() {
  if (!bleConnected || !stateChar) return;

  StaticJsonDocument<256> doc;
  doc["u"]  = (uint32_t)((millis() - bootMs) / 1000);
  doc["c"]  = safeNum(cop);
  doc["t"]  = turnCount;
  doc["st"] = safeNum((millis() - lastTurnMs) / 60000.0f);
  doc["b"]  = (mlxOK && !isnan(skinT))     ? JsonVariant(skinT)    : JsonVariant();
  doc["h"]  = (dhtOK && !isnan(humidity))  ? JsonVariant(humidity) : JsonVariant();
  doc["occ"] = occupied ? 1 : 0;

  JsonArray l = doc.createNestedArray("l");
  l.add(round1(zoneA.forceN));
  l.add(round1(zoneA.mmHg));
  l.add(round1(zoneA.grams));
  l.add(round1(zoneA.mmHgPeak));
  l.add(zoneA.saturated ? 1 : 0);
  l.add(zoneA.loaded    ? 1 : 0);

  JsonArray r = doc.createNestedArray("r");
  r.add(round1(zoneB.forceN));
  r.add(round1(zoneB.mmHg));
  r.add(round1(zoneB.grams));
  r.add(round1(zoneB.mmHgPeak));
  r.add(zoneB.saturated ? 1 : 0);
  r.add(zoneB.loaded    ? 1 : 0);

  char buf[256];
  size_t n = serializeJson(doc, buf, sizeof(buf));
  stateChar->setValue((uint8_t*)buf, n);
  stateChar->notify();
}

void broadcastEvent(const char* kind, const char* text) {
  if (!bleConnected || !eventChar) return;
  StaticJsonDocument<128> doc;
  doc["k"] = kind;
  doc["x"] = text;
  doc["u"] = (uint32_t)((millis() - bootMs) / 1000);
  char buf[128];
  size_t n = serializeJson(doc, buf, sizeof(buf));
  eventChar->setValue((uint8_t*)buf, n);
  eventChar->notify();
}

static float round1(float v) { return roundf(v * 10.0f) / 10.0f; }

// ==========================================================================
//  Setup / loop
// ==========================================================================
void setupBLE() {
  NimBLEDevice::init(US_DEVICE_NAME);
  NimBLEDevice::setPower(ESP_PWR_LVL_P7);
  NimBLEDevice::setMTU(247);

  NimBLEServer *srv = NimBLEDevice::createServer();
  srv->setCallbacks(new ServerCB());

  NimBLEService *svc = srv->createService(US_SERVICE_UUID);

  stateChar = svc->createCharacteristic(
    US_STATE_UUID,
    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
  );

  cmdChar = svc->createCharacteristic(
    US_CMD_UUID,
    NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR
  );
  cmdChar->setCallbacks(new CmdCB());

  eventChar = svc->createCharacteristic(
    US_EVENT_UUID,
    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
  );

  svc->start();

  NimBLEAdvertising *adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(US_SERVICE_UUID);
  adv->setName(US_DEVICE_NAME);
  adv->enableScanResponse(true);
  NimBLEDevice::startAdvertising();

  Serial.println(F("[BLE] advertising as UlcerShield-01"));
}

void setup() {
  Serial.begin(115200);
  delay(400);
  Serial.println(F("\r\nUlcerShield BLE peripheral v5"));

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

  while (Serial.available()) {
    char c = Serial.read();
    switch (c) {
      case 'c': case 'C': zeroCalibration();      break;
      case '1':           massCalibration(zoneA); break;
      case '2':           massCalibration(zoneB); break;
      case 'r': case 'R':
        turnCount = 0;
        lastTurnMs = lastTurnLogged = now;
        zoneA.dose = zoneB.dose = 0;
        zoneA.mmHgPeak = zoneB.mmHgPeak = 0;
        copRef = cop;
        break;
    }
  }

  runPendingCommand();

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

  if (now - tFast   >= T_FAST_MS)   { tFast   = now;
    Serial.printf("L=%6.1f mmHg  R=%6.1f mmHg  CoP%+0.2f  T=%s  H=%s\r\n",
                  zoneA.mmHg, zoneB.mmHg, cop,
                  mlxOK && !isnan(skinT) ? String(skinT,1).c_str() : "--",
                  dhtOK && !isnan(humidity) ? String(humidity,0).c_str() : "--");
  }
  if (now - tNotify >= T_NOTIFY_MS) { tNotify = now; broadcastState(); }

  delay(20);
}
