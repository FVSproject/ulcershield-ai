"use client";

import { motion } from "framer-motion";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSensorStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import type { SensorState } from "@/types/sensor";

interface Reco {
  tone: "ok" | "info" | "warn" | "danger";
  icon: string;
  title: string;
  body: string;
}

function inferPosture(s: SensorState | null): string {
  if (!s || !s.occupied) return "off";
  const c = s.cop;
  if (c < -0.55) return "left-lateral";
  if (c > 0.55) return "right-lateral";
  if (c < -0.25) return "left-lean";
  if (c > 0.25) return "right-lean";
  return "supine";
}

function useBuildRecos(s: SensorState | null): Reco[] {
  const t = useT();
  if (!s) return [];
  const items: Reco[] = [];
  const p = inferPosture(s);
  const pL = s.left.mmhg;
  const pR = s.right.mmhg;
  const pMax = Math.max(pL, pR);
  const pSum = pL + pR;
  const asym = pSum > 5 ? Math.abs(pL - pR) / pSum : 0;
  const mins = s.sinceTurnMin;
  const target = s.turnTargetMin;

  if (p === "off") {
    items.push({ tone: "info", icon: "✓", title: t("reco_default_t"), body: t("reco_default_b") });
  } else if (p === "left-lateral" || p === "left-lean") {
    items.push({
      tone: "danger",
      icon: "→",
      title: t("reco_offload_l_t"),
      body: `${t("reco_offload_l_b")} (CoP ${s.cop.toFixed(2)})`,
    });
  } else if (p === "right-lateral" || p === "right-lean") {
    items.push({
      tone: "danger",
      icon: "←",
      title: t("reco_offload_r_t"),
      body: `${t("reco_offload_r_b")} (CoP ${s.cop.toFixed(2)})`,
    });
  } else {
    items.push({ tone: "ok", icon: "✓", title: t("reco_supine_t"), body: t("reco_supine_b") });
  }

  if (p !== "off") {
    if (mins > target) {
      items.push({
        tone: "danger",
        icon: "⏱",
        title: t("reco_reposition_now_t"),
        body: `${t("reco_reposition_now_b")} (${mins.toFixed(0)} / ${target})`,
      });
    } else if (mins > target * 0.75) {
      items.push({
        tone: "warn",
        icon: "⏱",
        title: t("reco_reposition_soon_t"),
        body: `${t("reco_reposition_soon_b")} (${mins.toFixed(0)} / ${target})`,
      });
    }
  }

  if (s.left.sat || s.right.sat) {
    items.push({ tone: "danger", icon: "!", title: t("reco_sat_t"), body: t("reco_sat_b") });
  } else if (pMax > 100) {
    const side = pL > pR ? t("tr_left") : t("tr_right");
    items.push({
      tone: "danger",
      icon: "⚠",
      title: t("reco_peak_hi_t"),
      body: `${side}: ${pMax.toFixed(0)} mmHg — ${t("reco_peak_hi_b")}`,
    });
  } else if (pMax > 60) {
    items.push({
      tone: "warn",
      icon: "⚠",
      title: t("reco_peak_elev_t"),
      body: `${t("reco_peak_elev_b")} · ${pMax.toFixed(0)} mmHg`,
    });
  }
  if (p !== "off" && asym > 0.4 && pSum > 40) {
    items.push({
      tone: "warn",
      icon: "⇋",
      title: t("reco_asym_t"),
      body: `${t("reco_asym_b")} ${(asym * 100).toFixed(0)}% — ${t("reco_asym_alt")}`,
    });
  }

  if (s.humidityOk && (s.humidity ?? 0) > 75) {
    items.push({
      tone: "danger",
      icon: "💧",
      title: t("reco_hum_high_t"),
      body: `RH ${(s.humidity ?? 0).toFixed(0)}% — ${t("reco_hum_high_b")}`,
    });
  } else if (s.humidityOk && (s.humidity ?? 0) > 65) {
    items.push({
      tone: "info",
      icon: "💧",
      title: t("reco_hum_warn_t"),
      body: `RH ${(s.humidity ?? 0).toFixed(0)}% — ${t("reco_hum_warn_b")}`,
    });
  }
  if (s.bodyOk && (s.bodyC ?? 0) > 37.5) {
    items.push({
      tone: "warn",
      icon: "🌡",
      title: t("reco_temp_high_t"),
      body: `${(s.bodyC ?? 0).toFixed(1)}°C — ${t("reco_temp_high_b")}`,
    });
  }

  items.push({ tone: "info", icon: "♁", title: t("reco_heels_t"), body: t("reco_heels_b") });
  items.push({ tone: "info", icon: "≤", title: t("reco_head_t"), body: t("reco_head_b") });
  return items;
}

const TONE = {
  ok: {
    ring: "border-[var(--color-safe)]/40",
    ic: "bg-[color-mix(in_oklab,var(--color-safe)_15%,transparent)] text-[var(--color-safe)]",
  },
  info: {
    ring: "border-[var(--c-primary-2)]/30",
    ic: "bg-[color-mix(in_oklab,var(--c-primary-2)_15%,transparent)] text-[var(--c-primary-2)]",
  },
  warn: {
    ring: "border-[var(--color-elev)]/40",
    ic: "bg-[color-mix(in_oklab,var(--color-elev)_15%,transparent)] text-[var(--color-elev)]",
  },
  danger: {
    ring: "border-[var(--color-crit)]/40",
    ic: "bg-[color-mix(in_oklab,var(--color-crit)_15%,transparent)] text-[var(--color-crit)]",
  },
} as const;

export function Recommendations() {
  const state = useSensorStore((s) => s.state);
  const t = useT();
  const items = useBuildRecos(state);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("reco_title")}</CardTitle>
        <Badge tone="brand">{t("reco_pill")}</Badge>
      </CardHeader>
      <CardBody className="grid gap-2.5">
        {items.map((it, i) => (
          <motion.div
            key={it.title + i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: i * 0.03 }}
            className={`grid grid-cols-[40px_1fr] items-start gap-3 rounded-2xl border bg-[var(--c-surface-2)] p-3 ${TONE[it.tone].ring}`}
          >
            <div className={`grid h-9 w-9 place-items-center rounded-xl text-base ${TONE[it.tone].ic}`}>
              {it.icon}
            </div>
            <div>
              <div className="text-sm font-semibold">{it.title}</div>
              <div className="mt-0.5 text-xs leading-relaxed text-[var(--c-text-2)]">{it.body}</div>
            </div>
          </motion.div>
        ))}
      </CardBody>
    </Card>
  );
}
