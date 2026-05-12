import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-lg border border-ink/20 bg-cream-dark px-3 text-base text-ink placeholder:text-ink-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:border-ink",
        "disabled:opacity-50 disabled:pointer-events-none",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
