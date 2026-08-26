"use client";

import { motion } from "framer-motion";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSensorStore } from "@/lib/store";
import { computeTwin } from "@/lib/tissue-twin";
import { RISK_COLORS } from "@/types/sensor";
import { useT } from "@/lib/i18n";
import { useTwinI18n } from "@/lib/twin-i18n";
import { REGION_LABEL_KEY } from "@/lib/twin-labels";
import { useViewing } from "@/lib/viewing";

export function RegionRisk() {
  const state = useSensorStore((s) => s.state);
  const patient = useViewing((s) => s.viewing);
  const twin = computeTwin(state, patient);
  const t = useT();
  const { formatContributor } = useTwinI18n();

  const regions = twin?.regions ?? [];
  const bandLabel = (b: keyof typeof RISK_COLORS) =>
    ({
      low: t("rtr_low"),
      moderate: t("rtr_moderate"),
      high: t("rtr_high"),
      critical: t("rtr_critical"),
    }[b]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("rr_title")}</CardTitle>
        <Badge tone="neutral">{t("rr_pill")}</Badge>
      </CardHeader>
      <CardBody>
        <ul className="space-y-2.5">
          {regions.map((r, i) => {
            const color = RISK_COLORS[r.band];
            return (
              <motion.li
                key={r.region}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
                className="grid grid-cols-[110px_1fr_auto] items-center gap-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: color }}
                  />
                  <span className="truncate text-sm text-[var(--c-text)]">
                    {t(REGION_LABEL_KEY[r.region])}
                  </span>
                </div>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-[var(--c-border)]/60">
                  <motion.div
                    initial={false}
                    animate={{ width: `${r.score}%`, background: color }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full"
                  />
                </div>
                <span
                  className="min-w-[60px] rounded-full px-2.5 py-0.5 text-right text-[10px] font-bold uppercase tracking-widest"
                  style={{
                    background: `color-mix(in oklab, ${color} 15%, transparent)`,
                    color,
                  }}
                >
                  {bandLabel(r.band)}
                </span>
              </motion.li>
            );
          })}
        </ul>
        {twin?.contributors?.length ? (
          <div className="mt-4 rounded-2xl border border-[var(--c-primary-2)]/25 bg-[color-mix(in_oklab,var(--c-primary-2)_8%,transparent)] p-3">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--c-primary-2)]">
              {t("rr_why")}
            </div>
            <ul className="mt-1.5 space-y-1 text-xs text-[var(--c-text-2)]">
              {twin.contributors.map((c, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--c-primary-2)]" />
                  {formatContributor(c)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
