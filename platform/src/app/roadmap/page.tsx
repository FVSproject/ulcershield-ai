"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Activity,
  Camera,
  CheckCircle2,
  Cpu,
  Database,
  FileCheck2,
  Gauge,
  Layers,
  MapPin,
  Rocket,
  Sparkles,
  Target,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";

type Status = "shipped" | "next" | "future";

interface Milestone {
  status: Status;
  icon: React.ReactNode;
  title: string;
  tagline: string;
  body: string;
  points: string[];
  refs?: string[];
}

const MILESTONES: Milestone[] = [
  {
    status: "shipped",
    icon: <Target className="h-5 w-5" />,
    title: "Personalized Repositioning",
    tagline: "30° lateral tilt — evidence-based, patient-adaptive.",
    body: "Every repositioning recommendation now carries the exact tilt angle for the current patient, and the target interval adapts to their risk band, age, and skin microclimate — rather than the fixed 2-hour clinical default.",
    points: [
      "30° lateral tilt as the default per EPUAP/NPUAP/PPPIA 2019 Prevention Guidelines — avoids 90° side-lying that concentrates load over the greater trochanter.",
      "Angle scales up to 35–40° for higher-BMI patients to redistribute contact area; babies and frail elderly stay at 30°.",
      "Turn interval shortens (down to 60 min) for critical risk band, warm skin, or high humidity — and stays near 120 min for stable low-risk patients.",
      "Post-intervention verification: 5 min after Apply, the platform compares peak pressure and confirms whether the turn actually relieved the load.",
    ],
    refs: [
      "EPUAP / NPUAP / PPPIA — Prevention and Treatment of Pressure Ulcers: Clinical Practice Guideline (2019)",
      "Gillespie et al., Cochrane Database Syst Rev (2020) — Repositioning for pressure injury prevention in adults",
      "Defloor et al., Int J Nurs Stud (2005) — The effect of various combinations of turning and pressure reducing devices",
    ],
  },
  {
    status: "next",
    icon: <Camera className="h-5 w-5" />,
    title: "Depth-Camera Posture Sensing",
    tagline: "Verify the turn happened — and at the right angle.",
    body: "A ceiling-mounted depth camera (Intel RealSense / Azure Kinect class) will independently confirm patient posture and turn angle, closing the loop on whether nursing staff completed the recommended intervention.",
    points: [
      "Skeleton and body-orientation tracking to distinguish supine, left-lateral 30°, right-lateral 30°, and prone positions.",
      "On-device inference (edge NPU) so raw video never leaves the bedside — only the derived posture label is transmitted.",
      "Automatic reconciliation with pressure-sensor data — if the mat says pressure dropped but the camera saw no reposition, the event is flagged for review.",
      "Longitudinal posture-adherence metric per patient — informs staff scheduling and audit reports.",
    ],
    refs: [
      "Torres et al., Sensors (2018) — Pressure ulcer prevention using depth-image body posture recognition",
      "Yin et al., IEEE J Biomed Health Inform (2022) — In-bed posture classification with Kinect depth",
    ],
  },
  {
    status: "next",
    icon: <Cpu className="h-5 w-5" />,
    title: "Edge Gateway Architecture",
    tagline: "ESP32 → Raspberry Pi hub → hospital server.",
    body: "Each bed keeps its ESP32 mat, but multiple beds aggregate through a Raspberry Pi 5 edge gateway that buffers, encrypts, and forwards to the ward-level hospital server — resilient to Wi-Fi outages and ready for enterprise deployment.",
    points: [
      "Local inference runs on the Pi so a Wi-Fi drop does not silence the alerts — the mat still calls the twin and the Pi still recommends.",
      "Store-and-forward buffering during network partitions; guaranteed at-least-once delivery once uplink returns.",
      "TLS 1.3 mutual auth between mat, gateway, and server; certificates rotated on a scheduled cadence.",
      "Zero-touch provisioning — a new mat is claimed by scanning the bed QR from the gateway's admin UI.",
    ],
  },
  {
    status: "future",
    icon: <Database className="h-5 w-5" />,
    title: "Unified Data Layer + HL7 FHIR",
    tagline: "Land in the EHR the nurse already uses.",
    body: "A unified pressure-injury data schema will export patient risk, interventions, and outcomes to any HL7 FHIR–compatible hospital information system, so UlcerShield AI becomes a peripheral of the existing EHR rather than a parallel silo.",
    points: [
      "Map tissue-twin outputs to FHIR Observation resources (LOINC-coded pressure, temperature, humidity, Braden-equivalent).",
      "Interventions written as Procedure and CarePlan resources — every turn is auditable inside the EHR.",
      "SMART-on-FHIR launch so a physician can open the UlcerShield view directly from an Epic/Cerner patient chart.",
      "Aggregate ward-level dashboards for infection-prevention and quality teams.",
    ],
    refs: [
      "HL7 FHIR R4 — Observation, Procedure, CarePlan resource specifications",
      "SMART on FHIR — App Launch Framework v2.0.0",
    ],
  },
  {
    status: "future",
    icon: <Gauge className="h-5 w-5" />,
    title: "Accuracy Validation Program",
    tagline: "Prove it works — sensitivity, specificity, AUC.",
    body: "Before UlcerShield AI can be positioned as a clinical decision-support tool, we will run a multi-site validation study with expanded sensor coverage and nurse-adjudicated outcomes.",
    points: [
      "Sensor expansion: from 2 zones to a 16-cell FSR matrix covering sacrum, both trochanters, both heels, both scapulae, occiput.",
      "Per-patient calibration on admission — bodyweight and BMI adjust the pressure-to-risk mapping.",
      "Ground-truth adjudication: skin inspection by a certified wound-care nurse at every shift; endpoint is stage-1+ pressure injury within 7 days.",
      "Report sensitivity, specificity, positive/negative predictive value, and area-under-ROC for the 6-hour-ahead risk forecast.",
      "Target: AUC ≥ 0.85 on a held-out validation cohort before any pilot beyond KSAU-HS.",
    ],
    refs: [
      "Bergstrom et al., Nurs Res (1987) — The Braden Scale for predicting pressure sore risk",
      "Reswick & Rogers (1976) — Experience at Rancho Los Amigos with devices and techniques to prevent pressure sores",
      "Coleman et al., J Adv Nurs (2013) — Patient risk factors for pressure ulcer development: systematic review",
    ],
  },
];

const STATUS_META: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  shipped: {
    label: "Shipped",
    color: "var(--color-safe)",
    bg: "color-mix(in oklab, var(--color-safe) 10%, transparent)",
    border: "color-mix(in oklab, var(--color-safe) 35%, transparent)",
  },
  next: {
    label: "Up next",
    color: "var(--c-primary-2)",
    bg: "color-mix(in oklab, var(--c-primary-2) 10%, transparent)",
    border: "color-mix(in oklab, var(--c-primary-2) 35%, transparent)",
  },
  future: {
    label: "Future",
    color: "var(--color-elev)",
    bg: "color-mix(in oklab, var(--color-elev) 10%, transparent)",
    border: "color-mix(in oklab, var(--color-elev) 35%, transparent)",
  },
};

export default function RoadmapPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium">
            <Rocket className="h-3.5 w-3.5 text-[var(--c-primary-2)]" />
            <span className="uppercase tracking-[0.14em]">Product roadmap</span>
          </div>
          <h1 className="mt-6 font-semibold tracking-tight text-[clamp(2.4rem,5vw,4rem)] leading-[1.05]">
            From prototype to <span className="text-gradient-brand">clinical platform</span>
          </h1>
          <p className="mt-4 mx-auto max-w-2xl text-[var(--c-text-2)] leading-relaxed">
            UlcerShield AI is designed to grow from a two-sensor bedside prototype into a
            hospital-grade prevention layer. Each milestone below is grounded in the
            clinical evidence base and the current gaps we heard from nurses at KSAU-HS.
          </p>
        </motion.header>

        {/* Timeline */}
        <section className="mt-16 space-y-6">
          {MILESTONES.map((m, i) => {
            const meta = STATUS_META[m.status];
            return (
              <motion.article
                key={m.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="rounded-3xl border p-6 sm:p-8"
                style={{
                  borderColor: meta.border,
                  background: meta.bg,
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white"
                      style={{ background: "var(--grad-primary)" }}
                    >
                      {m.icon}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                        {m.title}
                      </h2>
                      <p className="mt-1 text-sm text-[var(--c-text-2)]">{m.tagline}</p>
                    </div>
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest"
                    style={{
                      color: meta.color,
                      background: "var(--c-surface)",
                      border: `1px solid ${meta.border}`,
                    }}
                  >
                    {m.status === "shipped" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : m.status === "next" ? (
                      <MapPin className="h-3 w-3" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {meta.label}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-[var(--c-text-2)] sm:text-[15px]">
                  {m.body}
                </p>

                <ul className="mt-5 grid gap-2.5">
                  {m.points.map((p, j) => (
                    <li
                      key={j}
                      className="grid grid-cols-[20px_1fr] items-start gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-3 text-sm leading-relaxed"
                    >
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ background: meta.color }}
                      />
                      <span className="text-[var(--c-text-2)]">{p}</span>
                    </li>
                  ))}
                </ul>

                {m.refs?.length ? (
                  <div className="mt-5 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
                      <FileCheck2 className="h-3 w-3" />
                      Evidence base
                    </div>
                    <ul className="space-y-1.5 text-[12px] leading-relaxed text-[var(--c-text-2)]">
                      {m.refs.map((r, k) => (
                        <li key={k}>• {r}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </motion.article>
            );
          })}
        </section>

        {/* Architecture diagram — text-only pipeline */}
        <section className="mt-16 rounded-3xl border border-[var(--c-border)] bg-[var(--c-surface)] p-8 bg-mesh">
          <div className="mb-6 flex items-center gap-2">
            <Layers className="h-5 w-5 text-[var(--c-primary-2)]" />
            <h2 className="text-xl font-semibold tracking-tight">
              Target deployment architecture
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <PipelineStage
              n={1}
              t="Bedside"
              b="ESP32 · FSR matrix · MLX90614 · DHT22 · IMU"
            />
            <PipelineStage
              n={2}
              t="Ward gateway"
              b="Raspberry Pi 5 · edge inference · TLS mutual auth · buffered uplink"
            />
            <PipelineStage
              n={3}
              t="Hospital server"
              b="Unified DB · ward dashboards · FHIR bridge · audit log"
            />
            <PipelineStage
              n={4}
              t="Clinical EHR"
              b="Epic / Cerner / OpenMRS via SMART-on-FHIR launch"
            />
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 flex flex-wrap items-center justify-center gap-3 rounded-3xl border border-[var(--c-primary-2)]/30 bg-[color-mix(in_oklab,var(--c-primary-2)_8%,transparent)] p-8 text-center">
          <div>
            <div className="flex items-center justify-center gap-2">
              <Activity className="h-5 w-5 text-[var(--c-primary-2)]" />
              <span className="text-sm font-semibold">
                Try the current build — every recommendation is live.
              </span>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link href="/dashboard">
                <Button size="lg">Launch platform</Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="glass">
                  About the team
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function PipelineStage({ n, t, b }: { n: number; t: string; b: string }) {
  return (
    <div className="relative rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface-2)] p-4">
      <div
        className="grid h-7 w-7 place-items-center rounded-lg text-white text-[11px] font-bold"
        style={{ background: "var(--grad-primary)" }}
      >
        {n}
      </div>
      <div className="mt-3 text-sm font-semibold">{t}</div>
      <div className="mt-1 text-[11px] leading-relaxed text-[var(--c-text-2)]">{b}</div>
    </div>
  );
}
