"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, ShieldCheck, Baby, User } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import {
  countAdmins,
  getDb,
  listPatients,
  newId,
  type Comorbidity,
  type MedicationClass,
  type Patient,
  type PatientType,
  type Treatment,
} from "@/lib/db";
import { useSession } from "@/lib/session";
import { useToasts } from "@/components/ui/toast";
import { useT, type DictKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const CONDITIONS: { id: Comorbidity; key: DictKey }[] = [
  { id: "diabetes", key: "cond_diabetes" },
  { id: "peripheral_vascular", key: "cond_peripheral_vascular" },
  { id: "cardiac", key: "cond_cardiac" },
  { id: "renal", key: "cond_renal" },
  { id: "malnutrition", key: "cond_malnutrition" },
  { id: "neuropathy_or_sci", key: "cond_neuropathy_or_sci" },
  { id: "incontinence", key: "cond_incontinence" },
  { id: "dementia", key: "cond_dementia" },
  { id: "cancer_active", key: "cond_cancer_active" },
];

const MEDICATIONS: { id: MedicationClass; key: DictKey }[] = [
  { id: "corticosteroids", key: "med_corticosteroids" },
  { id: "vasoconstrictors", key: "med_vasoconstrictors" },
  { id: "anticoagulants", key: "med_anticoagulants" },
  { id: "chronic_sedatives", key: "med_chronic_sedatives" },
  { id: "nsaids", key: "med_nsaids" },
];

const TREATMENTS: { id: Treatment; key: DictKey }[] = [
  { id: "mechanical_ventilation", key: "treat_mechanical_ventilation" },
  { id: "dialysis", key: "treat_dialysis" },
  { id: "chemotherapy", key: "treat_chemotherapy" },
  { id: "radiation_therapy", key: "treat_radiation_therapy" },
  { id: "cast_traction", key: "treat_cast_traction" },
  { id: "feeding_tube", key: "treat_feeding_tube" },
];

export default function RegisterPage() {
  const router = useRouter();
  const t = useT();
  const setUser = useSession((s) => s.setUser);
  const push = useToasts((s) => s.push);
  const [busy, setBusy] = useState(false);
  const [avatar, setAvatar] = useState("");
  const [name, setName] = useState("");
  const [canBeAdmin, setCanBeAdmin] = useState(false);
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [patientType, setPatientType] = useState<PatientType>("adult");
  const [conditions, setConditions] = useState<Set<Comorbidity>>(new Set());
  const [medications, setMedications] = useState<Set<MedicationClass>>(new Set());
  const [treatments, setTreatments] = useState<Set<Treatment>>(new Set());

  useEffect(() => {
    countAdmins().then((n) => setCanBeAdmin(n === 0));
  }, []);

  function toggle<T>(set: Set<T>, setSet: (s: Set<T>) => void, id: T) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSet(next);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData(e.currentTarget);
      const username = String(fd.get("username") ?? "").trim();
      if (!username) {
        push({ kind: "danger", title: t("register_username_required") });
        return;
      }
      const existing = (await listPatients()).find((p) => p.username === username);
      if (existing) {
        push({
          kind: "danger",
          title: t("register_username_taken"),
          body: t("register_username_taken_body"),
        });
        return;
      }
      const role: Patient["role"] = canBeAdmin && makeAdmin ? "admin" : "patient";
      const patient: Patient = {
        id: newId(),
        username,
        password: String(fd.get("password") ?? "") || undefined,
        name: String(fd.get("name") ?? username),
        avatar: avatar || undefined,
        email: String(fd.get("email") ?? "") || undefined,
        phone: String(fd.get("phone") ?? "") || undefined,
        age: Number(fd.get("age")) || undefined,
        sex: (fd.get("sex") as Patient["sex"]) || undefined,
        height: Number(fd.get("height")) || undefined,
        weight: Number(fd.get("weight")) || undefined,
        notes: String(fd.get("notes") ?? "") || undefined,
        patientType,
        conditions: Array.from(conditions),
        conditionsOther: String(fd.get("conditionsOther") ?? "") || undefined,
        medications: Array.from(medications),
        medicationsOther: String(fd.get("medicationsOther") ?? "") || undefined,
        treatments: Array.from(treatments),
        treatmentsOther: String(fd.get("treatmentsOther") ?? "") || undefined,
        role,
        createdAt: Date.now(),
        active: role === "patient",
      };
      await getDb().transaction("rw", getDb().patients, async () => {
        if (role === "patient") {
          await getDb().patients.toCollection().modify({ active: false });
        }
        await getDb().patients.put(patient);
      });
      setUser(patient);
      push({ kind: "ok", title: `${t("login_welcome")}, ${patient.name}` });
      router.push(role === "admin" ? "/admin" : "/dashboard");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass-panel p-8 sm:p-10"
      >
        <div className="mb-6 flex items-center gap-2.5">
          <Logo size={36} glow />
          <span className="text-sm font-semibold">
            UlcerShield <span className="text-gradient-brand">AI</span>
          </span>
        </div>
        <h1 className="font-semibold tracking-tight text-3xl">{t("register_title")}</h1>
        <p className="mt-1.5 text-sm text-[var(--c-text-2)]">{t("register_subtitle")}</p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface-2)] p-4">
            <AvatarUpload value={avatar} onChange={setAvatar} name={name} hint={t("ui_photo_hint")} />
          </div>

          {canBeAdmin && (
            <label className="sm:col-span-2 flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--c-primary-2)]/30 bg-[color-mix(in_oklab,var(--c-primary-2)_8%,transparent)] p-4">
              <input
                type="checkbox"
                checked={makeAdmin}
                onChange={(e) => setMakeAdmin(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[var(--c-primary-2)]"
              />
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--c-text)]">
                  <ShieldCheck className="h-4 w-4 text-[var(--c-primary-2)]" />
                  {t("register_as_admin")}
                </div>
                <div className="mt-1 text-xs text-[var(--c-text-2)]">
                  {t("register_as_admin_hint")}
                </div>
              </div>
            </label>
          )}

          {/* Patient type — Adult (13+) vs Kid (<13) */}
          <div className="sm:col-span-2">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">
              {t("reg_type")}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TypeCard
                active={patientType === "adult"}
                onClick={() => setPatientType("adult")}
                icon={<User className="h-5 w-5" />}
                title={t("reg_type_adult")}
                hint={t("reg_type_adult_hint")}
              />
              <TypeCard
                active={patientType === "kid"}
                onClick={() => setPatientType("kid")}
                icon={<Baby className="h-5 w-5" />}
                title={t("reg_type_kid")}
                hint={t("reg_type_kid_hint")}
              />
            </div>
          </div>

          <Field label={t("ui_username")}>
            <Input name="username" required autoComplete="username" />
          </Field>
          <Field label={t("ui_password")}>
            <Input name="password" type="password" autoComplete="new-password" />
          </Field>
          <Field label={t("ui_full_name")} className="sm:col-span-2">
            <Input
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label={t("ui_email")}>
            <Input name="email" type="email" />
          </Field>
          <Field label={t("ui_phone")}>
            <Input name="phone" type="tel" />
          </Field>
          <Field label={t("ui_age")}>
            <Input name="age" type="number" min={0} max={130} />
          </Field>
          <Field label={t("ui_sex")}>
            <Select name="sex" defaultValue="">
              <option value="">{t("ui_select")}</option>
              <option value="male">{t("ui_male")}</option>
              <option value="female">{t("ui_female")}</option>
              <option value="other">{t("ui_other")}</option>
            </Select>
          </Field>
          <Field label={t("ui_height")}>
            <Input name="height" type="number" min={0} max={260} />
          </Field>
          <Field label={t("ui_weight")}>
            <Input name="weight" type="number" min={0} max={500} step={0.1} />
          </Field>

          {/* Conditions */}
          <CheckboxGroup
            className="sm:col-span-2"
            title={t("reg_conditions")}
            hint={t("reg_conditions_hint")}
            items={CONDITIONS}
            selected={conditions}
            onToggle={(id) => toggle(conditions, setConditions, id)}
            otherName="conditionsOther"
            otherLabel={t("reg_other_conditions")}
          />

          {/* Medications */}
          <CheckboxGroup
            className="sm:col-span-2"
            title={t("reg_medications")}
            hint={t("reg_medications_hint")}
            items={MEDICATIONS}
            selected={medications}
            onToggle={(id) => toggle(medications, setMedications, id)}
            otherName="medicationsOther"
            otherLabel={t("reg_other_meds")}
          />

          {/* Treatments */}
          <CheckboxGroup
            className="sm:col-span-2"
            title={t("reg_treatments")}
            hint={t("reg_treatments_hint")}
            items={TREATMENTS}
            selected={treatments}
            onToggle={(id) => toggle(treatments, setTreatments, id)}
            otherName="treatmentsOther"
            otherLabel={t("reg_other_treat")}
          />

          <Field label={t("ui_notes")} className="sm:col-span-2">
            <Textarea name="notes" rows={3} placeholder={t("ui_notes_hint")} />
          </Field>
          <div className="sm:col-span-2 flex flex-wrap items-center justify-end gap-3 pt-2">
            <Link href="/login">
              <Button type="button" variant="ghost">{t("ui_cancel")}</Button>
            </Link>
            <Button type="submit" size="lg" disabled={busy} leftIcon={<UserPlus className="h-4 w-4" />}>
              {t("register_create")}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function TypeCard({
  active,
  onClick,
  icon,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200",
        active
          ? "border-[var(--c-primary-2)] bg-[color-mix(in_oklab,var(--c-primary-2)_12%,transparent)] shadow-[0_10px_30px_-10px_rgba(6,182,212,.45)]"
          : "border-[var(--c-border)] bg-[var(--c-surface-2)] hover:border-[var(--c-primary-2)]/40"
      )}
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
          active
            ? "bg-[var(--c-primary-2)] text-white"
            : "bg-[var(--c-surface)] text-[var(--c-text-2)]"
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-[11px] text-[var(--c-muted)]">{hint}</span>
      </span>
    </button>
  );
}

function CheckboxGroup<T extends string>({
  title,
  hint,
  items,
  selected,
  onToggle,
  otherName,
  otherLabel,
  className,
}: {
  title: string;
  hint: string;
  items: { id: T; key: DictKey }[];
  selected: Set<T>;
  onToggle: (id: T) => void;
  otherName: string;
  otherLabel: string;
  className?: string;
}) {
  const t = useT();
  return (
    <div className={className}>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--c-muted)]">
        {title}
      </div>
      <p className="mb-3 text-xs text-[var(--c-muted)]">{hint}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => {
          const active = selected.has(it.id);
          return (
            <label
              key={it.id}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
                active
                  ? "border-[var(--c-primary-2)]/50 bg-[color-mix(in_oklab,var(--c-primary-2)_10%,transparent)] text-[var(--c-text)]"
                  : "border-[var(--c-border)] bg-[var(--c-surface-2)] text-[var(--c-text-2)] hover:text-[var(--c-text)]"
              )}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => onToggle(it.id)}
                className="h-3.5 w-3.5 accent-[var(--c-primary-2)]"
              />
              <span className="truncate">{t(it.key)}</span>
            </label>
          );
        })}
      </div>
      <div className="mt-3">
        <Field label={otherLabel}>
          <Input name={otherName} placeholder={t("reg_other")} />
        </Field>
      </div>
    </div>
  );
}
