"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

interface AvatarUploadProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  name?: string;
  size?: number;
  className?: string;
  hint?: string;
}

/**
 * Optional profile picture picker. Reads a File, resizes to `maxSide`,
 * emits a JPEG data URL (~10-40 KB).
 */
export function AvatarUpload({
  value,
  onChange,
  name,
  size = 96,
  className,
  hint,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useT();
  const [busy, setBusy] = useState(false);
  const hintText = hint ?? t("ui_photo_hint");

  const initials = (name ?? "")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handlePick(file: File) {
    setBusy(true);
    try {
      const dataUrl = await resizeImage(file, 256, 0.82);
      onChange(dataUrl);
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <motion.button
        type="button"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => inputRef.current?.click()}
        className="relative shrink-0 overflow-hidden rounded-2xl border border-[var(--c-border)] shadow-[var(--shadow)] transition-colors hover:border-[var(--c-primary-2)]/50"
        style={{ width: size, height: size }}
        aria-label={t("ui_upload_photo")}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="grid h-full w-full place-items-center text-lg font-semibold text-white"
            style={{ background: "var(--grad-primary)" }}
          >
            {initials || <Camera className="h-5 w-5" />}
          </div>
        )}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 grid h-6 place-items-center bg-black/45 text-[10px] font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:opacity-100">
          {busy ? "…" : t("ui_change_photo")}
        </span>
      </motion.button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-1.5 text-xs font-medium transition-colors hover:border-[var(--c-primary-2)]/50 hover:text-[var(--c-primary-2)] disabled:opacity-50"
          >
            <Upload className="h-3 w-3" />
            {value ? t("ui_change_photo") : t("ui_upload_photo")}
          </button>
          {value && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-1.5 text-xs font-medium text-[var(--c-text-2)] transition-colors hover:border-[var(--color-crit)]/50 hover:text-[var(--color-crit)]"
            >
              <X className="h-3 w-3" />
              {t("ui_remove")}
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--c-muted)]">{hintText}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handlePick(f);
        }}
      />
    </div>
  );
}

function resizeImage(file: File, maxSide: number, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        if (!ctx) return reject(new Error("2d context unavailable"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("image decode failed"));
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
