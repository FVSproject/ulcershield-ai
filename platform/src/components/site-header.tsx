"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  Moon,
  Sun,
  Type,
  Languages,
  Bluetooth,
  Activity,
  LayoutDashboard,
  LineChart,
  Users,
  Sparkles,
  UserCircle,
  LogOut,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { useT } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { useSensorStore } from "@/lib/store";
import { isAdmin } from "@/lib/db";
import { useViewing } from "@/lib/viewing";
import { useSosStore } from "@/lib/sos-store";
import { LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DictKey } from "@/lib/i18n";

interface NavItem {
  href: string;
  key: DictKey;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const NAV_PATIENT: NavItem[] = [
  { href: "/dashboard", key: "nav_dashboard", icon: LayoutDashboard },
  { href: "/analysis", key: "nav_analysis", icon: LineChart },
  { href: "/ai", key: "nav_ai", icon: Sparkles },
  { href: "/connect", key: "nav_connect", icon: Bluetooth },
];

const NAV_ADMIN: NavItem[] = [
  { href: "/admin", key: "nav_admin", icon: ShieldCheck, adminOnly: true },
  { href: "/dashboard", key: "nav_dashboard", icon: LayoutDashboard },
  { href: "/patients", key: "nav_patients", icon: Users, adminOnly: true },
  { href: "/analysis", key: "nav_analysis", icon: LineChart },
  { href: "/ai", key: "nav_ai", icon: Sparkles },
  { href: "/connect", key: "nav_connect", icon: Bluetooth },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { theme, setTheme, fontSize, cycleFontSize, lang, cycleLang } = useTheme();
  const t = useT();
  const user = useSession((s) => s.user);
  const logout = useSession((s) => s.logout);
  const setViewing = useViewing((s) => s.setViewing);
  const resetSensor = useSensorStore((s) => s.reset);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  const admin = isAdmin(user);
  const NAV = admin ? NAV_ADMIN : NAV_PATIENT;
  const openSosCount = useSosStore((s) => s.open.length);
  const refreshSos = useSosStore((s) => s.refresh);

  useEffect(() => {
    if (!admin) return;
    refreshSos();
    const id = window.setInterval(refreshSos, 20_000);
    return () => window.clearInterval(id);
  }, [admin, refreshSos]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenu(false);
  }, [pathname]);

  const isApp =
    pathname !== "/" && !pathname.startsWith("/login") && !pathname.startsWith("/register");
  const langLabel = { en: "عربي", ar: "한국어", ko: "English" }[lang];

  function handleLogout() {
    resetSensor();
    setViewing(null);
    logout();
    setUserMenu(false);
  }

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-300",
        scrolled
          ? "border-b border-[var(--c-border)] bg-[color-mix(in_oklab,var(--c-bg)_82%,transparent)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href={user && isApp ? (admin ? "/admin" : "/dashboard") : "/"}
          className="flex items-center gap-2.5 group"
        >
          <Logo size={38} glow className="transition-transform duration-500 group-hover:rotate-6" />
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold tracking-tight">
              UlcerShield <span className="text-gradient-brand">AI</span>
            </span>
            <span className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--c-muted)]">
              {t("brand_subtitle")}
            </span>
          </div>
        </Link>

        {isApp && user && (
          <nav className="hidden xl:flex items-center gap-1 rounded-full glass px-1.5 py-1.5">
            {NAV.map(({ href, key, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors",
                    active ? "text-white" : "text-[var(--c-text-2)] hover:text-[var(--c-text)]"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 -z-10 rounded-full"
                      style={{ background: "var(--grad-primary)" }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon className="h-3.5 w-3.5" />
                  {t(key)}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-1.5">
          <IconBtn
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </IconBtn>
          <IconBtn onClick={cycleFontSize} aria-label="Cycle font size" className="hidden sm:inline-flex">
            <Type className="h-4 w-4" />
            <span className="ml-1 text-[10px] font-bold uppercase">{fontSize}</span>
          </IconBtn>
          <IconBtn onClick={cycleLang} aria-label="Cycle language">
            <Languages className="h-4 w-4" />
            <span className="ml-1 text-[10.5px] font-semibold hidden sm:inline">{langLabel}</span>
          </IconBtn>

          {!isApp && (
            <div className="hidden sm:flex items-center gap-2 ml-1">
              {user ? (
                <Link href={admin ? "/admin" : "/dashboard"}>
                  <Button size="sm" leftIcon={<Activity className="h-3.5 w-3.5" />}>
                    {t("open_dashboard")}
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      {t("login")}
                    </Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button size="sm" leftIcon={<Activity className="h-3.5 w-3.5" />}>
                      {t("hero_cta_primary")}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          )}

          {isApp && user && admin && openSosCount > 0 && (
            <Link
              href="/admin"
              className="ml-1 relative inline-flex h-10 items-center gap-1.5 rounded-full glass px-3 text-[var(--color-crit)] hover:-translate-y-0.5 transition-all"
              aria-label={`${openSosCount} open SOS events`}
            >
              <LifeBuoy className="h-4 w-4" />
              <span className="num text-[11px] font-bold">{openSosCount}</span>
              <span
                className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full animate-pulse"
                style={{ background: "var(--color-crit)" }}
              />
            </Link>
          )}

          {isApp && user && (
            <div className="relative">
              <button
                onClick={() => setUserMenu((v) => !v)}
                className="ml-1 inline-flex h-10 items-center gap-2 rounded-full glass pl-1 pr-3 transition-all duration-300 hover:-translate-y-0.5"
                aria-label={t("hdr_account")}
              >
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span
                    className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-semibold text-white"
                    style={{ background: "var(--grad-primary)" }}
                  >
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() || "U"}
                  </span>
                )}
                <span className="hidden md:flex flex-col text-left leading-tight">
                  <span className="text-[12px] font-medium">{user.name}</span>
                  <span className="text-[10px] text-[var(--c-muted)]">
                    {admin ? t("admin_role") : t("hdr_active_patient")}
                  </span>
                </span>
              </button>
              <AnimatePresence>
                {userMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] shadow-[var(--shadow-lg)]"
                  >
                    <div className="border-b border-[var(--c-border)] px-4 py-3">
                      <div className="text-sm font-semibold truncate">{user.name}</div>
                      <div className="text-[11px] text-[var(--c-muted)] truncate">
                        @{user.username} · {admin ? t("admin_role") : t("nav_profile")}
                      </div>
                    </div>
                    {admin && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[var(--c-surface-2)]"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {t("nav_admin")}
                      </Link>
                    )}
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[var(--c-surface-2)]"
                    >
                      <UserCircle className="h-4 w-4" />
                      {t("hdr_edit_profile")}
                    </Link>
                    {admin && (
                      <Link
                        href="/patients"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-[var(--c-surface-2)]"
                      >
                        <Users className="h-4 w-4" />
                        {t("hdr_switch_patient")}
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 border-t border-[var(--c-border)] px-4 py-2.5 text-left text-sm text-[var(--color-crit)] hover:bg-[color-mix(in_oklab,var(--color-crit)_10%,transparent)]"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("profile_sign_out")}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {isApp && user && (
            <button
              className="xl:hidden ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full glass"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={t("hdr_menu")}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isApp && user && mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="xl:hidden overflow-hidden border-t border-[var(--c-border)] bg-[var(--c-surface)]"
          >
            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-4 py-4 sm:px-6">
              {NAV.map(({ href, key, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors",
                      active
                        ? "border-[var(--c-primary-2)]/40 bg-[color-mix(in_oklab,var(--c-primary-2)_10%,transparent)] text-[var(--c-text)]"
                        : "border-[var(--c-border)] text-[var(--c-text-2)] hover:text-[var(--c-text)]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t(key)}
                  </Link>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

function IconBtn({
  children,
  onClick,
  className,
  ...props
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center rounded-full glass px-3 text-[var(--c-text)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
