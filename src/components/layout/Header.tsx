"use client";

import { useState } from "react";
import { RefreshCw, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title?: string;
  onRefresh?: () => Promise<void>;
}

export function Header({ title = "Portfolio", onRefresh }: HeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing || !onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-5 py-4">
      <div className="flex justify-between items-center">
        {/* Logo and title */}
        <div className="flex items-center gap-3">
          {/* Terminal-style logo mark */}
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center glow-primary">
              <Activity className="w-4 h-4 text-primary-foreground" />
            </div>
            {/* Live indicator */}
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-gain border-2 border-background animate-pulse" />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
          </div>
        </div>

        {/* Refresh button */}
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              "h-10 w-10 rounded-lg border border-border transition-all duration-300",
              "hover:border-primary/50 hover:bg-primary/5 hover:glow-primary",
              "text-muted-foreground hover:text-primary",
              isRefreshing && "border-primary bg-primary/10"
            )}
            aria-label="Refresh prices"
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefreshing && "animate-spin")}
            />
          </Button>
        )}
      </div>
    </header>
  );
}
