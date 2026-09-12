/**
 * Timezone and Date Utility functions for VOITSFEST.
 * Enforces literal string preservation and UTC-based literal display formatting (no double +7 offset).
 */

/**
 * 1. Form Submission Payload (Prevent UTC Offset Shift)
 * Ensures the literal string value from <input type="datetime-local"> (e.g. "2026-09-27T23:59")
 * is passed directly to Supabase as "YYYY-MM-DDTHH:mm:ss" without any timezone reduction.
 */
export const formatForSupabase = (localInputValue: string): string | null => {
  if (!localInputValue) return null;
  // Append seconds if missing to ensure valid timestamp format: "YYYY-MM-DDTHH:mm:ss"
  return localInputValue.length === 16 
    ? `${localInputValue}:00` 
    : localInputValue;
};

/**
 * 2. Form Initialization / Edit Loading
 * When pre-filling <input type="datetime-local"> from Supabase:
 * Parse the stored date string directly into YYYY-MM-DDTHH:mm without converting through timezone offsets.
 * (e.g., "2026-09-27 23:59:00" or "2026-09-27T23:59:00" -> "2026-09-27T23:59")
 */
export const formatForInput = (storedDateStr?: string | null): string => {
  if (!storedDateStr) return "";
  // Extract the first 16 characters directly (e.g., "2026-09-27T23:59")
  return storedDateStr.replace(" ", "T").slice(0, 16);
};

/**
 * Helper to generate a local datetime string (YYYY-MM-DDTHH:mm) from the local clock
 * without calling toISOString() or suffering UTC timezone reduction.
 */
export const getLocalDatetimeString = (date: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const mins = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${mins}`;
};

/**
 * Parses a date string assuming Asia/Jakarta (WIB, UTC+7).
 * Extracts literal YYYY-MM-DDTHH:mm:ss and interprets as WIB (+07:00),
 * ensuring date.getTime() accurately yields the exact UTC instant of that WIB time.
 */
export const parseWibDate = (dateValue?: string | Date | null): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return isNaN(dateValue.getTime()) ? null : dateValue;
  const clean = String(dateValue).trim();
  if (!clean) return null;

  const match = clean.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)/);
  if (match) {
    const time = match[2].length === 5 ? `${match[2]}:00` : match[2];
    const wibStr = `${match[1]}T${time}+07:00`;
    const d = new Date(wibStr);
    return isNaN(d.getTime()) ? new Date(clean) : d;
  }

  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Form Input / Datetime Picker Population fallback.
 */
export const toLocalISOString = (dateStr?: string | Date | null): string => {
  if (!dateStr) return "";
  if (typeof dateStr === "string") {
    return formatForInput(dateStr);
  }
  if (dateStr instanceof Date) {
    if (isNaN(dateStr.getTime())) return "";
    return getLocalDatetimeString(dateStr);
  }
  return "";
};

// Backwards-compatible alias for existing imports
export const toWibDatetimeLocal = toLocalISOString;

/**
 * Converts a datetime-local input string (`YYYY-MM-DDTHH:mm`) entered by user in WIB
 * into a standard UTC ISO 8601 string for Supabase storage (legacy fallback).
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

  const wibIsoString = `${datePart}T${timePart}+07:00`;
  const dateObj = new Date(wibIsoString);
  if (isNaN(dateObj.getTime())) {
    const fallback = new Date(cleanStr);
    return isNaN(fallback.getTime()) ? "" : fallback.toISOString();
  }

  return dateObj.toISOString();
};

/**
 * Date Display Formatter (Direct String / UTC Formatting)
 * Treats the stored date string literally without timezone addition,
 * preventing double +7 hour offset (e.g., 23:59 on Sept 27 renders as 23:59 WIB, NOT 06:59 on Sept 28).
 * Output example: "27 Sep 2026, 23.59 WIB"
 */
export const formatDateDisplay = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return "-";
  
  if (dateString instanceof Date) {
    if (isNaN(dateString.getTime())) return "-";
    return (
      new Intl.DateTimeFormat("id-ID", {
        timeZone: "UTC",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(dateString) + " WIB"
    );
  }

  const str = String(dateString).trim();
  if (!str) return "-";

  // Extract the literal components YYYY-MM-DDTHH:mm:ss directly
  const match = str.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)/);
  let isoUtcStr = str;
  if (match) {
    const time = match[2].length === 5 ? `${match[2]}:00` : match[2];
    isoUtcStr = `${match[1]}T${time}Z`;
  } else {
    isoUtcStr = str.replace(" ", "T");
    if (!isoUtcStr.endsWith("Z") && !/[+-]\d{2}(:\d{2})?$/.test(isoUtcStr)) {
      isoUtcStr += "Z";
    }
  }

  const date = new Date(isoUtcStr);
  if (isNaN(date.getTime())) {
    const fallback = new Date(dateString);
    if (isNaN(fallback.getTime())) return "-";
    return (
      new Intl.DateTimeFormat("id-ID", {
        timeZone: "UTC",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(fallback) + " WIB"
    );
  }

  return (
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "UTC", // Treat the string as literal time, preventing double +7 offset
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date) + " WIB"
  );
};

// Aliases for compatibility
export const formatWIB = formatDateDisplay;
export const formatWibShortDateTime = formatDateDisplay;

/**
 * Standard Indonesian Long DateTime formatter in literal WIB time without double offset.
 * Output example: "27 September 2026 23.59 WIB"
 */
export function formatWibDateTime(
  dateValue: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateValue) return "-";
  if (dateValue instanceof Date) {
    if (isNaN(dateValue.getTime())) return "-";
    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: "UTC",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      ...options,
    };
    return new Intl.DateTimeFormat("id-ID", defaultOptions).format(dateValue);
  }

  const str = String(dateValue).trim();
  if (!str) return "-";
  const match = str.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)/);
  let isoUtcStr = str;
  if (match) {
    const time = match[2].length === 5 ? `${match[2]}:00` : match[2];
    isoUtcStr = `${match[1]}T${time}Z`;
  } else {
    isoUtcStr = str.replace(" ", "T");
    if (!isoUtcStr.endsWith("Z") && !/[+-]\d{2}(:\d{2})?$/.test(isoUtcStr)) {
      isoUtcStr += "Z";
    }
  }

  const date = new Date(isoUtcStr);
  const validDate = isNaN(date.getTime()) ? new Date(dateValue) : date;
  if (isNaN(validDate.getTime())) return "-";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    ...options,
  };

  return new Intl.DateTimeFormat("id-ID", defaultOptions).format(validDate);
}

/**
 * Formats a start and end date range in literal WIB time.
 * Output example: "1 Sep 2026, 00.00 WIB - 27 Sep 2026, 23.59 WIB"
 */
export function formatWibDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): string {
  if (!startDate && !endDate) return "Periode Tidak Ditentukan";
  if (!startDate) return `Hingga ${formatDateDisplay(endDate)}`;
  if (!endDate) return `Mulai ${formatDateDisplay(startDate)}`;

  const startFormatted = formatDateDisplay(startDate);
  const endFormatted = formatDateDisplay(endDate);

  return `${startFormatted} - ${endFormatted}`;
}
