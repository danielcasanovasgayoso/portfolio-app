"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { GlassButton } from "@/components/pulse";
import { AlertCircle, Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "idle" | "syncing" | "success" | "error";

interface RefreshAssetButtonProps {
  assetId: string;
  variant?: "default" | "glass";
}

export function RefreshAssetButton({ assetId, variant = "default" }: RefreshAssetButtonProps) {
  const t = useTranslations("assetDetail");
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (status === "syncing") return;

    setStatus("syncing");

    try {
      const res = await fetch(`/api/prices/${assetId}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        router.refresh();
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }

    resetTimer.current = setTimeout(() => setStatus("idle"), 3000);
  }, [status, assetId, router]);

  const ariaLabel = status === "syncing" ? t("synced") : t("refresh");

  if (variant === "glass") {
    const Icon = status === "success" ? Check : status === "error" ? AlertCircle : RefreshCw;
    return (
      <GlassButton
        onClick={handleRefresh}
        disabled={status === "syncing"}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        <Icon
          aria-hidden
          className={cn(
            "h-4 w-4",
            status === "syncing" && "animate-spin",
            status === "success" && "text-[#7DFF9A]",
            status === "error" && "text-[#FFB1AB]"
          )}
        />
      </GlassButton>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={status === "syncing"}
        className={cn(
          "gap-2 h-8 px-3 rounded-lg border-border font-mono text-xs uppercase tracking-wider",
          "transition-all duration-300",
          "hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
          status === "syncing" && "border-primary bg-primary/10 text-primary"
        )}
      >
        <RefreshCw className={cn("h-3.5 w-3.5", status === "syncing" && "animate-spin")} />
        {t("refresh")}
      </Button>

      {status === "success" && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gain-muted">
          <Check className="h-3 w-3 text-gain" />
          <span className="text-[10px] font-mono text-gain uppercase tracking-wider">
            {t("synced")}
          </span>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-loss-muted">
          <AlertCircle className="h-3 w-3 text-loss" />
          <span className="text-[10px] font-mono text-loss uppercase tracking-wider">
            {t("error")}
          </span>
        </div>
      )}
    </div>
  );
}
