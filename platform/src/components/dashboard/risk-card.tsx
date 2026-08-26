"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSensorStore } from "@/lib/store";
import { RISK_COLORS } from "@/types/sensor";
import { useT, type DictKey } from "@/lib/i18n";

const AXES: {
  key: "pressure" | "immobility" | "moisture" | "temperature" | "asymmetry";
  labelKey: DictKey;
  max: number;
}[] = [
  { key: "pressure", labelKey: "rc_axis_pressure", max: 30 },
  { key: "immobility", labelKey: "rc_axis_immobility", max: 30 },
  { key: "moisture", labelKey: "rc_axis_moisture", max: 15 },
  { key: "temperature", labelKey: "rc_axis_temperature", max: 15 },
  { key: "asymmetry", labelKey: "rc_axis_asymmetry", max: 10 },
];

export function RiskCard() {
  const state = useSensorStore((s) => s.state);
  const t = useT();
  const score = state?.risk ?? 0;
  const label = state?.riskLabel ?? "low";
  const color = RISK_COLORS[label];
  const b = state?.riskBreakdown;
  const bandLabel = {
    low: t("rc_lvl_low"),
    moderate: t("rc_lvl_moderate"),
    high: t("rc_lvl_high"),
    critical: t("rc_lvl_critical"),
  }[label];

  return (
    <Card glow>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span
            className="inline-flex h-6 items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-widest text-white"
            style={{ background: "var(--grad-primary)" }}
          >
            <Sparkles className="mr-1 h-3 w-3" /> AI
          </span>
          {t("rc_title")}
        </CardTitle>
        <Badge tone="brand">{t("rc_pill")}</Badge>
      </CardHeader>
      <CardBody className="grid gap-5 lg:grid-cols-[220px_1fr] lg:items-center">
        <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
          <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
            <circle cx="80" cy="80" r="66" fill="none" stroke="var(--c-border)" strokeWidth="12" />
            <motion.circle
              cx="80"
              cy="80"
              r="66"
              fill="none"
              stroke={color}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 66}
              initial={{ strokeDashoffset: 2 * Math.PI * 66 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 66 * (1 - score / 100) }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="num text-4xl font-semibold" style={{ color }}>
              {score}
            </div>
            <div className="text-[10px] uppercase tracking-widest" style={{ color }}>
              {bandLabel}
            </div>
            <div className="text-[10px] text-[var(--c-muted)]">{t("rc_of_100")}</div>
          </div>
        </div>

        <ul className="space-y-2.5">
          {AXES.map((a) => {
            const v = b?.[a.key] ?? 0;
            const pct = Math.round((v / a.max) * 100);
            return (
              <li key={a.key} className="grid grid-cols-[120px_1fr_56px] items-center gap-3">
                <span className="text-[12px] text-[var(--c-text-2)]">{t(a.labelKey)}</span>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-[var(--c-border)]/60">
                  <motion.div
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full"
                    style={{ background: color }}
                  />
                </div>
                <span className="num text-right text-xs text-[var(--c-text-2)]">
                  {v.toFixed(1)}/{a.max}
                </span>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
