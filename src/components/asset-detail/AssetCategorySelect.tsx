"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { AssetClass } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateAssetCategory } from "@/actions/assets";

const ASSET_CLASSES: AssetClass[] = ["FUND", "ETF", "STOCK", "PENSION"];

interface AssetCategorySelectProps {
  assetId: string;
  category: AssetClass;
}

/** Inline asset-class selector, e.g. to reclassify a STOCK as an ETF. */
export function AssetCategorySelect({
  assetId,
  category,
}: AssetCategorySelectProps) {
  const t = useTranslations("assets");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const labels: Record<AssetClass, string> = {
    FUND: t("classFund"),
    ETF: t("classEtf"),
    STOCK: t("classStock"),
    PENSION: t("classPension"),
  };

  const handleChange = (value: unknown) => {
    startTransition(async () => {
      const result = await updateAssetCategory(assetId, value as AssetClass);
      if (result.success) {
        router.refresh();
      }
    });
  };

  return (
    <Select value={category} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger
        aria-label={t("category")}
        className="h-8 w-auto gap-1.5 text-xs font-semibold uppercase"
      >
        <SelectValue>{labels[category]}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {ASSET_CLASSES.map((c) => (
          <SelectItem key={c} value={c}>
            {labels[c]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
