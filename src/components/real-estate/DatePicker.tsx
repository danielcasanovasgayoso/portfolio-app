"use client";

import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  value: string; // yyyy-MM-dd
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DatePicker({ value, onChange, placeholder }: DatePickerProps) {
  const date = value ? parseISO(value) : undefined;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center justify-between h-11 w-full rounded-sm border-transparent bg-muted px-4 py-2 text-sm font-normal transition-colors hover:bg-accent",
          !value && "text-muted-foreground"
        )}
      >
        {date ? format(date, "dd/MM/yyyy") : <span>{placeholder ?? "dd/mm/aaaa"}</span>}
        <CalendarIcon className="h-4 w-4 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          onSelect={(d) => {
            if (d) onChange(format(d, "yyyy-MM-dd"));
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
