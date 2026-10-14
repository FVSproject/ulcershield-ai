"use client";

import { useToasts } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { tiltBed } from "@/lib/sources/ble-source";

/**
 * Tilts the bed (see tiltBed) and reports it with a toast. Resolves false
 * without a toast when no tilt-capable device is paired, so callers decide
 * whether that needs explaining.
 */
export function useBedTilt() {
  const push = useToasts((s) => s.push);
  const t = useT();

  return async (side: "left" | "right" | null, angle = 0): Promise<boolean> => {
    try {
      const moved = await tiltBed(side, angle);
      if (moved) {
        const title =
          side === null
            ? t("bed_flattening")
            : t("bed_tilting")
                .replace("{angle}", String(angle))
                .replace("{side}", t(side === "left" ? "twin_side_left" : "twin_side_right"));
        push({ kind: "info", title });
      }
      return moved;
    } catch (e) {
      push({ kind: "danger", title: t("ct_command_failed"), body: (e as Error).message });
      return false;
    }
  };
}
