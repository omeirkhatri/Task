import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Grid3X3, List, Plus, Map, ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetList, useNotify, useDelete, useDataProvider } from "ra-core";
import { AppointmentFiltersTop } from "./AppointmentFiltersTop";
import { AppointmentCalendar } from "./AppointmentCalendar";
import { VirtualizedTable } from "./VirtualizedTable";
import { AppointmentMapView } from "./AppointmentMapView";
import { AppointmentModal } from "./AppointmentModal";
import { AppointmentDetailsDrawer } from "./AppointmentDetailsDrawer";
import { AppointmentContextMenu } from "./AppointmentContextMenu";
import { AppointmentDeleteDialog } from "./AppointmentDeleteDialog";
import type { AppointmentFilterState, AppointmentViewMode } from "./types";
import type { Appointment } from "../types";
import { crmAddDays, crmStartOfDay, crmToday, crmDateYmdInputString } from "../misc/timezone";
import { format, isToday, startOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, addDays, getDaysInMonth, isSameMonth, isSameDay } from "date-fns";

// Calendar Popup Component
type CalendarPopupProps = {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onClose: () => void;
};

const CalendarPopup: React.FC<CalendarPopupProps> = ({ selectedDate, onDateSelect, onClose }) => {
  const [displayMonth, setDisplayMonth] = useState(startOfMonth(selectedDate));
  const today = crmToday();

  // Update display month when selectedDate changes
  useEffect(() => {
    setDisplayMonth(startOfMonth(selectedDate));
  }, [selectedDate]);

  const monthStart = startOfMonth(displayMonth);
  const monthEnd = endOfMonth(displayMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let currentDay = calendarStart;
  while (currentDay <= calendarEnd) {
    days.push(currentDay);
    currentDay = addDays(currentDay, 1);
  }

  const handlePreviousMonth = () => {
    setDisplayMonth(subMonths(displayMonth, 1));
  };

  const handleNextMonth = () => {
    setDisplayMonth(addMonths(displayMonth, 1));
  };

  const handleToday = () => {
    onDateSelect(today);
  };

  const handleDateClick = (date: Date) => {
    // Use crmStartOfDay to ensure proper timezone handling
    onDateSelect(crmStartOfDay(date));
  };

  const monthYear = format(displayMonth, "MMMM yyyy");
  const weekDays = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="absolute top-2 left-2 z-[2000] bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-4 w-[280px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePreviousMonth}
            className="h-6 w-6 p-0"
          >
            <ChevronLeft className="w-3 h-3" />
          </Button>
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {monthYear}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleNextMonth}
            className="h-6 w-6 p-0"
          >
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, index) => (
          <div
            key={index}
            className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-3">
        {days.map((day, index) => {
          const isCurrentMonth = isSameMonth(day, displayMonth);
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isSameDay(day, today);

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleDateClick(day)}
              className={`
                h-8 w-8 rounded text-xs font-medium transition-colors
                ${!isCurrentMonth ? "text-slate-300 dark:text-slate-600" : "text-slate-900 dark:text-slate-100"}
                ${isSelected ? "bg-blue-600 text-white dark:bg-blue-500" : ""}
                ${!isSelected && isTodayDate ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : ""}
                ${!isSelected && !isTodayDate && isCurrentMonth ? "hover:bg-slate-100 dark:hover:bg-slate-700" : ""}
              `}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Footer Buttons */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleToday}
          className="h-8 px-3 text-xs flex-1"
        >
          Today
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 px-3 text-xs flex-1"
        >
          Close
        </Button>
      </div>
    </div>
  );
};

export const AppointmentsPage = () => {
  try {
    return <AppointmentsPageContent />;
  } catch (error) {
    console.error("Error in AppointmentsPage:", error);
    return (
      <div className="min-h-screen bg-[--background] text-[--foreground] flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Error Loading Appointments</h2>
          <p className="text-[--muted-foreground]">
            {error instanceof Error ? error.message : "An unexpected error occurred"}
          </p>
        </div>
      </div>
    );
  }
};

const AppointmentsPageContent = () => {
  const [viewMode, setViewMode] = useState<AppointmentViewMode>("calendar");
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day" | "list">("month");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [filters, setFilters] = useState<AppointmentFilterState>({
    staffIds: [],
    appointmentTypes: [],
    statuses: [],
    dateFrom: null,
    dateTo: null,
  });
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [deletingAppointment, setDeletingAppointment] = useState<Appointment | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    appointment: Appointment;
    x: number;
    y: number;
  } | null>(null);
  const [isCalendarPopupOpen, setIsCalendarPopupOpen] = useState(false);
  const notify = useNotify();

  // Calculate date range for fetching appointments (1 month past to 2 months future)
  const dateRange = useMemo(() => {
    const today = new Date();
    const startDate = crmStartOfDay(crmAddDays(today, -30));
    const endDate = crmStartOfDay(crmAddDays(today, 60));
    return {
      from: startDate?.toISOString(),
      to: endDate?.toISOString(),
    };
  }, []);

  // Build filter for API call
  const apiFilter = useMemo(() => {
    const filter: any = {};
    
    // Build appointment_date filter - prioritize dateRange, then filters
    let dateFrom: string | undefined;
    let dateTo: string | undefined;
    
    // Use dateRange if available
    if (dateRange.from && dateRange.to) {
      dateFrom = dateRange.from instanceof Date 
        ? dateRange.from.toISOString().split("T")[0]
        : typeof dateRange.from === "string" 
          ? dateRange.from.split("T")[0]
          : dateRange.from;
      dateTo = dateRange.to instanceof Date
        ? dateRange.to.toISOString().split("T")[0]
        : typeof dateRange.to === "string"
          ? dateRange.to.split("T")[0]
          : dateRange.to;
    }
    
    // Override with filters if provided
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      dateFrom = fromDate.toISOString().split("T")[0];
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      dateTo = toDate.toISOString().split("T")[0];
    }
    
    if (dateFrom && dateTo) {
      filter["appointment_date@gte"] = dateFrom;
      filter["appointment_date@lte"] = dateTo;
    } else {
      if (dateFrom) {
        filter["appointment_date@gte"] = dateFrom;
      }
      if (dateTo) {
        filter["appointment_date@lte"] = dateTo;
      }
    }

    // Note: staff_ids is not a column - it's stored in appointment_staff_assignments junction table
    // We'll filter appointments by staff in the application layer after fetching
    // For now, skip this filter to avoid schema errors
    // TODO: Implement proper filtering through appointment_staff_assignments table

    if (filters.appointmentTypes.length > 0) {
      // For text fields, join with commas (Supabase handles the formatting)
      filter["appointment_type@in"] = `(${filters.appointmentTypes.join(",")})`;
    }

    if (filters.statuses.length > 0) {
      filter["status@in"] = `(${filters.statuses.join(",")})`;
    }

    return filter;
  }, [filters, dateRange]);

  // Fetch appointments - with error handling for missing resource
  // Disable the query initially to prevent blocking app initialization
  const [queryEnabled, setQueryEnabled] = useState(false);
  
  // Enable query after component mounts
  useEffect(() => {
    // Small delay to ensure app is fully loaded
    const timer = setTimeout(() => {
      setQueryEnabled(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const {
    data: appointments,
    isPending: appointmentsLoading,
    refetch: refetchAppointments,
    error: appointmentsError,
  } = useGetList<Appointment>(
    "appointments",
    {
      pagination: { page: 1, perPage: 10000 },
      sort: { field: "appointment_date", order: "ASC" },
      filter: apiFilter,
    },
    {
      enabled: queryEnabled, // Only enable after mount
      retry: false,
      // Don't wait indefinitely - treat as empty if resource doesn't exist
      onError: (error) => {
        console.warn("Appointments resource not found or error:", error);
        // Don't throw - just log
      },
      // Set a timeout to fail faster
      staleTime: 0,
      gcTime: 0,
    }
  );

  // Fetch staff assignments to populate staff_ids on appointments
  const { data: staffAssignments } = useGetList<any>(
    "appointment_staff_assignments",
    {
      pagination: { page: 1, perPage: 10000 },
    },
    {
      enabled: queryEnabled && !!appointments && appointments.length > 0,
      retry: false,
      onError: (error) => {
        console.warn("Failed to load staff assignments:", error);
      },
    }
  );

  // Enrich appointments with staff_ids from assignments
  const enrichedAppointments = useMemo(() => {
    if (!appointments) return [];
    if (!staffAssignments) return appointments;
    
    // Group assignments by appointment_id
    const assignmentsByAppointment = (staffAssignments || []).reduce((acc: any, assignment: any) => {
      const appId = assignment.appointment_id;
      if (!acc[appId]) {
        acc[appId] = [];
      }
      acc[appId].push(assignment.staff_id);
      return acc;
    }, {});
    
    // Add staff_ids to each appointment
    return appointments.map((appointment: Appointment) => ({
      ...appointment,
      staff_ids: assignmentsByAppointment[appointment.id] || [],
    }));
  }, [appointments, staffAssignments]);

  // Filtered appointments (client-side filtering for staff_ids and other logic)
  const filteredAppointments = useMemo(() => {
    if (!enrichedAppointments) return [];
    
    let filtered = enrichedAppointments;
    
    // Filter by staff IDs if specified
    if (filters.staffIds.length > 0) {
      filtered = filtered.filter((appointment: Appointment) => {
        const appointmentStaffIds = appointment.staff_ids || [];
        return filters.staffIds.some((filterStaffId) =>
          appointmentStaffIds.includes(parseInt(filterStaffId, 10))
        );
      });
    }
    
    return filtered;
  }, [enrichedAppointments, filters.staffIds]);

  // Use filtered appointments (which includes staff_ids enrichment and filtering)
  const safeAppointments = filteredAppointments || [];

  // Count appointments for current date
  const appointmentsForCurrentDate = useMemo(() => {
    if (!safeAppointments) return 0;
    const currentDateStr = format(currentDate, "yyyy-MM-dd");
    return safeAppointments.filter((appointment: Appointment) => {
      if (!appointment.appointment_date) return false;
      const appointmentDate = new Date(appointment.appointment_date);
      const appointmentDateStr = format(appointmentDate, "yyyy-MM-dd");
      return appointmentDateStr === currentDateStr;
    }).length;
  }, [safeAppointments, currentDate]);

  // Check if current date is today in CRM timezone
  const isCurrentDateToday = useMemo(() => {
    const currentDateStr = crmDateYmdInputString(currentDate);
    const todayStr = crmDateYmdInputString(crmToday());
    return currentDateStr === todayStr;
  }, [currentDate]);

  // Format date display based on current view
  const getDateDisplay = useCallback(() => {
    if (viewMode === "map") {
      // Map view: Full date with badge
      return format(currentDate, "EEEE, MMMM d, yyyy");
    }

    if (viewMode === "calendar") {
      if (calendarView === "month") {
        // Month view: "December 2025"
        return format(currentDate, "MMMM yyyy");
      } else if (calendarView === "week") {
        // Week view: "Dec 2025" or "Dec - Jan 2025"
        const weekStart = new Date(currentDate);
        const dayOfWeek = weekStart.getDay();
        // Adjust to Monday (assuming week starts on Monday)
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(weekStart.getDate() + mondayOffset);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const startMonth = format(weekStart, "MMM");
        const endMonth = format(weekEnd, "MMM");
        const year = format(weekStart, "yyyy");
        
        if (startMonth === endMonth) {
          return `${startMonth} ${year}`;
        } else {
          return `${startMonth} - ${endMonth} ${year}`;
        }
      } else if (calendarView === "day" || calendarView === "list") {
        // Day/List view: Full date with badge
        return format(currentDate, "EEEE, MMMM d, yyyy");
      }
    }
    
    // Default: Full date
    return format(currentDate, "EEEE, MMMM d, yyyy");
  }, [viewMode, calendarView, currentDate]);

  // Determine if appointment badge should be shown
  const shouldShowAppointmentBadge = useCallback(() => {
    if (viewMode === "map") {
      return true; // Map view always shows badge
    }
    
    if (viewMode === "calendar") {
      // Only show badge for day and list views
      return calendarView === "day" || calendarView === "list";
    }
    
    return false;
  }, [viewMode, calendarView]);

  // Show error state if resource doesn't exist (but still allow page to render)
  const showError = appointmentsError && !appointmentsLoading;
  
  // If loading for more than 2 seconds, assume resource doesn't exist and show page
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  useEffect(() => {
    if (appointmentsLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
        console.warn("Appointments query taking too long, showing page with empty data");
      }, 2000); // Reduced to 2 seconds
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [appointmentsLoading]);
  
  // Show page even if loading (with empty data) after timeout or if we have data/error
  const shouldShowLoading = appointmentsLoading && !loadingTimeout && !appointments && !appointmentsError;

  const handleApplyFilters = useCallback(() => {
    refetchAppointments();
  }, [refetchAppointments]);

  const handleNewAppointment = useCallback((initialDate?: Date, initialEndDate?: Date) => {
    setEditingAppointment(null);
    // Store initial date/time for the form
    if (initialDate) {
      setInitialDateTime({ start: initialDate, end: initialEndDate || initialDate });
    } else {
      setInitialDateTime(null);
    }
    setIsModalOpen(true);
  }, []);

  const [initialDateTime, setInitialDateTime] = useState<{ start: Date; end: Date } | null>(null);

  const handleAppointmentClick = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsDrawerOpen(true);
  }, []);

  const handleAppointmentRightClick = useCallback(
    (appointment: Appointment, event: React.MouseEvent) => {
      event.preventDefault();
      setContextMenu({
        appointment,
        x: event.clientX,
        y: event.clientY,
      });
    },
    []
  );

  const handleEditAppointment = useCallback((appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsModalOpen(true);
    setIsDrawerOpen(false);
    setContextMenu(null);
  }, []);

  const [deleteAppointment] = useDelete();
  const dataProvider = useDataProvider();

  const handleDeleteAppointment = useCallback(
    (appointment: Appointment) => {
      if (!appointment?.id) {
        notify("Cannot delete: appointment ID is missing", { type: "error" });
        return;
      }
      setDeletingAppointment(appointment);
      setIsDeleteDialogOpen(true);
    },
    [notify]
  );

  const handleConfirmDelete = useCallback(
    async (deleteFutureOnly: boolean) => {
      if (!deletingAppointment?.id) {
        return;
      }

      setIsDeleting(true);
      try {
        // First, delete all staff assignments for this appointment
        try {
          const { data: assignments } = await dataProvider.getList("appointment_staff_assignments", {
            pagination: { page: 1, perPage: 1000 },
            filter: { appointment_id: deletingAppointment.id },
          });
          
          for (const assignment of assignments || []) {
            await dataProvider.delete("appointment_staff_assignments", { id: assignment.id });
          }
        } catch (staffError) {
          console.warn("Error deleting staff assignments:", staffError);
          // Continue with appointment deletion even if staff assignments fail
        }

        // Delete the appointment with deleteFutureOnly flag
        await deleteAppointment(
          "appointments",
          { 
            id: deletingAppointment.id,
            meta: { deleteFutureOnly } // Pass flag via meta
          },
          {
            onSuccess: () => {
              notify(
                deleteFutureOnly 
                  ? "Appointment and future appointments deleted successfully" 
                  : "Appointment deleted successfully",
                { type: "success" }
              );
              refetchAppointments();
              setContextMenu(null);
              setIsDrawerOpen(false);
              setIsDeleteDialogOpen(false);
              setDeletingAppointment(null);
            },
            onError: (error: any) => {
              console.error("Error deleting appointment:", error);
              const errorMessage = error?.message || error?.body?.message || "Failed to delete appointment";
              notify(`Failed to delete appointment: ${errorMessage}`, { type: "error" });
            },
          }
        );
      } catch (error) {
        console.error("Error in handleConfirmDelete:", error);
        notify("Failed to delete appointment", { type: "error" });
      } finally {
        setIsDeleting(false);
      }
    },
    [deletingAppointment, deleteAppointment, dataProvider, notify, refetchAppointments]
  );


  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setEditingAppointment(null);
    setInitialDateTime(null);
  }, []);

  const handleModalSuccess = useCallback(() => {
    setIsModalOpen(false);
    setEditingAppointment(null);
    refetchAppointments();
    notify("Appointment saved successfully", { type: "success" });
  }, [notify, refetchAppointments]);

  const handleDateNavigation = useCallback((direction: "prev" | "next" | "today") => {
    if (direction === "today") {
      // Get today's date at midnight in CRM timezone
      const today = crmToday();
      setCurrentDate(today);
    } else if (direction === "prev") {
      setCurrentDate((prev) => {
        const newDate = new Date(prev);
        if (calendarView === "month") {
          newDate.setMonth(newDate.getMonth() - 1);
        } else if (calendarView === "week") {
          newDate.setDate(newDate.getDate() - 7);
        } else {
          newDate.setDate(newDate.getDate() - 1);
        }
        return newDate;
      });
    } else {
      setCurrentDate((prev) => {
        const newDate = new Date(prev);
        if (calendarView === "month") {
          newDate.setMonth(newDate.getMonth() + 1);
        } else if (calendarView === "week") {
          newDate.setDate(newDate.getDate() + 7);
        } else {
          newDate.setDate(newDate.getDate() + 1);
        }
        return newDate;
      });
    }
  }, [calendarView]);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col overflow-hidden" style={{ 
      width: '95vw', 
      maxWidth: '95vw',
      marginLeft: 'calc(-50vw + 50% + 2.5vw - 1rem)',
      marginRight: 'calc(-50vw + 50% + 2.5vw - 1rem)'
    }}>
      {/* Error Banner */}
      {showError && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">
              ⚠️ Appointments table not found in database
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300 mb-2">
              {appointmentsError instanceof Error && appointmentsError.message.includes("schema cache")
                ? "The appointments table needs to be created. Run the migration to fix this:"
                : "The appointments resource is not available. Please apply the database migration."}
            </p>
            <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-3 text-xs font-mono text-amber-900 dark:text-amber-200">
              <p className="mb-1">For local development:</p>
              <p className="mb-1">  make supabase-apply-appointments</p>
              <p className="mb-1">  or</p>
              <p>  npx supabase migration up</p>
              <p className="mt-2 mb-1">For remote Supabase:</p>
              <p>  npx supabase db push</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content - Full Width */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
        {/* Top Bar - Filters, View Toggle, New Appointment */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Filters on Left */}
            <div className="flex items-center">
              <AppointmentFiltersTop
                filters={filters}
                onFiltersChange={setFilters}
                onApply={handleApplyFilters}
              />
            </div>

            {/* View Toggle and New Appointment on Right */}
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("calendar")}
                  className={`px-3 py-1.5 rounded-md transition-all text-xs ${
                    viewMode === "calendar"
                      ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  <Grid3X3 className="w-3 h-3 mr-1.5" />
                  Calendar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1.5 rounded-md transition-all text-xs ${
                    viewMode === "table"
                      ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  <List className="w-3 h-3 mr-1.5" />
                  Table
                </Button>
              </div>
              <Button
                onClick={handleNewAppointment}
                className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Appointment
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Bar - Date Controls and View Options */}
        {viewMode === "calendar" && (
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex-shrink-0">
            <div className="flex items-center justify-between relative">
              {/* Date Navigation on Left */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDateNavigation("prev")}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant={isCurrentDateToday ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleDateNavigation("today")}
                  className="h-8 px-3 text-xs"
                >
                  Today
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDateNavigation("next")}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCalendarPopupOpen(!isCalendarPopupOpen)}
                  className="h-8 w-8 p-0"
                >
                  <CalendarIcon className="w-4 h-4" />
                </Button>
              </div>

              {/* Current Date and Appointment Count in Center - Absolutely Centered */}
              <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-3">
                <div className="text-base font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  {getDateDisplay()}
                </div>
                {shouldShowAppointmentBadge() && appointmentsForCurrentDate > 0 && (
                  <div className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                    isCurrentDateToday 
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                  }`}>
                    {appointmentsForCurrentDate} appointment{appointmentsForCurrentDate !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* View Options on Right */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1 flex-shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCalendarView("month")}
                  className={`px-3 py-1.5 rounded-md transition-all text-xs ${
                    calendarView === "month"
                      ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  Month
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCalendarView("week")}
                  className={`px-3 py-1.5 rounded-md transition-all text-xs ${
                    calendarView === "week"
                      ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  Week
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCalendarView("day")}
                  className={`px-3 py-1.5 rounded-md transition-all text-xs ${
                    calendarView === "day"
                      ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  Day
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCalendarView("list")}
                  className={`px-3 py-1.5 rounded-md transition-all text-xs ${
                    calendarView === "list"
                      ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  List
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("map")}
                  className={`px-3 py-1.5 rounded-md transition-all text-xs ${
                    viewMode === "map"
                      ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  <Map className="w-3 h-3 mr-1.5" />
                  Map
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Map View Navigation Bar */}
        {viewMode === "map" && (
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex-shrink-0">
            <div className="flex items-center justify-between relative">
              {/* Date Navigation on Left */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setDate(newDate.getDate() - 1);
                    setCurrentDate(newDate);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant={isCurrentDateToday ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleDateNavigation("today")}
                  className="h-8 px-3 text-xs"
                >
                  Today
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setDate(newDate.getDate() + 1);
                    setCurrentDate(newDate);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCalendarPopupOpen(!isCalendarPopupOpen)}
                  className="h-8 w-8 p-0"
                >
                  <CalendarIcon className="w-4 h-4" />
                </Button>
              </div>

              {/* Current Date and Appointment Count in Center - Absolutely Centered */}
              <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-3">
                <div className="text-base font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  {getDateDisplay()}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  isCurrentDateToday 
                    ? "bg-orange-500 text-white"
                    : "bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300"
                }`}>
                  {appointmentsForCurrentDate} appointment{appointmentsForCurrentDate !== 1 ? 's' : ''}
                </div>
              </div>

              {/* View Options on Right */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1 flex-shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setViewMode("calendar");
                    setCalendarView("month");
                  }}
                  className="px-3 py-1.5 rounded-md transition-all text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  Month
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setViewMode("calendar");
                    setCalendarView("week");
                  }}
                  className="px-3 py-1.5 rounded-md transition-all text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  Week
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setViewMode("calendar");
                    setCalendarView("day");
                  }}
                  className="px-3 py-1.5 rounded-md transition-all text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  Day
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setViewMode("calendar");
                    setCalendarView("list");
                  }}
                  className="px-3 py-1.5 rounded-md transition-all text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  List
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={`px-3 py-1.5 rounded-md transition-all text-xs ${
                    viewMode === "map"
                      ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  <Map className="w-3 h-3 mr-1.5" />
                  Map
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Calendar, Table, or Map View - Full Width */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {viewMode === "calendar" ? (
            <AppointmentCalendar
              appointments={safeAppointments}
              loading={shouldShowLoading}
              onAppointmentClick={handleAppointmentClick}
              onAppointmentRightClick={handleAppointmentRightClick}
              onAppointmentUpdate={refetchAppointments}
              onDateSelect={(start, end) => handleNewAppointment(start, end)}
              currentDate={currentDate}
              view={calendarView}
              onDateChange={setCurrentDate}
            />
          ) : viewMode === "map" ? (
            <AppointmentMapView
              appointments={safeAppointments}
              loading={shouldShowLoading}
              onAppointmentClick={handleAppointmentClick}
              selectedDate={currentDate}
              onDateChange={setCurrentDate}
            />
          ) : (
            <VirtualizedTable
              appointments={safeAppointments}
              loading={shouldShowLoading}
              onAppointmentClick={handleAppointmentClick}
            />
          )}
          
          {/* Calendar Popup Overlay - Available in all views */}
          {isCalendarPopupOpen && (
            <CalendarPopup
              selectedDate={currentDate}
              onDateSelect={(date) => {
                // Ensure we create a new date object to trigger re-renders
                const newDate = new Date(date);
                setCurrentDate(newDate);
                setIsCalendarPopupOpen(false);
              }}
              onClose={() => setIsCalendarPopupOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Modals and Drawers */}
      <AppointmentModal
        open={isModalOpen}
        onClose={handleModalClose}
        appointment={editingAppointment}
        initialDateTime={initialDateTime}
        onSuccess={handleModalSuccess}
      />

      <AppointmentDetailsDrawer
        open={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onEdit={handleEditAppointment}
        onDelete={handleDeleteAppointment}
      />

      {contextMenu && (
        <AppointmentContextMenu
          appointment={contextMenu.appointment}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onEdit={handleEditAppointment}
          onDelete={handleDeleteAppointment}
        />
      )}

      <AppointmentDeleteDialog
        open={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeletingAppointment(null);
        }}
        appointment={deletingAppointment}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

    </div>
  );
};

AppointmentsPage.path = "/appointments";

