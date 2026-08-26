import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

export function Logo({ className, size = 40, glow = false }: LogoProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-[var(--c-primary-2)]/25 shadow-[0_6px_18px_-6px_rgba(6,182,212,.55)]",
        glow && "before:absolute before:-inset-2 before:-z-10 before:rounded-full before:bg-[radial-gradient(closest-side,rgba(34,211,238,.45),transparent_70%)] before:blur-lg",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Image
        src="/logo.jpeg"
        alt="UlcerShield AI"
        width={size}
        height={size}
        className="h-full w-full object-cover"
        priority
      />
    </span>
  );
}
