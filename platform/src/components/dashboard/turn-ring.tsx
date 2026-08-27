"use client";

import { motion } from "framer-motion";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSensorStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { computeTwin } from "@/lib/tissue-twin";
import { useViewing } from "@/lib/viewing";

const R = 68;
const CIRC = 2 * Math.PI * R;

export function TurnRing() {
  const state = useSensorStore((s) => s.state);
  const patient = useViewing((s) => s.viewing);
  const twin = computeTwin(state, patient);
  const t = useT();
  const mins = state?.sinceTurnMin ?? 0;
  // Prefer the twin's personalized interval over the fixed 120-min protocol.
  const target = twin?.personalizedTurnMin ?? state?.turnTargetMin ?? 120;
  const turns = state?.turns ?? 0;
  const occupied = state?.occupied ?? false;
  const cop = state?.cop ?? 0;

  const pct = Math.min(1, mins / target);
  const dash = CIRC * (1 - pct);
  const color =
    pct >= 1 ? "var(--color-crit)" : pct > 0.75 ? "var(--color-elev)" : "var(--c-primary-2)";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tr_title")}</CardTitle>
        <Badge tone="brand">{t("tr_pill")}</Badge>
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div className="relative mx-auto flex h-40 w-40 shrink-0 items-center justify-center">
            <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
              <defs>
                <linearGradient id="ring-g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#22d3ee" />
                  <stop offset="1" stopColor="#0b3d63" />
                </linearGradient>
              </defs>
              <circle cx="80" cy="80" r={R} fill="none" stroke="var(--c-border)" strokeWidth="12" />
              <motion.circle
                cx="80"
                cy="80"
                r={R}
                fill="none"
                stroke={pct >= 1 || pct > 0.75 ? color : "url(#ring-g)"}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                initial={{ strokeDashoffset: CIRC }}
                animate={{ strokeDashoffset: dash }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="num text-3xl font-semibold leading-none" style={{ color }}>
                {Math.round(mins)}
              </div>
              <div className="mt-1 max-w-[7rem] text-center text-[10px] uppercase tracking-widest text-[var(--c-muted)]">
                {t("tr_min_since")}
              </div>
            </div>
          </div>

          <div className="grid w-full min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-3">
            <Stat v={turns} l={t("tr_turns")} />
            <Stat
              v={target}
              l={t("twin_interval_label")}
              badge={target !== 120}
            />
            <Stat v={occupied ? t("ui_yes") : t("ui_no")} l={t("tr_occupied")} />
          </div>
        </div>

        {target !== 120 && (
          <p className="rounded-xl border border-[var(--c-primary-2)]/25 bg-[color-mix(in_oklab,var(--c-primary-2)_8%,transparent)] px-3 py-2 text-[11px] leading-relaxed text-[var(--c-text-2)]">
            {t("twin_interval_hint")}
          </p>
        )}

        <CoPBar value={cop} />
      </CardBody>
    </Card>
  );
}

function Stat({ v, l, badge }: { v: number | string; l: string; badge?: boolean }) {
  return (
    <div
      className={
        "min-w-0 rounded-2xl border px-3 py-2.5 " +
        (badge
          ? "border-[var(--c-primary-2)]/40 bg-[color-mix(in_oklab,var(--c-primary-2)_8%,transparent)]"
          : "border-[var(--c-border)] bg-[var(--c-surface-2)]")
      }
    >
      <div className="num truncate text-xl font-semibold leading-tight">{v}</div>
      <div className="mt-0.5 truncate text-[10px] uppercase tracking-widest text-[var(--c-muted)]">
        {l}
      </div>
    </div>
  );
}

function CoPBar({ value }: { value: number }) {
  const t = useT();
  const pos = ((value + 1) / 2) * 100;
  const c =
    Math.abs(value) > 0.6
      ? "var(--color-crit)"
      : Math.abs(value) > 0.35
      ? "var(--color-elev)"
      : "var(--c-primary-2)";
  return (
    <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface-2)] px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-[10px] uppercase tracking-widest text-[var(--c-muted)]">
        <span>{t("tr_cop")}</span>
        <span className="num text-sm text-[var(--c-text)]">
          {value >= 0 ? "+" : ""}
          {value.toFixed(2)}
        </span>
      </div>
      <div className="relative mt-2 h-2.5 rounded-full bg-[var(--c-border)]/60">
        <span className="absolute left-1/2 top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-[var(--c-border-2)]" />
        <motion.span
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 shadow"
          initial={false}
          animate={{ left: `${pos}%`, borderColor: c, backgroundColor: "var(--c-surface)" }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-[var(--c-muted)]">
        <span>{t("tr_left")}</span>
        <span>{t("tr_balanced")}</span>
        <span>{t("tr_right")}</span>
      </div>
    </div>
  );
}
