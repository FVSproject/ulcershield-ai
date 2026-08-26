"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bluetooth, Radio, Zap, ShieldAlert, RefreshCw, Unplug } from "lucide-react";
import { AppBoot } from "@/components/app-boot";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSensorStore } from "@/lib/store";
import { useToasts } from "@/components/ui/toast";
import { bleAvailable, connectBle, disconnectBle, US_SERVICE } from "@/lib/sources/ble-source";
import { startMockSource, stopMockSource } from "@/lib/sources/mock-source";
import { useT } from "@/lib/i18n";

export default function ConnectPage() {
  const push = useToasts((s) => s.push);
  const connection = useSensorStore((s) => s.connection);
  const source = useSensorStore((s) => s.source);
  const name = useSensorStore((s) => s.deviceName);
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setSupported(bleAvailable());
  }, []);

  async function pair() {
    setBusy(true);
    try {
      stopMockSource();
      const { name } = await connectBle();
      push({ kind: "ok", title: t("connect_pair_ok"), body: name });
    } catch (e) {
      push({ kind: "danger", title: t("connect_pair_fail"), body: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function unpair() {
    setBusy(true);
    try {
      await disconnectBle();
      push({ kind: "info", title: t("connect_disconnected_toast") });
    } finally {
      setBusy(false);
    }
  }

  function useSimulator() {
    startMockSource();
    push({ kind: "info", title: t("ct_sim_active"), body: t("connect_sim_toast") });
  }

  return (
    <AppBoot>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-semibold tracking-tight">{t("connect_title")}</h1>
          <p className="mt-2 text-[var(--c-text-2)]">{t("connect_subtitle")}</p>
        </motion.header>

        <div className="grid gap-6 md:grid-cols-2">
          <Card glow>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bluetooth className="h-5 w-5 text-[var(--c-primary-2)]" /> {t("connect_ble_title")}
              </CardTitle>
              <Badge tone={connection === "connected" && source === "ble" ? "live" : "neutral"} dot>
                {connection === "connected" && source === "ble"
                  ? t("connect_paired")
                  : t("connect_not_paired")}
              </Badge>
            </CardHeader>
            <CardBody>
              {supported === false && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[var(--color-elev)]/40 bg-[color-mix(in_oklab,var(--color-elev)_10%,transparent)] p-3 text-xs text-[var(--c-text-2)]">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-[var(--color-elev)]" />
                  <span>{t("connect_no_web_bluetooth")}</span>
                </div>
              )}
              <ul className="space-y-2.5 text-sm text-[var(--c-text-2)]">
                <Line label={t("connect_filter")} value="UlcerShield*" />
                <Line label={t("connect_service_uuid")} value={US_SERVICE} mono />
                <Line label={t("connect_state_char")} value="0000fd01-…-abcd123 (notify)" mono />
                <Line label={t("connect_cmd_char")} value="0000fd02-…-abcd123 (write)" mono />
                <Line label={t("connect_event_char")} value="0000fd03-…-abcd123 (notify)" mono />
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  onClick={pair}
                  disabled={busy || !supported}
                  leftIcon={<Zap className="h-4 w-4" />}
                >
                  {connection === "connected" && source === "ble"
                    ? t("connect_repair")
                    : t("connect_pair")}
                </Button>
                {connection === "connected" && source === "ble" && (
                  <Button
                    variant="secondary"
                    onClick={unpair}
                    disabled={busy}
                    leftIcon={<Unplug className="h-4 w-4" />}
                  >
                    {t("connect_disconnect")}
                  </Button>
                )}
              </div>
              {name && source === "ble" && (
                <div className="mt-4 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface-2)] px-4 py-3 text-sm">
                  {t("connect_paired_with")}{" "}
                  <b className="text-[var(--c-primary-2)]">{name}</b>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-[var(--c-primary-2)]" /> {t("connect_sim_title")}
              </CardTitle>
              <Badge tone={source === "mock" ? "brand" : "neutral"} dot>
                {source === "mock" ? t("connect_sim_active") : t("connect_sim_idle")}
              </Badge>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-[var(--c-text-2)]">{t("connect_sim_body")}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  variant={source === "mock" ? "secondary" : "primary"}
                  onClick={useSimulator}
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                >
                  {source === "mock" ? t("connect_sim_restart") : t("connect_sim_start")}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("connect_firmware_note")}</CardTitle>
            <Badge tone="neutral">firmware</Badge>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-[var(--c-text-2)]">
              {t("connect_firmware_body")}{" "}
              <code className="rounded bg-[var(--c-surface-2)] px-1.5 py-0.5 text-xs">
                firmware/BedsorePredictorBLE.ino
              </code>
            </p>
          </CardBody>
        </Card>
      </div>
    </AppBoot>
  );
}

function Line({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <li className="grid grid-cols-[140px_1fr] gap-3 border-b border-dashed border-[var(--c-border)] pb-2 last:border-none last:pb-0">
      <span className="text-[var(--c-muted)]">{label}</span>
      <span className={mono ? "num text-xs" : ""}>{value}</span>
    </li>
  );
}
