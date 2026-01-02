import React, { useRef, useMemo, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import type { EventInput, DateSelectArg, EventClickArg, EventDropArg, EventResizeArg } from "@fullcalendar/core";
// Note: FullCalendar CSS should be imported in your main CSS file or via a CDN
// For FullCalendar v6+: import "@fullcalendar/core/vdom.css" and plugin CSS files
// For FullCalendar v5: import "@fullcalendar/core/main.css" and plugin CSS files
import { Button } from "@/components/ui/button";
import { format, startOfToday, parseISO } from "date-fns";
import type { Appointment } from "../types";
import { useAppointmentTypes } from "./useAppointmentTypes";
import { getCrmTimeZone, getCrmTimeZoneOffsetMinutes, formatCrmDateShort, formatCrmTime, crmDateTimeStringToDate, crmDateTimeStringToISO, crmToday } from "../misc/timezone";

// Helper function to convert FullCalendar date to CRM timezone-aware date
// When FullCalendar has timeZone set to the configured CRM timezone, it displays times in that timezone.
// The Date objects returned from selection represent the selected time in UTC.
// We need to interpret the UTC time components as if they represent the time in the CRM timezone,
// then create a Date object that actually represents that time in the CRM timezone.
/**
 * Converts a FullCalendar Date to a Date representing the selected time in CRM timezone.
 * 
 * CRITICAL TIMEZONE CONVERSION FLOW:
 * 1. FullCalendar with timeZone set returns Date objects where UTC components represent
 *    what the user selected (e.g., selecting 00:00 returns Date with getUTCHours() = 0)
 * 2. We extract these UTC components (they represent the selected CRM timezone time)
 * 3. We create a datetime string "YYYY-MM-DDTHH:MM" representing that time in CRM timezone
 * 4. crmDateTimeStringToDate() converts it using buildUtcFromZoned() which:
 *    - Creates a UTC timestamp for that time
 *    - SUBTRACTS the timezone offset
 *    - Returns a Date that, when formatted in CRM timezone, shows the selected time
 * 
 * Example: User selects 00:00 in calendar
 * - FullCalendar returns: Date with UTC hour=0, minute=0
 * - We create: "2025-12-26T00:00"
 * - buildUtcFromZoned creates: Date.UTC(2025,11,26,0,0,0) - 4 hours = 2025-12-25T20:00:00Z
 * - extractCrmTime() formats this Date in CRM timezone → correctly shows "00:00"
 * 
 * DO NOT modify this function without understanding the full timezone conversion chain.
 */
function convertFullCalendarDateToCrmDate(fcDate: Date): Date {
  // Get UTC time components (these represent the selected time in CRM timezone display)
  const year = fcDate.getUTCFullYear();
  const month = fcDate.getUTCMonth() + 1;
  const day = fcDate.getUTCDate();
  const hour = fcDate.getUTCHours();
  const minute = fcDate.getUTCMinutes();
  const second = fcDate.getUTCSeconds();
  
  // Create a datetime string representing this time in CRM timezone
  const dateTimeString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  
  // Use the timezone utility to create a Date object representing this time in CRM timezone
  // This internally uses buildUtcFromZoned() which correctly handles the offset
  const crmDate = crmDateTimeStringToDate(dateTimeString);
  
  // Fallback: If conversion fails, create the date manually using the same logic
  if (!crmDate) {
    const offsetMs = getCrmTimeZoneOffsetMinutes() * 60 * 1000;
    // CRITICAL: Subtract offset (same as buildUtcFromZoned does)
    return new Date(Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      second,
      0
    ) - offsetMs);
  }
  
  return crmDate;
}

/**
 * Converts a CRM timezone Date to a Date that FullCalendar can understand.
 * FullCalendar with timeZone set expects Date objects where UTC components
 * represent the time in the specified timezone.
 * 
 * Example: To show Dec 29 00:00 in CRM timezone, we need a Date where:
 * - getUTCFullYear() = 2025
 * - getUTCMonth() = 11 (December, 0-indexed)
 * - getUTCDate() = 29
 * - getUTCHours() = 0
 * 
 * This is the reverse of convertFullCalendarDateToCrmDate().
 */
function convertCrmDateToFullCalendarDate(crmDate: Date): Date {
  // Get the date parts as they appear in CRM timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: getCrmTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  const parts = formatter.formatToParts(crmDate);
  const year = parseInt(parts.find(p => p.type === "year")?.value || "0", 10);
  const month = parseInt(parts.find(p => p.type === "month")?.value || "0", 10);
  const day = parseInt(parts.find(p => p.type === "day")?.value || "0", 10);
  const hour = parseInt(parts.find(p => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0", 10);
  const second = parseInt(parts.find(p => p.type === "second")?.value || "0", 10);
  
  // Create a Date where UTC components represent this time in CRM timezone
  // FullCalendar will interpret these UTC components as CRM timezone time
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

import { useGetList, useUpdate, useNotify, useDataProvider } from "ra-core";
import type { Staff, Contact } from "../types";

type AppointmentCalendarProps = {
  appointments: Appointment[];
  loading: boolean;
  onAppointmentClick: (appointment: Appointment) => void;
  onAppointmentRightClick: (appointment: Appointment, event: React.MouseEvent) => void;
  onAppointmentUpdate: () => void;
  onDateSelect?: (start: Date, end: Date) => void;
  currentDate?: Date;
  view?: "month" | "week" | "day" | "list";
  onDateChange?: (date: Date) => void;
};

export const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({
  appointments,
  loading,
  onAppointmentClick,
  onAppointmentRightClick,
  onAppointmentUpdate,
  onDateSelect,
  currentDate: propCurrentDate,
  view: propView = "month",
  onDateChange,
}) => {
  const calendarRef = useRef<FullCalendar>(null);
  const [currentView, setCurrentView] = React.useState("dayGridMonth");
  const [internalCurrentDate, setInternalCurrentDate] = React.useState(new Date());
  
  // Use prop if provided, otherwise use internal state
  const currentDate = propCurrentDate || internalCurrentDate;
  const view = propView || "month";
  
  // Map view prop to FullCalendar view type
  const fullCalendarView = React.useMemo(() => {
    switch (view) {
      case "month": return "dayGridMonth";
      case "week": return "timeGridWeek";
      case "day": return "timeGridDay";
      case "list": return "listWeek";
      default: return "dayGridMonth";
    }
  }, [view]);
  const [visibleDateRange, setVisibleDateRange] = React.useState<{ start: Date; end: Date }>(() => {
    // Default to current month if calendar not ready
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  });
  const [update] = useUpdate();
  const notify = useNotify();

  // Fetch appointment types from services
  const appointmentTypes = useAppointmentTypes();

  // Fetch staff and patients for display - don't block if they fail
  // Use try-catch pattern to prevent errors from breaking the app
  const { data: staffData } = useGetList<Staff>("staff", {
    pagination: { page: 1, perPage: 1000 },
  }, {
    retry: false,
    enabled: true,
    onError: (error) => {
      console.warn("Failed to load staff:", error);
      // Don't throw - just log
    },
  });
  const { data: patientsData } = useGetList<Contact>("clients", {
    pagination: { page: 1, perPage: 1000 },
  }, {
    retry: false,
    enabled: true,
    onError: (error) => {
      console.warn("Failed to load patients:", error);
      // Don't throw - just log
    },
  });

  // Track if we're programmatically navigating to avoid conflicts
  const isNavigatingRef = React.useRef(false);
  
  // Handle datesSet callback to update visible date range
  const handleDatesSet = useCallback((dateInfo: { start: Date; end: Date; startStr: string; endStr: string; timeZone: string; view: any }) => {
    // Convert FullCalendar dates back to CRM dates
    const crmStart = convertFullCalendarDateToCrmDate(dateInfo.start);
    const crmEnd = convertFullCalendarDateToCrmDate(dateInfo.end);
    
    setVisibleDateRange({
      start: crmStart,
      end: crmEnd,
    });
    setCurrentView(dateInfo.view.type);
    
    // Only update the date if:
    // 1. We're not in the middle of a programmatic navigation
    // 2. We don't have a currentDate prop (parent is controlling the date)
    //    OR the visible month matches the current date's month (to avoid resetting)
    if (!isNavigatingRef.current) {
      if (propCurrentDate) {
        // Parent is controlling the date via prop - don't call onDateChange
        // The parent's useEffect will handle navigation based on currentDate changes
        // Only update internal state if we're using internal state
        if (!onDateChange) {
          setInternalCurrentDate(crmStart);
        }
      } else {
        // No prop provided, we're managing date internally
        if (onDateChange) {
          onDateChange(crmStart);
        } else {
          setInternalCurrentDate(crmStart);
        }
      }
    }
    
    // Reset the navigation flag after a short delay
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 150);
  }, [onDateChange, propCurrentDate]);
  
  // Update calendar when view or date changes
  // Use queueMicrotask to defer FullCalendar API calls and avoid flushSync warnings
  React.useEffect(() => {
    let cancelled = false;
    
    const updateCalendar = () => {
      if (cancelled) return;
      
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) {
        // Compare dates by day (ignore time) to avoid unnecessary updates
        // Convert FullCalendar date to CRM date for comparison
        const calendarDate = convertFullCalendarDateToCrmDate(calendarApi.getDate());
        const calendarDateStr = format(calendarDate, "yyyy-MM-dd");
        const currentDateStr = format(currentDate, "yyyy-MM-dd");
        
        // Update view if it changed - defer to next tick to avoid flushSync
        if (calendarApi.view.type !== fullCalendarView) {
          queueMicrotask(() => {
            if (!cancelled) {
              calendarApi.changeView(fullCalendarView);
            }
          });
        }
        
        // Update date if it changed - compare appropriately based on view type
        // For month view, compare by month/year; for other views, compare by day
        let shouldNavigate = false;
        if (currentDate) {
          if (fullCalendarView === "dayGridMonth") {
            // For month view, compare by month and year
            // Use multiple comparison methods to ensure we catch all cases (past and future months)
            const currentMonth = format(currentDate, "yyyy-MM");
            
            // Method 1: Compare with calendar's current date month
            const calendarMonth = format(calendarDate, "yyyy-MM");
            let monthDiffers = calendarMonth !== currentMonth;
            
            // Method 2: Compare with visible range start month (more reliable for current view)
            const view = calendarApi.view;
            if (view && view.currentStart) {
              const visibleStart = convertFullCalendarDateToCrmDate(view.currentStart);
              const visibleStartMonth = format(visibleStart, "yyyy-MM");
              monthDiffers = monthDiffers || (visibleStartMonth !== currentMonth);
            }
            
            // Navigate if either comparison shows the month is different
            shouldNavigate = monthDiffers;
          } else {
            // For week/day/list views, compare by day
            shouldNavigate = calendarDateStr !== currentDateStr;
          }
        }
        
        if (shouldNavigate) {
          // Set flag to indicate we're programmatically navigating
          isNavigatingRef.current = true;
          
          // Use setTimeout to ensure calendar is ready, with a fallback retry
          const navigateToDate = () => {
            if (cancelled) return;
            const api = calendarRef.current?.getApi();
            if (api) {
              const fcDate = convertCrmDateToFullCalendarDate(currentDate);
              // Force navigation to the selected date
              // Use gotoDate which works for both past and future dates
              try {
                api.gotoDate(fcDate);
                // Verify navigation succeeded by checking if we need to retry
                setTimeout(() => {
                  if (!cancelled) {
                    const verifyApi = calendarRef.current?.getApi();
                    if (verifyApi) {
                      const verifyView = verifyApi.view;
                      if (verifyView && verifyView.currentStart) {
                        const verifyStart = convertFullCalendarDateToCrmDate(verifyView.currentStart);
                        const verifyMonth = format(verifyStart, "yyyy-MM");
                        const targetMonth = format(currentDate, "yyyy-MM");
                        // If navigation didn't work, try again
                        if (verifyMonth !== targetMonth) {
                          verifyApi.gotoDate(fcDate);
                        }
                      }
                    }
                  }
                }, 100);
              } catch (error) {
                console.warn("Error navigating calendar:", error);
                // Retry on error
                setTimeout(navigateToDate, 50);
              }
            } else {
              // Retry after a short delay if calendar not ready
              setTimeout(navigateToDate, 50);
            }
          };
          // Use a small delay to ensure the calendar is fully ready
          setTimeout(navigateToDate, 10);
        }
      } else {
        // Calendar not ready yet, retry after a short delay
        setTimeout(updateCalendar, 50);
      }
    };
    
    queueMicrotask(updateCalendar);
    
    return () => {
      cancelled = true;
    };
  }, [fullCalendarView, currentDate]);

  // Helper function to create an event from an appointment
  // Must be defined BEFORE events useMemo that uses it
  const createEventFromAppointment = useCallback((
    appointment: Appointment,
    staff: Staff[],
    patients: Contact[],
    allAppointments: Appointment[]
  ): EventInput | null => {
    const appointmentType = appointmentTypes.find(
      (type) => type.value === appointment.appointment_type
    );
    const color = appointmentType?.color || "#6b7280";

    // Get patient name
    const patient = patients.find((p) => p.id === appointment.patient_id);
    const patientName = patient
      ? `${patient.first_name} ${patient.last_name}`.trim()
      : "Unknown Patient";

    // Get staff info
    const primaryStaff = staff.find((s) => s.id === appointment.primary_staff_id);
    const staffName = primaryStaff
      ? `${primaryStaff.first_name} ${primaryStaff.last_name}`.trim()
      : "";
    const staffType = primaryStaff?.staff_type || "";

    // Build event title
    const serviceAbbrev = appointmentType?.label.substring(0, 3).toUpperCase() || "APT";
    const driverInfo = appointment.driver_id ? "Driver" : "Self";
    const title = `${patientName} - ${serviceAbbrev} ${staffName} ${driverInfo}`;

    // Parse dates - start_time and end_time are ISO datetime strings (timestamp with time zone)
    // appointment_date is YYYY-MM-DD (date type)
    let start: Date;
    let end: Date;
    
    try {
      // Parse start_time and end_time as ISO datetime strings
      if (appointment.start_time && appointment.end_time) {
        // Ensure we're working with strings, not Date objects
        const startTimeStr = typeof appointment.start_time === 'string' 
          ? appointment.start_time 
          : appointment.start_time instanceof Date
          ? appointment.start_time.toISOString()
          : String(appointment.start_time);
        
        const endTimeStr = typeof appointment.end_time === 'string'
          ? appointment.end_time
          : appointment.end_time instanceof Date
          ? appointment.end_time.toISOString()
          : String(appointment.end_time);
        
        start = new Date(startTimeStr);
        end = new Date(endTimeStr);
      } else if (appointment.appointment_date) {
        // Fallback: use appointment_date with default times if start/end not available
        const appointmentDate = appointment.appointment_date;
        start = new Date(`${appointmentDate}T00:00:00`);
        end = new Date(`${appointmentDate}T01:00:00`);
      } else {
        console.warn("No date/time data for appointment:", appointment.id);
        return null;
      }

      // Validate dates - ensure they are Date objects
      if (!(start instanceof Date) || !(end instanceof Date)) {
        console.warn("Invalid date objects for appointment:", appointment.id, {
          start,
          end,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
        });
        return null;
      }

      // Validate dates are not invalid
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.warn("Invalid date for appointment:", appointment.id, {
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          appointment_date: appointment.appointment_date,
        });
        return null;
      }
    } catch (error) {
      console.error("Error parsing appointment dates:", appointment.id, error);
      return null;
    }

    // Filter out null events
    if (!start || !end || !(start instanceof Date) || !(end instanceof Date)) {
      return null;
    }

    // The dates are stored in UTC and represent the configured CRM timezone.
    // Example: 2025-12-24T11:00:00.000Z stored in DB = 15:00 in CRM timezone on Dec 24 (for UTC+4).
    // 
    // Since FullCalendar's timeZone conversion isn't working as expected,
    // we manually adjust the dates by adding the timezone offset.
    // This way, the UTC time matches the CRM timezone time we want to display.
    // 
    // Stored: 11:00 UTC (represents 15:00 in configured timezone)
    // Adjusted: 15:00 UTC (will display as 15:00 when timeZone is set, or as-is if not)
    const CRM_OFFSET_MS = getCrmTimeZoneOffsetMinutes() * 60 * 1000; // Dynamic offset in milliseconds
    const adjustedStart = new Date(start.getTime() + CRM_OFFSET_MS);
    const adjustedEnd = new Date(end.getTime() + CRM_OFFSET_MS);
    
    return {
      id: appointment.id.toString(),
      title,
      start: adjustedStart.toISOString(),
      end: adjustedEnd.toISOString(),
      backgroundColor: color,
      borderColor: color,
      textColor: "#ffffff",
      // Improve month view display
      display: 'block',
      extendedProps: {
        appointment,
      },
    };
  }, [appointmentTypes]);

  // Convert appointments to FullCalendar events
  const events = useMemo<EventInput[]>(() => {
    if (!appointments || appointments.length === 0) return [];
    // Don't require staffData and patientsData - we can show appointments without them
    const staff = staffData || [];
    const patients = patientsData || [];

    const allEvents: EventInput[] = [];
    
    // Process all appointments
    appointments.forEach((appointment) => {
      const event = createEventFromAppointment(appointment, staff, patients, appointments);
      if (event) {
        allEvents.push(event);
      }
    });

    return allEvents;
  }, [appointments, staffData, patientsData, visibleDateRange, createEventFromAppointment, appointmentTypes]);

  const handleEventClick = useCallback(
    (clickInfo: EventClickArg) => {
      const appointment = clickInfo.event.extendedProps.appointment as Appointment;
      onAppointmentClick(appointment);
    },
    [onAppointmentClick]
  );

  const handleEventRightClick = useCallback(
    (event: React.MouseEvent, appointment: Appointment) => {
      onAppointmentRightClick(appointment, event);
    },
    [onAppointmentRightClick]
  );

  const handleDateSelect = useCallback(
    (selectInfo: DateSelectArg) => {
      if (onDateSelect && selectInfo.start) {
        const viewType = selectInfo.view.type;
        
        // For month view, default to 8am with 60 minutes duration
        if (viewType === "dayGridMonth") {
          // Get the selected date components from FullCalendar
          const year = selectInfo.start.getUTCFullYear();
          const month = selectInfo.start.getUTCMonth() + 1;
          const day = selectInfo.start.getUTCDate();
          
          // Create datetime strings for 8:00 AM and 9:00 AM in CRM timezone
          const startDateTimeString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T08:00`;
          const endDateTimeString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T09:00`;
          
          // Convert to Date objects in CRM timezone
          const startDate = crmDateTimeStringToDate(startDateTimeString);
          const endDate = crmDateTimeStringToDate(endDateTimeString);
          
          if (startDate && endDate) {
            onDateSelect(startDate, endDate);
          }
        } else {
          // For week/day views, use the selected time range
          if (selectInfo.end) {
            const adjustedStart = convertFullCalendarDateToCrmDate(selectInfo.start);
            const adjustedEnd = convertFullCalendarDateToCrmDate(selectInfo.end);
            onDateSelect(adjustedStart, adjustedEnd);
          }
        }
      }
      // Unselect the date range in the calendar
      selectInfo.view.calendar.unselect();
    },
    [onDateSelect]
  );

  const handleEventDrop = useCallback(
    async (dropInfo: EventDropArg) => {
      const appointment = dropInfo.event.extendedProps.appointment as Appointment;
      const newStart = dropInfo.event.start;
      const newEnd = dropInfo.event.end;

      if (!newStart) return;

      try {
        // FullCalendar returns dates that have been adjusted for display (+4 hours).
        // We need to convert them back to represent the actual CRM timezone time.
        // Since we added the timezone offset for display, we subtract it to get the original UTC time
        // that represents the CRM timezone time the user selected.
        const CRM_OFFSET_MS = getCrmTimeZoneOffsetMinutes() * 60 * 1000; // Dynamic offset in milliseconds
        const displayStart = new Date(newStart.getTime() - CRM_OFFSET_MS);
        const displayEnd = newEnd 
          ? new Date(newEnd.getTime() - CRM_OFFSET_MS)
          : new Date(displayStart.getTime() + appointment.duration_minutes * 60 * 1000);

        // Extract the time components as they appear in CRM timezone
        const startParts = new Intl.DateTimeFormat('en-CA', {
          timeZone: getCrmTimeZone(),
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).formatToParts(displayStart).reduce((acc, part) => {
          if (part.type !== 'literal') {
            acc[part.type] = Number(part.value);
          }
          return acc;
        }, {} as Record<string, number>);

        const endParts = new Intl.DateTimeFormat('en-CA', {
          timeZone: getCrmTimeZone(),
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).formatToParts(displayEnd).reduce((acc, part) => {
          if (part.type !== 'literal') {
            acc[part.type] = Number(part.value);
          }
          return acc;
        }, {} as Record<string, number>);

        // Create datetime strings in the format expected by crmDateTimeStringToISO
        const startDateTime = `${startParts.year}-${String(startParts.month).padStart(2, '0')}-${String(startParts.day).padStart(2, '0')}T${String(startParts.hour).padStart(2, '0')}:${String(startParts.minute).padStart(2, '0')}`;
        const endDateTime = `${endParts.year}-${String(endParts.month).padStart(2, '0')}-${String(endParts.day).padStart(2, '0')}T${String(endParts.hour).padStart(2, '0')}:${String(endParts.minute).padStart(2, '0')}`;

        // Convert to ISO strings for database storage
        const startDateTimeISO = crmDateTimeStringToISO(startDateTime);
        const endDateTimeISO = crmDateTimeStringToISO(endDateTime);

        if (!startDateTimeISO || !endDateTimeISO) {
          throw new Error("Invalid date/time format");
        }

        // Calculate duration
        const durationMs = displayEnd.getTime() - displayStart.getTime();
        const durationMinutes = Math.max(Math.round(durationMs / (60 * 1000)), 15);

        // Update the appointment
        await update(
          "appointments",
          {
            id: appointment.id,
            data: {
              appointment_date: startDateTimeISO.split("T")[0], // Store date part only
              start_time: startDateTimeISO,
              end_time: endDateTimeISO,
              duration_minutes: durationMinutes,
            },
            previousData: appointment,
          },
          {
            onSuccess: () => {
              notify("Appointment moved successfully", { type: "success" });
              onAppointmentUpdate();
            },
            onError: (error: any) => {
              console.error("Error updating appointment:", error);
              notify("Failed to update appointment", { type: "error" });
              // Revert the visual change by refreshing
              onAppointmentUpdate();
            },
          }
        );
      } catch (error) {
        console.error("Error in handleEventDrop:", error);
        notify("Failed to update appointment", { type: "error" });
        // Revert the visual change by refreshing
        onAppointmentUpdate();
      }
    },
    [onAppointmentUpdate, update, notify]
  );

  const handleEventResize = useCallback(
    async (resizeInfo: EventResizeArg) => {
      const appointment = resizeInfo.event.extendedProps.appointment as Appointment;
      const newStart = resizeInfo.event.start;
      const newEnd = resizeInfo.event.end;

      if (!newStart || !newEnd) return;

      try {
        // FullCalendar returns dates that have been adjusted for display (with timezone offset).
        // We need to convert them back to represent the actual CRM timezone time.
        const CRM_OFFSET_MS = getCrmTimeZoneOffsetMinutes() * 60 * 1000; // Dynamic offset in milliseconds
        const displayStart = new Date(newStart.getTime() - CRM_OFFSET_MS);
        const displayEnd = new Date(newEnd.getTime() - CRM_OFFSET_MS);

        // Extract the time components as they appear in CRM timezone
        const startParts = new Intl.DateTimeFormat('en-CA', {
          timeZone: getCrmTimeZone(),
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).formatToParts(displayStart).reduce((acc, part) => {
          if (part.type !== 'literal') {
            acc[part.type] = Number(part.value);
          }
          return acc;
        }, {} as Record<string, number>);

        const endParts = new Intl.DateTimeFormat('en-CA', {
          timeZone: getCrmTimeZone(),
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).formatToParts(displayEnd).reduce((acc, part) => {
          if (part.type !== 'literal') {
            acc[part.type] = Number(part.value);
          }
          return acc;
        }, {} as Record<string, number>);

        // Create datetime strings in the format expected by crmDateTimeStringToISO
        const startDateTime = `${startParts.year}-${String(startParts.month).padStart(2, '0')}-${String(startParts.day).padStart(2, '0')}T${String(startParts.hour).padStart(2, '0')}:${String(startParts.minute).padStart(2, '0')}`;
        const endDateTime = `${endParts.year}-${String(endParts.month).padStart(2, '0')}-${String(endParts.day).padStart(2, '0')}T${String(endParts.hour).padStart(2, '0')}:${String(endParts.minute).padStart(2, '0')}`;

        // Convert to ISO strings for database storage
        const startDateTimeISO = crmDateTimeStringToISO(startDateTime);
        const endDateTimeISO = crmDateTimeStringToISO(endDateTime);

        if (!startDateTimeISO || !endDateTimeISO) {
          throw new Error("Invalid date/time format");
        }

        // Calculate duration
        const durationMinutes = Math.max(Math.round((displayEnd.getTime() - displayStart.getTime()) / (60 * 1000)), 15);

        // Update the appointment
        await update(
          "appointments",
          {
            id: appointment.id,
            data: {
              appointment_date: startDateTimeISO.split("T")[0], // Store date part only
              start_time: startDateTimeISO,
              end_time: endDateTimeISO,
              duration_minutes: durationMinutes,
            },
            previousData: appointment,
          },
          {
            onSuccess: () => {
              notify("Appointment resized successfully", { type: "success" });
              onAppointmentUpdate();
            },
            onError: (error: any) => {
              console.error("Error updating appointment:", error);
              notify("Failed to update appointment", { type: "error" });
              // Revert the visual change by refreshing
              onAppointmentUpdate();
            },
          }
        );
      } catch (error) {
        console.error("Error in handleEventResize:", error);
        notify("Failed to update appointment", { type: "error" });
        // Revert the visual change by refreshing
        onAppointmentUpdate();
      }
    },
    [onAppointmentUpdate, update, notify]
  );

  const handlePrev = useCallback(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.prev();
      const newDate = calendarApi.getDate();
      if (onDateChange) {
        onDateChange(newDate);
      } else {
        setInternalCurrentDate(newDate);
      }
    }
  }, [onDateChange]);

  const handleNext = useCallback(() => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.next();
      const newDate = calendarApi.getDate();
      if (onDateChange) {
        onDateChange(newDate);
      } else {
        setInternalCurrentDate(newDate);
      }
    }
  }, [onDateChange]);

  const handleToday = useCallback(() => {
    // Get today's date at midnight in CRM timezone
    const today = crmToday();
    
    // Convert to FullCalendar format (UTC components represent CRM timezone time)
    const fcDate = convertCrmDateToFullCalendarDate(today);
    
    // Use queueMicrotask to defer the calendar API call and avoid flushSync warnings
    queueMicrotask(() => {
      const calendarApi = calendarRef.current?.getApi();
      if (calendarApi) {
        // Explicitly navigate to today's date
        calendarApi.gotoDate(fcDate);
        
        // Update the date state after navigation (use the CRM date, not FC date)
        if (onDateChange) {
          onDateChange(today);
        } else {
          setInternalCurrentDate(today);
        }
      }
    });
  }, [onDateChange]);

  const handleViewChange = useCallback((view: string) => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView(view);
      setCurrentView(view);
    }
  }, []);

  const getHeaderTitle = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (!calendarApi) return "";

    const view = calendarApi.view;
    const viewType = view.type;

    if (viewType === "dayGridMonth") {
      return format(view.currentStart, "MMMM yyyy");
    } else if (viewType === "timeGridWeek" || viewType === "dayGridWeek") {
      const start = view.currentStart;
      const end = view.currentEnd;
      const startMonth = format(start, "MMM");
      const endMonth = format(end, "MMM");
      const year = format(start, "yyyy");
      if (startMonth === endMonth) {
        return `${format(start, "EEE")} - ${format(end, "EEE")} ${year}`;
      }
      return `${format(start, "EEE MMM")} - ${format(end, "EEE MMM")} ${year}`;
    } else if (viewType === "timeGridDay") {
      return format(view.currentStart, "EEEE, MMMM d, yyyy");
    }
    return "";
  };

  return (
    <>
      {/* Add styles for better month view event readability */}
      <style>{`
        /* Ensure calendar views have consistent height - 25% larger and fill space */
        .fc {
          height: 100% !important;
          min-height: 750px !important;
        }
        .fc-view-harness {
          height: 100% !important;
          min-height: 750px !important;
        }
        .fc-dayGridMonth-view,
        .fc-timeGridWeek-view,
        .fc-timeGridDay-view {
          height: 100% !important;
          min-height: 750px !important;
        }
        /* Orange highlight for today */
        .fc-day-today {
          background-color: rgba(249, 115, 22, 0.1) !important;
        }
        .fc-day-today .fc-daygrid-day-number {
          color: #f97316 !important;
          font-weight: 600 !important;
        }
        .fc-col-header-cell.fc-day-today {
          background-color: rgba(249, 115, 22, 0.1) !important;
        }
        .fc-timegrid-col.fc-day-today {
          background-color: rgba(249, 115, 22, 0.05) !important;
        }
        /* Orange appointment badges for today */
        .fc-day-today .fc-event {
          border-left: 3px solid #f97316 !important;
        }
        /* Ensure events have proper background colors */
        .fc-daygrid-event,
        .fc-list-event,
        .fc-timegrid-event {
          min-height: 24px !important;
          border-radius: 4px !important;
          padding: 2px 4px !important;
          opacity: 1 !important;
          transition: background-color 0.2s ease, border-color 0.2s ease !important;
        }
        /* Ensure background colors are applied and visible */
        .fc-event {
          background-color: var(--fc-event-bg-color) !important;
          border-color: var(--fc-event-border-color) !important;
        }
        /* Hover effect - turn blue when highlighted */
        .fc-event:hover,
        .fc-event.fc-event-selected,
        .fc-list-event:hover,
        .fc-list-event.fc-event-selected {
          background-color: #3b82f6 !important;
          border-color: #3b82f6 !important;
        }
        /* List view title cell hover */
        .fc-list-event:hover .fc-list-event-title,
        .fc-list-event.fc-event-selected .fc-list-event-title {
          background-color: #3b82f6 !important;
        }
        .fc-daygrid-event .fc-event-title,
        .fc-list-event .fc-event-title,
        .fc-timegrid-event .fc-event-title {
          font-weight: 600 !important;
          font-size: 11px !important;
          line-height: 1.3 !important;
          color: #ffffff !important;
        }
        .fc-daygrid-dot-event {
          padding: 2px 4px !important;
        }
        .fc-daygrid-dot-event .fc-event-title {
          font-weight: 600 !important;
          font-size: 11px !important;
          color: #ffffff !important;
        }
        /* List view specific styling */
        .fc-list-event {
          background-color: var(--fc-event-bg-color) !important;
          transition: background-color 0.2s ease !important;
        }
        .fc-list-event-title {
          color: #ffffff !important;
          transition: background-color 0.2s ease !important;
        }
        /* List view time column styling - always blue with white text */
        .fc-list-event-time {
          background-color: #3b82f6 !important;
          color: #ffffff !important;
          font-weight: 600 !important;
          padding: 8px 12px !important;
          border-radius: 4px 0 0 4px !important;
        }
        /* List view graphic cell - no hover effect */
        .fc-list-event-graphic {
          background-color: transparent !important;
        }
        /* When row is hovered, entire row and title cell turn blue */
        .fc-list-event:hover,
        .fc-list-event.fc-event-selected {
          background-color: #3b82f6 !important;
        }
        .fc-list-event:hover .fc-list-event-title,
        .fc-list-event.fc-event-selected .fc-list-event-title {
          background-color: #3b82f6 !important;
        }
        /* Time column stays blue with white text even on hover */
        .fc-list-event:hover .fc-list-event-time,
        .fc-list-event.fc-event-selected .fc-list-event-time {
          background-color: #3b82f6 !important;
          color: #ffffff !important;
        }
      `}</style>
      <div className="bg-white dark:bg-slate-800 flex flex-col overflow-hidden h-full min-h-0 w-full">

      {/* FullCalendar */}
      <div 
        className="overflow-y-auto flex-1 min-h-[750px]"
        style={{ 
          flex: "1 1 auto"
        }}
      >
        {typeof window !== "undefined" && (
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView={fullCalendarView}
          initialDate={convertCrmDateToFullCalendarDate(currentDate)}
          timeZone={getCrmTimeZone()}
          firstDay={1}
          slotDuration="00:15:00"
          slotLabelInterval="01:00:00"
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
          nowIndicator={true}
          editable={true}
          selectable={true}
          selectMirror={true}
          events={events}
          eventClick={handleEventClick}
          select={handleDateSelect}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          datesSet={handleDatesSet}
          height="100%"
          headerToolbar={false}
          locale="en-GB"
          dayHeaderFormat={(arg: any) => {
            try {
              // Get view type from calendar API if available, otherwise use state
              const calendarApi = calendarRef.current?.getApi();
              const viewType = calendarApi?.view?.type || currentView;
              
              // Extract date from arg - FullCalendar v6 date/start are objects with marker property
              let date: Date | null = null;
              
              // Try arg.date.marker (most reliable)
              if (arg?.date?.marker) {
                date = new Date(arg.date.marker);
              } else if (arg?.start?.marker) {
                date = new Date(arg.start.marker);
              } else if (arg?.date instanceof Date) {
                date = arg.date;
              } else if (arg?.start instanceof Date) {
                date = arg.start;
              } else if (typeof arg?.date === "string") {
                date = new Date(arg.date);
              } else if (typeof arg?.start === "string") {
                date = new Date(arg.start);
              } else if (arg?.marker) {
                date = new Date(arg.marker);
              }
              
              if (date && !isNaN(date.getTime())) {
                // For month view column headers, show day name (Mon, Tue, Wed, etc.)
                if (viewType === "dayGridMonth") {
                  return format(date, "EEE");
                }
                // For week/day views, show weekday and date like "Thu 25 Dec"
                if (viewType === "timeGridWeek" || viewType === "timeGridDay" || viewType === "dayGridWeek") {
                  const weekday = format(date, "EEE");
                  const day = date.getDate();
                  const month = format(date, "MMM");
                  return `${weekday} ${day} ${month}`;
                }
                // For list view, show full format like "Thursday 25th December"
                if (viewType === "listWeek" || viewType === "listDay" || viewType === "listMonth") {
                  const weekday = format(date, "EEEE");
                  const day = date.getDate();
                  const suffix = day === 1 || day === 21 || day === 31 ? "st" :
                                day === 2 || day === 22 ? "nd" :
                                day === 3 || day === 23 ? "rd" : "th";
                  const month = format(date, "MMMM");
                  return `${weekday} ${day}${suffix} ${month}`;
                }
                // Fallback for other views
                const weekday = format(date, "EEE");
                const day = date.getDate();
                const month = format(date, "MMM");
                return `${weekday} ${day} ${month}`;
              }
              
              // Debug: log what we're getting
              console.log("dayHeaderFormat - no valid date:", { 
                arg, 
                dateObj: arg?.date, 
                startObj: arg?.start,
                viewType, 
                currentView 
              });
              
              // Let FullCalendar use default
              return undefined as any;
            } catch (error) {
              console.error("dayHeaderFormat error:", error, arg);
              // Silently fail and let FullCalendar use default
              return undefined as any;
            }
          }}
          slotLabelFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }}
          eventContent={(eventInfo) => {
            const appointment = eventInfo.event.extendedProps.appointment as Appointment;
            const view = eventInfo.view;
            const isMonthView = view.type === 'dayGridMonth';
            
            // For month view, show a more compact but readable format
            if (isMonthView) {
              // Use the original appointment start_time directly to avoid double timezone conversion
              // The event's start date has been adjusted for FullCalendar display, but we want
              // the actual appointment time as stored in the database
              const startDate = appointment.start_time 
                ? (typeof appointment.start_time === 'string' 
                    ? new Date(appointment.start_time) 
                    : appointment.start_time instanceof Date
                    ? appointment.start_time
                    : new Date(appointment.start_time))
                : null;
              const timeStr = startDate ? formatCrmTime(startDate) : '';
              
              // Get patient name (first part of title, limit length for readability)
              const titleParts = eventInfo.event.title.split(' - ');
              let patientName = titleParts[0] || eventInfo.event.title;
              // Truncate if too long
              if (patientName.length > 20) {
                patientName = patientName.substring(0, 17) + '...';
              }
              
              return (
                <div
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleEventRightClick(e, appointment);
                  }}
                  className="px-2 py-1 w-full"
                  style={{
                    minHeight: '24px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <div 
                    className="flex items-center gap-1.5 w-full"
                    style={{
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: '600',
                      lineHeight: '1.3',
                      textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.5)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                    }}
                  >
                    {timeStr && <span className="font-bold flex-shrink-0">{timeStr}</span>}
                    <span className="truncate">{patientName}</span>
                  </div>
                </div>
              );
            }
            
            // For week/day/list views, show full details
            return (
              <div
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleEventRightClick(e, appointment);
                }}
                className="p-1 text-xs w-full"
              >
                <div 
                  className="font-bold text-white"
                  style={{
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  }}
                >
                  {eventInfo.event.title}
                </div>
              </div>
            );
          }}
          />
        )}
      </div>
      </div>
    </>
  );
};

