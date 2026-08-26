"use client";

import type { ZoneReading } from "@/types/sensor";
import { stateFromRaw } from "@/lib/risk";
import { useSensorStore } from "@/lib/store";

/**
 * Deterministic-ish sinusoidal simulator that mimics a patient shifting weight,
 * repositioning every couple of minutes, and a slowly warming skin patch.
 */

let intervalId: ReturnType<typeof setInterval> | null = null;
let startedAt = 0;
let ticks = 0;
let turns = 0;
let lastTurnTs = 0;

export function startMockSource() {
  const store = useSensorStore.getState();
  if (store.source === "mock" && intervalId) return;
  stopMockSource();
  store.setSource("mock", "Simulator");
  store.setConnection("connected");
  store.pushEvent({
    ts: Date.now(),
    uptimeS: 0,
    kind: "connect",
    text: "Simulator started",
  });
  startedAt = Date.now();
  ticks = 0;
  turns = 0;
  lastTurnTs = Date.now();

  intervalId = setInterval(() => {
    const now = Date.now();
    const uptimeS = Math.round((now - startedAt) / 1000);
    ticks++;

    // simulate a very slow left↔right roll every ~90 s
    const phase = (ticks / 90) * Math.PI;
    const rollBias = Math.sin(phase); // -1..+1
    const noise = () => (Math.random() - 0.5) * 4;

    const leftMmhg = clamp(
      42 + 26 * Math.max(0, -rollBias) + 10 * Math.sin(ticks / 3) + noise(),
      2,
      140
    );
    const rightMmhg = clamp(
      42 + 26 * Math.max(0, rollBias) + 10 * Math.cos(ticks / 3.4) + noise(),
      2,
      140
    );

    const left = buildZone(leftMmhg);
    const right = buildZone(rightMmhg);

    // detect a "turn" whenever the roll bias flips
    const prev = useSensorStore.getState().state;
    const flipped = prev && Math.sign(prev.cop) !== Math.sign(rightMmhg - leftMmhg);
    if (flipped && now - lastTurnTs > 20000) {
      turns++;
      lastTurnTs = now;
      useSensorStore.getState().pushEvent({
        ts: now,
        uptimeS,
        kind: "turn",
        text: "posture shift · simulator",
      });
    }

    const bodyC = 36.2 + 0.9 * Math.sin(ticks / 40) + (Math.random() - 0.5) * 0.2;
    const humidity = 48 + 8 * Math.sin(ticks / 30) + (Math.random() - 0.5) * 2;

    const next = stateFromRaw(prev, {
      ts: now,
      uptimeS,
      left,
      right,
      bodyC,
      humidity,
      turns,
      turnTs: lastTurnTs,
    });
    useSensorStore.getState().ingest(next);
  }, 1000);
}

export function stopMockSource() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function buildZone(mmhg: number): ZoneReading {
  const forceN = (mmhg / 7.50062) * 1000 * (1.267e-4); // reverse of firmware conv
  return {
    n: forceN,
    mmhg,
    g: (forceN / 9.80665) * 1000,
    peak: mmhg,
    sat: mmhg > 140,
    loaded: mmhg > 8,
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}
