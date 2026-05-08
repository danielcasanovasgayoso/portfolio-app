"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  inputClassName?: string;
}

export const GlassField = forwardRef<HTMLInputElement, GlassFieldProps>(
  function GlassField({ label, icon, id, className, inputClassName, ...props }, ref) {
    return (
      <label htmlFor={id} className={cn("block", className)}>
        <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.1em] text-white/70">
          {label}
        </span>
        <span className="flex items-center gap-2.5 rounded-xl border border-white/[0.18] bg-white/[0.14] px-3.5 py-2.5 transition-colors focus-within:border-white/40">
          {icon && <span className="text-white/70">{icon}</span>}
          <input
            ref={ref}
            id={id}
            className={cn(
              "w-full bg-transparent font-mono text-[13px] text-white placeholder:text-white/40 focus:outline-none disabled:opacity-60",
              inputClassName
            )}
            {...props}
          />
        </span>
      </label>
    );
  }
);
