"use client";

import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { CalendarIcon, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { UseFormReturn } from "react-hook-form";
import type { CashMovementInput } from "@/lib/validators";

interface MovementFormFieldsProps {
  form: UseFormReturn<CashMovementInput>;
}

export function MovementFormFields({ form }: MovementFormFieldsProps) {
  const t = useTranslations("wallet");

  return (
    <>
      {/* Type: deposit / withdrawal as a two-button segmented control */}
      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("type")}</FormLabel>
            <FormControl>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => field.onChange("DEPOSIT")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                    field.value === "DEPOSIT"
                      ? "border-gain/40 bg-gain/10 text-gain"
                      : "border-input text-muted-foreground hover:bg-muted"
                  )}
                >
                  <ArrowDownCircle className="h-4 w-4" />
                  {t("deposit")}
                </button>
                <button
                  type="button"
                  onClick={() => field.onChange("WITHDRAWAL")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                    field.value === "WITHDRAWAL"
                      ? "border-loss/40 bg-loss/10 text-loss"
                      : "border-input text-muted-foreground hover:bg-muted"
                  )}
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  {t("withdrawal")}
                </button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Date and amount */}
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
                    defaultMonth={field.value}
                    onSelect={field.onChange}
                    disabled={false}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("amount")}</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.replace(",", "."))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Note */}
      <FormField
        control={form.control}
        name="note"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("note")}{" "}
              <span className="text-muted-foreground font-normal">
                ({t("optional").toLowerCase()})
              </span>
            </FormLabel>
            <FormControl>
              <Input placeholder={t("notePlaceholder")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
