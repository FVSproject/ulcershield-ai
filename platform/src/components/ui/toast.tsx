"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, AlertTriangle, XCircle } from "lucide-react";
import { create } from "zustand";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

type ToastKind = "info" | "ok" | "warn" | "danger";
interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
  ttl: number;
}

interface ToastStore {
  items: ToastItem[];
  push: (t: Omit<ToastItem, "id" | "ttl"> & { ttl?: number }) => void;
  dismiss: (id: number) => void;
}

let seq = 1;
export const useToasts = create<ToastStore>((set) => ({
  items: [],
  push: (t) =>
    set((s) => ({
      items: [
        ...s.items,
        { id: seq++, ttl: t.ttl ?? 4500, kind: t.kind, title: t.title, body: t.body },
      ],
    })),
  dismiss: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

const ICON = {
  info: Info,
  ok: CheckCircle2,
  warn: AlertTriangle,
  danger: XCircle,
} as const;

const TONE = {
  info: "border-[var(--c-primary-2)]/40 text-[var(--c-text)]",
  ok: "border-[var(--color-safe)]/40 text-[var(--c-text)]",
  warn: "border-[var(--color-elev)]/40 text-[var(--c-text)]",
  danger: "border-[var(--color-crit)]/40 text-[var(--c-text)]",
} as const;

const ICON_TONE = {
  info: "text-[var(--c-primary-2)]",
  ok: "text-[var(--color-safe)]",
  warn: "text-[var(--color-elev)]",
  danger: "text-[var(--color-crit)]",
} as const;

export function ToastHost() {
  const { items, dismiss } = useToasts();
  useEffect(() => {
    const timers = items.map((i) => window.setTimeout(() => dismiss(i.id), i.ttl));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [items, dismiss]);

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-50 flex w-full max-w-sm flex-col gap-2 sm:right-6">
      <AnimatePresence>
        {items.map((t) => {
          const Icon = ICON[t.kind];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "pointer-events-auto flex gap-3 rounded-2xl border bg-[var(--c-surface)] p-3.5 shadow-[var(--shadow)] backdrop-blur-xl",
                TONE[t.kind]
              )}
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", ICON_TONE[t.kind])} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold leading-tight">{t.title}</div>
                {t.body && (
                  <div className="mt-0.5 text-xs leading-relaxed text-[var(--c-text-2)]">{t.body}</div>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-[var(--c-muted)] hover:text-[var(--c-text)]"
                aria-label="Dismiss"
              >
                ×
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
