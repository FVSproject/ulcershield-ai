"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  Html,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Layers } from "lucide-react";
import { useSensorStore } from "@/lib/store";
import { computeTwin, type Anatomy } from "@/lib/tissue-twin";
import { RISK_COLORS } from "@/types/sensor";
import { useT } from "@/lib/i18n";
import { REGION_LABEL_KEY } from "@/lib/twin-labels";
import { useViewing } from "@/lib/viewing";
import { patientTypeOf, type PatientType } from "@/lib/db";

const MODEL_PATH = "/models/body.glb";

/**
 * Digital Tissue Twin — 3D body view.
 *
 * Renders an anatomical medical mannequin lying supine on a hospital bed with
 * live pressure hotspots at the six vulnerable regions. Uses no textures,
 * no clothing, no game-character stylings — a neutral clinical body suitable
 * for a medical dashboard. If a custom GLB is dropped in at
 * `public/models/body.glb`, it will be loaded and used instead.
 */
export function Body3D() {
  const state = useSensorStore((s) => s.state);
  const patient = useViewing((s) => s.viewing);
  const twin = computeTwin(state, patient);
  const t = useT();
  const patientType = patientTypeOf(patient);
  // Labels are opt-in: they're helpful when the user wants to identify a
  // region, but they cover the body when always on. Toggle with the "Show
  // labels" button. The primary region is always visible.
  const [showLabels, setShowLabels] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[var(--c-primary-2)]" />
          {t("b3_title")}
        </CardTitle>
        <Badge tone={patientType === "baby" ? "warn" : "brand"}>
          {patientType === "baby" ? t("b3_pill_baby") : t("b3_pill")}
        </Badge>
      </CardHeader>
      <CardBody className="space-y-3">
        <div className="relative h-[500px] overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,.12),transparent_60%),linear-gradient(180deg,var(--c-surface-2)_0%,var(--c-surface)_100%)]">
          <Canvas
            key={resetKey}
            shadows={{ type: THREE.VSMShadowMap }}
            camera={{ position: [1.6, 1.9, 3.2], fov: 32 }}
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
          >
            <ambientLight intensity={0.55} />
            <hemisphereLight args={["#f0f7ff", "#0b1e33", 0.7]} />
            <directionalLight
              position={[4, 8, 4]}
              intensity={1.4}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-bias={-0.0005}
            />
            <spotLight
              position={[-4, 5, 2]}
              intensity={0.6}
              angle={0.6}
              penumbra={0.7}
              color="#c7ecff"
            />
            <pointLight position={[2, 0.6, 2]} intensity={0.3} color="#ffe4c4" />

            <Scene twin={twin} showLabels={showLabels} patientType={patientType} />

            <ContactShadows
              position={[0, -0.66, 0]}
              opacity={0.45}
              scale={6}
              blur={2.4}
              far={2}
              color="#000"
            />
            <Environment preset="studio" />
            <OrbitControls
              enablePan={false}
              minDistance={2.0}
              maxDistance={7}
              maxPolarAngle={Math.PI / 1.85}
              target={[0, -0.3, 0]}
            />
          </Canvas>

          <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-center justify-between gap-2">
            <div className="pointer-events-auto flex flex-wrap items-center gap-2">
              <span className="rounded-full glass px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest">
                {t("b3_supine")}
              </span>
              {twin && (
                <span
                  className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest"
                  style={{
                    background: `color-mix(in oklab, ${RISK_COLORS[twin.overall.band]} 15%, transparent)`,
                    color: RISK_COLORS[twin.overall.band],
                  }}
                >
                  {t("b3_overall")} ·{" "}
                  {
                    {
                      low: t("rtr_low"),
                      moderate: t("rtr_moderate"),
                      high: t("rtr_high"),
                      critical: t("rtr_critical"),
                    }[twin.overall.band]
                  }
                </span>
              )}
            </div>
            <div className="pointer-events-auto flex items-center gap-1.5">
              <button
                onClick={() => setShowLabels((v) => !v)}
                className="rounded-full glass px-2.5 py-1 text-[10px] font-medium transition-transform hover:-translate-y-0.5"
              >
                {showLabels ? t("b3_hide") : t("b3_show")}
              </button>
              <button
                onClick={() => setResetKey((k) => k + 1)}
                className="grid h-7 w-7 place-items-center rounded-full glass transition-transform hover:-translate-y-0.5"
                aria-label={t("b3_reset")}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-2 text-[10px]">
            {(
              [
                ["low", t("rtr_low")],
                ["moderate", t("rtr_moderate")],
                ["high", t("rtr_high")],
                ["critical", t("rtr_critical")],
              ] as const
            ).map(([band, label]) => (
              <span
                key={band}
                className="rounded-full glass px-2.5 py-1 font-medium"
                style={{ color: RISK_COLORS[band] }}
              >
                <span
                  className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
                  style={{ background: RISK_COLORS[band] }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-[var(--c-muted)]">{t("b3_hint")}</p>
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------------------- */
/* Scene                                                                       */
/* ------------------------------------------------------------------------- */

interface SceneProps {
  twin: ReturnType<typeof computeTwin>;
  showLabels: boolean;
  patientType: PatientType;
}

function Scene({ twin, showLabels, patientType }: SceneProps) {
  const t = useT();
  const regions: Anatomy[] =
    patientType === "baby"
      ? ["occiput", "shoulders", "sacrum", "leftHip", "rightHip", "leftHeel", "rightHeel"]
      : ["shoulders", "sacrum", "leftHip", "rightHip", "leftHeel", "rightHeel"];
  const byRegion = useMemo(() => {
    const m = new Map<Anatomy, { score: number; band: "low" | "moderate" | "high" | "critical" }>();
    for (const r of twin?.regions ?? []) m.set(r.region, r);
    return m;
  }, [twin]);

  const HOTS = patientType === "baby" ? HOTSPOT_POS_BABY : HOTSPOT_POS;
  const OFFS = patientType === "baby" ? LABEL_OFFSETS_BABY : LABEL_OFFSETS;

  return (
    <group>
      <Bed patientType={patientType} />
      <Pillow patientType={patientType} />
      <BodyAuto patientType={patientType} />
      {regions.map((region) => {
        const info = byRegion.get(region);
        return (
          <Hotspot
            key={region}
            position={HOTS[region]}
            labelOffset={OFFS[region]}
            score={info?.score ?? 0}
            band={info?.band ?? "low"}
            label={t(REGION_LABEL_KEY[region])}
            showLabel={showLabels}
          />
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------------- */
/* Bed + pillow                                                               */
/* ------------------------------------------------------------------------- */

function Bed({ patientType }: { patientType: PatientType }) {
  // Cot for babies — narrower, with side rails hinted.
  const w = patientType === "baby" ? 1.4 : 2.4;
  const d = patientType === "baby" ? 0.7 : 1.0;
  return (
    <group position={[0, -0.7, 0]}>
      <mesh receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[w, 0.14, d]} />
        <meshStandardMaterial color="#f4f7fb" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[w + 0.04, 0.06, d + 0.04]} />
        <meshStandardMaterial color="#dfe8f4" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.14, 0]}>
        <boxGeometry args={[w + 0.1, 0.14, d + 0.1]} />
        <meshStandardMaterial color="#0e2540" roughness={0.7} metalness={0.2} />
      </mesh>
    </group>
  );
}

function Pillow({ patientType }: { patientType: PatientType }) {
  if (patientType === "baby") {
    // Very small support beneath the head — babies typically shouldn't have pillows.
    return (
      <mesh position={[-0.5, -0.61, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.16, 0.03, 0.22]} />
        <meshStandardMaterial color="#ffffff" roughness={0.95} />
      </mesh>
    );
  }
  return (
    <mesh position={[-0.98, -0.55, 0]} receiveShadow castShadow>
      <boxGeometry args={[0.32, 0.08, 0.5]} />
      <meshStandardMaterial color="#ffffff" roughness={0.95} />
    </mesh>
  );
}

/* ------------------------------------------------------------------------- */
/* Body — HEAD probe pattern: prefer user-supplied GLB if present, else       */
/* the anatomical mannequin. Babies always use the procedural baby mannequin.  */
/* ------------------------------------------------------------------------- */

function BodyAuto({ patientType }: { patientType: PatientType }) {
  const [status, setStatus] = useState<"probing" | "have" | "missing">("probing");

  useEffect(() => {
    if (patientType === "baby") {
      setStatus("missing");
      return;
    }
    let cancelled = false;
    fetch(MODEL_PATH, { method: "HEAD" })
      .then((r) => {
        if (cancelled) return;
        setStatus(r.ok ? "have" : "missing");
      })
      .catch(() => {
        if (!cancelled) setStatus("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [patientType]);

  if (patientType === "baby") return <AnatomicalBaby />;
  if (status === "probing") return null;
  if (status === "missing") return <AnatomicalBody />;

  return (
    <Suspense fallback={<AnatomicalBody />}>
      <GLBBody />
    </Suspense>
  );
}

function GLBBody() {
  const { scene } = useGLTF(MODEL_PATH);
  const cloned = useMemo(() => {
    const s = scene.clone(true);
    s.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = false;
      }
    });
    return s;
  }, [scene]);
  return (
    <group rotation={[0, Math.PI / 2, 0]} position={[0.82, -0.5, 0]} scale={1.05}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------------- */
/* Anatomical Mannequin — supine, medical aesthetic                            */
/*                                                                             */
/* World frame:                                                                */
/*   +X  →  from head toward feet                                              */
/*   +Y  →  up (away from bed)                                                 */
/*   +Z  →  patient's LEFT                                                     */
/*                                                                             */
/* Everything is placed directly in supine coordinates — no rotation of a      */
/* standing model. Uses medically-inspired proportions (adult ~1.7 m).         */
/* ------------------------------------------------------------------------- */

function AnatomicalBody() {
  // Matte medical-mannequin skin (like a resuscitation training dummy —
  // neutral, warm-tan, low specular). All body meshes share this so the
  // segments read as one continuous form.
  const skin = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#d9b89a"),
        roughness: 0.85,
        metalness: 0,
        flatShading: false,
      }),
    []
  );
  // Slightly darker for shading contours (subtle anatomical definition).
  const shade = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#c69a7d"),
        roughness: 0.9,
        metalness: 0,
      }),
    []
  );

  // Y level for the top of the mattress (where the body rests on its back).
  const yBed = -0.63;
  // How high the body's centerline sits above the mattress (torso is ~0.11 thick).
  const yBack = yBed + 0.05;

  return (
    <group>
      {/* Head — ellipsoid, slightly elongated toward feet direction, chin tucked */}
      <mesh castShadow material={skin} position={[-0.83, yBack + 0.08, 0]}>
        <sphereGeometry args={[0.11, 40, 32]} />
      </mesh>
      {/* Ears (subtle) */}
      <mesh castShadow material={shade} position={[-0.83, yBack + 0.09, -0.11]}>
        <sphereGeometry args={[0.025, 16, 12]} />
      </mesh>
      <mesh castShadow material={shade} position={[-0.83, yBack + 0.09, 0.11]}>
        <sphereGeometry args={[0.025, 16, 12]} />
      </mesh>

      {/* Neck */}
      <mesh
        castShadow
        material={skin}
        position={[-0.72, yBack + 0.04, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.062, 0.07, 0.1, 24]} />
      </mesh>

      {/* Upper torso / chest — capsule, wider at shoulders */}
      <mesh
        castShadow
        material={skin}
        position={[-0.5, yBack + 0.02, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <capsuleGeometry args={[0.19, 0.28, 20, 32]} />
      </mesh>
      {/* Sternum ridge — very subtle */}
      <mesh castShadow material={shade} position={[-0.5, yBack + 0.16, 0]}>
        <boxGeometry args={[0.28, 0.005, 0.02]} />
      </mesh>

      {/* Abdomen — slightly narrower */}
      <mesh
        castShadow
        material={skin}
        position={[-0.16, yBack + 0.005, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <capsuleGeometry args={[0.155, 0.24, 20, 32]} />
      </mesh>

      {/* Pelvis / hips — broader capsule */}
      <mesh
        castShadow
        material={skin}
        position={[0.14, yBack, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <capsuleGeometry args={[0.17, 0.14, 20, 32]} />
      </mesh>

      {/* Shoulders — round capsules meeting the torso */}
      <mesh castShadow material={skin} position={[-0.66, yBack + 0.03, -0.22]}>
        <sphereGeometry args={[0.1, 28, 20]} />
      </mesh>
      <mesh castShadow material={skin} position={[-0.66, yBack + 0.03, 0.22]}>
        <sphereGeometry args={[0.1, 28, 20]} />
      </mesh>

      {/* Upper arms — at sides, palms slightly down */}
      <mesh
        castShadow
        material={skin}
        position={[-0.4, yBack - 0.02, -0.25]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <capsuleGeometry args={[0.06, 0.28, 12, 24]} />
      </mesh>
      <mesh
        castShadow
        material={skin}
        position={[-0.4, yBack - 0.02, 0.25]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <capsuleGeometry args={[0.06, 0.28, 12, 24]} />
      </mesh>

      {/* Elbows (slight bulges) */}
      <mesh castShadow material={skin} position={[-0.16, yBack - 0.03, -0.26]}>
        <sphereGeometry args={[0.062, 20, 14]} />
      </mesh>
      <mesh castShadow material={skin} position={[-0.16, yBack - 0.03, 0.26]}>
        <sphereGeometry args={[0.062, 20, 14]} />
      </mesh>

      {/* Forearms — thinner */}
      <mesh
        castShadow
        material={skin}
        position={[0.08, yBack - 0.04, -0.26]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <capsuleGeometry args={[0.05, 0.24, 12, 24]} />
      </mesh>
      <mesh
        castShadow
        material={skin}
        position={[0.08, yBack - 0.04, 0.26]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <capsuleGeometry args={[0.05, 0.24, 12, 24]} />
      </mesh>

      {/* Wrists */}
      <mesh castShadow material={skin} position={[0.28, yBack - 0.04, -0.26]}>
        <sphereGeometry args={[0.048, 20, 14]} />
      </mesh>
      <mesh castShadow material={skin} position={[0.28, yBack - 0.04, 0.26]}>
        <sphereGeometry args={[0.048, 20, 14]} />
      </mesh>

      {/* Hands — subtle, palm-down */}
      <mesh
        castShadow
        material={skin}
        position={[0.38, yBack - 0.05, -0.26]}
        rotation={[0, 0, 0]}
      >
        <boxGeometry args={[0.14, 0.05, 0.09]} />
      </mesh>
      <mesh
        castShadow
        material={skin}
        position={[0.38, yBack - 0.05, 0.26]}
        rotation={[0, 0, 0]}
      >
        <boxGeometry args={[0.14, 0.05, 0.09]} />
      </mesh>

      {/* Upper legs / thighs */}
      <mesh
        castShadow
        material={skin}
        position={[0.42, yBack - 0.01, -0.09]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <capsuleGeometry args={[0.095, 0.32, 16, 28]} />
      </mesh>
      <mesh
        castShadow
        material={skin}
        position={[0.42, yBack - 0.01, 0.09]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <capsuleGeometry args={[0.095, 0.32, 16, 28]} />
      </mesh>

      {/* Knees (patella bulges) */}
      <mesh castShadow material={skin} position={[0.68, yBack - 0.02, -0.1]}>
        <sphereGeometry args={[0.088, 20, 16]} />
      </mesh>
      <mesh castShadow material={skin} position={[0.68, yBack - 0.02, 0.1]}>
        <sphereGeometry args={[0.088, 20, 16]} />
      </mesh>

      {/* Lower legs / calves */}
      <mesh
        castShadow
        material={skin}
        position={[0.93, yBack - 0.04, -0.11]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <capsuleGeometry args={[0.072, 0.3, 16, 24]} />
      </mesh>
      <mesh
        castShadow
        material={skin}
        position={[0.93, yBack - 0.04, 0.11]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <capsuleGeometry args={[0.072, 0.3, 16, 24]} />
      </mesh>

      {/* Ankles (small bulges) */}
      <mesh castShadow material={skin} position={[1.12, yBack - 0.05, -0.11]}>
        <sphereGeometry args={[0.055, 20, 14]} />
      </mesh>
      <mesh castShadow material={skin} position={[1.12, yBack - 0.05, 0.11]}>
        <sphereGeometry args={[0.055, 20, 14]} />
      </mesh>

      {/* Feet — pointing up (toes toward +Y). Slightly wider at the toe box. */}
      <group position={[1.18, yBack - 0.02, -0.11]}>
        <mesh castShadow material={skin}>
          <boxGeometry args={[0.11, 0.14, 0.08]} />
        </mesh>
      </group>
      <group position={[1.18, yBack - 0.02, 0.11]}>
        <mesh castShadow material={skin}>
          <boxGeometry args={[0.11, 0.14, 0.08]} />
        </mesh>
      </group>

      {/* Hospital sheet across the pelvis + upper thighs (subtle, respects modesty) */}
      <mesh castShadow position={[0.22, yBack + 0.16, 0]}>
        <boxGeometry args={[0.5, 0.02, 0.5]} />
        <meshStandardMaterial color="#e6f0fa" roughness={0.95} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------------- */
/* Anatomical BABY mannequin (~50 cm long, supine, in a cot)                   */
/*                                                                             */
/* Neonatal proportions: head:body ≈ 1:4 (vs 1:8 in adults). Chubby, rounded   */
/* limbs. Diaper. Occiput is deliberately made prominent — it is the #1        */
/* pressure landmark in infants (Baharestani 2007).                            */
/* ------------------------------------------------------------------------- */

function AnatomicalBaby() {
  const skin = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#f2cbb0"), // slightly pinker than adult
        roughness: 0.88,
      }),
    []
  );
  const diaper = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#fefefe"),
        roughness: 0.96,
      }),
    []
  );

  const yBed = -0.63;
  const yBack = yBed + 0.04;

  return (
    <group>
      {/* Head — proportionally huge (1:4 body ratio). Occiput is highlighted. */}
      <mesh castShadow material={skin} position={[-0.5, yBack + 0.06, 0]}>
        <sphereGeometry args={[0.11, 40, 32]} />
      </mesh>
      {/* Ears */}
      <mesh castShadow material={skin} position={[-0.5, yBack + 0.07, -0.1]}>
        <sphereGeometry args={[0.02, 12, 10]} />
      </mesh>
      <mesh castShadow material={skin} position={[-0.5, yBack + 0.07, 0.1]}>
        <sphereGeometry args={[0.02, 12, 10]} />
      </mesh>

      {/* Neck — barely visible in newborns */}
      <mesh castShadow material={skin} position={[-0.38, yBack + 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.06, 0.06, 20]} />
      </mesh>

      {/* Chubby torso — one continuous capsule */}
      <mesh castShadow material={skin} position={[-0.15, yBack + 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.13, 0.28, 20, 32]} />
      </mesh>

      {/* Shoulders (rounded, low-set) */}
      <mesh castShadow material={skin} position={[-0.29, yBack + 0.03, -0.12]}>
        <sphereGeometry args={[0.065, 24, 18]} />
      </mesh>
      <mesh castShadow material={skin} position={[-0.29, yBack + 0.03, 0.12]}>
        <sphereGeometry args={[0.065, 24, 18]} />
      </mesh>

      {/* Arms — short and chubby */}
      <mesh castShadow material={skin} position={[-0.16, yBack + 0.0, -0.16]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.04, 0.16, 12, 18]} />
      </mesh>
      <mesh castShadow material={skin} position={[-0.16, yBack + 0.0, 0.16]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.04, 0.16, 12, 18]} />
      </mesh>
      {/* Hands (fists) */}
      <mesh castShadow material={skin} position={[-0.02, yBack - 0.02, -0.16]}>
        <sphereGeometry args={[0.035, 20, 14]} />
      </mesh>
      <mesh castShadow material={skin} position={[-0.02, yBack - 0.02, 0.16]}>
        <sphereGeometry args={[0.035, 20, 14]} />
      </mesh>

      {/* Diaper (covers pelvis + upper thighs) */}
      <mesh castShadow material={diaper} position={[0.05, yBack + 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.1, 0.12, 20, 32]} />
      </mesh>

      {/* Legs — short, slightly bent outward (frog-leg newborn pose) */}
      <mesh castShadow material={skin} position={[0.22, yBack - 0.01, -0.07]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.055, 0.18, 16, 24]} />
      </mesh>
      <mesh castShadow material={skin} position={[0.22, yBack - 0.01, 0.07]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.055, 0.18, 16, 24]} />
      </mesh>
      {/* Knees */}
      <mesh castShadow material={skin} position={[0.36, yBack - 0.02, -0.07]}>
        <sphereGeometry args={[0.05, 20, 14]} />
      </mesh>
      <mesh castShadow material={skin} position={[0.36, yBack - 0.02, 0.07]}>
        <sphereGeometry args={[0.05, 20, 14]} />
      </mesh>
      {/* Lower legs */}
      <mesh castShadow material={skin} position={[0.48, yBack - 0.03, -0.07]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.045, 0.16, 12, 20]} />
      </mesh>
      <mesh castShadow material={skin} position={[0.48, yBack - 0.03, 0.07]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.045, 0.16, 12, 20]} />
      </mesh>
      {/* Feet */}
      <mesh castShadow material={skin} position={[0.58, yBack - 0.03, -0.07]}>
        <boxGeometry args={[0.08, 0.08, 0.06]} />
      </mesh>
      <mesh castShadow material={skin} position={[0.58, yBack - 0.03, 0.07]}>
        <boxGeometry args={[0.08, 0.08, 0.06]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------------- */
/* Hotspot + smart label positioning                                           */
/* ------------------------------------------------------------------------- */

// Anatomical positions in WORLD coords for the ADULT supine mannequin.
//   X : -0.83 (head) → +1.18 (feet)   Y : bed top ≈ -0.63   Z : LEFT = +Z, RIGHT = -Z
const HOTSPOT_POS: Record<Anatomy, [number, number, number]> = {
  occiput: [-0.83, -0.45, 0.0],
  shoulders: [-0.6, -0.42, 0.0],
  sacrum: [0.14, -0.45, 0.0],
  leftHip: [0.14, -0.45, 0.14],
  rightHip: [0.14, -0.45, -0.14],
  leftHeel: [1.16, -0.6, 0.11],
  rightHeel: [1.16, -0.6, -0.11],
};
// Push labels well outside the body silhouette (roughly 2× the body's
// half-width in Z, and above the top of the body in Y) so they never
// overlap the mannequin.
const LABEL_OFFSETS: Record<Anatomy, [number, number, number]> = {
  occiput: [-0.55, 0.55, 0.6],
  shoulders: [-0.55, 0.55, -0.6],
  sacrum: [0.0, 0.65, 0.75],
  leftHip: [0.15, 0.4, 0.7],
  rightHip: [0.15, 0.4, -0.7],
  leftHeel: [0.6, 0.35, 0.6],
  rightHeel: [0.6, 0.35, -0.6],
};

// BABY mannequin is ~50 cm long, larger head, cot-scaled.
//   X : -0.50 (head) → +0.55 (feet)   Y : bed top ≈ -0.63
const HOTSPOT_POS_BABY: Record<Anatomy, [number, number, number]> = {
  occiput: [-0.5, -0.5, 0.0],
  shoulders: [-0.3, -0.5, 0.0],
  sacrum: [0.03, -0.52, 0.0],
  leftHip: [0.03, -0.52, 0.09],
  rightHip: [0.03, -0.52, -0.09],
  leftHeel: [0.55, -0.6, 0.07],
  rightHeel: [0.55, -0.6, -0.07],
};
const LABEL_OFFSETS_BABY: Record<Anatomy, [number, number, number]> = {
  occiput: [-0.4, 0.4, 0.4],
  shoulders: [-0.4, 0.4, -0.4],
  sacrum: [0.0, 0.45, 0.48],
  leftHip: [0.1, 0.32, 0.45],
  rightHip: [0.1, 0.32, -0.45],
  leftHeel: [0.4, 0.28, 0.4],
  rightHeel: [0.4, 0.28, -0.4],
};

interface HotspotProps {
  position: [number, number, number];
  labelOffset: [number, number, number];
  score: number;
  band: "low" | "moderate" | "high" | "critical";
  label: string;
  showLabel: boolean;
}

function Hotspot({ position, labelOffset, score, band, label, showLabel }: HotspotProps) {
  const dotRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const color = new THREE.Color(BAND_HEX[band]);
  const mag = Math.min(1, score / 100);
  const baseR = 0.04 + mag * 0.025;
  const glowR = 0.09 + mag * 0.07;
  const speed = 1.4 + mag * 3.5;

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed;
    if (glowRef.current) {
      const s = 1 + Math.sin(t) * 0.18;
      glowRef.current.scale.setScalar(s);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.25 + Math.max(0, Math.sin(t)) * 0.2;
    }
    if (dotRef.current) {
      const s = 1 + Math.sin(t) * 0.06;
      dotRef.current.scale.setScalar(s);
    }
  });

  return (
    <group position={position}>
      <mesh ref={glowRef}>
        <sphereGeometry args={[glowR, 24, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <mesh ref={dotRef}>
        <sphereGeometry args={[baseR, 24, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.9}
          roughness={0.3}
        />
      </mesh>

      {/* Leader line from hotspot to label */}
      {showLabel && (
        <line>
          <bufferGeometry
            attach="geometry"
            onUpdate={(g) => {
              const positions = new Float32Array([0, 0, 0, ...labelOffset]);
              g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
            }}
          />
          <lineBasicMaterial attach="material" color={color} transparent opacity={0.55} />
        </line>
      )}

      {showLabel && (
        <Html
          position={labelOffset}
          center
          style={{ pointerEvents: "none" }}
          distanceFactor={9}
          zIndexRange={[10, 0]}
          occlude="blending"
        >
          <div
            className="whitespace-nowrap rounded-full border border-white/20 bg-[color-mix(in_oklab,var(--c-surface)_85%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--c-text)] shadow-md backdrop-blur-sm"
            style={{ borderColor: BAND_HEX[band] + "aa", color: BAND_HEX[band] }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full align-middle"
              style={{ background: BAND_HEX[band] }}
            />{" "}
            <span className="align-middle">{label}</span>
            <span className="ml-1 align-middle text-[var(--c-text-2)] num">{score}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

const BAND_HEX: Record<"low" | "moderate" | "high" | "critical", string> = {
  low: "#10b981",
  moderate: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

// We deliberately do NOT preload the GLB — it may not exist. The HEAD-probe
// pattern in BodyAuto() decides whether to load it or fall back to the
// procedural anatomical mannequin. Preloading here would trigger a noisy
// 404 in the console on every page load.
