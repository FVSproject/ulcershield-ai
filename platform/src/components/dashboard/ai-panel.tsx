"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSensorStore } from "@/lib/store";
import { useViewing } from "@/lib/viewing";
import { useTheme } from "@/components/theme-provider";
import { useToasts } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { raiseSos } from "@/lib/sos-store";

interface AiResult {
  summary: string;
  reasoning: string[];
  actions: { title: string; body: string; tone: "info" | "warn" | "danger" }[];
  escalate: boolean;
}

export function AiPanel() {
  const state = useSensorStore((s) => s.state);
  const user = useViewing((s) => s.viewing);
  const { lang } = useTheme();
  const push = useToasts((s) => s.push);
  const t = useT();
  const [result, setResult] = useState<AiResult | null>(null);
  const [pending, startTransition] = useTransition();

  async function requestAnalysis() {
    if (!state) {
      push({ kind: "warn", title: t("aip_no_data"), body: t("aip_wait_reading") });
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/ai/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lang, state, patient: user }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const msg = err?.error || `HTTP ${res.status}`;
          push({
            kind: "danger",
            title: t("aip_fail"),
            body: msg,
          });
          void raiseSos({
            kind: "ai_api_error",
            severity: res.status === 401 || res.status === 501 ? "danger" : "warn",
            title: "Claude API request failed",
            body: `${msg}. See /help for the fix specific to this HTTP status.`,
            patientId: user?.id,
            patientName: user?.name,
          });
          return;
        }
        const json = (await res.json()) as AiResult;
        setResult(json);
      } catch (e) {
        const msg = (e as Error).message;
        push({ kind: "danger", title: t("aip_fail"), body: msg });
        void raiseSos({
          kind: "ai_api_error",
          severity: "warn",
          title: "Claude API request failed",
          body: `Network or client error: ${msg}. Check your connection and try again from the AI Insights panel.`,
          patientId: user?.id,
          patientName: user?.name,
        });
      }
    });
  }

  const TONE_RING = {
    info: "border-[var(--c-primary-2)]/30",
    warn: "border-[var(--color-elev)]/40",
    danger: "border-[var(--color-crit)]/40",
  };
  const TONE_IC = {
    info: "bg-[color-mix(in_oklab,var(--c-primary-2)_15%,transparent)] text-[var(--c-primary-2)]",
    warn: "bg-[color-mix(in_oklab,var(--color-elev)_15%,transparent)] text-[var(--color-elev)]",
    danger: "bg-[color-mix(in_oklab,var(--color-crit)_15%,transparent)] text-[var(--color-crit)]",
  };

  return (
    <Card glow>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span
            className="inline-flex h-6 items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-widest text-white"
            style={{ background: "var(--grad-primary)" }}
          >
            <Sparkles className="mr-1 h-3 w-3" /> Claude
          </span>
          {t("aip_title")}
        </CardTitle>
        <Button
          size="sm"
          variant={result ? "secondary" : "primary"}
          onClick={requestAnalysis}
          disabled={pending}
          leftIcon={
            pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : result ? (
              <RefreshCw className="h-3.5 w-3.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )
          }
        >
          {pending ? t("aip_analyzing") : result ? t("aip_reanalyze") : t("aip_ask")}
        </Button>
      </CardHeader>
      <CardBody>
        {!result && !pending && (
          <div className="rounded-2xl border border-dashed border-[var(--c-border)] px-4 py-8 text-center text-sm text-[var(--c-muted)]">
            <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--c-primary-2)_15%,transparent)] text-[var(--c-primary-2)]">
              <Sparkles className="h-4 w-4" />
            </div>
            {t("aip_empty")}
          </div>
        )}
        <AnimatePresence>
          {pending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-5/6" />
              <div className="skeleton h-3 w-2/3" />
            </motion.div>
          )}
        </AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {result.escalate && (
              <Badge tone="danger" className="mb-3">
                {t("aip_escalation")}
              </Badge>
            )}
            <p className="text-sm leading-relaxed text-[var(--c-text)]">{result.summary}</p>
            {result.reasoning.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-[var(--c-text-2)]">
                {result.reasoning.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--c-primary-2)]" />
                    {r}
                  </li>
                ))}
              </ul>
            )}
            {result.actions.length > 0 && (
              <div className="mt-4 grid gap-2">
                {result.actions.map((a, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-[36px_1fr] items-start gap-3 rounded-2xl border bg-[var(--c-surface-2)] p-3 ${TONE_RING[a.tone]}`}
                  >
                    <div className={`grid h-9 w-9 place-items-center rounded-xl text-sm ${TONE_IC[a.tone]}`}>
                      →
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{a.title}</div>
                      <div className="mt-0.5 text-xs leading-relaxed text-[var(--c-text-2)]">
                        {a.body}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </CardBody>
    </Card>
  );
}
