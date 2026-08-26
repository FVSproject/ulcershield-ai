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
 *     Write     UUID  0000fd02-1212-efde-1523-785feabcd123  (ASCII commands)
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
 *   "h": <humidity or null>,
 *   "occ": 0|1
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
  store.setConnection("connecting");

  device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [US_SERVICE] }, { namePrefix: "UlcerShield" }],
    optionalServices: [US_SERVICE],
  });

  device.addEventListener("gattserverdisconnected", handleDisconnect);
  const server = await device.gatt!.connect();
  const service = await server.getPrimaryService(US_SERVICE);

  [stateChar, cmdChar, eventChar] = await Promise.all([
    service.getCharacteristic(US_STATE_CHAR),
    service.getCharacteristic(US_CMD_CHAR),
    service.getCharacteristic(US_EVENT_CHAR).catch(() => null as unknown as BluetoothRemoteGATTCharacteristic),
  ]);

  stateChar!.addEventListener("characteristicvaluechanged", onStateNotify);
  await stateChar!.startNotifications();

  if (eventChar) {
    eventChar.addEventListener("characteristicvaluechanged", onEventNotify);
    await eventChar.startNotifications();
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

export async function disconnectBle() {
  if (device?.gatt?.connected) device.gatt.disconnect();
  handleDisconnect();
}

export async function sendCommand(cmd: "cal_zero" | "cal_a" | "cal_b" | "reset") {
  if (!cmdChar) throw new Error("Not connected");
  await cmdChar.writeValueWithoutResponse(encoder.encode(cmd));
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
      turns: raw.t,
      turnTs: raw.st === 0 ? Date.now() : undefined,
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

function handleDisconnect() {
  const store = useSensorStore.getState();
  store.setConnection("disconnected");
  store.pushEvent({
    ts: Date.now(),
    uptimeS: 0,
    kind: "disconnect",
    text: "Device disconnected",
  });
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
