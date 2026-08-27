"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Award, GraduationCap, Landmark, ShieldCheck, Sparkles, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/landing/footer";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const TEAM = [
  { name: "Amjad Salman Aldawsari", role: "Team member", id: "431230572" },
  { name: "Rimah Ayash Alanazi", role: "Team member", id: "441230639" },
  { name: "Hana Jihad Alenezi", role: "Team member", id: "441230515" },
  { name: "Safaa Waheed Aldawsari", role: "Team member", id: "431230560" },
  { name: "Dr. Rasha Fouad", role: "Supervisor", id: "28193" },
];

const PATENT_CLAIMS = [
  "Adaptive AI prediction architecture for pressure injury prevention.",
  "Dynamic Tissue Tolerance Index (DTTI) algorithm.",
  "Digital Tissue Twin generation and continuous updating.",
  "Tissue Fatigue Prediction Engine.",
  "Estimated Remaining Safe Tissue Time computation.",
  "Personalized repositioning optimization algorithms.",
  "Multi-horizon pressure injury forecasting.",
  "Continuous self-learning prevention engine.",
  "Explainable AI framework for clinical recommendations.",
  "Multimodal patient data fusion for individualized tissue risk prediction.",
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 text-[var(--c-primary-2)]" />
            <span className="uppercase tracking-[0.14em]">About the project</span>
          </div>
          <h1 className="mt-6 font-semibold tracking-tight text-[clamp(2.4rem,5vw,4rem)] leading-[1.05]">
            UlcerShield <span className="text-gradient-brand">AI</span>
          </h1>
          <p className="mt-4 mx-auto max-w-2xl text-[var(--c-text-2)] leading-relaxed">
            An adaptive multi-modal AI platform for personalized prediction and autonomous
            prevention of pressure injuries — developed as an undergraduate research project at{" "}
            <b>King Saud bin Abdulaziz University for Health Sciences (KSAU-HS)</b>, and selected
            for the Seoul International Invention Fair 2026.
          </p>
        </motion.header>

        {/* SIIF 2026 + patent status */}
        <section className="mt-16 grid gap-5 md:grid-cols-2">
          <Card
            icon={<Award className="h-5 w-5" />}
            title="SIIF 2026 · Seoul International Invention Fair"
            body="One of the world's most prestigious exhibitions dedicated to innovation, invention, and technology transfer. December 2–5, 2026 — Coex Center, Seoul."
          />
          <Card
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Patent — filed with SAIP"
            body="Submitted for patent protection through the Saudi Authority for Intellectual Property. Patent title: “UlcerShield AI: An Adaptive Multi-Modal Artificial Intelligence Platform for Personalized Prediction and Autonomous Prevention of Pressure Injuries.”"
          />
        </section>

        {/* Team */}
        <section className="mt-16">
          <div className="mb-6 flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--c-primary-2)]" />
            <h2 className="text-xl font-semibold tracking-tight">Team</h2>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((m) => (
              <li
                key={m.id}
                className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4"
              >
                <div className="text-sm font-semibold">{m.name}</div>
                <div className="mt-0.5 text-[11px] uppercase tracking-widest text-[var(--c-muted)]">
                  {m.role}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* University */}
        <section className="mt-16 rounded-3xl border border-[var(--c-border)] bg-[var(--c-surface)] p-8 bg-mesh">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--c-primary-2)_15%,transparent)] text-[var(--c-primary-2)]">
              <Landmark className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight">
                King Saud bin Abdulaziz University for Health Sciences
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--c-text-2)]">
                KSAU-HS's participation in SIIF 2026 aligns with Saudi Vision 2030 and the
                Kingdom's national strategy for research, development, and innovation.
                UlcerShield AI exemplifies the University's commitment to developing innovative
                healthcare solutions that integrate artificial intelligence with advanced medical
                technologies to address one of the most significant challenges in clinical
                practice — the prevention and early detection of pressure ulcers.
              </p>
            </div>
          </div>
        </section>

        {/* Patent claims */}
        <section className="mt-16">
          <div className="mb-6 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-[var(--c-primary-2)]" />
            <h2 className="text-xl font-semibold tracking-tight">Patentable claims</h2>
          </div>
          <p className="mb-4 text-sm text-[var(--c-text-2)]">
            The patent protection focuses primarily on software and algorithmic innovations
            rather than the sensing hardware — establishing a broader intellectual property
            position that is substantially more difficult for competitors to design around.
          </p>
          <ol className="space-y-2.5">
            {PATENT_CLAIMS.map((claim, i) => (
              <li
                key={i}
                className="grid grid-cols-[32px_1fr] items-start gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-3.5"
              >
                <span
                  className="grid h-7 w-7 place-items-center rounded-lg text-white text-[11px] font-bold"
                  style={{ background: "var(--grad-primary)" }}
                >
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed">{claim}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* CTA */}
        <section className="mt-16 flex flex-wrap items-center justify-center gap-3 rounded-3xl border border-[var(--c-primary-2)]/30 bg-[color-mix(in_oklab,var(--c-primary-2)_8%,transparent)] p-8 text-center">
          <div>
            <div className="flex items-center justify-center gap-2">
              <Logo size={28} />
              <span className="text-sm font-semibold">
                Smarter prevention. Safer patients.
              </span>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link href="/dashboard">
                <Button size="lg">Launch platform</Button>
              </Link>
              <Link href="/roadmap">
                <Button size="lg" variant="glass">
                  See the roadmap
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Card({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--c-border)] bg-[var(--c-surface)] p-6 shadow-[var(--shadow-sm)]">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--c-primary-2)_15%,transparent)] text-[var(--c-primary-2)]">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--c-text-2)]">{body}</p>
    </div>
  );
}
