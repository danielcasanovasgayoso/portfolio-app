"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import Link from "next/link";
import type { LinkProps } from "next/link";
import { cn } from "@/lib/utils";

const baseClass =
  "inline-flex h-9 w-9 items-center justify-center rounded-xl border-0 bg-white/[0.18] text-white backdrop-blur-md transition-colors hover:bg-white/25 active:scale-95 disabled:opacity-50";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { className?: string };

export const GlassButton = forwardRef<HTMLButtonElement, ButtonProps>(
  function GlassButton({ className, type = "button", ...props }, ref) {
    return <button ref={ref} type={type} className={cn(baseClass, className)} {...props} />;
  }
);

type GlassLinkProps = Omit<LinkProps, "href"> & {
  href: LinkProps["href"];
  className?: string;
  children?: React.ReactNode;
  "aria-label"?: string;
};

export function GlassLink({ className, ...props }: GlassLinkProps) {
  return <Link className={cn(baseClass, className)} {...props} />;
}
