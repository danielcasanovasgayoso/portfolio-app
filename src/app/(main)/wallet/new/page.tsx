"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { SubPageHeader } from "@/components/layout/PageHeader";
import {
  CashMovementInputSchema,
  type CashMovementInput,
} from "@/lib/validators";
import { createCashMovement } from "@/actions/wallet";
import { useActionError } from "@/lib/use-action-error";
import { MovementFormFields } from "@/components/wallet/MovementFormFields";

export default function NewMovementPage() {
  const t = useTranslations("wallet");
  const tCommon = useTranslations("common");
  const translateError = useActionError();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CashMovementInput>({
    resolver: zodResolver(CashMovementInputSchema),
    defaultValues: {
      type: "DEPOSIT",
      date: new Date(),
      amount: "",
      note: "",
    },
  });

  const onSubmit = (data: CashMovementInput) => {
    // Pin the calendar's local-midnight Date to UTC midnight of the same
    // calendar day so the server doesn't shift it a day back.
    const d = data.date;
    const payload = {
      ...data,
      date: new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())),
    };
    startTransition(async () => {
      const result = await createCashMovement(payload);
      if (result.success) {
        router.push("/wallet");
      } else {
        form.setError("root", { message: translateError(result) });
      }
    });
  };

  return (
    <div className="min-h-screen pb-nav">
      <SubPageHeader
        title={t("newMovement")}
        backHref="/wallet"
        backLabel={tCommon("back")}
      />

      <main className="p-4 max-w-lg mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <MovementFormFields form={form} />

            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("save")}
            </Button>
          </form>
        </Form>
      </main>
    </div>
  );
}
