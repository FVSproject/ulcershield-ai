"use client";

import { useEffect } from "react";
import { AlertOctagon, CheckCircle2, LifeBuoy, RefreshCw } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSosStore } from "@/lib/sos-store";
import { useSession } from "@/lib/session";
import { timeAgo } from "@/lib/utils";

const SEVERITY_COLOR = {
  info: "var(--c-primary-2)",
  warn: "var(--color-elev)",
  danger: "var(--color-crit)",
} as const;

const KIND_LABEL: Record<string, string> = {
  ble_disconnect: "BLE disconnect",
  sensor_stale: "Sensor stale",
  ai_api_error: "Claude API error",
  critical_unhandled: "Critical unhandled",
  verify_repeated_fail: "Repeated turn failure",
  manual: "Manual SOS",
};

/**
 * Admin SOS inbox — persistent list of unresolved system-issue events
 * raised anywhere in the platform. Refreshes every 15 s.
 */
export function SosInbox() {
  const open = useSosStore((s) => s.open);
  const loading = useSosStore((s) => s.loading);
  const refresh = useSosStore((s) => s.refresh);
  const resolve = useSosStore((s) => s.resolve);
  const user = useSession((s) => s.user);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 15_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LifeBuoy className="h-4 w-4 text-[var(--color-crit)]" />
          SOS inbox
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge tone={open.length > 0 ? "danger" : "brand"}>
            {open.length} open
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={refresh}
            disabled={loading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        {open.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-[var(--c-border)] px-4 py-10 text-center">
            <CheckCircle2 className="h-8 w-8 text-[var(--color-safe)]" />
            <div className="mt-3 text-sm font-medium text-[var(--c-text)]">
              No open SOS events
            </div>
            <div className="mt-1 text-[11px] text-[var(--c-muted)]">
              System is nominal. New failures will appear here automatically.
            </div>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {open.map((ev) => {
              const color = SEVERITY_COLOR[ev.severity];
              return (
                <li
                  key={ev.id}
                  className="rounded-2xl border p-3.5"
                  style={{
                    borderColor: `color-mix(in oklab, ${color} 35%, transparent)`,
                    background: `color-mix(in oklab, ${color} 8%, transparent)`,
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <AlertOctagon
                        className="mt-0.5 h-4 w-4 shrink-0"
                        style={{ color }}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[var(--c-text)]">
                          {ev.title}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--c-muted)]">
                          <span style={{ color }}>{KIND_LABEL[ev.kind] ?? ev.kind}</span>
                          {ev.patientName ? ` · Patient: ${ev.patientName}` : " · System"}
                          {" · "}
                          {timeAgo(ev.ts)}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => ev.id != null && resolve(ev.id, user?.name ?? "unknown")}
                    >
                      Resolve
                    </Button>
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-[var(--c-text-2)]">
                    {ev.body}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
