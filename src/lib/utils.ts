import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Normalize a Date to UTC midnight on its local calendar day. The form's
// Calendar returns local-midnight Dates, which serialize back to the previous
// day in UTC for users east of UTC — breaking date-string grouping.
export function toUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}
