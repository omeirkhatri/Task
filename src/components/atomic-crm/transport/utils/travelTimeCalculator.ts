/**
 * Travel Time Calculator
 * 
 * This module provides utilities for calculating travel times between locations
 * with traffic awareness using the Google Maps Distance Matrix API.
 */

import { getDistanceMatrixWithRateLimit, type DistanceMatrixRequest } from "./googleMapsApi";
import { calculateHaversineDistance } from "./distanceCalculator";
import type { Location } from "../types";

export type TravelTimeResult = {
  duration_seconds: number;
  duration_minutes: number;
  duration_in_traffic_seconds?: number;
  duration_in_traffic_minutes?: number;
  status: "OK" | "NOT_FOUND" | "ZERO_RESULTS" | "MAX_ROUTE_LENGTH_EXCEEDED";
  origin_address?: string;
  destination_address?: string;
  has_traffic_data: boolean;
};

/**
 * Calculate travel time between two locations with traffic awareness
 * 
 * @param origin - Origin location (coordinates or address string)
 * @param destination - Destination location (coordinates or address string)
 * @param options - Optional parameters including departure time and traffic model
 * @returns Travel time result with base duration and traffic-aware duration
 */
// Track if Google Maps API is available (set to false on first failure)
let googleMapsApiAvailable: boolean | null = null;

export async function calculateTravelTime(
  origin: { lat: number; lng: number } | string,
  destination: { lat: number; lng: number } | string,
  options?: {
    mode?: "driving" | "walking" | "bicycling" | "transit";
    departure_time?: Date | "now";
    traffic_model?: "best_guess" | "pessimistic" | "optimistic";
    avoid?: "tolls" | "highways" | "ferries" | "indoor";
  }
): Promise<TravelTimeResult> {
  // If API is known to be unavailable, skip directly to fallback
  if (googleMapsApiAvailable === false) {
    return calculateTravelTimeFallback(origin, destination);
  }

  const request: DistanceMatrixRequest = {
    origins: [origin],
    destinations: [destination],
    mode: options?.mode || "driving",
    departure_time: options?.departure_time || "now",
    traffic_model: options?.traffic_model || "best_guess",
    avoid: options?.avoid,
  };
  
  try {
    const response = await getDistanceMatrixWithRateLimit(request);
    
    if (response.status !== "OK") {
      return {
        duration_seconds: 0,
        duration_minutes: 0,
        status: response.status as TravelTimeResult["status"],
        has_traffic_data: false,
      };
    }
    
    const element = response.rows[0]?.elements[0];
    
    if (!element || element.status !== "OK") {
      return {
        duration_seconds: 0,
        duration_minutes: 0,
        status: (element?.status || "NOT_FOUND") as TravelTimeResult["status"],
        has_traffic_data: false,
      };
    }
    
    const duration_seconds = element.duration?.value || 0;
    const duration_minutes = duration_seconds / 60;
    
    const duration_in_traffic_seconds = element.duration_in_traffic?.value;
    const duration_in_traffic_minutes = duration_in_traffic_seconds
      ? duration_in_traffic_seconds / 60
      : undefined;
    
    return {
      duration_seconds,
      duration_minutes,
      duration_in_traffic_seconds,
      duration_in_traffic_minutes,
      status: "OK",
      origin_address: response.origin_addresses[0],
      destination_address: response.destination_addresses[0],
      has_traffic_data: !!duration_in_traffic_seconds,
    };
  } catch (error) {
    // Mark API as unavailable on first failure
    if (googleMapsApiAvailable === null) {
      console.warn("Google Maps API unavailable, using fallback for all calculations");
      googleMapsApiAvailable = false;
    }
    
    // Use fallback immediately
    return calculateTravelTimeFallback(origin, destination);
  }
}

/**
 * Fallback travel time calculation using haversine distance
 */
function calculateTravelTimeFallback(
  origin: { lat: number; lng: number } | string,
  destination: { lat: number; lng: number } | string
): TravelTimeResult {
  try {
    const originCoords = typeof origin === "string" ? null : origin;
    const destCoords = typeof destination === "string" ? null : destination;
    
    if (originCoords && destCoords) {
      // Calculate distance using haversine formula
      const distanceKm = calculateHaversineDistance(originCoords, destCoords);
      
      // Estimate travel time: ~2 minutes per km for city driving (average speed ~30 km/h)
      // Add 10 minutes base time for city traffic, stops, etc.
      const estimatedMinutes = Math.max(5, Math.round(distanceKm * 2 + 10));
      const estimatedSeconds = estimatedMinutes * 60;
      
      return {
        duration_seconds: estimatedSeconds,
        duration_minutes: estimatedMinutes,
        duration_in_traffic_seconds: estimatedSeconds,
        duration_in_traffic_minutes: estimatedMinutes,
        status: "OK",
        has_traffic_data: false,
      };
    }
  } catch (fallbackError) {
    console.warn("Fallback calculation failed:", fallbackError);
  }
  
  // Default estimate if calculation fails
  return {
    duration_seconds: 30 * 60,
    duration_minutes: 30,
    status: "OK",
    has_traffic_data: false,
  };
}

/**
 * Calculate travel times between multiple origins and destinations
 * 
 * @param origins - Array of origin locations
 * @param destinations - Array of destination locations
 * @param options - Optional parameters
 * @returns Matrix of travel time results (origins x destinations)
 */
export async function calculateTravelTimeMatrix(
  origins: Array<{ lat: number; lng: number } | string>,
  destinations: Array<{ lat: number; lng: number } | string>,
  options?: {
    mode?: "driving" | "walking" | "bicycling" | "transit";
    departure_time?: Date | "now";
    traffic_model?: "best_guess" | "pessimistic" | "optimistic";
    avoid?: "tolls" | "highways" | "ferries" | "indoor";
  }
): Promise<TravelTimeResult[][]> {
  const request: DistanceMatrixRequest = {
    origins,
    destinations,
    mode: options?.mode || "driving",
    departure_time: options?.departure_time || "now",
    traffic_model: options?.traffic_model || "best_guess",
    avoid: options?.avoid,
  };
  
  try {
    const response = await getDistanceMatrixWithRateLimit(request);
    
    if (response.status !== "OK") {
      // Return empty matrix on error
      return origins.map(() =>
        destinations.map(() => ({
          duration_seconds: 0,
          duration_minutes: 0,
          status: response.status as TravelTimeResult["status"],
          has_traffic_data: false,
        }))
      );
    }
    
    return response.rows.map((row, originIndex) =>
      row.elements.map((element, destIndex) => {
        if (element.status !== "OK") {
          return {
            duration_seconds: 0,
            duration_minutes: 0,
            status: element.status as TravelTimeResult["status"],
            origin_address: response.origin_addresses[originIndex],
            destination_address: response.destination_addresses[destIndex],
            has_traffic_data: false,
          };
        }
        
        const duration_seconds = element.duration?.value || 0;
        const duration_minutes = duration_seconds / 60;
        
        const duration_in_traffic_seconds = element.duration_in_traffic?.value;
        const duration_in_traffic_minutes = duration_in_traffic_seconds
          ? duration_in_traffic_seconds / 60
          : undefined;
        
        return {
          duration_seconds,
          duration_minutes,
          duration_in_traffic_seconds,
          duration_in_traffic_minutes,
          status: "OK" as const,
          origin_address: response.origin_addresses[originIndex],
          destination_address: response.destination_addresses[destIndex],
          has_traffic_data: !!duration_in_traffic_seconds,
        };
      })
    );
  } catch (error) {
    // Mark API as unavailable on first failure
    if (googleMapsApiAvailable === null) {
      console.warn("Google Maps API unavailable, using fallback for all calculations");
      googleMapsApiAvailable = false;
    }
    
    // Fallback: Use haversine distance for each origin-destination pair
    return origins.map((origin) =>
      destinations.map((destination) => {
        const result = calculateTravelTimeFallback(origin, destination);
        return {
          ...result,
          status: "OK" as const,
        };
      })
    );
  }
}

/**
 * Calculate travel time between two Location objects
 * 
 * @param origin - Origin location
 * @param destination - Destination location
 * @param options - Optional parameters
 * @returns Travel time result
 */
export async function calculateTravelTimeBetweenLocations(
  origin: Location,
  destination: Location,
  options?: {
    mode?: "driving" | "walking" | "bicycling" | "transit";
    departure_time?: Date | "now";
    traffic_model?: "best_guess" | "pessimistic" | "optimistic";
    avoid?: "tolls" | "highways" | "ferries" | "indoor";
  }
): Promise<TravelTimeResult> {
  // Extract coordinates from Location objects
  const originCoords = origin.coordinates
    ? { lat: origin.coordinates.latitude, lng: origin.coordinates.longitude }
    : origin.address || "";
  
  const destCoords = destination.coordinates
    ? { lat: destination.coordinates.latitude, lng: destination.coordinates.longitude }
    : destination.address || "";
  
  if (!originCoords || !destCoords) {
    // If no coordinates, use fallback estimate
    console.warn("No coordinates available, using default travel time estimate");
    return {
      duration_seconds: 30 * 60,
      duration_minutes: 30,
      status: "OK",
      has_traffic_data: false,
    };
  }
  
  return calculateTravelTime(originCoords, destCoords, options);
}

/**
 * Get the effective travel time (uses traffic data if available, otherwise base duration)
 * 
 * @param result - Travel time result
 * @returns Effective travel time in minutes
 */
export function getEffectiveTravelTime(result: TravelTimeResult): number {
  return result.duration_in_traffic_minutes ?? result.duration_minutes;
}

/**
 * Check if travel time result indicates a feasible route
 * 
 * @param result - Travel time result
 * @returns True if route is feasible
 */
export function isRouteFeasible(result: TravelTimeResult): boolean {
  return result.status === "OK" && result.duration_minutes > 0;
}

/**
 * Calculate ETA (Estimated Time of Arrival) based on current time and travel time
 * 
 * @param departureTime - When the trip starts (Date object or "now")
 * @param travelTimeMinutes - Travel time in minutes (from calculateTravelTime)
 * @returns ETA as Date object
 */
export function calculateETA(
  departureTime: Date | "now",
  travelTimeMinutes: number
): Date {
  const now = new Date();
  const departure = departureTime === "now" ? now : departureTime;
  const eta = new Date(departure.getTime() + travelTimeMinutes * 60 * 1000);
  return eta;
}

/**
 * Calculate ETA with traffic awareness
 * Uses traffic data if available, otherwise falls back to base duration
 * 
 * @param departureTime - When the trip starts
 * @param travelTimeResult - Travel time result from calculateTravelTime
 * @returns ETA as Date object
 */
export function calculateETAWithTraffic(
  departureTime: Date | "now",
  travelTimeResult: TravelTimeResult
): Date {
  const effectiveTravelTime = getEffectiveTravelTime(travelTimeResult);
  return calculateETA(departureTime, effectiveTravelTime);
}

/**
 * Recalculate ETA dynamically based on current time and updated travel time
 * Useful for real-time updates when driver status changes
 * 
 * @param originalDepartureTime - Original planned departure time
 * @param currentTime - Current time (defaults to now)
 * @param updatedTravelTimeMinutes - Updated travel time in minutes
 * @returns Updated ETA as Date object
 */
export function recalculateETA(
  originalDepartureTime: Date,
  updatedTravelTimeMinutes: number,
  currentTime: Date = new Date()
): Date {
  // If we're past the original departure time, calculate from now
  const effectiveDepartureTime = currentTime > originalDepartureTime 
    ? currentTime 
    : originalDepartureTime;
  
  return calculateETA(effectiveDepartureTime, updatedTravelTimeMinutes);
}

/**
 * Get time remaining until ETA
 * 
 * @param eta - Estimated time of arrival
 * @param currentTime - Current time (defaults to now)
 * @returns Time remaining in minutes (negative if ETA has passed)
 */
export function getTimeRemainingUntilETA(
  eta: Date,
  currentTime: Date = new Date()
): number {
  const diffMs = eta.getTime() - currentTime.getTime();
  return diffMs / (60 * 1000); // Convert to minutes
}

/**
 * Check if ETA is still valid (not too far in the past)
 * 
 * @param eta - Estimated time of arrival
 * @param currentTime - Current time (defaults to now)
 * @param maxAgeMinutes - Maximum age in minutes before ETA is considered stale (default: 30)
 * @returns True if ETA is still valid
 */
export function isETAValid(
  eta: Date,
  currentTime: Date = new Date(),
  maxAgeMinutes: number = 30
): boolean {
  const timeRemaining = getTimeRemainingUntilETA(eta, currentTime);
  // ETA is valid if it's in the future or within maxAgeMinutes in the past
  return timeRemaining >= -maxAgeMinutes;
}

