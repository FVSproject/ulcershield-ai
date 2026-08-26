"use client";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSensorStore } from "@/lib/store";
import { pressureLevel, PRESSURE_COLORS, type ZoneReading } from "@/types/sensor";
import { useT } from "@/lib/i18n";

interface Spot {
  side: "left" | "right";
  region: string;
  weight: number;
  cx: number;
  cy: number;
  label: string;
}

const SPOTS: Spot[] = [
  { side: "left", region: "shoulder", weight: 0.55, cx: 100, cy: 118, label: "L1" },
  { side: "left", region: "scapula", weight: 0.7, cx: 112, cy: 172, label: "L2" },
  { side: "left", region: "hip", weight: 1.0, cx: 112, cy: 268, label: "L3" },
  { side: "left", region: "heel", weight: 0.6, cx: 118, cy: 450, label: "L4" },
  { side: "right", region: "shoulder", weight: 0.55, cx: 160, cy: 118, label: "R1" },
  { side: "right", region: "scapula", weight: 0.7, cx: 148, cy: 172, label: "R2" },
  { side: "right", region: "hip", weight: 1.0, cx: 148, cy: 268, label: "R3" },
  { side: "right", region: "heel", weight: 0.6, cx: 148, cy: 450, label: "R4" },
];

export function BodyMap() {
  const state = useSensorStore((s) => s.state);
  const t = useT();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("bm_title")}</CardTitle>
        <Badge tone="neutral">{t("bm_pill")}</Badge>
      </CardHeader>
      <CardBody className="grid gap-6 lg:grid-cols-[1fr_180px] lg:items-center">
        <div className="flex justify-center">
          <svg
            viewBox="0 0 260 500"
            className="h-[520px] w-auto max-w-full"
            aria-label={t("bm_title")}
          >
            <defs>
              <linearGradient id="bmap-mattress" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--c-surface-2)" />
                <stop offset="1" stopColor="var(--c-surface)" />
              </linearGradient>
              <linearGradient id="bmap-body" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--c-border-2)" />
                <stop offset="1" stopColor="var(--c-border)" />
              </linearGradient>
            </defs>
            <rect x="10" y="20" width="240" height="460" rx="18" fill="url(#bmap-mattress)" stroke="var(--c-border)" />
            <g fill="url(#bmap-body)" stroke="var(--c-border-2)" strokeWidth="0.9">
              <circle cx="130" cy="60" r="26" />
              <rect x="120" y="82" width="20" height="14" rx="4" />
              <path d="M92 100 Q90 110 96 128 L96 220 Q96 236 110 240 L150 240 Q164 236 164 220 L164 128 Q170 110 168 100 Z" />
              <path d="M92 118 Q70 130 68 200 L74 260 Q76 268 82 268 L86 268 Q92 264 94 254 L96 200 Z" />
              <path d="M168 118 Q190 130 192 200 L186 260 Q184 268 178 268 L174 268 Q168 264 166 254 L164 200 Z" />
              <path d="M96 240 Q90 250 96 280 L164 280 Q170 250 164 240 Z" />
              <path d="M100 280 Q98 310 110 360 L124 360 Q130 320 128 280 Z" />
              <path d="M132 280 Q130 320 136 360 L150 360 Q162 310 160 280 Z" />
              <path d="M110 360 Q108 400 116 450 L124 450 Q126 400 124 360 Z" />
              <path d="M136 360 Q134 400 144 450 L152 450 Q154 400 150 360 Z" />
            </g>
            <g opacity="0.6">
              <circle cx="130" cy="55" r="6" fill="var(--c-border-2)" />
              <circle cx="130" cy="248" r="6" fill="var(--c-border-2)" />
            </g>
            {SPOTS.map((s) => (
              <SpotDot key={s.label} spot={s} left={state?.left} right={state?.right} />
            ))}
          </svg>
        </div>

        <ul className="space-y-2 text-xs">
          <Legend color="var(--color-safe)" label={t("bm_lg_safe")} />
          <Legend color="var(--color-elev)" label={t("bm_lg_elev")} />
          <Legend color="var(--color-high)" label={t("bm_lg_high")} />
          <Legend color="var(--color-crit)" label={t("bm_lg_crit")} />
          <li className="mt-3 text-[var(--c-muted)]">{t("bm_lg_note")}</li>
        </ul>
      </CardBody>
    </Card>
  );
}

function SpotDot({ spot, left, right }: { spot: Spot; left?: ZoneReading; right?: ZoneReading }) {
  const src = spot.side === "left" ? left : right;
  const eff = (src?.mmhg ?? 0) * spot.weight;
  const sat = !!src?.sat && spot.weight >= 0.9;
  const lvl = pressureLevel(eff, sat);
  const color = PRESSURE_COLORS[lvl];
  const mag = Math.min(eff / 100, 1);
  const r = 8 + mag * 4;
  const glow = 14 + mag * 8;
  return (
    <g>
      <circle cx={spot.cx} cy={spot.cy} r={glow} fill={color} opacity="0.22">
        <animate attributeName="r" values={`${glow};${glow + 3};${glow}`} dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={spot.cx} cy={spot.cy} r={r} fill={color}>
        <animate attributeName="r" values={`${r};${r + 0.6};${r}`} dur="1.8s" repeatCount="indefinite" />
      </circle>
      <text
        x={spot.cx}
        y={spot.cy + 3}
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill="white"
      >
        {spot.label}
      </text>
      <title>{`${spot.side === "left" ? "Left" : "Right"} ${spot.region}: ${eff.toFixed(0)} mmHg`}</title>
    </g>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <li className="flex items-center gap-2 text-[var(--c-text-2)]">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </li>
  );
}
