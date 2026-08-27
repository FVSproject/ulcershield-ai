"use client";

import type { SensorState } from "@/types/sensor";
import type {
  Comorbidity,
  MedicationClass,
  Patient,
  PatientType,
  Treatment,
} from "@/lib/db";

/**
 * Digital Tissue Twin — a continuously updated model of the patient's
 * vulnerable anatomical regions and their evolving state.
 *
 * The Remaining Safe Tissue Time (RSTT) uses a Reswick-Rogers-style
 * inverse pressure/time curve as the base, then applies a Braden/
 * Waterlow-inspired cascade of multiplicative modifiers for age,
 * BMI, comorbidities, medications, treatments, and live microclimate.
 *
 * See docs/algorithm.md for full derivation, weights, and references.
 */

// ─── public types ─────────────────────────────────────────────────
export type Anatomy = "sacrum" | "leftHip" | "rightHip" | "leftHeel" | "rightHeel" | "shoulders" | "occiput";
export type Band = "low" | "moderate" | "high" | "critical";

export type ContribKind =
  | "peak_crit"
  | "peak_high"
  | "immobility"
  | "humidity"
  | "skin_high"
  | "skin_low";

export interface Contributor {
  kind: ContribKind;
  value: number;
}

export interface RegionRisk {
  region: Anatomy;
  score: number;
  band: Band;
  contributors: Contributor[];
}

export type RecoKind = "reposition_now" | "reposition_side_now" | "reposition_soon" | "continue";

export interface Recommendation {
  kind: RecoKind;
  side?: "left" | "right";
  /** Recommended tilt angle in degrees. 30° is the international guideline
   * baseline (EPUAP/NPUAP 2019). We may raise to 35–40° for obese patients
   * where 30° does not adequately redistribute load. Never above 40° —
   * a full 90° lateral concentrates load on the trochanter. */
  angleDegrees?: number;
  minutes?: number;
  primaryRegion: Anatomy;
  primaryScore: number;
  tone: "info" | "warn" | "danger";
}

/** A modifier that reduced (or increased) the RSTT, with a human-readable reason. */
export type ModifierKind =
  | "age"
  | "bmi"
  | "sex"
  | "comorbidity"
  | "medication"
  | "treatment"
  | "microclimate";

export interface ModifierApplied {
  kind: ModifierKind;
  /** Machine tag for i18n lookup: e.g. "diabetes", "age_elderly", "bmi_obese2". */
  id: string;
  /** Multiplicative factor applied (0.20–1.20). */
  factor: number;
}

export interface RstBreakdown {
  baseMin: number;
  modifiers: ModifierApplied[];
  totalFactor: number;
  finalMin: number;
  pressure: number;
  region: Anatomy;
  patientType: PatientType;
}

export interface TissueTwinReport {
  overall: { score: number; band: Band };
  /** Personalized target minutes between repositions — replaces the fixed
   * 120-min protocol. See `personalizedTurnInterval()` for the formula. */
  personalizedTurnMin: number;
  regions: RegionRisk[];
  primary: RegionRisk;
  remainingSafeMin: number;
  rstBreakdown: RstBreakdown;
  trajectory: { tMin: number; risk: number }[];
  contributors: Contributor[];
  recommendation: Recommendation;
  patientType: PatientType;
}

// ─── region influence weights ──────────────────────────────────────
// How much of each FSR's load each anatomical region carries in supine
// posture. Baby column reflects the pediatric shift: occiput is the #1
// pressure landmark in infants (soft skull, large head-to-body ratio),
// heels are relatively less loaded than in adults.
const REGION_WEIGHTS_ADULT: Record<Anatomy, { left: number; right: number }> = {
  occiput: { left: 0.2, right: 0.2 },
  shoulders: { left: 0.45, right: 0.45 },
  sacrum: { left: 0.6, right: 0.6 },
  leftHip: { left: 1.0, right: 0.0 },
  rightHip: { left: 0.0, right: 1.0 },
  leftHeel: { left: 0.55, right: 0.0 },
  rightHeel: { left: 0.0, right: 0.55 },
};
const REGION_WEIGHTS_BABY: Record<Anatomy, { left: number; right: number }> = {
  occiput: { left: 0.9, right: 0.9 }, // primary in infants
  shoulders: { left: 0.35, right: 0.35 },
  sacrum: { left: 0.45, right: 0.45 },
  leftHip: { left: 0.55, right: 0.0 },
  rightHip: { left: 0.0, right: 0.55 },
  leftHeel: { left: 0.35, right: 0.0 },
  rightHeel: { left: 0.0, right: 0.35 },
};

// ─── modifier tables ───────────────────────────────────────────────
const COMORBIDITY_FACTOR: Record<Comorbidity, number> = {
  diabetes: 0.75,
  peripheral_vascular: 0.65,
  cardiac: 0.85,
  renal: 0.85,
  malnutrition: 0.7,
  neuropathy_or_sci: 0.6,
  incontinence: 0.8,
  dementia: 0.85,
  cancer_active: 0.85,
};

const MEDICATION_FACTOR: Record<MedicationClass, number> = {
  corticosteroids: 0.85,
  vasoconstrictors: 0.75,
  anticoagulants: 0.9,
  chronic_sedatives: 0.8,
  nsaids: 0.95,
};

const TREATMENT_FACTOR: Record<Treatment, number> = {
  mechanical_ventilation: 0.7,
  dialysis: 0.85,
  chemotherapy: 0.75,
  radiation_therapy: 0.8,
  cast_traction: 0.75,
  feeding_tube: 0.9,
};

// ─── helpers ───────────────────────────────────────────────────────
function band(score: number): Band {
  if (score < 25) return "low";
  if (score < 50) return "moderate";
  if (score < 75) return "high";
  return "critical";
}

/** Age → { factor, id } — see docs/algorithm.md §2.1. */
function ageFactor(age: number | undefined, type: PatientType): { factor: number; id: string } | null {
  if (type === "baby") return { factor: 0.55, id: "age_baby" };
  if (age == null || age <= 0) return null; // no age given → no modifier
  if (age < 2) return { factor: 0.55, id: "age_infant" };
  if (age < 6) return { factor: 0.7, id: "age_toddler" };
  if (age < 13) return { factor: 0.8, id: "age_child" };
  if (age < 18) return { factor: 0.95, id: "age_adolescent" };
  if (age < 41) return { factor: 1.0, id: "age_young_adult" };
  if (age < 65) return { factor: 0.9, id: "age_adult" };
  if (age < 80) return { factor: 0.75, id: "age_elderly" };
  return { factor: 0.55, id: "age_very_elderly" };
}

/** BMI → { factor, id }. Returns null if height/weight missing. */
function bmiFactor(patient: Patient | null | undefined): { factor: number; id: string; bmi: number } | null {
  if (!patient?.height || !patient?.weight) return null;
  const h = patient.height / 100;
  if (h <= 0) return null;
  const bmi = patient.weight / (h * h);
  if (patient.patientType === "baby") {
    // Simplified pediatric proxy — use raw weight, treat < 2.5 kg as under-weight risk.
    if (patient.weight < 2.5) return { factor: 0.65, id: "bmi_low_birth_weight", bmi };
    return { factor: 1.0, id: "bmi_baby_normal", bmi };
  }
  if (bmi < 18.5) return { factor: 0.75, id: "bmi_underweight", bmi };
  if (bmi < 25) return { factor: 1.0, id: "bmi_normal", bmi };
  if (bmi < 30) return { factor: 0.95, id: "bmi_overweight", bmi };
  if (bmi < 35) return { factor: 0.85, id: "bmi_obese1", bmi };
  return { factor: 0.7, id: "bmi_obese2", bmi };
}

/** Sex modifier — very small effect, only for post-menopausal skin thinning. */
function sexFactor(patient: Patient | null | undefined): { factor: number; id: string } | null {
  if (patient?.sex === "female" && (patient.age ?? 0) >= 65) {
    return { factor: 0.98, id: "sex_female_post_menopausal" };
  }
  return null;
}

/** Live microclimate multiplier from the current sensor snapshot. */
function microclimateFactor(s: SensorState): ModifierApplied[] {
  const mods: ModifierApplied[] = [];
  if (s.bodyOk && s.bodyC != null && s.bodyC > 37.5) {
    mods.push({ kind: "microclimate", id: "micro_temp_high", factor: 0.9 });
  }
  if (s.humidityOk && s.humidity != null) {
    if (s.humidity > 75) mods.push({ kind: "microclimate", id: "micro_hum_severe", factor: 0.75 });
    else if (s.humidity > 65) mods.push({ kind: "microclimate", id: "micro_hum_high", factor: 0.85 });
  }
  return mods;
}

/**
 * Base RSTT — Reswick-Rogers-style hyperbolic pressure/time curve.
 * See docs/algorithm.md §1.
 */
function baseSafeMin(pressureMmHg: number, type: PatientType): number {
  const Pcap = type === "baby" ? 20 : 32;
  const K = type === "baby" ? 2500 : 4200;
  const ceiling = type === "baby" ? 180 : 240;
  if (pressureMmHg <= Pcap) return ceiling;
  return Math.min(ceiling, K / (pressureMmHg - Pcap));
}

// ─── per-region scoring (for the 100-point band) ──────────────────
function regionPressure(s: SensorState, region: Anatomy, type: PatientType) {
  const weights = type === "baby" ? REGION_WEIGHTS_BABY : REGION_WEIGHTS_ADULT;
  const w = weights[region];
  return s.left.mmhg * w.left + s.right.mmhg * w.right;
}

function scoreRegion(s: SensorState, region: Anatomy, type: PatientType): RegionRisk {
  const contributors: Contributor[] = [];
  const p = regionPressure(s, region, type);
  const capillary = type === "baby" ? 20 : 32;

  let pAxis = 0;
  if (p > capillary) {
    pAxis = Math.min(40, ((p - capillary) / (120 - capillary)) * 40);
    if (p > 100) contributors.push({ kind: "peak_crit", value: p });
    else if (p > 60) contributors.push({ kind: "peak_high", value: p });
  }

  const loaded = p > 8;
  const iAxis = loaded ? Math.min(30, (s.sinceTurnMin / s.turnTargetMin) * 30) : 0;
  if (loaded && s.sinceTurnMin > s.turnTargetMin * 0.75) {
    contributors.push({ kind: "immobility", value: s.sinceTurnMin });
  }

  let mAxis = 0;
  if (s.humidityOk && s.humidity != null && s.humidity > 40) {
    mAxis = Math.min(15, ((s.humidity - 40) / 40) * 15);
    if (s.humidity > 65) contributors.push({ kind: "humidity", value: s.humidity });
  }

  let tAxis = 0;
  if (s.bodyOk && s.bodyC != null) {
    if (s.bodyC > 37.5) {
      tAxis = Math.min(15, ((s.bodyC - 37.5) / 2) * 15);
      contributors.push({ kind: "skin_high", value: s.bodyC });
    } else if (s.bodyC < 33 && s.bodyC > 28) {
      tAxis = 5;
      contributors.push({ kind: "skin_low", value: s.bodyC });
    }
  }

  const score = Math.round(Math.min(100, pAxis + iAxis + mAxis + tAxis));
  return { region, score, band: band(score), contributors };
}

// ─── RSTT — the personalized Remaining Safe Tissue Time ───────────
function computeRstt(
  primary: RegionRisk,
  s: SensorState,
  patient: Patient | null | undefined
): RstBreakdown {
  const type: PatientType = patient?.patientType ?? "adult";
  const pressure = regionPressure(s, primary.region, type);
  const baseMin = Math.round(baseSafeMin(pressure, type));

  const modifiers: ModifierApplied[] = [];

  const age = ageFactor(patient?.age, type);
  if (age && age.factor !== 1) modifiers.push({ kind: "age", id: age.id, factor: age.factor });

  const bmi = bmiFactor(patient);
  if (bmi && bmi.factor !== 1) modifiers.push({ kind: "bmi", id: bmi.id, factor: bmi.factor });

  const sex = sexFactor(patient);
  if (sex) modifiers.push({ kind: "sex", id: sex.id, factor: sex.factor });

  for (const c of patient?.conditions ?? []) {
    const f = COMORBIDITY_FACTOR[c];
    if (f != null && f !== 1) modifiers.push({ kind: "comorbidity", id: c, factor: f });
  }
  for (const m of patient?.medications ?? []) {
    const f = MEDICATION_FACTOR[m];
    if (f != null && f !== 1) modifiers.push({ kind: "medication", id: m, factor: f });
  }
  for (const t of patient?.treatments ?? []) {
    const f = TREATMENT_FACTOR[t];
    if (f != null && f !== 1) modifiers.push({ kind: "treatment", id: t, factor: f });
  }

  modifiers.push(...microclimateFactor(s));

  // Product of all factors, clamped to [0.20, 1.20]
  let totalFactor = modifiers.reduce((acc, m) => acc * m.factor, 1);
  totalFactor = Math.min(1.2, Math.max(0.2, totalFactor));

  const ceiling = type === "baby" ? 180 : 240;
  const finalMin = Math.max(0, Math.min(ceiling, Math.round(baseMin * totalFactor)));

  return {
    baseMin,
    modifiers,
    totalFactor,
    finalMin,
    pressure,
    region: primary.region,
    patientType: type,
  };
}

// ─── trajectory + recommendation ───────────────────────────────────
function forecast(primary: RegionRisk, s: SensorState, horizons = [0, 15, 60, 180, 360]) {
  const staticPortion = primary.score - Math.min(30, (s.sinceTurnMin / s.turnTargetMin) * 30);
  return horizons.map((tMin) => {
    const projMins = s.sinceTurnMin + tMin;
    const iAxis = Math.min(30, (projMins / s.turnTargetMin) * 30);
    const raw = staticPortion + iAxis;
    const risk = Math.round(Math.min(100, raw));
    return { tMin, risk };
  });
}

/**
 * Optimal tilt angle for lateral repositioning.
 *
 * International guidelines (EPUAP/NPUAP/PPPIA 2019 Prevention & Treatment of
 * Pressure Ulcers/Injuries) recommend a 30° lateral tilt as the standard
 * because it offloads the sacrum without concentrating pressure on the
 * greater trochanter (as a full 90° lateral would).
 *
 * We raise the angle to 35° when the baseline BMI is obese-class-I (30–34.9)
 * and 40° for obese-class-II+ (≥35) — the extra tilt is needed to actually
 * shift the load off the sacrum through the thicker adipose layer.
 *
 * We NEVER return 45°+ — the risk of trochanteric pressure injury outweighs
 * the sacral relief benefit above that angle.
 */
export function recommendedTiltAngle(patient?: Patient | null): number {
  if (!patient?.height || !patient?.weight) return 30;
  const h = patient.height / 100;
  if (h <= 0) return 30;
  if (patient.patientType === "baby") return 30;
  const bmi = patient.weight / (h * h);
  if (bmi >= 35) return 40;
  if (bmi >= 30) return 35;
  return 30;
}

/**
 * Personalized target minutes between repositions.
 *
 * The traditional "every 2 hours" rule is a fixed protocol. Real evidence
 * (Cochrane 2020 systematic review of repositioning frequency) shows the
 * interval should adapt to:
 *   - patient risk band (higher risk → shorter interval)
 *   - age (elderly + babies tolerate less)
 *   - live microclimate (heat + moisture accelerate breakdown)
 *
 * Returns a value in the range [60, 240] minutes.
 */
export function personalizedTurnInterval(
  primary: RegionRisk,
  patient: Patient | null | undefined,
  s: SensorState
): number {
  let base = 120; // classical 2 h baseline

  // Risk band
  if (primary.band === "critical") base = 60;
  else if (primary.band === "high") base = 75;
  else if (primary.band === "moderate") base = 100;

  // Age
  const age = patient?.age ?? 0;
  const type: PatientType = patient?.patientType ?? "adult";
  if (type === "baby" || age < 2) base = Math.min(base, 60);
  else if (age >= 80) base = Math.min(base, 75);
  else if (age >= 65) base = Math.min(base, 90);

  // Microclimate
  if (s.bodyOk && s.bodyC != null && s.bodyC > 37.5) base -= 15;
  if (s.humidityOk && s.humidity != null && s.humidity > 65) base -= 15;

  return Math.max(60, Math.min(240, Math.round(base)));
}

function pickRecommendation(
  primary: RegionRisk,
  remainingMin: number,
  s: SensorState,
  patient?: Patient | null
): Recommendation {
  const off: "left" | "right" | undefined =
    primary.region === "leftHip" || primary.region === "leftHeel"
      ? "right"
      : primary.region === "rightHip" || primary.region === "rightHeel"
      ? "left"
      : Math.abs(s.cop) > 0.35
      ? s.cop < 0
        ? "right"
        : "left"
      : undefined;

  const angleDegrees = recommendedTiltAngle(patient);

  if (primary.score >= 75 || remainingMin <= 5) {
    return {
      kind: off ? "reposition_side_now" : "reposition_now",
      side: off,
      angleDegrees,
      primaryRegion: primary.region,
      primaryScore: primary.score,
      tone: "danger",
    };
  }
  if (remainingMin < 20) {
    return {
      kind: "reposition_soon",
      side: off,
      angleDegrees,
      minutes: remainingMin,
      primaryRegion: primary.region,
      primaryScore: primary.score,
      tone: "warn",
    };
  }
  return {
    kind: "continue",
    angleDegrees,
    minutes: remainingMin,
    primaryRegion: primary.region,
    primaryScore: primary.score,
    tone: "info",
  };
}

// ─── entry point ───────────────────────────────────────────────────
export function computeTwin(
  s: SensorState | null,
  patient?: Patient | null
): TissueTwinReport | null {
  if (!s) return null;
  const type: PatientType = patient?.patientType ?? "adult";
  const regions: Anatomy[] = [
    "occiput",
    "shoulders",
    "sacrum",
    "leftHip",
    "rightHip",
    "leftHeel",
    "rightHeel",
  ];
  const scored = regions.map((r) => scoreRegion(s, r, type));
  scored.sort((a, b) => b.score - a.score);
  const primary = scored[0];
  const overall = { score: s.risk, band: band(s.risk) };

  const rstBreakdown = computeRstt(primary, s, patient);
  const remainingSafeMin = rstBreakdown.finalMin;
  const trajectory = forecast(primary, s);

  const seen = new Set<string>();
  const contributors: Contributor[] = [];
  for (const r of scored) {
    for (const c of r.contributors) {
      const k = `${c.kind}:${Math.round(c.value)}`;
      if (!seen.has(k)) {
        seen.add(k);
        contributors.push(c);
        if (contributors.length >= 5) break;
      }
    }
    if (contributors.length >= 5) break;
  }

  const recommendation = pickRecommendation(primary, remainingSafeMin, s, patient);
  const personalizedTurnMin = personalizedTurnInterval(primary, patient, s);
  return {
    overall,
    personalizedTurnMin,
    regions: scored,
    primary,
    remainingSafeMin,
    rstBreakdown,
    trajectory,
    contributors,
    recommendation,
    patientType: type,
  };
}
