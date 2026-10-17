"use client";

import { create } from "zustand";

/**
 * Client for the ESP32-CAM bed camera (firmware/UlcerShieldCam).
 *
 * The camera serves control on port 80 and MJPEG on port 81 ("stream port =
 * control port + 1", so a test camera on :8099 streams on :8100). The browser
 * talks to it directly over the local network: Chrome lets an HTTPS page load
 * http:// from a private IP or a .local name once the user allows "local
 * network access", which it asks for on the first request. Nothing here
 * touches the network until Start is pressed, so that prompt always follows a
 * click.
 *
 * Recording is simulated: it shows a REC timer and lists clips with a
 * thumbnail, but no video is stored.
 */

export const DEFAULT_CAMERA_HOST = "ulcershield-cam.local";
const HOST_KEY = "us.camera.host";
const POLL_MS = 3000;
const MAX_CLIPS = 8;

export type CameraStatus = "off" | "starting" | "live" | "error";
export type CameraError = "unreachable" | "denied" | "busy" | "init_failed" | "lost";

export interface CameraInfo {
  fw: string;
  on: boolean;
  clients: number;
  fps: number;
  res: string;
  rssi: number;
  ip: string;
  ap: boolean;
  uptime: number;
}

export interface Clip {
  id: string;
  startedAt: number;
  durationS: number;
  thumb: string | null;
}

interface CameraState {
  host: string;
  status: CameraStatus;
  error: CameraError | null;
  /** True while Chrome's local-network permission prompt is likely showing. */
  awaitingPermission: boolean;
  info: CameraInfo | null;
  /** Changes on every start so the <img> opens a fresh stream. */
  streamKey: number;
  recordingSince: number | null;
  recordingThumb: string | null;
  clips: Clip[];

  setHost: (host: string) => void;
  start: () => Promise<void>;
  stop: () => void;
  streamFailed: () => void;
  startRecording: () => void;
  stopRecording: () => Clip | null;
}

/** Accepts "ulcershield-cam.local", "192.168.1.40", "http://192.168.1.40:8099/". */
export function cameraUrls(host: string) {
  const h = host.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "") || DEFAULT_CAMERA_HOST;
  const [name, portStr] = h.split(":");
  const port = Number(portStr) || 80;
  return {
    base: `http://${name}${port === 80 ? "" : `:${port}`}`,
    stream: `http://${name}:${port + 1}/stream`,
  };
}

class CamFail extends Error {
  constructor(public code: CameraError) {
    super(code);
  }
}

async function getJson<T>(url: string, timeoutMs: number): Promise<T> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (r.status >= 500) throw new CamFail("init_failed");
    return (await r.json()) as T;
  } finally {
    clearTimeout(id);
  }
}

/** Chrome 141+ exposes the local-network permission; other browsers return "unknown". */
async function localNetworkPermission(): Promise<PermissionState | "unknown"> {
  try {
    const p = await navigator.permissions.query({ name: "local-network-access" as PermissionName });
    return p.state;
  } catch {
    return "unknown";
  }
}

function readHost() {
  try {
    return localStorage.getItem(HOST_KEY) || DEFAULT_CAMERA_HOST;
  } catch {
    return DEFAULT_CAMERA_HOST;
  }
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let pollFailures = 0;

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

export const useCamera = create<CameraState>((set, get) => {
  function startPolling() {
    stopPolling();
    pollFailures = 0;
    pollTimer = setInterval(async () => {
      if (get().status !== "live") return stopPolling();
      try {
        const info = await getJson<CameraInfo>(`${cameraUrls(get().host).base}/status`, POLL_MS);
        pollFailures = 0;
        if (!info.on) {
          // Switched off from another screen or the camera's own page.
          get().stopRecording();
          stopPolling();
          set({ status: "off", info: null });
        } else {
          set({ info });
        }
      } catch {
        if (++pollFailures >= 2) {
          get().stopRecording();
          stopPolling();
          set({ status: "error", error: "lost", info: null });
        }
      }
    }, POLL_MS);
  }

  return {
    host: typeof window === "undefined" ? DEFAULT_CAMERA_HOST : readHost(),
    status: "off",
    error: null,
    awaitingPermission: false,
    info: null,
    streamKey: 0,
    recordingSince: null,
    recordingThumb: null,
    clips: [],

    setHost: (host) => {
      const clean = host.trim() || DEFAULT_CAMERA_HOST;
      try {
        localStorage.setItem(HOST_KEY, clean);
      } catch {}
      if (get().status === "live" || get().status === "starting") get().stop();
      set({ host: clean, error: null, status: get().status === "error" ? "off" : get().status });
    },

    start: async () => {
      if (get().status === "starting" || get().status === "live") return;
      const { base } = cameraUrls(get().host);
      const perm = await localNetworkPermission();
      if (perm === "denied") {
        set({ status: "error", error: "denied" });
        return;
      }
      set({ status: "starting", error: null, awaitingPermission: perm === "prompt" });
      try {
        // Generous timeout: Chrome holds the request while its permission prompt is open.
        const ctrl = await getJson<{ on: boolean }>(`${base}/control?camera=on`, 30000);
        if (!ctrl.on) throw new CamFail("init_failed");
        const info = await getJson<CameraInfo>(`${base}/status`, 5000);
        if (info.clients > 0) throw new CamFail("busy");
        set({ status: "live", info, awaitingPermission: false, streamKey: Date.now() });
        startPolling();
      } catch (e) {
        const code: CameraError =
          e instanceof CamFail
            ? e.code
            : (await localNetworkPermission()) === "denied"
            ? "denied"
            : "unreachable";
        set({ status: "error", error: code, awaitingPermission: false, info: null });
      }
    },

    stop: () => {
      get().stopRecording();
      stopPolling();
      const wasOn = get().status === "live" || get().status === "starting";
      set({ status: "off", info: null, error: null, awaitingPermission: false }); // unmounts the stream
      if (wasOn) fetch(`${cameraUrls(get().host).base}/control?camera=off`, { cache: "no-store" }).catch(() => {});
    },

    streamFailed: () => {
      if (get().status !== "live") return;
      get().stopRecording();
      stopPolling();
      set({ status: "error", error: "lost", info: null });
    },

    startRecording: () => {
      if (get().status !== "live" || get().recordingSince) return;
      set({ recordingSince: Date.now(), recordingThumb: null });
      // Grab one still for the clip list.
      fetch(`${cameraUrls(get().host).base}/capture`, { cache: "no-store" })
        .then((r) => (r.ok ? r.blob() : null))
        .then((b) => {
          if (b && get().recordingSince) set({ recordingThumb: URL.createObjectURL(b) });
        })
        .catch(() => {});
    },

    stopRecording: () => {
      const { recordingSince, recordingThumb, clips } = get();
      if (!recordingSince) return null;
      const clip: Clip = {
        id: `${recordingSince}`,
        startedAt: recordingSince,
        durationS: Math.max(1, Math.round((Date.now() - recordingSince) / 1000)),
        thumb: recordingThumb,
      };
      const next = [clip, ...clips];
      for (const old of next.slice(MAX_CLIPS)) if (old.thumb) URL.revokeObjectURL(old.thumb);
      set({ recordingSince: null, recordingThumb: null, clips: next.slice(0, MAX_CLIPS) });
      return clip;
    },
  };
});
