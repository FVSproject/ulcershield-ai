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

`firmware/BedsorePredictorBLE.ino` exposes a compact BLE GATT service:

| Char UUID (short) | Direction | Purpose                                     |
|-------------------|-----------|---------------------------------------------|
| `fd01`            | notify    | JSON `state` packets (~1 Hz)                |
| `fd02`            | write     | ASCII commands (`cal_zero`, `cal_a`, ...)   |
| `fd03`            | notify    | JSON `event` packets (turn, calibration…)   |

Service UUID: `0000fd00-1212-efde-1523-785feabcd123`.

### Required libraries (Arduino IDE)

- NimBLE-Arduino (h2zero)
- ArduinoJson (Benoit Blanchon)
- DHT sensor library (Adafruit)
- Adafruit MLX90614 Library

### Pair from the browser

1. Flash `firmware/BedsorePredictorBLE.ino` to the ESP32.
2. Open the deployed platform in Chrome/Edge/Android.
3. Sign in (or click "Continue as demo patient").
4. Go to **Device → Pair device**.
5. Pick `UlcerShield-01` from the browser's pairing dialog.

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
