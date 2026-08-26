"use client";

import { motion } from "framer-motion";
import { Radio, Brain, Sparkles, HandHeart, GraduationCap } from "lucide-react";
import { useT, type DictKey } from "@/lib/i18n";

const STEPS: { icon: typeof Radio; title: DictKey; body: DictKey }[] = [
  { icon: Radio, title: "how_1_t", body: "how_1_b" },
  { icon: Brain, title: "how_2_t", body: "how_2_b" },
  { icon: Sparkles, title: "how_3_t", body: "how_3_b" },
  { icon: HandHeart, title: "how_4_t", body: "how_4_b" },
  { icon: GraduationCap, title: "how_5_t", body: "how_5_b" },
];

export function How() {
  const t = useT();
  return (
    <section id="how" className="relative py-24 lg:py-32">
      <div
        aria-hidden
        className="absolute inset-x-0 top-1/2 -z-10 h-64 -translate-y-1/2 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at center, color-mix(in oklab, var(--c-primary-2) 15%, transparent), transparent 70%)",
        }}
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--c-primary-2)]">
            {t("how_kicker")}
          </span>
          <h2 className="mt-3 font-semibold tracking-tight text-[clamp(2rem,4vw,3rem)] leading-tight">
            {t("how_title_a")} <span className="text-gradient-brand">{t("how_title_b")}</span>.
          </h2>
          <p className="mt-4 text-[var(--c-text-2)]">{t("how_body")}</p>
        </div>

        <ol className="relative mt-16 grid gap-6 md:grid-cols-5">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-11 hidden md:block h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, color-mix(in oklab, var(--c-primary-2) 40%, transparent) 15%, color-mix(in oklab, var(--c-primary-2) 40%, transparent) 85%, transparent)",
            }}
          />
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.li
                key={s.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                <div className="mx-auto flex h-22 w-22 items-center justify-center">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--c-primary-2)]/30 bg-[var(--c-surface)] text-[var(--c-primary-2)] shadow-[0_10px_30px_-10px_rgba(6,182,212,.4)]">
                    <Icon className="h-6 w-6" />
                    <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--c-primary-2)] text-[10px] font-bold text-white shadow">
                      {i + 1}
                    </span>
                  </div>
                </div>
                <h3 className="mt-5 text-center text-base font-semibold tracking-tight">
                  {t(s.title)}
                </h3>
                <p className="mt-2 text-center text-sm leading-relaxed text-[var(--c-text-2)]">
                  {t(s.body)}
                </p>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
