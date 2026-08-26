"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSensorStore } from "@/lib/store";
import { computeTwin } from "@/lib/tissue-twin";
import { useT } from "@/lib/i18n";
import { REGION_LABEL_KEY } from "@/lib/twin-labels";
import { useViewing } from "@/lib/viewing";

export function RiskTrajectory() {
  const state = useSensorStore((s) => s.state);
  const patient = useViewing((s) => s.viewing);
  const twin = computeTwin(state, patient);
  const t = useT();

  const points = twin?.trajectory ?? [
    { tMin: 0, risk: 0 },
    { tMin: 15, risk: 0 },
    { tMin: 60, risk: 0 },
    { tMin: 180, risk: 0 },
    { tMin: 360, risk: 0 },
  ];

  const W = 460;
  const H = 180;
  const PAD = { l: 34, r: 12, t: 12, b: 26 };
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const y = (v: number) => PAD.t + ih - (v / 100) * ih;
  const x = (i: number) => PAD.l + (i / (points.length - 1)) * iw;

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.risk).toFixed(1)}`)
    .join(" ");
  const areaPath = `${path} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;

  const labels = [t("rtr_now"), t("rtr_15m"), t("rtr_1h"), t("rtr_3h"), t("rtr_6h")];
  const bandsY = [
    { from: 0, to: 25, color: "var(--color-safe)" },
    { from: 25, to: 50, color: "var(--color-elev)" },
    { from: 50, to: 75, color: "var(--color-high)" },
    { from: 75, to: 100, color: "var(--color-crit)" },
  ];

  const targetTMin = twin?.remainingSafeMin ?? 0;
  const targetX =
    targetTMin === 0
      ? PAD.l
      : targetTMin <= 15
      ? x(1)
      : targetTMin <= 60
      ? x(2)
      : targetTMin <= 180
      ? x(3)
      : x(4);

  const primaryLabel = twin?.primary.region ? t(REGION_LABEL_KEY[twin.primary.region]) : "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[var(--c-primary-2)]" />
          {t("rtr_title")} · {primaryLabel}
        </CardTitle>
        <Badge tone="neutral">{t("rtr_pill")}</Badge>
      </CardHeader>
      <CardBody>
        <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface-2)] p-4">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
            <defs>
              <linearGradient id="traj-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#22d3ee" stopOpacity="0.35" />
                <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="traj-stroke" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#67e8f9" />
                <stop offset="1" stopColor="#22d3ee" />
              </linearGradient>
            </defs>

            {bandsY.map((b) => (
              <rect
                key={b.from}
                x={PAD.l}
                y={y(b.to)}
                width={iw}
                height={y(b.from) - y(b.to)}
                fill={b.color}
                opacity="0.05"
              />
            ))}

            {[25, 50, 75].map((v) => (
              <g key={v}>
                <line
                  x1={PAD.l}
                  x2={W - PAD.r}
                  y1={y(v)}
                  y2={y(v)}
                  stroke="var(--c-border)"
                  strokeDasharray="3 3"
                />
              </g>
            ))}

            {[
              { v: 15, l: t("rtr_low") },
              { v: 40, l: t("rtr_moderate") },
              { v: 65, l: t("rtr_high") },
              { v: 90, l: t("rtr_critical") },
            ].map(({ v, l }) => (
              <text
                key={v}
                x={PAD.l - 4}
                y={y(v)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-[var(--c-muted)]"
                style={{ fontSize: 9 }}
              >
                {l}
              </text>
            ))}

            <motion.path
              d={areaPath}
              fill="url(#traj-fill)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            />
            <motion.path
              d={path}
              fill="none"
              stroke="url(#traj-stroke)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8 }}
            />

            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={x(i)}
                  cy={y(p.risk)}
                  r={i === 0 ? 4 : 3}
                  fill="var(--c-surface)"
                  stroke="var(--c-primary-2)"
                  strokeWidth={i === 0 ? 2.5 : 2}
                />
                <text
                  x={x(i)}
                  y={y(p.risk) - 8}
                  textAnchor="middle"
                  className="fill-[var(--c-text-2)] num"
                  style={{ fontSize: 9, fontWeight: 600 }}
                >
                  {p.risk}
                </text>
              </g>
            ))}

            {targetTMin > 0 && targetTMin < 360 && (
              <g>
                <line
                  x1={targetX}
                  x2={targetX}
                  y1={PAD.t}
                  y2={H - PAD.b}
                  stroke="var(--color-elev)"
                  strokeDasharray="4 3"
                  opacity="0.7"
                />
                <text
                  x={targetX + 4}
                  y={PAD.t + 10}
                  className="fill-[var(--color-elev)]"
                  style={{ fontSize: 9, fontWeight: 600 }}
                >
                  {t("rtr_reposition")}
                </text>
              </g>
            )}

            {labels.map((l, i) => (
              <text
                key={l}
                x={x(i)}
                y={H - 8}
                textAnchor="middle"
                className="fill-[var(--c-muted)]"
                style={{ fontSize: 10 }}
              >
                {l}
              </text>
            ))}
          </svg>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-[var(--c-muted)]">
          {t("rtr_hint")}
        </p>
      </CardBody>
    </Card>
  );
}
