"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { hydrateSession, useSession } from "@/lib/session";
import { useSensorStore } from "@/lib/store";
import { appendLog, getPatient, isAdmin } from "@/lib/db";
import { startMockSource } from "@/lib/sources/mock-source";
import { ToastHost } from "@/components/ui/toast";
import { useViewing } from "@/lib/viewing";
import { SosMonitor } from "@/components/sos-monitor";
import { SosPopup } from "@/components/sos-popup";

/**
 * Wraps every authed page. See ViewingResolver for the URL-driven bits.
 */
export function AppBoot({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useSession((s) => s.user);

  useEffect(() => {
    hydrateSession();
  }, []);

  // Session gate + role guards. No searchParams here — safe to run at any tier.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const u = useSession.getState().user;
      if (!u) {
        router.replace("/login");
        return;
      }
      if (!isAdmin(u) && (pathname.startsWith("/admin") || pathname.startsWith("/patients"))) {
        router.replace("/dashboard");
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [router, user, pathname]);

  // Auto-start the mock source when nothing else is running.
  useEffect(() => {
    const { source, connection } = useSensorStore.getState();
    if (connection === "idle" || (source === "mock" && connection !== "connected")) {
      startMockSource();
    }
  }, []);

  return (
    <>
      <ToastHost />
      <SosMonitor />
      <SosPopup />
      <Suspense fallback={null}>
        <ViewingResolver />
      </Suspense>
      {children}
    </>
  );
}

/**
 * Resolves "who am I viewing?" from the URL for admins, or self for patients,
 * and persists log rows against the correct patient every 5 s.
 *
 * Split out because `useSearchParams()` forces client-only rendering; wrapping
 * it in <Suspense> lets Next.js prerender the rest of the page.
 */
function ViewingResolver() {
  const searchParams = useSearchParams();
  const user = useSession((s) => s.user);
  const viewing = useViewing((s) => s.viewing);
  const setViewing = useViewing((s) => s.setViewing);
  const lastViewingId = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const wantId = searchParams.get("patient");
    if (!isAdmin(user)) {
      if (wantId && wantId !== user.id) {
        const url = new URL(window.location.href);
        url.searchParams.delete("patient");
        window.history.replaceState({}, "", url.toString());
      }
      setViewing(user);
      return;
    }
    if (!wantId) {
      setViewing(null);
      return;
    }
    getPatient(wantId).then((p) => setViewing(p ?? null));
  }, [user, searchParams, setViewing]);

  useEffect(() => {
    const currentId = viewing?.id ?? null;
    if (lastViewingId.current !== null && lastViewingId.current !== currentId) {
      useSensorStore.setState({ state: null, history: [], events: [] });
      startMockSource();
    }
    lastViewingId.current = currentId;
  }, [viewing]);

  useEffect(() => {
    if (!viewing) return;
    const patientId = viewing.id;
    const id = window.setInterval(() => {
      const active = useViewing.getState().viewing;
      if (!active || active.id !== patientId) return;
      const s = useSensorStore.getState().state;
      if (!s) return;
      appendLog({
        patientId,
        ts: s.ts,
        uptimeS: s.uptimeS,
        leftMmhg: s.left.mmhg,
        rightMmhg: s.right.mmhg,
        cop: s.cop,
        turns: s.turns,
        bodyC: s.bodyC,
        humidity: s.humidity,
        risk: s.risk,
        occupied: s.occupied ? 1 : 0,
      }).catch(() => {});
    }, 5000);
    return () => window.clearInterval(id);
  }, [viewing]);

  return null;
}
