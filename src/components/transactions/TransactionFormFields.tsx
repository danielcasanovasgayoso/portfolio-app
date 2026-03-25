"use client";

import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { UseFormReturn } from "react-hook-form";
import type { TransactionCreateInput } from "@/lib/validators";
import type { Asset } from "@prisma/client";

const NEW_ASSET_ID = "__new__";
const transactionTypeKeys = ["BUY", "SELL", "DIVIDEND", "FEE", "TRANSFER"] as const;
const transferTypeKeys = ["IN", "OUT"] as const;
const categoryKeys = ["OTHERS", "FUNDS", "STOCKS", "PP"] as const;

interface TransactionFormFieldsProps {
  form: UseFormReturn<TransactionCreateInput>;
  assets: Pick<Asset, "id" | "name" | "isin" | "ticker" | "category">[];
}

export { NEW_ASSET_ID };

export function TransactionFormFields({ form, assets }: TransactionFormFieldsProps) {
  const t = useTranslations("transactions");
  const tAssets = useTranslations("assets");

  const watchedType = form.watch("type");
  const watchedAssetId = form.watch("assetId");
  const isNewAsset = watchedAssetId === NEW_ASSET_ID;

  const typeLabels: Record<string, string> = {
    BUY: t("typeBuy"),
    SELL: t("typeSell"),
    DIVIDEND: t("typeDividend"),
    FEE: t("typeFee"),
    TRANSFER: t("typeTransfer"),
  };

  const transferLabels: Record<string, string> = {
    IN: t("transferIn"),
    OUT: t("transferOut"),
  };

  const categoryLabels: Record<string, string> = {
    OTHERS: tAssets("categoryOthers"),
    FUNDS: tAssets("categoryFunds"),
    STOCKS: tAssets("categoryStocks"),
    PP: tAssets("categoryPP"),
  };

  return (
    <>
      {/* Asset */}
      <FormField
        control={form.control}
        name="assetId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("asset")}</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("selectAsset")}>
                    {field.value === NEW_ASSET_ID
                      ? t("createNewAsset")
                      : assets.find((a) => a.id === field.value)?.name ||
                        t("selectAsset")}
                  </SelectValue>
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value={NEW_ASSET_ID}>
                  + {t("createNewAsset")}
                </SelectItem>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* New asset fields */}
      {isNewAsset && (
        <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/50 border border-border">
          <FormField
            control={form.control}
            name="newAssetName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tAssets("name")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={tAssets("namePlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="newAssetIsin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tAssets("isin")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={tAssets("isinPlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="newAssetCategory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tAssets("category")}</FormLabel>
                <Select
                  value={field.value || "OTHERS"}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {categoryLabels[field.value || "OTHERS"]}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categoryKeys.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {categoryLabels[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      {/* Date and Type */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t("date")}</FormLabel>
              <Popover>
                <FormControl>
                  <PopoverTrigger
                    className={cn(
                      "inline-flex items-center justify-between w-full h-8 px-2.5 rounded-lg border border-input bg-transparent text-sm font-normal hover:bg-muted transition-colors",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value ? (
                      format(field.value, "dd/MM/yyyy")
                    ) : (
                      <span>{t("pickDate")}</span>
                    )}
                    <CalendarIcon className="h-4 w-4 opacity-50" />
                  </PopoverTrigger>
                </FormControl>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("type")}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {typeLabels[field.value] || t("selectType")}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {transactionTypeKeys.map((type) => (
                    <SelectItem key={type} value={type}>
                      {typeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {watchedType === "TRANSFER" && (
        <FormField
          control={form.control}
          name="transferType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("direction")}</FormLabel>
              <Select
                value={field.value || ""}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {field.value
                        ? transferLabels[field.value]
                        : t("selectDirection")}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {transferTypeKeys.map((type) => (
                    <SelectItem key={type} value={type}>
                      {transferLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Shares and Price per Share */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="shares"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("shares")}</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.0000"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pricePerShare"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("pricePerShare")}</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Fees */}
      <FormField
        control={form.control}
        name="fees"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("fees")}</FormLabel>
            <FormControl>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Total Amount */}
      <FormField
        control={form.control}
        name="totalAmount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("totalAmount")}</FormLabel>
            <FormControl>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
