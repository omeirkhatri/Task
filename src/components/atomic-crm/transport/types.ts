/**
 * Transport/Dispatch System Types
 * 
 * This file contains transport-specific types, enums, and interfaces
 * for the Driver Assignment & Dispatch System.
 */

import type { Identifier } from "ra-core";
import type { DriverTrip, TripLeg, Appointment, Staff, Contact } from "../types";

// ============================================
// Enums
// ============================================

export type LegType = "pickup_staff" | "drop_staff" | "appointment" | "wait" | "return";

export type LocationType = "office" | "home" | "metro" | "patient";

export type TripStatus = "draft" | "published" | "completed";

export type ConflictType = 
  | "patient_lateness" 
  | "unreachable_stop" 
  | "overlapping_legs" 
  | "insufficient_buffer";

export type ConflictSeverity = "warning" | "error";

export type ConflictClassification = "early" | "late"; // Early: ≥4 hours, Late: <4 hours

export type ClientConfirmationStatus = "pending" | "approved" | "declined";

// ============================================
// Route Conflict Types
// ============================================

export type RouteConflict = {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  classification: ConflictClassification;
  trip_id: Identifier;
  leg_id?: Identifier;
  appointment_id?: Identifier;
  message: string;
  affected_patient_id?: Identifier;
  affected_patient_name?: string;
  current_eta?: string;
  required_arrival_time?: string;
  time_difference_minutes?: number;
  suggested_fixes?: ConflictFix[];
};

export type ConflictFix = {
  id: string;
  category: "time_change" | "logistics" | "manual_override";
  label: string;
  description: string;
  action: () => void | Promise<void>;
  preview?: RoutePreview;
  recommended?: boolean;
  requires_client_approval?: boolean;
};

// ============================================
// Route Planning Types
// ============================================

export type RoutePreview = {
  trip_id: Identifier;
  driver_id: Identifier;
  legs: TripLeg[];
  total_distance_km?: number;
  total_travel_time_minutes?: number;
  conflicts: RouteConflict[];
  estimated_fuel_cost?: number;
};

export type DraftRoute = {
  trip: DriverTrip;
  legs: TripLeg[];
  conflicts: RouteConflict[];
  suggested_driver_name?: string;
  suggested_pickup_location?: LocationType;
  suggested_drop_location?: LocationType;
  wait_vs_leave?: "wait" | "leave";
  confidence_score?: number; // 0-1, how confident the system is in this suggestion
};

// ============================================
// Location Types
// ============================================

export type Location = {
  type: LocationType;
  id?: Identifier; // For patient locations, this is contact.id
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  address?: string;
  name?: string; // Display name (e.g., "Office", "Home", "Metro Station", patient name)
};

export type StaffLocation = {
  staff_id: Identifier;
  office?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  home?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  metro?: {
    latitude: number;
    longitude: number;
    address: string;
    station_name: string;
  };
};

// ============================================
// Route Optimization Types
// ============================================

export type RouteOptimizationResult = {
  optimized_legs: TripLeg[];
  original_total_time_minutes: number;
  optimized_total_time_minutes: number;
  time_saved_minutes: number;
  distance_saved_km?: number;
  conflicts_before: RouteConflict[];
  conflicts_after: RouteConflict[];
};

export type DistanceMatrixResult = {
  origin: Location;
  destination: Location;
  distance_meters: number;
  distance_km: number;
  duration_seconds: number;
  duration_minutes: number;
  duration_in_traffic_seconds?: number;
  duration_in_traffic_minutes?: number;
  status: "OK" | "NOT_FOUND" | "ZERO_RESULTS" | "MAX_ROUTE_LENGTH_EXCEEDED";
};

// ============================================
// Driver Assignment Types
// ============================================

export type DriverAssignmentSuggestion = {
  driver_id: Identifier;
  driver_name: string;
  appointment_id: Identifier;
  confidence_score: number;
  reasoning: string[];
  estimated_travel_time_minutes: number;
  current_workload?: {
    trips_count: number;
    total_stops: number;
    estimated_end_time?: string;
  };
};

export type PickupDropSuggestion = {
  appointment_id: Identifier;
  staff_id: Identifier;
  pickup_location: LocationType;
  drop_location: LocationType;
  reasoning: string;
  time_saved_minutes?: number;
  distance_saved_km?: number;
};

// ============================================
// Client Negotiation Types
// ============================================

export type TimeChangeProposal = {
  appointment_id: Identifier;
  current_time: string;
  suggested_time: string;
  time_difference_minutes: number;
  reason: string;
  classification: ConflictClassification;
  status: ClientConfirmationStatus;
  proposed_at?: string;
  responded_at?: string;
  client_response_notes?: string;
};

// ============================================
// Driver Status Types
// ============================================

export type DriverStatus = {
  driver_id: Identifier;
  trip_id: Identifier;
  current_leg_id?: Identifier;
  status: "on_route" | "arrived" | "picked_up" | "dropped_off" | "running_late" | "completed";
  current_location?: {
    latitude: number;
    longitude: number;
  };
  last_update_time: string;
  running_late_minutes?: number;
  next_stop_eta?: string;
  impact_on_route?: {
    affected_appointments: Identifier[];
    new_etas: Record<Identifier, string>;
    conflicts_created: RouteConflict[];
  };
};

// ============================================
// Extended Types with Transport Context
// ============================================

export type TripLegWithDetails = TripLeg & {
  staff?: Staff;
  appointment?: Appointment;
  patient?: Contact;
  location?: Location;
  travel_time_from_previous_minutes?: number;
  buffer_time_minutes?: number;
  conflict_status?: "safe" | "tight" | "conflict";
};

export type DriverTripWithDetails = DriverTrip & {
  driver?: Staff;
  legs?: TripLegWithDetails[];
  conflicts?: RouteConflict[];
  total_distance_km?: number;
  total_travel_time_minutes?: number;
  estimated_fuel_cost?: number;
};

// ============================================
// Playback Mode Types
// ============================================

export type PlaybackState = {
  is_playing: boolean;
  current_time: string; // Timestamp
  playback_speed: 1 | 2 | 4;
  selected_date: string; // YYYY-MM-DD
};

export type PlaybackDriverPosition = {
  driver_id: Identifier;
  trip_id: Identifier;
  position: {
    latitude: number;
    longitude: number;
  };
  current_leg_id?: Identifier;
  timestamp: string;
};

