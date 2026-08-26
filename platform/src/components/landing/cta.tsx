"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

export function CTA() {
  const t = useT();
  return (
    <section id="cta" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[32px] border border-[var(--c-primary-2)]/30 bg-[var(--c-surface)] px-8 py-16 text-center shadow-[0_40px_120px_-40px_rgba(6,182,212,.55)] sm:px-16"
        >
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{ background: "var(--grad-hero)" }}
          />
          <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-30" />

          <div className="mx-auto max-w-2xl">
            <h2 className="font-semibold tracking-tight text-[clamp(1.8rem,3.5vw,2.6rem)] leading-tight">
              {t("cta_title")}
            </h2>
            <p className="mt-4 text-[var(--c-text-2)] leading-relaxed">{t("cta_body")}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/dashboard">
                <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4 rtl-mirror" />}>
                  {t("cta_primary")}
                </Button>
              </Link>
              <Link href="#safety">
                <Button size="lg" variant="glass" leftIcon={<ShieldAlert className="h-4 w-4" />}>
                  {t("cta_secondary")}
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
