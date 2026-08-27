"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Brain, CheckCircle2, HelpCircle, Timer } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSensorStore } from "@/lib/store";
import { computeTwin } from "@/lib/tissue-twin";
import { useToasts } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { useTwinI18n } from "@/lib/twin-i18n";
import { useViewing } from "@/lib/viewing";

const TONE = {
  info: { text: "var(--c-primary-2)", bg: "rgba(6,182,212,.10)" },
  warn: { text: "var(--color-elev)", bg: "rgba(245,158,11,.10)" },
  danger: { text: "var(--color-crit)", bg: "rgba(239,68,68,.10)" },
} as const;

// After Apply, wait this long then compare pressure drop.
const VERIFY_AFTER_MS = 5 * 60 * 1000;
// Consider the reposition successful if peak pressure dropped by this much.
const VERIFY_THRESHOLD_PCT = 0.3;

export function AiRecommendation() {
  const state = useSensorStore((s) => s.state);
  const patient = useViewing((s) => s.viewing);
  const twin = computeTwin(state, patient);
  const push = useToasts((s) => s.push);
  const t = useT();
  const { formatRecommendation, formatContributor, angleRationale } = useTwinI18n();
  const [applied, setApplied] = useState(false);
  const [showAngleWhy, setShowAngleWhy] = useState(false);
  // Verification state: remembers the pre-intervention peak so we can compare.
  const preRef = useRef<{ peak: number; at: number } | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<
    "idle" | "waiting" | "success" | "insufficient"
  >("idle");
  const [remainingSec, setRemainingSec] = useState(0);

  const rec = twin?.recommendation;
  const tone = TONE[rec?.tone ?? "info"];
  const badge =
    rec?.tone === "danger" ? t("air_urgent") : rec?.tone === "warn" ? t("air_act_soon") : t("air_advisory");
  const formatted = rec ? formatRecommendation(rec) : null;
  const angle = rec?.angleDegrees ?? 30;

  // Tick down the verification countdown + evaluate when it ends.
  useEffect(() => {
    if (verifyStatus !== "waiting" || !preRef.current) return;
    const id = window.setInterval(() => {
      const started = preRef.current!.at;
      const elapsed = Date.now() - started;
      const left = Math.max(0, Math.ceil((VERIFY_AFTER_MS - elapsed) / 1000));
      setRemainingSec(left);
      if (elapsed >= VERIFY_AFTER_MS) {
        window.clearInterval(id);
        const curr = useSensorStore.getState().state;
        const currPeak = curr ? Math.max(curr.left.mmhg, curr.right.mmhg) : 0;
        const dropPct = (preRef.current!.peak - currPeak) / (preRef.current!.peak || 1);
        if (dropPct >= VERIFY_THRESHOLD_PCT) {
          setVerifyStatus("success");
          push({ kind: "ok", title: t("verify_success_title"), body: t("verify_success_body") });
        } else {
          setVerifyStatus("insufficient");
          push({ kind: "warn", title: t("verify_fail_title"), body: t("verify_fail_body") });
        }
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [verifyStatus, push, t]);

  function apply() {
    if (!formatted || !state) return;
    setApplied(true);
    const peak = Math.max(state.left.mmhg, state.right.mmhg);
    preRef.current = { peak, at: Date.now() };
    setRemainingSec(Math.ceil(VERIFY_AFTER_MS / 1000));
    setVerifyStatus("waiting");
    push({
      kind: "ok",
      title: t("air_applied_toast"),
      body: formatted.title,
    });
    setTimeout(() => setApplied(false), 6000);
  }

  return (
    <Card glow>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span
            className="inline-flex h-6 items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-widest text-white"
            style={{ background: "var(--grad-primary)" }}
          >
            <Brain className="mr-1 h-3 w-3" /> AI
          </span>
          {t("air_title")}
        </CardTitle>
        <Badge tone={rec?.tone === "danger" ? "danger" : rec?.tone === "warn" ? "warn" : "brand"}>
          {badge}
        </Badge>
      </CardHeader>
      <CardBody>
        <motion.div
          key={formatted?.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border p-4"
          style={{
            borderColor: `color-mix(in oklab, ${tone.text} 30%, transparent)`,
            background: tone.bg,
          }}
        >
          <div className="text-sm font-semibold" style={{ color: tone.text }}>
            {formatted?.title ?? t("air_awaiting")}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--c-text-2)]">
            {formatted?.detail}
          </p>

          {/* Angle rationale — only for lateral repositioning recommendations. */}
          {rec?.kind === "reposition_side_now" && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowAngleWhy((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--c-text-2)] hover:text-[var(--c-primary-2)] transition-colors"
              >
                <HelpCircle className="h-3 w-3" />
                {t("twin_angle_why").replace("{angle}", String(angle))}
              </button>
              <AnimatePresence>
                {showAngleWhy && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-2 rounded-xl border border-[var(--c-primary-2)]/25 bg-[color-mix(in_oklab,var(--c-primary-2)_8%,transparent)] p-2.5 text-[12px] leading-relaxed text-[var(--c-text-2)]"
                  >
                    {angleRationale(angle)}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}

          {twin?.contributors?.length ? (
            <div className="mt-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
                {t("air_why")}
              </div>
              <ul className="mt-1 space-y-1 text-xs text-[var(--c-text-2)]">
                {twin.contributors.slice(0, 4).map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span
                      className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
                      style={{ background: tone.text }}
                    />
                    {formatContributor(c)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={applied ? "secondary" : "primary"}
              onClick={apply}
              disabled={applied || verifyStatus === "waiting"}
              leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
            >
              {applied ? t("air_applied") : t("air_apply")}
            </Button>
            <span className="text-[11px] text-[var(--c-muted)]">
              {t("air_remaining")}: <b>{twin?.remainingSafeMin ?? 0} {t("rt_min")}</b>
            </span>
          </div>

          {/* Verification bar */}
          <AnimatePresence>
            {verifyStatus !== "idle" && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px]"
                style={{
                  borderColor:
                    verifyStatus === "success"
                      ? "color-mix(in oklab, var(--color-safe) 40%, transparent)"
                      : verifyStatus === "insufficient"
                      ? "color-mix(in oklab, var(--color-elev) 40%, transparent)"
                      : "var(--c-border)",
                  background:
                    verifyStatus === "success"
                      ? "color-mix(in oklab, var(--color-safe) 10%, transparent)"
                      : verifyStatus === "insufficient"
                      ? "color-mix(in oklab, var(--color-elev) 10%, transparent)"
                      : "var(--c-surface-2)",
                }}
              >
                {verifyStatus === "waiting" && (
                  <>
                    <Timer className="h-3.5 w-3.5 text-[var(--c-primary-2)]" />
                    <span className="text-[var(--c-text-2)]">
                      {t("verify_waiting").replace(
                        "{time}",
                        `${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, "0")}`
                      )}
                    </span>
                  </>
                )}
                {verifyStatus === "success" && (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-safe)]" />
                    <span className="font-medium" style={{ color: "var(--color-safe)" }}>
                      {t("verify_success_title")}
                    </span>
                  </>
                )}
                {verifyStatus === "insufficient" && (
                  <>
                    <HelpCircle className="h-3.5 w-3.5 text-[var(--color-elev)]" />
                    <div>
                      <div className="font-medium" style={{ color: "var(--color-elev)" }}>
                        {t("verify_fail_title")}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[var(--c-text-2)]">
                        {t("verify_fail_body")}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </CardBody>
    </Card>
  );
}
