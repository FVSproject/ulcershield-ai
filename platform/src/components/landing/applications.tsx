"use client";

import { motion } from "framer-motion";
import { Hospital, Building2, Heart, Home } from "lucide-react";
import { useT, type DictKey } from "@/lib/i18n";

const APPS: { icon: typeof Hospital; label: DictKey; body: DictKey }[] = [
  { icon: Hospital, label: "apps_1_l", body: "apps_1_b" },
  { icon: Building2, label: "apps_2_l", body: "apps_2_b" },
  { icon: Heart, label: "apps_3_l", body: "apps_3_b" },
  { icon: Home, label: "apps_4_l", body: "apps_4_b" },
];

export function Applications() {
  const t = useT();
  return (
    <section id="applications" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--c-primary-2)]">
            {t("apps_kicker")}
          </span>
          <h2 className="mt-3 font-semibold tracking-tight text-[clamp(2rem,4vw,3rem)] leading-tight">
            {t("apps_title")}
          </h2>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {APPS.map((a, i) => {
            const Icon = a.icon;
            return (
              <motion.div
                key={a.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="rounded-3xl border border-[var(--c-border)] bg-[var(--c-surface)] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--c-primary-2)]/30 hover:shadow-[var(--shadow)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--c-primary-2)_15%,transparent)] text-[var(--c-primary-2)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-tight">{t(a.label)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--c-text-2)]">{t(a.body)}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
