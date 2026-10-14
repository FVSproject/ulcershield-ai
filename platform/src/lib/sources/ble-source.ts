"use client";

import type { SensorState, ZoneReading } from "@/types/sensor";
import { stateFromRaw } from "@/lib/risk";
import { useSensorStore } from "@/lib/store";
import { logger } from "@/lib/log";

/**
 * Web Bluetooth client for the UlcerShield ESP32 GATT peripheral.
 *
 * GATT layout (must match the firmware):
 *   Service     UUID  0000fd00-1212-efde-1523-785feabcd123
 *     Notify    UUID  0000fd01-1212-efde-1523-785feabcd123  (JSON "state" packets)
 *     Write     UUID  0000fd02-1212-efde-1523-785feabcd123  (ASCII commands, see DeviceCommand)
 *     Notify    UUID  0000fd03-1212-efde-1523-785feabcd123  (JSON "event" packets)
 *
 * Notify payload (JSON, one per packet, <= 240 bytes to fit MTU):
 * {
 *   "u": <uptime_s>,
 *   "l": [n, mmhg, g, peak, sat|0, loaded|0],
 *   "r": [n, mmhg, g, peak, sat|0, loaded|0],
 *   "c": <cop>,
 *   "t": <turns>,
 *   "st": <since_turn_min>,
 *   "b": <body_c or null>,
 *   "bo": <skin-temp calibration offset °C>                (firmware v5.3+)
 *   "h": <humidity or null>,
 *   "occ": 0|1,
 *   "tl": <tilt deg>, "tt": <target deg>, "tb": <tray deg>   (firmware v5.2+ with a tilt servo)
 * }
 *
 * The BLE payload is intentionally terse to fit in the 20–240 byte MTU.
 */
export const US_SERVICE = "0000fd00-1212-efde-1523-785feabcd123";
export const US_STATE_CHAR = "0000fd01-1212-efde-1523-785feabcd123";
export const US_CMD_CHAR = "0000fd02-1212-efde-1523-785feabcd123";
export const US_EVENT_CHAR = "0000fd03-1212-efde-1523-785feabcd123";

export function bleAvailable(): boolean {
  return typeof navigator !== "undefined" && !!navigator.bluetooth;
}

let device: BluetoothDevice | null = null;
let cmdChar: BluetoothRemoteGATTCharacteristic | null = null;
let stateChar: BluetoothRemoteGATTCharacteristic | null = null;
let eventChar: BluetoothRemoteGATTCharacteristic | null = null;
const decoder = new TextDecoder();
const encoder = new TextEncoder();

export async function connectBle(): Promise<{ name: string }> {
  if (!bleAvailable()) throw new Error("Web Bluetooth is not available in this browser.");

  const store = useSensorStore.getState();
  const wasLive = store.source === "ble" && store.connection === "connected";
  store.setConnection("connecting");

  let picked: BluetoothDevice;
  try {
    picked = await navigator.bluetooth.requestDevice({
      filters: [{ services: [US_SERVICE] }, { namePrefix: "UlcerShield" }],
      optionalServices: [US_SERVICE],
    });
  } catch (e) {
    // Chooser cancelled or nothing found: leave the current link as it was.
    store.setConnection(wasLive ? "connected" : "disconnected");
    throw e;
  }

  // Re-pairing to a different bed: drop the old link so two devices never feed the store.
  if (device && device !== picked) {
    device.removeEventListener("gattserverdisconnected", handleDisconnect);
    device.gatt?.disconnect();
  }
  device = picked;

  try {
    device.addEventListener("gattserverdisconnected", handleDisconnect);
    const server = await device.gatt!.connect();
    const service = await server.getPrimaryService(US_SERVICE);

    [stateChar, cmdChar, eventChar] = await Promise.all([
      service.getCharacteristic(US_STATE_CHAR),
      service.getCharacteristic(US_CMD_CHAR),
      service.getCharacteristic(US_EVENT_CHAR).catch(() => null as unknown as BluetoothRemoteGATTCharacteristic),
    ]);

    // Start the device stream from a clean slate; otherwise the simulator's last
    // reading becomes `prev` and its timers leak into the real data.
    useSensorStore.setState({ state: null, history: [] });

    stateChar!.addEventListener("characteristicvaluechanged", onStateNotify);
    await stateChar!.startNotifications();

    if (eventChar) {
      eventChar.addEventListener("characteristicvaluechanged", onEventNotify);
      await eventChar.startNotifications();
    }
  } catch (e) {
    // Out of range, wrong firmware, etc.: release the device so the UI isn't stuck on "connecting".
    device.removeEventListener("gattserverdisconnected", handleDisconnect);
    if (device.gatt?.connected) device.gatt.disconnect();
    handleDisconnect();
    throw e;
  }

  store.setSource("ble", device.name ?? "UlcerShield");
  store.setConnection("connected");
  store.pushEvent({
    ts: Date.now(),
    uptimeS: 0,
    kind: "connect",
    text: `Paired with ${device.name ?? "device"}`,
  });

  return { name: device.name ?? "UlcerShield" };
}

/**
 * User-initiated disconnect. Leaves the connection "idle" rather than
 * "disconnected" so SosMonitor doesn't treat it as a lost link.
 */
export async function disconnectBle() {
  if (device) {
    device.removeEventListener("gattserverdisconnected", handleDisconnect);
    if (device.gatt?.connected) device.gatt.disconnect();
  }
  releaseDevice();
  const store = useSensorStore.getState();
  store.setConnection("idle");
  store.pushEvent({
    ts: Date.now(),
    uptimeS: 0,
    kind: "disconnect",
    text: "Device disconnected by user",
  });
}

/**
 * `tilt:<deg>` takes clinical degrees, + = right side down, 0 = flat (firmware v5.2+).
 * `temp_ref:<°C>` calibrates skin temperature against a thermometer (firmware v5.3+).
 */
export type DeviceCommand =
  | "cal_zero"
  | "cal_a"
  | "cal_b"
  | "reset"
  | `tilt:${number}`
  | `temp_ref:${number}`
  | "temp_ref:clear";

export async function sendCommand(cmd: DeviceCommand) {
  if (!cmdChar) throw new Error("Not connected");
  await cmdChar.writeValueWithoutResponse(encoder.encode(cmd));
}

/** Range the firmware accepts for a thermometer reference. */
export const TEMP_REF_MIN_C = 30;
export const TEMP_REF_MAX_C = 43;

/** True when the paired device supports skin-temperature calibration. */
export function canCalibrateTemp(): boolean {
  const { source, connection, state } = useSensorStore.getState();
  return source === "ble" && connection === "connected" && !!cmdChar && state?.tempOffsetC != null;
}

/**
 * One-point skin-temperature calibration: `refC` is a thermometer reading taken
 * while the sensor is on the skin; the device stores the offset. null clears it.
 * Resolves false when no calibration-capable device is paired.
 */
export async function calibrateTemp(refC: number | null): Promise<boolean> {
  if (!canCalibrateTemp()) return false;
  await sendCommand(refC === null ? "temp_ref:clear" : `temp_ref:${Math.round(refC * 10) / 10}`);
  return true;
}

/** True when the paired device reports a tilt servo. */
export function canTiltBed(): boolean {
  const { source, connection, state } = useSensorStore.getState();
  return source === "ble" && connection === "connected" && !!cmdChar && state?.tilt != null;
}

/**
 * Rolls the bed onto `side` by `angle` clinical degrees, or back to flat when
 * `side` is null. Resolves false when no tilt-capable device is paired.
 */
export async function tiltBed(side: "left" | "right" | null, angle = 0): Promise<boolean> {
  if (!canTiltBed()) return false;
  const deg = side === null ? 0 : side === "right" ? angle : -angle;
  await sendCommand(`tilt:${Math.round(deg)}`);
  return true;
}

function onStateNotify(ev: Event) {
  const target = ev.target as BluetoothRemoteGATTCharacteristic;
  const value = target.value;
  if (!value) return;
  try {
    const text = decoder.decode(value);
    const raw = JSON.parse(text) as BlePacket;
    const store = useSensorStore.getState();
    const prev = store.state;
    const left = zoneFromArr(raw.l);
    const right = zoneFromArr(raw.r);
    const next: SensorState = stateFromRaw(prev, {
      ts: Date.now(),
      uptimeS: raw.u,
      left,
      right,
      cop: raw.c,
      bodyC: raw.b,
      humidity: raw.h,
      tilt: raw.tl != null ? { deg: raw.tl, targetDeg: raw.tt ?? raw.tl, trayDeg: raw.tb ?? raw.tl } : null,
      tempOffsetC: raw.bo ?? null,
      turns: raw.t,
      sinceTurnMin: raw.st,
    });
    store.ingest(next);
  } catch (e) {
    logger.warn("BLE state parse failed", e);
  }
}

function onEventNotify(ev: Event) {
  const target = ev.target as BluetoothRemoteGATTCharacteristic;
  const value = target.value;
  if (!value) return;
  try {
    const text = decoder.decode(value);
    const evt = JSON.parse(text) as { k: string; x?: string; u?: number };
    useSensorStore.getState().pushEvent({
      ts: Date.now(),
      uptimeS: evt.u ?? 0,
      kind: (evt.k as never) ?? "alert",
      text: evt.x ?? evt.k,
    });
  } catch (e) {
    logger.warn("BLE event parse failed", e);
  }
}

/** The link dropped on its own (out of range, power loss, reboot). */
function handleDisconnect() {
  const store = useSensorStore.getState();
  store.setConnection("disconnected");
  store.pushEvent({
    ts: Date.now(),
    uptimeS: 0,
    kind: "disconnect",
    text: "Device disconnected",
  });
  releaseDevice();
}

function releaseDevice() {
  // Detach first so a packet still in flight can't land on whatever source runs next.
  stateChar?.removeEventListener("characteristicvaluechanged", onStateNotify);
  eventChar?.removeEventListener("characteristicvaluechanged", onEventNotify);
  stateChar = null;
  cmdChar = null;
  eventChar = null;
  device = null;
}

// --- packet helpers ---
interface BlePacket {
  u: number;
  l: [number, number, number, number, number, number];
  r: [number, number, number, number, number, number];
  c: number;
  t: number;
  st: number;
  b: number | null;
  h: number | null;
  occ: 0 | 1;
  bo?: number;
  tl?: number;
  tt?: number;
  tb?: number;
}

function zoneFromArr(a: BlePacket["l"]): ZoneReading {
  return {
    n: a[0],
    mmhg: a[1],
    g: a[2],
    peak: a[3],
    sat: !!a[4],
    loaded: !!a[5],
  };
}
