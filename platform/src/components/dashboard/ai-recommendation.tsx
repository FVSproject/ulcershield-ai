"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Brain, CheckCircle2 } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSensorStore } from "@/lib/store";
import { computeTwin } from "@/lib/tissue-twin";
import { useToasts } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { useTwinI18n } from "@/lib/twin-i18n";
import { useViewing } from "@/lib/viewing";

const TONE = {
  info: { text: "var(--c-primary-2)", bg: "rgba(6,182,212,.10)" },
  warn: { text: "var(--color-elev)", bg: "rgba(245,158,11,.10)" },
  danger: { text: "var(--color-crit)", bg: "rgba(239,68,68,.10)" },
} as const;

export function AiRecommendation() {
  const state = useSensorStore((s) => s.state);
  const patient = useViewing((s) => s.viewing);
  const twin = computeTwin(state, patient);
  const push = useToasts((s) => s.push);
  const t = useT();
  const { formatRecommendation, formatContributor } = useTwinI18n();
  const [applied, setApplied] = useState(false);

  const rec = twin?.recommendation;
  const tone = TONE[rec?.tone ?? "info"];
  const badge = rec?.tone === "danger" ? t("air_urgent") : rec?.tone === "warn" ? t("air_act_soon") : t("air_advisory");
  const formatted = rec ? formatRecommendation(rec) : null;

  function apply() {
    if (!formatted) return;
    setApplied(true);
    push({
      kind: "ok",
      title: t("air_applied_toast"),
      body: formatted.title,
    });
    setTimeout(() => setApplied(false), 6000);
  }

  return (
    <Card glow>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span
            className="inline-flex h-6 items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-widest text-white"
            style={{ background: "var(--grad-primary)" }}
          >
            <Brain className="mr-1 h-3 w-3" /> AI
          </span>
          {t("air_title")}
        </CardTitle>
        <Badge tone={rec?.tone === "danger" ? "danger" : rec?.tone === "warn" ? "warn" : "brand"}>
          {badge}
        </Badge>
      </CardHeader>
      <CardBody>
        <motion.div
          key={formatted?.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border p-4"
          style={{
            borderColor: `color-mix(in oklab, ${tone.text} 30%, transparent)`,
            background: tone.bg,
          }}
        >
          <div className="text-sm font-semibold" style={{ color: tone.text }}>
            {formatted?.title ?? t("air_awaiting")}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--c-text-2)]">
            {formatted?.detail}
          </p>

          {twin?.contributors?.length ? (
            <div className="mt-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
                {t("air_why")}
              </div>
              <ul className="mt-1 space-y-1 text-xs text-[var(--c-text-2)]">
                {twin.contributors.slice(0, 4).map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span
                      className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
                      style={{ background: tone.text }}
                    />
                    {formatContributor(c)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={applied ? "secondary" : "primary"}
              onClick={apply}
              disabled={applied}
              leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
            >
              {applied ? t("air_applied") : t("air_apply")}
            </Button>
            <span className="text-[11px] text-[var(--c-muted)]">
              {t("air_remaining")}: <b>{twin?.remainingSafeMin ?? 0} {t("rt_min")}</b>
            </span>
          </div>
        </motion.div>
      </CardBody>
    </Card>
  );
}
