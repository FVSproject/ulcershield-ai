"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertOctagon, LifeBuoy, X } from "lucide-react";
import Link from "next/link";
import { useSosStore } from "@/lib/sos-store";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";

const SEVERITY_STYLE = {
  info: {
    color: "var(--c-primary-2)",
    bg: "color-mix(in oklab, var(--c-primary-2) 10%, transparent)",
    border: "color-mix(in oklab, var(--c-primary-2) 40%, transparent)",
  },
  warn: {
    color: "var(--color-elev)",
    bg: "color-mix(in oklab, var(--color-elev) 10%, transparent)",
    border: "color-mix(in oklab, var(--color-elev) 45%, transparent)",
  },
  danger: {
    color: "var(--color-crit)",
    bg: "color-mix(in oklab, var(--color-crit) 12%, transparent)",
    border: "color-mix(in oklab, var(--color-crit) 55%, transparent)",
  },
} as const;

/**
 * Full-screen SOS popup — shown when the sos-monitor raises a warn/danger
 * event. Blocks the UI until dismissed or resolved.
 */
export function SosPopup() {
  const ev = useSosStore((s) => s.currentPopup);
  const dismiss = useSosStore((s) => s.dismissPopup);
  const resolve = useSosStore((s) => s.resolve);
  const user = useSession((s) => s.user);

  if (!ev) return null;
  const style = SEVERITY_STYLE[ev.severity];

  return (
    <AnimatePresence>
      <motion.div
        key="sos-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
        onClick={dismiss}
      >
        <motion.div
          key="sos-card"
          initial={{ scale: 0.95, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.97, opacity: 0, y: 4 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md overflow-hidden rounded-3xl border bg-[var(--c-surface)] shadow-2xl"
          style={{ borderColor: style.border }}
          role="alertdialog"
          aria-labelledby="sos-title"
          aria-describedby="sos-body"
        >
          <div
            className="flex items-start gap-3 border-b p-5"
            style={{ borderColor: style.border, background: style.bg }}
          >
            <div
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
              style={{
                background: "var(--c-surface)",
                color: style.color,
                border: `1px solid ${style.border}`,
              }}
            >
              {ev.severity === "danger" ? (
                <AlertOctagon className="h-5 w-5" />
              ) : (
                <LifeBuoy className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: style.color }}>
                SOS · {ev.severity === "danger" ? "URGENT" : "System alert"}
              </div>
              <h2 id="sos-title" className="mt-0.5 text-[16px] font-semibold text-[var(--c-text)]">
                {ev.title}
              </h2>
              {ev.patientName && (
                <div className="mt-0.5 text-[11px] text-[var(--c-muted)]">
                  Patient · {ev.patientName}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--c-muted)] hover:bg-[var(--c-surface-2)] hover:text-[var(--c-text)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 p-5">
            <p id="sos-body" className="text-sm leading-relaxed text-[var(--c-text-2)]">
              {ev.body}
            </p>

            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-surface-2)] p-3 text-[11px] text-[var(--c-muted)]">
              This event has been logged to the admin SOS inbox. See{" "}
              <Link href="/help" className="underline text-[var(--c-primary-2)] hover:opacity-80">
                /help
              </Link>{" "}
              for step-by-step recovery guidance for common issues.
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {ev.id != null && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => resolve(ev.id!, user?.name ?? "unknown")}
                >
                  Mark as resolved
                </Button>
              )}
              <Button size="sm" variant="primary" onClick={dismiss}>
                Acknowledge
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
