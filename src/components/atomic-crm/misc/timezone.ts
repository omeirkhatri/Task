import { getCrmTimeZone, getCrmTimeZoneOffsetMinutes } from "@/hooks/useTimezone";

export type DateInput = Date | string | number | null | undefined;

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const pad = (value: number) => value.toString().padStart(2, "0");

/**
 * Gets the current CRM timezone
 * @deprecated Use getCrmTimeZone() function instead
 */
export function CRM_TIME_ZONE(): string {
  return getCrmTimeZone();
}

/**
 * Gets the current CRM timezone label (e.g., "UTC+4")
 */
export function getCrmTimeZoneLabel(): string {
  const offsetMinutes = getCrmTimeZoneOffsetMinutes();
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetMins = Math.abs(offsetMinutes) % 60;
  const sign = offsetMinutes >= 0 ? "+" : "-";
  
  const result = offsetMins === 0 
    ? `UTC${sign}${offsetHours}`
    : `UTC${sign}${offsetHours}:${String(offsetMins).padStart(2, "0")}`;
  return result;
}

/**
 * Gets the current CRM timezone label (e.g., "UTC+4")
 * @deprecated Use getCrmTimeZoneLabel() function instead for dynamic updates
 * This constant is initialized with a safe fallback to avoid module load errors
 */
export const CRM_TIME_ZONE_LABEL = (() => {
  try {
    if (typeof window !== "undefined") {
      return getCrmTimeZoneLabel();
    }
  } catch (error) {
    // Silently fall back to default
  }
  return "UTC+4"; // Safe fallback
})();

/**
 * Gets a formatter for date-time using the current CRM timezone
 */
function getDateTimeFormatter() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: getCrmTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Gets a formatter for date using the current CRM timezone
 */
function getDateFormatter() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: getCrmTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Gets a formatter for YYYY-MM-DD date strings using the current CRM timezone
 */
function getYmdDateFormatter() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: getCrmTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Gets a formatter for time using the current CRM timezone
 */
function getTimeFormatter() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: getCrmTimeZone(),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Gets a formatter for date-time parts using the current CRM timezone
 */
function getPartsFormatter() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: getCrmTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * Formats a date as DD/MM/YYYY or DD/MM (without year if same year as current)
 * This ensures consistent DD/MM/YYYY format regardless of browser locale
 */
function formatDateDDMMYYYY(date: Date, includeYear: boolean = true): string {
  try {
    if (!date || isNaN(date.getTime())) {
      return "";
    }
    const dateFormatter = getDateFormatter();
    const parts = dateFormatter.formatToParts(date);
    const day = parts.find((p) => p.type === "day")?.value || "";
    const month = parts.find((p) => p.type === "month")?.value || "";
    const year = parts.find((p) => p.type === "year")?.value || "";

    if (!day || !month) {
      return "";
    }

    if (includeYear) {
      return `${day}/${month}/${year}`;
    }
    return `${day}/${month}`;
  } catch (error) {
    console.warn("Error formatting date:", error, date);
    return "";
  }
}

function parseDate(value: DateInput): Date | undefined {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return undefined;
}

function getZonedParts(value: DateInput) {
  const date = parseDate(value);
  if (!date) return undefined;
  const partsFormatter = getPartsFormatter();
  const parts = partsFormatter.formatToParts(date).reduce<Record<string, number>>(
    (acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = Number(part.value);
      }
      return acc;
    },
    {},
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour ?? 0,
    minute: parts.minute ?? 0,
    second: parts.second ?? 0,
    millisecond: 0,
  };
}

/**
 * Converts a timezone-local time to a UTC Date object.
 * 
 * CRITICAL: This function SUBTRACTS the timezone offset from the UTC timestamp.
 * 
 * Example for UTC+4:
 * - Input: {year: 2025, month: 12, day: 26, hour: 0, minute: 0} (00:00 in CRM timezone)
 * - Creates: Date.UTC(2025, 11, 26, 0, 0, 0) = 2025-12-26T00:00:00Z
 * - Subtracts offset: 00:00 - 4 hours = 2025-12-25T20:00:00Z
 * - Result: Date representing 00:00 in UTC+4 (which is 20:00 UTC previous day)
 * 
 * When this Date is formatted in CRM timezone using extractCrmTime(), it correctly shows 00:00.
 * 
 * DO NOT change the subtraction operation - it depends on getCrmTimeZoneOffsetMinutes()
 * returning a positive value for timezones ahead of UTC.
 */
function buildUtcFromZoned(parts: {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
  millisecond?: number;
}) {
  if (
    parts.year === undefined ||
    parts.month === undefined ||
    parts.day === undefined
  ) {
    return undefined;
  }

  // Get offset: positive for timezones ahead of UTC (e.g., +240 for UTC+4)
  const offsetMinutes = getCrmTimeZoneOffsetMinutes();
  const offsetMs = offsetMinutes * 60 * 1000;

  // CRITICAL: We SUBTRACT the offset to convert timezone time to UTC
  // This works because getCrmTimeZoneOffsetMinutes() returns positive for UTC+4
  // DO NOT change this to addition - it will break timezone conversions!
  return new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour ?? 0,
      parts.minute ?? 0,
      parts.second ?? 0,
      parts.millisecond ?? 0,
    ) - offsetMs,
  );
}

export function formatCrmDateTime(value: DateInput) {
  const date = parseDate(value);
  if (!date) return "";
  return getDateTimeFormatter().format(date);
}

/**
 * Formats a date as DD/MM/YYYY using the CRM timezone.
 * This ensures consistent DD/MM/YYYY format regardless of browser locale.
 */
export function formatCrmDate(value: DateInput) {
  const date = parseDate(value);
  if (!date) return "";
  return formatDateDDMMYYYY(date, true);
}

/**
 * Formats a date as DD/MM (without year) using the CRM timezone.
 * Useful for dates like birthdays or recurring events where year is not needed.
 */
export function formatCrmDateShort(value: DateInput) {
  const date = parseDate(value);
  if (!date) return "";
  return formatDateDDMMYYYY(date, false);
}

export function formatCrmTime(value: DateInput) {
  const date = parseDate(value);
  if (!date) return "";
  return getTimeFormatter().format(date);
}

/**
 * Extracts hour and minute from a Date object as they appear in the CRM timezone.
 * Returns a string in "HH:MM" format.
 * 
 * IMPORTANT: This function formats the Date in CRM timezone, so it correctly extracts
 * the time components regardless of the Date's internal UTC representation.
 * 
 * Works with Dates created by buildUtcFromZoned() and convertFullCalendarDateToCrmDate():
 * - These Dates have UTC timestamps that represent CRM timezone times
 * - When formatted in CRM timezone, they show the correct time
 * 
 * Example: Date representing 00:00 in UTC+4 (stored as 20:00 UTC previous day)
 * - extractCrmTime() formats it in CRM timezone → returns "00:00" ✓
 * 
 * DO NOT change the timezone formatting - it's critical for correct time extraction.
 */
export function extractCrmTime(value: DateInput): string {
  const date = parseDate(value);
  if (!date) return "00:00";
  const partsFormatter = getPartsFormatter();
  const parts = partsFormatter.formatToParts(date).reduce<Record<string, number>>(
    (acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = Number(part.value);
      }
      return acc;
    },
    {},
  );
  const hour = parts.hour ?? 0;
  const minute = parts.minute ?? 0;
  return `${pad(hour)}:${pad(minute)}`;
}

export function crmDateInputString(value: DateInput = new Date()) {
  const date = parseDate(value);
  if (!date) return "";
  return getDateFormatter().format(date);
}

/**
 * Returns a date string in YYYY-MM-DD format, using the CRM timezone.
 * This is ideal for `<input type="date">` values and react-hook-form state.
 */
export function crmDateYmdInputString(value: DateInput = new Date()) {
  const date = parseDate(value);
  if (!date) return "";
  return getYmdDateFormatter().format(date);
}

export function crmDateStringToDate(value: string | null | undefined) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map((v) => Number(v));
  if (!year || !month || !day) return undefined;
  return buildUtcFromZoned({ year, month, day, hour: 0, minute: 0, second: 0 });
}

export function crmDateStringToISO(value: string | null | undefined) {
  const date = crmDateStringToDate(value);
  return date?.toISOString();
}

export function crmStartOfDay(value: DateInput = new Date()) {
  const parts = getZonedParts(value);
  if (!parts) return undefined;
  return buildUtcFromZoned({ ...parts, hour: 0, minute: 0, second: 0 });
}

export function crmEndOfDay(value: DateInput = new Date()) {
  const parts = getZonedParts(value);
  if (!parts) return undefined;
  return buildUtcFromZoned({
    ...parts,
    hour: 23,
    minute: 59,
    second: 59,
    millisecond: 999,
  });
}

export function crmAddDays(value: DateInput, days: number) {
  const start = crmStartOfDay(value);
  if (!start) return undefined;
  return new Date(start.getTime() + days * DAY_IN_MS);
}

export function crmStartOfWeek(value: DateInput = new Date(), weekStartsOn = 0) {
  const parts = getZonedParts(value);
  if (!parts) return undefined;

  const midpoint = buildUtcFromZoned({ ...parts, hour: 12, minute: 0, second: 0 });
  if (!midpoint) return undefined;

  const tzDay = midpoint.getUTCDay();
  const diff = (tzDay - weekStartsOn + 7) % 7;
  return crmAddDays(midpoint, -diff);
}

export function crmEndOfWeek(value: DateInput = new Date(), weekStartsOn = 0) {
  const start = crmStartOfWeek(value, weekStartsOn);
  if (!start) return undefined;
  return new Date(start.getTime() + 7 * DAY_IN_MS - 1);
}

export function crmStartOfMonth(value: DateInput = new Date()) {
  const parts = getZonedParts(value);
  if (!parts) return undefined;
  return buildUtcFromZoned({
    year: parts.year,
    month: parts.month,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
  });
}

export function crmEndOfYesterday(value: DateInput = new Date()) {
  const yesterday = crmAddDays(value, -1);
  if (!yesterday) return undefined;
  return crmEndOfDay(yesterday);
}

export function crmDayOfWeek(value: DateInput = new Date()) {
  const parts = getZonedParts(value);
  if (!parts) return undefined;
  const midday = buildUtcFromZoned({ ...parts, hour: 12, minute: 0, second: 0 });
  return midday?.getUTCDay();
}

export function crmDateTimeInputString(value: DateInput = new Date()) {
  const parts = getZonedParts(value);
  if (!parts) return "";
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function crmDateTimeStringToDate(value: string | null | undefined) {
  if (!value) return undefined;
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) return undefined;
  const [year, month, day] = datePart.split("-").map((v) => Number(v));
  const [hour, minute] = timePart.split(":").map((v) => Number(v));
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
    return undefined;
  }
  return buildUtcFromZoned({
    year,
    month,
    day,
    hour,
    minute,
    second: 0,
    millisecond: 0,
  });
}

export function crmDateTimeStringToISO(value: string | null | undefined) {
  const date = crmDateTimeStringToDate(value);
  return date?.toISOString();
}

/**
 * Formats a date as relative time (e.g., "2 days ago") for recent dates,
 * or as DD/MM/YYYY for older dates (more than 7 days ago).
 */
export function formatRelativeOrDate(value: DateInput, baseDate: Date = new Date()) {
  const date = parseDate(value);
  if (!date) return "";
  
  const diffMs = baseDate.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / DAY_IN_MS);
  
  // For dates within the last 7 days, use relative format
  if (diffDays >= 0 && diffDays <= 7) {
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    return `${diffDays} days ago`;
  }
  
  // For older dates, use DD/MM/YYYY format
  return formatCrmDate(date);
}

/**
 * Gets today's date at midnight in CRM timezone
 * This is the recommended way to get "today" for date navigation
 */
export function crmToday(): Date {
  const today = crmStartOfDay(new Date());
  if (!today) {
    // Fallback: use local timezone start of day
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  return today;
}

/**
 * Re-export timezone functions for convenience
 */
export { getCrmTimeZone, getCrmTimeZoneOffsetMinutes, getCrmTimeZoneOffsetLabel } from "@/hooks/useTimezone";
