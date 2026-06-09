import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SubPageHeader } from "@/components/layout/PageHeader";
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
      <SubPageHeader
        title={t("editProperty")}
        backHref={`/real-estate/${id}`}
        backLabel={t("back")}
      />
      <main className="p-4 max-w-3xl mx-auto">
        <PropertyForm property={property} />
      </main>
    </div>
  );
}
