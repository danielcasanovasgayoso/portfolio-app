"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  HeroBackdrop,
  MobileShell,
  PageHeader,
  SectionCard,
} from "@/components/pulse";
import {
  TransactionCreateSchema,
  type TransactionCreateInput,
} from "@/lib/validators";
import { createTransaction, getAssets } from "@/actions/transactions";
import { TransactionFormFields } from "@/components/transactions/TransactionFormFields";
import type { Asset } from "@prisma/client";

export default function AddTransactionPage() {
  const t = useTranslations("transactions");
  const tAdd = useTranslations("add");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [assets, setAssets] = useState<
    Pick<Asset, "id" | "name" | "isin" | "ticker" | "category">[]
  >([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<TransactionCreateInput>({
    resolver: zodResolver(TransactionCreateSchema),
    defaultValues: {
      assetId: "",
      type: "BUY",
      date: new Date(),
      shares: "",
      pricePerShare: "",
      totalAmount: "",
      fees: "",
      transferType: undefined,
      newAssetName: "",
      newAssetIsin: "",
      newAssetCategory: "OTHERS",
    },
  });

  const watchedShares = useWatch({ control: form.control, name: "shares" });
  const watchedPricePerShare = useWatch({
    control: form.control,
    name: "pricePerShare",
  });
  const watchedFees = useWatch({ control: form.control, name: "fees" });

  useEffect(() => {
    const shares = parseFloat(watchedShares);
    const price = parseFloat(watchedPricePerShare || "");
    if (!isNaN(shares) && !isNaN(price)) {
      const fees = parseFloat(watchedFees || "") || 0;
      const total = (shares * price + fees).toFixed(2);
      form.setValue("totalAmount", total);
    }
  }, [watchedShares, watchedPricePerShare, watchedFees, form]);

  useEffect(() => {
    getAssets().then((data) => {
      setAssets(data);
      setLoading(false);
    });
  }, []);

  const onSubmit = (data: TransactionCreateInput) => {
    startTransition(async () => {
      const result = await createTransaction(data);
      if (result.success) {
        router.push("/");
      } else {
        form.setError("root", { message: result.error });
      }
    });
  };

  return (
    <MobileShell>
      <HeroBackdrop height={160} orbits="right" />
      <div className="relative px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <PageHeader
          title={t("addTransaction")}
          backLabel={tAdd("goBack")}
          onBack={() => router.back()}
        />

        <div className="mt-4">
          <SectionCard ambient={false}>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-xl bg-muted"
                  />
                ))}
              </div>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <TransactionFormFields form={form} assets={assets} />

                  {form.formState.errors.root && (
                    <p className="text-[12px] text-destructive">
                      {form.formState.errors.root.message}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full rounded-xl"
                  >
                    {isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {t("addTransaction")}
                  </Button>
                </form>
              </Form>
            )}
          </SectionCard>
        </div>
      </div>
    </MobileShell>
  );
}
