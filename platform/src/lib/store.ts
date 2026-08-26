"use client";

import { create } from "zustand";
import type { ConnectionState, SensorEvent, SensorState, SourceKind } from "@/types/sensor";

const MAX_HISTORY = 600; // last 10 min at 1 Hz
const MAX_EVENTS = 60;

interface SensorStore {
  state: SensorState | null;
  history: SensorState[];
  events: SensorEvent[];
  connection: ConnectionState;
  source: SourceKind;
  deviceName: string | null;
  lastMsgAt: number;

  ingest: (state: SensorState) => void;
  pushEvent: (ev: SensorEvent) => void;
  setConnection: (c: ConnectionState) => void;
  setSource: (s: SourceKind, name?: string | null) => void;
  clearEvents: () => void;
  reset: () => void;
}

export const useSensorStore = create<SensorStore>((set) => ({
  state: null,
  history: [],
  events: [],
  connection: "idle",
  source: "mock",
  deviceName: null,
  lastMsgAt: 0,

  ingest: (state) =>
    set((s) => {
      const hist = [...s.history, state];
      if (hist.length > MAX_HISTORY) hist.splice(0, hist.length - MAX_HISTORY);
      return { state, history: hist, lastMsgAt: Date.now() };
    }),

  pushEvent: (ev) =>
    set((s) => {
      const events = [ev, ...s.events];
      if (events.length > MAX_EVENTS) events.splice(MAX_EVENTS);
      return { events };
    }),

  setConnection: (connection) => set({ connection }),
  setSource: (source, deviceName = null) => set({ source, deviceName }),
  clearEvents: () => set({ events: [] }),
  reset: () =>
    set({
      state: null,
      history: [],
      events: [],
      connection: "idle",
      source: "mock",
      deviceName: null,
      lastMsgAt: 0,
    }),
}));
