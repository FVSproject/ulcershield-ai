"use client";

import { motion } from "framer-motion";
import { Eye, Clock, HandHeart, ArrowRight } from "lucide-react";
import { useT, type DictKey } from "@/lib/i18n";

const PILLARS: {
  icon: typeof Eye;
  kicker: DictKey;
  title: DictKey;
  body: DictKey;
}[] = [
  { icon: Eye, kicker: "vision_1_kicker", title: "vision_1_title", body: "vision_1_body" },
  { icon: Clock, kicker: "vision_2_kicker", title: "vision_2_title", body: "vision_2_body" },
  { icon: HandHeart, kicker: "vision_3_kicker", title: "vision_3_title", body: "vision_3_body" },
];

const TRANSITIONS: { a: DictKey; b: DictKey }[] = [
  { a: "vision_t_1a", b: "vision_t_1b" },
  { a: "vision_t_2a", b: "vision_t_2b" },
  { a: "vision_t_3a", b: "vision_t_3b" },
];

export function Vision() {
  const t = useT();
  return (
    <section id="vision" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--c-primary-2)]">
            {t("vision_kicker")}
          </span>
          <h2 className="mt-3 font-semibold tracking-tight text-[clamp(2rem,4vw,3rem)] leading-tight">
            {t("vision_title_a")}{" "}
            <span className="text-gradient-brand">{t("vision_title_b")}</span>
          </h2>
          <p className="mt-4 text-[var(--c-text-2)]">{t("vision_body")}</p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.55, delay: i * 0.08 }}
                className="relative overflow-hidden rounded-3xl border border-[var(--c-primary-2)]/25 bg-[var(--c-surface)] p-6 shadow-[var(--shadow)]"
              >
                <div
                  aria-hidden
                  className="absolute inset-0 -z-10 opacity-60"
                  style={{ background: "var(--grad-primary-soft)" }}
                />
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-inner"
                    style={{ background: "var(--grad-primary)" }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--c-primary-2)]">
                    {t(p.kicker)}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">{t(p.title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--c-text-2)]">{t(p.body)}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-16 grid gap-3 md:grid-cols-3">
          {TRANSITIONS.map((tr, i) => (
            <motion.div
              key={tr.a}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="flex items-center gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] px-5 py-4"
            >
              <span className="text-sm text-[var(--c-muted)] line-through">{t(tr.a)}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[var(--c-primary-2)] rtl-mirror" />
              <span className="text-sm font-semibold text-[var(--c-text)]">{t(tr.b)}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
