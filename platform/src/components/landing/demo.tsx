"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Waves, LineChart } from "lucide-react";
import { useT } from "@/lib/i18n";

/**
 * A stylised live-data demo: an oscillating pressure trace + a rolling risk index.
 * Purely decorative — driven by a JS interval.
 */
export function Demo() {
  const t = useT();
  const [points, setPoints] = useState<number[]>(() =>
    Array.from({ length: 60 }, (_, i) => 40 + 15 * Math.sin(i / 5))
  );
  const [risk, setRisk] = useState(48);

  useEffect(() => {
    let i = 60;
    const id = setInterval(() => {
      setPoints((p) => {
        const next = [
          ...p.slice(1),
          40 + 22 * Math.sin(i / 6) + 8 * Math.sin(i / 3) + (Math.random() - 0.5) * 6,
        ];
        i++;
        return next;
      });
      setRisk((r) => Math.max(20, Math.min(78, r + (Math.random() - 0.5) * 4)));
    }, 220);
    return () => clearInterval(id);
  }, []);

  const path = pointsToPath(points, 640, 180, 5, 100);
  const areaPath = pointsToArea(points, 640, 180, 5, 100);

  return (
    <section id="demo" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_1.2fr] lg:items-center">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--c-primary-2)]">
              {t("demo_kicker")}
            </span>
            <h2 className="mt-3 font-semibold tracking-tight text-[clamp(2rem,4vw,3rem)] leading-tight">
              {t("demo_title_a")}{" "}
              <span className="text-gradient-brand">{t("demo_title_b")}</span>.
            </h2>
            <p className="mt-4 max-w-lg text-[var(--c-text-2)] leading-relaxed">
              {t("demo_body")}
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <Bullet>{t("demo_bullet_1")}</Bullet>
              <Bullet>{t("demo_bullet_2")}</Bullet>
              <Bullet>{t("demo_bullet_3")}</Bullet>
              <Bullet>{t("demo_bullet_4")}</Bullet>
            </ul>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[28px] border border-[var(--c-border)] bg-[var(--c-surface)] p-6 shadow-[var(--shadow-lg)]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--c-primary-2)_15%,transparent)] text-[var(--c-primary-2)]">
                  <Waves className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{t("demo_chart_title")}</div>
                  <div className="text-[11px] text-[var(--c-muted)]">{t("demo_chart_sub")}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full glass px-3 py-1 text-[10px]">
                <span className="live-dot" />
                {t("demo_streaming")}
              </div>
            </div>

            <div className="relative mt-4">
              <svg viewBox="0 0 640 180" className="w-full">
                <defs>
                  <linearGradient id="demo-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="#22d3ee" stopOpacity="0.35" />
                    <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="demo-stroke" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0" stopColor="#67e8f9" />
                    <stop offset="1" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3].map((i) => (
                  <line
                    key={i}
                    x1="0"
                    x2="640"
                    y1={45 * (i + 0.5)}
                    y2={45 * (i + 0.5)}
                    stroke="var(--c-border)"
                    strokeDasharray="2 4"
                  />
                ))}
                <path d={areaPath} fill="url(#demo-fill)" />
                <path
                  d={path}
                  fill="none"
                  stroke="url(#demo-stroke)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line
                  x1="0"
                  x2="640"
                  y1={valToY(32, 180, 5, 100)}
                  y2={valToY(32, 180, 5, 100)}
                  stroke="var(--color-elev)"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
                <text
                  x="8"
                  y={valToY(32, 180, 5, 100) - 4}
                  fill="var(--color-elev)"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                >
                  capillary 32
                </text>
              </svg>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <MiniStat label={t("demo_peak")} value={Math.max(...points).toFixed(0)} suffix="mmHg" />
              <MiniStat
                label={t("demo_trend")}
                value={(points[points.length - 1] - points[0]).toFixed(1)}
                suffix="Δ"
              />
              <MiniStat label={t("demo_risk")} value={risk.toFixed(0)} suffix="/100" tone />
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[var(--c-primary-2)]/25 bg-[color-mix(in_oklab,var(--c-primary-2)_10%,transparent)] p-3 text-[12px] text-[var(--c-text-2)]">
              <LineChart className="h-4 w-4 text-[var(--c-primary-2)] shrink-0" />
              <span>
                <b className="text-[var(--c-primary-2)]">{t("demo_hint_title")}</b> ·{" "}
                {t("demo_hint_body")}
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function MiniStat({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: string;
  suffix?: string;
  tone?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[var(--c-surface-2)] px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-widest text-[var(--c-muted)]">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span
          className={
            "num text-xl font-semibold " +
            (tone ? "text-[var(--c-primary-2)]" : "text-[var(--c-text)]")
          }
        >
          {value}
        </span>
        {suffix && <span className="text-[10px] text-[var(--c-muted)]">{suffix}</span>}
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-[var(--c-text-2)]">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-primary-2)]" />
      {children}
    </li>
  );
}

function valToY(v: number, h: number, min: number, max: number) {
  return h - ((v - min) / (max - min)) * h;
}
function pointsToPath(pts: number[], w: number, h: number, min: number, max: number) {
  return pts
    .map((v, i) => `${i === 0 ? "M" : "L"}${((i / (pts.length - 1)) * w).toFixed(1)},${valToY(v, h, min, max).toFixed(1)}`)
    .join(" ");
}
function pointsToArea(pts: number[], w: number, h: number, min: number, max: number) {
  const line = pointsToPath(pts, w, h, min, max);
  return `${line} L${w},${h} L0,${h} Z`;
}
