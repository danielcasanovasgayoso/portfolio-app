"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Asset } from "@prisma/client";
import type { TransactionType } from "@/types/transaction";

interface TransactionFiltersProps {
  assets: Pick<Asset, "id" | "name" | "isin" | "ticker" | "category">[];
  /** Hide the type-pills row (used when the type filter lives in the hero). */
  hideTypes?: boolean;
}

const transactionTypeValues: TransactionType[] = [
  "BUY",
  "SELL",
  "DIVIDEND",
  "FEE",
  "TRANSFER",
];

export function TransactionFilters({
  assets,
  hideTypes = false,
}: TransactionFiltersProps) {
  const t = useTranslations("transactions");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const typeLabels: Record<string, string> = {
    BUY: t("typeBuy"),
    SELL: t("typeSell"),
    DIVIDEND: t("typeDividend"),
    FEE: t("typeFee"),
    TRANSFER: t("typeTransfer"),
  };

  const currentTypes = searchParams.get("types")?.split(",").filter(Boolean) || [];
  const currentAssetId = searchParams.get("assetId") || "";
  const currentDateFrom = searchParams.get("dateFrom") || "";
  const currentDateTo = searchParams.get("dateTo") || "";

  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    currentDateFrom ? new Date(currentDateFrom) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    currentDateTo ? new Date(currentDateTo) : undefined
  );

  const updateFilters = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });

      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router]
  );

  const toggleType = (type: TransactionType) => {
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((x) => x !== type)
      : [...currentTypes, type];

    updateFilters({
      types: newTypes.length > 0 ? newTypes.join(",") : undefined,
    });
  };

  const handleAssetChange = (value: unknown) => {
    const assetId = value as string | null;
    updateFilters({ assetId: assetId || undefined });
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    updateFilters({ dateFrom: date ? format(date, "yyyy-MM-dd") : undefined });
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    updateFilters({ dateTo: date ? format(date, "yyyy-MM-dd") : undefined });
  };

  const clearAllFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    router.push(pathname);
  };

  const hasFilters =
    currentTypes.length > 0 || currentAssetId || currentDateFrom || currentDateTo;

  const selectedAsset = assets.find((a) => a.id === currentAssetId);

  return (
    <div className="space-y-3">
      {!hideTypes && (
        <div className="flex flex-wrap gap-2">
          {transactionTypeValues.map((type) => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                currentTypes.includes(type)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-[var(--outline-variant)] bg-card text-foreground hover:bg-muted/40"
              )}
            >
              {typeLabels[type]}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Select value={currentAssetId} onValueChange={handleAssetChange}>
          <SelectTrigger className="h-9 w-[180px] rounded-lg ghost-border bg-card">
            <SelectValue placeholder={t("allAssets")}>
              {selectedAsset ? selectedAsset.name : t("allAssets")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t("allAssets")}</SelectItem>
            {assets.map((asset) => (
              <SelectItem key={asset.id} value={asset.id}>
                {asset.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger
            className={cn(
              "inline-flex h-9 w-[140px] items-center justify-start rounded-lg ghost-border bg-card px-3 text-sm font-normal transition-colors hover:bg-muted/40",
              !dateFrom && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateFrom ? format(dateFrom, "dd/MM/yyyy") : t("fromDate")}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={handleDateFromChange} />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger
            className={cn(
              "inline-flex h-9 w-[140px] items-center justify-start rounded-lg ghost-border bg-card px-3 text-sm font-normal transition-colors hover:bg-muted/40",
              !dateTo && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateTo ? format(dateTo, "dd/MM/yyyy") : t("toDate")}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={handleDateToChange} />
          </PopoverContent>
        </Popover>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-9 rounded-lg"
          >
            <X className="mr-1 h-4 w-4" />
            {t("clearFilters")}
          </Button>
        )}
      </div>

      {hasFilters && (
        <div className="flex flex-wrap gap-2">
          {!hideTypes &&
            currentTypes.map((type) => (
              <Badge
                key={type}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => toggleType(type as TransactionType)}
              >
                {typeLabels[type] || type}
                <X className="ml-1 h-3 w-3" />
              </Badge>
            ))}
          {selectedAsset && (
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => handleAssetChange("")}
            >
              {selectedAsset.name}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          )}
          {dateFrom && (
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => handleDateFromChange(undefined)}
            >
              {t("fromDate")}: {format(dateFrom, "dd/MM/yyyy")}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          )}
          {dateTo && (
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => handleDateToChange(undefined)}
            >
              {t("toDate")}: {format(dateTo, "dd/MM/yyyy")}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
