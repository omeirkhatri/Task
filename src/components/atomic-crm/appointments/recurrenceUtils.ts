import type { RecurrenceConfig } from "../types";
import { addDays, addWeeks, addMonths, addYears, startOfDay, isBefore, isAfter, format } from "date-fns";

export interface BaseAppointmentData {
  patient_id: number;
  appointment_date: string; // YYYY-MM-DD
  start_time: string; // ISO datetime string
  end_time: string; // ISO datetime string
  duration_minutes: number;
  appointment_type: string;
  status: string;
  notes?: string | null;
  mini_notes?: string | null;
  full_notes?: string | null;
  pickup_instructions?: string | null;
  primary_staff_id?: number | null;
  driver_id?: number | null;
  payment_package_id?: number | null;
}

export interface GeneratedAppointment extends BaseAppointmentData {
  recurrence_sequence: number;
}

const MAX_OCCURRENCES = 1000; // Prevent performance issues

/**
 * Generates recurring appointment instances based on recurrence configuration
 * @param baseAppointment Base appointment data
 * @param recurrenceConfig Recurrence configuration
 * @returns Array of appointment instances with calculated dates/times
 */
export function generateRecurringAppointments(
  baseAppointment: BaseAppointmentData,
  recurrenceConfig: RecurrenceConfig
): GeneratedAppointment[] {
  const appointments: GeneratedAppointment[] = [];
  
  // Parse the base start and end times
  const baseStartDate = new Date(baseAppointment.start_time);
  const baseEndDate = new Date(baseAppointment.end_time);
  const baseDate = new Date(baseAppointment.appointment_date + "T00:00:00");
  
  // Determine end date
  let endDate: Date | null = null;
  let maxOccurrences: number | null = null;
  
  if (recurrenceConfig.end_type === "date" && recurrenceConfig.end_date) {
    endDate = new Date(recurrenceConfig.end_date + "T23:59:59");
  } else if (recurrenceConfig.end_type === "occurrences") {
    // If occurrences is explicitly set, use it; otherwise default to 100
    if (recurrenceConfig.occurrences != null && recurrenceConfig.occurrences > 0) {
      maxOccurrences = Math.min(recurrenceConfig.occurrences, MAX_OCCURRENCES);
    } else {
      // Default: 100 occurrences if end_type is "occurrences" but occurrences not set
      maxOccurrences = 100;
    }
  } else {
    // Default: 100 occurrences if neither specified
    maxOccurrences = 100;
  }
  
  // Validate end_date is after start_date
  if (endDate && isBefore(endDate, baseStartDate)) {
    throw new Error("End date must be after start date");
  }
  
  // Validate occurrences > 0
  if (maxOccurrences !== null && maxOccurrences <= 0) {
    throw new Error("Occurrences must be greater than 0");
  }
  
  let sequence = 0;
  
  // Always include the first appointment (parent)
  appointments.push({
    ...baseAppointment,
    recurrence_sequence: sequence++,
  });
  
  // Special handling for weekly pattern with multiple days_of_week
  if (recurrenceConfig.pattern === "weekly" && 
      recurrenceConfig.days_of_week && 
      recurrenceConfig.days_of_week.length > 0) {
    // Generate all appointments for selected days in each week
    let weekOffset = 0;
    const baseDayOfWeek = baseStartDate.getDay();
    const sortedDaysOfWeek = [...recurrenceConfig.days_of_week].sort((a, b) => a - b);
    
    let shouldStop = false;
    while (true) {
      // Check if we've exceeded max occurrences
      if (maxOccurrences !== null && appointments.length >= maxOccurrences) {
        break;
      }
      
      // Check if we've generated too many (safety check)
      if (appointments.length >= MAX_OCCURRENCES) {
        break;
      }
      
      // Calculate the reference date for this week (base date + week offset)
      const weekReferenceDate = addWeeks(baseStartDate, weekOffset * recurrenceConfig.interval);
      const weekReferenceDayOfWeek = weekReferenceDate.getDay();
      
      // Find the start of the week (Sunday) that contains the reference date
      const weekStartDate = addDays(weekReferenceDate, -weekReferenceDayOfWeek);
      
      // Generate appointments for all selected days in this week
      let foundAnyInWeek = false;
      let skippedBaseDateInWeek0 = false;
      
      for (const targetDayOfWeek of sortedDaysOfWeek) {
        // Check BEFORE processing if we've exceeded max occurrences
        if (maxOccurrences !== null && appointments.length >= maxOccurrences) {
          shouldStop = true;
          break;
        }
        
        // Calculate the target date: start of week + target day of week
        const targetDate = addDays(weekStartDate, targetDayOfWeek);
        
        // In week 0, skip the base date (already added as parent) and only include days >= base date
        if (weekOffset === 0) {
          if (targetDayOfWeek === baseDayOfWeek) {
            skippedBaseDateInWeek0 = true; // Mark that we skipped the base date
            continue; // Skip base date, already added
          }
          if (isBefore(targetDate, baseStartDate)) {
            continue; // Skip days before base date in week 0
          }
        }
        
        // Check if this date exceeds end date
        if (endDate && isAfter(targetDate, endDate)) {
          continue;
        }
        
        // Calculate time difference from base
        const timeDiff = targetDate.getTime() - baseStartDate.getTime();
        const targetEndDate = new Date(baseEndDate.getTime() + timeDiff);
        
        // Format dates
        const appointmentDate = format(targetDate, "yyyy-MM-dd");
        const startTimeISO = targetDate.toISOString();
        const endTimeISO = targetEndDate.toISOString();
        
        appointments.push({
          ...baseAppointment,
          appointment_date: appointmentDate,
          start_time: startTimeISO,
          end_time: endTimeISO,
          recurrence_sequence: sequence++,
        });
        
        foundAnyInWeek = true;
        
        // Check AFTER adding if we've reached the limit
        if (maxOccurrences !== null && appointments.length >= maxOccurrences) {
          shouldStop = true;
          break;
        }
      }
      
      // Break out of outer loop if we've reached the limit
      if (shouldStop) {
        break;
      }
      
      // If we didn't find any valid dates in this week, check if we skipped the base date in week 0
      // If so, we should continue to next week (the parent appointment counts as week 0)
      if (!foundAnyInWeek) {
        if (weekOffset === 0 && skippedBaseDateInWeek0) {
          // Week 0 had the base date which was already added as parent, so continue to next week
          // But only if we haven't reached max occurrences yet
          if (maxOccurrences === null || appointments.length < maxOccurrences) {
            weekOffset++;
            continue;
          }
        }
        // Otherwise, we're done
        break;
      }
      
      // Move to next week interval
      weekOffset++;
      
      // Check if next week would exceed end date
      const nextWeekReference = addWeeks(baseStartDate, weekOffset * recurrenceConfig.interval);
      if (endDate && isAfter(nextWeekReference, endDate)) {
        break;
      }
    }
  } else {
    // Standard logic for other patterns (daily, monthly, yearly, etc.)
    let currentDate = new Date(baseStartDate);
    
    while (true) {
      // Check if we've exceeded max occurrences
      if (maxOccurrences !== null && appointments.length >= maxOccurrences) {
        break;
      }
      
      // Calculate next date based on pattern
      const nextDate = calculateNextDate(
        currentDate,
        recurrenceConfig,
        baseStartDate
      );
      
      // Check if next date exceeds end date
      if (endDate && isAfter(nextDate, endDate)) {
        break;
      }
      
      // Check if we've generated too many (safety check)
      if (appointments.length >= MAX_OCCURRENCES) {
        break;
      }
      
      // Calculate time difference from base
      const timeDiff = nextDate.getTime() - baseStartDate.getTime();
      const nextEndDate = new Date(baseEndDate.getTime() + timeDiff);
      
      // Format dates
      const appointmentDate = format(nextDate, "yyyy-MM-dd");
      const startTimeISO = nextDate.toISOString();
      const endTimeISO = nextEndDate.toISOString();
      
      appointments.push({
        ...baseAppointment,
        appointment_date: appointmentDate,
        start_time: startTimeISO,
        end_time: endTimeISO,
        recurrence_sequence: sequence++,
      });
      
      currentDate = nextDate;
    }
  }
  
  return appointments;
}

/**
 * Calculates the next occurrence date based on recurrence pattern
 */
function calculateNextDate(
  currentDate: Date,
  config: RecurrenceConfig,
  baseStartDate: Date
): Date {
  const { pattern, interval, days_of_week, day_of_month, week_of_month, month, custom_unit } = config;
  
  switch (pattern) {
    case "daily":
      return addDays(currentDate, interval);
    
    case "weekly":
      if (days_of_week && days_of_week.length > 0) {
        // Find next occurrence of any specified day of week
        return findNextDayOfWeek(currentDate, days_of_week, interval);
      }
      return addWeeks(currentDate, interval);
    
    case "monthly":
      if (day_of_month !== null && day_of_month !== undefined) {
        // Specific day of month (e.g., 15th of every month)
        return addMonthsToDayOfMonth(currentDate, interval, day_of_month);
      } else if (week_of_month !== null && week_of_month !== undefined && days_of_week && days_of_week.length > 0) {
        // Specific week and day (e.g., first Monday of every month)
        return addMonthsToWeekDay(currentDate, interval, week_of_month, days_of_week[0]);
      }
      return addMonths(currentDate, interval);
    
    case "yearly":
      if (month !== null && month !== undefined) {
        // Specific month
        if (day_of_month !== null && day_of_month !== undefined) {
          return addYearsToDayOfMonth(currentDate, interval, month, day_of_month);
        } else if (week_of_month !== null && week_of_month !== undefined && days_of_week && days_of_week.length > 0) {
          return addYearsToWeekDay(currentDate, interval, month, week_of_month, days_of_week[0]);
        }
      }
      return addYears(currentDate, interval);
    
    case "custom":
      if (custom_unit === "days") {
        // If days_of_week is specified, find next occurrence of selected days
        if (days_of_week && days_of_week.length > 0) {
          return findNextDayOfWeek(currentDate, days_of_week, interval);
        }
        return addDays(currentDate, interval);
      } else if (custom_unit === "weeks") {
        // If days_of_week is specified, find next occurrence of selected days
        if (days_of_week && days_of_week.length > 0) {
          return findNextDayOfWeek(currentDate, days_of_week, interval);
        }
        return addWeeks(currentDate, interval);
      } else if (custom_unit === "months") {
        return addMonths(currentDate, interval);
      }
      // Default to days
      return addDays(currentDate, interval);
    
    default:
      return addDays(currentDate, interval);
  }
}

/**
 * Finds the next occurrence of any specified day of week
 */
function findNextDayOfWeek(currentDate: Date, daysOfWeek: number[], interval: number): Date {
  let nextDate = new Date(currentDate);
  let weeksAdded = 0;
  const maxIterations = interval * 7; // Safety limit
  
  for (let i = 0; i < maxIterations; i++) {
    nextDate = addDays(nextDate, 1);
    const dayOfWeek = nextDate.getDay();
    
    if (daysOfWeek.includes(dayOfWeek)) {
      // Check if we've completed the interval
      const weeksSinceStart = Math.floor((nextDate.getTime() - currentDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (weeksSinceStart >= interval) {
        return nextDate;
      }
    }
  }
  
  // Fallback: add interval weeks
  return addWeeks(currentDate, interval);
}

/**
 * Adds months while preserving day of month (handles month-end edge cases)
 */
function addMonthsToDayOfMonth(currentDate: Date, interval: number, dayOfMonth: number): Date {
  let nextDate = addMonths(currentDate, interval);
  const targetDay = Math.min(dayOfMonth, getDaysInMonth(nextDate));
  nextDate.setDate(targetDay);
  return nextDate;
}

/**
 * Adds months while preserving week and day (e.g., first Monday)
 */
function addMonthsToWeekDay(
  currentDate: Date,
  interval: number,
  weekOfMonth: number,
  dayOfWeek: number
): Date {
  let nextDate = addMonths(currentDate, interval);
  return setWeekDayOfMonth(nextDate, weekOfMonth, dayOfWeek);
}

/**
 * Adds years while preserving month and day of month
 */
function addYearsToDayOfMonth(
  currentDate: Date,
  interval: number,
  month: number,
  dayOfMonth: number
): Date {
  let nextDate = addYears(currentDate, interval);
  nextDate.setMonth(month - 1); // month is 1-12, setMonth expects 0-11
  const targetDay = Math.min(dayOfMonth, getDaysInMonth(nextDate));
  nextDate.setDate(targetDay);
  return nextDate;
}

/**
 * Adds years while preserving month, week, and day
 */
function addYearsToWeekDay(
  currentDate: Date,
  interval: number,
  month: number,
  weekOfMonth: number,
  dayOfWeek: number
): Date {
  let nextDate = addYears(currentDate, interval);
  nextDate.setMonth(month - 1);
  return setWeekDayOfMonth(nextDate, weekOfMonth, dayOfWeek);
}

/**
 * Sets the date to a specific week and day of month (e.g., first Monday)
 */
function setWeekDayOfMonth(date: Date, weekOfMonth: number, dayOfWeek: number): Date {
  // Start from the first day of the month
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  
  // Find the first occurrence of the target day of week
  const firstDayOfWeek = firstDay.getDay();
  let daysToAdd = (dayOfWeek - firstDayOfWeek + 7) % 7;
  
  // Add weeks (weekOfMonth is 1-based: 1 = first, 2 = second, etc.)
  daysToAdd += (weekOfMonth - 1) * 7;
  
  const targetDate = new Date(firstDay);
  targetDate.setDate(1 + daysToAdd);
  
  // If the target date is in the next month, go back to the last occurrence
  if (targetDate.getMonth() !== date.getMonth()) {
    targetDate.setDate(targetDate.getDate() - 7);
  }
  
  return targetDate;
}

/**
 * Gets the number of days in a month
 */
function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

