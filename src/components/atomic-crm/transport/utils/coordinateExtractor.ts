/**
 * Coordinate Extractor
 * 
 * This module provides utilities for extracting coordinates from contacts (patients)
 * and staff locations (office/home/metro).
 */

import type { Contact, Staff } from "../../types";
import type { Location, LocationType, StaffLocation } from "../types";

// Default office location (Dubai) - should be configurable via settings
const DEFAULT_OFFICE_COORDINATES = {
  latitude: 25.2048,
  longitude: 55.2708,
  address: "Office, Dubai, UAE",
};

// Default metro station coordinates (Dubai Metro) - should be configurable
const DEFAULT_METRO_COORDINATES = {
  latitude: 25.2048,
  longitude: 55.2708,
  address: "Metro Station, Dubai, UAE",
  station_name: "Dubai Metro",
};

/**
 * Extract coordinates from a contact (patient)
 * 
 * @param contact - Contact/patient record
 * @returns Location object with coordinates, or null if coordinates are missing
 */
export function extractContactCoordinates(contact: Contact | null | undefined): Location | null {
  if (!contact) {
    return null;
  }

  // Check if contact has latitude and longitude
  if (
    contact.latitude != null &&
    contact.longitude != null &&
    !isNaN(Number(contact.latitude)) &&
    !isNaN(Number(contact.longitude))
  ) {
    const lat = typeof contact.latitude === "string" 
      ? parseFloat(contact.latitude) 
      : contact.latitude;
    const lng = typeof contact.longitude === "string"
      ? parseFloat(contact.longitude)
      : contact.longitude;

    // Validate coordinates
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return {
        type: "patient" as LocationType,
        id: contact.id,
        coordinates: {
          latitude: lat,
          longitude: lng,
        },
        address: buildContactAddress(contact),
        name: `${contact.first_name} ${contact.last_name}`.trim(),
      };
    }
  }

  // If no coordinates, try to use google_maps_link
  if (contact.google_maps_link) {
    const coords = extractCoordinatesFromGoogleMapsLink(contact.google_maps_link);
    if (coords) {
      return {
        type: "patient" as LocationType,
        id: contact.id,
        coordinates: coords,
        address: buildContactAddress(contact),
        name: `${contact.first_name} ${contact.last_name}`.trim(),
      };
    }
  }

  return null;
}

/**
 * Build address string from contact fields
 */
function buildContactAddress(contact: Contact): string {
  const parts: string[] = [];

  if (contact.flat_villa_number) {
    parts.push(contact.flat_villa_number);
  }

  if (contact.building_street) {
    parts.push(contact.building_street);
  }

  if (contact.area) {
    parts.push(contact.area);
  }

  if (contact.city) {
    parts.push(contact.city);
  }

  return parts.length > 0 ? parts.join(", ") : "Address not available";
}

/**
 * Extract coordinates from Google Maps link
 * Supports formats like:
 * - https://www.google.com/maps?q=25.2048,55.2708
 * - https://www.google.com/maps/@25.2048,55.2708
 */
function extractCoordinatesFromGoogleMapsLink(link: string): { latitude: number; longitude: number } | null {
  try {
    // Try to extract from ?q=lat,lng format
    const qMatch = link.match(/[?&]q=([^&]+)/);
    if (qMatch) {
      const coords = qMatch[1].split(",");
      if (coords.length >= 2) {
        const lat = parseFloat(coords[0]);
        const lng = parseFloat(coords[1]);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { latitude: lat, longitude: lng };
        }
      }
    }

    // Try to extract from @lat,lng format
    const atMatch = link.match(/@([^,]+),([^,]+)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
  } catch (error) {
    console.warn("Failed to extract coordinates from Google Maps link:", error);
  }

  return null;
}

/**
 * Get office location coordinates
 * TODO: This should be configurable via settings/configuration
 * 
 * @returns Location object for office
 */
export function getOfficeLocation(): Location {
  return {
    type: "office",
    coordinates: {
      latitude: DEFAULT_OFFICE_COORDINATES.latitude,
      longitude: DEFAULT_OFFICE_COORDINATES.longitude,
    },
    address: DEFAULT_OFFICE_COORDINATES.address,
    name: "Office",
  };
}

/**
 * Get home location coordinates for a staff member
 * TODO: This should be stored in staff record or settings
 * For now, returns null as home locations need to be configured
 * 
 * @param staff - Staff member record
 * @returns Location object for home, or null if not configured
 */
export function getStaffHomeLocation(staff: Staff | null | undefined): Location | null {
  // TODO: Implement when staff home locations are stored in database
  // For now, return null
  return null;
}

/**
 * Get metro location coordinates
 * TODO: This should be configurable via settings
 * 
 * @param stationName - Optional metro station name
 * @returns Location object for metro station
 */
export function getMetroLocation(stationName?: string): Location {
  return {
    type: "metro",
    coordinates: {
      latitude: DEFAULT_METRO_COORDINATES.latitude,
      longitude: DEFAULT_METRO_COORDINATES.longitude,
    },
    address: DEFAULT_METRO_COORDINATES.address,
    name: stationName || DEFAULT_METRO_COORDINATES.station_name,
  };
}

/**
 * Get location coordinates based on location type
 * 
 * @param locationType - Type of location (office/home/metro/patient)
 * @param contact - Contact record (for patient type)
 * @param staff - Staff record (for home type)
 * @param stationName - Metro station name (for metro type)
 * @returns Location object or null
 */
export function getLocationByType(
  locationType: LocationType,
  contact?: Contact | null,
  staff?: Staff | null,
  stationName?: string
): Location | null {
  switch (locationType) {
    case "office":
      return getOfficeLocation();
    
    case "home":
      return getStaffHomeLocation(staff || undefined);
    
    case "metro":
      return getMetroLocation(stationName);
    
    case "patient":
      return extractContactCoordinates(contact || undefined);
    
    default:
      return null;
  }
}

/**
 * Extract coordinates from a Location object
 * 
 * @param location - Location object
 * @returns Coordinates object or null
 */
export function extractCoordinatesFromLocation(
  location: Location | null | undefined
): { latitude: number; longitude: number } | null {
  if (!location) {
    return null;
  }

  if (location.coordinates) {
    return location.coordinates;
  }

  // If no coordinates but has address, we can't extract coordinates
  // This would require geocoding (not implemented here)
  return null;
}

/**
 * Validate coordinates
 * 
 * @param coordinates - Coordinates to validate
 * @returns True if coordinates are valid
 */
export function validateCoordinates(
  coordinates: { latitude: number; longitude: number } | null | undefined
): boolean {
  if (!coordinates) {
    return false;
  }

  const { latitude, longitude } = coordinates;

  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

