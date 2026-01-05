/**
 * Distance Calculator
 * 
 * This module provides utilities for calculating distances between locations
 * using the Google Maps Distance Matrix API.
 */

import { getDistanceMatrixWithRateLimit, type DistanceMatrixRequest } from "./googleMapsApi";
import type { Location } from "../types";

export type DistanceResult = {
  distance_meters: number;
  distance_km: number;
  status: "OK" | "NOT_FOUND" | "ZERO_RESULTS" | "MAX_ROUTE_LENGTH_EXCEEDED";
  origin_address?: string;
  destination_address?: string;
};

/**
 * Calculate distance between two locations
 * 
 * @param origin - Origin location (coordinates or address string)
 * @param destination - Destination location (coordinates or address string)
 * @param options - Optional parameters (mode, avoid, etc.)
 * @returns Distance result with meters and kilometers
 */
export async function calculateDistance(
  origin: { lat: number; lng: number } | string,
  destination: { lat: number; lng: number } | string,
  options?: {
    mode?: "driving" | "walking" | "bicycling" | "transit";
    avoid?: "tolls" | "highways" | "ferries" | "indoor";
    units?: "metric" | "imperial";
  }
): Promise<DistanceResult> {
  const request: DistanceMatrixRequest = {
    origins: [origin],
    destinations: [destination],
    mode: options?.mode || "driving",
    avoid: options?.avoid,
    units: options?.units || "metric",
  };
  
  try {
    const response = await getDistanceMatrixWithRateLimit(request);
    
    if (response.status !== "OK") {
      return {
        distance_meters: 0,
        distance_km: 0,
        status: response.status as DistanceResult["status"],
      };
    }
    
    const element = response.rows[0]?.elements[0];
    
    if (!element || element.status !== "OK") {
      return {
        distance_meters: 0,
        distance_km: 0,
        status: (element?.status || "NOT_FOUND") as DistanceResult["status"],
      };
    }
    
    const distance_meters = element.distance?.value || 0;
    const distance_km = distance_meters / 1000;
    
    return {
      distance_meters,
      distance_km,
      status: "OK",
      origin_address: response.origin_addresses[0],
      destination_address: response.destination_addresses[0],
    };
  } catch (error) {
    console.error("Error calculating distance:", error);
    throw error;
  }
}

/**
 * Calculate distances between multiple origins and destinations
 * 
 * @param origins - Array of origin locations
 * @param destinations - Array of destination locations
 * @param options - Optional parameters
 * @returns Matrix of distance results (origins x destinations)
 */
export async function calculateDistanceMatrix(
  origins: Array<{ lat: number; lng: number } | string>,
  destinations: Array<{ lat: number; lng: number } | string>,
  options?: {
    mode?: "driving" | "walking" | "bicycling" | "transit";
    avoid?: "tolls" | "highways" | "ferries" | "indoor";
    units?: "metric" | "imperial";
  }
): Promise<DistanceResult[][]> {
  const request: DistanceMatrixRequest = {
    origins,
    destinations,
    mode: options?.mode || "driving",
    avoid: options?.avoid,
    units: options?.units || "metric",
  };
  
  try {
    const response = await getDistanceMatrixWithRateLimit(request);
    
    if (response.status !== "OK") {
      // Return empty matrix on error
      return origins.map(() => 
        destinations.map(() => ({
          distance_meters: 0,
          distance_km: 0,
          status: response.status as DistanceResult["status"],
        }))
      );
    }
    
    return response.rows.map((row, originIndex) =>
      row.elements.map((element, destIndex) => {
        if (element.status !== "OK") {
          return {
            distance_meters: 0,
            distance_km: 0,
            status: element.status as DistanceResult["status"],
            origin_address: response.origin_addresses[originIndex],
            destination_address: response.destination_addresses[destIndex],
          };
        }
        
        const distance_meters = element.distance?.value || 0;
        const distance_km = distance_meters / 1000;
        
        return {
          distance_meters,
          distance_km,
          status: "OK" as const,
          origin_address: response.origin_addresses[originIndex],
          destination_address: response.destination_addresses[destIndex],
        };
      })
    );
  } catch (error) {
    console.error("Error calculating distance matrix:", error);
    throw error;
  }
}

/**
 * Calculate distance between two Location objects
 * 
 * @param origin - Origin location
 * @param destination - Destination location
 * @param options - Optional parameters
 * @returns Distance result
 */
export async function calculateDistanceBetweenLocations(
  origin: Location,
  destination: Location,
  options?: {
    mode?: "driving" | "walking" | "bicycling" | "transit";
    avoid?: "tolls" | "highways" | "ferries" | "indoor";
  }
): Promise<DistanceResult> {
  // Extract coordinates from Location objects
  const originCoords = origin.coordinates
    ? { lat: origin.coordinates.latitude, lng: origin.coordinates.longitude }
    : origin.address || "";
  
  const destCoords = destination.coordinates
    ? { lat: destination.coordinates.latitude, lng: destination.coordinates.longitude }
    : destination.address || "";
  
  if (!originCoords || !destCoords) {
    throw new Error("Both origin and destination must have coordinates or address");
  }
  
  return calculateDistance(originCoords, destCoords, options);
}

/**
 * Calculate straight-line (Haversine) distance between two coordinates
 * This is a fast approximation that doesn't require API calls
 * 
 * @param origin - Origin coordinates
 * @param destination - Destination coordinates
 * @returns Distance in kilometers
 */
export function calculateHaversineDistance(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(destination.lat - origin.lat);
  const dLon = toRadians(destination.lng - origin.lng);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(origin.lat)) *
      Math.cos(toRadians(destination.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

