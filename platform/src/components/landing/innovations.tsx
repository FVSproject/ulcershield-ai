"use client";

import { motion } from "framer-motion";
import { Layers, Timer, TrendingUp, User, GraduationCap } from "lucide-react";
import { useT, type DictKey } from "@/lib/i18n";

const CARDS: {
  icon: typeof Layers;
  accent: DictKey;
  title: DictKey;
  body: DictKey;
}[] = [
  { icon: Layers, accent: "inn_1_accent", title: "inn_1_t", body: "inn_1_b" },
  { icon: Timer, accent: "inn_2_accent", title: "inn_2_t", body: "inn_2_b" },
  { icon: TrendingUp, accent: "inn_3_accent", title: "inn_3_t", body: "inn_3_b" },
  { icon: User, accent: "inn_4_accent", title: "inn_4_t", body: "inn_4_b" },
  { icon: GraduationCap, accent: "inn_5_accent", title: "inn_5_t", body: "inn_5_b" },
];

export function Innovations() {
  const t = useT();
  return (
    <section id="innovations" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--c-primary-2)]">
            {t("inn_kicker")}
          </span>
          <h2 className="mt-3 font-semibold tracking-tight text-[clamp(2rem,4vw,3rem)] leading-tight">
            {t("inn_title_a")} <span className="text-gradient-brand">{t("inn_title_b")}</span>.
          </h2>
          <p className="mt-4 text-[var(--c-text-2)]">{t("inn_body")}</p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.article
                key={c.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="group relative overflow-hidden rounded-3xl border border-[var(--c-border)] bg-[var(--c-surface)] p-6 transition-all duration-500 hover:-translate-y-1 hover:border-[var(--c-primary-2)]/40 hover:shadow-[var(--shadow-lg)]"
              >
                <div className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <div
                    className="absolute inset-0"
                    style={{ background: "var(--grad-primary-soft)" }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--c-primary-2)_15%,transparent)] text-[var(--c-primary-2)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">
                    {t(c.accent)}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-tight text-[var(--c-text)]">
                  {t(c.title)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--c-text-2)]">{t(c.body)}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
