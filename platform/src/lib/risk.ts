import type { SensorState, ZoneReading } from "@/types/sensor";
import { riskLevel } from "@/types/sensor";

// Clinical thresholds (mirror of firmware constants)
export const P_CAPILLARY = 32; // mmHg
export const P_HIGH = 60;
export const P_CRITICAL = 100;
export const P_OCCUPIED = 8;
export const TURN_TARGET_MIN = 120; // 2h repositioning rule
export const CAP_DISPLAY = 300;

interface RiskInput {
  left: ZoneReading;
  right: ZoneReading;
  cop: number;
  occupied: boolean;
  sinceTurnMin: number;
  humidity: number | null;
  bodyC: number | null;
  baselineSkinC?: number | null;
}

/**
 * Recomputes the 100-point risk index from live signals.
 * Matches the firmware model exactly (single source of truth here).
 */
export function computeRisk(inp: RiskInput) {
  const pMax = Math.max(inp.left.mmhg, inp.right.mmhg);

  const riskP = clamp(mapRange(pMax, P_CAPILLARY, P_CRITICAL + 20, 0, 30), 0, 30);
  const riskT = inp.occupied ? clamp((inp.sinceTurnMin / TURN_TARGET_MIN) * 30, 0, 30) : 0;

  let riskM = 0;
  if (inp.humidity != null && inp.humidity >= 40) {
    riskM = clamp(mapRange(inp.humidity, 40, 80, 0, 15), 0, 15);
  }

  let riskTemp = 0;
  if (inp.bodyC != null) {
    if (inp.bodyC > 37.5) riskTemp += clamp(mapRange(inp.bodyC, 37.5, 39.5, 0, 10), 0, 10);
    else if (inp.bodyC < 33) riskTemp += 5;
    if (inp.baselineSkinC != null && inp.bodyC - inp.baselineSkinC > 1.5) riskTemp += 5;
    riskTemp = clamp(riskTemp, 0, 15);
  }

  const riskAsym = inp.occupied ? clamp(((Math.abs(inp.cop) - 0.4) / 0.6) * 10, 0, 10) : 0;

  const total = clamp(Math.round(riskP + riskT + riskM + riskTemp + riskAsym), 0, 100);
  return {
    score: total,
    label: riskLevel(total),
    breakdown: {
      pressure: riskP,
      immobility: riskT,
      moisture: riskM,
      temperature: riskTemp,
      asymmetry: riskAsym,
    },
  };
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}
export function mapRange(x: number, a: number, b: number, c: number, d: number) {
  if (b === a) return c;
  return ((x - a) * (d - c)) / (b - a) + c;
}

// Convenience: build a full SensorState from raw zone readings + env.
export function stateFromRaw(prev: SensorState | null, raw: {
  ts: number;
  uptimeS: number;
  left: ZoneReading;
  right: ZoneReading;
  cop?: number;
  bodyC?: number | null;
  humidity?: number | null;
  turns?: number;
  turnTs?: number;
  turnTargetMin?: number;
}): SensorState {
  const occupied = raw.left.mmhg + raw.right.mmhg > P_OCCUPIED * 2;
  const sum = raw.left.mmhg + raw.right.mmhg;
  const cop =
    raw.cop !== undefined
      ? raw.cop
      : occupied
      ? (raw.right.mmhg - raw.left.mmhg) / (sum || 1)
      : 0;

  const turnTargetMin = raw.turnTargetMin ?? TURN_TARGET_MIN;
  const turns = raw.turns ?? prev?.turns ?? 0;

  // sinceTurnMin: keep continuous if turns unchanged, reset when it ticks up
  let sinceTurnMin = 0;
  if (prev) {
    if (raw.turnTs && prev.turns !== turns) sinceTurnMin = 0;
    else sinceTurnMin = prev.sinceTurnMin + (raw.ts - prev.ts) / 60000;
  }

  const risk = computeRisk({
    left: raw.left,
    right: raw.right,
    cop,
    occupied,
    sinceTurnMin,
    humidity: raw.humidity ?? null,
    bodyC: raw.bodyC ?? null,
  });

  return {
    ts: raw.ts,
    uptimeS: raw.uptimeS,
    occupied,
    cop,
    turns,
    sinceTurnMin,
    turnTargetMin,
    left: raw.left,
    right: raw.right,
    bodyC: raw.bodyC ?? null,
    humidity: raw.humidity ?? null,
    bodyOk: raw.bodyC != null,
    humidityOk: raw.humidity != null,
    risk: risk.score,
    riskLabel: risk.label,
    riskBreakdown: risk.breakdown,
  };
}
