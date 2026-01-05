/**
 * RouteMapView Component
 * 
 * Right panel showing Google Maps with route polylines per driver,
 * numbered stops, and icons for staff/patients/office/metro.
 * Synchronized with timeline.
 */

import React, { useEffect, useRef, useState, useMemo } from "react";
import type { Identifier } from "ra-core";
import { useGetList } from "ra-core";
import type { DriverTrip, TripLeg, Contact, Staff } from "../types";
import { format } from "date-fns";

type RouteMapViewProps = {
  selectedDriverId: Identifier | null;
  selectedDate: Date;
  hoveredAppointmentId: Identifier | null;
  hoveredLegId: Identifier | null;
  onLegHover: (legId: Identifier | null) => void;
};

export const RouteMapView: React.FC<RouteMapViewProps> = ({
  selectedDriverId,
  selectedDate,
  hoveredAppointmentId,
  hoveredLegId,
  onLegHover,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  // Fetch driver trip for selected driver
  const { data: driverTrips } = useGetList<DriverTrip>(
    "driver_trips",
    {
      pagination: { page: 1, perPage: 100 },
      filter: {
        "trip_date@eq": selectedDateStr,
        ...(selectedDriverId ? { "driver_id@eq": selectedDriverId } : {}),
      },
    },
    {
      enabled: !!selectedDriverId,
      retry: false,
    }
  );

  // Fetch trip legs
  const tripIds = useMemo(() => {
    return driverTrips?.map((trip) => trip.id) || [];
  }, [driverTrips]);

  const { data: tripLegs } = useGetList<TripLeg>(
    "trip_legs",
    {
      pagination: { page: 1, perPage: 1000 },
      filter: {
        trip_id: tripIds.length > 0 ? { "@in": `(${tripIds.join(",")})` } : undefined,
      },
      sort: { field: "leg_order", order: "ASC" },
    },
    {
      enabled: tripIds.length > 0,
      retry: false,
    }
  );

  // Fetch contacts for patient locations
  const patientIds = useMemo(() => {
    if (!tripLegs) return [];
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
        id: patientIds.length > 0 ? { "@in": `(${patientIds.join(",")})` } : undefined,
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

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: 25.2048, lng: 55.2708 }, // Dubai
      zoom: 12,
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
    });

    mapRef.current = map;
    setMapLoaded(true);
  };

  // Update map with routes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !tripLegs || !patients) return;

    // Clear existing markers and polylines
    // TODO: Store references and clear them

    if (!selectedDriverId || tripLegs.length === 0) {
      return;
    }

    // Create route polyline
    const routeCoordinates: google.maps.LatLng[] = [];
    const patientsMap = new Map(patients.map((p) => [p.id, p]));

    tripLegs.forEach((leg, index) => {
      let lat: number | null = null;
      let lng: number | null = null;

      if (leg.location_type === "patient" && leg.location_id) {
        const patient = patientsMap.get(leg.location_id);
        if (patient?.latitude && patient?.longitude) {
          lat = typeof patient.latitude === "string" ? parseFloat(patient.latitude) : patient.latitude;
          lng = typeof patient.longitude === "string" ? parseFloat(patient.longitude) : patient.longitude;
        }
      } else if (leg.location_type === "office") {
        lat = 25.2048; // Default office location
        lng = 55.2708;
      } else if (leg.location_type === "metro") {
        lat = 25.2048; // Default metro location
        lng = 55.2708;
      }

      if (lat !== null && lng !== null) {
        const position = new window.google.maps.LatLng(lat, lng);
        routeCoordinates.push(position);

        // Create marker
        const marker = new window.google.maps.Marker({
          position,
          map: mapRef.current,
          label: {
            text: String(index + 1),
            color: "white",
          },
          title: `Stop ${index + 1}`,
        });

        // Highlight if hovered
        if (hoveredLegId === leg.id) {
          marker.setIcon({
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#3b82f6",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          });
        }
      }
    });

    // Create polyline
    if (routeCoordinates.length > 1) {
      const polyline = new window.google.maps.Polyline({
        path: routeCoordinates,
        geodesic: true,
        strokeColor: "#3b82f6",
        strokeOpacity: 1.0,
        strokeWeight: 3,
      });
      polyline.setMap(mapRef.current);

      // Fit bounds to show all stops
      const bounds = new window.google.maps.LatLngBounds();
      routeCoordinates.forEach((coord) => bounds.extend(coord));
      mapRef.current.fitBounds(bounds);
    }
  }, [mapLoaded, tripLegs, patients, selectedDriverId, hoveredLegId]);

  if (!selectedDriverId) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
        <div className="text-slate-500 dark:text-slate-400 text-sm">
          Select a driver to view route
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
};

