"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { getDb, isAdmin, listPatients } from "@/lib/db";
import { useSession } from "@/lib/session";
import { useToasts } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const setUser = useSession((s) => s.setUser);
  const push = useToasts((s) => s.push);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const patients = await listPatients();
      const match = patients.find(
        (p) => p.username === username.trim() && (p.password ?? "") === password
      );
      if (!match) {
        push({ kind: "danger", title: t("login_invalid"), body: t("login_invalid_body") });
        return;
      }
      // Admins don't take over the "active patient" slot — that belongs to the
      // person being monitored on the bed.
      if (!isAdmin(match)) {
        await getDb().transaction("rw", getDb().patients, async () => {
          await getDb().patients.toCollection().modify({ active: false });
          await getDb().patients.update(match.id, { active: true });
        });
      }
      setUser({ ...match, active: !isAdmin(match) });
      push({
        kind: "ok",
        title: `${t("login_welcome")}, ${match.name}`,
        body: t("login_session_started"),
      });
      router.push(isAdmin(match) ? "/admin" : "/dashboard");
    } finally {
      setBusy(false);
    }
  }

  async function handleDemo() {
    setBusy(true);
    try {
      const existing = (await listPatients()).find((p) => p.username === "demo");
      let p = existing;
      if (!p) {
        const { newId } = await import("@/lib/db");
        p = {
          id: newId(),
          username: "demo",
          password: "",
          name: "Demo Patient",
          age: 74,
          sex: "female",
          height: 162,
          weight: 58,
          notes: "Simulated patient — for platform preview only.",
          role: "patient",
          createdAt: Date.now(),
          active: true,
        };
        await getDb().patients.put(p);
      }
      await getDb().patients.toCollection().modify({ active: false });
      await getDb().patients.update(p.id, { active: true });
      setUser({ ...p, active: true });
      push({ kind: "ok", title: t("login_demo_title"), body: t("login_demo_body") });
      router.push("/dashboard");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass-panel p-8 sm:p-10"
      >
        <div className="mb-6 flex items-center gap-2">
          <Logo size={32} />
          <span className="text-sm font-semibold">
            UlcerShield <span className="text-gradient-brand">AI</span>
          </span>
        </div>
        <h1 className="font-semibold tracking-tight text-3xl">{t("login_title")}</h1>
        <p className="mt-1.5 text-sm text-[var(--c-text-2)]">{t("login_subtitle")}</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Field label={t("ui_username")}>
            <Input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </Field>
          <Field label={t("ui_password")}>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={busy} leftIcon={<LogIn className="h-4 w-4" />}>
            {t("login_sign_in")}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-widest text-[var(--c-muted)]">
          <div className="h-px flex-1 bg-[var(--c-border)]" />
          {t("ui_or")}
          <div className="h-px flex-1 bg-[var(--c-border)]" />
        </div>

        <Button
          variant="glass"
          size="lg"
          className="w-full"
          onClick={handleDemo}
          disabled={busy}
          leftIcon={<ShieldCheck className="h-4 w-4" />}
        >
          {t("login_demo")}
        </Button>

        <p className="mt-6 text-center text-sm text-[var(--c-text-2)]">
          {t("login_no_account")}{" "}
          <Link href="/register" className="font-medium text-[var(--c-primary-2)] hover:underline">
            {t("login_register_here")}
          </Link>
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="relative hidden lg:block"
      >
        <div className="rounded-[28px] border border-[var(--c-border)] bg-[var(--c-surface)] p-8 shadow-[var(--shadow-lg)] bg-mesh">
          <blockquote className="text-2xl font-medium tracking-tight leading-snug">
            {t("login_quote")}
          </blockquote>
          <div className="mt-8 flex items-center gap-3">
            <Logo size={40} />
            <div>
              <div className="text-sm font-semibold">UlcerShield AI</div>
              <div className="text-xs text-[var(--c-muted)]">{t("login_quote_role")}</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
