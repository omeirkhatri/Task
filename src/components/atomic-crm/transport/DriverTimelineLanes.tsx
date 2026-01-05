/**
 * DriverTimelineLanes Component
 * 
 * Center panel displaying horizontal timeline lanes for each driver.
 * Shows time-based blocks (Pickup, Drop, Appointment, Wait) with color coding.
 * Supports drag-and-drop from unplanned queue.
 */

import React, { useMemo, useCallback } from "react";
import { Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { format, startOfDay, addHours, setHours, setMinutes } from "date-fns";
import type { Staff, DriverTrip, TripLeg } from "../types";
import type { Identifier } from "ra-core";
import { useGetList } from "ra-core";

type DriverTimelineLanesProps = {
  drivers: Staff[];
  selectedDate: Date;
  selectedDriverId: Identifier | null;
  onDriverSelect: (driverId: Identifier | null) => void;
  onAppointmentHover: (appointmentId: Identifier | null) => void;
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
};

export const DriverTimelineLanes: React.FC<DriverTimelineLanesProps> = ({
  drivers,
  selectedDate,
  selectedDriverId,
  onDriverSelect,
  onAppointmentHover,
  loading,
}) => {
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
        trip_id: tripIds.length > 0 ? { "@in": `(${tripIds.join(",")})` } : undefined,
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
            : addHours(startTime, 1); // Default 1 hour if no departure time

          // Determine status (simplified - would use conflict detection in real implementation)
          let status: "safe" | "tight" | "conflict" = "safe";
          // TODO: Use conflict detection to determine actual status

          blocks.push({
            id: `leg-${leg.id}`,
            type: leg.leg_type,
            startTime,
            endTime,
            label: getLegLabel(leg),
            status,
            appointmentId: leg.appointment_id,
            legId: leg.id,
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

  // Timeline configuration
  const dayStart = useMemo(() => setHours(setMinutes(startOfDay(selectedDate), 0), 6), [selectedDate]); // 6 AM
  const dayEnd = useMemo(() => setHours(setMinutes(startOfDay(selectedDate), 0), 22), [selectedDate]); // 10 PM
  const totalMinutes = useMemo(() => {
    return (dayEnd.getTime() - dayStart.getTime()) / (1000 * 60);
  }, [dayStart, dayEnd]);


  // Get color for block status
  const getBlockColor = (status: TimelineBlock["status"]): string => {
    switch (status) {
      case "safe":
        return "bg-green-500";
      case "tight":
        return "bg-yellow-500";
      case "conflict":
        return "bg-red-500";
      default:
        return "bg-slate-500";
    }
  };

  // Calculate position and width for a block
  const getBlockStyle = (block: TimelineBlock) => {
    const startMinutes = (block.startTime.getTime() - dayStart.getTime()) / (1000 * 60);
    const durationMinutes = (block.endTime.getTime() - block.startTime.getTime()) / (1000 * 60);
    const leftPercent = (startMinutes / totalMinutes) * 100;
    const widthPercent = (durationMinutes / totalMinutes) * 100;

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };

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
              Driver Timelines
            </h2>
            {/* Time scale */}
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              {[6, 9, 12, 15, 18, 21].map((hour) => (
                <span key={hour}>{format(setHours(dayStart, hour), "h a")}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline Lanes */}
        <div className="flex-1 overflow-y-auto">
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
                      {/* Driver Name */}
                      <div className="flex items-center px-4 py-2 bg-slate-100 dark:bg-slate-800">
                        <div className="w-32 flex-shrink-0 text-sm font-medium text-slate-900 dark:text-slate-100">
                          {driverName}
                        </div>
                        {/* Timeline Area */}
                        <div className="flex-1 relative h-16">
                          {blocks.map((block) => (
                            <div
                              key={block.id}
                              className={`absolute top-1 bottom-1 ${getBlockColor(
                                block.status
                              )} rounded text-white text-xs p-1 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity`}
                              style={getBlockStyle(block)}
                              onMouseEnter={() => {
                                if (block.appointmentId) {
                                  onAppointmentHover(block.appointmentId);
                                }
                              }}
                              onMouseLeave={() => onAppointmentHover(null)}
                              title={`${block.label} - ${format(block.startTime, "h:mm a")} to ${format(block.endTime, "h:mm a")}`}
                            >
                              <span className="truncate">{block.label}</span>
                            </div>
                          ))}
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

