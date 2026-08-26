/*
 * ============================================================================
 *  UlcerShield AI  -  Bedsore Early Prediction  -  ESP32 Prototype  v4
 *  نظام التنبؤ المبكر بقرحة الفراش
 * ============================================================================
 *  v3 -- WiFi Access Point + Web Dashboard
 *    - ESP32 becomes its own WiFi AP ("PressureGuard-AP", pass "bedsore123")
 *    - Up to 8 devices can connect simultaneously (multi-client WebSocket)
 *    - Bespoke bilingual (EN/AR) dashboard served from SPIFFS at
 *      http://192.168.4.1  -- live pressure (N / mmHg / g), turns, body temp,
 *      humidity, CoP, risk index, event timeline, calibration controls.
 *    - Calibration commands are queued and executed in the main loop so the
 *      async network task is never blocked.
 *
 *  v2
 *    - Two FSR divider wirings supported (auto-corrected)
 *    - Calibratable power law  F = C / R^n
 *    - Smoothing on FORCE so all units agree
 *    - Saturation flag + display clamp
 *    - 15 s boot grace so startup noise doesn't count as a turn
 *
 *  Serial commands (115200 baud) -- still available:
 *    c = zero / no-load calibration + skin-temp baseline
 *    1 = calibrate zone A with the known mass sitting on it
 *    2 = calibrate zone B with the known mass sitting on it
 *    r = reset turn counter, dose, timers
 *    m = print pressure map now
 *    ? = print current calibration constants
 *
 *  WebSocket commands (from dashboard):
 *    cal_zero, cal_a, cal_b, reset  -- same semantics as above
 *
 *  NOT a certified medical device. Thresholds are literature-inspired
 *  heuristics (capillary closing pressure ~32 mmHg, 2 h repositioning rule,
 *  ~1.5 C local temperature differential) and need clinical validation.
 * ============================================================================
 */

#include <Wire.h>
#include <DHT.h>
#include <Adafruit_MLX90614.h>
#include <WiFi.h>
#include <SPIFFS.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>

// ==========================================================================
//  Required libraries (install via Library Manager):
//    - ESPAsyncWebServer  (by ESP32Async or me-no-dev)
//    - AsyncTCP           (by ESP32Async or me-no-dev)
//    - ArduinoJson        (by Benoit Blanchon)
//    - DHT sensor library (by Adafruit)
//    - Adafruit MLX90614 Library
//  SPIFFS upload: use "ESP32 Sketch Data Upload" tool to flash the /data folder.
// ==========================================================================

// ==========================================================================
//  WIFI ACCESS POINT  /  نقطة وصول
// ==========================================================================
const char*     AP_SSID = "UlcerShield-AP";
const char*     AP_PASS = "ulcershield123";    // >= 8 chars for WPA2
const IPAddress AP_IP  (192, 168, 4, 1);
const IPAddress AP_NET (255, 255, 255, 0);
const uint8_t   AP_CHANNEL     = 6;
const uint8_t   AP_MAX_CLIENTS = 8;             // multi-device support

// ==========================================================================
//  1. WIRING MODE  /  نمط التوصيل      <-- THIS is what was wrong
// ==========================================================================
//  MODE 1 (your current board):   3V3 --- 10k --- ADC --- FSR --- GND
//        unpressed -> ADC near 3.3 V      pressed -> ADC near 0 V
//
//  MODE 0 (original code):        3V3 --- FSR --- ADC --- 10k --- GND
//        unpressed -> ADC near 0 V        pressed -> ADC near 3.3 V
//
//  Keep your wiring and leave this at 1, or physically swap the FSR and the
//  10k resistor and set it to 0. Either works.
#define FSR_WIRING_PULLUP   1

// ==========================================================================
//  2. PINS
// ==========================================================================
#define FSR1_PIN        34      // ADC1 only (32..39) - ADC2 dies with WiFi on
#define FSR2_PIN        35
#define DHT_PIN         4       // + 10k pull-up to 3V3
#define DHT_TYPE        DHT22
#define I2C_SDA         21
#define I2C_SCL         22

// ==========================================================================
//  3. FSR MODEL / معايرة الحساس
// ==========================================================================
const float R_FIXED       = 10000.0f;  // divider resistor (ohms)
const float V_SUPPLY_MV   = 3300.0f;   // measure your real 3V3 rail and edit
const int   ADC_SAMPLES   = 16;

// Load-spreading area: the area over which the force is actually distributed.
// Bare FSR402 pad = 1.267e-4 m2 (12.7 mm dia). If you glue a rigid disc or a
// foam puck on top, use THAT disc's area instead - it decides the mmHg number.
const float LOAD_AREA_M2  = 1.267e-4f;

// Power law  F[N] = FSR_C / R[ohm]^FSR_N
// Defaults are a generic FSR402 curve; overwrite them with commands '1' / '2'.
const float FSR_N         = 1.0f;      // exponent, ~1.0 for FSR402 mid-range
float fsrC_A              = 29430.0f;  // = 9.81 N * 3000 ohm
float fsrC_B              = 29430.0f;

const float CAL_MASS_KG   = 1.0f;      // the known mass you press with
const float R_NO_LOAD     = 100000.0f; // above this = nothing on the sensor
const float R_SATURATED   = 500.0f;    // below this = FSR bottomed out
const float F_MAX_N       = 25.0f;     // FSR402 practical ceiling
const float P_DISPLAY_CAP = 300.0f;    // clamp mmHg for display / mapping

// ==========================================================================
//  4. CLINICAL THRESHOLDS
// ==========================================================================
const float P_CAPILLARY_MMHG  = 32.0f;   // capillary closing pressure
const float P_HIGH_MMHG       = 60.0f;
const float P_CRITICAL_MMHG   = 100.0f;
const float P_OCCUPIED_MMHG   = 8.0f;
const float TURN_INTERVAL_MIN = 120.0f;  // 2-hour repositioning guideline
const float DOSE_LIMIT        = 3000.0f; // mmHg*min above capillary pressure

const float    COP_TURN_DELTA  = 0.35f;
const uint32_t TURN_STABLE_MS  = 4000;
const uint32_t OFFLOAD_MS      = 3000;
const uint32_t TURN_LOCKOUT_MS = 20000;
const uint32_t BOOT_GRACE_MS   = 15000;

const uint32_t T_FAST_MS       = 1000;
const uint32_t T_ANALYSIS_MS   = 10000;
const uint32_t T_DHT_MS        = 2500;

// ==========================================================================
//  5. OBJECTS & STATE
// ==========================================================================
DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_MLX90614 mlx = Adafruit_MLX90614();

struct Zone {
  const char* name;
  uint8_t pin;
  float*  calC;
  uint16_t mv;
  float rFsr;
  float forceN;      // smoothed
  float kPa;
  float mmHg;
  float grams;       // equivalent mass = forceN / g * 1000
  float mmHgPeak;
  float dose;
  float rNoLoad;     // captured by 'c'
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
uint32_t tFast = 0, tAnalysis = 0, tDht = 0, tDose = 0;

int   riskScore = 0;
float riskP = 0, riskT = 0, riskM = 0, riskTemp = 0, riskAsym = 0;

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");
uint32_t       tBroadcast     = 0;
const uint32_t T_BROADCAST_MS = 1000;
bool           spiffsOK       = false;

// Calibration is deferred to loop() so the async network task never blocks.
volatile char pendingCmd = 0;   // 0=none, 'z'=zero, 'a'=cal A, 'b'=cal B, 'r'=reset

// -------- active patient + logging --------
const char*    USERS_FILE       = "/users.json";
const uint32_t T_LOG_MS         = 5000;     // 5 seconds per log sample
uint32_t       tLog             = 0;
String         activeUserId     = "";       // logically the "patient being monitored"
String         activeUserName   = "";

void registerTurn(const char* reason);
void printPressureMap();
void broadcastState();
void broadcastEvent(const char* type, const char* text);

// ==========================================================================
//  6. FSR READING
// ==========================================================================
float fmapf(float x, float a, float b, float c, float d) {
  if (b == a) return c;
  return (x - a) * (d - c) / (b - a) + c;
}

uint16_t readMilliVoltsAvg(uint8_t pin) {
  uint32_t acc = 0;
  for (int i = 0; i < ADC_SAMPLES; i++) { acc += analogReadMilliVolts(pin); delayMicroseconds(200); }
  return (uint16_t)(acc / ADC_SAMPLES);
}

// Convert the divider voltage into FSR resistance, honouring the wiring mode.
float mvToResistance(uint16_t mv) {
  float v = (float)mv;
#if FSR_WIRING_PULLUP
  // 3V3 - Rfixed - ADC - FSR - GND :  R = Rfixed * V / (Vs - V)
  if (v >= V_SUPPLY_MV - 25.0f) return INFINITY;   // open circuit / unpressed
  if (v <= 5.0f)                return 0.5f;       // dead short
  return R_FIXED * v / (V_SUPPLY_MV - v);
#else
  // 3V3 - FSR - ADC - Rfixed - GND :  R = Rfixed * (Vs - V) / V
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
    rawF        = 0.0f;
    z.loaded    = false;
    z.saturated = false;
  } else {
    rawF        = *z.calC / powf(z.rFsr, FSR_N);
    z.loaded    = true;
    z.saturated = (z.rFsr < R_SATURATED);
    if (rawF > F_MAX_N) { rawF = F_MAX_N; z.saturated = true; }
  }

  // smooth the FORCE, then derive everything from it -> all units agree
  if (!z.primed) { z.forceN = rawF; z.primed = true; }
  else           { z.forceN = 0.7f * z.forceN + 0.3f * rawF; }

  z.kPa   = (z.forceN / LOAD_AREA_M2) / 1000.0f;
  z.mmHg  = z.kPa * 7.50062f;
  z.grams = z.forceN / 9.80665f * 1000.0f;   // F = m*g  ->  m(g) = F/g * 1000
  if (z.mmHg > P_DISPLAY_CAP) z.mmHg = P_DISPLAY_CAP;
  if (z.mmHg > z.mmHgPeak)    z.mmHgPeak = z.mmHg;
}

const char* pressureLabel(const Zone &z) {
  if (z.saturated)                return "SATURATED";
  if (z.mmHg < P_OCCUPIED_MMHG)   return "NO LOAD";
  if (z.mmHg < P_CAPILLARY_MMHG)  return "SAFE";
  if (z.mmHg < P_HIGH_MMHG)       return "ELEVATED";
  if (z.mmHg < P_CRITICAL_MMHG)   return "HIGH";
  return "CRITICAL";
}

char mapChar(float mmHg) {
  if (mmHg < P_OCCUPIED_MMHG)  return ' ';
  if (mmHg < P_CAPILLARY_MMHG) return '.';
  if (mmHg < P_HIGH_MMHG)      return '-';
  if (mmHg < P_CRITICAL_MMHG)  return '#';
  return '@';
}

void printBar(float mmHg) {
  int n = (int)constrain(mmHg / 150.0f * 24.0f, 0, 24);
  Serial.print('[');
  for (int i = 0; i < 24; i++) Serial.print(i < n ? '=' : ' ');
  Serial.print(']');
}

// ==========================================================================
//  7. TURN DETECTION  /  كشف تقلب المريض
// ==========================================================================
void updateTurnDetection() {
  uint32_t now = millis();
  float total = zoneA.mmHg + zoneB.mmHg;
  bool nowOccupied = (total > P_OCCUPIED_MMHG * 2.0f);

  if (nowOccupied) cop = (zoneB.mmHg - zoneA.mmHg) / total;   // -1 .. +1

  if (now - bootMs < BOOT_GRACE_MS) {   // ignore start-up transients
    occupied = nowOccupied;
    copRef   = cop;
    return;
  }

  if (!nowOccupied && occupied) unoccupiedSince = now;
  if (nowOccupied && !occupied) {
    if (unoccupiedSince && (now - unoccupiedSince) > OFFLOAD_MS)
      registerTurn("off-load / رفع المريض");
    unoccupiedSince = 0;
  }
  occupied = nowOccupied;
  if (!occupied) { copPending = false; return; }

  if (fabs(cop - copRef) > COP_TURN_DELTA) {
    if (!copPending) {
      copPending = true; copPendingSince = now; copCandidate = cop;
    } else if (fabs(cop - copCandidate) >= 0.15f) {
      copCandidate = cop; copPendingSince = now;
    } else if ((now - copPendingSince) > TURN_STABLE_MS) {
      registerTurn("posture shift / تغير الوضعية");
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
  Serial.printf("\r\n>>> TURN DETECTED #%lu  (%s)  CoP=%+0.2f\r\n\r\n",
                turnCount, reason, cop);
  broadcastEvent("turn", reason);
}

// ==========================================================================
//  8. RISK MODEL
// ==========================================================================
void updateDose(float dtMin) {
  if (!occupied) return;
  if (zoneA.mmHg > P_CAPILLARY_MMHG) zoneA.dose += (zoneA.mmHg - P_CAPILLARY_MMHG) * dtMin;
  if (zoneB.mmHg > P_CAPILLARY_MMHG) zoneB.dose += (zoneB.mmHg - P_CAPILLARY_MMHG) * dtMin;
}

void computeRisk() {
  float pMax = max(zoneA.mmHg, zoneB.mmHg);
  float mins = (millis() - lastTurnMs) / 60000.0f;

  riskP = constrain(fmapf(pMax, P_CAPILLARY_MMHG, P_CRITICAL_MMHG + 20, 0, 30), 0, 30);
  riskT = occupied ? constrain(mins / TURN_INTERVAL_MIN * 30.0f, 0, 30) : 0;

  if (isnan(humidity) || humidity < 40) riskM = 0;
  else riskM = constrain(fmapf(humidity, 40, 80, 0, 15), 0, 15);

  riskTemp = 0;
  if (!isnan(skinT)) {
    if (skinT > 37.5f)      riskTemp += constrain(fmapf(skinT, 37.5f, 39.5f, 0, 10), 0, 10);
    else if (skinT < 33.0f) riskTemp += 5;
    if (!isnan(baselineSkinT) && (skinT - baselineSkinT) > 1.5f) riskTemp += 5;
    riskTemp = constrain(riskTemp, 0, 15);
  }

  riskAsym  = occupied ? constrain((fabs(cop) - 0.4f) / 0.6f * 10.0f, 0, 10) : 0;
  riskScore = (int)constrain(riskP + riskT + riskM + riskTemp + riskAsym, 0, 100);
}

const char* riskLabel() {
  if (riskScore < 25) return "LOW / منخفض";
  if (riskScore < 50) return "MODERATE / متوسط";
  if (riskScore < 75) return "HIGH / مرتفع";
  return "CRITICAL / خطر";
}

// ==========================================================================
//  9. PRINTING
// ==========================================================================
void printPressureMap() {
  Serial.println(F("  PRESSURE MAP  (A <---------------> B)   خريطة الضغط"));
  Serial.print(F("  "));
  for (int i = 0; i <= 20; i++) {
    float t = i / 20.0f;
    Serial.print(mapChar(zoneA.mmHg * (1 - t) + zoneB.mmHg * t));
  }
  Serial.println();
  Serial.printf("  %-3.0f%18s%3.0f   (mmHg)\r\n", zoneA.mmHg, "", zoneB.mmHg);
  Serial.println(F("  legend: ' '=empty  '.'<32  '-'<60  '#'<100  '@'>=100 mmHg"));
}

void printFast() {
  Serial.println(F("------------------------------------------------------------"));
  for (Zone *z : {&zoneA, &zoneB}) {
    Serial.printf("  %-5s : %6.2f N | %7.1f mmHg | %7.1f g\r\n",
                  z->name, z->forceN, z->mmHg, z->grams);
  }
  Serial.printf("  Turns    : %lu\r\n", turnCount);
  if (mlxOK && !isnan(skinT)) Serial.printf("  Body T   : %.2f C  (MLX90614)\r\n", skinT);
  else                        Serial.println(F("  Body T   : ERR    (MLX90614)"));
  if (dhtOK && !isnan(humidity)) Serial.printf("  Humidity : %.1f %%  (DHT22)\r\n", humidity);
  else                           Serial.println(F("  Humidity : ERR    (DHT22)"));
}

void printAnalysis() {
  float mins    = (millis() - lastTurnMs) / 60000.0f;
  float pMax    = max(zoneA.mmHg, zoneB.mmHg);
  float doseMax = max(zoneA.dose, zoneB.dose);

  Serial.println(F("\r\n=========================================================="));
  Serial.println(F("        BEDSORE RISK ANALYSIS / تحليل خطر قرحة الفراش"));
  Serial.println(F("=========================================================="));
  Serial.printf("  Bed status      : %s\r\n", occupied ? "OCCUPIED / مشغول" : "EMPTY / فارغ");

  for (Zone *z : {&zoneA, &zoneB}) {
    Serial.printf("  Zone %-14s: %6.1f mmHg (peak %5.1f) ", z->name, z->mmHg, z->mmHgPeak);
    printBar(z->mmHg);
    Serial.printf(" %s\r\n", pressureLabel(*z));
  }
  Serial.println();
  printPressureMap();
  Serial.println();

  Serial.printf("  Turns counted   : %lu   (عدد مرات التقلب)\r\n", turnCount);
  Serial.printf("  Since last turn : %.1f min / limit %.0f min\r\n", mins, TURN_INTERVAL_MIN);
  Serial.printf("  Load balance    : CoP %+0.2f -> %s\r\n", cop,
                fabs(cop) < 0.2f ? "balanced / متوازن"
                                 : (cop < 0 ? "leaning on A" : "leaning on B"));
  Serial.printf("  Pressure-time   : %.0f / %.0f mmHg.min\r\n", doseMax, DOSE_LIMIT);

  if (dhtOK) Serial.printf("  Microclimate    : RH %.1f %%  ambient %.1f C  %s\r\n",
                           humidity, ambientT,
                           humidity > 65 ? "MOIST - maceration risk" : "acceptable");
  if (mlxOK && !isnan(skinT)) {
    Serial.printf("  Skin temp       : %.2f C", skinT);
    if (!isnan(baselineSkinT)) Serial.printf("  (baseline %.2f, delta %+0.2f)",
                                            baselineSkinT, skinT - baselineSkinT);
    if (!isnan(ambientT))      Serial.printf("  skin-ambient %+0.2f", skinT - ambientT);
    if (skinT < 30.0f)         Serial.print(F("  <-- too low for skin, check sensor distance"));
    Serial.println();
  }

  Serial.println(F("  ----------------------------------------------------------"));
  Serial.printf("  RISK SCORE      : %d / 100  ->  %s\r\n", riskScore, riskLabel());
  Serial.printf("     pressure %.1f/30 | immobility %.1f/30 | moisture %.1f/15 |"
                " temp %.1f/15 | asymmetry %.1f/10\r\n",
                riskP, riskT, riskM, riskTemp, riskAsym);

  float rate = (pMax > P_CAPILLARY_MMHG) ? (pMax - P_CAPILLARY_MMHG) : 0;
  if (occupied && rate > 0.5f) {
    float remaining = (DOSE_LIMIT - doseMax) / rate;
    if (remaining < 0) remaining = 0;
    Serial.printf("  PREDICTION      : tissue tolerance exhausted in ~%.0f min"
                  " (الوقت المتبقي)\r\n", remaining);
  } else {
    Serial.println(F("  PREDICTION      : no sustained ischemic loading detected"));
  }

  Serial.println(F("  ACTIONS / التوصيات:"));
  bool any = false;
  if (occupied && mins > TURN_INTERVAL_MIN) {
    Serial.println(F("    * REPOSITION NOW - 2 h limit exceeded / يجب تقليب المريض")); any = true;
  } else if (occupied && mins > TURN_INTERVAL_MIN * 0.75f) {
    Serial.println(F("    * Reposition due soon (<30 min)")); any = true;
  }
  if (pMax > P_CRITICAL_MMHG) {
    Serial.println(F("    * Peak > 100 mmHg - offload this zone / تخفيف الضغط")); any = true;
  } else if (pMax > P_HIGH_MMHG) {
    Serial.println(F("    * Above capillary closing pressure - add cushion / وسادة")); any = true;
  }
  if (zoneA.saturated || zoneB.saturated) {
    Serial.println(F("    * FSR saturated - point load, not a valid pressure figure")); any = true;
  }
  if (dhtOK && humidity > 65) {
    Serial.println(F("    * Humidity high - change/dry linen / تغيير الملاءات")); any = true;
  }
  if (mlxOK && !isnan(skinT) && skinT > 37.5f) {
    Serial.println(F("    * Skin temperature elevated - inspect skin / فحص الجلد")); any = true;
  }
  if (mlxOK && !isnan(skinT) && skinT < 33.0f && skinT > 28.0f && occupied) {
    Serial.println(F("    * Low skin temperature - check perfusion / التروية")); any = true;
  }
  if (fabs(cop) > 0.6f && mins > 30) {
    Serial.println(F("    * Sustained one-sided loading - alternate side")); any = true;
  }
  if (!any) Serial.println(F("    * None - continue routine monitoring"));
  Serial.println(F("==========================================================\r\n"));
}

// ==========================================================================
//  10. CALIBRATION
// ==========================================================================
void zeroCalibration() {
  Serial.println(F("\r\n--- ZERO: remove ALL load from both FSRs ---"));
  delay(1500);
  for (Zone *z : {&zoneA, &zoneB}) {
    uint32_t acc = 0;
    for (int i = 0; i < 32; i++) { acc += analogReadMilliVolts(z->pin); delay(8); }
    z->rNoLoad = mvToResistance(acc / 32);
    z->primed  = false;
    z->mmHgPeak = 0;
    Serial.printf("    zone %s : no-load R = ", z->name);
    if (isinf(z->rNoLoad)) Serial.println(F("OPEN (good)"));
    else                   Serial.printf("%.0f ohm\r\n", z->rNoLoad);
  }
  if (mlxOK) {
    float s = 0; int n = 0;
    for (int i = 0; i < 5; i++) { float v = mlx.readObjectTempC();
                                 if (!isnan(v)) { s += v; n++; } delay(120); }
    if (n) { baselineSkinT = s / n;
             Serial.printf("    baseline skin temp: %.2f C\r\n", baselineSkinT); }
  }
  Serial.println(F("--- done ---\r\n"));
}

void massCalibration(Zone &z) {
  Serial.printf("\r\n--- CALIBRATE %s with %.2f kg ---\r\n", z.name, CAL_MASS_KG);
  Serial.println(F("    Put the mass on a FLAT RIGID DISC over the pad, then wait..."));
  delay(3000);
  uint32_t acc = 0;
  for (int i = 0; i < 32; i++) { acc += analogReadMilliVolts(z.pin); delay(10); }
  float r = mvToResistance(acc / 32);
  if (isinf(r) || r > R_NO_LOAD) {
    Serial.println(F("    FAILED: no load seen. Check wiring / add the mass."));
    return;
  }
  float f = CAL_MASS_KG * 9.80665f;
  *z.calC = f * powf(r, FSR_N);
  z.primed = false;
  Serial.printf("    R = %.0f ohm at %.2f N  ->  C = %.0f\r\n", r, f, *z.calC);
  Serial.printf("    that mass over %.2f cm2 = %.0f mmHg\r\n",
                LOAD_AREA_M2 * 1e4f, (f / LOAD_AREA_M2 / 1000.0f) * 7.50062f);
  Serial.println(F("--- done ---\r\n"));
}

void printConstants() {
  Serial.println(F("\r\n--- CALIBRATION CONSTANTS ---"));
  Serial.printf("  wiring mode   : %s\r\n",
                FSR_WIRING_PULLUP ? "PULL-UP (Rfixed to 3V3, FSR to GND)"
                                  : "PULL-DOWN (FSR to 3V3, Rfixed to GND)");
  Serial.printf("  R_FIXED       : %.0f ohm\r\n", R_FIXED);
  Serial.printf("  load area     : %.3f cm2\r\n", LOAD_AREA_M2 * 1e4f);
  Serial.printf("  F = C / R^%.2f   C_A = %.0f   C_B = %.0f\r\n", FSR_N, fsrC_A, fsrC_B);
  Serial.println(F("-----------------------------\r\n"));
}

// ==========================================================================
//  11. WEB SERVER  /  خادم الويب
// ==========================================================================
static float safeNum(float v) { return (isnan(v) || isinf(v)) ? 0.0f : v; }

void appendZoneJson(JsonObject o, const Zone &z) {
  o["n"]     = safeNum(z.forceN);
  o["mmhg"]  = safeNum(z.mmHg);
  o["g"]     = safeNum(z.grams);
  o["peak"]  = safeNum(z.mmHgPeak);
  o["sat"]   = z.saturated;
  o["loaded"]= z.loaded;
  o["label"] = pressureLabel(z);
}

void broadcastState() {
  if (ws.count() == 0) return;
  StaticJsonDocument<2048> doc;
  doc["type"]           = "state";
  doc["uptime_s"]       = (uint32_t)((millis() - bootMs) / 1000);
  doc["occupied"]       = occupied;
  doc["cop"]            = safeNum(cop);
  doc["turns"]          = turnCount;
  doc["since_turn_min"] = safeNum((millis() - lastTurnMs) / 60000.0f);
  doc["turn_target_min"]= TURN_INTERVAL_MIN;
  doc["clients"]        = ws.count();
  doc["active_id"]      = activeUserId;
  doc["active_name"]    = activeUserName;

  appendZoneJson(doc.createNestedObject("left"),  zoneA);
  appendZoneJson(doc.createNestedObject("right"), zoneB);

  bool bodyOk = mlxOK && !isnan(skinT);
  doc["body_c"]      = bodyOk ? skinT : 0.0f;
  doc["body_ok"]     = bodyOk;
  bool humOk  = dhtOK && !isnan(humidity);
  doc["humidity"]    = humOk ? humidity : 0.0f;
  doc["humidity_ok"] = humOk;

  doc["risk"]        = riskScore;
  doc["risk_label"]  = riskLabel();
  doc["risk_p"]      = safeNum(riskP);
  doc["risk_t"]      = safeNum(riskT);
  doc["risk_m"]      = safeNum(riskM);
  doc["risk_temp"]   = safeNum(riskTemp);
  doc["risk_asym"]   = safeNum(riskAsym);

  String out;
  serializeJson(doc, out);
  ws.textAll(out);
}

void broadcastEvent(const char* type, const char* text) {
  if (ws.count() == 0) return;
  StaticJsonDocument<256> doc;
  doc["type"] = "event";
  doc["kind"] = type;
  doc["text"] = text;
  doc["uptime_s"] = (uint32_t)((millis() - bootMs) / 1000);
  String out;
  serializeJson(doc, out);
  ws.textAll(out);
}

void handleCommand(const String &cmd) {
  // Queue the command; the main loop runs it so long delays never block async_tcp.
  if      (cmd == "cal_zero") pendingCmd = 'z';
  else if (cmd == "cal_a")    pendingCmd = 'a';
  else if (cmd == "cal_b")    pendingCmd = 'b';
  else if (cmd == "reset")    pendingCmd = 'r';
}

void runPendingCommand() {
  char c = pendingCmd;
  if (!c) return;
  pendingCmd = 0;
  switch (c) {
    case 'z': zeroCalibration();      broadcastEvent("calibration", "zero");             break;
    case 'a': massCalibration(zoneA); broadcastEvent("calibration", "left calibrated");  break;
    case 'b': massCalibration(zoneB); broadcastEvent("calibration", "right calibrated"); break;
    case 'r':
      turnCount = 0;
      lastTurnMs = lastTurnLogged = millis();
      zoneA.dose = zoneB.dose = 0;
      zoneA.mmHgPeak = zoneB.mmHgPeak = 0;
      copRef = cop;
      Serial.println(F("\r\n*** counters reset (web) ***\r\n"));
      broadcastEvent("reset", "counters reset");
      break;
  }
}

void onWsEvent(AsyncWebSocket *srv, AsyncWebSocketClient *client,
               AwsEventType type, void *arg, uint8_t *data, size_t len) {
  switch (type) {
    case WS_EVT_CONNECT:
      Serial.printf("[WS] client #%u connected from %s (total %u)\r\n",
                    client->id(), client->remoteIP().toString().c_str(), srv->count());
      broadcastState();
      break;
    case WS_EVT_DISCONNECT:
      Serial.printf("[WS] client #%u disconnected (total %u)\r\n",
                    client->id(), srv->count());
      break;
    case WS_EVT_DATA: {
      AwsFrameInfo *info = (AwsFrameInfo*)arg;
      if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
        String msg;
        msg.reserve(len + 1);
        for (size_t i = 0; i < len; i++) msg += (char)data[i];
        Serial.printf("[WS] cmd: %s\r\n", msg.c_str());
        handleCommand(msg);
      }
      break;
    }
    default: break;
  }
}

// ==========================================================================
//  USER RECORDS  (SPIFFS-backed JSON array)
// ==========================================================================
bool readUsersDoc(DynamicJsonDocument &doc) {
  doc.clear();
  if (!spiffsOK || !SPIFFS.exists(USERS_FILE)) { doc.to<JsonArray>(); return true; }
  File f = SPIFFS.open(USERS_FILE, "r");
  if (!f) { doc.to<JsonArray>(); return false; }
  DeserializationError err = deserializeJson(doc, f);
  f.close();
  if (err) { doc.clear(); doc.to<JsonArray>(); return false; }
  if (!doc.is<JsonArray>()) { doc.clear(); doc.to<JsonArray>(); }
  return true;
}
bool writeUsersDoc(DynamicJsonDocument &doc) {
  if (!spiffsOK) return false;
  File f = SPIFFS.open(USERS_FILE, "w");
  if (!f) return false;
  serializeJson(doc, f);
  f.close();
  return true;
}

// ==========================================================================
//  DATA LOG (rolling CSV per active patient)
//  Row: uptime_s,epochish,leftMmHg,rightMmHg,cop,turns,bodyC,humidity,risk,occupied
// ==========================================================================
void appendLogRow() {
  if (!spiffsOK || activeUserId.length() == 0) return;
  String path = String("/log_") + activeUserId + ".csv";
  bool newFile = !SPIFFS.exists(path);
  File f = SPIFFS.open(path, newFile ? "w" : "a");
  if (!f) return;
  if (newFile) {
    f.println(F("uptime_s,leftMmHg,rightMmHg,cop,turns,bodyC,humidity,risk,occupied"));
  }
  char row[160];
  snprintf(row, sizeof(row),
           "%lu,%.1f,%.1f,%.3f,%lu,%.2f,%.1f,%d,%d\n",
           (unsigned long)((millis() - bootMs)/1000),
           zoneA.mmHg, zoneB.mmHg, cop,
           (unsigned long)turnCount,
           (mlxOK && !isnan(skinT)) ? skinT : 0.0,
           (dhtOK && !isnan(humidity)) ? humidity : 0.0,
           riskScore, occupied ? 1 : 0);
  f.print(row);
  // rough size cap: 200 KB per patient
  if (f.size() > 200000UL) {
    // simple prune: drop first half
    f.close();
    File src = SPIFFS.open(path, "r");
    if (src) {
      size_t half = src.size() / 2;
      src.seek(half);
      // skip to next newline for CSV integrity
      while (src.available()) { if (src.read() == '\n') break; }
      File dst = SPIFFS.open(path + ".tmp", "w");
      if (dst) {
        dst.println(F("uptime_s,leftMmHg,rightMmHg,cop,turns,bodyC,humidity,risk,occupied"));
        while (src.available()) dst.write(src.read());
        dst.close();
      }
      src.close();
      SPIFFS.remove(path);
      SPIFFS.rename(path + ".tmp", path);
    }
    return;
  }
  f.close();
}

// ==========================================================================
//  HTTP: users, login, log export
// ==========================================================================
String genId() {
  return String((uint32_t)esp_random(), HEX) + String((uint32_t)millis(), HEX);
}

void sendJson(AsyncWebServerRequest *req, int code, JsonDocument &doc) {
  String out; serializeJson(doc, out);
  req->send(code, "application/json", out);
}

void handleListUsers(AsyncWebServerRequest *req) {
  DynamicJsonDocument in(32768);
  readUsersDoc(in);
  DynamicJsonDocument out(32768);
  JsonArray arr = out.to<JsonArray>();
  for (JsonObject u : in.as<JsonArray>()) {
    JsonObject o = arr.createNestedObject();
    o["id"]       = u["id"];
    o["username"] = u["username"];
    o["name"]     = u["name"];
    o["avatar"]   = u["avatar"];
    o["role"]     = u["role"] | "patient";
  }
  sendJson(req, 200, out);
}

void handleGetUserById(AsyncWebServerRequest *req, const String &id) {
  DynamicJsonDocument in(16384);
  readUsersDoc(in);
  for (JsonObject u : in.as<JsonArray>()) {
    if (String((const char*)u["id"]) == id) {
      DynamicJsonDocument out(4096);
      JsonObject o = out.to<JsonObject>();
      for (JsonPair kv : u) if (String(kv.key().c_str()) != "password") o[kv.key()] = kv.value();
      return sendJson(req, 200, out);
    }
  }
  req->send(404, "application/json", "{\"error\":\"not found\"}");
}

void handleCreateOrUpdateUser(AsyncWebServerRequest *req, uint8_t *data, size_t len, size_t index, size_t total) {
  // simple single-chunk body assumption for small JSON payloads
  static String buf;
  if (index == 0) buf = "";
  buf.reserve(total);
  for (size_t i = 0; i < len; i++) buf += (char)data[i];
  if (index + len != total) return;

  DynamicJsonDocument body(16384);
  if (deserializeJson(body, buf)) { req->send(400, "application/json", "{\"error\":\"bad json\"}"); return; }
  DynamicJsonDocument users(32768);
  readUsersDoc(users);
  JsonArray arr = users.as<JsonArray>();

  String username = body["username"] | "";
  String id       = body["id"] | "";
  if (username.length() == 0) { req->send(400, "application/json", "{\"error\":\"username required\"}"); return; }

  // update if id matches
  bool updated = false;
  for (JsonObject u : arr) {
    if (id.length() && String((const char*)u["id"]) == id) {
      for (JsonPair kv : body.as<JsonObject>()) u[kv.key()] = kv.value();
      updated = true; break;
    }
  }
  if (!updated) {
    // reject if username taken
    for (JsonObject u : arr) {
      if (String((const char*)u["username"]) == username) {
        req->send(409, "application/json", "{\"error\":\"username exists\"}"); return;
      }
    }
    JsonObject o = arr.createNestedObject();
    id = genId();
    o["id"] = id;
    for (JsonPair kv : body.as<JsonObject>()) o[kv.key()] = kv.value();
    o["id"] = id;
  }
  writeUsersDoc(users);

  DynamicJsonDocument out(1024);
  out["ok"] = true;
  out["id"] = id;
  sendJson(req, 200, out);
}

void handleLogin(AsyncWebServerRequest *req, uint8_t *data, size_t len, size_t index, size_t total) {
  static String buf;
  if (index == 0) buf = "";
  buf.reserve(total);
  for (size_t i = 0; i < len; i++) buf += (char)data[i];
  if (index + len != total) return;

  DynamicJsonDocument body(1024);
  if (deserializeJson(body, buf)) { req->send(400, "application/json", "{\"error\":\"bad json\"}"); return; }
  String u = body["username"] | "";
  String p = body["password"] | "";

  DynamicJsonDocument users(32768);
  readUsersDoc(users);
  for (JsonObject usr : users.as<JsonArray>()) {
    if (String((const char*)usr["username"]) == u &&
        String((const char*)usr["password"]) == p) {
      DynamicJsonDocument out(2048);
      JsonObject o = out.to<JsonObject>();
      for (JsonPair kv : usr) if (String(kv.key().c_str()) != "password") o[kv.key()] = kv.value();
      o["token"] = String((uint32_t)esp_random(), HEX);
      return sendJson(req, 200, out);
    }
  }
  req->send(401, "application/json", "{\"error\":\"invalid credentials\"}");
}

void handleGetLogById(AsyncWebServerRequest *req, const String &id) {
  String path = "/log_" + id + ".csv";
  if (!spiffsOK || !SPIFFS.exists(path)) {
    req->send(200, "text/csv",
      "uptime_s,leftMmHg,rightMmHg,cop,turns,bodyC,humidity,risk,occupied\n");
    return;
  }
  AsyncWebServerResponse *r = req->beginResponse(SPIFFS, path, "text/csv", true);
  r->addHeader("Content-Disposition", "attachment; filename=\"log_" + id + ".csv\"");
  req->send(r);
}

void setActivePatientFromBody(AsyncWebServerRequest *req, uint8_t *data, size_t len, size_t index, size_t total) {
  static String buf;
  if (index == 0) buf = "";
  buf.reserve(total);
  for (size_t i = 0; i < len; i++) buf += (char)data[i];
  if (index + len != total) return;

  DynamicJsonDocument body(512);
  if (deserializeJson(body, buf)) { req->send(400, "application/json", "{\"error\":\"bad json\"}"); return; }
  activeUserId   = String((const char*)(body["id"]   | ""));
  activeUserName = String((const char*)(body["name"] | ""));
  broadcastEvent("active_user", activeUserName.c_str());
  DynamicJsonDocument out(256);
  out["ok"] = true;
  out["id"] = activeUserId;
  sendJson(req, 200, out);
}

void setupWiFiAP() {
  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(AP_IP, AP_IP, AP_NET);
  bool ok = WiFi.softAP(AP_SSID, AP_PASS, AP_CHANNEL, 0, AP_MAX_CLIENTS);
  Serial.println(F("\r\n--- WiFi Access Point ---"));
  Serial.printf("  SSID     : %s\r\n", AP_SSID);
  Serial.printf("  Password : %s\r\n", AP_PASS);
  Serial.printf("  IP       : %s\r\n", WiFi.softAPIP().toString().c_str());
  Serial.printf("  Channel  : %u   Max clients: %u\r\n", AP_CHANNEL, AP_MAX_CLIENTS);
  Serial.println(ok ? F("  Status   : UP") : F("  Status   : FAILED"));
  Serial.println(F("  Open http://192.168.4.1 in a browser after joining."));
  Serial.println(F("-------------------------\r\n"));
}

void setupWebServer() {
  spiffsOK = SPIFFS.begin(true);
  Serial.println(spiffsOK ? F("[OK]   SPIFFS mounted")
                          : F("[FAIL] SPIFFS mount failed - upload /data first"));

  ws.onEvent(onWsEvent);
  server.addHandler(&ws);

  server.on("/health", HTTP_GET, [](AsyncWebServerRequest *req) {
    req->send(200, "application/json",
              String("{\"ok\":true,\"clients\":") + ws.count() + "}");
  });

  // ----- REST endpoints -----
  server.on("/api/users", HTTP_GET, handleListUsers);
  server.on("/api/users", HTTP_POST,
            [](AsyncWebServerRequest*){}, NULL, handleCreateOrUpdateUser);
  server.on("/api/login", HTTP_POST,
            [](AsyncWebServerRequest*){}, NULL, handleLogin);
  server.on("/api/active", HTTP_POST,
            [](AsyncWebServerRequest*){}, NULL, setActivePatientFromBody);
  server.on("/api/active", HTTP_GET, [](AsyncWebServerRequest *req){
    DynamicJsonDocument out(256);
    out["id"]   = activeUserId;
    out["name"] = activeUserName;
    sendJson(req, 200, out);
  });

  if (spiffsOK) {
    server.serveStatic("/", SPIFFS, "/").setDefaultFile("index.html")
          .setCacheControl("no-cache");
  }

  server.onNotFound([](AsyncWebServerRequest *req) {
    // Manual routing for /api/users/:id and /api/log/:id (avoid regex compile-time gate).
    String url = req->url();
    if (req->method() == HTTP_GET) {
      if (url.startsWith("/api/users/")) {
        return handleGetUserById(req, url.substring(strlen("/api/users/")));
      }
      if (url.startsWith("/api/log/")) {
        return handleGetLogById(req, url.substring(strlen("/api/log/")));
      }
    }
    if (!spiffsOK) {
      req->send(200, "text/html",
        "<!doctype html><meta charset=utf-8><title>UlcerShield AI</title>"
        "<body style='font-family:system-ui;padding:2rem;max-width:640px;margin:auto'>"
        "<h1>SPIFFS empty</h1>"
        "<p>Upload the <code>/data</code> folder using the "
        "<b>ESP32 Sketch Data Upload</b> tool, then reboot.</p>");
    } else {
      req->send(404, "text/plain", "not found");
    }
  });

  server.begin();
  Serial.println(F("[OK]   HTTP server started on :80  (ws /ws)"));
}

// ==========================================================================
//  12. SETUP / LOOP
// ==========================================================================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println(F("\r\n\r\n############################################################"));
  Serial.println(F("  BEDSORE EARLY PREDICTION SYSTEM - ESP32  (v2)"));
  Serial.println(F("  نظام التنبؤ المبكر بقرحة الفراش"));
  Serial.println(F("  commands: c=zero  1/2=mass cal  r=reset  m=map  ?=constants"));
  Serial.println(F("############################################################\r\n"));

  analogReadResolution(12);
  analogSetPinAttenuation(FSR1_PIN, ADC_11db);
  analogSetPinAttenuation(FSR2_PIN, ADC_11db);

  dht.begin();
  Wire.begin(I2C_SDA, I2C_SCL);
  mlxOK = mlx.begin();
  Serial.println(mlxOK ? F("[OK]   MLX90614 detected")
                       : F("[FAIL] MLX90614 not found - check SDA/SCL/3V3"));
  dhtOK = !isnan(dht.readHumidity());
  Serial.println(dhtOK ? F("[OK]   DHT22 responding")
                       : F("[WARN] DHT22 silent - check data pin + 10k pull-up"));

  printConstants();
  bootMs = tDose = millis();
  lastTurnMs = lastTurnLogged = millis();

  setupWiFiAP();
  setupWebServer();

  Serial.println(F("Streaming pressure (N/mmHg/g), turns, body temp (MLX), humidity (DHT22) every 1 s.\r\n"));
}

void loop() {
  uint32_t now = millis();

  while (Serial.available()) {
    char c = Serial.read();
    switch (c) {
      case 'c': case 'C': zeroCalibration();      break;
      case '1':           massCalibration(zoneA); break;
      case '2':           massCalibration(zoneB); break;
      case 'm': case 'M': printPressureMap();     break;
      case '?':           printConstants();       break;
      case 'r': case 'R':
        turnCount = 0;
        lastTurnMs = lastTurnLogged = now;
        zoneA.dose = zoneB.dose = 0;
        zoneA.mmHgPeak = zoneB.mmHgPeak = 0;
        copRef = cop;
        Serial.println(F("\r\n*** counters reset ***\r\n"));
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

  computeRisk();

  if (now - tFast      >= T_FAST_MS)      { tFast = now;      printFast(); }
  if (now - tBroadcast >= T_BROADCAST_MS) { tBroadcast = now; broadcastState(); }
  if (now - tLog       >= T_LOG_MS)       { tLog = now;       appendLogRow();  }

  ws.cleanupClients();
  delay(20);
}
