import { useState, useEffect, useCallback } from "react";

const TIMEZONE_STORAGE_KEY = "crm_timezone";
const DEFAULT_TIMEZONE = "Asia/Dubai"; // GMT+4

/**
 * Gets the timezone offset label (e.g., "UTC+4", "UTC-5")
 */
function getTimezoneOffsetLabel(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((part) => part.type === "timeZoneName");
    
    if (offsetPart) {
      // Format: "GMT+4" -> "UTC+4", "GMT-5" -> "UTC-5", etc.
      return offsetPart.value.replace(/GMT/g, "UTC");
    }
    
    // Fallback: calculate offset using a more reliable method
    const utcTime = now.getTime();
    const utcDate = new Date(utcTime);
    
    // Get the time in the target timezone as if it were UTC
    const tzFormatter = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    
    const tzParts = tzFormatter.formatToParts(utcDate);
    const tzYear = parseInt(tzParts.find(p => p.type === "year")?.value || "0", 10);
    const tzMonth = parseInt(tzParts.find(p => p.type === "month")?.value || "0", 10) - 1;
    const tzDay = parseInt(tzParts.find(p => p.type === "day")?.value || "0", 10);
    const tzHour = parseInt(tzParts.find(p => p.type === "hour")?.value || "0", 10);
    const tzMinute = parseInt(tzParts.find(p => p.type === "minute")?.value || "0", 10);
    const tzSecond = parseInt(tzParts.find(p => p.type === "second")?.value || "0", 10);
    
    // Create a date object representing the timezone time as if it were UTC
    const tzAsUtc = new Date(Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute, tzSecond));
    
    // Calculate offset
    const offsetMs = utcTime - tzAsUtc.getTime();
    const offsetMinutes = Math.round(offsetMs / (1000 * 60));
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;
    const sign = offsetMinutes >= 0 ? "+" : "-";
    
    if (offsetMins === 0) {
      return `UTC${sign}${offsetHours}`;
    }
    return `UTC${sign}${offsetHours}:${String(offsetMins).padStart(2, "0")}`;
  } catch (error) {
    console.warn("Error calculating timezone offset:", error);
    return "UTC+4"; // Default fallback
  }
}

/**
 * Gets a human-readable timezone name
 */
function getTimezoneDisplayName(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      timeZoneName: "long",
    });
    const parts = formatter.formatToParts(now);
    const tzName = parts.find((part) => part.type === "timeZoneName");
    return tzName?.value || timezone;
  } catch (error) {
    return timezone;
  }
}

/**
 * Hook for managing CRM timezone configuration
 * 
 * @returns Object with timezone, setTimezone function, offset label, and display name
 * 
 * @example
 * ```tsx
 * const { timezone, setTimezone, offsetLabel, displayName } = useTimezone();
 * 
 * // Change timezone
 * setTimezone("America/New_York");
 * ```
 */
export function useTimezone() {
  const [timezone, setTimezoneState] = useState<string>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_TIMEZONE;
    }
    const stored = localStorage.getItem(TIMEZONE_STORAGE_KEY);
    return stored || DEFAULT_TIMEZONE;
  });

  // Update localStorage when timezone changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(TIMEZONE_STORAGE_KEY, timezone);
    }
  }, [timezone]);

  const setTimezone = useCallback((newTimezone: string) => {
    setTimezoneState(newTimezone);
    // Trigger a custom event so other parts of the app can react
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("timezone-changed", { detail: { timezone: newTimezone } }));
    }
  }, []);

  const offsetLabel = getTimezoneOffsetLabel(timezone);
  const displayName = getTimezoneDisplayName(timezone);

  return {
    timezone,
    setTimezone,
    offsetLabel,
    displayName,
  };
}

/**
 * Gets the current CRM timezone (for use outside React components)
 * 
 * @returns The current timezone string
 */
export function getCrmTimeZone(): string {
  if (typeof window === "undefined") {
    return DEFAULT_TIMEZONE;
  }
  try {
    const stored = localStorage.getItem(TIMEZONE_STORAGE_KEY);
    const result = stored || DEFAULT_TIMEZONE;
    return result;
  } catch (error) {
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Gets the timezone offset in minutes from UTC.
 * 
 * IMPORTANT: This function returns a POSITIVE value for timezones AHEAD of UTC.
 * Examples:
 * - UTC+4 (Asia/Dubai) returns +240 minutes
 * - UTC-5 (EST) returns -300 minutes
 * 
 * The sign is critical for buildUtcFromZoned() which SUBTRACTS this offset.
 * DO NOT change the calculation formula without understanding the impact on all
 * timezone conversion functions.
 * 
 * @returns Offset in minutes (positive = ahead of UTC, negative = behind UTC)
 */
export function getCrmTimeZoneOffsetMinutes(): number {
  const timezone = getCrmTimeZone();
  try {
    const now = new Date();
    const utcTime = now.getTime();
    
    // Get the time components in the target timezone
    const tzFormatter = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    
    const tzParts = tzFormatter.formatToParts(now);
    const tzYear = parseInt(tzParts.find(p => p.type === "year")?.value || "0", 10);
    const tzMonth = parseInt(tzParts.find(p => p.type === "month")?.value || "0", 10) - 1;
    const tzDay = parseInt(tzParts.find(p => p.type === "day")?.value || "0", 10);
    const tzHour = parseInt(tzParts.find(p => p.type === "hour")?.value || "0", 10);
    const tzMinute = parseInt(tzParts.find(p => p.type === "minute")?.value || "0", 10);
    const tzSecond = parseInt(tzParts.find(p => p.type === "second")?.value || "0", 10);
    
    // Create a date object representing the timezone time as if it were UTC
    const tzAsUtc = new Date(Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute, tzSecond));
    
    // CRITICAL: Calculate offset correctly
    // Formula: tzAsUtc.getTime() - utcTime
    // 
    // Example for UTC+4 (Asia/Dubai):
    // - When UTC is 12:00, CRM timezone shows 16:00
    // - tzAsUtc = Date representing 16:00 as if it were UTC
    // - utcTime = actual UTC time (12:00)
    // - offsetMs = 16:00 - 12:00 = +4 hours = +240 minutes ✓
    // 
    // This positive value is then SUBTRACTED in buildUtcFromZoned() to convert
    // CRM timezone time to UTC. DO NOT change this formula!
    const offsetMs = tzAsUtc.getTime() - utcTime;
    const offsetMinutes = Math.round(offsetMs / (1000 * 60));
    
    // Validation: offset should be reasonable (between -12 and +14 hours)
    if (Math.abs(offsetMinutes) > 14 * 60) {
      console.warn(`Unusual timezone offset calculated: ${offsetMinutes} minutes. Using default UTC+4.`);
      return 4 * 60; // Fallback to UTC+4
    }
    return offsetMinutes;
  } catch (error) {
    console.warn("Error calculating timezone offset:", error);
    return 4 * 60; // Default to UTC+4
  }
}

/**
 * Gets the timezone offset label (e.g., "UTC+4")
 */
export function getCrmTimeZoneOffsetLabel(): string {
  return getTimezoneOffsetLabel(getCrmTimeZone());
}

