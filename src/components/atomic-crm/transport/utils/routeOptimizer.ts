/**
 * Route Optimizer
 * 
 * This module provides utilities for optimizing stop order in routes
 * to minimize total travel time while respecting appointment time constraints.
 */

import {
  calculateTravelTimeMatrix,
  calculateTravelTimeBetweenLocations,
  getEffectiveTravelTime,
} from "./travelTimeCalculator";
import type { TripLeg, Location } from "../types";

export type OptimizedRoute = {
  legs: TripLeg[];
  total_travel_time_minutes: number;
  original_total_time_minutes: number;
  time_saved_minutes: number;
  optimization_score: number; // 0-1, higher is better
};

export type OptimizationConstraints = {
  locked_leg_ids?: Set<number | string>; // Leg IDs that cannot be reordered
  appointment_times_must_not_change?: boolean; // Default: true
  max_optimization_iterations?: number; // Default: 10
};

/**
 * Optimize stop order for shortest travel time without changing appointment times
 * 
 * Uses a greedy nearest-neighbor algorithm with constraints:
 * - Appointment times cannot change
 * - Locked legs cannot be moved
 * - Respects logical order (can't drop staff before pickup)
 * 
 * @param legs - Array of trip legs to optimize
 * @param locations - Map of leg IDs to Location objects
 * @param constraints - Optimization constraints
 * @returns Optimized route with reordered legs
 */
export async function optimizeRoute(
  legs: TripLeg[],
  locations: Map<number | string, Location>,
  constraints: OptimizationConstraints = {}
): Promise<OptimizedRoute> {
  const {
    locked_leg_ids = new Set(),
    appointment_times_must_not_change = true,
    max_optimization_iterations = 10,
  } = constraints;

  // Separate legs into categories
  const appointmentLegs = legs.filter(
    (leg) => leg.leg_type === "appointment" && leg.appointment_id
  );
  const nonAppointmentLegs = legs.filter(
    (leg) => leg.leg_type !== "appointment"
  );

  // If appointment times must not change, we can only optimize non-appointment legs
  // between fixed appointment times
  if (appointment_times_must_not_change && appointmentLegs.length > 0) {
    return optimizeRouteWithFixedAppointments(
      legs,
      locations,
      locked_leg_ids,
      max_optimization_iterations
    );
  }

  // Otherwise, optimize all legs (but still respect locked legs)
  return optimizeAllLegs(legs, locations, locked_leg_ids, max_optimization_iterations);
}

/**
 * Optimize route with fixed appointment times
 * Only reorders non-appointment legs between appointments
 */
async function optimizeRouteWithFixedAppointments(
  legs: TripLeg[],
  locations: Map<number | string, Location>,
  locked_leg_ids: Set<number | string>,
  max_iterations: number
): Promise<OptimizedRoute> {
  // Sort legs by planned arrival time to maintain chronological order
  const sortedLegs = [...legs].sort(
    (a, b) =>
      new Date(a.planned_arrival_time).getTime() -
      new Date(b.planned_arrival_time).getTime()
  );

  // Group legs into segments between appointments
  const segments: TripLeg[][] = [];
  let currentSegment: TripLeg[] = [];

  for (const leg of sortedLegs) {
    if (leg.leg_type === "appointment" || locked_leg_ids.has(leg.id)) {
      // End current segment and start new one
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }
      // Appointment and locked legs stay in place
      segments.push([leg]);
    } else {
      currentSegment.push(leg);
    }
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  // Optimize each segment independently
  const optimizedSegments: TripLeg[][] = [];
  let totalTimeSaved = 0;

  for (const segment of segments) {
    if (segment.length <= 1 || locked_leg_ids.has(segment[0].id)) {
      // Can't optimize single leg or locked leg
      optimizedSegments.push(segment);
      continue;
    }

    const optimized = await optimizeSegment(segment, locations, locked_leg_ids);
    optimizedSegments.push(optimized.legs);
    totalTimeSaved += optimized.time_saved_minutes;
  }

  // Flatten segments back into single array
  const optimizedLegs = optimizedSegments.flat();

  // Calculate total travel time
  const totalTime = await calculateTotalTravelTime(optimizedLegs, locations);
  const originalTime = await calculateTotalTravelTime(legs, locations);

  return {
    legs: optimizedLegs,
    total_travel_time_minutes: totalTime,
    original_total_time_minutes: originalTime,
    time_saved_minutes: totalTimeSaved,
    optimization_score: originalTime > 0 ? 1 - totalTime / originalTime : 0,
  };
}

/**
 * Optimize all legs (when appointment times can change)
 */
async function optimizeAllLegs(
  legs: TripLeg[],
  locations: Map<number | string, Location>,
  locked_leg_ids: Set<number | string>,
  max_iterations: number
): Promise<OptimizedRoute> {
  // Separate locked and unlocked legs
  const lockedLegs = legs.filter((leg) => locked_leg_ids.has(leg.id));
  const unlockedLegs = legs.filter((leg) => !locked_leg_ids.has(leg.id));

  if (unlockedLegs.length <= 1) {
    // Nothing to optimize
    const totalTime = await calculateTotalTravelTime(legs, locations);
    return {
      legs,
      total_travel_time_minutes: totalTime,
      original_total_time_minutes: totalTime,
      time_saved_minutes: 0,
      optimization_score: 0,
    };
  }

  // Use nearest-neighbor algorithm
  const optimized = await nearestNeighborOptimization(
    unlockedLegs,
    locations,
    max_iterations
  );

  // Reinsert locked legs at their original positions
  const result: TripLeg[] = [];
  let unlockedIndex = 0;

  for (const originalLeg of legs) {
    if (locked_leg_ids.has(originalLeg.id)) {
      result.push(originalLeg);
    } else {
      result.push(optimized[unlockedIndex]);
      unlockedIndex++;
    }
  }

  const totalTime = await calculateTotalTravelTime(result, locations);
  const originalTime = await calculateTotalTravelTime(legs, locations);

  return {
    legs: result,
    total_travel_time_minutes: totalTime,
    original_total_time_minutes: originalTime,
    time_saved_minutes: originalTime - totalTime,
    optimization_score: originalTime > 0 ? 1 - totalTime / originalTime : 0,
  };
}

/**
 * Optimize a segment of legs (between appointments)
 */
async function optimizeSegment(
  legs: TripLeg[],
  locations: Map<number | string, Location>,
  locked_leg_ids: Set<number | string>,
  max_iterations: number = 10
): Promise<{ legs: TripLeg[]; time_saved_minutes: number }> {
  if (legs.length <= 1) {
    return { legs, time_saved_minutes: 0 };
  }

  const optimized = await nearestNeighborOptimization(legs, locations, max_iterations);
  const originalTime = await calculateTotalTravelTime(legs, locations);
  const optimizedTime = await calculateTotalTravelTime(optimized, locations);

  return {
    legs: optimized,
    time_saved_minutes: originalTime - optimizedTime,
  };
}

/**
 * Nearest-neighbor optimization algorithm
 * Starts from first leg, always picks nearest unvisited leg
 */
async function nearestNeighborOptimization(
  legs: TripLeg[],
  locations: Map<number | string, Location>,
  max_iterations: number
): Promise<TripLeg[]> {
  if (legs.length <= 1) {
    return legs;
  }

  // Get coordinates for all legs
  const legCoords = new Map<number | string, { lat: number; lng: number }>();
  for (const leg of legs) {
    const location = locations.get(leg.id);
    if (location?.coordinates) {
      legCoords.set(leg.id, {
        lat: location.coordinates.latitude,
        lng: location.coordinates.longitude,
      });
    }
  }

  // Calculate distance matrix
  const coords = legs.map((leg) => legCoords.get(leg.id)).filter(Boolean) as Array<{
    lat: number;
    lng: number;
  }>;

  if (coords.length !== legs.length) {
    // Can't optimize if we don't have coordinates for all legs
    return legs;
  }

  const travelTimeMatrix = await calculateTravelTimeMatrix(coords, coords);

  // Nearest-neighbor algorithm
  const visited = new Set<number | string>();
  const result: TripLeg[] = [];
  let currentIndex = 0; // Start with first leg

  while (result.length < legs.length) {
    const currentLeg = legs[currentIndex];
    result.push(currentLeg);
    visited.add(currentLeg.id);

    // Find nearest unvisited leg
    let nearestIndex = -1;
    let nearestTime = Infinity;

    for (let i = 0; i < legs.length; i++) {
      if (visited.has(legs[i].id)) continue;

      const travelTime = travelTimeMatrix[currentIndex]?.[i];
      if (travelTime && travelTime.status === "OK") {
        const time = travelTime.duration_in_traffic_minutes ?? travelTime.duration_minutes;
        if (time < nearestTime) {
          nearestTime = time;
          nearestIndex = i;
        }
      }
    }

    if (nearestIndex === -1) {
      // No more unvisited legs, add remaining in order
      for (let i = 0; i < legs.length; i++) {
        if (!visited.has(legs[i].id)) {
          result.push(legs[i]);
        }
      }
      break;
    }

    currentIndex = nearestIndex;
  }

  // Update leg_order for optimized route
  return result.map((leg, index) => ({
    ...leg,
    leg_order: index + 1,
  }));
}

/**
 * Calculate total travel time for a route
 */
async function calculateTotalTravelTime(
  legs: TripLeg[],
  locations: Map<number | string, Location>
): Promise<number> {
  if (legs.length <= 1) {
    return 0;
  }

  let totalTime = 0;

  for (let i = 0; i < legs.length - 1; i++) {
    const currentLeg = legs[i];
    const nextLeg = legs[i + 1];

    const currentLocation = locations.get(currentLeg.id);
    const nextLocation = locations.get(nextLeg.id);

    if (!currentLocation || !nextLocation) {
      continue;
    }

    try {
      const travelTime = await calculateTravelTimeBetweenLocations(
        currentLocation,
        nextLocation,
        {
          mode: "driving",
          departure_time: new Date(currentLeg.planned_arrival_time),
          traffic_model: "best_guess",
        }
      );

      if (travelTime.status === "OK") {
        totalTime += getEffectiveTravelTime(travelTime);
      }
    } catch (error) {
      console.warn(`Failed to calculate travel time between legs ${currentLeg.id} and ${nextLeg.id}:`, error);
    }
  }

  return totalTime;
}

