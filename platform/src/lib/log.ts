/**
 * Prod-silent logger. `console.warn` and `console.log` fire in development
 * only; `console.error` always fires (Sentry / Vercel log surfaces).
 *
 * Usage:  import { logger } from "@/lib/log";
 *         logger.warn("BLE state parse failed", e);
 */
const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  error: (...args: unknown[]) => {
    // Errors always surface — Vercel / Sentry / browser DevTools capture them.
    console.error(...args);
  },
};
