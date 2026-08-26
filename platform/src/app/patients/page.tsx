"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { UserPlus, Trash2, Activity } from "lucide-react";
import { AppBoot } from "@/components/app-boot";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listPatientRoster, deletePatient, setActive, isAdmin, type Patient } from "@/lib/db";
import { useSession } from "@/lib/session";
import { useToasts } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const setUser = useSession((s) => s.setUser);
  const currentUser = useSession((s) => s.user);
  const push = useToasts((s) => s.push);
  const t = useT();
  const admin = isAdmin(currentUser);

  async function reload() {
    const list = await listPatientRoster();
    setPatients(list);
  }
  useEffect(() => {
    reload();
  }, []);

  async function activate(p: Patient) {
    if (admin) {
      // Admin: view this patient's dashboard without changing session.
      router.push(`/dashboard?patient=${p.id}`);
      return;
    }
    // Patient: this really only happens for their own row.
    await setActive(p.id);
    setUser({ ...p, active: true });
    push({ kind: "ok", title: t("patients_now_monitoring"), body: p.name });
    reload();
  }
  async function remove(p: Patient) {
    if (!confirm(t("patients_confirm_delete"))) return;
    await deletePatient(p.id);
    if (currentUser?.id === p.id) setUser(null);
    push({ kind: "info", title: t("patients_deleted"), body: p.name });
    reload();
  }

  const sexLabel = (s?: string) =>
    s === "male" ? t("ui_male") : s === "female" ? t("ui_female") : s === "other" ? t("ui_other") : "";

  return (
    <AppBoot>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{t("patients_title")}</h1>
            <p className="mt-2 text-[var(--c-text-2)]">{t("patients_subtitle")}</p>
          </div>
          <Link href="/register">
            <Button leftIcon={<UserPlus className="h-4 w-4" />}>{t("patients_add")}</Button>
          </Link>
        </motion.header>

        {patients.length === 0 ? (
          <Card>
            <CardBody className="py-16 text-center">
              <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--c-primary-2)_15%,transparent)] text-[var(--c-primary-2)]">
                <UserPlus className="h-5 w-5" />
              </div>
              <p className="text-sm text-[var(--c-text-2)]">{t("patients_none")}</p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {patients.map((p) => (
              <Card key={p.id} interactive>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    {p.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.avatar}
                        alt=""
                        className="h-9 w-9 rounded-xl object-cover"
                      />
                    ) : (
                      <span
                        className="grid h-9 w-9 place-items-center rounded-xl text-sm font-semibold text-white"
                        style={{ background: "var(--grad-primary)" }}
                      >
                        {p.name
                          .split(" ")
                          .map((n) => n[0])
                          .filter(Boolean)
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 truncate">{p.name}</span>
                  </CardTitle>
                  {p.active && (
                    <Badge tone="live" dot>
                      {t("patients_monitoring")}
                    </Badge>
                  )}
                </CardHeader>
                <CardBody>
                  <ul className="space-y-1.5 text-xs text-[var(--c-text-2)]">
                    <li>
                      {t("patients_meta_username")}:{" "}
                      <b className="text-[var(--c-text)]">{p.username}</b>
                    </li>
                    {p.age && (
                      <li>
                        {t("ui_age")} {p.age}
                        {p.sex ? ` · ${sexLabel(p.sex)}` : ""}
                      </li>
                    )}
                    {p.height && p.weight && (
                      <li>
                        {p.height} cm · {p.weight} kg
                      </li>
                    )}
                    {p.notes && <li className="line-clamp-2 pt-1">{p.notes}</li>}
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={p.active ? "secondary" : "primary"}
                      leftIcon={<Activity className="h-3.5 w-3.5" />}
                      onClick={() => activate(p)}
                    >
                      {p.active ? t("patients_currently_active") : t("patients_monitor")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={() => remove(p)}
                    >
                      {t("ui_delete")}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppBoot>
  );
}
