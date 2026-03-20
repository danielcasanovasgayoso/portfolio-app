"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, AlertCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface RefreshResult {
  success: boolean;
  updated: number;
  fromCache: number;
  errors: string[];
}

export function RefreshPricesButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RefreshResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/prices/refresh", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to refresh prices");
      }

      setResult(data);

      // Refresh the page to show updated prices
      router.refresh();

      // Clear result after 5 seconds
      setTimeout(() => setResult(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isLoading}
        className={cn(
          "gap-2 h-8 px-3 rounded-lg border-border font-mono text-xs uppercase tracking-wider",
          "transition-all duration-300",
          "hover:border-primary/50 hover:bg-primary/5 hover:text-primary hover:glow-primary",
          isLoading && "border-primary bg-primary/10 text-primary"
        )}
      >
        <RefreshCw
          className={cn("h-3.5 w-3.5", isLoading && "animate-spin")}
        />
        <span className="hidden sm:inline">
          {isLoading ? "Syncing" : "Refresh"}
        </span>
      </Button>

      {/* Success indicator */}
      {result && (
        <div className="flex items-center gap-1.5 animate-slide-up">
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gain-muted">
            <Check className="h-3 w-3 text-gain" />
            <span className="text-[10px] font-mono text-gain uppercase tracking-wider">
              {result.updated > 0 ? `${result.updated} synced` : "cached"}
            </span>
          </div>
        </div>
      )}

      {/* Error indicator */}
      {error && (
        <div className="flex items-center gap-1.5 animate-slide-up">
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-loss-muted">
            <AlertCircle className="h-3 w-3 text-loss" />
            <span className="text-[10px] font-mono text-loss uppercase tracking-wider">
              Error
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
