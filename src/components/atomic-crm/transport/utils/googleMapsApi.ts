/**
 * Google Maps API Wrapper
 * 
 * This module provides utilities for interacting with Google Maps APIs:
 * - Distance Matrix API: Calculate distances and travel times between multiple origins and destinations
 * - Directions API: Get detailed route information with turn-by-turn directions
 * 
 * Both APIs are REST-based and require an API key.
 */

export type DistanceMatrixRequest = {
  origins: Array<{ lat: number; lng: number } | string>;
  destinations: Array<{ lat: number; lng: number } | string>;
  mode?: "driving" | "walking" | "bicycling" | "transit";
  departure_time?: Date | "now";
  traffic_model?: "best_guess" | "pessimistic" | "optimistic";
  avoid?: "tolls" | "highways" | "ferries" | "indoor";
  units?: "metric" | "imperial";
  region?: string;
};

export type DistanceMatrixResponse = {
  status: string;
  origin_addresses: string[];
  destination_addresses: string[];
  rows: Array<{
    elements: Array<{
      status: string;
      distance?: {
        value: number; // in meters
        text: string;
      };
      duration?: {
        value: number; // in seconds
        text: string;
      };
      duration_in_traffic?: {
        value: number; // in seconds
        text: string;
      };
    }>;
  }>;
};

export type DirectionsRequest = {
  origin: { lat: number; lng: number } | string;
  destination: { lat: number; lng: number } | string;
  waypoints?: Array<{ lat: number; lng: number } | string>;
  mode?: "driving" | "walking" | "bicycling" | "transit";
  departure_time?: Date | "now";
  traffic_model?: "best_guess" | "pessimistic" | "optimistic";
  avoid?: "tolls" | "highways" | "ferries" | "indoor";
  optimize_waypoints?: boolean;
  alternatives?: boolean;
};

export type DirectionsResponse = {
  status: string;
  routes: Array<{
    bounds: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
    legs: Array<{
      distance: { value: number; text: string };
      duration: { value: number; text: string };
      duration_in_traffic?: { value: number; text: string };
      start_address: string;
      end_address: string;
      start_location: { lat: number; lng: number };
      end_location: { lat: number; lng: number };
      steps: Array<{
        distance: { value: number; text: string };
        duration: { value: number; text: string };
        start_location: { lat: number; lng: number };
        end_location: { lat: number; lng: number };
        html_instructions: string;
        travel_mode: string;
      }>;
    }>;
    overview_polyline: {
      points: string; // Encoded polyline
    };
    summary: string;
    warnings: string[];
    waypoint_order?: number[];
  }>;
  geocoded_waypoints?: Array<{
    geocoder_status: string;
    place_id: string;
    types: string[];
  }>;
};

export type ApiError = {
  status: string;
  error_message?: string;
  code?: number;
};

/**
 * Get Google Maps API key from environment variables
 */
function getApiKey(): string {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Google Maps API key not found. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file"
    );
  }
  return apiKey;
}

/**
 * Format coordinates for API request
 */
function formatCoordinates(coords: { lat: number; lng: number } | string): string {
  if (typeof coords === "string") {
    return coords;
  }
  return `${coords.lat},${coords.lng}`;
}

/**
 * Format departure time for API request
 */
function formatDepartureTime(departureTime?: Date | "now"): string | undefined {
  if (!departureTime) return undefined;
  if (departureTime === "now") return "now";
  return Math.floor(departureTime.getTime() / 1000).toString();
}

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryableStatuses: ["OVER_QUERY_LIMIT", "REQUEST_DENIED", "UNKNOWN_ERROR"],
};

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
function isRetryableError(status: string): boolean {
  return RETRY_CONFIG.retryableStatuses.includes(status);
}

/**
 * Call Google Maps Distance Matrix API
 * 
 * @param request - Distance Matrix API request parameters
 * @param retryCount - Current retry attempt (internal use)
 * @returns Promise with Distance Matrix API response
 */
export async function getDistanceMatrix(
  request: DistanceMatrixRequest,
  retryCount = 0
): Promise<DistanceMatrixResponse> {
  const apiKey = getApiKey();
  
  // Build query parameters
  const params = new URLSearchParams();
  
  // Format origins
  const origins = request.origins.map(formatCoordinates);
  params.append("origins", origins.join("|"));
  
  // Format destinations
  const destinations = request.destinations.map(formatCoordinates);
  params.append("destinations", destinations.join("|"));
  
  // Add optional parameters
  if (request.mode) {
    params.append("mode", request.mode);
  }
  
  if (request.departure_time) {
    const departureTime = formatDepartureTime(request.departure_time);
    if (departureTime) {
      params.append("departure_time", departureTime);
    }
  }
  
  if (request.traffic_model) {
    params.append("traffic_model", request.traffic_model);
  }
  
  if (request.avoid) {
    params.append("avoid", request.avoid);
  }
  
  if (request.units) {
    params.append("units", request.units);
  }
  
  if (request.region) {
    params.append("region", request.region);
  }
  
  params.append("key", apiKey);
  
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: DistanceMatrixResponse | ApiError = await response.json();
    
    // Check for API errors
    if ("status" in data && data.status !== "OK") {
      // Handle retryable errors
      if (isRetryableError(data.status) && retryCount < RETRY_CONFIG.maxRetries) {
        const delay = RETRY_CONFIG.retryDelay * Math.pow(2, retryCount); // Exponential backoff
        await sleep(delay);
        return getDistanceMatrix(request, retryCount + 1);
      }
      
      throw new Error(
        `Distance Matrix API error: ${data.status}${"error_message" in data ? ` - ${data.error_message}` : ""}`
      );
    }
    
    return data as DistanceMatrixResponse;
  } catch (error) {
    // Retry on network errors
    if (retryCount < RETRY_CONFIG.maxRetries && error instanceof Error) {
      const delay = RETRY_CONFIG.retryDelay * Math.pow(2, retryCount);
      await sleep(delay);
      return getDistanceMatrix(request, retryCount + 1);
    }
    
    throw error;
  }
}

/**
 * Call Google Maps Directions API
 * 
 * @param request - Directions API request parameters
 * @param retryCount - Current retry attempt (internal use)
 * @returns Promise with Directions API response
 */
export async function getDirections(
  request: DirectionsRequest,
  retryCount = 0
): Promise<DirectionsResponse> {
  const apiKey = getApiKey();
  
  // Build query parameters
  const params = new URLSearchParams();
  
  // Format origin
  params.append("origin", formatCoordinates(request.origin));
  
  // Format destination
  params.append("destination", formatCoordinates(request.destination));
  
  // Format waypoints if provided
  if (request.waypoints && request.waypoints.length > 0) {
    const waypoints = request.waypoints.map(formatCoordinates);
    params.append("waypoints", waypoints.join("|"));
  }
  
  // Add optional parameters
  if (request.mode) {
    params.append("mode", request.mode);
  }
  
  if (request.departure_time) {
    const departureTime = formatDepartureTime(request.departure_time);
    if (departureTime) {
      params.append("departure_time", departureTime);
    }
  }
  
  if (request.traffic_model) {
    params.append("traffic_model", request.traffic_model);
  }
  
  if (request.avoid) {
    params.append("avoid", request.avoid);
  }
  
  if (request.optimize_waypoints) {
    params.append("optimize", "true");
  }
  
  if (request.alternatives) {
    params.append("alternatives", "true");
  }
  
  params.append("key", apiKey);
  
  const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: DirectionsResponse | ApiError = await response.json();
    
    // Check for API errors
    if ("status" in data && data.status !== "OK") {
      // Handle retryable errors
      if (isRetryableError(data.status) && retryCount < RETRY_CONFIG.maxRetries) {
        const delay = RETRY_CONFIG.retryDelay * Math.pow(2, retryCount); // Exponential backoff
        await sleep(delay);
        return getDirections(request, retryCount + 1);
      }
      
      throw new Error(
        `Directions API error: ${data.status}${"error_message" in data ? ` - ${data.error_message}` : ""}`
      );
    }
    
    return data as DirectionsResponse;
  } catch (error) {
    // Retry on network errors
    if (retryCount < RETRY_CONFIG.maxRetries && error instanceof Error) {
      const delay = RETRY_CONFIG.retryDelay * Math.pow(2, retryCount);
      await sleep(delay);
      return getDirections(request, retryCount + 1);
    }
    
    throw error;
  }
}

/**
 * Rate limiting helper
 * Tracks API calls to prevent exceeding quotas
 */
class RateLimiter {
  private calls: number[] = [];
  private readonly maxCallsPerSecond: number;
  private readonly maxCallsPerDay: number;
  
  constructor(maxCallsPerSecond = 10, maxCallsPerDay = 25000) {
    this.maxCallsPerSecond = maxCallsPerSecond;
    this.maxCallsPerDay = maxCallsPerDay;
  }
  
  /**
   * Check if we can make an API call
   */
  canMakeCall(): boolean {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    // Remove old calls
    this.calls = this.calls.filter((timestamp) => timestamp > oneDayAgo);
    
    // Check per-second limit
    const recentCalls = this.calls.filter((timestamp) => timestamp > oneSecondAgo);
    if (recentCalls.length >= this.maxCallsPerSecond) {
      return false;
    }
    
    // Check per-day limit
    if (this.calls.length >= this.maxCallsPerDay) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Record an API call
   */
  recordCall(): void {
    this.calls.push(Date.now());
  }
  
  /**
   * Wait until we can make an API call
   */
  async waitIfNeeded(): Promise<void> {
    while (!this.canMakeCall()) {
      const now = Date.now();
      const oneSecondAgo = now - 1000;
      const recentCalls = this.calls.filter((timestamp) => timestamp > oneSecondAgo);
      
      if (recentCalls.length > 0) {
        const oldestRecentCall = Math.min(...recentCalls);
        const waitTime = 1000 - (now - oldestRecentCall);
        if (waitTime > 0) {
          await sleep(waitTime);
        }
      } else {
        await sleep(100);
      }
    }
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

/**
 * Get rate limiter instance (for testing or custom configuration)
 */
export function getRateLimiter(): RateLimiter {
  return rateLimiter;
}

/**
 * Wrapper for getDistanceMatrix with rate limiting
 */
export async function getDistanceMatrixWithRateLimit(
  request: DistanceMatrixRequest
): Promise<DistanceMatrixResponse> {
  await rateLimiter.waitIfNeeded();
  rateLimiter.recordCall();
  return getDistanceMatrix(request);
}

/**
 * Wrapper for getDirections with rate limiting
 */
export async function getDirectionsWithRateLimit(
  request: DirectionsRequest
): Promise<DirectionsResponse> {
  await rateLimiter.waitIfNeeded();
  rateLimiter.recordCall();
  return getDirections(request);
}

