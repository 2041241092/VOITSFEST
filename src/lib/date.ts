/**
 * Timezone and Date Utility functions for VOITSFEST.
 * Enforces Asia/Jakarta (WIB, UTC+7) timezone formatting and conversion
 * between UTC timestamps in Supabase (16:59 UTC) and local WIB inputs/displays (23:59 WIB).
 */

/**
 * 1. Form Input / Datetime Picker Population
 * Formats a UTC timestamp string (e.g. from Supabase "2026-09-27T16:59:00.000Z")
 * explicitly in local WIB time (YYYY-MM-DDTHH:mm) for <input type="datetime-local">,
 * so that 16:59 UTC renders as 23:59 in the input field across all devices.
 */
export const toLocalISOString = (dateStr?: string | Date | null): string => {
  if (!dateStr) return "";
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return "";

  // In WIB (Asia/Jakarta, UTC+7), offset is +7 hours (+420 minutes / 25,200,000 ms)
  // This explicitly guarantees that 16:59 UTC always renders as 23:59 in the input field.
  const wibTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return wibTime.toISOString().slice(0, 16);
};

// Backwards-compatible alias for existing imports
export const toWibDatetimeLocal = toLocalISOString;

/**
 * Converts a datetime-local input string (`YYYY-MM-DDTHH:mm`) entered by user in WIB
 * into a standard UTC ISO 8601 string for Supabase storage.
 * Example:
 * Input: "2026-09-27T23:59"
 * Output: "2026-09-27T16:59:00.000Z" (which corresponds to 23:59 WIB)
 */
export const wibDatetimeLocalToIso = (datetimeLocalStr: string): string => {
  if (!datetimeLocalStr) return "";
  const cleanStr = datetimeLocalStr.trim();
  const parts = cleanStr.split("T");
  if (parts.length !== 2) {
    const fallback = new Date(cleanStr);
    return isNaN(fallback.getTime()) ? "" : fallback.toISOString();
  }

  const datePart = parts[0];
  let timePart = parts[1];
  if (timePart.length === 5) {
    timePart = `${timePart}:00`;
  }

  // Explicitly append +07:00 WIB offset so standard UTC timestamp is produced
  const wibIsoString = `${datePart}T${timePart}+07:00`;
  const dateObj = new Date(wibIsoString);
  if (isNaN(dateObj.getTime())) {
    const fallback = new Date(cleanStr);
    return isNaN(fallback.getTime()) ? "" : fallback.toISOString();
  }

  return dateObj.toISOString();
};

/**
 * 2. Table & Card Display Formatting
 * Formats a UTC date string using Indonesian locale (id-ID) and Asia/Jakarta timezone.
 * Output example: "27 Sep 2026, 23.59 WIB"
 */
export const formatWIB = (dateStr?: string | Date | null): string => {
  if (!dateStr) return "-";
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return "-";

  return (
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date) + " WIB"
  );
};

// Backwards-compatible alias for existing imports
export const formatWibShortDateTime = formatWIB;

/**
 * Standard Indonesian Long DateTime formatter in WIB (Asia/Jakarta) timezone.
 * Output example: "27 September 2026 23.59 WIB"
 */
export function formatWibDateTime(
  dateValue: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateValue) return "-";
  const d = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  if (isNaN(d.getTime())) return "-";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    ...options,
  };

  return new Intl.DateTimeFormat("id-ID", defaultOptions).format(d);
}

/**
 * Formats a start and end date range in Asia/Jakarta timezone.
 * Output example: "1 Sep 2026, 00.00 WIB - 27 Sep 2026, 23.59 WIB"
 */
export function formatWibDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): string {
  if (!startDate && !endDate) return "Periode Tidak Ditentukan";
  if (!startDate) return `Hingga ${formatWIB(endDate)}`;
  if (!endDate) return `Mulai ${formatWIB(startDate)}`;

  const startFormatted = formatWIB(startDate);
  const endFormatted = formatWIB(endDate);

  return `${startFormatted} - ${endFormatted}`;
}
