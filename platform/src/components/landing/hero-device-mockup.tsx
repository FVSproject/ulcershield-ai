"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Activity, Bluetooth, HeartPulse, Thermometer, Droplet } from "lucide-react";
import { useT, type DictKey } from "@/lib/i18n";

/**
 * Animated device-frame that fakes a live dashboard preview.
 * Purely visual — no BLE hookup here.
 */
export function HeroDeviceMockup() {
  const t = useT();
  const [left, setLeft] = useState(38);
  const [right, setRight] = useState(24);
  const [risk, setRisk] = useState(42);

  useEffect(() => {
    const id = setInterval(() => {
      setLeft((p) => clampFluct(p, 20, 80, 6));
      setRight((p) => clampFluct(p, 15, 60, 5));
      setRisk((p) => clampFluct(p, 25, 78, 4));
    }, 1400);
    return () => clearInterval(id);
  }, []);

  const level = (v: number) => (v < 32 ? "safe" : v < 60 ? "elev" : v < 100 ? "high" : "crit");

  return (
    <div className="relative w-full max-w-md">
      <div className="absolute -inset-6 -z-10 rounded-[36px] bg-[radial-gradient(closest-side,rgba(34,211,238,.4),transparent_70%)] blur-2xl" />

      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="relative rounded-[28px] border border-[var(--c-border)] bg-[var(--c-surface)]/90 p-4 shadow-[0_40px_120px_-40px_rgba(6,182,212,.55)] backdrop-blur-xl"
      >
        <div className="flex items-center justify-between rounded-2xl bg-[var(--c-surface-2)] px-3 py-2">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--c-text)]">
            <span className="live-dot" />
            {t("mockup_live")}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--c-text-2)]">
            <Bluetooth className="h-3 w-3 text-[var(--c-primary-2)]" />
            UlcerShield-01
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <ZoneTile side={t("mockup_left")} value={left} level={level(left)} />
          <ZoneTile side={t("mockup_right")} value={right} level={level(right)} />
        </div>

        <BodyMapMini left={left} right={right} labelTitle={t("mockup_body_map")} labelSub={t("mockup_supine")} />

        <div className="mt-3 grid grid-cols-3 gap-2">
          <VitalTile icon={<HeartPulse className="h-3 w-3" />} label={t("mockup_body")} value="36.4°C" />
          <VitalTile icon={<Droplet className="h-3 w-3" />} label={t("mockup_humid")} value="52%" />
          <VitalTile icon={<Activity className="h-3 w-3" />} label={t("mockup_turns")} value="4" />
        </div>

        <RiskBar value={risk} label={t("mockup_risk_index")} />

        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-3 rounded-xl border border-[var(--color-elev)]/30 bg-[color-mix(in_oklab,var(--color-elev)_10%,transparent)] px-3 py-2">
            <div className="flex flex-col items-center">
              <span className="num text-lg font-semibold text-[var(--color-elev)]">18</span>
              <span className="text-[9px] uppercase tracking-widest text-[var(--color-elev)]">
                {t("mockup_min")}
              </span>
            </div>
            <div className="text-[11px] leading-tight text-[var(--c-text-2)]">
              <b className="text-[var(--c-text)]">{t("mockup_remaining_time")}</b>
              <br />
              {t("mockup_remaining_body")}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--c-primary-2)]/25 bg-[color-mix(in_oklab,var(--c-primary-2)_10%,transparent)] px-3 py-2 text-[11px] leading-relaxed text-[var(--c-text-2)]">
            <span className="text-[var(--c-primary-2)] font-semibold">
              {t("mockup_ai_recommend")}
            </span>{" "}
            {t("mockup_ai_body")}
          </div>
        </div>
      </motion.div>

      <FloatingChip
        icon={<Thermometer className="h-3 w-3 text-[var(--color-crit)]" />}
        text={t("mockup_chip_temp")}
        className="-left-6 top-24"
        delay={0.5}
      />
      <FloatingChip
        icon={<span className="live-dot" />}
        text={t("mockup_chip_turn")}
        className="-right-6 bottom-24"
        delay={1.2}
      />
    </div>
  );
}

function FloatingChip({
  icon,
  text,
  className,
  delay,
}: {
  icon: React.ReactNode;
  text: string;
  className?: string;
  delay: number;
}) {
  return (
    <motion.div
      aria-hidden
      animate={{ y: [0, delay > 1 ? 6 : -6, 0] }}
      transition={{ duration: 4 + delay, repeat: Infinity, ease: "easeInOut", delay }}
      className={
        "absolute hidden lg:flex items-center gap-2 rounded-full glass px-3 py-1.5 text-[11px] font-medium text-[var(--c-text)] " +
        (className ?? "")
      }
    >
      {icon} {text}
    </motion.div>
  );
}

function ZoneTile({ side, value, level }: { side: string; value: number; level: string }) {
  const map: Record<string, string> = {
    safe: "var(--color-safe)",
    elev: "var(--color-elev)",
    high: "var(--color-high)",
    crit: "var(--color-crit)",
  };
  const c = map[level];
  return (
    <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="truncate text-[10px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
          {side}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
          style={{ background: `color-mix(in oklab, ${c} 18%, transparent)`, color: c }}
        >
          {level}
        </span>
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="num text-2xl font-semibold text-[var(--c-text)]">{value.toFixed(0)}</span>
        <span className="text-[10px] text-[var(--c-muted)]">mmHg</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--c-border)]/60">
        <motion.div
          initial={false}
          animate={{ width: `${Math.min(100, value / 1.2)}%`, backgroundColor: c }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full"
        />
      </div>
    </div>
  );
}

function VitalTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--c-surface-2)] px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-[9.5px] uppercase tracking-widest text-[var(--c-muted)]">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-0.5 num text-sm font-semibold">{value}</div>
    </div>
  );
}

function RiskBar({ value, label }: { value: number; label: string }) {
  const c =
    value < 25
      ? "var(--color-safe)"
      : value < 50
      ? "var(--color-elev)"
      : value < 75
      ? "var(--color-high)"
      : "var(--color-crit)";
  return (
    <div className="mt-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface-2)] px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-widest text-[var(--c-muted)]">
        <span className="truncate">{label}</span>
        <span className="text-[var(--c-text)] num text-sm">{value.toFixed(0)}/100</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--c-border)]/60">
        <motion.div
          initial={false}
          animate={{ width: `${value}%`, backgroundColor: c }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full"
        />
      </div>
    </div>
  );
}

function BodyMapMini({
  left,
  right,
  labelTitle,
  labelSub,
}: {
  left: number;
  right: number;
  labelTitle: string;
  labelSub: string;
}) {
  const dotColor = (v: number) =>
    v < 32 ? "#10b981" : v < 60 ? "#f59e0b" : v < 100 ? "#f97316" : "#ef4444";
  return (
    <div className="mt-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface-2)] p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-widest text-[var(--c-muted)]">
          {labelTitle}
        </span>
        <span className="text-[10px] text-[var(--c-muted)]">{labelSub}</span>
      </div>
      <svg viewBox="0 0 240 140" className="w-full">
        <defs>
          <linearGradient id="mini-body" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--c-border-2)" />
            <stop offset="1" stopColor="var(--c-border)" />
          </linearGradient>
        </defs>
        <rect x="8" y="6" width="224" height="128" rx="14" fill="var(--c-surface)" opacity="0.7" />
        <g fill="url(#mini-body)" stroke="var(--c-border-2)" strokeWidth="0.8">
          <ellipse cx="120" cy="30" rx="12" ry="14" />
          <path d="M96 40 Q94 55 110 60 L130 60 Q146 55 144 40 L120 36 Z" />
          <rect x="96" y="55" width="48" height="42" rx="8" />
          <rect x="102" y="94" width="16" height="34" rx="5" />
          <rect x="122" y="94" width="16" height="34" rx="5" />
        </g>
        <PSpot cx={102} cy={62} color={dotColor(left * 0.55)} mag={left * 0.55} />
        <PSpot cx={108} cy={78} color={dotColor(left)} mag={left} />
        <PSpot cx={110} cy={122} color={dotColor(left * 0.6)} mag={left * 0.6} />
        <PSpot cx={138} cy={62} color={dotColor(right * 0.55)} mag={right * 0.55} />
        <PSpot cx={132} cy={78} color={dotColor(right)} mag={right} />
        <PSpot cx={130} cy={122} color={dotColor(right * 0.6)} mag={right * 0.6} />
      </svg>
    </div>
  );
}

function PSpot({ cx, cy, color, mag }: { cx: number; cy: number; color: string; mag: number }) {
  const r = 3 + Math.min(mag / 100, 1) * 3;
  const glow = 6 + Math.min(mag / 100, 1) * 6;
  return (
    <g>
      <circle cx={cx} cy={cy} r={glow} fill={color} opacity={0.25}>
        <animate attributeName="r" values={`${glow};${glow + 2};${glow}`} dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={r} fill={color} />
    </g>
  );
}

function clampFluct(v: number, min: number, max: number, mag: number) {
  const next = v + (Math.random() - 0.5) * 2 * mag;
  return Math.max(min, Math.min(max, next));
}
