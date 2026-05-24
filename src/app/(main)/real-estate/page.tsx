import Link from "next/link";
import { Plus, Home } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { getProperties } from "@/services/real-estate.service";
import { requireAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/formatters";

const addButtonClass =
  "inline-flex shrink-0 items-center justify-center rounded-xl text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-5 py-2";

export default async function RealEstatePage() {
  const user = await requireAuth();
  const t = await getTranslations("realEstate");
  const properties = await getProperties(user.id);

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-[max(1.5rem,env(safe-area-inset-top))] pb-nav max-w-5xl mx-auto px-4 md:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-[1.75rem] font-bold tracking-tight">{t("title")}</h1>
          <Link href="/real-estate/add" className={addButtonClass}>
            <Plus className="mr-2 h-4 w-4" />
            {t("addProperty")}
          </Link>
        </div>

        {properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
              <Home className="h-7 w-7" />
            </div>
            <p className="text-lg font-medium">{t("emptyTitle")}</p>
            <p className="text-sm text-muted-foreground mb-6">{t("emptyDescription")}</p>
            <Link href="/real-estate/add" className={addButtonClass}>
              <Plus className="mr-2 h-4 w-4" />
              {t("addProperty")}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {properties.map((p) => (
              <Link key={p.id} href={`/real-estate/${p.id}`}>
                <Card className="transition-all hover:bg-muted/40 active:scale-[0.99]">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary">
                        <Home className="h-5 w-5" />
                      </div>
                      <span className="font-semibold truncate">{p.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">{t("marketValue")}</p>
                        <p className="font-semibold">
                          {p.marketValue != null ? formatCurrency(p.marketValue) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("mortgageBalance")}</p>
                        <p className="font-semibold">
                          {p.mortgageBalance != null
                            ? formatCurrency(p.mortgageBalance)
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("equity")}</p>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {p.equity != null ? formatCurrency(p.equity) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("acquisitionCost")}</p>
                        <p className="font-semibold">{formatCurrency(p.acquisitionTotal)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
