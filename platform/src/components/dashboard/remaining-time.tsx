"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Timer, ChevronDown, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSensorStore } from "@/lib/store";
import { computeTwin, type ModifierApplied } from "@/lib/tissue-twin";
import { useT, type DictKey } from "@/lib/i18n";
import { REGION_LABEL_KEY } from "@/lib/twin-labels";
import { useViewing } from "@/lib/viewing";

const R = 62;
const CIRC = 2 * Math.PI * R;

/**
 * Remaining Safe Tissue Time card.
 * See docs/algorithm.md for the underlying model.
 */
export function RemainingTime() {
  const state = useSensorStore((s) => s.state);
  const patient = useViewing((s) => s.viewing);
  const twin = computeTwin(state, patient);
  const t = useT();
  const [showWhy, setShowWhy] = useState(true);

  const mins = twin?.remainingSafeMin ?? 0;
  const primaryRegion = twin?.primary.region;
  const primary = primaryRegion ? t(REGION_LABEL_KEY[primaryRegion]) : "—";
  const capMin = twin?.patientType === "kid" ? 210 : 240;
  const pct = Math.min(1, mins / capMin);
  const color =
    mins <= 15 ? "var(--color-crit)" : mins <= 45 ? "var(--color-elev)" : "var(--color-safe)";
  const label =
    mins <= 0
      ? t("rt_act_now")
      : mins <= 15
      ? t("rt_immediate")
      : mins <= 45
      ? t("rt_soon")
      : t("rt_safe");

  const breakdown = twin?.rstBreakdown;

  return (
    <Card glow>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-[var(--c-primary-2)]" />
          {t("rt_title")}
        </CardTitle>
        <Badge tone="brand">{twin?.patientType === "kid" ? t("rt_pill_kid") : t("rt_pill")}</Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <div className="relative mx-auto flex h-40 w-40 shrink-0 items-center justify-center">
            <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
              <circle cx="80" cy="80" r={R} fill="none" stroke="var(--c-border)" strokeWidth="12" />
              <motion.circle
                cx="80"
                cy="80"
                r={R}
                fill="none"
                stroke={color}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                initial={{ strokeDashoffset: CIRC }}
                animate={{ strokeDashoffset: CIRC * (1 - pct) }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="num text-3xl font-semibold leading-none" style={{ color }}>
                {mins}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--c-muted)]">
                {t("rt_min")}
              </div>
              <div
                className="mt-1 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color }}
              >
                {label}
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-2 text-sm text-[var(--c-text-2)]">
            <p className="leading-relaxed">
              {t("rt_body_a")} <b className="text-[var(--c-text)]">{mins} {t("rt_min")}</b>{" "}
              {t("rt_body_b")}
            </p>
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-surface-2)] px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
                {t("rt_highest")}
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <b className="text-[var(--c-text)]">{primary}</b>
                <span className="num text-[11px] text-[var(--c-muted)]">
                  {twin?.primary.score ?? 0}/100
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Why? — modifier breakdown */}
        {breakdown && (
          <div className="rounded-2xl border border-[var(--c-primary-2)]/25 bg-[color-mix(in_oklab,var(--c-primary-2)_8%,transparent)]">
            <button
              type="button"
              onClick={() => setShowWhy((v) => !v)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <div className="flex items-center gap-3">
                <span
                  className="grid h-8 w-8 place-items-center rounded-full bg-[var(--c-primary-2)]/20 text-[var(--c-primary-2)]"
                >
                  <TrendingDown className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--c-primary-2)]">
                    {t("rt_why")}
                  </div>
                  <div className="text-xs text-[var(--c-text-2)]">
                    {t("rt_base")}: <b className="num text-[var(--c-text)]">{breakdown.baseMin}</b>{" "}
                    {t("rt_min")}
                    {breakdown.modifiers.length > 0 && (
                      <>
                        {" "}
                        · {t("rt_after")}:{" "}
                        <b
                          className="num"
                          style={{ color: breakdown.totalFactor < 1 ? "var(--color-elev)" : "var(--color-safe)" }}
                        >
                          ×{breakdown.totalFactor.toFixed(2)}
                        </b>{" "}
                        ={" "}
                        <b className="num text-[var(--c-text)]">{breakdown.finalMin}</b> {t("rt_min")}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <ChevronDown
                className={
                  "h-4 w-4 shrink-0 text-[var(--c-muted)] transition-transform " +
                  (showWhy ? "rotate-180" : "")
                }
              />
            </button>
            <AnimatePresence initial={false}>
              {showWhy && breakdown.modifiers.length > 0 && (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.24 }}
                  className="overflow-hidden border-t border-[var(--c-primary-2)]/20 px-4 py-3"
                >
                  {breakdown.modifiers.map((m) => (
                    <ModifierRow key={m.kind + ":" + m.id} m={m} />
                  ))}
                </motion.ul>
              )}
              {showWhy && breakdown.modifiers.length === 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-[var(--c-primary-2)]/20 px-4 py-3 text-xs text-[var(--c-muted)]"
                >
                  {t("rt_no_modifiers")}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function ModifierRow({ m }: { m: ModifierApplied }) {
  const t = useT();
  const isDown = m.factor < 1;
  const color = isDown ? "var(--color-elev)" : "var(--color-safe)";
  const kindKey: DictKey =
    m.kind === "age"
      ? "rt_mod_age"
      : m.kind === "bmi"
      ? "rt_mod_bmi"
      : m.kind === "sex"
      ? "rt_mod_sex"
      : m.kind === "comorbidity"
      ? "rt_mod_comorb"
      : m.kind === "medication"
      ? "rt_mod_med"
      : m.kind === "treatment"
      ? "rt_mod_treat"
      : "rt_mod_micro";
  // Look up the specific id in the modifier dictionary, else fall back to the id itself
  const specific = ("rt_id_" + m.id) as DictKey;
  return (
    <li className="flex items-center justify-between gap-3 py-1.5 text-xs">
      <div className="flex items-center gap-2 min-w-0">
        {isDown ? (
          <TrendingDown className="h-3 w-3 shrink-0" style={{ color }} />
        ) : (
          <TrendingUp className="h-3 w-3 shrink-0" style={{ color }} />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
          {t(kindKey)}
        </span>
        <span className="truncate text-[var(--c-text)]">{t(specific)}</span>
      </div>
      <span className="num font-semibold" style={{ color }}>
        ×{m.factor.toFixed(2)}
      </span>
    </li>
  );
}
