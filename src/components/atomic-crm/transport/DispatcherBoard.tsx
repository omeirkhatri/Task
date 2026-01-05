/**
 * DispatcherBoard Component
 * 
 * Main component for the Driver Assignment & Dispatch System.
 * Provides a three-panel layout:
 * - Left: Unplanned Jobs Queue
 * - Center: Driver Timeline Lanes
 * - Right: Route Map View + Stops List
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useGetList, type Identifier } from "ra-core";
import { format, startOfDay, isToday, addDays, subDays } from "date-fns";
import type { Appointment, Staff } from "../types";
import { useDispatcherState } from "./hooks/useDispatcherState";
import { UnplannedJobsQueue } from "./UnplannedJobsQueue";
import { DriverTimelineLanes } from "./DriverTimelineLanes";
import { RouteMapView } from "./RouteMapView";
import { StopsList } from "./StopsList";
import { crmToday, crmStartOfDay } from "../misc/timezone";

type DispatcherBoardProps = {
  initialDate?: Date;
};

export const DispatcherBoard: React.FC<DispatcherBoardProps> = ({
  initialDate,
}) => {
  const { state, actions } = useDispatcherState(initialDate);
  const [leftPanelWidth, setLeftPanelWidth] = useState(300); // pixels
  const [rightPanelWidth, setRightPanelWidth] = useState(400); // pixels
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  // Fetch today's appointments
  const selectedDateStr = format(state.selectedDate, "yyyy-MM-dd");
  const {
    data: appointments,
    isPending: appointmentsLoading,
  } = useGetList<Appointment>(
    "appointments",
    {
      pagination: { page: 1, perPage: 10000 },
      sort: { field: "appointment_date", order: "ASC" },
      filter: {
        "appointment_date@eq": selectedDateStr,
      },
    },
    {
      retry: false,
      onError: (error) => {
        console.warn("Failed to load appointments:", error);
      },
    }
  );

  // Fetch driver trips for selected date
  const {
    data: driverTrips,
    isPending: tripsLoading,
  } = useGetList(
    "driver_trips",
    {
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "trip_date", order: "ASC" },
      filter: {
        "trip_date@eq": selectedDateStr,
      },
    },
    {
      retry: false,
      onError: (error) => {
        console.warn("Failed to load driver trips:", error);
      },
    }
  );

  // Fetch staff (for drivers)
  const {
    data: staff,
    isPending: staffLoading,
  } = useGetList<Staff>(
    "staff",
    {
      pagination: { page: 1, perPage: 1000 },
    },
    {
      retry: false,
      onError: (error) => {
        console.warn("Failed to load staff:", error);
      },
    }
  );

  // Filter drivers from staff
  const drivers = useMemo(() => {
    if (!staff) return [];
    return staff.filter((s) =>
      s.staff_type?.toLowerCase().includes("driver")
    );
  }, [staff]);

  // Get appointments without assigned trips (unplanned)
  const unplannedAppointments = useMemo(() => {
    if (!appointments || !driverTrips) return appointments || [];

    // Get all appointment IDs that are in trip_legs
    const plannedAppointmentIds = new Set<Identifier>();
    // TODO: Fetch trip_legs and check which appointments are assigned
    // For now, return all appointments as unplanned

    return appointments.filter(
      (appointment) => !plannedAppointmentIds.has(appointment.id)
    );
  }, [appointments, driverTrips]);

  // Handle date navigation
  const handleDatePrev = useCallback(() => {
    const newDate = subDays(state.selectedDate, 1);
    actions.setSelectedDate(newDate);
  }, [state.selectedDate, actions]);

  const handleDateNext = useCallback(() => {
    const newDate = addDays(state.selectedDate, 1);
    actions.setSelectedDate(newDate);
  }, [state.selectedDate, actions]);

  const handleDateToday = useCallback(() => {
    actions.setSelectedDate(crmToday());
  }, [actions]);

  const isCurrentDateToday = useMemo(() => {
    return isToday(state.selectedDate);
  }, [state.selectedDate]);

  // Panel resizing handlers
  const handleLeftResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizingLeft(true);
    },
    []
  );

  const handleRightResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizingRight(true);
    },
    []
  );

  useEffect(() => {
    if (!isResizingLeft && !isResizingRight) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = Math.max(200, Math.min(600, e.clientX));
        setLeftPanelWidth(newWidth);
      }
      if (isResizingRight) {
        const newWidth = Math.max(200, Math.min(600, window.innerWidth - e.clientX));
        setRightPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight]);

  // Handle drag end at top level
  const handleDragEnd = useCallback((result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    // Handle dropping appointment from unplanned queue to driver lane
    if (source.droppableId === "unplanned-queue" && destination.droppableId.startsWith("driver-")) {
      const appointmentId = draggableId.replace("appointment-", "");
      const driverId = destination.droppableId.replace("driver-", "");
      
      // TODO: Create trip and trip legs for this appointment
      console.log(`Assign appointment ${appointmentId} to driver ${driverId}`);
    }
  }, []);

  const loading = appointmentsLoading || tripsLoading || staffLoading;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header Bar */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Dispatcher Board
            </h1>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDatePrev}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant={isCurrentDateToday ? "default" : "ghost"}
              size="sm"
              onClick={handleDateToday}
              className="h-8 px-3 text-xs"
            >
              Today
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDateNext}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="px-3 py-1 text-sm font-medium text-slate-900 dark:text-slate-100">
              {format(state.selectedDate, "EEEE, MMMM d, yyyy")}
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-8 px-4 text-xs"
            >
              Plan Today
            </Button>
          </div>
        </div>
      </div>

      {/* Three-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Unplanned Jobs Queue */}
        <div
          className="flex-shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col"
          style={{ width: `${leftPanelWidth}px` }}
        >
          <div
            className="w-1 cursor-col-resize bg-slate-200 dark:bg-slate-700 hover:bg-blue-500 transition-colors absolute right-0 top-0 bottom-0 z-10"
            onMouseDown={handleLeftResizeStart}
          />
          <div className="flex-1 overflow-hidden">
            <UnplannedJobsQueue
              appointments={unplannedAppointments}
              loading={loading}
              selectedDate={state.selectedDate}
              onAppointmentClick={actions.setSelectedAppointment}
              onAppointmentHover={actions.setHoveredAppointment}
            />
          </div>
        </div>

        {/* Center Panel: Driver Timeline Lanes */}
        <div className="flex-1 bg-white dark:bg-slate-800 overflow-hidden flex flex-col">
          <DriverTimelineLanes
            drivers={drivers}
            selectedDate={state.selectedDate}
            selectedDriverId={state.selectedDriverId}
            onDriverSelect={actions.setSelectedDriver}
            onAppointmentHover={actions.setHoveredAppointment}
            loading={loading}
          />
        </div>

        {/* Right Panel: Map + Stops List */}
        <div
          className="flex-shrink-0 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col"
          style={{ width: `${rightPanelWidth}px` }}
        >
          <div
            className="w-1 cursor-col-resize bg-slate-200 dark:bg-slate-700 hover:bg-blue-500 transition-colors absolute left-0 top-0 bottom-0 z-10"
            onMouseDown={handleRightResizeStart}
          />
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Map View */}
            <div className="flex-1 min-h-0">
              <RouteMapView
                selectedDriverId={state.selectedDriverId}
                selectedDate={state.selectedDate}
                hoveredAppointmentId={state.hoveredAppointmentId}
                hoveredLegId={state.hoveredLegId}
                onLegHover={actions.setHoveredLeg}
              />
            </div>
            {/* Stops List */}
            <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700">
              <StopsList
                selectedDriverId={state.selectedDriverId}
                selectedDate={state.selectedDate}
                onLegClick={actions.setHoveredLeg}
                hoveredLegId={state.hoveredLegId}
              />
            </div>
          </div>
        </div>
      </div>
    </DragDropContext>
  );
};

