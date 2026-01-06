/**
 * useDraftRouteGeneration Hook
 * 
 * Handles draft route generation workflow:
 * - Generate draft routes for unplanned appointments
 * - Preview draft routes before applying
 * - Apply draft routes (create driver_trips and trip_legs)
 */

import { useState, useCallback } from "react";
import { useCreate, useNotify, useDataProvider } from "ra-core";
import { format } from "date-fns";
import type { Identifier } from "ra-core";
import type { Appointment, Staff, Contact, DriverTrip, TripLeg } from "../../types";
import type { DraftRoute, DraftRouteGenerationResult } from "../types";
import { generateDraftRoutes, type DraftRouteGenerationOptions } from "../utils/draftRouteGenerator";
import { useOfficeLocation } from "@/hooks/useOfficeLocation";

type UseDraftRouteGenerationOptions = {
  selectedDate: Date;
  onRoutesGenerated?: (result: DraftRouteGenerationResult) => void;
  onError?: (error: Error) => void;
};

export function useDraftRouteGeneration({
  selectedDate,
  onRoutesGenerated,
  onError,
}: UseDraftRouteGenerationOptions) {
  const [create] = useCreate();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const { officeLocation } = useOfficeLocation(); // Get office location from settings
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftRoutes, setDraftRoutes] = useState<DraftRoute[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  /**
   * Generate draft routes for unplanned appointments
   */
  const generateDrafts = useCallback(
    async (
      unplannedAppointments: Appointment[],
      drivers: Staff[],
      existingTrips: DriverTrip[],
      existingLegs: TripLeg[],
      patients: Map<Identifier, Contact>,
      staff: Map<Identifier, Staff>
    ) => {
      setIsGenerating(true);
      try {
        const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

        const options: DraftRouteGenerationOptions = {
          selectedDate: selectedDateStr,
          unplannedAppointments,
          drivers,
          existingTrips,
          existingLegs,
          patients,
          staff,
          officeLocation, // Pass office location from settings for accurate distance calculations
        };

        const result = await generateDraftRoutes(options);

        setDraftRoutes(result.draftRoutes);
        setIsPreviewMode(true);

        notify(
          `Generated ${result.draftRoutes.length} draft route(s) for ${result.suggestions.assigned_appointments} appointment(s)`,
          { type: "success" }
        );

        onRoutesGenerated?.(result);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Failed to generate draft routes");
        console.error("Error generating draft routes:", err);
        
        // Provide more specific error messages
        let errorMessage = "Failed to generate draft routes";
        if (err.message.includes("API key")) {
          errorMessage = "Google Maps API key is missing or invalid. Please check your environment configuration.";
        } else if (err.message.includes("Failed to connect") || err.message.includes("Unable to connect")) {
          errorMessage = "Unable to connect to Google Maps API. Please check your internet connection and API key configuration.";
        } else if (err.message.includes("Distance Matrix API")) {
          errorMessage = "Google Maps Distance Matrix API error. Please verify your API key has the Distance Matrix API enabled.";
        } else {
          errorMessage = err.message || errorMessage;
        }
        
        notify(errorMessage, { type: "error" });
        onError?.(err);
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    [selectedDate, notify, onRoutesGenerated, onError]
  );

  /**
   * Apply draft routes (create driver_trips and trip_legs in database)
   */
  const applyDraftRoutes = useCallback(
    async (routesToApply: DraftRoute[] = draftRoutes) => {
      if (routesToApply.length === 0) {
        notify("No draft routes to apply", { type: "warning" });
        return;
      }

      setIsGenerating(true);
      try {
        // Create driver trips
        const trips: DriverTrip[] = [];
        for (const draftRoute of routesToApply) {
          const trip = await create(
            "driver_trips",
            {
              data: {
                driver_id: draftRoute.trip.driver_id,
                trip_date: draftRoute.trip.trip_date,
                start_time: draftRoute.trip.start_time,
                end_time: draftRoute.trip.end_time,
                status: "draft",
              },
            }
          );
          trips.push(trip);
        }

        // Create trip legs for all trips
        const allLegs: TripLeg[] = [];
        for (let i = 0; i < routesToApply.length; i++) {
          const draftRoute = routesToApply[i];
          const trip = trips[i];

          for (const leg of draftRoute.legs) {
            allLegs.push({
              ...leg,
              trip_id: trip.id,
            });
          }
        }

        // Batch create legs
        if (allLegs.length > 0) {
          await Promise.all(
            allLegs.map((leg) =>
              dataProvider.create("trip_legs", {
                data: {
                  trip_id: leg.trip_id,
                  leg_type: leg.leg_type,
                  leg_order: leg.leg_order,
                  staff_id: leg.staff_id,
                  appointment_id: leg.appointment_id,
                  location_type: leg.location_type,
                  location_id: leg.location_id,
                  planned_arrival_time: leg.planned_arrival_time,
                  planned_departure_time: leg.planned_departure_time,
                  is_locked: leg.is_locked,
                  wait_duration_minutes: leg.wait_duration_minutes,
                  return_location_type: leg.return_location_type,
                },
              })
            )
          );
        }

        notify(`Applied ${routesToApply.length} draft route(s)`, { type: "success" });
        setDraftRoutes([]);
        setIsPreviewMode(false);
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Failed to apply draft routes");
        console.error("Error applying draft routes:", err);
        notify("Failed to apply draft routes", { type: "error" });
        onError?.(err);
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    [draftRoutes, create, dataProvider, notify, onError]
  );

  /**
   * Discard draft routes
   */
  const discardDraftRoutes = useCallback(() => {
    setDraftRoutes([]);
    setIsPreviewMode(false);
    notify("Draft routes discarded", { type: "info" });
  }, [notify]);

  return {
    generateDrafts,
    applyDraftRoutes,
    discardDraftRoutes,
    draftRoutes,
    isGenerating,
    isPreviewMode,
  };
}

