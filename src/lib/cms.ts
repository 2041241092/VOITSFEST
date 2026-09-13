/**
 * Helper utility for CMS settings parsing and validation.
 */

/**
 * Cleanly parses the `event_details` CMS setting value into a boolean flag.
 * Handles boolean values directly, JSON boolean strings ("true"/"false"),
 * numeric flags (1/0), and object structures ({ active: boolean }).
 *
 * @param value The raw value from cms_settings table row where key === 'event_details'
 * @returns boolean indicating whether event details should be rendered
 */
export function parseEventDetails(value: unknown): boolean {
  if (value === false || value === "false" || value === 0) {
    return false;
  }
  if (value === true || value === "true" || value === 1) {
    return true;
  }
  if (typeof value === "object" && value !== null) {
    if ("active" in value) {
      const activeVal = (value as Record<string, unknown>).active;
      return parseEventDetails(activeVal);
    }
  }
  // Default to true if not set or invalid
  return true;
}

import { formatDisplayDateLongWIB, formatDisplayTimeWIB } from "./timeUtils";

/**
 * Formats a date string into Indonesian locale strictly enforcing the Asia/Jakarta (WIB) timezone.
 * Handles YYYY-MM-DD date-only strings safely to prevent backward timezone shifting.
 *
 * @param dateStr Date string or ISO format from Supabase CMS
 * @param fallback Fallback date string if dateStr is missing or invalid
 * @returns Formatted Indonesian date string (e.g. "Sabtu, 24 Oktober 2026")
 */
export function formatDisplayDate(dateStr?: string, fallback: string = ""): string {
  return formatDisplayDateLongWIB(dateStr, fallback, true);
}

/**
 * Formats a time string into display format with "WIB - Selesai".
 *
 * @param timeStr Time string from CMS (e.g. "06:00" or "16:00")
 * @param fallback Fallback time string if timeStr is missing or invalid
 * @returns Formatted time string (e.g. "06:00 WIB - Selesai")
 */
export function formatDisplayTime(timeStr?: string, fallback: string = "WIB - Selesai"): string {
  return formatDisplayTimeWIB(timeStr, fallback);
}
