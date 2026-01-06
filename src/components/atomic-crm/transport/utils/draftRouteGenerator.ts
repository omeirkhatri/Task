/**
 * Draft Route Generator
 * 
 * Main algorithm to generate draft routes for all unplanned appointments.
 * Analyzes appointments, driver availability, locations, and travel times
 * to suggest optimal assignments. All suggestions require manager approval.
 */

import { addMinutes, format, startOfDay } from "date-fns";
import type { Identifier } from "ra-core";
import type { Appointment, Staff, Contact, DriverTrip, TripLeg } from "../../types";
import type { DraftRoute, Location, LocationType } from "../types";
import { suggestDriverAssignment, calculateDriverAvailabilities } from "./driverAssignmentSuggester";
import { suggestPickupDrop, suggestWaitVsLeave } from "./pickupDropSuggester";
import { detectSplitDriverNeeded } from "./splitDriverLogic";
import { detectConflicts, type ConflictDetectionContext } from "./conflictDetector";
import { optimizeRoute } from "./routeOptimizer";
import {
  extractContactCoordinates,
  getLocationByType,
  getOfficeLocation,
} from "./coordinateExtractor";
import { calculateTravelTime, getEffectiveTravelTime } from "./travelTimeCalculator";
import type { OfficeLocation } from "@/hooks/useOfficeLocation";

export type DraftRouteGenerationOptions = {
  selectedDate: string; // YYYY-MM-DD
  unplannedAppointments: Appointment[];
  drivers: Staff[];
  existingTrips: DriverTrip[];
  existingLegs: TripLeg[];
  patients: Map<Identifier, Contact>;
  staff: Map<Identifier, Staff>;
  officeLocation?: OfficeLocation | null; // Optional office location from settings for accurate distance calculations
};

export type DraftRouteGenerationResult = {
  draftRoutes: DraftRoute[];
  unassignedAppointments: Appointment[];
  suggestions: {
    total_appointments: number;
    assigned_appointments: number;
    unassigned_appointments: number;
    split_driver_suggestions: number;
  };
};

/**
 * Generate draft routes for all unplanned appointments
 * 
 * @param options - Generation options including appointments, drivers, and existing routes
 * @returns Draft routes with suggestions and unassigned appointments
 */
export async function generateDraftRoutes(
  options: DraftRouteGenerationOptions
): Promise<DraftRouteGenerationResult> {
  const {
    selectedDate,
    unplannedAppointments,
    drivers,
    existingTrips,
    existingLegs,
    patients,
    staff,
    officeLocation,
  } = options;

  const draftRoutes: DraftRoute[] = [];
  const unassignedAppointments: Appointment[] = [];

  // Calculate driver availabilities
  const driverAvailabilities = calculateDriverAvailabilities(
    drivers,
    existingTrips,
    existingLegs,
    selectedDate
  );

  // Sort appointments by start time
  const sortedAppointments = [...unplannedAppointments].sort((a, b) => {
    const timeA = a.start_time ? new Date(a.start_time).getTime() : 0;
    const timeB = b.start_time ? new Date(b.start_time).getTime() : 0;
    return timeA - timeB;
  });

  // Track assigned appointments to avoid double assignment
  const assignedAppointmentIds = new Set<Identifier>();

  // Group appointments by suggested driver
  const appointmentsByDriver = new Map<Identifier, Appointment[]>();

  // Step 1: Suggest driver assignments for each appointment
  for (const appointment of sortedAppointments) {
    if (assignedAppointmentIds.has(appointment.id)) continue;

    const patient = patients.get(appointment.patient_id);
    const primaryStaff = appointment.primary_staff_id
      ? staff.get(appointment.primary_staff_id)
      : null;

    // Get driver suggestions
    const driverSuggestions = await suggestDriverAssignment(
      appointment,
      drivers,
      driverAvailabilities,
      patient || null,
      existingTrips,
      existingLegs
    );

    if (driverSuggestions.length === 0) {
      // No suitable driver found
      unassignedAppointments.push(appointment);
      continue;
    }

    // Use top suggestion
    const topSuggestion = driverSuggestions[0];
    const driverId = topSuggestion.driver_id;

    // Add to driver's appointment list
    if (!appointmentsByDriver.has(driverId)) {
      appointmentsByDriver.set(driverId, []);
    }
    appointmentsByDriver.get(driverId)!.push(appointment);
    assignedAppointmentIds.add(appointment.id);
  }

  // Step 2: Generate draft routes for each driver
  for (const [driverId, driverAppointments] of appointmentsByDriver) {
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) continue;

    // Sort appointments by time
    const sortedDriverAppointments = [...driverAppointments].sort((a, b) => {
      const timeA = a.start_time ? new Date(a.start_time).getTime() : 0;
      const timeB = b.start_time ? new Date(b.start_time).getTime() : 0;
      return timeA - timeB;
    });

    // Generate trip legs for this driver
    const legs: TripLeg[] = [];
    let tripStartTime: Date | null = null;
    let tripEndTime: Date | null = null;

    for (let i = 0; i < sortedDriverAppointments.length; i++) {
      const appointment = sortedDriverAppointments[i];
      const patient = patients.get(appointment.patient_id);
      const primaryStaff = appointment.primary_staff_id
        ? staff.get(appointment.primary_staff_id)
        : null;

      const appointmentStart = new Date(appointment.start_time);
      const appointmentEnd = new Date(appointment.end_time);

      // Update trip time range
      if (!tripStartTime || appointmentStart < tripStartTime) {
        tripStartTime = appointmentStart;
      }
      if (!tripEndTime || appointmentEnd > tripEndTime) {
        tripEndTime = appointmentEnd;
      }

      // Get previous and next appointments for wait/leave logic
      const previousAppointment =
        i > 0 ? sortedDriverAppointments[i - 1] : null;
      const nextAppointment =
        i < sortedDriverAppointments.length - 1
          ? sortedDriverAppointments[i + 1]
          : null;

      const previousEndTime = previousAppointment
        ? new Date(previousAppointment.end_time)
        : null;
      const nextStartTime = nextAppointment
        ? new Date(nextAppointment.start_time)
        : null;

      // Suggest pickup/drop locations - pass office location from settings for accurate distance calculations
      const pickupDropSuggestion = await suggestPickupDrop(
        appointment,
        primaryStaff || null,
        patient || null,
        previousEndTime || undefined,
        nextStartTime || undefined,
        officeLocation || undefined
      );

      const pickupLocation: LocationType =
        pickupDropSuggestion?.pickup_location || "office";
      const dropLocation: LocationType =
        pickupDropSuggestion?.drop_location || "office";

      // Determine wait vs leave
      const waitVsLeave = suggestWaitVsLeave(
        appointmentEnd,
        nextStartTime,
        nextAppointment !== null
      );

      // Create legs for this appointment
      // 1. Pickup staff
      const pickupArrivalTime = calculatePickupArrivalTime(
        appointmentStart,
        pickupLocation,
        patient || null
      );

      legs.push({
        id: `draft-pickup-${appointment.id}` as Identifier,
        trip_id: `draft-trip-${driverId}` as Identifier,
        leg_type: "pickup_staff",
        leg_order: legs.length + 1,
        staff_id: primaryStaff?.id,
        location_type: pickupLocation,
        location_id: getLocationIdForType(pickupLocation, primaryStaff?.id),
        planned_arrival_time: pickupArrivalTime.toISOString(),
        planned_departure_time: appointmentStart.toISOString(),
        is_locked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // 2. Drop staff at patient
      legs.push({
        id: `draft-drop-${appointment.id}` as Identifier,
        trip_id: `draft-trip-${driverId}` as Identifier,
        leg_type: "drop_staff",
        leg_order: legs.length + 1,
        staff_id: primaryStaff?.id,
        appointment_id: appointment.id,
        location_type: "patient",
        location_id: appointment.patient_id,
        planned_arrival_time: appointmentStart.toISOString(),
        planned_departure_time: null, // Will be set after appointment
        is_locked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // 3. Appointment (wait)
      if (waitVsLeave === "wait") {
        const waitDuration = nextStartTime
          ? (nextStartTime.getTime() - appointmentEnd.getTime()) / (60 * 1000)
          : 0;

        legs.push({
          id: `draft-wait-${appointment.id}` as Identifier,
          trip_id: `draft-trip-${driverId}` as Identifier,
          leg_type: "wait",
          leg_order: legs.length + 1,
          appointment_id: appointment.id,
          location_type: "patient",
          location_id: appointment.patient_id,
          planned_arrival_time: appointmentEnd.toISOString(),
          planned_departure_time: nextStartTime?.toISOString() || null,
          wait_duration_minutes: waitDuration,
          is_locked: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // 4. Pickup staff from patient (if wait) or return (if leave)
      if (waitVsLeave === "wait" && nextStartTime) {
        // Pickup for next appointment
        // (Will be handled in next iteration)
      } else {
        // Return to drop location
        const returnArrivalTime = calculateReturnArrivalTime(
          appointmentEnd,
          dropLocation,
          patient || null
        );

        legs.push({
          id: `draft-return-${appointment.id}` as Identifier,
          trip_id: `draft-trip-${driverId}` as Identifier,
          leg_type: "return",
          leg_order: legs.length + 1,
          location_type: dropLocation,
          location_id: getLocationIdForType(dropLocation, primaryStaff?.id),
          planned_arrival_time: returnArrivalTime.toISOString(),
          return_location_type: dropLocation,
          is_locked: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    // Create draft trip
    if (tripStartTime && tripEndTime) {
      const draftTrip: DriverTrip = {
        id: `draft-trip-${driverId}` as Identifier,
        driver_id: driverId,
        trip_date: selectedDate,
        start_time: format(tripStartTime, "HH:mm:ss"),
        end_time: format(tripEndTime, "HH:mm:ss"),
        status: "draft",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Detect conflicts
      const conflictContext: ConflictDetectionContext = {
        trip: draftTrip,
        legs,
        appointments: new Map(
          sortedDriverAppointments.map((a) => [a.id, a])
        ),
        contacts: patients,
        staff,
      };

      const conflicts = await detectConflicts(conflictContext);

      // Build locations map for optimization
      const locationsMap = new Map<Identifier, Location>();
      for (const leg of legs) {
        const location = await getLocationForLeg(leg, patients, staff);
        if (location) {
          locationsMap.set(leg.id, location);
        }
      }

      // Optimize route order
      const optimized = await optimizeRoute(legs, locationsMap, {
        appointment_times_must_not_change: true,
      });

      draftRoutes.push({
        trip: draftTrip,
        legs: optimized.legs,
        conflicts,
        suggested_driver_name: `${driver.first_name} ${driver.last_name}`.trim(),
        confidence_score: 0.8, // Would be calculated based on suggestions
      });
    }
  }

  // Count split driver suggestions
  let splitDriverCount = 0;
  for (const appointment of sortedAppointments) {
    const splitSuggestion = detectSplitDriverNeeded(
      appointment,
      appointment.primary_staff_id ? staff.get(appointment.primary_staff_id) || null : null,
      sortedAppointments,
      drivers
    );
    if (splitSuggestion) {
      splitDriverCount++;
    }
  }

  return {
    draftRoutes,
    unassignedAppointments,
    suggestions: {
      total_appointments: unplannedAppointments.length,
      assigned_appointments: assignedAppointmentIds.size,
      unassigned_appointments: unassignedAppointments.length,
      split_driver_suggestions: splitDriverCount,
    },
  };
}

/**
 * Calculate pickup arrival time
 */
function calculatePickupArrivalTime(
  appointmentStart: Date,
  pickupLocation: LocationType,
  patient: Contact | null
): Date {
  // Estimate travel time from pickup location to patient
  // Simplified: assume 15 minutes travel time
  const travelTimeMinutes = 15;
  return addMinutes(appointmentStart, -travelTimeMinutes);
}

/**
 * Calculate return arrival time
 */
function calculateReturnArrivalTime(
  appointmentEnd: Date,
  returnLocation: LocationType,
  patient: Contact | null
): Date {
  // Estimate travel time from patient to return location
  // Simplified: assume 15 minutes travel time
  const travelTimeMinutes = 15;
  return addMinutes(appointmentEnd, travelTimeMinutes);
}

/**
 * Get location ID for location type
 */
function getLocationIdForType(
  locationType: LocationType,
  staffId?: Identifier
): Identifier {
  if (locationType === "patient") {
    return "" as Identifier; // Will be set from appointment
  }
  // For office/metro/home, use a constant ID or staff ID
  return (staffId || "default") as Identifier;
}

/**
 * Get location for a leg
 */
async function getLocationForLeg(
  leg: TripLeg,
  patients: Map<Identifier, Contact>,
  staff: Map<Identifier, Staff>
): Promise<Location | null> {
  return getLocationByType(
    leg.location_type,
    leg.location_type === "patient" && leg.location_id
      ? patients.get(leg.location_id) || undefined
      : undefined,
    leg.staff_id ? staff.get(leg.staff_id) || undefined : undefined
  );
}

