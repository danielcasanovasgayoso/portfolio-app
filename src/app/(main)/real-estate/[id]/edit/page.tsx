import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackButton } from "@/components/ui/back-button";
import { PropertyForm } from "@/components/real-estate/PropertyForm";
import { getPropertyDetail } from "@/services/real-estate.service";
import { requireAuth } from "@/lib/auth";

interface EditPropertyPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPropertyPage({ params }: EditPropertyPageProps) {
  const user = await requireAuth();
  const { id } = await params;
  const t = await getTranslations("realEstate");
  const property = await getPropertyDetail(user.id, id);

  if (!property) notFound();

  return (
    <div className="min-h-screen pb-nav">
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3">
          <BackButton label={t("back")} />
          <h1 className="text-lg font-bold tracking-tight">{t("editProperty")}</h1>
        </div>
      </header>
      <main className="p-4 max-w-3xl mx-auto">
        <PropertyForm property={property} />
      </main>
    </div>
  );
}
