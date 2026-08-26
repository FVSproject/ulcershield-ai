"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { HeroDeviceMockup } from "@/components/landing/hero-device-mockup";

export function Hero() {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.3]);

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden pt-8 pb-24 lg:pt-16 lg:pb-36"
    >
      {/* Ambient background */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{ background: "var(--grad-hero)" }}
      />
      <div className="absolute inset-0 -z-10 bg-grid opacity-40" />
      <motion.div
        aria-hidden
        className="orb h-[520px] w-[520px] -top-40 -left-40 animate-float-slow"
        style={{ background: "radial-gradient(circle, #22d3ee 0%, transparent 60%)" }}
      />
      <motion.div
        aria-hidden
        className="orb h-[600px] w-[600px] top-20 -right-40 animate-float-slow"
        style={{
          background: "radial-gradient(circle, #0b3d63 0%, transparent 55%)",
          animationDelay: "-3s",
        }}
      />

      <motion.div
        style={{ y, opacity }}
        className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:px-8"
      >
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-[var(--c-text-2)]"
          >
            <Sparkles className="h-3.5 w-3.5 text-[var(--c-primary-2)]" />
            <span className="uppercase tracking-[0.14em]">{t("hero_eyebrow")}</span>
          </motion.div>

          <h1 className="mt-6 font-semibold tracking-tight text-[clamp(2.4rem,5vw,4.2rem)] leading-[1.02]">
            <motion.span
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="block text-[var(--c-text)]"
            >
              {t("hero_title_l1")}
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="block text-gradient-brand animate-gradient"
              style={{
                backgroundImage:
                  "linear-gradient(90deg,#22d3ee 0%,#67e8f9 25%,#38bdf8 50%,#22d3ee 75%,#0891b2 100%)",
              }}
            >
              {t("hero_title_l2")}
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-6 max-w-xl text-[15.5px] leading-relaxed text-[var(--c-text-2)]"
          >
            {t("hero_body")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link href="/dashboard">
              <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4 rtl-mirror" />}>
                {t("hero_cta_primary")}
              </Button>
            </Link>
            <Link href="#demo">
              <Button size="lg" variant="glass" leftIcon={<PlayCircle className="h-4 w-4" />}>
                {t("hero_cta_secondary")}
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.55 }}
            className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            <Stat kickerKey="stat_response" valueKey="stat_response_v" />
            <Stat kickerKey="stat_zones" valueKey="stat_zones_v" />
            <Stat kickerKey="stat_langs" valueKey="stat_langs_v" />
            <Stat kickerKey="stat_ble" valueKey="stat_ble_v" />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex justify-center lg:justify-end"
        >
          <HeroDeviceMockup />
        </motion.div>
      </motion.div>
    </section>
  );
}

function Stat({
  kickerKey,
  valueKey,
}: {
  kickerKey: Parameters<ReturnType<typeof useT>>[0];
  valueKey: Parameters<ReturnType<typeof useT>>[0];
}) {
  const t = useT();
  return (
    <div className="rounded-2xl glass px-4 py-3">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-[var(--c-muted)]">
        {t(kickerKey)}
      </div>
      <div className="mt-1 num text-lg font-semibold text-[var(--c-text)]">{t(valueKey)}</div>
    </div>
  );
}
