"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Users, Activity, TrendingUp, ShieldAlert, Search, ChevronRight, Trash2 } from "lucide-react";
import { AppBoot } from "@/components/app-boot";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/session";
import { useToasts } from "@/components/ui/toast";
import {
  countLogs,
  deletePatient,
  getLatestLog,
  isAdmin,
  listPatientRoster,
  type LogRow,
  type Patient,
} from "@/lib/db";
import { useT } from "@/lib/i18n";
import { RISK_COLORS, riskLevel } from "@/types/sensor";
import { formatNumber, timeAgo } from "@/lib/utils";

interface Row {
  p: Patient;
  latest?: LogRow;
  count: number;
}

export default function AdminPage() {
  const router = useRouter();
  const user = useSession((s) => s.user);
  const push = useToasts((s) => s.push);
  const t = useT();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    // Non-admin never sees this page.
    if (user && !isAdmin(user)) router.replace("/dashboard");
  }, [user, router]);

  async function reload() {
    setLoading(true);
    const patients = await listPatientRoster();
    const enriched = await Promise.all(
      patients.map(async (p) => ({
        p,
        latest: await getLatestLog(p.id),
        count: await countLogs(p.id),
      }))
    );
    setRows(enriched);
    setLoading(false);
  }

  useEffect(() => {
    reload();
    const id = window.setInterval(reload, 10000);
    return () => window.clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (r) =>
        r.p.name.toLowerCase().includes(query) ||
        r.p.username.toLowerCase().includes(query) ||
        (r.p.email ?? "").toLowerCase().includes(query)
    );
  }, [rows, q]);

  const kpi = useMemo(() => {
    const total = rows.length;
    const highRisk = rows.filter((r) => (r.latest?.risk ?? 0) >= 50).length;
    const active = rows.filter((r) => r.latest && Date.now() - r.latest.ts < 5 * 60 * 1000).length;
    const avgRisk =
      rows.length > 0
        ? Math.round(rows.reduce((s, r) => s + (r.latest?.risk ?? 0), 0) / rows.length)
        : 0;
    return { total, highRisk, active, avgRisk };
  }, [rows]);

  async function remove(p: Patient) {
    if (!confirm(t("patients_confirm_delete"))) return;
    await deletePatient(p.id);
    push({ kind: "info", title: t("patients_deleted"), body: p.name });
    reload();
  }

  if (!user || !isAdmin(user)) return <AppBoot>{null}</AppBoot>;

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
            <h1 className="text-3xl font-semibold tracking-tight">
              {t("admin_title")}{" "}
              <span className="text-gradient-brand">{t("admin_title_b")}</span>
            </h1>
            <p className="mt-2 text-[var(--c-text-2)]">{t("admin_subtitle")}</p>
          </div>
          <Badge tone="brand" dot>
            {t("admin_role")} · {user.name}
          </Badge>
        </motion.header>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi icon={<Users className="h-4 w-4" />} label={t("admin_kpi_total")} value={kpi.total} />
          <Kpi
            icon={<Activity className="h-4 w-4" />}
            label={t("admin_kpi_active")}
            value={kpi.active}
            tone="safe"
          />
          <Kpi
            icon={<ShieldAlert className="h-4 w-4" />}
            label={t("admin_kpi_high")}
            value={kpi.highRisk}
            tone="danger"
          />
          <Kpi
            icon={<TrendingUp className="h-4 w-4" />}
            label={t("admin_kpi_avg")}
            value={kpi.avgRisk}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin_roster")}</CardTitle>
            <div className="relative w-full max-w-xs">
              <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 start-3 text-[var(--c-muted)]" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("admin_search")}
                className="ps-9 py-2"
              />
            </div>
          </CardHeader>
          <CardBody>
            {loading && rows.length === 0 ? (
              <div className="py-10 text-center text-sm text-[var(--c-muted)]">
                {t("ui_loading")}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--c-border)] px-4 py-10 text-center text-sm text-[var(--c-muted)]">
                {t("admin_none")}
              </div>
            ) : (
              <ul className="divide-y divide-[var(--c-border)]">
                {filtered.map((r) => (
                  <PatientRow key={r.p.id} row={r} onDelete={() => remove(r.p)} />
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </AppBoot>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "safe" | "danger";
}) {
  const c = tone === "safe" ? "var(--color-safe)" : tone === "danger" ? "var(--color-crit)" : "var(--c-text)";
  return (
    <Card>
      <CardBody className="flex items-center gap-4 py-5">
        <span
          className="grid h-11 w-11 place-items-center rounded-2xl"
          style={{ background: `color-mix(in oklab, ${c} 15%, transparent)`, color: c }}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-[10.5px] font-medium uppercase tracking-widest text-[var(--c-muted)]">
            {label}
          </div>
          <div className="num mt-0.5 text-2xl font-semibold" style={{ color: c }}>
            {value}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function PatientRow({ row, onDelete }: { row: Row; onDelete: () => void }) {
  const t = useT();
  const { p, latest, count } = row;
  const risk = latest?.risk ?? 0;
  const level = riskLevel(risk);
  const color = RISK_COLORS[level];
  const lastSeen = latest ? timeAgo(latest.ts) : t("admin_never");
  const online = latest && Date.now() - latest.ts < 5 * 60 * 1000;

  const bandLabel = {
    low: t("rtr_low"),
    moderate: t("rtr_moderate"),
    high: t("rtr_high"),
    critical: t("rtr_critical"),
  }[level];

  return (
    <li className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-3 sm:grid-cols-[auto_1fr_auto_auto_auto_auto]">
      <Link
        href={`/dashboard?patient=${p.id}`}
        className="flex items-center gap-3 col-span-2 min-w-0 sm:col-span-1"
      >
        {p.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.avatar}
            alt=""
            className="h-11 w-11 rounded-xl object-cover"
          />
        ) : (
          <span
            className="grid h-11 w-11 place-items-center rounded-xl text-sm font-semibold text-white"
            style={{ background: "var(--grad-primary)" }}
          >
            {p.name
              .split(" ")
              .map((n) => n[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </span>
        )}
      </Link>

      <Link href={`/dashboard?patient=${p.id}`} className="min-w-0">
        <div className="truncate text-sm font-semibold group-hover:text-[var(--c-primary-2)] transition-colors">
          {p.name}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-[var(--c-muted)]">
          @{p.username}
          {p.age ? ` · ${p.age}` : ""} · {count.toLocaleString()} {t("admin_samples")}
        </div>
      </Link>

      <div className="hidden sm:block text-right">
        <div className="num text-sm font-semibold" style={{ color }}>
          {risk}
        </div>
        <div className="text-[10px] uppercase tracking-widest" style={{ color }}>
          {bandLabel}
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-2">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: online ? "var(--color-safe)" : "var(--c-muted)" }}
        />
        <span className="text-[11px] text-[var(--c-muted)]">{lastSeen}</span>
      </div>

      <Link href={`/dashboard?patient=${p.id}`}>
        <Button size="sm" variant="secondary" rightIcon={<ChevronRight className="h-3.5 w-3.5 rtl-mirror" />}>
          {t("admin_view")}
        </Button>
      </Link>

      <Button
        size="sm"
        variant="ghost"
        onClick={onDelete}
        leftIcon={<Trash2 className="h-3.5 w-3.5" />}
        className="text-[var(--c-muted)] hover:text-[var(--color-crit)]"
      >
        {t("ui_delete")}
      </Button>
    </li>
  );
}
