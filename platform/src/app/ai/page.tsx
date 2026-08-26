"use client";

import { motion } from "framer-motion";
import { AppBoot } from "@/components/app-boot";
import { AiPanel } from "@/components/dashboard/ai-panel";
import { RiskCard } from "@/components/dashboard/risk-card";
import { Recommendations } from "@/components/dashboard/recommendations";
import { PatientCard } from "@/components/dashboard/patient-card";
import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";
import { useT } from "@/lib/i18n";

export default function AiPage() {
  const t = useT();
  return (
    <AppBoot>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("aip_page_title_a")}{" "}
            <span className="text-gradient-brand">{t("aip_page_title_b")}</span>
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--c-text-2)]">{t("aip_page_subtitle")}</p>
        </motion.header>

        <ImpersonationBanner />

        <div className="grid gap-5">
          <PatientCard />
          <RiskCard />
          <AiPanel />
          <Recommendations />
        </div>
      </div>
    </AppBoot>
  );
}
