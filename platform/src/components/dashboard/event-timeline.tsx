"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { useSensorStore } from "@/lib/store";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import type { SensorEvent } from "@/types/sensor";

const KIND_COLOR: Record<SensorEvent["kind"], string> = {
  turn: "var(--c-primary-2)",
  calibration: "var(--c-primary-2)",
  reset: "var(--c-muted)",
  alert: "var(--color-crit)",
  connect: "var(--color-safe)",
  disconnect: "var(--color-crit)",
  active_user: "var(--c-primary-2)",
};

export function EventTimeline() {
  const events = useSensorStore((s) => s.events);
  const clear = useSensorStore((s) => s.clearEvents);
  const t = useT();

  const labelFor = (e: SensorEvent) => {
    switch (e.kind) {
      case "turn":
        return `${t("tl_turn")} · ${e.text}`;
      case "calibration":
        return `${t("tl_calibration")} · ${e.text}`;
      case "reset":
        return t("tl_reset");
      case "connect":
        return `${t("tl_connect")} · ${e.text}`;
      case "disconnect":
        return t("tl_disconnect");
      case "active_user":
        return `${t("tl_active_user")} · ${e.text}`;
      default:
        return e.text;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tl_title")}</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={clear}
          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
        >
          {t("ui_clear")}
        </Button>
      </CardHeader>
      <CardBody>
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--c-border)] px-4 py-8 text-center text-sm text-[var(--c-muted)]">
            {t("tl_empty")}
          </div>
        ) : (
          <ol className="relative max-h-96 overflow-auto pr-1">
            <AnimatePresence initial={false}>
              {events.map((e, i) => (
                <motion.li
                  key={e.ts + "-" + i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.28 }}
                  className="relative grid grid-cols-[16px_1fr_auto] items-center gap-3 border-l border-[var(--c-border)] pl-4 pb-4 last:pb-0"
                >
                  <span
                    className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full ring-4 ring-[var(--c-surface)]"
                    style={{ background: KIND_COLOR[e.kind] }}
                  />
                  <div />
                  <div>
                    <div className="text-sm font-medium">{labelFor(e)}</div>
                    <div className="text-[11px] text-[var(--c-muted)]">
                      {new Date(e.ts).toLocaleTimeString()} · {t("tl_uptime")} {e.uptimeS}s
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        )}
      </CardBody>
    </Card>
  );
}
