import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a date string and return as local date (ignoring timezone)
 * We only care about the calendar date, not the time
 */
export function parseUTCDate(dateStr: string): Date {
  // Extract date components
  const [datePart] = dateStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  
  // Create date in LOCAL timezone (not UTC)
  // This ensures the day number matches the database date
  return new Date(year, month - 1, day);
}
