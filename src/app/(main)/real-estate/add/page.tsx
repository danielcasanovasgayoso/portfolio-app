import { getTranslations } from "next-intl/server";
import { BackButton } from "@/components/ui/back-button";
import { PropertyForm } from "@/components/real-estate/PropertyForm";
import { requireAuth } from "@/lib/auth";

export default async function AddPropertyPage() {
  await requireAuth();
  const t = await getTranslations("realEstate");

  return (
    <div className="min-h-screen pb-nav">
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3">
          <BackButton label={t("back")} />
          <h1 className="text-lg font-bold tracking-tight">{t("addProperty")}</h1>
        </div>
      </header>
      <main className="p-4 max-w-3xl mx-auto">
        <PropertyForm />
      </main>
    </div>
  );
}
