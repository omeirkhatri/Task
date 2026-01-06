/**
 * DriverTimelineLanes Component
 * 
 * Center panel displaying horizontal timeline lanes for each driver.
 * Shows time-based blocks (Pickup, Drop, Appointment, Wait) with color coding.
 * Supports drag-and-drop from unplanned queue.
 */

import React, { useMemo, useCallback, useRef, useEffect, useState } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { format, startOfDay, addHours, setHours } from "date-fns";
import { X } from "lucide-react";
import type { Staff, DriverTrip, TripLeg } from "../types";
import type { Identifier } from "ra-core";
import { useGetList } from "ra-core";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

type DriverTimelineLanesProps = {
  drivers: Staff[];
  selectedDate: Date;
  selectedDriverId: Identifier | null;
  onDriverSelect: (driverId: Identifier | null) => void;
  onAppointmentHover: (appointmentId: Identifier | null) => void;
  onUnassignAppointment?: (legId: Identifier, tripId: Identifier) => void;
  loading: boolean;
};

type TimelineBlock = {
  id: string;
  type: "pickup_staff" | "drop_staff" | "appointment" | "wait" | "return";
  startTime: Date;
  endTime: Date;
  label: string;
  status: "safe" | "tight" | "conflict";
  appointmentId?: Identifier;
  legId?: Identifier;
  tripId?: Identifier;
};

export const DriverTimelineLanes: React.FC<DriverTimelineLanesProps> = ({
  drivers,
  selectedDate,
  selectedDriverId,
  onDriverSelect,
  onAppointmentHover,
  onUnassignAppointment,
  loading,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);

  // Measure timeline width for responsive calculation
  useEffect(() => {
    const updateWidth = () => {
      if (timelineRef.current) {
        setTimelineWidth(timelineRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Fetch driver trips for selected date
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: driverTrips } = useGetList<DriverTrip>(
    "driver_trips",
    {
      pagination: { page: 1, perPage: 1000 },
      filter: {
        "trip_date@eq": selectedDateStr,
      },
    },
    {
      retry: false,
    }
  );

  // Fetch trip legs for all trips
  const tripIds = useMemo(() => {
    return driverTrips?.map((trip) => trip.id) || [];
  }, [driverTrips]);

  const { data: tripLegs } = useGetList<TripLeg>(
    "trip_legs",
    {
      pagination: { page: 1, perPage: 10000 },
      filter: {
        "trip_id@in": tripIds.length > 0 ? `(${tripIds.join(",")})` : "(-1)",
      },
      sort: { field: "leg_order", order: "ASC" },
    },
    {
      enabled: tripIds.length > 0,
      retry: false,
    }
  );

  // Group trips by driver
  const tripsByDriver = useMemo(() => {
    if (!driverTrips) return new Map<Identifier, DriverTrip[]>();
    const map = new Map<Identifier, DriverTrip[]>();
    driverTrips.forEach((trip) => {
      const driverId = trip.driver_id;
      if (!map.has(driverId)) {
        map.set(driverId, []);
      }
      map.get(driverId)!.push(trip);
    });
    return map;
  }, [driverTrips]);

  // Group legs by trip
  const legsByTrip = useMemo(() => {
    if (!tripLegs) return new Map<Identifier, TripLeg[]>();
    const map = new Map<Identifier, TripLeg[]>();
    tripLegs.forEach((leg) => {
      const tripId = leg.trip_id;
      if (!map.has(tripId)) {
        map.set(tripId, []);
      }
      map.get(tripId)!.push(leg);
    });
    return map;
  }, [tripLegs]);

  // Calculate timeline blocks for a driver
  const getDriverBlocks = useCallback(
    (driverId: Identifier): TimelineBlock[] => {
      const trips = tripsByDriver.get(driverId) || [];
      const blocks: TimelineBlock[] = [];

      trips.forEach((trip) => {
        const legs = legsByTrip.get(trip.id) || [];
        legs.forEach((leg) => {
          const startTime = new Date(leg.planned_arrival_time);
          const endTime = leg.planned_departure_time
            ? new Date(leg.planned_departure_time)
            : addHours(startTime, 1);

          let status: "safe" | "tight" | "conflict" = "safe";

          blocks.push({
            id: `leg-${leg.id}`,
            type: leg.leg_type,
            startTime,
            endTime,
            label: getLegLabel(leg),
            status,
            appointmentId: leg.appointment_id,
            legId: leg.id,
            tripId: leg.trip_id,
          });
        });
      });

      return blocks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    },
    [tripsByDriver, legsByTrip]
  );

  // Get label for a leg
  const getLegLabel = (leg: TripLeg): string => {
    switch (leg.leg_type) {
      case "pickup_staff":
        return "Pickup Staff";
      case "drop_staff":
        return "Drop Staff";
      case "appointment":
        return "Appointment";
      case "wait":
        return `Wait ${leg.wait_duration_minutes || 0} min`;
      case "return":
        return "Return";
      default:
        return leg.leg_type;
    }
  };

  // Timeline configuration - 24 hours (midnight to midnight)
  const dayStart = useMemo(() => startOfDay(selectedDate), [selectedDate]);
  const dayEnd = useMemo(() => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    return startOfDay(nextDay);
  }, [selectedDate]);
  
  const totalMinutes = useMemo(() => {
    return (dayEnd.getTime() - dayStart.getTime()) / (1000 * 60);
  }, [dayStart, dayEnd]);

  // Get color for block status
  const getBlockColor = (status: TimelineBlock["status"], type: TimelineBlock["type"]): string => {
    if (status === "conflict") return "bg-red-500";
    if (status === "tight") return "bg-yellow-500";
    
    switch (type) {
      case "pickup_staff":
      case "drop_staff":
        return "bg-blue-500";
      case "appointment":
        return "bg-green-500";
      case "wait":
        return "bg-gray-400";
      case "return":
        return "bg-purple-500";
      default:
        return "bg-slate-500";
    }
  };

  // Calculate position for a block using percentages (responsive)
  const getBlockPosition = useCallback((block: TimelineBlock) => {
    const startMinutes = (block.startTime.getTime() - dayStart.getTime()) / (1000 * 60);
    const durationMinutes = (block.endTime.getTime() - block.startTime.getTime()) / (1000 * 60);
    
    const leftPercent = (startMinutes / totalMinutes) * 100;
    const widthPercent = (durationMinutes / totalMinutes) * 100;
    
    return {
      left: `${leftPercent}%`,
      width: `${Math.max(widthPercent, 0.5)}%`, // Minimum 0.5% width
    };
  }, [dayStart, totalMinutes]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Driver Timelines - 24 Hours
          </h2>
          {/* Time scale header - responsive, no scrolling */}
          <div className="flex-1 ml-4" ref={timelineRef}>
            <div className="flex h-full">
              {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                <div
                  key={hour}
                  className="flex-1 text-center border-r border-slate-300 dark:border-slate-600 last:border-r-0"
                >
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    {format(setHours(dayStart, hour), hour % 3 === 0 ? "h a" : "h")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Lanes */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {drivers.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-8 text-sm">
            No drivers available
          </div>
        ) : (
          drivers.map((driver) => {
            const blocks = getDriverBlocks(driver.id);
            const driverName = `${driver.first_name} ${driver.last_name}`.trim();
            const isSelected = selectedDriverId === driver.id;

            return (
              <Droppable
                key={driver.id}
                droppableId={`driver-${driver.id}`}
                direction="horizontal"
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`border-b border-slate-200 dark:border-slate-700 ${
                      snapshot.isDraggingOver ? "bg-blue-50 dark:bg-blue-900/20" : ""
                    } ${isSelected ? "bg-blue-50 dark:bg-blue-900/10" : ""}`}
                    onClick={() => onDriverSelect(driver.id)}
                  >
                    {/* Driver Lane */}
                    <div className="flex items-stretch min-h-[90px]">
                      {/* Driver Name */}
                      <div className="w-40 flex-shrink-0 px-4 py-3 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex items-center">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {driverName}
                        </div>
                      </div>
                      
                      {/* Timeline Area - Responsive, no scrolling */}
                      <div className="flex-1 relative bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50">
                        {/* Hour markers grid - responsive */}
                        <div className="absolute inset-0 flex">
                          {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                            <div
                              key={hour}
                              className="flex-1 border-r border-slate-200 dark:border-slate-700 last:border-r-0 relative"
                            >
                              {/* Major hour marker (every 3 hours) */}
                              {hour % 3 === 0 && (
                                <div className="absolute top-0 left-0 right-0 h-full border-l-2 border-slate-300 dark:border-slate-600" />
                              )}
                              {/* Hour label (every 6 hours) */}
                              {hour % 6 === 0 && (
                                <div className="absolute top-1 left-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                  {format(setHours(dayStart, hour), "h a")}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {/* Timeline blocks - responsive positioning */}
                        <div className="absolute inset-0">
                          {blocks.map((block) => {
                            const position = getBlockPosition(block);
                            
                            // Can unassign if this is part of an appointment sequence (has tripId and legId)
                            const canUnassign = (block.type === "appointment" || block.type === "pickup_staff" || block.type === "drop_staff" || block.type === "return") && block.legId && block.tripId && onUnassignAppointment;
                            
                            const blockElement = (
                              <div
                                key={block.id}
                                className={`absolute top-2 bottom-2 ${getBlockColor(block.status, block.type)} rounded-md text-white text-xs px-2 py-1.5 flex items-center justify-center cursor-pointer hover:opacity-90 hover:shadow-lg hover:scale-105 transition-all z-10 font-medium`}
                                style={position}
                                onMouseEnter={() => {
                                  if (block.appointmentId) {
                                    onAppointmentHover(block.appointmentId);
                                  }
                                }}
                                onMouseLeave={() => onAppointmentHover(null)}
                                title={`${block.label} - ${format(block.startTime, "h:mm a")} to ${format(block.endTime, "h:mm a")}${canUnassign ? " (Right-click to unassign)" : ""}`}
                              >
                                <span className="truncate">{block.label}</span>
                              </div>
                            );

                            if (canUnassign) {
                              return (
                                <ContextMenu key={block.id}>
                                  <ContextMenuTrigger asChild>
                                    {blockElement}
                                  </ContextMenuTrigger>
                                  <ContextMenuContent>
                                    <ContextMenuItem
                                      variant="destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (block.legId && block.tripId && onUnassignAppointment) {
                                          onUnassignAppointment(block.legId, block.tripId);
                                        }
                                      }}
                                    >
                                      <X className="w-4 h-4 mr-2" />
                                      Unassign Appointment
                                    </ContextMenuItem>
                                  </ContextMenuContent>
                                </ContextMenu>
                              );
                            }

                            return blockElement;
                          })}
                        </div>
                      </div>
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })
        )}
      </div>
    </div>
  );
};
