"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Save, LogOut } from "lucide-react";
import { AppBoot } from "@/components/app-boot";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { getDb } from "@/lib/db";
import { useSession } from "@/lib/session";
import { useToasts } from "@/components/ui/toast";
import { useSensorStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

export default function ProfilePage() {
  const user = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);
  const logout = useSession((s) => s.logout);
  const push = useToasts((s) => s.push);
  const resetSensor = useSensorStore((s) => s.reset);
  const t = useT();

  const [avatar, setAvatar] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setAvatar(user.avatar ?? "");
      setName(user.name ?? "");
    }
  }, [user]);

  if (!user) return <AppBoot>{null}</AppBoot>;

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const fd = new FormData(e.currentTarget);
      const updated = {
        ...user,
        name: name || user.name,
        avatar: avatar || undefined,
        email: String(fd.get("email") ?? "") || undefined,
        phone: String(fd.get("phone") ?? "") || undefined,
        age: Number(fd.get("age")) || undefined,
        sex: (fd.get("sex") as typeof user.sex) || undefined,
        height: Number(fd.get("height")) || undefined,
        weight: Number(fd.get("weight")) || undefined,
        notes: String(fd.get("notes") ?? "") || undefined,
      };
      await getDb().patients.put(updated);
      setUser(updated);
      push({ kind: "ok", title: t("profile_saved") });
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    resetSensor();
    logout();
    push({ kind: "info", title: t("profile_signed_out") });
  }

  return (
    <AppBoot>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{t("profile_title")}</h1>
            <p className="mt-2 text-[var(--c-text-2)]">{t("profile_subtitle")}</p>
          </div>
          <Button variant="ghost" onClick={handleLogout} leftIcon={<LogOut className="h-4 w-4" />}>
            {t("profile_sign_out")}
          </Button>
        </motion.header>

        <Card>
          <CardHeader>
            <CardTitle>{t("profile_personal_details")}</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={save} className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface-2)] p-4">
                <AvatarUpload value={avatar} onChange={setAvatar} name={name} hint={t("ui_photo_hint")} />
              </div>
              <Field label={t("ui_username")}>
                <Input value={user.username} readOnly disabled />
              </Field>
              <Field label={t("ui_full_name")}>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label={t("ui_email")}>
                <Input name="email" type="email" defaultValue={user.email ?? ""} />
              </Field>
              <Field label={t("ui_phone")}>
                <Input name="phone" type="tel" defaultValue={user.phone ?? ""} />
              </Field>
              <Field label={t("ui_age")}>
                <Input name="age" type="number" defaultValue={user.age ?? ""} />
              </Field>
              <Field label={t("ui_sex")}>
                <Select name="sex" defaultValue={user.sex ?? ""}>
                  <option value="">{t("ui_select")}</option>
                  <option value="male">{t("ui_male")}</option>
                  <option value="female">{t("ui_female")}</option>
                  <option value="other">{t("ui_other")}</option>
                </Select>
              </Field>
              <Field label={t("ui_height")}>
                <Input name="height" type="number" defaultValue={user.height ?? ""} />
              </Field>
              <Field label={t("ui_weight")}>
                <Input name="weight" type="number" step={0.1} defaultValue={user.weight ?? ""} />
              </Field>
              <Field label={t("ui_notes")} className="sm:col-span-2">
                <Textarea name="notes" rows={3} defaultValue={user.notes ?? ""} />
              </Field>
              <div className="sm:col-span-2 flex justify-end pt-2">
                <Button type="submit" disabled={busy} leftIcon={<Save className="h-4 w-4" />}>
                  {t("ui_save_changes")}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </AppBoot>
  );
}
