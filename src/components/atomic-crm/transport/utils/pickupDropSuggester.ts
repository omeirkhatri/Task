/**
 * Pickup/Drop Suggester
 * 
 * Logic to suggest Office/Home/Metro for staff pickup/drop
 * based on proximity and 2-hour wait rule.
 */

import type { Identifier } from "ra-core";
import type { Appointment, Staff, Contact } from "../../types";
import type { PickupDropSuggestion, LocationType, Location } from "../types";
import { calculateHaversineDistance } from "./distanceCalculator";
import {
  extractContactCoordinates,
  getOfficeLocation,
  getMetroLocation,
  getStaffHomeLocation,
} from "./coordinateExtractor";
import type { OfficeLocation } from "@/hooks/useOfficeLocation";

/**
 * Suggest pickup and drop locations for staff
 * 
 * @param appointment - Appointment requiring staff pickup/drop
 * @param staff - Staff member to pick up/drop
 * @param patient - Patient/contact for the appointment
 * @param previousAppointmentEndTime - End time of previous appointment (if any)
 * @param nextAppointmentStartTime - Start time of next appointment (if any)
 * @param officeLocationOverride - Optional office location from settings (for accurate distance calculations)
 * @returns Pickup and drop location suggestions
 */
export async function suggestPickupDrop(
  appointment: Appointment,
  staff: Staff | null,
  patient: Contact | null,
  previousAppointmentEndTime?: Date | null,
  nextAppointmentStartTime?: Date | null,
  officeLocationOverride?: OfficeLocation | null
): Promise<PickupDropSuggestion | null> {
  if (!staff || !patient) return null;

  const appointmentStartTime = new Date(appointment.start_time);
  const appointmentEndTime = new Date(appointment.end_time);
  const patientLocation = extractContactCoordinates(patient);

  if (!patientLocation?.coordinates) {
    return null;
  }

  // Get available locations - use office location from settings if provided
  const officeLocation = getOfficeLocation(officeLocationOverride);
  const metroLocation = getMetroLocation();
  const homeLocation = getStaffHomeLocation(staff);

  // Suggest pickup location (before appointment)
  const pickupLocation = await suggestPickupLocation(
    officeLocation,
    homeLocation,
    metroLocation,
    patientLocation,
    appointmentStartTime,
    previousAppointmentEndTime
  );

  // Suggest drop location (after appointment)
  const dropLocation = await suggestDropLocation(
    officeLocation,
    homeLocation,
    metroLocation,
    patientLocation,
    appointmentEndTime,
    nextAppointmentStartTime
  );

  // Calculate time/distance savings
  const savings = await calculateSavings(
    pickupLocation,
    dropLocation,
    patientLocation,
    officeLocation
  );

  const reasoning = buildReasoning(
    pickupLocation,
    dropLocation,
    appointmentStartTime,
    appointmentEndTime,
    previousAppointmentEndTime,
    nextAppointmentStartTime
  );

  return {
    appointment_id: appointment.id,
    staff_id: staff.id,
    pickup_location: pickupLocation,
    drop_location: dropLocation,
    reasoning,
    time_saved_minutes: savings.timeSaved,
    distance_saved_km: savings.distanceSaved,
  };
}

/**
 * Suggest pickup location based on proximity and time
 */
async function suggestPickupLocation(
  office: Location,
  home: Location | null,
  metro: Location,
  patient: Location,
  appointmentTime: Date,
  previousAppointmentEndTime?: Date | null
): Promise<LocationType> {
  // If morning appointment (before 12 PM), prefer office
  const hour = appointmentTime.getHours();
  if (hour < 12) {
    return "office";
  }

  // If there's a previous appointment, check proximity
  if (previousAppointmentEndTime) {
    // If previous appointment ended recently, prefer staying near patient area
    const timeSincePrevious = (appointmentTime.getTime() - previousAppointmentEndTime.getTime()) / (60 * 1000);
    if (timeSincePrevious < 60) {
      // Recent appointment - prefer metro or home if closer
      if (home?.coordinates) {
        const homeDistance = calculateHaversineDistance(
          home.coordinates,
          patient.coordinates
        );
        const officeDistance = calculateHaversineDistance(
          office.coordinates,
          patient.coordinates
        );

        if (homeDistance < officeDistance) {
          return "home";
        }
      }
    }
  }

  // Default to office for pickup
  return "office";
}

/**
 * Suggest drop location based on proximity and wait time
 */
async function suggestDropLocation(
  office: Location,
  home: Location | null,
  metro: Location,
  patient: Location,
  appointmentEndTime: Date,
  nextAppointmentStartTime?: Date | null
): Promise<LocationType> {
  // If no next appointment, return to office
  if (!nextAppointmentStartTime) {
    return "office";
  }

  // Calculate wait time until next appointment
  const waitMinutes = (nextAppointmentStartTime.getTime() - appointmentEndTime.getTime()) / (60 * 1000);

  // If wait ≤ 2 hours AND no other jobs → suggest WAIT (return to office)
  // Otherwise → suggest LEAVE (metro or home if closer)
  if (waitMinutes <= 120) {
    // Short wait - return to office
    return "office";
  }

  // Long wait - suggest metro or home if closer to next appointment
  // For now, default to metro (could be enhanced to check next appointment location)
  if (home?.coordinates) {
    const homeDistance = calculateHaversineDistance(
      home.coordinates,
      patient.coordinates
    );
    const metroDistance = calculateHaversineDistance(
      metro.coordinates,
      patient.coordinates
    );

    if (homeDistance < metroDistance && homeDistance < 10) {
      // Home is closer and reasonable distance
      return "home";
    }
  }

  return "metro";
}

/**
 * Calculate time and distance savings
 */
async function calculateSavings(
  pickupLocation: LocationType,
  dropLocation: LocationType,
  patientLocation: Location,
  officeLocation: Location
): Promise<{ timeSaved: number; distanceSaved: number }> {
  // Simplified calculation - would use Google Maps in production
  let timeSaved = 0;
  let distanceSaved = 0;

  // If not using office for both, calculate savings
  if (pickupLocation !== "office" || dropLocation !== "office") {
    // Estimate savings (simplified)
    if (pickupLocation !== "office") {
      timeSaved += 5; // Estimate 5 minutes saved
      distanceSaved += 2; // Estimate 2km saved
    }
    if (dropLocation !== "office") {
      timeSaved += 5;
      distanceSaved += 2;
    }
  }

  return { timeSaved, distanceSaved };
}

/**
 * Build reasoning text for suggestion
 */
function buildReasoning(
  pickupLocation: LocationType,
  dropLocation: LocationType,
  appointmentStartTime: Date,
  appointmentEndTime: Date,
  previousAppointmentEndTime?: Date | null,
  nextAppointmentStartTime?: Date | null
): string {
  const reasons: string[] = [];

  if (pickupLocation === "office") {
    reasons.push("Pickup from office (standard)");
  } else if (pickupLocation === "home") {
    reasons.push("Pickup from home (closer to patient)");
  } else {
    reasons.push("Pickup from metro (convenient)");
  }

  if (dropLocation === "office") {
    if (nextAppointmentStartTime) {
      const waitMinutes = (nextAppointmentStartTime.getTime() - appointmentEndTime.getTime()) / (60 * 1000);
      if (waitMinutes <= 120) {
        reasons.push("Return to office (short wait ≤2 hours)");
      } else {
        reasons.push("Return to office");
      }
    } else {
      reasons.push("Return to office (end of day)");
    }
  } else if (dropLocation === "home") {
    reasons.push("Drop at home (long wait, closer to next appointment)");
  } else {
    reasons.push("Drop at metro (long wait, convenient)");
  }

  return reasons.join(". ");
}

/**
 * Determine if driver should WAIT or LEAVE after appointment
 * Rule: If wait ≤ 2 hours AND no other jobs → WAIT, otherwise → LEAVE
 */
export function suggestWaitVsLeave(
  appointmentEndTime: Date,
  nextAppointmentStartTime: Date | null,
  hasOtherJobs: boolean
): "wait" | "leave" {
  if (!nextAppointmentStartTime) {
    return "leave"; // No next appointment
  }

  const waitMinutes = (nextAppointmentStartTime.getTime() - appointmentEndTime.getTime()) / (60 * 1000);

  if (waitMinutes <= 120 && !hasOtherJobs) {
    return "wait";
  }

  return "leave";
}

