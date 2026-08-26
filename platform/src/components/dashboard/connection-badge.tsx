"use client";

import { Bluetooth, Radio, WifiOff, PlugZap } from "lucide-react";
import { useSensorStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import Link from "next/link";

export function ConnectionBadge() {
  const source = useSensorStore((s) => s.source);
  const connection = useSensorStore((s) => s.connection);
  const name = useSensorStore((s) => s.deviceName);
  const t = useT();

  const cfg = (() => {
    if (connection === "connected" && source === "ble") {
      return {
        color: "var(--color-safe)",
        icon: <Bluetooth className="h-3.5 w-3.5" />,
        label: name ?? t("conn_ble_device"),
        sub: t("conn_ble_linked"),
      };
    }
    if (connection === "connected" && source === "mock") {
      return {
        color: "var(--c-primary-2)",
        icon: <Radio className="h-3.5 w-3.5" />,
        label: t("conn_sim"),
        sub: t("conn_sim_sub"),
      };
    }
    if (connection === "connecting") {
      return {
        color: "var(--color-elev)",
        icon: <PlugZap className="h-3.5 w-3.5" />,
        label: t("conn_connecting"),
        sub: "",
      };
    }
    return {
      color: "var(--color-crit)",
      icon: <WifiOff className="h-3.5 w-3.5" />,
      label: t("conn_disconnected"),
      sub: t("conn_no_stream"),
    };
  })();

  return (
    <Link
      href="/connect"
      className="inline-flex items-center gap-2.5 rounded-full glass px-3.5 py-2 text-xs font-medium transition-transform duration-300 hover:-translate-y-0.5"
    >
      <span
        className="grid h-6 w-6 place-items-center rounded-full"
        style={{
          background: `color-mix(in oklab, ${cfg.color} 20%, transparent)`,
          color: cfg.color,
        }}
      >
        {cfg.icon}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[var(--c-text)]">{cfg.label}</span>
        {cfg.sub && (
          <span className="text-[10px] uppercase tracking-widest text-[var(--c-muted)]">
            {cfg.sub}
          </span>
        )}
      </span>
    </Link>
  );
}
