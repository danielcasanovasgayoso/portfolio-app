"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group border border-border bg-background text-foreground shadow-lg rounded-lg",
          title: "text-sm font-medium",
          description: "text-xs text-muted-foreground",
          success: "!border-gain/40",
          error: "!border-loss/40",
        },
      }}
    />
  );
}
