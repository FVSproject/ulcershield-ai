import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium tracking-wide",
  {
    variants: {
      tone: {
        neutral: "bg-[var(--c-surface-2)] text-[var(--c-text-2)] border border-[var(--c-border)]",
        brand: "bg-[color-mix(in_oklab,var(--c-primary-2)_15%,transparent)] text-[var(--c-primary-2)] border border-[var(--c-primary-2)]/30",
        safe: "bg-[color-mix(in_oklab,var(--color-safe)_15%,transparent)] text-[var(--color-safe)] border border-[var(--color-safe)]/30",
        warn: "bg-[color-mix(in_oklab,var(--color-elev)_15%,transparent)] text-[var(--color-elev)] border border-[var(--color-elev)]/30",
        danger: "bg-[color-mix(in_oklab,var(--color-crit)_15%,transparent)] text-[var(--color-crit)] border border-[var(--color-crit)]/30",
        live: "bg-[color-mix(in_oklab,var(--color-safe)_15%,transparent)] text-[var(--color-safe)] border border-[var(--color-safe)]/30",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && tone === "live" && <span className="live-dot" />}
      {dot && tone !== "live" && (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      )}
      {children}
    </span>
  );
}
