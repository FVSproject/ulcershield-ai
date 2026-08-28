"use client";

import { create } from "zustand";
import { emitSos, listOpenSos, resolveSos, type SosEvent, type SosKind } from "@/lib/db";

/**
 * In-memory SOS store — mirrors the persisted Dexie table so any subscriber
 * (popup, admin badge, admin inbox) can react without polling IndexedDB.
 *
 * SOS events are RAISED from anywhere via the module-level `raiseSos` helper,
 * PERSISTED to Dexie, and pushed into this store for immediate display.
 */
interface SosState {
  open: SosEvent[];
  currentPopup: SosEvent | null;
  loading: boolean;
  refresh: () => Promise<void>;
  showPopup: (ev: SosEvent) => void;
  dismissPopup: () => void;
  resolve: (id: number, by: string) => Promise<void>;
}

export const useSosStore = create<SosState>()((set, get) => ({
  open: [],
  currentPopup: null,
  loading: false,

  refresh: async () => {
    set({ loading: true });
    try {
      const open = await listOpenSos();
      set({ open, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  showPopup: (ev) => set({ currentPopup: ev }),
  dismissPopup: () => set({ currentPopup: null }),

  resolve: async (id, by) => {
    await resolveSos(id, by);
    await get().refresh();
    if (get().currentPopup?.id === id) set({ currentPopup: null });
  },
}));

/**
 * Raise a new SOS event. Called from anywhere in the platform. Persists to
 * Dexie AND pushes into the in-memory store so the popup fires immediately.
 * De-dupes recent duplicates within a 60-second window per (patientId, kind).
 */
const recent = new Map<string, number>();
export async function raiseSos(input: {
  kind: SosKind;
  severity: "info" | "warn" | "danger";
  title: string;
  body: string;
  patientId?: string;
  patientName?: string;
}): Promise<void> {
  const key = `${input.patientId ?? "_"}:${input.kind}`;
  const now = Date.now();
  const last = recent.get(key) ?? 0;
  if (now - last < 60_000) return; // debounce: same kind within 60s
  recent.set(key, now);

  const id = await emitSos(input);
  const ev: SosEvent = {
    id: typeof id === "number" ? id : undefined,
    ...input,
    ts: now,
    resolved: 0,
  };
  const store = useSosStore.getState();
  await store.refresh();
  // Only auto-popup for warn+danger; info goes to inbox only.
  if (input.severity !== "info") store.showPopup(ev);
}
