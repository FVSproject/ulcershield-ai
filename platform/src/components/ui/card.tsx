"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLMotionProps<"section"> {
  glow?: boolean;
  interactive?: boolean;
  as?: "section" | "article" | "div";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, glow = false, interactive = false, children, ...props }, ref) => (
    <motion.section
      ref={ref as React.Ref<HTMLDivElement>}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--c-border)] bg-[var(--c-surface)] shadow-[var(--shadow-sm)]",
        interactive &&
          "transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)] hover:border-[var(--c-primary-2)]/40",
        glow &&
          "before:absolute before:-inset-px before:rounded-[var(--radius-lg)] before:bg-[conic-gradient(from_120deg,rgba(34,211,238,.35),transparent_30%,transparent_70%,rgba(34,211,238,.35))] before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 before:pointer-events-none",
        className
      )}
      {...props}
    >
      {glow && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-px rounded-[calc(var(--radius-lg)-1px)] bg-[var(--c-surface)]"
        />
      )}
      <div className="relative">{children as React.ReactNode}</div>
    </motion.section>
  )
);

Card.displayName = "Card";

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-4 px-6 pt-6 pb-3",
        className
      )}
    >
      {children}
    </header>
  );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3
      className={cn(
        "text-base font-semibold tracking-tight text-[var(--c-text)]",
        className
      )}
    >
      {children}
    </h3>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("px-6 pb-6", className)}>{children}</div>;
}
