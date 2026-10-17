"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Circle, Loader2, Settings2, Square, Video, VideoOff, Wifi } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToasts } from "@/components/ui/toast";
import { useT, type DictKey } from "@/lib/i18n";
import { DEFAULT_CAMERA_HOST, cameraUrls, useCamera, type CameraError } from "@/lib/camera";

const ERROR_KEY: Record<CameraError, DictKey> = {
  unreachable: "lf_err_unreachable",
  denied: "lf_err_denied",
  busy: "lf_err_busy",
  init_failed: "lf_err_init",
  lost: "lf_err_lost",
};

function mmss(totalS: number) {
  const m = Math.floor(totalS / 60);
  const s = totalS % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function LiveFeed() {
  const t = useT();
  const push = useToasts((s) => s.push);
  const cam = useCamera();
  const [showSettings, setShowSettings] = useState(false);
  const [draftHost, setDraftHost] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const live = cam.status === "live";
  const recording = cam.recordingSince != null;

  // Tick the REC timer.
  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [recording]);

  function toggleRecording() {
    if (!live) {
      push({ kind: "info", title: t("lf_title"), body: t("lf_rec_needs_live") });
      return;
    }
    if (!recording) {
      setNow(Date.now());
      cam.startRecording();
      return;
    }
    const clip = cam.stopRecording();
    if (clip) push({ kind: "ok", title: t("lf_saved_toast"), body: mmss(clip.durationS) });
  }

  function openSettings() {
    setDraftHost(cam.host);
    setShowSettings((v) => !v);
  }

  function saveHost(e: React.FormEvent) {
    e.preventDefault();
    cam.setHost(draftHost);
    setShowSettings(false);
  }

  const badge =
    cam.status === "live" ? (
      <Badge tone="danger" dot>
        {t("lf_live")}
      </Badge>
    ) : cam.status === "starting" ? (
      <Badge tone="brand">{t("lf_connecting")}</Badge>
    ) : cam.status === "error" ? (
      <Badge tone="warn" dot>
        {t("lf_error_badge")}
      </Badge>
    ) : (
      <Badge tone="neutral">{t("lf_off")}</Badge>
    );

  const elapsed = recording ? Math.max(0, Math.floor((now - cam.recordingSince!) / 1000)) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-[var(--c-primary-2)]" /> {t("lf_title")}
        </CardTitle>
        {badge}
      </CardHeader>
      <CardBody>
        <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
          {/* Video */}
          <div className="relative aspect-[4/3] max-h-[460px] w-full overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[#05080f]">
            {live ? (
              /* eslint-disable-next-line @next/next/no-img-element -- MJPEG stream, not an optimisable image */
              <img
                key={cam.streamKey}
                src={`${cameraUrls(cam.host).stream}?k=${cam.streamKey}`}
                alt={t("lf_title")}
                onError={cam.streamFailed}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                {cam.status === "starting" ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--c-primary-2)]" />
                    <p className="text-sm text-slate-200">{t("lf_connecting")}</p>
                    {cam.awaitingPermission && (
                      <p className="max-w-sm text-xs text-amber-300">{t("lf_permission")}</p>
                    )}
                  </>
                ) : cam.status === "error" && cam.error ? (
                  <>
                    <VideoOff className="h-8 w-8 text-amber-300" />
                    <p className="max-w-sm text-sm text-slate-200">
                      {t(ERROR_KEY[cam.error]).replace("{host}", cam.host)}
                    </p>
                    <Link href="/help" className="text-xs text-[var(--c-primary-2)] underline underline-offset-2">
                      {t("lf_help")}
                    </Link>
                  </>
                ) : (
                  <>
                    <VideoOff className="h-8 w-8 text-slate-500" />
                    <p className="text-sm text-slate-200">{t("lf_off")}</p>
                    <p className="max-w-sm text-xs text-slate-400">{t("lf_off_body")}</p>
                  </>
                )}
              </div>
            )}

            {live && recording && (
              <div className="absolute start-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                REC <span className="num">{mmss(elapsed)}</span>
              </div>
            )}
            {live && cam.info && (
              <div className="num absolute bottom-3 start-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] text-slate-200">
                <Wifi className="h-3 w-3" />
                {cam.info.res} · {cam.info.fps.toFixed(0)} fps{cam.info.ap ? "" : ` · ${cam.info.rssi} dBm`}
              </div>
            )}
          </div>

          {/* Controls + recordings */}
          <div className="flex min-w-0 flex-col gap-3">
            {live || cam.status === "starting" ? (
              <Button variant="secondary" onClick={cam.stop} leftIcon={<Square className="h-4 w-4" />}>
                {t("lf_stop")}
              </Button>
            ) : (
              <Button onClick={() => void cam.start()} leftIcon={<Video className="h-4 w-4" />}>
                {t("lf_start")}
              </Button>
            )}
            <Button
              variant={recording ? "danger" : "outline"}
              onClick={toggleRecording}
              disabled={!live}
              leftIcon={<Circle className={`h-4 w-4 ${recording ? "fill-current" : "text-red-500"}`} />}
            >
              {recording ? t("lf_stop_record") : t("lf_record")}
            </Button>
            <button
              type="button"
              onClick={openSettings}
              className="flex items-center gap-1.5 self-start text-xs text-[var(--c-muted)] hover:text-[var(--c-text)]"
            >
              <Settings2 className="h-3.5 w-3.5" /> {t("lf_address")}
            </button>
            {showSettings && (
              <form onSubmit={saveHost} className="space-y-2 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface-2)] p-3">
                <Input
                  value={draftHost}
                  onChange={(e) => setDraftHost(e.target.value)}
                  placeholder={DEFAULT_CAMERA_HOST}
                  aria-label={t("lf_address")}
                  dir="ltr"
                  className="num h-9 px-3 py-2 text-xs"
                />
                <p className="text-[11px] leading-relaxed text-[var(--c-muted)]">{t("lf_address_hint")}</p>
                <Button type="submit" size="sm">
                  {t("lf_save")}
                </Button>
              </form>
            )}

            {cam.clips.length > 0 && (
              <div className="mt-1">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--c-text)]">
                  {t("lf_recordings")}
                  <Badge tone="neutral" className="px-1.5 py-0 text-[10px]">
                    {t("lf_demo")}
                  </Badge>
                </div>
                <ul className="space-y-2">
                  {cam.clips.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-2.5 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface-2)] p-2"
                    >
                      {c.thumb ? (
                        /* eslint-disable-next-line @next/next/no-img-element -- local blob thumbnail */
                        <img src={c.thumb} alt="" className="h-9 w-12 shrink-0 rounded-md object-cover" />
                      ) : (
                        <div className="grid h-9 w-12 shrink-0 place-items-center rounded-md bg-[#05080f]">
                          <Video className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                      )}
                      <div className="min-w-0 text-xs">
                        <div className="truncate font-medium text-[var(--c-text)]">
                          {new Date(c.startedAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="num text-[var(--c-muted)]">{mmss(c.durationS)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
