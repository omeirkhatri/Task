export type DateInput = Date | string | number | null | undefined;

const CRM_TIME_ZONE_OFFSET_MINUTES = 4 * 60;
const CRM_TIME_ZONE_OFFSET_MS = CRM_TIME_ZONE_OFFSET_MINUTES * 60 * 1000;

export const CRM_TIME_ZONE = "Asia/Dubai";
export const CRM_TIME_ZONE_LABEL = "UTC+4";

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: CRM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: CRM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// "en-CA" yields ISO-like date strings (YYYY-MM-DD)
const ymdDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CRM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: CRM_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CRM_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const pad = (value: number) => value.toString().padStart(2, "0");

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

  return new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour ?? 0,
      parts.minute ?? 0,
      parts.second ?? 0,
      parts.millisecond ?? 0,
    ) - CRM_TIME_ZONE_OFFSET_MS,
  );
}

export function formatCrmDateTime(value: DateInput) {
  const date = parseDate(value);
  if (!date) return "";
  return dateTimeFormatter.format(date);
}

export function formatCrmDate(value: DateInput) {
  const date = parseDate(value);
  if (!date) return "";
  return dateFormatter.format(date);
}

export function formatCrmTime(value: DateInput) {
  const date = parseDate(value);
  if (!date) return "";
  return timeFormatter.format(date);
}

export function crmDateInputString(value: DateInput = new Date()) {
  const date = parseDate(value);
  if (!date) return "";
  return dateFormatter.format(date);
}

/**
 * Returns a date string in YYYY-MM-DD format, using the CRM timezone.
 * This is ideal for `<input type="date">` values and react-hook-form state.
 */
export function crmDateYmdInputString(value: DateInput = new Date()) {
  const date = parseDate(value);
  if (!date) return "";
  return ymdDateFormatter.format(date);
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
