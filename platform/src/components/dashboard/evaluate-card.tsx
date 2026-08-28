"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { Activity, CheckCircle2, HelpCircle, Timer, XCircle } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEvaluateStore, VERIFY_THRESHOLD_PCT } from "@/lib/evaluate-store";
import { useToasts } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";

/**
 * Standalone "Evaluate" card — closed-loop verification of the last
 * caregiver intervention. Consumes the shared evaluate store; the
 * AiRecommendation card writes into it on Apply.
 */
export function EvaluateCard() {
  const status = useEvaluateStore((s) => s.status);
  const applied = useEvaluateStore((s) => s.applied);
  const remainingSec = useEvaluateStore((s) => s.remainingSec);
  const escalation = useEvaluateStore((s) => s.escalation);
  const history = useEvaluateStore((s) => s.history);
  const tick = useEvaluateStore((s) => s.tickAndMaybeEvaluate);
  const dismiss = useEvaluateStore((s) => s.dismiss);
  const acceptEscalation = useEvaluateStore((s) => s.acceptEscalation);
  const push = useToasts((s) => s.push);
  const t = useT();

  // Global 1-Hz tick so verification progresses even when the AI card is
  // scrolled off screen.
  useEffect(() => {
    if (status !== "waiting") return;
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [status, tick]);

  // Toast on final outcome, once per transition into a terminal state.
  useEffect(() => {
    if (status === "success") {
      push({ kind: "ok", title: t("verify_success_title"), body: t("verify_success_body") });
    } else if (status === "insufficient") {
      push({ kind: "warn", title: t("verify_fail_title"), body: t("verify_fail_body") });
    }
    // Intentionally omit push/t from deps — status is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const badgeTone: "brand" | "warn" | "danger" =
    status === "insufficient" ? "warn" : "brand";
  const badgeLabel =
    status === "waiting"
      ? t("evaluate_pill_running")
      : status === "success"
      ? t("evaluate_pill_success")
      : status === "insufficient"
      ? t("evaluate_pill_review")
      : t("evaluate_pill_idle");

  function formatEscalation(): string {
    if (!escalation) return "";
    if (escalation.kind === "bump_angle") {
      const side = escalation.side === "left" ? t("twin_side_left") : t("twin_side_right");
      return t("verify_escalate_bump")
        .replace("{from}", String(escalation.from))
        .replace("{to}", String(escalation.to))
        .replace("{side}", side);
    }
    if (escalation.kind === "switch_side") {
      const side = escalation.to === "left" ? t("twin_side_left") : t("twin_side_right");
      return t("verify_escalate_switch")
        .replace("{angle}", String(escalation.angle))
        .replace("{side}", side);
    }
    return t("verify_escalate_reassess");
  }

  const mmss = `${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, "0")}`;
  const successRate = history.length
    ? Math.round((history.filter((h) => h.success).length / history.length) * 100)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[var(--c-primary-2)]" />
          {t("evaluate_card_title")}
        </CardTitle>
        <Badge tone={badgeTone}>{badgeLabel}</Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        {status === "idle" && (
          <div className="rounded-2xl border border-dashed border-[var(--c-border)] bg-[var(--c-surface-2)] p-4 text-center">
            <p className="text-sm text-[var(--c-text-2)]">{t("evaluate_idle_hint")}</p>
            <p className="mt-1 text-[11px] text-[var(--c-muted)]">
              {t("evaluate_threshold_hint").replace(
                "{pct}",
                String(Math.round(VERIFY_THRESHOLD_PCT * 100))
              )}
            </p>
          </div>
        )}

        <AnimatePresence>
          {status !== "idle" && applied && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-2xl border p-4"
              style={{
                borderColor:
                  status === "success"
                    ? "color-mix(in oklab, var(--color-safe) 40%, transparent)"
                    : status === "insufficient"
                    ? "color-mix(in oklab, var(--color-elev) 40%, transparent)"
                    : "var(--c-border)",
                background:
                  status === "success"
                    ? "color-mix(in oklab, var(--color-safe) 10%, transparent)"
                    : status === "insufficient"
                    ? "color-mix(in oklab, var(--color-elev) 10%, transparent)"
                    : "var(--c-surface-2)",
              }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
                {t("evaluate_watching")}
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--c-text)]">
                {applied.title}
              </div>
              <div className="mt-1 text-[11px] text-[var(--c-muted)]">
                {t("evaluate_baseline")}: <span className="num">{Math.round(applied.peak)}</span> mmHg
              </div>

              {status === "waiting" && (
                <div className="mt-3 flex items-center gap-2 text-[12px]">
                  <Timer className="h-3.5 w-3.5 text-[var(--c-primary-2)]" />
                  <span className="text-[var(--c-text-2)]">
                    {t("verify_waiting").replace("{time}", mmss)}
                  </span>
                </div>
              )}

              {status === "success" && (
                <div className="mt-3 flex items-start gap-2 text-[12px]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--color-safe)]" />
                  <div>
                    <div className="font-medium" style={{ color: "var(--color-safe)" }}>
                      {t("verify_success_title")}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--c-text-2)]">
                      {t("verify_success_body")}
                    </div>
                    <button
                      type="button"
                      onClick={dismiss}
                      className="mt-2 text-[11px] text-[var(--c-muted)] hover:text-[var(--c-text)] underline underline-offset-2"
                    >
                      {t("evaluate_dismiss")}
                    </button>
                  </div>
                </div>
              )}

              {status === "insufficient" && (
                <div className="mt-3">
                  <div className="flex items-start gap-2 text-[12px]">
                    <HelpCircle className="mt-0.5 h-4 w-4 text-[var(--color-elev)]" />
                    <div>
                      <div className="font-medium" style={{ color: "var(--color-elev)" }}>
                        {t("verify_fail_title")}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[var(--c-text-2)]">
                        {t("verify_fail_body")}
                      </div>
                    </div>
                  </div>

                  {escalation && (
                    <div className="mt-3 rounded-xl border border-[var(--c-primary-2)]/30 bg-[color-mix(in_oklab,var(--c-primary-2)_8%,transparent)] p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
                        {t("evaluate_next_step")}
                      </div>
                      <div className="mt-1 text-[13px] font-semibold text-[var(--c-text)]">
                        {formatEscalation()}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={acceptEscalation}
                          leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                        >
                          {t("air_apply")}
                        </Button>
                        <button
                          type="button"
                          onClick={dismiss}
                          className="text-[11px] text-[var(--c-muted)] hover:text-[var(--c-text)] underline underline-offset-2"
                        >
                          {t("evaluate_dismiss")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {history.length > 0 && (
          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface-2)] p-3">
            <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
              <span>{t("evaluate_history")}</span>
              {successRate != null && (
                <span className="num text-[var(--c-text)]">
                  {t("evaluate_success_rate").replace("{pct}", String(successRate))}
                </span>
              )}
            </div>
            <ul className="space-y-1.5">
              {history
                .slice()
                .reverse()
                .slice(0, 5)
                .map((h, i) => (
                  <li
                    key={h.at + ":" + i}
                    className="flex items-start gap-2 text-[11.5px] text-[var(--c-text-2)]"
                  >
                    {h.success ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-safe)]" />
                    ) : (
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-elev)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{h.title}</div>
                      <div className="text-[10px] text-[var(--c-muted)]">
                        {new Date(h.at).toLocaleTimeString()} · Δ{" "}
                        <span className="num">
                          {(h.dropPct * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
