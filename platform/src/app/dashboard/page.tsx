"use client";

import { AppBoot } from "@/components/app-boot";
import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";
import { PatientCard } from "@/components/dashboard/patient-card";
import { AiRecommendation } from "@/components/dashboard/ai-recommendation";
import { RemainingTime } from "@/components/dashboard/remaining-time";
import { RiskTrajectory } from "@/components/dashboard/risk-trajectory";
import { PressureZones } from "@/components/dashboard/pressure-zones";
import { Body3D } from "@/components/dashboard/body-3d";
import { RegionRisk } from "@/components/dashboard/region-risk";
import { Vitals } from "@/components/dashboard/vitals";
import { TurnRing } from "@/components/dashboard/turn-ring";
import { RiskCard } from "@/components/dashboard/risk-card";
import { Recommendations } from "@/components/dashboard/recommendations";
import { EventTimeline } from "@/components/dashboard/event-timeline";
import { Controls } from "@/components/dashboard/controls";
import { AiPanel } from "@/components/dashboard/ai-panel";
import { ConnectionBadge } from "@/components/dashboard/connection-badge";
import { useT } from "@/lib/i18n";

export default function DashboardPage() {
  const t = useT();
  return (
    <AppBoot>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("dash_title_a")}{" "}
              <span className="text-gradient-brand">{t("dash_title_b")}</span>{" "}
              {t("dash_title_c")}
            </h1>
            <p className="text-sm text-[var(--c-text-2)]">{t("dash_subtitle")}</p>
          </div>
          <ConnectionBadge />
        </div>

        <ImpersonationBanner />

        <div className="grid gap-5">
          <PatientCard />

          <div className="grid gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <AiRecommendation />
            </div>
            <RemainingTime />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <RiskTrajectory />
            <RegionRisk />
          </div>

          <Body3D />

          <div className="grid gap-5 xl:grid-cols-3">
            <div className="space-y-5 xl:col-span-2">
              <PressureZones />
              <RiskCard />
              <AiPanel />
            </div>
            <div className="space-y-5">
              <Vitals />
              <TurnRing />
              <Recommendations />
              <EventTimeline />
              <Controls />
            </div>
          </div>
        </div>
      </div>
    </AppBoot>
  );
}
