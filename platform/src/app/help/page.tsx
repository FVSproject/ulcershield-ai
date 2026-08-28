"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertOctagon,
  Bluetooth,
  Brain,
  ChevronDown,
  Cog,
  LifeBuoy,
  Radio,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/landing/footer";
import { Input } from "@/components/ui/input";

type Category = "device" | "ai" | "sensor" | "algorithm" | "account" | "sos";

interface Issue {
  category: Category;
  code: string;
  title: string;
  symptoms: string;
  causes: string[];
  fix: string[];
}

const CATEGORY_LABEL: Record<Category, string> = {
  device: "Bluetooth device",
  sensor: "Sensor stream",
  ai: "Claude AI",
  algorithm: "Risk & twin",
  account: "Account & data",
  sos: "SOS alerts",
};

const CATEGORY_ICON: Record<Category, React.ReactNode> = {
  device: <Bluetooth className="h-4 w-4" />,
  sensor: <Radio className="h-4 w-4" />,
  ai: <Brain className="h-4 w-4" />,
  algorithm: <Sparkles className="h-4 w-4" />,
  account: <Cog className="h-4 w-4" />,
  sos: <LifeBuoy className="h-4 w-4" />,
};

const ISSUES: Issue[] = [
  {
    category: "device",
    code: "BLE-01",
    title: "Pair device button is disabled",
    symptoms: "The Pair button on /connect is greyed out and cannot be clicked.",
    causes: [
      "Your browser does not implement the Web Bluetooth API.",
      "You opened the site over plain HTTP — Web Bluetooth requires HTTPS.",
      "Bluetooth is disabled at the OS level.",
    ],
    fix: [
      "Use Chrome, Edge, or Opera on desktop or Android. iOS Safari does NOT expose Web Bluetooth.",
      "Confirm the URL starts with https:// (Vercel is HTTPS by default; local dev requires localhost).",
      "Turn Bluetooth on in your operating system settings and reload the page.",
    ],
  },
  {
    category: "device",
    code: "BLE-02",
    title: "Bluetooth pairing fails or times out",
    symptoms: "The browser prompt appears but connection never completes, or fails with a generic error.",
    causes: [
      "The ESP32 is out of range or powered down.",
      "The ESP32 firmware is not advertising the expected BLE service.",
      "Another device already has the ESP32 paired and holding the connection.",
    ],
    fix: [
      "Move within 5 m of the device and confirm the LED is on.",
      "Re-flash the firmware from firmware/BedsorePredictorBLE.ino and reboot the ESP32.",
      "Disconnect the ESP32 from any other client (phone, tablet) and retry.",
    ],
  },
  {
    category: "sensor",
    code: "SENS-01",
    title: "Dashboard shows 'no live data'",
    symptoms: "Cards show placeholders; the pressure graph does not move.",
    causes: [
      "Neither the simulator nor a BLE source is running.",
      "The sensor source crashed or was manually stopped.",
    ],
    fix: [
      "Open /connect and click Start simulator to get synthetic data flowing immediately.",
      "For real hardware, click Pair device on /connect and select the ESP32.",
      "Reload the page — the simulator auto-starts on visit if nothing else is active.",
    ],
  },
  {
    category: "sensor",
    code: "SENS-02",
    title: "SOS: 'No sensor data for over a minute'",
    symptoms: "SOS popup fires warning that the last reading is stale.",
    causes: [
      "The bedside device rebooted mid-stream.",
      "Wi-Fi / Bluetooth interference caused the notify pipe to stall.",
      "The ESP32 lost power.",
    ],
    fix: [
      "Check the ESP32 power cable and status LED.",
      "Re-pair from /connect. Fresh notifications should start within a few seconds.",
      "If it recurs, move the device to a lower-interference location (away from microwaves, dense metal).",
    ],
  },
  {
    category: "ai",
    code: "AI-01",
    title: "Claude API returns HTTP 501",
    symptoms: "Toast reads 'AI request failed · HTTP 501' or 'Server not configured'.",
    causes: [
      "ANTHROPIC_API_KEY is missing from the deployment environment.",
    ],
    fix: [
      "In Vercel → Settings → Environment Variables, add ANTHROPIC_API_KEY.",
      "Redeploy the project (Vercel will not pick up new env vars for the running build).",
      "Confirm with: click Ask Claude on the AI Insights card — it should return a response.",
    ],
  },
  {
    category: "ai",
    code: "AI-02",
    title: "Claude API returns HTTP 401",
    symptoms: "Toast reads 'AI request failed · HTTP 401'.",
    causes: [
      "The API key is invalid, expired, or was rotated.",
    ],
    fix: [
      "Generate a fresh key at console.anthropic.com.",
      "Replace ANTHROPIC_API_KEY in Vercel and redeploy.",
    ],
  },
  {
    category: "ai",
    code: "AI-03",
    title: "Claude API returns HTTP 429",
    symptoms: "Toast reads 'rate limited' or 'HTTP 429'.",
    causes: [
      "Too many requests in a short window.",
      "Anthropic account is at its usage cap.",
    ],
    fix: [
      "Wait 30–60 seconds and retry.",
      "Upgrade the Anthropic account tier if this occurs repeatedly during normal use.",
    ],
  },
  {
    category: "ai",
    code: "AI-04",
    title: "AI narrative is in the wrong language",
    symptoms: "Toast/output is in English after you switched to Arabic or Korean.",
    causes: [
      "The response was cached before you switched language.",
    ],
    fix: [
      "Switch to the desired language via the globe icon in the header.",
      "Click Re-analyze on the AI Insights card. The next response respects the current language.",
    ],
  },
  {
    category: "algorithm",
    code: "ALGO-01",
    title: "'Wrong' or unexpected risk band",
    symptoms: "You believe the reported risk band does not match the situation.",
    causes: [
      "The patient profile is incomplete (age / weight / height missing → neutral modifiers).",
      "The wrong patient is being viewed (admin session on /dashboard?patient=…).",
      "The device is uncalibrated — a zero baseline was never captured.",
    ],
    fix: [
      "Open /profile and fill in age, sex, height, weight, comorbidities, medications, and treatments.",
      "Admins: verify the URL patient ID matches the intended patient (check the banner).",
      "Click Zero (unload) on the dashboard controls with no pressure on the mat, then Calibrate Left / Right with a 1 kg reference weight.",
    ],
  },
  {
    category: "algorithm",
    code: "ALGO-02",
    title: "Repositioning did NOT drop pressure",
    symptoms: "The Evaluate card shows 'Repositioning did not sufficiently reduce pressure'.",
    causes: [
      "The turn was partial — the patient rolled back.",
      "The current angle is not steep enough for this patient.",
      "The mattress is bottomed out and cannot redistribute load.",
    ],
    fix: [
      "Follow the platform's next-step escalation in the Evaluate card: bump angle by 5° or switch sides at 30°.",
      "Add a wedge pillow to hold the tilt.",
      "Inspect the mattress for over-inflation, damage, or end-of-life foam.",
    ],
  },
  {
    category: "account",
    code: "ACC-01",
    title: "Cannot log in / password rejected",
    symptoms: "Login page rejects credentials that used to work.",
    causes: [
      "Accounts are per-browser (IndexedDB). A different browser or private window has no record of the account.",
      "The browser cleared IndexedDB.",
    ],
    fix: [
      "Log in from the SAME browser profile the account was created in.",
      "If IndexedDB was cleared, re-register. To carry data across browsers, use the CSV export on /analysis.",
    ],
  },
  {
    category: "account",
    code: "ACC-02",
    title: "Admin dashboard shows no patients",
    symptoms: "The roster on /admin is empty.",
    causes: [
      "No non-admin accounts have been created yet.",
      "Data was recently cleared from the browser.",
    ],
    fix: [
      "Register a normal patient account (untick the 'Register as admin' box).",
      "Log back in as admin — the new patient will appear in the roster.",
    ],
  },
  {
    category: "sos",
    code: "SOS-01",
    title: "'Two consecutive turns failed to relieve pressure'",
    symptoms: "SOS popup with 'verify_repeated_fail' after using Apply twice.",
    causes: [
      "The manoeuvre is not correctly executed.",
      "The patient has an underlying tissue-tolerance problem (existing wound, ischemia).",
      "The support surface is inadequate.",
    ],
    fix: [
      "Perform a full physical reassessment: check bed surface, redistribute pillows, inspect the primary region for existing tissue damage.",
      "Escalate to the wound-care team if the pattern persists.",
      "Consider a higher-spec support surface (alternating pressure mattress).",
    ],
  },
  {
    category: "sos",
    code: "SOS-02",
    title: "'Critical risk — no intervention recorded'",
    symptoms: "SOS popup after 3+ minutes in the critical band with no Apply.",
    causes: [
      "The recommendation was not actioned at bedside.",
      "The clinician missed the notification.",
    ],
    fix: [
      "Return to the dashboard, review the AI Recommendation card, perform the recommended turn, and click Apply.",
      "The 5-minute Evaluate cycle will then confirm whether it worked.",
    ],
  },
];

export default function HelpPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return ISSUES.filter((i) => {
      if (cat !== "all" && i.category !== cat) return false;
      if (!query) return true;
      return (
        i.title.toLowerCase().includes(query) ||
        i.symptoms.toLowerCase().includes(query) ||
        i.code.toLowerCase().includes(query) ||
        i.causes.some((c) => c.toLowerCase().includes(query)) ||
        i.fix.some((c) => c.toLowerCase().includes(query))
      );
    });
  }, [q, cat]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium">
            <LifeBuoy className="h-3.5 w-3.5 text-[var(--c-primary-2)]" />
            <span className="uppercase tracking-[0.14em]">Help & troubleshooting</span>
          </div>
          <h1 className="mt-6 font-semibold tracking-tight text-[clamp(2.2rem,4.5vw,3.6rem)] leading-[1.05]">
            Fix the most common issues in <span className="text-gradient-brand">under a minute</span>
          </h1>
          <p className="mt-4 mx-auto max-w-2xl text-[var(--c-text-2)] leading-relaxed">
            Every SOS alert links back to this page. Search by symptom, error code, or category.
          </p>
        </motion.header>

        <div className="mt-10 space-y-4">
          <div className="relative">
            <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 start-3 text-[var(--c-muted)]" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search — e.g. 'BLE', '501', 'wrong risk'"
              className="ps-10 py-3 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <CategoryChip label="All" active={cat === "all"} onClick={() => setCat("all")} />
            {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
              <CategoryChip
                key={c}
                label={CATEGORY_LABEL[c]}
                icon={CATEGORY_ICON[c]}
                active={cat === c}
                onClick={() => setCat(c)}
              />
            ))}
          </div>
        </div>

        <section className="mt-8 space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--c-border)] px-4 py-10 text-center text-sm text-[var(--c-muted)]">
              No matching issue in the guide yet. If you hit a new failure, raise it in the SOS
              inbox from the admin dashboard and we will add it here.
            </div>
          ) : (
            filtered.map((issue) => {
              const open = expanded === issue.code;
              return (
                <article
                  key={issue.code}
                  className="rounded-3xl border border-[var(--c-border)] bg-[var(--c-surface)]"
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : issue.code)}
                    className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 p-5 text-left"
                  >
                    <span
                      className="grid h-10 w-10 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--c-primary-2)_12%,transparent)] text-[var(--c-primary-2)]"
                    >
                      {CATEGORY_ICON[issue.category]}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
                        <span>{issue.code}</span>
                        <span>·</span>
                        <span>{CATEGORY_LABEL[issue.category]}</span>
                      </div>
                      <div className="mt-0.5 text-[15px] font-semibold text-[var(--c-text)]">
                        {issue.title}
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[var(--c-muted)] transition-transform ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {open && (
                    <div className="grid gap-4 border-t border-[var(--c-border)] p-5 pt-4 text-[13.5px] leading-relaxed">
                      <div>
                        <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
                          <AlertOctagon className="h-3 w-3" />
                          Symptoms
                        </div>
                        <p className="text-[var(--c-text-2)]">{issue.symptoms}</p>
                      </div>

                      <div>
                        <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
                          <ShieldAlert className="h-3 w-3" />
                          Likely cause
                        </div>
                        <ul className="space-y-1.5 text-[var(--c-text-2)]">
                          {issue.causes.map((c, i) => (
                            <li key={i} className="grid grid-cols-[10px_1fr] items-start gap-3">
                              <span className="mt-2 h-1 w-1 rounded-full bg-[var(--c-muted)]" />
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-[var(--c-muted)]">
                          <Cog className="h-3 w-3" />
                          How to fix
                        </div>
                        <ol className="space-y-2 text-[var(--c-text-2)]">
                          {issue.fix.map((f, i) => (
                            <li
                              key={i}
                              className="grid grid-cols-[22px_1fr] items-start gap-3"
                            >
                              <span
                                className="grid h-5 w-5 place-items-center rounded-md text-[10px] font-bold text-white"
                                style={{ background: "var(--grad-primary)" }}
                              >
                                {i + 1}
                              </span>
                              <span>{f}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>

        <section className="mt-12 rounded-3xl border border-[var(--c-primary-2)]/30 bg-[color-mix(in_oklab,var(--c-primary-2)_8%,transparent)] p-6 text-center">
          <div className="text-sm text-[var(--c-text-2)]">
            Still stuck? Every SOS event is logged to the admin{" "}
            <Link href="/admin" className="underline text-[var(--c-primary-2)] hover:opacity-80">
              SOS inbox
            </Link>
            {" — "}
            an administrator can review the exact context that triggered the alert.
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function CategoryChip({
  label,
  active,
  icon,
  onClick,
}: {
  label: string;
  active: boolean;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all " +
        (active
          ? "border-[var(--c-primary-2)]/60 bg-[color-mix(in_oklab,var(--c-primary-2)_15%,transparent)] text-[var(--c-primary-2)]"
          : "border-[var(--c-border)] bg-[var(--c-surface)] text-[var(--c-text-2)] hover:text-[var(--c-text)]")
      }
    >
      {icon}
      {label}
    </button>
  );
}
