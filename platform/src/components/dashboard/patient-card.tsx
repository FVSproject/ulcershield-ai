"use client";

import { motion } from "framer-motion";
import { useViewing } from "@/lib/viewing";
import { useSensorStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n";
import type { RiskLevel } from "@/types/sensor";
import { RISK_COLORS } from "@/types/sensor";

const RISK_TONE: Record<RiskLevel, "safe" | "warn" | "danger" | "brand"> = {
  low: "safe",
  moderate: "warn",
  high: "danger",
  critical: "danger",
};

export function PatientCard() {
  const user = useViewing((s) => s.viewing);
  const state = useSensorStore((s) => s.state);
  const t = useT();

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const risk = state?.riskLabel ?? "low";
  const score = state?.risk ?? 0;
  const riskLabel = {
    low: t("rc_lvl_low"),
    moderate: t("rc_lvl_moderate"),
    high: t("rc_lvl_high"),
    critical: t("rc_lvl_critical"),
  }[risk];
  const sexLabel =
    user.sex === "male" ? t("ui_male") : user.sex === "female" ? t("ui_female") : user.sex === "other" ? t("ui_other") : "—";

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] p-5 shadow-[var(--shadow-sm)] sm:p-6"
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-40"
        style={{ background: "var(--grad-primary-soft)" }}
      />
      <div className="flex flex-wrap items-center gap-4">
        {user.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar}
            alt=""
            className="h-16 w-16 rounded-2xl border border-[var(--c-border)] object-cover"
          />
        ) : (
          <div
            className="grid h-16 w-16 place-items-center rounded-2xl border border-[var(--c-border)] font-semibold text-white shadow-inner"
            style={{ background: "var(--grad-primary)" }}
          >
            {initials || "P"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight">{user.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--c-text-2)]">
            <Meta k={t("pc_id")} v={user.id.slice(0, 8)} />
            <Meta k={t("pc_age")} v={user.age ?? "—"} />
            <Meta k={t("pc_sex")} v={sexLabel} />
            <Meta k={t("pc_height")} v={user.height ? `${user.height} cm` : "—"} />
            <Meta k={t("pc_weight")} v={user.weight ? `${user.weight} kg` : "—"} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={RISK_TONE[risk]} dot>
            {t("ui_status")} · {riskLabel}
          </Badge>
          <div className="flex items-baseline gap-1">
            <span
              className="num text-3xl font-semibold"
              style={{ color: RISK_COLORS[risk] }}
            >
              {score}
            </span>
            <span className="text-xs text-[var(--c-muted)]">/100</span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function Meta({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-[var(--c-muted)]">{k}</span>
      <b className="font-medium text-[var(--c-text)]">{v}</b>
    </span>
  );
}
