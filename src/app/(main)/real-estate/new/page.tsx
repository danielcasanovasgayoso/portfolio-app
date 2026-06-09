import { getTranslations } from "next-intl/server";
import { SubPageHeader } from "@/components/layout/PageHeader";
import { PropertyForm } from "@/components/real-estate/PropertyForm";
import { requireAuth } from "@/lib/auth";

export default async function AddPropertyPage() {
  await requireAuth();
  const t = await getTranslations("realEstate");

  return (
    <div className="min-h-screen pb-nav">
      <SubPageHeader
        title={t("addProperty")}
        backHref="/real-estate"
        backLabel={t("back")}
      />
      <main className="p-4 max-w-3xl mx-auto">
        <PropertyForm />
      </main>
    </div>
  );
}
