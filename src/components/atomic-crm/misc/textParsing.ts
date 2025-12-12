import { crmDateStringToISO, crmDateTimeStringToISO, crmStartOfDay } from "./timezone";

/**
 * Parses natural language date/time expressions from text
 * Returns the parsed date string in ISO format or null
 * 
 * Examples:
 * - "tomorrow" -> tomorrow's date
 * - "next week" -> date 7 days from now
 * - "in 3 days" -> date 3 days from now
 * - "today at 3pm" -> today at 3pm
 * - "tomorrow at 2:30" -> tomorrow at 2:30pm
 * - "next Monday" -> next Monday
 * - "Dec 25" -> December 25 of current year
 * - "12/25" -> December 25 of current year
 * - "2024-12-25" -> December 25, 2024
 * - "3pm" -> today at 3pm
 * - "14:30" -> today at 2:30pm
 */
export function parseDateFromText(text: string): string | null {
  if (!text || typeof text !== "string") return null;

  const now = new Date();
  const today = crmStartOfDay(now);
  if (!today) return null;

  const lowerText = text.toLowerCase().trim();

  // Relative dates
  if (lowerText === "today" || lowerText === "now") {
    return today.toISOString();
  }

  if (lowerText === "tomorrow") {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString();
  }

  if (lowerText === "day after tomorrow" || lowerText === "day after tmrw") {
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    return dayAfterTomorrow.toISOString();
  }

  if (lowerText === "next week") {
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString();
  }

  if (lowerText === "next month") {
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toISOString();
  }

  // "in X days"
  const inDaysMatch = lowerText.match(/in\s+(\d+)\s+days?/);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1], 10);
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);
    return futureDate.toISOString();
  }

  // "X days from now"
  const daysFromNowMatch = lowerText.match(/(\d+)\s+days?\s+from\s+now/);
  if (daysFromNowMatch) {
    const days = parseInt(daysFromNowMatch[1], 10);
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);
    return futureDate.toISOString();
  }

  // Time patterns: "3pm", "3:30pm", "15:30", "14:30"
  const timePatterns = [
    /(\d{1,2}):?(\d{2})?\s*(am|pm)?/i,
    /(\d{1,2})\s*(am|pm)/i,
  ];

  for (const pattern of timePatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      const ampm = match[3]?.toLowerCase();

      if (ampm === "pm" && hours !== 12) {
        hours += 12;
      } else if (ampm === "am" && hours === 12) {
        hours = 0;
      }

      const dateWithTime = new Date(today);
      dateWithTime.setHours(hours, minutes, 0, 0);
      return dateWithTime.toISOString();
    }
  }

  // "today at 3pm" or "tomorrow at 2:30"
  const todayAtMatch = lowerText.match(/today\s+at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
  if (todayAtMatch) {
    let hours = parseInt(todayAtMatch[1], 10);
    const minutes = todayAtMatch[2] ? parseInt(todayAtMatch[2], 10) : 0;
    const ampm = todayAtMatch[3]?.toLowerCase();

    if (ampm === "pm" && hours !== 12) {
      hours += 12;
    } else if (ampm === "am" && hours === 12) {
      hours = 0;
    }

    const dateWithTime = new Date(today);
    dateWithTime.setHours(hours, minutes, 0, 0);
    return dateWithTime.toISOString();
  }

  const tomorrowAtMatch = lowerText.match(/tomorrow\s+at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
  if (tomorrowAtMatch) {
    let hours = parseInt(tomorrowAtMatch[1], 10);
    const minutes = tomorrowAtMatch[2] ? parseInt(tomorrowAtMatch[2], 10) : 0;
    const ampm = tomorrowAtMatch[3]?.toLowerCase();

    if (ampm === "pm" && hours !== 12) {
      hours += 12;
    } else if (ampm === "am" && hours === 12) {
      hours = 0;
    }

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(hours, minutes, 0, 0);
    return tomorrow.toISOString();
  }

  // Date formats: "12/25", "12/25/2024", "Dec 25", "December 25"
  const dateFormats = [
    /(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:\s+(\d{4}))?/i,
  ];

  for (const pattern of dateFormats) {
    const match = lowerText.match(pattern);
    if (match) {
      let month: number, day: number, year: number;

      if (pattern === dateFormats[0]) {
        // MM/DD or MM/DD/YYYY
        month = parseInt(match[1], 10);
        day = parseInt(match[2], 10);
        year = match[3] ? parseInt(match[3], 10) : now.getFullYear();
      } else {
        // "Dec 25" or "December 25"
        const monthNames = [
          "jan", "feb", "mar", "apr", "may", "jun",
          "jul", "aug", "sep", "oct", "nov", "dec",
        ];
        month = monthNames.indexOf(match[1].toLowerCase().substring(0, 3)) + 1;
        day = parseInt(match[2], 10);
        year = match[3] ? parseInt(match[3], 10) : now.getFullYear();
      }

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const parsedDate = new Date(year, month - 1, day);
        if (parsedDate.getFullYear() === year && parsedDate.getMonth() === month - 1 && parsedDate.getDate() === day) {
          return crmStartOfDay(parsedDate)?.toISOString() || null;
        }
      }
    }
  }

  // ISO date format: "2024-12-25"
  const isoDateMatch = lowerText.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoDateMatch) {
    const isoDate = crmDateStringToISO(isoDateMatch[1]);
    if (isoDate) return isoDate;
  }

  // ISO datetime format: "2024-12-25T15:30"
  const isoDateTimeMatch = lowerText.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  if (isoDateTimeMatch) {
    const isoDateTime = crmDateTimeStringToISO(isoDateTimeMatch[1]);
    if (isoDateTime) return isoDateTime;
  }

  return null;
}

/**
 * Extracts @mentions from text
 * Returns an array of user IDs that were mentioned
 */
export function extractMentions(text: string): string[] {
  if (!text || typeof text !== "string") return [];

  // Match @username patterns
  // Format: @username or @user name (first name and optionally last name)
  // Stop at the next space or end of string to prevent matching text after the mention
  const mentionRegex = /@(\w+(?:\s+\w+)?)(?=\s|$)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const mentionText = match[1].trim();
    if (mentionText && !mentions.includes(mentionText)) {
      mentions.push(mentionText);
    }
  }

  return mentions;
}

/**
 * Finds the position of the current @mention being typed
 * Returns the start position and the query text after @
 */
export function findCurrentMention(text: string, cursorPosition: number): { start: number; query: string } | null {
  if (!text || cursorPosition < 0) return null;

  // Find the @ symbol before the cursor
  let start = cursorPosition - 1;
  while (start >= 0 && text[start] !== "@" && text[start] !== " " && text[start] !== "\n") {
    start--;
  }

  if (start < 0 || text[start] !== "@") {
    return null;
  }

  // Find the end of the mention (whitespace or end of string)
  let end = start + 1;
  while (end < text.length && text[end] !== " " && text[end] !== "\n" && text[end] !== "@") {
    end++;
  }

  const query = text.substring(start + 1, end).trim();
  return { start, query };
}

/**
 * Finds date patterns in text that should be auto-extracted
 * Returns the matched text and parsed date, or null if no match
 * These patterns will be removed from text and used to set due_date
 */
export function findAutoExtractDatePattern(text: string): { matchedText: string; date: string } | null {
  if (!text || typeof text !== "string") return null;

  const trimmedText = text.trim();
  const lowerText = trimmedText.toLowerCase();
  
  // Patterns that should be auto-extracted (removed from description)
  // These are checked in order of specificity (longer patterns first)
  const autoExtractPatterns = [
    /^(day\s+after\s+tomorrow|day\s+after\s+tmrw)$/i,
    /^(next\s+week|next\s+month)$/i,
    /^(in\s+\d+\s+days?|\d+\s+days?\s+from\s+now)$/i,
    /^(today|tomorrow)$/i,
  ];

  for (const pattern of autoExtractPatterns) {
    const match = trimmedText.match(pattern);
    if (match) {
      const matchedText = match[0];
      const parsedDate = parseDateFromText(matchedText);
      if (parsedDate) {
        return {
          matchedText: matchedText,
          date: parsedDate,
        };
      }
    }
  }

  return null;
}
