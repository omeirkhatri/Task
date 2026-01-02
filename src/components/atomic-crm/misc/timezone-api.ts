/**
 * TIMEZONE API - Centralized Timezone Utilities
 * 
 * ⚠️ IMPORTANT: Always use functions from this file for timezone-aware date/time operations.
 * DO NOT use native Date methods directly (getHours(), getUTCHours(), toISOString(), etc.)
 * without going through these utilities.
 * 
 * This ensures all time calculations respect the CRM timezone configuration.
 */

import { getCrmTimeZone } from "@/hooks/useTimezone";
import { extractCrmTime, formatCrmDate, crmDateTimeStringToDate } from "./timezone";

// Re-export all safe timezone utilities
export {
  // Date/time formatting (always in CRM timezone)
  formatCrmDate,
  formatCrmDateShort,
  formatCrmTime,
  formatCrmDateTime,
  extractCrmTime,
  
  // Date/time parsing and conversion
  crmDateTimeStringToDate,
  crmDateTimeStringToISO,
  crmDateStringToISO,
  crmDateYmdInputString,
  crmDateTimeInputString,
  
  // Date manipulation (timezone-aware)
  crmStartOfDay,
  crmEndOfDay,
  crmAddDays,
  crmAddHours,
  crmAddMinutes,
  crmDayOfWeek,
  crmStartOfWeek,
  crmEndOfWeek,
  crmStartOfMonth,
  crmEndOfYesterday,
  
  // Relative date formatting
  formatRelativeOrDate,
  
  // Types
  type DateInput,
} from "./timezone";

// Re-export timezone info
export {
  getCrmTimeZone,
  getCrmTimeZoneOffsetMinutes,
  getCrmTimeZoneLabel,
} from "@/hooks/useTimezone";

/**
 * Helper: Get current date/time in CRM timezone
 * Use this instead of new Date() when you need CRM timezone-aware dates
 */
export function getCurrentCrmDate(): Date {
  return new Date(); // Date objects are always UTC internally, formatting handles timezone
}

/**
 * Helper: Create a Date from year, month, day, hour, minute in CRM timezone
 * Use this instead of new Date(year, month, day, hour, minute)
 */
export function createCrmDate(
  year: number,
  month: number, // 1-12 (not 0-11 like Date constructor)
  day: number,
  hour: number = 0,
  minute: number = 0,
  second: number = 0
): Date | undefined {
  const dateTimeString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return crmDateTimeStringToDate(dateTimeString);
}

/**
 * Helper: Parse a date string and return Date in CRM timezone
 * Use this instead of new Date(dateString)
 */
export function parseCrmDateString(dateString: string): Date | undefined {
  return crmDateTimeStringToDate(dateString);
}

/**
 * Helper: Get time components from a Date as they appear in CRM timezone
 * Returns {hour, minute, second} in CRM timezone
 */
export function getCrmTimeComponents(date: Date): { hour: number; minute: number; second: number } | null {
  const timeStr = extractCrmTime(date);
  const [hour, minute] = timeStr.split(':').map(Number);
  if (isNaN(hour) || isNaN(minute)) return null;
  
  // Get seconds from the date
  const partsFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: getCrmTimeZone(),
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = partsFormatter.formatToParts(date);
  const second = parseInt(parts.find(p => p.type === "second")?.value || "0", 10);
  
  return { hour, minute, second };
}

/**
 * Helper: Get date components from a Date as they appear in CRM timezone
 * Returns {year, month, day} in CRM timezone
 */
export function getCrmDateComponents(date: Date): { year: number; month: number; day: number } | null {
  const dateStr = formatCrmDate(date);
  if (!dateStr) return null;
  
  const [day, month, year] = dateStr.split('/').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  
  return { year, month, day };
}

