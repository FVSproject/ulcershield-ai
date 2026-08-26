export interface ZoneReading {
  n: number; // Newtons
  mmhg: number; // pressure
  g: number; // grams equivalent
  peak: number; // session peak mmHg
  sat: boolean; // FSR saturated
  loaded: boolean;
}

export interface SensorState {
  ts: number; // epoch ms
  uptimeS: number;
  occupied: boolean;
  cop: number; // -1..+1
  turns: number;
  sinceTurnMin: number;
  turnTargetMin: number;
  left: ZoneReading;
  right: ZoneReading;
  bodyC: number | null;
  humidity: number | null;
  bodyOk: boolean;
  humidityOk: boolean;
  risk: number;
  riskLabel: RiskLevel;
  riskBreakdown: {
    pressure: number;
    immobility: number;
    moisture: number;
    temperature: number;
    asymmetry: number;
  };
}

export type RiskLevel = "low" | "moderate" | "high" | "critical";
export type PressureLabel = "idle" | "safe" | "elev" | "high" | "crit" | "sat";

export type ConnectionState = "idle" | "connecting" | "connected" | "disconnected";
export type SourceKind = "mock" | "ble";

export interface SensorEvent {
  ts: number;
  uptimeS: number;
  kind: "turn" | "calibration" | "reset" | "alert" | "connect" | "disconnect" | "active_user";
  text: string;
}

export function pressureLevel(mmhg: number, sat = false): PressureLabel {
  if (sat) return "sat";
  if (mmhg < 8) return "idle";
  if (mmhg < 32) return "safe";
  if (mmhg < 60) return "elev";
  if (mmhg < 100) return "high";
  return "crit";
}

export function riskLevel(score: number): RiskLevel {
  if (score < 25) return "low";
  if (score < 50) return "moderate";
  if (score < 75) return "high";
  return "critical";
}

export const PRESSURE_COLORS: Record<PressureLabel, string> = {
  idle: "var(--c-muted)",
  safe: "var(--color-safe)",
  elev: "var(--color-elev)",
  high: "var(--color-high)",
  crit: "var(--color-crit)",
  sat: "var(--color-crit)",
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: "var(--color-safe)",
  moderate: "var(--color-elev)",
  high: "var(--color-high)",
  critical: "var(--color-crit)",
};
