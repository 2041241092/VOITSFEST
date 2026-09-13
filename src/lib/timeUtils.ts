/**
 * VOITSFEST Centralized Time Utility (src/lib/timeUtils.ts)
 * Single source of truth for datetime handling across the entire project.
 * 
 * Guarantees 100% synchronization between:
 * - Form inputs (<input type="datetime-local">)
 * - Supabase storage (preserves literal YYYY-MM-DDTHH:mm:ss without toISOString() skew)
 * - UI displays (literal WIB rendering, preventing double +7h offset)
 * - Active / Expired guards (explicit Asia/Jakarta UTC+7 parsing)
 */

const ID_MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

const ID_MONTHS_LONG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const ID_DAYS = [
  "Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"
];

/**
 * 1. Form Pre-filling Helper: toDateTimeLocalInput
 * For pre-filling <input type="datetime-local"> (format: YYYY-MM-DDTHH:mm)
 * Accurately extracts the literal date/time from Supabase strings or formats Dates in WIB.
 * 
 * @param storedDate Stored date string, Date object, or null/undefined
 * @returns Form-ready "YYYY-MM-DDTHH:mm" string, or empty string "" if invalid/empty
 */
export function toDateTimeLocalInput(storedDate?: string | Date | null): string {
  if (!storedDate) return "";

  // If Date object, format in Asia/Jakarta (WIB) timezone
  if (storedDate instanceof Date) {
    if (isNaN(storedDate.getTime())) return "";
    return formatDateToWibLocalString(storedDate);
  }

  const clean = String(storedDate).trim();
  if (!clean) return "";

  // Date-only string (e.g. "2026-09-27")
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return `${clean}T00:00`;
  }

  // Literal string (e.g. "2026-09-27 23:59:00", "2026-09-27T23:59:00", "2026-09-27T23:59")
  const literalMatch = clean.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2})?$/);
  if (literalMatch) {
    return `${literalMatch[1]}T${literalMatch[2]}`;
  }

  // If string contains explicit UTC/offset indicators (Z, +00:00, etc.) after time
  const hasTimezoneOffset = /(?:T|\s)\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}(?::\d{2})?)$/i.test(clean);
  if (hasTimezoneOffset) {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return formatDateToWibLocalString(d);
    }
  }

  // General match if there are trailing characters
  const match = clean.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (match) {
    return `${match[1]}T${match[2]}`;
  }

  // Fallback direct extraction
  return clean.replace(" ", "T").slice(0, 16);
}

/**
 * 2. Form Submission Payload Helper: formatPayloadToSupabase
 * Formats string directly into "YYYY-MM-DDTHH:mm:ss" without calling toISOString(),
 * preventing timezone skew (e.g. 23:59 WIB will NOT become 16:59 UTC).
 * 
 * @param inputValue Value directly from <input type="datetime-local"> or string
 * @returns "YYYY-MM-DDTHH:mm:ss" string, or null if empty
 */
export function formatPayloadToSupabase(inputValue?: string | null): string | null {
  if (!inputValue) return null;
  const clean = String(inputValue).trim();
  if (!clean) return null;

  // Already full YYYY-MM-DDTHH:mm:ss
  const fullMatch = clean.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
  if (fullMatch) {
    return `${fullMatch[1]}T${fullMatch[2]}`;
  }

  // 16 chars YYYY-MM-DDTHH:mm from input[type="datetime-local"]
  const shortMatch = clean.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})$/);
  if (shortMatch) {
    return `${shortMatch[1]}T${shortMatch[2]}:00`;
  }

  // Date-only YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return `${clean}T00:00:00`;
  }

  // Fallback
  const standard = clean.replace(" ", "T");
  return standard.length === 16 ? `${standard}:00` : standard;
}

/**
 * Parses any date value assuming Asia/Jakarta (WIB, UTC+7) offset.
 * Ensures date.getTime() accurately yields the exact UTC epoch instant of that WIB time.
 * 
 * @param dateValue Date string, Date instance, or null/undefined
 * @returns Date object pinned to the exact instant, or null if invalid
 */
export function parseWibDate(dateValue?: string | Date | null): Date | null {
  if (!dateValue) return null;
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }

  const clean = String(dateValue).trim();
  if (!clean) return null;

  // Date-only string (e.g. "2026-09-27")
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const d = new Date(`${clean}T00:00:00+07:00`);
    return isNaN(d.getTime()) ? new Date(clean) : d;
  }

  // Literal YYYY-MM-DDTHH:mm:ss or YYYY-MM-DD HH:mm:ss
  const match = clean.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)$/);
  if (match) {
    const time = match[2].length === 5 ? `${match[2]}:00` : match[2];
    const wibStr = `${match[1]}T${time}+07:00`;
    const d = new Date(wibStr);
    return isNaN(d.getTime()) ? new Date(clean) : d;
  }

  // If string already has timezone specifier (+07:00, Z, etc.) after time
  if (/(?:T|\s)\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}(?::\d{2})?)$/i.test(clean)) {
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * 3. Date Display Formatter: formatDisplayWIB
 * Renders dates as "DD Mon YYYY, HH:mm WIB".
 * For literal stored strings, uses timeZone: 'UTC' / direct parsing to avoid double +7 hour shifts.
 * For UTC timestamp strings (with Z/offset) or Date objects, formats to Asia/Jakarta (WIB).
 * 
 * Example output: "27 Sep 2026, 23:59 WIB"
 */
export function formatDisplayWIB(storedDate?: string | Date | null): string {
  if (!storedDate) return "-";

  // Date instance
  if (storedDate instanceof Date) {
    if (isNaN(storedDate.getTime())) return "-";
    return formatWibParts(storedDate);
  }

  const clean = String(storedDate).trim();
  if (!clean) return "-";

  // Date-only literal string (e.g. "2026-09-27")
  const dateOnlyMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const year = dateOnlyMatch[1];
    const monthIndex = parseInt(dateOnlyMatch[2], 10) - 1;
    const day = parseInt(dateOnlyMatch[3], 10);
    const monthStr = ID_MONTHS_SHORT[monthIndex] || dateOnlyMatch[2];
    return `${day} ${monthStr} ${year}`;
  }

  // Literal stored string without offset: extract literal numbers directly to guarantee zero shift
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    const year = match[1];
    const monthIndex = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const hour = match[4];
    const minute = match[5];
    const monthStr = ID_MONTHS_SHORT[monthIndex] || match[2];
    return `${day} ${monthStr} ${year}, ${hour}:${minute} WIB`;
  }

  // If string has explicit timezone offset (e.g. Postgres timestamptz like "2026-09-27T16:59:00Z")
  const hasOffset = /(?:T|\s)\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}(?::\d{2})?)$/i.test(clean);
  if (hasOffset) {
    const d = new Date(clean);
    if (isNaN(d.getTime())) return "-";
    return formatWibParts(d);
  }

  // Fallback parse
  const d = new Date(clean);
  if (isNaN(d.getTime())) return "-";
  return formatWibParts(d);
}

/**
 * 4. Active / Expired Guard: isEventActive
 * Safely checks if current timestamp falls within the event window using explicit +07:00 offset parsing.
 * 
 * @param startDate Event/Promo start date string or Date
 * @param endDate Event/Promo end date string or Date
 * @returns true if current time is within [startDate, endDate] (or if unbounded)
 */
export function isEventActive(startDate?: string | Date | null, endDate?: string | Date | null): boolean {
  const nowMs = Date.now();

  if (startDate) {
    const startObj = parseWibDate(startDate);
    if (startObj && startObj.getTime() > nowMs) {
      return false; // Has not started yet
    }
  }

  if (endDate) {
    const endObj = parseWibDate(endDate);
    if (endObj && !(endObj.getTime() >= nowMs)) {
      return false; // Already expired
    }
  }

  return true;
}

/**
 * Checks if an event or promo has started yet.
 */
export function isEventStarted(startDate?: string | Date | null): boolean {
  if (!startDate) return true;
  const startObj = parseWibDate(startDate);
  return !startObj || startObj.getTime() <= Date.now();
}

/**
 * Checks if an event or promo has ended/expired.
 */
export function isEventEnded(endDate?: string | Date | null): boolean {
  if (!endDate) return false;
  const endObj = parseWibDate(endDate);
  return Boolean(endObj && !(endObj.getTime() >= Date.now()));
}

/**
 * Detailed Event Time Status Helper
 */
export function getEventTimeStatus(startDate?: string | Date | null, endDate?: string | Date | null) {
  const nowMs = Date.now();
  const startDateObj = parseWibDate(startDate);
  const endDateObj = parseWibDate(endDate);

  const isStarted = !startDateObj || startDateObj.getTime() <= nowMs;
  const isEnded = Boolean(endDateObj && !(endDateObj.getTime() >= nowMs));
  const isActive = isStarted && !isEnded;

  return {
    isActive,
    isStarted,
    isEnded,
    startDateObj,
    endDateObj,
  };
}

/**
 * Formats a start and end date range in literal WIB time.
 * Example: "1 Sep 2026, 00:00 WIB - 27 Sep 2026, 23:59 WIB"
 */
export function formatDateRangeWIB(
  startDate?: string | Date | null,
  endDate?: string | Date | null
): string {
  if (!startDate && !endDate) return "Periode Tidak Ditentukan";
  if (!startDate) return `Hingga ${formatDisplayWIB(endDate)}`;
  if (!endDate) return `Mulai ${formatDisplayWIB(startDate)}`;

  const startFormatted = formatDisplayWIB(startDate);
  const endFormatted = formatDisplayWIB(endDate);

  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Formats a date into Indonesian Long Date strictly in WIB (Asia/Jakarta).
 * Example: "Sabtu, 24 Oktober 2026" or "24 Oktober 2026"
 */
export function formatDisplayDateLongWIB(
  dateValue?: string | Date | null,
  fallback: string = "",
  includeWeekday: boolean = true
): string {
  if (!dateValue) return fallback;

  // If already full string like "Sabtu, 24 Oktober 2026"
  const str = String(dateValue).trim();
  if (ID_DAYS.some((d) => str.startsWith(d))) {
    return str;
  }

  // Parse literal YYYY-MM-DD or full timestamp
  const d = parseWibDate(dateValue);
  if (!d || isNaN(d.getTime())) return fallback || str;

  // Extract date components in Asia/Jakarta
  const formatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: includeWeekday ? "long" : undefined,
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return formatter.format(d);
}

/**
 * Formats a time string into display format with "WIB - Selesai" or "HH:mm WIB".
 * Example: "15:00" -> "15:00 WIB - Selesai"
 */
export function formatDisplayTimeWIB(
  timeStr?: string | Date | null,
  fallback: string = "WIB - Selesai"
): string {
  if (!timeStr) return fallback;

  if (timeStr instanceof Date) {
    if (isNaN(timeStr.getTime())) return fallback;
    const parts = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(timeStr);
    const hour = parts.find((p) => p.type === "hour")?.value || "00";
    const minute = parts.find((p) => p.type === "minute")?.value || "00";
    return `${hour}:${minute} WIB`;
  }

  const t = String(timeStr).trim();
  if (!t) return fallback;

  if (t.toLowerCase().includes("wib") || t.toLowerCase().includes("selesai")) {
    return t;
  }

  return `${t} WIB - Selesai`;
}

/**
 * Generates a local datetime string (YYYY-MM-DDTHH:mm) for Asia/Jakarta (WIB)
 * for initializing form picker defaults.
 */
export function getLocalDatetimeString(date: Date = new Date()): string {
  return formatDateToWibLocalString(date);
}

// ── Private Internal Helpers ──

function formatDateToWibLocalString(d: Date): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  const hour = parts.find((p) => p.type === "hour")?.value;
  const minute = parts.find((p) => p.type === "minute")?.value;

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function formatWibParts(d: Date): string {
  const parts = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const day = parts.find((p) => p.type === "day")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const year = parts.find((p) => p.type === "year")?.value;
  const hour = parts.find((p) => p.type === "hour")?.value;
  const minute = parts.find((p) => p.type === "minute")?.value;

  return `${day} ${month} ${year}, ${hour}:${minute} WIB`;
}
