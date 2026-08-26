"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary-2)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--c-bg)] disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden group",
  {
    variants: {
      variant: {
        primary:
          "text-white shadow-[0_10px_30px_-10px_rgba(6,182,212,.6)] hover:shadow-[0_18px_44px_-10px_rgba(6,182,212,.7)] hover:-translate-y-0.5 active:translate-y-0 [background:var(--grad-primary)] bg-[length:200%_200%] hover:bg-right",
        secondary:
          "text-[var(--c-text)] border border-[var(--c-border)] bg-[var(--c-surface)] hover:bg-[var(--c-surface-2)] hover:border-[var(--c-border-2)] hover:-translate-y-0.5",
        ghost:
          "text-[var(--c-text)] hover:bg-[color-mix(in_oklab,var(--c-primary-2)_10%,transparent)]",
        outline:
          "border border-[var(--c-primary-2)]/40 text-[var(--c-text)] bg-transparent hover:bg-[color-mix(in_oklab,var(--c-primary-2)_12%,transparent)] hover:border-[var(--c-primary-2)]",
        danger:
          "text-white bg-[var(--color-crit)] hover:brightness-110 shadow-[0_10px_30px_-10px_rgba(239,68,68,.55)]",
        glass:
          "text-[var(--c-text)] glass hover:bg-[color-mix(in_oklab,var(--c-surface)_60%,transparent)] hover:-translate-y-0.5",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        md: "h-11 px-6",
        lg: "h-14 px-8 text-base",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, leftIcon, rightIcon, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {variant === "primary" && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        />
      )}
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      <span className="relative">{children}</span>
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  )
);

Button.displayName = "Button";
