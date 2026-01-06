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

// Track if API is known to be unavailable (to skip future calls)
let apiUnavailable = false;

/**
 * Get Google Maps API key from environment variables
 */
function getApiKey(): string | null {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  // Debug: Check if env var is accessible
  if (import.meta.env.DEV) {
    console.debug("Checking Google Maps API key...");
    console.debug("VITE_GOOGLE_MAPS_API_KEY exists:", !!apiKey);
    console.debug("VITE_GOOGLE_MAPS_API_KEY length:", apiKey?.length || 0);
    // Log all VITE_ prefixed env vars to help debug
    const viteEnvVars = Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'));
    console.debug("Available VITE_ env vars:", viteEnvVars);
  }
  
  if (!apiKey || apiKey.trim() === "") {
    return null; // Return null instead of throwing
  }
  
  // Basic validation - Google API keys are typically long alphanumeric strings
  if (apiKey.length < 20) {
    console.warn("Google Maps API key appears to be invalid (too short). Please verify your API key.");
  }
  
  return apiKey;
}

/**
 * Check if API should be used (not marked as unavailable)
 */
export function isGoogleMapsApiAvailable(): boolean {
  return !apiUnavailable && getApiKey() !== null;
}

/**
 * Mark API as unavailable (called when API fails)
 */
export function markGoogleMapsApiUnavailable(): void {
  apiUnavailable = true;
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
  // Skip API call if marked as unavailable
  if (apiUnavailable) {
    throw new Error("Google Maps API is unavailable - using fallback");
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    apiUnavailable = true;
    throw new Error("Google Maps API key not found - using fallback");
  }
  
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
  
  // Log request details in development
  if (import.meta.env.DEV) {
    const urlForLogging = url.replace(/key=[^&]+/, 'key=***');
    console.debug("Google Maps Distance Matrix API request:", urlForLogging);
  }
  
  // Check if API is marked as unavailable - skip immediately
  if (apiUnavailable) {
    throw new Error("Google Maps API is unavailable - using fallback");
  }

  try {
    // Use simple fetch without custom headers to avoid CORS preflight issues
    // Google Maps APIs support CORS, but we want to keep the request simple
    const response = await fetch(url, { 
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (!response.ok) {
      // Try to get error details from response
      let errorMessage = `HTTP error! status: ${response.status}`;
      let errorDetails: any = null;
      try {
        errorDetails = await response.json();
        if (errorDetails.error_message) {
          errorMessage = `Google Maps API error: ${errorDetails.error_message}`;
        } else if (errorDetails.status) {
          errorMessage = `Google Maps API error: ${errorDetails.status}`;
        }
        console.error("Google Maps API error response:", errorDetails);
      } catch (e) {
        // If we can't parse the error, try to get text
        try {
          const errorText = await response.text();
          console.error("Google Maps API error (text):", errorText);
        } catch {
          // If we can't parse the error, use the status
        }
      }
      throw new Error(errorMessage);
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
      
      const errorMessage = `Distance Matrix API error: ${data.status}${"error_message" in data ? ` - ${data.error_message}` : ""}`;
      throw new Error(errorMessage);
    }
    
    return data as DistanceMatrixResponse;
  } catch (error) {
    // Log detailed error information
    console.error("Google Maps API fetch error:", error);
    console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      // Mark API as unavailable on first network failure
      if (retryCount === 0) {
        apiUnavailable = true;
        console.warn("Google Maps API unavailable (network/CORS error). Using fallback calculations for all requests.");
      }
      
      // Don't retry - fail fast and use fallback
      throw new Error("Google Maps API unavailable - using fallback");
    }
    
    // For other errors, don't retry either - fail fast
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
      // Try to get error details from response
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error_message) {
          errorMessage = `Google Maps API error: ${errorData.error_message}`;
        }
      } catch {
        // If we can't parse the error, use the status
      }
      throw new Error(errorMessage);
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
      
      const errorMessage = `Directions API error: ${data.status}${"error_message" in data ? ` - ${data.error_message}` : ""}`;
      throw new Error(errorMessage);
    }
    
    return data as DirectionsResponse;
  } catch (error) {
    // Improve error messages for common issues
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      // This usually means CORS, network issue, or API key problem
      const enhancedError = new Error(
        `Failed to connect to Google Maps API. This could be due to:
1. Missing or invalid API key (check VITE_GOOGLE_MAPS_API_KEY)
2. API key restrictions blocking this domain
3. Network connectivity issues
4. CORS configuration issues

Please verify your Google Maps API key is set correctly and has the Directions API enabled.`
      );
      enhancedError.name = error.name;
      error = enhancedError;
    }
    
    // Retry on network errors (but not on API errors)
    if (retryCount < RETRY_CONFIG.maxRetries && error instanceof Error) {
      // Only retry if it's a network error, not an API error
      if (error.message.includes("Failed to connect") || error.message.includes("Failed to fetch")) {
        const delay = RETRY_CONFIG.retryDelay * Math.pow(2, retryCount);
        await sleep(delay);
        return getDirections(request, retryCount + 1);
      }
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

/**
 * Test if the Google Maps API key is valid and has Distance Matrix API enabled
 * This makes a simple test request to verify the API key works
 */
export async function testApiKey(): Promise<{ valid: boolean; error?: string }> {
  try {
    const apiKey = getApiKey();
    
    // Make a simple test request with two nearby locations
    const testRequest: DistanceMatrixRequest = {
      origins: [{ lat: 25.2048, lng: 55.2708 }], // Dubai coordinates
      destinations: [{ lat: 25.2049, lng: 55.2709 }], // Very close location
      mode: "driving",
    };
    
    const result = await getDistanceMatrix(testRequest);
    
    if (result.status === "OK") {
      return { valid: true };
    } else {
      return { 
        valid: false, 
        error: `API returned status: ${result.status}` 
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { 
      valid: false, 
      error: errorMessage 
    };
  }
}

