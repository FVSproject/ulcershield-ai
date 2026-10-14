"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowDownRight, Minus, RotateCcw, Scale, Thermometer, Weight, Zap } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSensorStore } from "@/lib/store";
import { useToasts } from "@/components/ui/toast";
import {
  TEMP_REF_MAX_C,
  TEMP_REF_MIN_C,
  calibrateTemp,
  canCalibrateTemp,
  canTiltBed,
  sendCommand,
} from "@/lib/sources/ble-source";
import { useT, type DictKey } from "@/lib/i18n";
import { useViewing } from "@/lib/viewing";
import { recommendedTiltAngle } from "@/lib/tissue-twin";
import { useBedTilt } from "@/lib/bed-tilt";

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
  const tilt = useSensorStore((s) => s.state?.tilt ?? null);
  const patient = useViewing((s) => s.viewing);
  const push = useToasts((s) => s.push);
  const t = useT();
  const tiltBed = useBedTilt();
  const tiltAngle = recommendedTiltAngle(patient);
  const tempOffset = useSensorStore((s) => s.state?.tempOffsetC ?? null);
  const [refC, setRefC] = useState("");

  async function fireTempCal(clear: boolean) {
    const ref = clear ? null : Number(refC);
    if (ref !== null && !(ref >= TEMP_REF_MIN_C && ref <= TEMP_REF_MAX_C)) {
      push({ kind: "warn", title: t("ct_temp_title"), body: t("ct_temp_invalid") });
      return;
    }
    if (!canCalibrateTemp()) {
      push({ kind: "info", title: t("ct_temp_title"), body: t("ct_temp_unavailable") });
      return;
    }
    try {
      await calibrateTemp(ref);
      push({ kind: "ok", title: t("ct_command_sent"), body: t("ct_temp_title") });
      setRefC("");
    } catch (e) {
      push({ kind: "danger", title: t("ct_command_failed"), body: (e as Error).message });
    }
  }

  function fireTilt(side: "left" | "right" | null) {
    if (!canTiltBed()) {
      push({ kind: "info", title: t("ct_tilt_title"), body: t("ct_tilt_unavailable") });
      return;
    }
    void tiltBed(side, tiltAngle);
  }

  function position(deg: number) {
    if (Math.abs(deg) < 0.5) return t("ct_tilt_flat");
    return t("ct_tilt_pos")
      .replace("{angle}", String(Math.round(Math.abs(deg))))
      .replace("{side}", t(deg > 0 ? "twin_side_right" : "twin_side_left"));
  }

  const tiltStatus = !tilt
    ? t("ct_tilt_none")
    : [
        position(tilt.deg) +
          (Math.abs(tilt.targetDeg - tilt.deg) > 0.5 ? ` → ${position(tilt.targetDeg)}` : ""),
        t("ct_tilt_tray").replace("{deg}", Math.abs(tilt.trayDeg).toFixed(1)),
      ].join(" · ");

  const tiltButtons: { side: "left" | "right" | null; label: string; icon: React.ReactNode }[] = [
    {
      side: "left",
      label: t("ct_tilt_left").replace("{angle}", String(tiltAngle)),
      icon: <ArrowDownLeft className="h-4 w-4" />,
    },
    { side: null, label: t("ct_tilt_flat"), icon: <Minus className="h-4 w-4" /> },
    {
      side: "right",
      label: t("ct_tilt_right").replace("{angle}", String(tiltAngle)),
      icon: <ArrowDownRight className="h-4 w-4" />,
    },
  ];

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

        <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface-2)] p-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-[var(--c-text)]">{t("ct_tilt_title")}</span>
            <span className="num truncate text-[11px] text-[var(--c-muted)]">{tiltStatus}</span>
          </div>
          {/* Physical directions: keep left on the left even in RTL layouts. */}
          <div dir="ltr" className="mt-3 grid grid-cols-3 gap-2">
            {tiltButtons.map((b) => {
              const s = TONE[b.side === null ? "muted" : "primary"];
              return (
                <button
                  key={b.side ?? "flat"}
                  onClick={() => fireTilt(b.side)}
                  className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl border ${s.border} ${s.bg} px-2 py-2.5 text-xs font-semibold transition-all duration-200 ${s.hover}`}
                >
                  <span className={s.text}>{b.icon}</span>
                  <span dir="auto" className="truncate text-[var(--c-text)]">
                    {b.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface-2)] p-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--c-text)]">
              <Thermometer className="h-4 w-4 text-[var(--c-primary-2)]" />
              {t("ct_temp_title")}
            </span>
            <span className="num truncate text-[11px] text-[var(--c-muted)]">
              {tempOffset == null || tempOffset === 0
                ? t("ct_temp_uncal")
                : t("ct_temp_offset").replace("{v}", `${tempOffset > 0 ? "+" : ""}${tempOffset.toFixed(1)}`)}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--c-muted)]">{t("ct_temp_hint")}</p>
          <form
            className="mt-3 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void fireTempCal(false);
            }}
          >
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              min={TEMP_REF_MIN_C}
              max={TEMP_REF_MAX_C}
              placeholder="36.8"
              value={refC}
              onChange={(e) => setRefC(e.target.value)}
              aria-label={t("ct_temp_title")}
              className="num h-9 w-24 px-3 py-2"
            />
            <span className="text-xs text-[var(--c-muted)]">°C</span>
            <Button type="submit" size="sm" disabled={refC === ""}>
              {t("ct_temp_calibrate")}
            </Button>
            {tempOffset != null && tempOffset !== 0 && (
              <button
                type="button"
                onClick={() => void fireTempCal(true)}
                className="text-[11px] text-[var(--c-muted)] underline underline-offset-2 hover:text-[var(--c-text)]"
              >
                {t("ct_temp_clear")}
              </button>
            )}
          </form>
        </div>
      </CardBody>
    </Card>
  );
}
