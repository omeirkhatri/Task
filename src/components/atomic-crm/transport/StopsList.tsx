/**
 * StopsList Component
 * 
 * Ordered list of stops below the map, synchronized with selected driver's route.
 * Clickable to highlight on map.
 */

import React, { useMemo } from "react";
import { Clock, MapPin, User } from "lucide-react";
import { format } from "date-fns";
import type { Identifier } from "ra-core";
import { useGetList } from "ra-core";
import type { DriverTrip, TripLeg, Contact, Staff } from "../types";

type StopsListProps = {
  selectedDriverId: Identifier | null;
  selectedDate: Date;
  onLegClick: (legId: Identifier | null) => void;
  hoveredLegId: Identifier | null;
};

export const StopsList: React.FC<StopsListProps> = ({
  selectedDriverId,
  selectedDate,
  onLegClick,
  hoveredLegId,
}) => {
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  // Fetch driver trip
  const { data: driverTrips } = useGetList<DriverTrip>(
    "driver_trips",
    {
      pagination: { page: 1, perPage: 100 },
      filter: {
        "trip_date@eq": selectedDateStr,
        ...(selectedDriverId ? { "driver_id@eq": selectedDriverId } : {}),
      },
    },
    {
      enabled: !!selectedDriverId,
      retry: false,
    }
  );

  // Fetch trip legs
  const tripIds = useMemo(() => {
    return driverTrips?.map((trip) => trip.id) || [];
  }, [driverTrips]);

  const { data: tripLegs } = useGetList<TripLeg>(
    "trip_legs",
    {
      pagination: { page: 1, perPage: 1000 },
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

  // Fetch contacts and staff
  const patientIds = useMemo(() => {
    if (!tripLegs) return [];
    return tripLegs
      .filter((leg) => leg.location_type === "patient" && leg.location_id)
      .map((leg) => leg.location_id)
      .filter(Boolean);
  }, [tripLegs]);

  const staffIds = useMemo(() => {
    if (!tripLegs) return [];
    const ids = new Set<Identifier>();
    tripLegs.forEach((leg) => {
      if (leg.staff_id) ids.add(leg.staff_id);
    });
    return Array.from(ids);
  }, [tripLegs]);

  const { data: patients } = useGetList<Contact>(
    "clients",
    {
      pagination: { page: 1, perPage: 1000 },
      filter: {
        "id@in": patientIds.length > 0 ? `(${patientIds.join(",")})` : "(-1)",
      },
    },
    {
      enabled: patientIds.length > 0,
      retry: false,
    }
  );

  const { data: staff } = useGetList<Staff>(
    "staff",
    {
      pagination: { page: 1, perPage: 1000 },
      filter: {
        "id@in": staffIds.length > 0 ? `(${staffIds.join(",")})` : "(-1)",
      },
    },
    {
      enabled: staffIds.length > 0,
      retry: false,
    }
  );

  const patientsMap = useMemo(() => {
    if (!patients) return new Map<Identifier, Contact>();
    return new Map(patients.map((p) => [p.id, p]));
  }, [patients]);

  const staffMap = useMemo(() => {
    if (!staff) return new Map<Identifier, Staff>();
    return new Map(staff.map((s) => [s.id, s]));
  }, [staff]);

  const getLegLabel = (leg: TripLeg): string => {
    switch (leg.leg_type) {
      case "pickup_staff":
        const pickupStaff = leg.staff_id ? staffMap.get(leg.staff_id) : null;
        return `Pickup ${pickupStaff ? `${pickupStaff.first_name} ${pickupStaff.last_name}` : "Staff"}`;
      case "drop_staff":
        const dropStaff = leg.staff_id ? staffMap.get(leg.staff_id) : null;
        return `Drop ${dropStaff ? `${dropStaff.first_name} ${dropStaff.last_name}` : "Staff"}`;
      case "appointment":
        const patient = leg.location_id ? patientsMap.get(leg.location_id) : null;
        return patient ? `${patient.first_name} ${patient.last_name}` : "Appointment";
      case "wait":
        return `Wait ${leg.wait_duration_minutes || 0} min`;
      case "return":
        return "Return to Office";
      default:
        return leg.leg_type;
    }
  };

  const getLocationLabel = (leg: TripLeg): string => {
    if (leg.location_type === "patient" && leg.location_id) {
      const patient = patientsMap.get(leg.location_id);
      if (patient?.area) return patient.area;
      if (patient?.city) return patient.city;
    }
    return leg.location_type.charAt(0).toUpperCase() + leg.location_type.slice(1);
  };

  if (!selectedDriverId) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-slate-500 dark:text-slate-400 text-sm">
          Select a driver to view stops
        </div>
      </div>
    );
  }

  if (!tripLegs || tripLegs.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-slate-500 dark:text-slate-400 text-sm">
          No stops scheduled
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-900">
      <div className="p-2 space-y-1">
        {tripLegs.map((leg, index) => {
          const isHovered = hoveredLegId === leg.id;
          const startTime = new Date(leg.planned_arrival_time);

          return (
            <div
              key={leg.id}
              className={`p-2 rounded-md cursor-pointer transition-colors ${
                isHovered
                  ? "bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700"
                  : "bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
              onClick={() => onLegClick(leg.id)}
              onMouseEnter={() => onLegClick(leg.id)}
              onMouseLeave={() => onLegClick(null)}
            >
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                      {format(startTime, "h:mm a")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="w-3 h-3 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                    <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                      {getLegLabel(leg)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="w-3 h-3 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                    <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      {getLocationLabel(leg)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

