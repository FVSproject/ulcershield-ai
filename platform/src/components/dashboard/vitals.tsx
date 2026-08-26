"use client";

import { HeartPulse, Droplets } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSensorStore } from "@/lib/store";
import { formatNumber } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export function Vitals() {
  const state = useSensorStore((s) => s.state);
  const t = useT();
  const bodyC = state?.bodyC;
  const humidity = state?.humidity;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("v_title")}</CardTitle>
        <Badge tone="neutral">{t("v_sensors")}</Badge>
      </CardHeader>
      <CardBody className="grid gap-3">
        <VitalRow
          icon={<HeartPulse className="h-4 w-4" />}
          label={t("v_body_temp")}
          hint="MLX90614 · IR"
          value={formatNumber(bodyC, 1)}
          unit="°C"
          tone={
            bodyC == null
              ? "muted"
              : bodyC > 37.5
              ? "danger"
              : bodyC < 33 && bodyC > 28
              ? "warn"
              : "safe"
          }
          status={
            bodyC == null
              ? t("ui_awaiting")
              : bodyC > 37.5
              ? t("v_body_high")
              : bodyC < 33 && bodyC > 28
              ? t("v_body_low")
              : t("v_body_ok")
          }
        />
        <VitalRow
          icon={<Droplets className="h-4 w-4" />}
          label={t("v_humidity")}
          hint="DHT22"
          value={formatNumber(humidity, 0)}
          unit="%"
          tone={
            humidity == null
              ? "muted"
              : humidity > 75
              ? "danger"
              : humidity > 65
              ? "warn"
              : "safe"
          }
          status={
            humidity == null
              ? t("ui_awaiting")
              : humidity > 75
              ? t("v_hum_high")
              : humidity > 65
              ? t("v_hum_warn")
              : t("v_hum_ok")
          }
        />
      </CardBody>
    </Card>
  );
}

function VitalRow({
  icon,
  label,
  hint,
  value,
  unit,
  status,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  value: string;
  unit: string;
  status: string;
  tone: "safe" | "warn" | "danger" | "muted";
}) {
  const toneMap = {
    safe: "var(--color-safe)",
    warn: "var(--color-elev)",
    danger: "var(--color-crit)",
    muted: "var(--c-muted)",
  } as const;
  const c = toneMap[tone];
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface-2)] px-4 py-3">
      <div
        className="grid h-12 w-12 place-items-center rounded-xl"
        style={{ background: `color-mix(in oklab, ${c} 15%, transparent)`, color: c }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">{label}</span>
          <span className="text-[11px] text-[var(--c-muted)]">{hint}</span>
        </div>
        <div className="mt-0.5 text-[12px] text-[var(--c-text-2)]">{status}</div>
      </div>
      <div className="text-right">
        <span
          className="num text-2xl font-semibold"
          style={{ color: tone === "muted" ? "var(--c-text)" : c }}
        >
          {value}
        </span>
        <span className="ml-1 text-xs text-[var(--c-muted)]">{unit}</span>
      </div>
    </div>
  );
}
