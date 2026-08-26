"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, Printer, RefreshCw } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { AppBoot } from "@/components/app-boot";
import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { getLogs, type LogRow } from "@/lib/db";
import { useViewing } from "@/lib/viewing";
import { useToasts } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";

export default function AnalysisPage() {
  const user = useViewing((s) => s.viewing);
  const push = useToasts((s) => s.push);
  const t = useT();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));

  async function reload() {
    if (!user) return;
    setLoading(true);
    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime() + 86400_000;
    const all = await getLogs(user.id, fromMs, toMs);
    setRows(all);
    setLoading(false);
  }

  useEffect(() => {
    reload();
    const id = window.setInterval(reload, 15000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, from, to]);

  const data = useMemo(
    () =>
      rows.map((r) => ({
        t: new Date(r.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        ts: r.ts,
        left: Number(r.leftMmhg.toFixed(1)),
        right: Number(r.rightMmhg.toFixed(1)),
        cop: Number(r.cop.toFixed(2)),
        risk: r.risk,
        body: r.bodyC,
        humidity: r.humidity,
      })),
    [rows]
  );

  const kpi = useMemo(() => {
    if (rows.length === 0)
      return { n: 0, avg: 0, max: 0, avgRisk: 0, occPct: 0, turns: 0 };
    let avg = 0,
      max = 0,
      avgR = 0,
      occ = 0;
    for (const r of rows) {
      const p = Math.max(r.leftMmhg, r.rightMmhg);
      avg += p;
      if (p > max) max = p;
      avgR += r.risk;
      if (r.occupied) occ++;
    }
    return {
      n: rows.length,
      avg: avg / rows.length,
      max,
      avgRisk: avgR / rows.length,
      occPct: (occ / rows.length) * 100,
      turns: rows[rows.length - 1]?.turns ?? 0,
    };
  }, [rows]);

  function exportCsv() {
    if (!user) return;
    const header = "ts,leftMmHg,rightMmHg,cop,turns,bodyC,humidity,risk,occupied\n";
    const body = rows
      .map((r) =>
        [
          new Date(r.ts).toISOString(),
          r.leftMmhg.toFixed(2),
          r.rightMmhg.toFixed(2),
          r.cop.toFixed(3),
          r.turns,
          r.bodyC ?? "",
          r.humidity ?? "",
          r.risk,
          r.occupied,
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ulcershield_${user.username}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    push({ kind: "ok", title: t("an_exported"), body: `${rows.length} ${t("an_samples_export")}` });
  }

  return (
    <AppBoot>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{t("an_title")}</h1>
            <p className="mt-2 text-[var(--c-text-2)]">{t("an_subtitle")}</p>
            <div className="mt-3">
              <ImpersonationBanner />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Field label={t("an_from")}>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label={t("an_to")}>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
            <Button variant="secondary" onClick={reload} leftIcon={<RefreshCw className="h-4 w-4" />}>
              {t("ui_refresh")}
            </Button>
            <Button onClick={exportCsv} leftIcon={<Download className="h-4 w-4" />}>
              {t("an_export_csv")}
            </Button>
            <Button
              variant="glass"
              onClick={() => window.print()}
              leftIcon={<Printer className="h-4 w-4" />}
            >
              {t("an_export_pdf")}
            </Button>
          </div>
        </motion.header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Kpi label={t("an_kpi_samples")} value={kpi.n.toString()} />
          <Kpi label={t("an_kpi_avg")} value={kpi.avg.toFixed(0)} />
          <Kpi label={t("an_kpi_max")} value={kpi.max.toFixed(0)} tone="danger" />
          <Kpi label={t("an_kpi_turns")} value={kpi.turns.toString()} />
          <Kpi label={t("an_kpi_risk")} value={kpi.avgRisk.toFixed(0)} />
          <Kpi label={t("an_kpi_occ")} value={`${kpi.occPct.toFixed(0)}%`} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ChartCard title={t("an_chart_pressure")} subtitle={t("an_chart_pressure_sub")}>
            {data.length < 2 ? (
              <Empty loading={loading} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data}>
                  <CartesianGrid stroke="var(--c-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="t" stroke="var(--c-muted)" fontSize={11} />
                  <YAxis stroke="var(--c-muted)" fontSize={11} domain={[0, 150]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={legendStyle} />
                  <Line type="monotone" dataKey="left" stroke="#22d3ee" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="right" stroke="#38bdf8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title={t("an_chart_risk")} subtitle={t("an_chart_risk_sub")}>
            {data.length < 2 ? (
              <Empty loading={loading} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="riskArea" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor="#f97316" stopOpacity={0.55} />
                      <stop offset="1" stopColor="#f97316" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--c-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="t" stroke="var(--c-muted)" fontSize={11} />
                  <YAxis stroke="var(--c-muted)" fontSize={11} domain={[0, 100]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="risk" stroke="#f97316" fill="url(#riskArea)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title={t("an_chart_env")} subtitle={t("an_chart_env_sub")}>
            {data.length < 2 ? (
              <Empty loading={loading} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data}>
                  <CartesianGrid stroke="var(--c-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="t" stroke="var(--c-muted)" fontSize={11} />
                  <YAxis
                    yAxisId="l"
                    stroke="var(--c-muted)"
                    fontSize={11}
                    domain={["auto", "auto"]}
                  />
                  <YAxis
                    yAxisId="r"
                    orientation="right"
                    stroke="var(--c-muted)"
                    fontSize={11}
                    domain={[0, 100]}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={legendStyle} />
                  <Line yAxisId="l" type="monotone" dataKey="body" stroke="#22d3ee" strokeWidth={2} dot={false} />
                  <Line yAxisId="r" type="monotone" dataKey="humidity" stroke="#67e8f9" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title={t("an_chart_cop")} subtitle={t("an_chart_cop_sub")}>
            {data.length < 2 ? (
              <Empty loading={loading} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data}>
                  <CartesianGrid stroke="var(--c-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="t" stroke="var(--c-muted)" fontSize={11} />
                  <YAxis stroke="var(--c-muted)" fontSize={11} domain={[-1, 1]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="cop" stroke="#22d3ee" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </div>
    </AppBoot>
  );
}

const tooltipStyle = {
  background: "var(--c-surface)",
  border: "1px solid var(--c-border)",
  borderRadius: 12,
  fontSize: 12,
} as const;
const legendStyle = { fontSize: 11 } as const;

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <Card>
      <CardBody className="py-5">
        <div className="text-[10.5px] font-medium uppercase tracking-widest text-[var(--c-muted)]">
          {label}
        </div>
        <div
          className="num mt-1.5 text-3xl font-semibold"
          style={{ color: tone === "danger" ? "var(--color-crit)" : "var(--c-text)" }}
        >
          {value}
        </div>
      </CardBody>
    </Card>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <div className="mt-1 text-[11px] text-[var(--c-muted)]">{subtitle}</div>
        </div>
        <Badge tone="neutral">{t("an_chart_pill")}</Badge>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

function Empty({ loading }: { loading?: boolean }) {
  const t = useT();
  return (
    <div className="grid h-[280px] place-items-center text-center text-sm text-[var(--c-muted)]">
      {loading ? t("ui_loading") : t("an_empty")}
    </div>
  );
}
