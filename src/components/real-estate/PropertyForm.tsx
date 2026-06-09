"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/real-estate/DatePicker";
import {
  createProperty,
  updateProperty,
  upsertMortgage,
  deleteMortgage,
} from "@/actions/real-estate";
import { useActionError } from "@/lib/use-action-error";
import type { PropertyDetail } from "@/types/real-estate";

interface OwnerValue {
  name: string;
  sharePct: string;
  isSelf: boolean;
}
interface PropertyFormValues {
  name: string;
  purchaseDate: string;
  purchasePrice: string;
  vatRatePct: string;
  transferTaxRatePct: string;
  purchaseCosts: string;
  owners: OwnerValue[];
  hasMortgage: boolean;
  loanAmount: string;
  downPayment: string;
  termMonths: string;
  annualInterestRatePct: string;
  mortgageType: "FIXED" | "VARIABLE";
  startDate: string;
  initialInterestAmount: string;
  initialInterestDate: string;
}

const num = (v: string) => parseFloat(v.replace(",", ".")) || 0;
const today = () => new Date().toISOString().split("T")[0];

function buildDefaults(property?: PropertyDetail): PropertyFormValues {
  if (!property) {
    return {
      name: "",
      purchaseDate: today(),
      purchasePrice: "",
      vatRatePct: "10",
      transferTaxRatePct: "1.5",
      purchaseCosts: "0",
      owners: [],
      hasMortgage: false,
      loanAmount: "",
      downPayment: "",
      termMonths: "",
      annualInterestRatePct: "",
      mortgageType: "FIXED",
      startDate: today(),
      initialInterestAmount: "",
      initialInterestDate: "",
    };
  }
  return {
    name: property.name,
    purchaseDate: property.purchaseDate,
    purchasePrice: property.purchasePrice.toString(),
    vatRatePct: (property.vatRate * 100).toString(),
    transferTaxRatePct: (property.transferTaxRate * 100).toString(),
    purchaseCosts: property.purchaseCosts.toString(),
    owners: property.owners.map((o) => ({
      name: o.name,
      sharePct: o.sharePct.toString(),
      isSelf: o.isSelf,
    })),
    hasMortgage: !!property.mortgage,
    loanAmount: property.mortgage?.loanAmount.toString() ?? "",
    downPayment: property.mortgage?.downPayment.toString() ?? "",
    termMonths: property.mortgage?.termMonths.toString() ?? "",
    annualInterestRatePct: property.mortgage
      ? (property.mortgage.annualInterestRate * 100).toString()
      : "",
    mortgageType: property.mortgage?.type ?? "FIXED",
    startDate: property.mortgage?.startDate ?? today(),
    initialInterestAmount:
      property.mortgage?.initialInterestAmount?.toString() ?? "",
    initialInterestDate: property.mortgage?.initialInterestDate ?? "",
  };
}

export function PropertyForm({ property }: { property?: PropertyDetail }) {
  const t = useTranslations("realEstate");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const translateError = useActionError();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!property;

  const form = useForm<PropertyFormValues>({
    defaultValues: buildDefaults(property),
  });

  const owners = useFieldArray({ control: form.control, name: "owners" });
  const hasMortgage = useWatch({ control: form.control, name: "hasMortgage" });

  const onSubmit = (data: PropertyFormValues) => {
    startTransition(async () => {
      const propertyInput = {
        name: data.name,
        purchaseDate: new Date(data.purchaseDate),
        currency: "EUR",
        purchasePrice: num(data.purchasePrice),
        vatRate: num(data.vatRatePct) / 100,
        transferTaxRate: num(data.transferTaxRatePct) / 100,
        purchaseCosts: num(data.purchaseCosts),
        owners: data.owners
          .filter((o) => o.name.trim() !== "")
          .map((o) => ({ name: o.name, sharePct: num(o.sharePct), isSelf: !!o.isSelf })),
      };

      const result = isEditing
        ? await updateProperty(property.id, propertyInput)
        : await createProperty(propertyInput);

      if (!result.success) {
        form.setError("root", { message: translateError(result) });
        return;
      }

      const propertyId = isEditing
        ? property.id
        : (result.data as { propertyId: string }).propertyId;

      if (data.hasMortgage) {
        const mResult = await upsertMortgage(propertyId, {
          loanAmount: num(data.loanAmount),
          downPayment: num(data.downPayment),
          termMonths: parseInt(data.termMonths, 10) || 0,
          annualInterestRate: num(data.annualInterestRatePct) / 100,
          type: data.mortgageType,
          startDate: new Date(data.startDate),
          initialInterestAmount: data.initialInterestAmount.trim()
            ? num(data.initialInterestAmount)
            : undefined,
          initialInterestDate: data.initialInterestDate
            ? new Date(data.initialInterestDate)
            : undefined,
        });
        if (!mResult.success) {
          form.setError("root", { message: translateError(mResult) });
          return;
        }
      } else if (isEditing && property.mortgage) {
        await deleteMortgage(propertyId);
      }

      router.push(`/real-estate/${propertyId}`);
      router.refresh();
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic details */}
        <Card>
          <CardHeader>
            <CardTitle>{t("propertyDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: t("nameRequired") }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("namePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="purchaseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("purchaseDate")}</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="purchasePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("purchasePrice")} (€)</FormLabel>
                  <FormControl>
                    <Input type="text" inputMode="decimal" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vatRatePct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("vatRate")} (%)</FormLabel>
                    <FormControl>
                      <Input type="text" inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="transferTaxRatePct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("transferTaxRate")} (%)</FormLabel>
                    <FormControl>
                      <Input type="text" inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="purchaseCosts"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("purchaseCosts")} (€)</FormLabel>
                  <FormControl>
                    <Input type="text" inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Owners */}
        <Card>
          <CardHeader>
            <CardTitle>{t("owners")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {owners.fields.map((field, idx) => (
              <div key={field.id} className="space-y-2">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">{t("ownerName")}</Label>
                    <Input
                      placeholder={t("ownerNamePlaceholder")}
                      {...form.register(`owners.${idx}.name`)}
                    />
                  </div>
                  <div className="w-28">
                    <Label className="text-xs">{t("share")} (%)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="50"
                      {...form.register(`owners.${idx}.sharePct`)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => owners.remove(idx)}
                    aria-label={tCommon("delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Controller
                  control={form.control}
                  name={`owners.${idx}.isSelf`}
                  render={({ field: f }) => (
                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                      <Checkbox
                        checked={!!f.value}
                        onCheckedChange={(checked) => f.onChange(checked === true)}
                      />
                      {t("ownerIsSelf")}
                    </label>
                  )}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                owners.append({
                  name: "",
                  sharePct: "",
                  isSelf: owners.fields.length === 0,
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("addOwner")}
            </Button>
          </CardContent>
        </Card>

        {/* Mortgage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {t("mortgage")}
              <label className="flex items-center gap-2 text-sm font-normal">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  {...form.register("hasMortgage")}
                />
                {t("hasMortgage")}
              </label>
            </CardTitle>
          </CardHeader>
          {hasMortgage && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="loanAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("loanAmount")} (€)</FormLabel>
                      <FormControl>
                        <Input type="text" inputMode="decimal" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="downPayment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("downPayment")} (€)</FormLabel>
                      <FormControl>
                        <Input type="text" inputMode="decimal" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="termMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("termMonths")}</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="annualInterestRatePct"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("interestRate")} (%)</FormLabel>
                      <FormControl>
                        <Input type="text" inputMode="decimal" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mortgageType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("mortgageTypeLabel")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {field.value === "VARIABLE" ? t("variable") : t("fixed")}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="FIXED">{t("fixed")}</SelectItem>
                          <SelectItem value="VARIABLE">{t("variable")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("firstPaymentDate")}</FormLabel>
                      <FormControl>
                        <DatePicker value={field.value} onChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="initialInterestAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("initialInterestAmount")} (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder={t("optional")}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="initialInterestDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("initialInterestDate")}</FormLabel>
                      <FormControl>
                        <DatePicker value={field.value} onChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          )}
        </Card>

        {form.formState.errors.root && (
          <p className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              router.push(property ? `/real-estate/${property.id}` : "/real-estate")
            }
          >
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? t("saveChanges") : t("createProperty")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
