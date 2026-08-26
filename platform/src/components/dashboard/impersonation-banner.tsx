"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, ArrowLeft } from "lucide-react";
import { useSession } from "@/lib/session";
import { useViewing } from "@/lib/viewing";
import { isAdmin } from "@/lib/db";
import { useT } from "@/lib/i18n";

export function ImpersonationBanner() {
  const user = useSession((s) => s.user);
  const viewing = useViewing((s) => s.viewing);
  const t = useT();

  const showing = user && isAdmin(user) && viewing && viewing.id !== user.id;

  return (
    <AnimatePresence>
      {showing && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--c-primary-2)]/40 bg-[color-mix(in_oklab,var(--c-primary-2)_10%,transparent)] px-4 py-3 text-sm"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--c-primary-2)]/25 text-[var(--c-primary-2)]">
              <Eye className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--c-primary-2)]">
                {t("admin_viewing_as")}
              </div>
              <div className="text-sm font-semibold text-[var(--c-text)]">{viewing!.name}</div>
            </div>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-xs font-medium hover:-translate-y-0.5 transition-transform"
          >
            <ArrowLeft className="h-3.5 w-3.5 rtl-mirror" />
            {t("admin_return")}
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
