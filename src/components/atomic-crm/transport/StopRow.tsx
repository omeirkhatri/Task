/**
 * StopRow Component
 * 
 * Individual stop row displaying leg type icon, person/location name,
 * planned time window, Pickup/Drop selector, drag handle, and lock toggle.
 */

import React from "react";
import { GripVertical, Lock, Unlock, Clock, User, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import type { TripLeg } from "../types";
import type { Identifier } from "ra-core";
import { PickupDropSelector } from "./PickupDropSelector";
import { useGetList } from "ra-core";
import type { Contact, Staff } from "../types";

type StopRowProps = {
  leg: TripLeg;
  index: number;
  dragHandleProps: any;
  onUpdate: (updates: Partial<TripLeg>) => void;
  selectedDate: Date;
};

const getLegTypeIcon = (legType: TripLeg["leg_type"]) => {
  switch (legType) {
    case "pickup_staff":
      return "🚗";
    case "drop_staff":
      return "📍";
    case "appointment":
      return "🏥";
    case "wait":
      return "⏳";
    case "return":
      return "🏢";
    default:
      return "•";
  }
};

const getLegTypeLabel = (legType: TripLeg["leg_type"]): string => {
  switch (legType) {
    case "pickup_staff":
      return "Pickup Staff";
    case "drop_staff":
      return "Drop Staff";
    case "appointment":
      return "Appointment";
    case "wait":
      return "Wait";
    case "return":
      return "Return";
    default:
      return legType;
  }
};

export const StopRow: React.FC<StopRowProps> = ({
  leg,
  index,
  dragHandleProps,
  onUpdate,
  selectedDate,
}) => {
  // Fetch patient if leg is for patient
  const { data: patients } = useGetList<Contact>(
    "clients",
    {
      pagination: { page: 1, perPage: 1 },
      filter:
        leg.location_type === "patient" && leg.location_id
          ? { id: leg.location_id }
          : undefined,
    },
    {
      enabled: leg.location_type === "patient" && !!leg.location_id,
      retry: false,
    }
  );

  // Fetch staff if leg has staff_id
  const { data: staff } = useGetList<Staff>(
    "staff",
    {
      pagination: { page: 1, perPage: 1 },
      filter: leg.staff_id ? { id: leg.staff_id } : undefined,
    },
    {
      enabled: !!leg.staff_id,
      retry: false,
    }
  );

  const patient = patients?.[0];
  const staffMember = staff?.[0];

  const getPersonName = (): string => {
    if (leg.leg_type === "appointment" && patient) {
      return `${patient.first_name} ${patient.last_name}`.trim();
    }
    if ((leg.leg_type === "pickup_staff" || leg.leg_type === "drop_staff") && staffMember) {
      return `${staffMember.first_name} ${staffMember.last_name}`.trim();
    }
    return "Unknown";
  };

  const getLocationName = (): string => {
    if (leg.location_type === "patient" && patient) {
      return patient.area || patient.city || "Patient Location";
    }
    return leg.location_type.charAt(0).toUpperCase() + leg.location_type.slice(1);
  };

  const startTime = new Date(leg.planned_arrival_time);
  const endTime = leg.planned_departure_time
    ? new Date(leg.planned_departure_time)
    : null;

  const handleLockToggle = () => {
    onUpdate({ is_locked: !leg.is_locked });
  };

  const handleLocationTypeChange = (locationType: "office" | "home" | "metro") => {
    if (leg.leg_type === "pickup_staff" || leg.leg_type === "drop_staff") {
      onUpdate({ location_type: locationType });
    }
  };

  const showPickupDropSelector =
    (leg.leg_type === "pickup_staff" || leg.leg_type === "drop_staff") &&
    leg.location_type !== "patient";

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex items-center gap-3">
      {/* Drag Handle */}
      <div
        {...dragHandleProps}
        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      >
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Stop Number */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center font-medium">
        {index + 1}
      </div>

      {/* Leg Type Icon */}
      <div className="flex-shrink-0 text-2xl">{getLegTypeIcon(leg.leg_type)}</div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {getLegTypeLabel(leg.leg_type)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <User className="w-3 h-3" />
          <span className="truncate">{getPersonName()}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-1">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{getLocationName()}</span>
        </div>
      </div>

      {/* Time Window */}
      <div className="flex-shrink-0 text-right">
        <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 mb-1">
          <Clock className="w-3 h-3" />
          <span>{format(startTime, "h:mm a")}</span>
        </div>
        {endTime && (
          <div className="text-xs text-slate-500 dark:text-slate-500">
            to {format(endTime, "h:mm a")}
          </div>
        )}
        {leg.wait_duration_minutes && (
          <div className="text-xs text-slate-500 dark:text-slate-500">
            Wait: {leg.wait_duration_minutes} min
          </div>
        )}
      </div>

      {/* Pickup/Drop Selector */}
      {showPickupDropSelector && (
        <div className="flex-shrink-0">
          <PickupDropSelector
            value={leg.location_type as "office" | "home" | "metro"}
            onChange={handleLocationTypeChange}
          />
        </div>
      )}

      {/* Lock Toggle */}
      <div className="flex-shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleLockToggle}
          className="h-8 w-8 p-0"
          title={leg.is_locked ? "Unlock stop" : "Lock stop"}
        >
          {leg.is_locked ? (
            <Lock className="w-4 h-4 text-amber-600" />
          ) : (
            <Unlock className="w-4 h-4 text-slate-400" />
          )}
        </Button>
      </div>
    </div>
  );
};

