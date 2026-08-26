"use client";

import { create } from "zustand";
import type { Patient } from "@/lib/db";

/**
 * "Who am I looking at?" — separate from "who am I logged in as".
 *
 * For patients, `viewing` is always the same as `session.user`.
 * For admins, `viewing` is whichever patient they're currently inspecting
 * (via the `?patient=<id>` URL param on dashboard / analysis / ai routes).
 * `null` for admins means they're not viewing a specific patient (e.g. on
 * the /admin roster page).
 */
interface ViewingState {
  viewing: Patient | null;
  setViewing: (p: Patient | null) => void;
}

export const useViewing = create<ViewingState>((set) => ({
  viewing: null,
  setViewing: (viewing) => set({ viewing }),
}));
