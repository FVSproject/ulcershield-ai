"use client";

import Dexie, { type Table } from "dexie";

export type Role = "patient" | "admin";
export type PatientType = "adult" | "baby";

/** Well-known comorbidities the algorithm knows how to weight. */
export type Comorbidity =
  | "diabetes"
  | "peripheral_vascular"
  | "cardiac"
  | "renal"
  | "malnutrition"
  | "neuropathy_or_sci"
  | "incontinence"
  | "dementia"
  | "cancer_active";

/** Well-known medication categories the algorithm knows how to weight. */
export type MedicationClass =
  | "corticosteroids"
  | "vasoconstrictors"
  | "anticoagulants"
  | "chronic_sedatives"
  | "nsaids";

/** Well-known treatments the algorithm knows how to weight. */
export type Treatment =
  | "mechanical_ventilation"
  | "dialysis"
  | "chemotherapy"
  | "radiation_therapy"
  | "cast_traction"
  | "feeding_tube";

export interface Patient {
  id: string;
  username: string;
  password?: string;
  name: string;
  avatar?: string;
  email?: string;
  phone?: string;
  age?: number;
  sex?: "male" | "female" | "other";
  height?: number;
  weight?: number;
  notes?: string;
  role?: Role; // undefined ⇒ 'patient'
  patientType?: PatientType; // undefined ⇒ 'adult'
  conditions?: Comorbidity[]; // checkbox list
  conditionsOther?: string; // free-text "any other issue"
  medications?: MedicationClass[]; // checkbox list
  medicationsOther?: string; // free-text
  treatments?: Treatment[]; // checkbox list
  treatmentsOther?: string; // free-text
  createdAt: number;
  active?: boolean;
}

export interface LogRow {
  id?: number;
  patientId: string;
  ts: number;
  uptimeS: number;
  leftMmhg: number;
  rightMmhg: number;
  cop: number;
  turns: number;
  bodyC: number | null;
  humidity: number | null;
  risk: number;
  occupied: 0 | 1;
}

class UsDb extends Dexie {
  patients!: Table<Patient, string>;
  logs!: Table<LogRow, number>;

  constructor() {
    super("ulcershield-ai");
    this.version(1).stores({
      patients: "id, username, active, createdAt",
      logs: "++id, patientId, ts, [patientId+ts]",
    });
    this.version(2)
      .stores({
        patients: "id, username, active, createdAt, role",
        logs: "++id, patientId, ts, [patientId+ts]",
      })
      .upgrade(async (tx) => {
        await tx.table("patients").toCollection().modify((p: Patient) => {
          if (!p.role) p.role = "patient";
        });
      });
    // v3: personalization fields
    this.version(3)
      .stores({
        patients: "id, username, active, createdAt, role, patientType",
        logs: "++id, patientId, ts, [patientId+ts]",
      })
      .upgrade(async (tx) => {
        await tx.table("patients").toCollection().modify((p: Patient) => {
          if (!p.patientType) p.patientType = "adult";
          if (!p.conditions) p.conditions = [];
          if (!p.medications) p.medications = [];
          if (!p.treatments) p.treatments = [];
        });
      });
  }
}

let _db: UsDb | null = null;
export function getDb(): UsDb {
  if (typeof window === "undefined") throw new Error("db is browser-only");
  if (!_db) _db = new UsDb();
  return _db;
}

export function roleOf(p: Patient | null | undefined): Role {
  return p?.role ?? "patient";
}
export function isAdmin(p: Patient | null | undefined): boolean {
  return roleOf(p) === "admin";
}
export function patientTypeOf(p: Patient | null | undefined): PatientType {
  return p?.patientType ?? "adult";
}

export async function listPatients(): Promise<Patient[]> {
  return getDb().patients.orderBy("createdAt").reverse().toArray();
}

export async function listPatientRoster(): Promise<Patient[]> {
  const all = await listPatients();
  return all.filter((p) => roleOf(p) === "patient");
}

export async function countAdmins(): Promise<number> {
  const all = await listPatients();
  return all.filter((p) => roleOf(p) === "admin").length;
}

export async function getPatient(id: string) {
  return getDb().patients.get(id);
}

export async function upsertPatient(p: Patient) {
  await getDb().patients.put(p);
}

export async function deletePatient(id: string) {
  await getDb().patients.delete(id);
  await getDb().logs.where("patientId").equals(id).delete();
}

export async function setActive(id: string) {
  const db = getDb();
  await db.transaction("rw", db.patients, async () => {
    await db.patients.toCollection().modify({ active: false });
    await db.patients.update(id, { active: true });
  });
}

export async function getActive(): Promise<Patient | undefined> {
  return getDb().patients.filter((p) => !!p.active).first();
}

export async function appendLog(row: Omit<LogRow, "id">) {
  return getDb().logs.add(row);
}

export async function getLogs(patientId: string, from?: number, to?: number): Promise<LogRow[]> {
  const db = getDb();
  const t = db.logs.where("[patientId+ts]");
  if (from && to) return t.between([patientId, from], [patientId, to]).toArray();
  return db.logs.where("patientId").equals(patientId).sortBy("ts");
}

export async function getLatestLog(patientId: string): Promise<LogRow | undefined> {
  return getDb().logs.where("patientId").equals(patientId).last();
}

export async function countLogs(patientId: string): Promise<number> {
  return getDb().logs.where("patientId").equals(patientId).count();
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
