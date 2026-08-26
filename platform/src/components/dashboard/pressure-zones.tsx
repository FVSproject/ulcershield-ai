"use client";

import { motion } from "framer-motion";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSensorStore } from "@/lib/store";
import { pressureLevel, PRESSURE_COLORS, type ZoneReading, type PressureLabel } from "@/types/sensor";
import { formatNumber } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export function PressureZones() {
  const state = useSensorStore((s) => s.state);
  const t = useT();
  const left = state?.left;
  const right = state?.right;

  return (
    <Card glow>
      <CardHeader>
        <CardTitle>{t("pz_title")}</CardTitle>
        <Badge tone="live" dot>
          {t("pz_live")}
        </Badge>
      </CardHeader>
      <CardBody className="grid gap-4 lg:grid-cols-2">
        <Zone tag="L" title={t("pz_left")} sub="FSR A · GPIO34" z={left} />
        <Zone tag="R" title={t("pz_right")} sub="FSR B · GPIO35" z={right} />
      </CardBody>
    </Card>
  );
}

function Zone({
  tag,
  title,
  sub,
  z,
}: {
  tag: "L" | "R";
  title: string;
  sub: string;
  z?: ZoneReading;
}) {
  const t = useT();
  const mmhg = z?.mmhg ?? 0;
  const lvl = z ? pressureLevel(mmhg, z.sat) : "idle";
  const color = PRESSURE_COLORS[lvl];
  const pct = Math.min(100, mmhg / 1.5);

  const levelLabel: Record<PressureLabel, string> = {
    idle: t("pz_lvl_idle"),
    safe: t("pz_lvl_safe"),
    elev: t("pz_lvl_elev"),
    high: t("pz_lvl_high"),
    crit: t("pz_lvl_crit"),
    sat: t("pz_lvl_sat"),
  };

  return (
    <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface-2)] p-4">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl font-semibold text-white shadow-inner"
          style={{ background: "var(--grad-primary)" }}
        >
          {tag}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-[11px] text-[var(--c-muted)]">{sub}</div>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
          style={{
            background: `color-mix(in oklab, ${color} 18%, transparent)`,
            color,
          }}
        >
          {levelLabel[lvl]}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Metric v={formatNumber(z?.n, 2)} u="N" />
        <Metric v={formatNumber(mmhg, 1)} u="mmHg" primary />
        <Metric v={formatNumber(z?.g, 0)} u="g" />
      </div>

      <div className="mt-4">
        <div className="relative h-2.5 overflow-hidden rounded-full bg-[var(--c-border)]/60">
          <motion.div
            initial={false}
            animate={{ width: `${pct}%`, backgroundColor: color }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full"
          />
          <span
            className="absolute top-0 h-full w-px bg-[var(--color-elev)]/60"
            style={{ left: `${(32 / 150) * 100}%` }}
          />
          <span
            className="absolute top-0 h-full w-px bg-[var(--color-high)]/70"
            style={{ left: `${(60 / 150) * 100}%` }}
          />
          <span
            className="absolute top-0 h-full w-px bg-[var(--color-crit)]/80"
            style={{ left: `${(100 / 150) * 100}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] font-mono text-[var(--c-muted)]">
          <span>0</span>
          <span>32</span>
          <span>60</span>
          <span>100</span>
          <span>150 mmHg</span>
        </div>
        <div className="mt-2 text-[11px] text-[var(--c-muted)]">
          {t("pz_peak")}:{" "}
          <b className="text-[var(--c-text-2)]">{formatNumber(z?.peak, 1)}</b> mmHg
        </div>
      </div>
    </div>
  );
}

function Metric({
  v,
  u,
  primary,
}: {
  v: string;
  u: string;
  primary?: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl bg-[var(--c-surface)] px-3 py-2.5 " +
        (primary ? "ring-1 ring-[var(--c-primary-2)]/25" : "")
      }
    >
      <div
        className={
          "num text-2xl font-semibold " +
          (primary ? "text-[var(--c-primary-2)]" : "text-[var(--c-text)]")
        }
      >
        {v}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--c-muted)]">{u}</div>
    </div>
  );
}
