/**
 * Timezone and Date Utility functions for VOITSFEST.
 * Standardized across the application via @/lib/timeUtils.
 * 
 * Re-exports the unified single source of truth from @/lib/timeUtils
 * while maintaining 100% backwards compatibility for existing imports.
 */

export {
  toDateTimeLocalInput,
  formatPayloadToSupabase,
  formatDisplayWIB,
  parseWibDate,
  isEventActive,
  isEventStarted,
  isEventEnded,
  getEventTimeStatus,
  formatDateRangeWIB,
  formatDisplayDateLongWIB,
  formatDisplayTimeWIB,
  getLocalDatetimeString,
} from "./timeUtils";

import {
  toDateTimeLocalInput,
  formatPayloadToSupabase,
  formatDisplayWIB,
  formatDateRangeWIB,
  formatDisplayDateLongWIB,
} from "./timeUtils";

// ── Backwards-Compatibility Aliases ──

/** @deprecated Use `formatPayloadToSupabase` from `@/lib/timeUtils` */
export const formatForSupabase = (localInputValue: string): string | null => {
  return formatPayloadToSupabase(localInputValue);
};

/** @deprecated Use `toDateTimeLocalInput` from `@/lib/timeUtils` */
export const formatForInput = (storedDateStr?: string | null): string => {
  return toDateTimeLocalInput(storedDateStr);
};

/** @deprecated Use `toDateTimeLocalInput` from `@/lib/timeUtils` */
export const toLocalISOString = (dateStr?: string | Date | null): string => {
  return toDateTimeLocalInput(dateStr);
};

/** @deprecated Use `toDateTimeLocalInput` from `@/lib/timeUtils` */
export const toWibDatetimeLocal = toDateTimeLocalInput;

/** @deprecated Use `formatDisplayWIB` from `@/lib/timeUtils` */
export const formatDateDisplay = (dateString: string | Date | null | undefined): string => {
  return formatDisplayWIB(dateString);
};

/** @deprecated Use `formatDisplayWIB` from `@/lib/timeUtils` */
export const formatWIB = formatDisplayWIB;

/** @deprecated Use `formatDisplayWIB` from `@/lib/timeUtils` */
export const formatWibShortDateTime = formatDisplayWIB;

/** @deprecated Use `formatDateRangeWIB` from `@/lib/timeUtils` */
export const formatWibDateRange = formatDateRangeWIB;

/** @deprecated Use `formatDisplayDateLongWIB` from `@/lib/timeUtils` */
export const formatWibDateTime = (
  dateValue: string | Date | null | undefined,
  _options?: Intl.DateTimeFormatOptions
): string => {
  return formatDisplayDateLongWIB(dateValue);
};

/** @deprecated Use `formatPayloadToSupabase` from `@/lib/timeUtils` */
export const wibDatetimeLocalToIso = (datetimeLocalStr: string): string => {
  return formatPayloadToSupabase(datetimeLocalStr) || "";
};
