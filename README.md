# UlcerShield AI · Bedsore Prevention Platform

A predictive, non-invasive bedside intelligence platform for pressure injury prevention. An ESP32 sensor rig streams FSR pressure, IR skin temperature, humidity and posture to a browser via Bluetooth Low Energy; the web platform interprets the stream with a rule-based risk model and — on demand — asks Claude for a clinician-grade narrative and next-best actions.

**Not a certified medical device.** Thresholds are literature-inspired heuristics and require clinical validation.

## Layout

```
BedsorePredictor/
├── platform/            Next.js 16 web platform (deploys to Vercel)
├── firmware/            ESP32 BLE peripheral firmware (v5, Web-Bluetooth linked)
├── BedsorePredictor.ino Legacy v4 firmware (WiFi AP + on-device SPA)
└── data/                Legacy v4 SPA assets (kept for reference)
```

## Web platform

The platform is a **fully separate online app** — it no longer ships on SPIFFS. Deploy to Vercel or Netlify; connect to the ESP32 via Web Bluetooth from any Chrome/Edge/Android device.

### Run locally

```bash
cd platform
npm install
npm run dev
# open http://localhost:3000
```

### Enable Claude AI insights

The `/ai/analyze` route uses the official Anthropic SDK with adaptive thinking + prompt caching. To enable it, put an API key in `platform/.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Without a key, the rest of the platform works — only the "Ask Claude" panel is disabled.

### Deploy

```bash
cd platform
npx vercel deploy
```

Set `ANTHROPIC_API_KEY` in the Vercel project settings.

## Firmware — BLE peripheral (v5)

`firmware/BedsorePredictorBLE/BedsorePredictorBLE.ino` exposes a compact BLE GATT service:

| Char UUID (short) | Direction | Purpose                                     |
|-------------------|-----------|---------------------------------------------|
| `fd01`            | notify    | JSON `state` packets (~1 Hz)                |
| `fd02`            | write     | ASCII commands (`cal_zero`, `cal_a`, `tilt:30`, ...) |
| `fd03`            | notify    | JSON `event` packets (turn, calibration…)   |

Service UUID: `0000fd00-1212-efde-1523-785feabcd123`.

### Required libraries (Arduino IDE)

- NimBLE-Arduino 2.x (h2zero)
- DHT sensor library (Adafruit)
- Adafruit MLX90614 Library

### Pair from the browser

1. Flash `firmware/BedsorePredictorBLE/BedsorePredictorBLE.ino` to the ESP32.
2. Open the deployed platform in Chrome/Edge/Android.
3. Sign in (or click "Continue as demo patient").
4. Go to **Device → Pair device**.
5. Pick `UlcerShield-01` from the browser's pairing dialog.

The on-board LED blinks while the ESP32 waits for a browser and stays solid once paired. Don't pair it from the OS Bluetooth settings; the browser connects directly. Type `?` in the Serial Monitor (115200 baud) to print the BLE name, MAC, connected screens and sensor status. Up to 3 browsers can stay connected at once.

### Skin temperature calibration

The MLX90614 reads skin *surface* temperature, normally a few °C below a thermometer. To match a thermometer: hold the sensor flat on the skin for about a minute, take a thermometer reading at the same moment, and enter it under **Calibration & controls → Temperature calibration** (or send `temp_ref:36.8`). The ESP32 stores the offset in flash, so it survives reboots; `temp_ref:clear` removes it. Recalibrate if the sensor moves to another body site.

### Bed tilt servo (demo bed v2)

An MG996R rolls the bed's pillow tray on its long axis. This is the *Intervene* step: pressing **Apply** on a lateral-tilt recommendation (or accepting an escalation on the Evaluate card) tilts the bed, and the Controls card has manual **Left / Flat / Right** buttons.

- `tilt:<deg>` takes the clinical angle, `+` = right side down, `0` = flat.
- The demo tray rolls 25° for a 35° clinical tilt (`TILT_SCALE` = 25/35: 30° → 21.4°, 40° → 28.6°), within a 30° travel limit. Use `TILT_SCALE` 1.0 for a full-size bed.
- It moves at 5°/s and a completed tilt counts as a turn.
- Wiring: signal → GPIO 13; V+ → a separate 5–6 V supply (≥ 3 A); GND → supply GND **and** ESP32 GND. Powering it from the ESP32 5V pin browns out the board and drops Bluetooth.
- If it rolls the wrong way set `SERVO_INVERT 1`. If the tray isn't level at Flat, press Flat and use `[` / `]` in the Serial Monitor (0.5° per press, saved in flash). The default level point, `TILT_LEVEL_TRIM_DEG`, is the one measured on the Fab Lab bed.
- Serial: `<` tilt left 30°, `>` tilt right 30°, `0` flat, `[` / `]` shift the level point.

## Bed camera — ESP32-CAM live feed

`firmware/UlcerShieldCam/UlcerShieldCam.ino` streams the bed to the dashboard's **Live feed** card (Start / Stop camera, Record).

1. Set `WIFI_SSID` / `WIFI_PASS` in the sketch. Board: **AI Thinker ESP32-CAM**. Power it from a 5 V / 2 A supply (weak USB power causes brownout resets).
2. The Serial Monitor (115200) prints the camera address; it also answers at `http://ulcershield-cam.local`. Open that address in a browser to check the picture.
3. On the dashboard, put the camera on the same Wi-Fi as the laptop/phone, press **Start camera**, and click **Allow** when Chrome asks to access devices on your local network.

- Endpoints: port 80 `/status`, `/control?camera=on|off`, `/capture`; port 81 `/stream` (MJPEG). One live viewer at a time.
- If the address can't be resolved, enter the IP under **Live feed → Camera address**. Chrome / Edge only.
- If the camera can't join the Wi-Fi it starts an access point `UlcerShield-CAM` (password `ulcershield`, `192.168.4.1`).
- Recording is simulated: it shows a REC timer and lists clips with a thumbnail, but stores no video.

## Simulator

The platform ships with a synthetic sensor source that runs in the browser — no ESP32 required. Every authed page auto-starts it if no BLE device is paired.

## Features

- **Live dashboard** — pressure zones, animated body pressure map, vitals, turn-timer ring, CoP tracker, risk index, timeline
- **Explainable risk** — 100-point score decomposed into pressure / immobility / moisture / temperature / asymmetry
- **AI insights (Claude Opus 4.7)** — clinician-grade narrative, reasoning bullets, tone-tagged actions, escalation flag
- **Analysis view** — Recharts pressure/risk/env/CoP over any date range; CSV + PDF export
- **Multilingual** — EN / AR / KO with RTL for Arabic
- **Themed** — light + dark, S/M/L/XL text scaling, futuristic gradients and glass surfaces
- **Local-first** — patient records + session logs stored in IndexedDB (Dexie)

## Stack

- Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · Recharts · Dexie · Zustand · Anthropic SDK
