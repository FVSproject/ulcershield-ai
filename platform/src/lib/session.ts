"use client";

import { create } from "zustand";
import type { Patient } from "@/lib/db";

interface SessionState {
  user: Patient | null;
  setUser: (u: Patient | null) => void;
  logout: () => void;
}

const KEY = "us_session_v1";

export const useSession = create<SessionState>((set) => ({
  user: null,
  setUser: (user) => {
    if (typeof window !== "undefined") {
      if (user) localStorage.setItem(KEY, JSON.stringify(user));
      else localStorage.removeItem(KEY);
    }
    set({ user });
  },
  logout: () => {
    if (typeof window !== "undefined") localStorage.removeItem(KEY);
    set({ user: null });
  },
}));

/** Hydrate from localStorage on the client. Call in a top-level effect. */
export function hydrateSession() {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(KEY);
  if (!raw) return;
  try {
    const u = JSON.parse(raw) as Patient;
    useSession.setState({ user: u });
  } catch {
    localStorage.removeItem(KEY);
  }
}
