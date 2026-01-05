/**
 * Batch Calculator
 * 
 * This module provides utilities for batch calculation of distances and travel times
 * for multiple waypoints to minimize API calls and improve performance.
 */

import {
  calculateDistanceMatrix,
  type DistanceResult,
} from "./distanceCalculator";
import {
  calculateTravelTimeMatrix,
  type TravelTimeResult,
} from "./travelTimeCalculator";
import type { Location } from "../types";

export type WaypointSequence = Array<{
  id: string | number;
  location: { lat: number; lng: number } | string;
  metadata?: Record<string, any>;
}>;

export type BatchDistanceResult = {
  waypoint_id: string | number;
  distance_meters: number;
  distance_km: number;
  status: DistanceResult["status"];
  metadata?: Record<string, any>;
};

export type BatchTravelTimeResult = {
  waypoint_id: string | number;
  duration_minutes: number;
  duration_in_traffic_minutes?: number;
  status: TravelTimeResult["status"];
  metadata?: Record<string, any>;
};

/**
 * Calculate distances between consecutive waypoints in a sequence
 * Uses a single API call to get all distances efficiently
 * 
 * @param waypoints - Sequence of waypoints
 * @param options - Optional parameters
 * @returns Array of distance results between consecutive waypoints
 */
export async function calculateWaypointSequenceDistances(
  waypoints: WaypointSequence,
  options?: {
    mode?: "driving" | "walking" | "bicycling" | "transit";
    avoid?: "tolls" | "highways" | "ferries" | "indoor";
    units?: "metric" | "imperial";
  }
): Promise<BatchDistanceResult[]> {
  if (waypoints.length < 2) {
    return [];
  }

  // Extract origins (all waypoints except last)
  const origins = waypoints.slice(0, -1).map((wp) => wp.location);
  
  // Extract destinations (all waypoints except first)
  const destinations = waypoints.slice(1).map((wp) => wp.location);

  // Calculate distance matrix
  const distanceMatrix = await calculateDistanceMatrix(
    origins,
    destinations,
    options
  );

  // Map results to waypoint pairs
  const results: BatchDistanceResult[] = [];

  for (let i = 0; i < distanceMatrix.length; i++) {
    const originWaypoint = waypoints[i];
    const destinationWaypoint = waypoints[i + 1];
    const distanceResult = distanceMatrix[i]?.[0]; // Only one destination per origin

    if (distanceResult) {
      results.push({
        waypoint_id: destinationWaypoint.id,
        distance_meters: distanceResult.distance_meters,
        distance_km: distanceResult.distance_km,
        status: distanceResult.status,
        metadata: {
          ...originWaypoint.metadata,
          ...destinationWaypoint.metadata,
          from_waypoint_id: originWaypoint.id,
          to_waypoint_id: destinationWaypoint.id,
        },
      });
    }
  }

  return results;
}

/**
 * Calculate travel times between consecutive waypoints in a sequence
 * Uses a single API call to get all travel times efficiently
 * 
 * @param waypoints - Sequence of waypoints
 * @param options - Optional parameters including departure times
 * @returns Array of travel time results between consecutive waypoints
 */
export async function calculateWaypointSequenceTravelTimes(
  waypoints: WaypointSequence,
  options?: {
    mode?: "driving" | "walking" | "bicycling" | "transit";
    departure_time?: Date | "now";
    traffic_model?: "best_guess" | "pessimistic" | "optimistic";
    avoid?: "tolls" | "highways" | "ferries" | "indoor";
  }
): Promise<BatchTravelTimeResult[]> {
  if (waypoints.length < 2) {
    return [];
  }

  // Extract origins (all waypoints except last)
  const origins = waypoints.slice(0, -1).map((wp) => wp.location);
  
  // Extract destinations (all waypoints except first)
  const destinations = waypoints.slice(1).map((wp) => wp.location);

  // Calculate travel time matrix
  const travelTimeMatrix = await calculateTravelTimeMatrix(
    origins,
    destinations,
    options
  );

  // Map results to waypoint pairs
  const results: BatchTravelTimeResult[] = [];

  for (let i = 0; i < travelTimeMatrix.length; i++) {
    const originWaypoint = waypoints[i];
    const destinationWaypoint = waypoints[i + 1];
    const travelTimeResult = travelTimeMatrix[i]?.[0]; // Only one destination per origin

    if (travelTimeResult) {
      results.push({
        waypoint_id: destinationWaypoint.id,
        duration_minutes: travelTimeResult.duration_minutes,
        duration_in_traffic_minutes: travelTimeResult.duration_in_traffic_minutes,
        status: travelTimeResult.status,
        metadata: {
          ...originWaypoint.metadata,
          ...destinationWaypoint.metadata,
          from_waypoint_id: originWaypoint.id,
          to_waypoint_id: destinationWaypoint.id,
        },
      });
    }
  }

  return results;
}

/**
 * Calculate both distances and travel times for a waypoint sequence
 * Uses two API calls (one for distances, one for travel times)
 * 
 * @param waypoints - Sequence of waypoints
 * @param options - Optional parameters
 * @returns Combined results with both distance and travel time
 */
export async function calculateWaypointSequenceComplete(
  waypoints: WaypointSequence,
  options?: {
    mode?: "driving" | "walking" | "bicycling" | "transit";
    departure_time?: Date | "now";
    traffic_model?: "best_guess" | "pessimistic" | "optimistic";
    avoid?: "tolls" | "highways" | "ferries" | "indoor";
    units?: "metric" | "imperial";
  }
): Promise<Array<BatchDistanceResult & BatchTravelTimeResult>> {
  const [distances, travelTimes] = await Promise.all([
    calculateWaypointSequenceDistances(waypoints, options),
    calculateWaypointSequenceTravelTimes(waypoints, options),
  ]);

  // Merge results by waypoint_id
  const resultsMap = new Map<string | number, BatchDistanceResult & BatchTravelTimeResult>();

  for (const distance of distances) {
    resultsMap.set(distance.waypoint_id, {
      ...distance,
      duration_minutes: 0,
      status: distance.status as TravelTimeResult["status"],
    });
  }

  for (const travelTime of travelTimes) {
    const existing = resultsMap.get(travelTime.waypoint_id);
    if (existing) {
      Object.assign(existing, travelTime);
    } else {
      resultsMap.set(travelTime.waypoint_id, {
        waypoint_id: travelTime.waypoint_id,
        distance_meters: 0,
        distance_km: 0,
        ...travelTime,
        status: travelTime.status,
      });
    }
  }

  return Array.from(resultsMap.values());
}

/**
 * Calculate total distance for a waypoint sequence
 * 
 * @param waypoints - Sequence of waypoints
 * @param options - Optional parameters
 * @returns Total distance in kilometers
 */
export async function calculateTotalDistance(
  waypoints: WaypointSequence,
  options?: {
    mode?: "driving" | "walking" | "bicycling" | "transit";
    avoid?: "tolls" | "highways" | "ferries" | "indoor";
    units?: "metric" | "imperial";
  }
): Promise<number> {
  const results = await calculateWaypointSequenceDistances(waypoints, options);
  return results.reduce((total, result) => {
    if (result.status === "OK") {
      return total + result.distance_km;
    }
    return total;
  }, 0);
}

/**
 * Calculate total travel time for a waypoint sequence
 * 
 * @param waypoints - Sequence of waypoints
 * @param options - Optional parameters
 * @returns Total travel time in minutes
 */
export async function calculateTotalTravelTime(
  waypoints: WaypointSequence,
  options?: {
    mode?: "driving" | "walking" | "bicycling" | "transit";
    departure_time?: Date | "now";
    traffic_model?: "best_guess" | "pessimistic" | "optimistic";
    avoid?: "tolls" | "highways" | "ferries" | "indoor";
  }
): Promise<number> {
  const results = await calculateWaypointSequenceTravelTimes(waypoints, options);
  return results.reduce((total, result) => {
    if (result.status === "OK") {
      return total + (result.duration_in_traffic_minutes ?? result.duration_minutes);
    }
    return total;
  }, 0);
}

