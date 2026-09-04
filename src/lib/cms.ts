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

/**
 * Formats a date string into Indonesian locale strictly enforcing the Asia/Jakarta (WIB) timezone.
 * Handles YYYY-MM-DD date-only strings safely by appending +07:00 to prevent backward timezone shifting.
 *
 * @param dateStr Date string or ISO format from Supabase CMS
 * @param fallback Fallback date string if dateStr is missing or invalid
 * @returns Formatted Indonesian date string (e.g. "Sabtu, 31 Oktober 2026")
 */
export function formatDisplayDate(dateStr?: string, fallback: string = ""): string {
  if (!dateStr || !dateStr.trim()) return fallback;
  try {
    const trimmed = dateStr.trim();
    let parsedInput = trimmed;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      parsedInput = `${trimmed}T00:00:00+07:00`;
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      parsedInput = `${trimmed}+07:00`;
    }
    const d = new Date(parsedInput);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      timeZone: "Asia/Jakarta",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
