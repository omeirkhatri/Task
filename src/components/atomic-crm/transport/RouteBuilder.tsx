/**
 * RouteBuilder Component
 * 
 * Modal/drawer component for fine-tuning individual driver routes.
 * Provides detailed control over stop order, pickup/drop locations, and timing.
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCcw, Lock, Unlock, ArrowUpDown, X } from "lucide-react";
import { useGetList } from "ra-core";
import type { Identifier } from "ra-core";
import type { DriverTrip, TripLeg, Staff } from "../types";
import { format } from "date-fns";
import { StopsListEditor } from "./StopsListEditor";
import { optimizeRoute } from "./utils/routeOptimizer";
import type { Location } from "./types";

type RouteBuilderProps = {
  open: boolean;
  onClose: () => void;
  driverId: Identifier;
  selectedDate: Date;
  onSave?: (tripId: Identifier, legs: TripLeg[]) => void;
};

type RouteHistory = {
  legs: TripLeg[];
  timestamp: Date;
};

export const RouteBuilder: React.FC<RouteBuilderProps> = ({
  open,
  onClose,
  driverId,
  selectedDate,
  onSave,
}) => {
  const [legs, setLegs] = useState<TripLeg[]>([]);
  const [history, setHistory] = useState<RouteHistory[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  // Fetch driver info
  const { data: driver } = useGetList<Staff>(
    "staff",
    {
      pagination: { page: 1, perPage: 1 },
      filter: { id: driverId },
    },
    {
      enabled: open && !!driverId,
      retry: false,
    }
  );

  // Fetch driver trip for selected date
  const { data: driverTrips } = useGetList<DriverTrip>(
    "driver_trips",
    {
      pagination: { page: 1, perPage: 1 },
      filter: {
        "trip_date@eq": selectedDateStr,
        "driver_id@eq": driverId,
      },
    },
    {
      enabled: open && !!driverId,
      retry: false,
    }
  );

  // Fetch trip legs
  const tripId = driverTrips?.[0]?.id;
  const { data: tripLegs } = useGetList<TripLeg>(
    "trip_legs",
    {
      pagination: { page: 1, perPage: 1000 },
      filter: {
        trip_id: tripId ? { "@eq": tripId } : undefined,
      },
      sort: { field: "leg_order", order: "ASC" },
    },
    {
      enabled: open && !!tripId,
      retry: false,
    }
  );

  // Initialize legs when trip legs are loaded
  useEffect(() => {
    if (tripLegs && tripLegs.length > 0) {
      setLegs([...tripLegs]);
      setHistory([{ legs: [...tripLegs], timestamp: new Date() }]);
    } else {
      setLegs([]);
      setHistory([]);
    }
  }, [tripLegs]);

  // Build locations map for optimization
  const locationsMap = useMemo(() => {
    const map = new Map<Identifier, Location>();
    // TODO: Build locations map from legs, contacts, and staff
    // This would require fetching contacts and staff data
    return map;
  }, [legs]);

  // Save current state to history
  const saveToHistory = useCallback((newLegs: TripLeg[]) => {
    setHistory((prev) => {
      const newHistory = [...prev, { legs: [...newLegs], timestamp: new Date() }];
      // Keep only last 50 history entries
      return newHistory.slice(-50);
    });
  }, []);

  // Validate route sequence
  const validateRouteSequence = useCallback((legsToValidate: TripLeg[]): string[] => {
    const errors: string[] = [];
    const staffPickups = new Map<Identifier, number>(); // staff_id -> first pickup index
    const staffDrops = new Map<Identifier, number>(); // staff_id -> first drop index

    legsToValidate.forEach((leg, index) => {
      if (leg.leg_type === "pickup_staff" && leg.staff_id) {
        if (!staffPickups.has(leg.staff_id)) {
          staffPickups.set(leg.staff_id, index);
        }
      }
      if (leg.leg_type === "drop_staff" && leg.staff_id) {
        if (!staffDrops.has(leg.staff_id)) {
          staffDrops.set(leg.staff_id, index);
        }
      }
    });

    // Check for drops before pickups
    staffDrops.forEach((dropIndex, staffId) => {
      const pickupIndex = staffPickups.get(staffId);
      if (pickupIndex !== undefined && dropIndex < pickupIndex) {
        errors.push(`Cannot drop staff before pickup (stop ${dropIndex + 1} vs ${pickupIndex + 1})`);
      }
    });

    // Check for appointments without staff pickup/drop
    legsToValidate.forEach((leg, index) => {
      if (leg.leg_type === "appointment" && leg.appointment_id) {
        // Find if there's a pickup/drop for this appointment's staff
        const appointmentLeg = legsToValidate.find(
          (l) => l.appointment_id === leg.appointment_id && l.leg_type === "appointment"
        );
        if (appointmentLeg) {
          // Check if staff is picked up before appointment
          const staffId = appointmentLeg.staff_id;
          if (staffId) {
            const pickupIndex = staffPickups.get(staffId);
            if (pickupIndex === undefined || pickupIndex >= index) {
              errors.push(`Appointment at stop ${index + 1} requires staff pickup before it`);
            }
          }
        }
      }
    });

    return errors;
  }, []);

  // Handle leg reorder
  const handleLegsReorder = useCallback(
    (reorderedLegs: TripLeg[]) => {
      // Validate sequence
      const errors = validateRouteSequence(reorderedLegs);
      if (errors.length > 0) {
        console.warn("Route validation errors:", errors);
        // TODO: Show error notification to user
        // For now, we'll still allow the reorder but log the errors
      }

      // Update leg_order
      const updatedLegs = reorderedLegs.map((leg, index) => ({
        ...leg,
        leg_order: index + 1,
      }));
      setLegs(updatedLegs);
      saveToHistory(updatedLegs);
    },
    [saveToHistory, validateRouteSequence]
  );

  // Handle leg update
  const handleLegUpdate = useCallback(
    (legId: Identifier, updates: Partial<TripLeg>) => {
      const updatedLegs = legs.map((leg) =>
        leg.id === legId ? { ...leg, ...updates } : leg
      );

      // Validate sequence after update
      const errors = validateRouteSequence(updatedLegs);
      if (errors.length > 0) {
        console.warn("Route validation errors:", errors);
        // TODO: Show error notification to user
      }

      setLegs(updatedLegs);
      saveToHistory(updatedLegs);
    },
    [legs, saveToHistory, validateRouteSequence]
  );

  // Handle optimize order
  const handleOptimizeOrder = useCallback(async () => {
    if (legs.length <= 1) return;

    setIsOptimizing(true);
    try {
      const optimized = await optimizeRoute(legs, locationsMap, {
        appointment_times_must_not_change: true,
        locked_leg_ids: new Set(legs.filter((leg) => leg.is_locked).map((leg) => leg.id)),
      });

      setLegs(optimized.legs);
      saveToHistory(optimized.legs);
    } catch (error) {
      console.error("Error optimizing route:", error);
    } finally {
      setIsOptimizing(false);
    }
  }, [legs, locationsMap, saveToHistory]);

  // Handle undo
  const handleUndo = useCallback(() => {
    if (history.length <= 1) return;
    const previousState = history[history.length - 2];
    setLegs(previousState.legs);
    setHistory((prev) => prev.slice(0, -1));
  }, [history]);

  // Handle save
  const handleSave = useCallback(() => {
    if (tripId && onSave) {
      onSave(tripId, legs);
    }
    onClose();
  }, [tripId, legs, onSave, onClose]);

  const driverName = driver
    ? `${driver.first_name} ${driver.last_name}`.trim()
    : "Driver";
  const canUndo = history.length > 1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Route Builder - {driverName}</DialogTitle>
          <DialogDescription>
            Fine-tune route for {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={!canUndo}
              className="h-8"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Undo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOptimizeOrder}
              disabled={isOptimizing || legs.length <= 1}
              className="h-8"
            >
              <ArrowUpDown className="w-4 h-4 mr-1.5" />
              {isOptimizing ? "Optimizing..." : "Optimize Order"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8">
              Cancel
            </Button>
            <Button type="button" variant="default" size="sm" onClick={handleSave} className="h-8">
              Save Changes
            </Button>
          </div>
        </div>

        {/* Stops List Editor */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <StopsListEditor
            legs={legs}
            onLegsReorder={handleLegsReorder}
            onLegUpdate={handleLegUpdate}
            selectedDate={selectedDate}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

