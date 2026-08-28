"use client";

import { create } from "zustand";
import { useSensorStore } from "@/lib/store";

/**
 * Shared "Evaluate" step state — the closed loop's post-intervention
 * verification. The AiRecommendation card raises intents here on Apply,
 * and the standalone EvaluateCard component subscribes for display.
 *
 * The evaluation runs a 5-minute countdown, then compares peak pressure
 * against the pre-intervention baseline. Drop ≥ VERIFY_THRESHOLD_PCT →
 * success. Otherwise → insufficient + suggested escalation.
 */

// After Apply, wait this long then compare pressure drop.
export const VERIFY_AFTER_MS = 5 * 60 * 1000;
// Consider the reposition successful if peak pressure dropped by this much.
export const VERIFY_THRESHOLD_PCT = 0.3;
// EPUAP/NPUAP 2019: 40° is the safe maximum for lateral tilt.
export const MAX_TILT_ANGLE = 40;

export type EvaluateStatus = "idle" | "waiting" | "success" | "insufficient";

export type Escalation =
  | { kind: "bump_angle"; side: "left" | "right"; from: number; to: number }
  | { kind: "switch_side"; from: "left" | "right"; to: "left" | "right"; angle: number }
  | { kind: "reassess" };

export interface AppliedIntervention {
  peak: number;
  at: number;
  side?: "left" | "right";
  angle?: number;
  title: string;
}

interface EvaluateState {
  status: EvaluateStatus;
  applied: AppliedIntervention | null;
  remainingSec: number;
  escalation: Escalation | null;
  history: { at: number; title: string; success: boolean; dropPct: number }[];
  // actions
  startVerify: (a: Omit<AppliedIntervention, "at">) => void;
  tickAndMaybeEvaluate: () => void;
  dismiss: () => void;
  acceptEscalation: () => void;
}

function nextEscalation(a: Pick<AppliedIntervention, "side" | "angle">): Escalation {
  const { side, angle } = a;
  if (!side || !angle) return { kind: "reassess" };
  if (angle < MAX_TILT_ANGLE) {
    return { kind: "bump_angle", side, from: angle, to: Math.min(MAX_TILT_ANGLE, angle + 5) };
  }
  const other: "left" | "right" = side === "left" ? "right" : "left";
  return { kind: "switch_side", from: side, to: other, angle: 30 };
}

export const useEvaluateStore = create<EvaluateState>()((set, get) => ({
  status: "idle",
  applied: null,
  remainingSec: 0,
  escalation: null,
  history: [],

  startVerify: (a) => {
    set({
      status: "waiting",
      applied: { ...a, at: Date.now() },
      remainingSec: Math.ceil(VERIFY_AFTER_MS / 1000),
      escalation: null,
    });
  },

  tickAndMaybeEvaluate: () => {
    const { status, applied, history } = get();
    if (status !== "waiting" || !applied) return;
    const elapsed = Date.now() - applied.at;
    const left = Math.max(0, Math.ceil((VERIFY_AFTER_MS - elapsed) / 1000));
    if (elapsed < VERIFY_AFTER_MS) {
      set({ remainingSec: left });
      return;
    }
    const curr = useSensorStore.getState().state;
    const currPeak = curr ? Math.max(curr.left.mmhg, curr.right.mmhg) : 0;
    const dropPct = (applied.peak - currPeak) / (applied.peak || 1);
    if (dropPct >= VERIFY_THRESHOLD_PCT) {
      set({
        status: "success",
        remainingSec: 0,
        escalation: null,
        history: [
          ...history.slice(-19),
          { at: Date.now(), title: applied.title, success: true, dropPct },
        ],
      });
    } else {
      set({
        status: "insufficient",
        remainingSec: 0,
        escalation: nextEscalation(applied),
        history: [
          ...history.slice(-19),
          { at: Date.now(), title: applied.title, success: false, dropPct },
        ],
      });
    }
  },

  dismiss: () => set({ status: "idle", applied: null, escalation: null, remainingSec: 0 }),

  acceptEscalation: () => {
    const { escalation, applied } = get();
    if (!escalation || !applied) return;
    if (escalation.kind === "bump_angle" || escalation.kind === "switch_side") {
      const nextSide =
        escalation.kind === "bump_angle" ? escalation.side : escalation.to;
      const nextAngle =
        escalation.kind === "bump_angle" ? escalation.to : escalation.angle;
      const curr = useSensorStore.getState().state;
      const currPeak = curr ? Math.max(curr.left.mmhg, curr.right.mmhg) : 0;
      // Start a fresh verify cycle against the new baseline so we measure
      // cumulative effect rather than resetting to the original peak.
      set({
        status: "waiting",
        applied: {
          peak: currPeak,
          at: Date.now(),
          side: nextSide,
          angle: nextAngle,
          title: applied.title,
        },
        remainingSec: Math.ceil(VERIFY_AFTER_MS / 1000),
        escalation: null,
      });
    }
  },
}));
