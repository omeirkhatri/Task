/**
 * PlaybackMapView Component
 * 
 * Map view showing driver positions at specific time points with animated movement along routes.
 * Displays route polylines, driver markers, stop markers, and highlights active stops.
 */

import React, { useEffect, useRef, useState, useMemo } from "react";
import type { Identifier } from "ra-core";
import type { DriverTrip, TripLeg, Staff, Contact } from "../types";
import type { PlaybackState, RouteConflict } from "./types";
import { useGetList } from "ra-core";
import { format } from "date-fns";
import {
  extractContactCoordinates,
  getOfficeLocation,
  getMetroLocation,
  getStaffHomeLocation,
} from "./utils/coordinateExtractor";
import type { Location } from "./types";
import { useOfficeLocation } from "@/hooks/useOfficeLocation";

type PlaybackMapViewProps = {
  playbackState: PlaybackState;
  driverTrips: DriverTrip[];
  tripLegs: TripLeg[];
  activeStops: TripLeg[];
  activeConflicts: RouteConflict[];
};

export const PlaybackMapView: React.FC<PlaybackMapViewProps> = ({
  playbackState,
  driverTrips,
  tripLegs,
  activeStops,
  activeConflicts,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const driverMarkersRef = useRef<Map<Identifier, google.maps.Marker>>(new Map());
  const [driverPositions, setDriverPositions] = useState<
    Map<Identifier, { lat: number; lng: number; legId?: Identifier }>
  >(new Map());

  // Get office location from settings
  const { officeLocation } = useOfficeLocation();

  // Fetch staff for drivers
  const driverIds = useMemo(() => {
    return driverTrips.map((trip) => trip.driver_id);
  }, [driverTrips]);

  const { data: staff } = useGetList<Staff>(
    "staff",
    {
      pagination: { page: 1, perPage: 1000 },
      filter: {
        "id@in": driverIds.length > 0 ? `(${driverIds.join(",")})` : "(-1)",
      },
    },
    {
      enabled: driverIds.length > 0,
      retry: false,
    }
  );

  // Fetch contacts for patient locations
  const patientIds = useMemo(() => {
    return tripLegs
      .filter((leg) => leg.location_type === "patient" && leg.location_id)
      .map((leg) => leg.location_id)
      .filter(Boolean);
  }, [tripLegs]);

  const { data: patients } = useGetList<Contact>(
    "clients",
    {
      pagination: { page: 1, perPage: 1000 },
      filter: {
        "id@in": patientIds.length > 0 ? `(${patientIds.join(",")})` : "(-1)",
      },
    },
    {
      enabled: patientIds.length > 0,
      retry: false,
    }
  );

  // Initialize Google Maps
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("Google Maps API key not found");
      return;
    }

    const isApiReady = () => {
      return (
        window.google &&
        window.google.maps &&
        window.google.maps.Map
      );
    };

    if (isApiReady()) {
      initializeMap();
      return;
    }

    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com/maps/api/js"]`
    );
    if (existingScript) {
      const checkReady = setInterval(() => {
        if (isApiReady()) {
          clearInterval(checkReady);
          initializeMap();
        }
      }, 100);
      setTimeout(() => clearInterval(checkReady), 10000);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const checkReady = setInterval(() => {
        if (isApiReady()) {
          clearInterval(checkReady);
          initializeMap();
        }
      }, 100);
      setTimeout(() => clearInterval(checkReady), 10000);
    };
    document.head.appendChild(script);
  }, []);

  const initializeMap = () => {
    if (!mapContainerRef.current || !window.google || !window.google.maps || mapRef.current) {
      return;
    }

    // Use office location from settings, fallback to Dubai
    const centerLat = officeLocation?.latitude ?? 25.2048;
    const centerLng = officeLocation?.longitude ?? 55.2708;

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: centerLat, lng: centerLng },
      zoom: 12,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
    });

    mapRef.current = map;
    setMapLoaded(true);
  };

  // Get location for a trip leg
  const getLocationForLeg = async (leg: TripLeg): Promise<Location | null> => {
    switch (leg.location_type) {
      case "office":
        return getOfficeLocation(officeLocation);
      case "metro":
        return getMetroLocation();
      case "home":
        if (leg.staff_id && staff) {
          const staffMember = staff.find((s) => s.id === leg.staff_id);
          return getStaffHomeLocation(staffMember || undefined);
        }
        return null;
      case "patient":
        if (leg.location_id && patients) {
          const patient = patients.find((p) => p.id === leg.location_id);
          return extractContactCoordinates(patient || undefined);
        }
        return null;
      default:
        return null;
    }
  };

  // Calculate driver positions at current playback time
  useEffect(() => {
    if (!tripLegs || tripLegs.length === 0 || !staff || !patients) {
      setDriverPositions(new Map());
      return;
    }

    const calculatePositions = async () => {
      const currentTime = new Date(playbackState.current_time);
      const positions = new Map<Identifier, { lat: number; lng: number; legId?: Identifier }>();

      // Group legs by trip
      const legsByTrip = new Map<Identifier, TripLeg[]>();
      tripLegs.forEach((leg) => {
        if (!legsByTrip.has(leg.trip_id)) {
          legsByTrip.set(leg.trip_id, []);
        }
        legsByTrip.get(leg.trip_id)!.push(leg);
      });

      // For each trip, find where the driver should be
      for (const trip of driverTrips) {
        const legs = legsByTrip.get(trip.id) || [];
        const sortedLegs = [...legs].sort((a, b) => a.leg_order - b.leg_order);

        // Find the leg the driver is currently on
        for (let i = 0; i < sortedLegs.length; i++) {
          const leg = sortedLegs[i];
          const arrivalTime = new Date(leg.planned_arrival_time);
          const departureTime = leg.planned_departure_time
            ? new Date(leg.planned_departure_time)
            : new Date(arrivalTime.getTime() + 30 * 60 * 1000);

          if (currentTime >= arrivalTime && currentTime <= departureTime) {
            // Driver is at this stop
            const location = await getLocationForLeg(leg);
            if (location?.coordinates) {
              positions.set(trip.driver_id, {
                lat: location.coordinates.latitude,
                lng: location.coordinates.longitude,
                legId: leg.id,
              });
            }
            break;
          } else if (currentTime < arrivalTime && i > 0) {
            // Driver is traveling between previous stop and current stop
            const prevLeg = sortedLegs[i - 1];
            const prevLocation = await getLocationForLeg(prevLeg);
            const currLocation = await getLocationForLeg(leg);

            if (prevLocation?.coordinates && currLocation?.coordinates) {
              // Interpolate position (simplified - assumes linear movement)
              const prevTime = prevLeg.planned_departure_time
                ? new Date(prevLeg.planned_departure_time)
                : new Date(prevLeg.planned_arrival_time);
              const travelDuration = arrivalTime.getTime() - prevTime.getTime();
              const elapsed = currentTime.getTime() - prevTime.getTime();
              const progress = Math.max(0, Math.min(1, elapsed / travelDuration));

              const lat =
                prevLocation.coordinates.latitude +
                (currLocation.coordinates.latitude - prevLocation.coordinates.latitude) * progress;
              const lng =
                prevLocation.coordinates.longitude +
                (currLocation.coordinates.longitude - prevLocation.coordinates.longitude) * progress;

              positions.set(trip.driver_id, {
                lat,
                lng,
                legId: leg.id,
              });
            }
            break;
          }
        }
      }

      setDriverPositions(positions);
    };

    calculatePositions();
  }, [playbackState.current_time, driverTrips, tripLegs, staff, patients]);

  // Update map with routes and driver positions
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !tripLegs || !staff || !patients) return;

    // Clear existing markers and polylines
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    polylinesRef.current.forEach((polyline) => polyline.setMap(null));
    polylinesRef.current = [];
    driverMarkersRef.current.forEach((marker) => marker.setMap(null));
    driverMarkersRef.current.clear();

    if (driverTrips.length === 0) {
      return;
    }

    // Group legs by trip
    const legsByTrip = new Map<Identifier, TripLeg[]>();
    tripLegs.forEach((leg) => {
      if (!legsByTrip.has(leg.trip_id)) {
        legsByTrip.set(leg.trip_id, []);
      }
      legsByTrip.get(leg.trip_id)!.push(leg);
    });

    const staffMap = new Map(staff.map((s) => [s.id, s]));
    const patientsMap = new Map(patients.map((p) => [p.id, p]));
    const bounds = new window.google.maps.LatLngBounds();

    // Draw routes and stops for each trip - use async/await properly
    (async () => {
      const allRouteCoordinates: google.maps.LatLng[] = [];
      
      for (const trip of driverTrips) {
        const legs = legsByTrip.get(trip.id) || [];
        const sortedLegs = [...legs].sort((a, b) => a.leg_order - b.leg_order);
        const routeCoordinates: google.maps.LatLng[] = [];

        // Draw route polyline
        for (const leg of sortedLegs) {
          const location = await getLocationForLeg(leg);
          if (location?.coordinates) {
            const position = new window.google.maps.LatLng(
              location.coordinates.latitude,
              location.coordinates.longitude
            );
            routeCoordinates.push(position);
            allRouteCoordinates.push(position);
            bounds.extend(position);

            // Check if this stop is active
            const isActive = activeStops.some((s) => s.id === leg.id);
            
            // Check if there's a conflict at this stop
            const hasConflict = activeConflicts.some(
              (conflict) => conflict.leg_id === leg.id || conflict.appointment_id === leg.appointment_id
            );

            // Determine marker color based on state
            let markerColor = "#3b82f6"; // Default blue
            let markerScale = 10;
            
            if (hasConflict) {
              markerColor = "#ef4444"; // Red for conflict
              markerScale = 14;
            } else if (isActive) {
              markerColor = "#10b981"; // Green for active
              markerScale = 12;
            }

            // Create stop marker with animation for active stops
            const marker = new window.google.maps.Marker({
              position,
              map: mapRef.current,
              label: {
                text: String(leg.leg_order),
                color: "white",
              },
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: markerScale,
                fillColor: markerColor,
                fillOpacity: hasConflict ? 0.9 : 1,
                strokeColor: "#ffffff",
                strokeWeight: hasConflict ? 3 : 2,
              },
              title: `Stop ${leg.leg_order}: ${location.name || location.address}${hasConflict ? " (CONFLICT)" : ""}`,
              zIndex: hasConflict ? 100 : undefined, // Conflicts on top
              animation: isActive ? window.google.maps.Animation.BOUNCE : undefined, // Bounce animation for active stops
            });

            markersRef.current.push(marker);
            
            // Add conflict indicator (red circle overlay) for conflicts with pulse animation
            if (hasConflict) {
              const conflictMarker = new window.google.maps.Marker({
                position,
                map: mapRef.current,
                icon: {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 18,
                  fillColor: "#ef4444",
                  fillOpacity: 0.3,
                  strokeColor: "#ef4444",
                  strokeWeight: 2,
                },
                zIndex: 99,
                animation: window.google.maps.Animation.BOUNCE, // Pulse animation for conflicts
              });
              markersRef.current.push(conflictMarker);
            }
          }
        }

        // Draw polyline for route
        if (routeCoordinates.length > 1) {
          const polyline = new window.google.maps.Polyline({
            path: routeCoordinates,
            geodesic: true,
            strokeColor: "#3b82f6",
            strokeOpacity: 0.6,
            strokeWeight: 3,
          });
          polyline.setMap(mapRef.current);
          polylinesRef.current.push(polyline);
        }

        // Draw driver position marker with smooth animation
        const driverPosition = driverPositions.get(trip.driver_id);
        if (driverPosition) {
          const driver = staffMap.get(trip.driver_id);
          const driverName = driver
            ? `${driver.first_name} ${driver.last_name}`.trim()
            : "Driver";

          // Check if marker already exists for smooth animation
          const existingMarker = driverMarkersRef.current.get(trip.driver_id);
          const newPosition = new window.google.maps.LatLng(driverPosition.lat, driverPosition.lng);

          if (existingMarker) {
            // Animate marker movement smoothly
            const startPosition = existingMarker.getPosition();
            if (startPosition) {
              const startLat = startPosition.lat();
              const startLng = startPosition.lng();
              const endLat = driverPosition.lat;
              const endLng = driverPosition.lng;

              // Use Google Maps animation for smooth movement
              // Calculate steps for animation (10 steps over 200ms)
              const steps = 10;
              const duration = 200; // milliseconds
              let currentStep = 0;

              const animate = () => {
                if (currentStep >= steps) {
                  existingMarker.setPosition(newPosition);
                  return;
                }

                const progress = currentStep / steps;
                const lat = startLat + (endLat - startLat) * progress;
                const lng = startLng + (endLng - startLng) * progress;

                existingMarker.setPosition(new window.google.maps.LatLng(lat, lng));
                currentStep++;

                if (currentStep < steps) {
                  setTimeout(animate, duration / steps);
                }
              };

              animate();
            } else {
              existingMarker.setPosition(newPosition);
            }
          } else {
            // Create new marker
            const driverMarker = new window.google.maps.Marker({
              position: newPosition,
              map: mapRef.current,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: "#ef4444", // Red for driver
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 3,
              },
              title: driverName,
              zIndex: 1000, // Above other markers
              animation: window.google.maps.Animation.DROP, // Drop animation on first appearance
            });

            driverMarkersRef.current.set(trip.driver_id, driverMarker);
          }

          bounds.extend(newPosition);
        }
      }

      // Fit bounds to show all routes - only if we have valid bounds
      if (bounds.getNorthEast().lat() !== bounds.getSouthWest().lat() && 
          bounds.getNorthEast().lng() !== bounds.getSouthWest().lng()) {
        mapRef.current.fitBounds(bounds, { padding: 50 });
      } else if (allRouteCoordinates.length > 0 || driverPositions.size > 0) {
        // Fallback: if bounds are invalid but we have coordinates, use them
        const fallbackBounds = new window.google.maps.LatLngBounds();
        allRouteCoordinates.forEach(pos => fallbackBounds.extend(pos));
        driverPositions.forEach(pos => {
          fallbackBounds.extend(new window.google.maps.LatLng(pos.lat, pos.lng));
        });
        
        if (allRouteCoordinates.length > 0 || driverPositions.size > 0) {
          mapRef.current.fitBounds(fallbackBounds, { padding: 50 });
        }
      } else {
        // Default to office location if no valid coordinates
        const fallbackLat = officeLocation?.latitude ?? 25.2048;
        const fallbackLng = officeLocation?.longitude ?? 55.2708;
        mapRef.current.setCenter({ lat: fallbackLat, lng: fallbackLng });
        mapRef.current.setZoom(12);
      }
    })();
  }, [
    mapLoaded,
    tripLegs,
    driverTrips,
    staff,
    patients,
    activeStops,
    driverPositions,
    officeLocation,
  ]);

  return (
    <div className="h-full w-full relative">
      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
};
