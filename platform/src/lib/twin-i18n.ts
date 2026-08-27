"use client";

import { useT } from "@/lib/i18n";
import type { Contributor, Recommendation } from "@/lib/tissue-twin";
import { REGION_LABEL_KEY } from "@/lib/twin-labels";

/**
 * Translation helpers for the language-neutral Digital Tissue Twin payload.
 * Formats numeric contributors and recommendations in the active language.
 */
export function useTwinI18n() {
  const t = useT();

  function formatContributor(c: Contributor): string {
    switch (c.kind) {
      case "peak_crit":
        return `${t("reco_peak_hi_t")}: ${c.value.toFixed(0)} mmHg`;
      case "peak_high":
        return `${t("reco_peak_elev_t")}: ${c.value.toFixed(0)} mmHg`;
      case "immobility":
        return `${c.value.toFixed(0)} ${t("tr_min_since")}`;
      case "humidity":
        return `${t("v_humidity")}: ${c.value.toFixed(0)}%`;
      case "skin_high":
        return `${t("v_body_temp")}: ${c.value.toFixed(1)}°C — ${t("v_body_high")}`;
      case "skin_low":
        return `${t("v_body_temp")}: ${c.value.toFixed(1)}°C — ${t("v_body_low")}`;
      default:
        return "";
    }
  }

  function formatRecommendation(r: Recommendation): { title: string; detail: string } {
    const primaryLabel = t(REGION_LABEL_KEY[r.primaryRegion]);
    const sideLabel = r.side === "left" ? t("twin_side_left") : t("twin_side_right");

    let title: string;
    let detail: string;

    const angle = r.angleDegrees ?? 30;

    switch (r.kind) {
      case "reposition_side_now":
        title = t("twin_reposition_to")
          .replace("{angle}", String(angle))
          .replace("{side}", sideLabel);
        detail = `${primaryLabel} · ${r.primaryScore}/100`;
        break;
      case "reposition_now":
        title = t("twin_reposition_now");
        detail = `${primaryLabel} · ${r.primaryScore}/100`;
        break;
      case "reposition_soon":
        title = t("twin_reposition_soon").replace("{min}", String(r.minutes ?? 0));
        detail = `${primaryLabel} · ${r.primaryScore}/100`;
        break;
      default:
        title = t("twin_continue");
        detail = `${primaryLabel} · ${r.primaryScore}/100 · ${r.minutes} ${t("rt_min")}`;
        break;
    }

    return { title, detail };
  }

  function angleRationale(angle: number): string {
    if (angle >= 40) return t("twin_angle_why_40");
    if (angle >= 35) return t("twin_angle_why_35");
    return t("twin_angle_why_30");
  }

  return { formatContributor, formatRecommendation, angleRationale };
}
