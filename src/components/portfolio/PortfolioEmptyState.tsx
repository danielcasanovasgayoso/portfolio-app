import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus, BarChart3 } from "lucide-react";
import { SectionCard } from "@/components/pulse";

export function PortfolioEmptyState() {
  const t = useTranslations("portfolio");

  return (
    <SectionCard className="mt-6 px-6 py-10 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <BarChart3 className="h-7 w-7 text-primary" />
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {t("emptyTitle")}
      </h2>
      <p className="mx-auto mt-2 max-w-xs text-[13px] text-muted-foreground">
        {t("emptyDescription")}
      </p>
      <Link
        href="/add"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        {t("addFirstAsset")}
      </Link>
    </SectionCard>
  );
}
