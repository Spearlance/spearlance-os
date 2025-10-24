import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a date string as UTC to avoid timezone shifts
 * Converts "2025-12-02T00:00:00.000Z" or "2025-12-02" to correct UTC date
 */
export function parseUTCDate(dateStr: string): Date {
  // If already has 'Z' suffix, parse normally
  if (dateStr.endsWith('Z')) {
    return new Date(dateStr);
  }
  
  // Extract date components
  const [datePart] = dateStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  
  // Create date in UTC
  return new Date(Date.UTC(year, month - 1, day));
}
