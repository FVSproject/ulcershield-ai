"use client";

import { RotateCcw, Scale, Weight, Zap } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSensorStore } from "@/lib/store";
import { useToasts } from "@/components/ui/toast";
import { sendCommand } from "@/lib/sources/ble-source";
import { useT, type DictKey } from "@/lib/i18n";

interface Action {
  cmd: "cal_zero" | "cal_a" | "cal_b" | "reset";
  labelKey: DictKey;
  descKey: DictKey;
  icon: React.ReactNode;
  tone: "primary" | "safe" | "warn" | "muted";
}

const ACTIONS: Action[] = [
  { cmd: "cal_zero", labelKey: "ct_zero", descKey: "ct_zero_desc", icon: <Zap className="h-4 w-4" />, tone: "primary" },
  { cmd: "cal_a", labelKey: "ct_cal_left", descKey: "ct_cal_desc", icon: <Scale className="h-4 w-4" />, tone: "safe" },
  { cmd: "cal_b", labelKey: "ct_cal_right", descKey: "ct_cal_desc", icon: <Weight className="h-4 w-4" />, tone: "safe" },
  { cmd: "reset", labelKey: "ct_reset", descKey: "ct_reset_desc", icon: <RotateCcw className="h-4 w-4" />, tone: "muted" },
];

const TONE: Record<Action["tone"], { bg: string; text: string; border: string; hover: string }> = {
  primary: {
    bg: "bg-[color-mix(in_oklab,var(--c-primary-2)_10%,transparent)]",
    text: "text-[var(--c-primary-2)]",
    border: "border-[var(--c-primary-2)]/30",
    hover: "hover:border-[var(--c-primary-2)]/70 hover:-translate-y-0.5",
  },
  safe: {
    bg: "bg-[color-mix(in_oklab,var(--color-safe)_10%,transparent)]",
    text: "text-[var(--color-safe)]",
    border: "border-[var(--color-safe)]/25",
    hover: "hover:border-[var(--color-safe)]/60 hover:-translate-y-0.5",
  },
  warn: {
    bg: "bg-[color-mix(in_oklab,var(--color-elev)_10%,transparent)]",
    text: "text-[var(--color-elev)]",
    border: "border-[var(--color-elev)]/25",
    hover: "hover:border-[var(--color-elev)]/60 hover:-translate-y-0.5",
  },
  muted: {
    bg: "bg-[var(--c-surface-2)]",
    text: "text-[var(--c-text-2)]",
    border: "border-[var(--c-border)]",
    hover: "hover:border-[var(--c-border-2)] hover:-translate-y-0.5",
  },
};

export function Controls() {
  const source = useSensorStore((s) => s.source);
  const push = useToasts((s) => s.push);
  const t = useT();

  async function fire(a: Action) {
    const label = t(a.labelKey);
    if (source === "ble") {
      try {
        await sendCommand(a.cmd);
        push({ kind: "ok", title: t("ct_command_sent"), body: label });
      } catch (e) {
        push({ kind: "danger", title: t("ct_command_failed"), body: (e as Error).message });
      }
    } else {
      push({
        kind: "info",
        title: t("ct_sim_active"),
        body: t("ct_sim_body"),
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("ct_title")}</CardTitle>
        <Badge tone="neutral">{t("ct_pill")}</Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-xs leading-relaxed text-[var(--c-muted)]">{t("ct_hint")}</p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {ACTIONS.map((a) => {
            const s = TONE[a.tone];
            return (
              <button
                key={a.cmd}
                onClick={() => fire(a)}
                className={`group flex min-w-0 items-center gap-3 rounded-2xl border ${s.border} ${s.bg} px-3.5 py-3 text-left transition-all duration-200 ${s.hover}`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--c-surface)] ${s.text}`}
                >
                  {a.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--c-text)]">
                    {t(a.labelKey)}
                  </span>
                  <span className="block truncate text-[11px] text-[var(--c-muted)]">
                    {t(a.descKey)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
