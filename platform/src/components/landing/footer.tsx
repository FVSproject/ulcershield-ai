"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { useT } from "@/lib/i18n";
import { Bluetooth, Sparkles } from "lucide-react";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 007.86 10.91c.58.11.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.06-.72.08-.7.08-.7 1.17.08 1.79 1.2 1.79 1.2 1.04 1.78 2.72 1.27 3.38.97.1-.75.4-1.27.73-1.56-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .98-.31 3.2 1.18a11 11 0 015.83 0c2.22-1.5 3.2-1.18 3.2-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.08 0 4.41-2.7 5.38-5.27 5.66.41.35.77 1.05.77 2.12v3.15c0 .31.21.68.8.56A11.5 11.5 0 0023.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

export function Footer() {
  const t = useT();
  return (
    <footer
      id="safety"
      className="relative mt-24 border-t border-[var(--c-border)] bg-[color-mix(in_oklab,var(--c-bg-2)_60%,transparent)]"
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] lg:px-8">
        <div className="max-w-xl">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="h-9 w-9" />
            <div className="flex flex-col leading-tight">
              <span className="text-[15px] font-semibold tracking-tight">
                UlcerShield <span className="text-gradient-brand">AI</span>
              </span>
              <span className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--c-muted)]">
                {t("brand_subtitle")}
              </span>
            </div>
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-[var(--c-text-2)]">
            {t("footer_disclaimer")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-3">
          <FooterCol
            title={t("footer_col_product")}
            items={[
              { label: t("nav_dashboard"), href: "/dashboard" },
              { label: t("nav_analysis"), href: "/analysis" },
              { label: t("nav_ai"), href: "/ai" },
              { label: t("nav_connect"), href: "/connect" },
              { label: t("footer_docs"), href: "/docs/" },
            ]}
          />
          <FooterCol
            title={t("footer_col_signals")}
            items={[
              { label: "Pressure (FSR)", href: "#innovations" },
              { label: "Body temp (MLX90614)", href: "#innovations" },
              { label: "Humidity (DHT22)", href: "#innovations" },
              { label: "Center of Pressure", href: "#innovations" },
            ]}
          />
          <FooterCol
            title={t("footer_col_stack")}
            items={[
              { label: "Web Bluetooth", href: "#how", icon: <Bluetooth className="h-3 w-3" /> },
              { label: "Claude API", href: "#how", icon: <Sparkles className="h-3 w-3" /> },
              { label: "Open source", href: "#", icon: <GithubIcon className="h-3 w-3" /> },
            ]}
          />
        </div>
      </div>
      <div className="border-t border-[var(--c-border)] px-4 py-4 text-center text-[11px] text-[var(--c-muted)] sm:px-6 lg:px-8">
        © {new Date().getFullYear()} UlcerShield AI · Research prototype · Not a medical device.
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string; icon?: React.ReactNode }[];
}) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">
        {title}
      </h4>
      <ul className="mt-4 space-y-2.5">
        {items.map((it) => (
          <li key={it.label}>
            <Link
              href={it.href}
              className="inline-flex items-center gap-2 text-sm text-[var(--c-text-2)] hover:text-[var(--c-primary-2)] transition-colors"
            >
              {it.icon}
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
