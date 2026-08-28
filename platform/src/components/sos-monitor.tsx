"use client";

import { useEffect, useRef } from "react";
import { useSensorStore } from "@/lib/store";
import { useEvaluateStore } from "@/lib/evaluate-store";
import { useViewing } from "@/lib/viewing";
import { raiseSos, useSosStore } from "@/lib/sos-store";
import { computeTwin } from "@/lib/tissue-twin";

/**
 * Passive detector — mounts once at the app root and watches for common
 * failure modes across the sensor pipeline. When it spots trouble, it
 * calls raiseSos() which persists + fires the popup for the current user.
 *
 * Detections (each with a debounce inside raiseSos so we don't spam):
 *  - BLE disconnect: connection was "connected", now is "idle" or "error".
 *  - Sensor stale: state exists but lastMsgAt > 60s ago.
 *  - Critical band unhandled: primary.band === "critical" for > 3 min with
 *    no Apply in that window.
 *  - Verify repeated fail: two consecutive "insufficient" outcomes.
 */
const STALE_MS = 60_000;
const CRITICAL_UNHANDLED_MS = 3 * 60_000;

export function SosMonitor() {
  const connection = useSensorStore((s) => s.connection);
  const source = useSensorStore((s) => s.source);
  const state = useSensorStore((s) => s.state);
  const lastMsgAt = useSensorStore((s) => s.lastMsgAt);
  const patient = useViewing((s) => s.viewing);
  const evalHistory = useEvaluateStore((s) => s.history);
  const refreshSos = useSosStore((s) => s.refresh);

  const wasConnectedRef = useRef(false);
  const criticalSinceRef = useRef<number | null>(null);
  const lastVerifyIdxRef = useRef(0);

  // Prime the open-SOS list once at mount so admin views show existing rows.
  useEffect(() => {
    refreshSos();
  }, [refreshSos]);

  // BLE disconnect edge detector
  useEffect(() => {
    if (source !== "ble") {
      wasConnectedRef.current = false;
      return;
    }
    if (connection === "connected") {
      wasConnectedRef.current = true;
      return;
    }
    if (wasConnectedRef.current && (connection === "idle" || connection === "disconnected")) {
      wasConnectedRef.current = false;
      void raiseSos({
        kind: "ble_disconnect",
        severity: "warn",
        title: "BLE sensor disconnected",
        body:
          "The bedside device dropped the Bluetooth link. Re-pair from /connect. Sensor readings will resume automatically once the link is restored.",
        patientId: patient?.id,
        patientName: patient?.name,
      });
    }
  }, [connection, source, patient?.id, patient?.name]);

  // Stale-sensor watchdog (once per minute)
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = useSensorStore.getState();
      if (!s.state || !s.lastMsgAt) return;
      const age = Date.now() - s.lastMsgAt;
      if (age > STALE_MS) {
        void raiseSos({
          kind: "sensor_stale",
          severity: "warn",
          title: "No sensor data for over a minute",
          body:
            "The last reading is more than 60 seconds old. Check the bedside device power, cable, and Bluetooth link.",
          patientId: patient?.id,
          patientName: patient?.name,
        });
      }
    }, 30_000);
    return () => window.clearInterval(id);
  }, [patient?.id, patient?.name]);

  // Critical-band unhandled watchdog
  useEffect(() => {
    if (!state) return;
    const twin = computeTwin(state, patient);
    const isCritical = twin?.primary.band === "critical";
    if (!isCritical) {
      criticalSinceRef.current = null;
      return;
    }
    if (criticalSinceRef.current == null) {
      criticalSinceRef.current = Date.now();
      return;
    }
    const dwellMs = Date.now() - criticalSinceRef.current;
    if (dwellMs > CRITICAL_UNHANDLED_MS) {
      void raiseSos({
        kind: "critical_unhandled",
        severity: "danger",
        title: "Critical risk — no intervention recorded",
        body: `The primary region has been in the critical band for more than ${Math.round(
          CRITICAL_UNHANDLED_MS / 60_000
        )} min without an Apply. Escalate to bedside staff.`,
        patientId: patient?.id,
        patientName: patient?.name,
      });
      // Reset the timer so we don't re-raise every render.
      criticalSinceRef.current = Date.now();
    }
  }, [state, patient, lastMsgAt]);

  // Repeated verify failure detector — two consecutive "insufficient".
  useEffect(() => {
    if (evalHistory.length < 2) return;
    if (evalHistory.length === lastVerifyIdxRef.current) return;
    lastVerifyIdxRef.current = evalHistory.length;
    const last = evalHistory[evalHistory.length - 1];
    const prev = evalHistory[evalHistory.length - 2];
    if (!last.success && !prev.success) {
      void raiseSos({
        kind: "verify_repeated_fail",
        severity: "danger",
        title: "Two consecutive turns failed to relieve pressure",
        body:
          "Suggest a full physical reassessment: check bed surface, redistribute pillows, inspect the primary region for existing tissue damage, and consider escalating to the wound-care team.",
        patientId: patient?.id,
        patientName: patient?.name,
      });
    }
  }, [evalHistory, patient?.id, patient?.name]);

  return null;
}
