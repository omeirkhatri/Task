import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, addDays, subDays, startOfDay, isToday } from "date-fns";
import type { Appointment, Contact, Staff } from "../types";
import { useGetList } from "ra-core";
import { AppointmentInfoWindow } from "./AppointmentInfoWindow";
import { extractCrmTime } from "../misc/timezone";

// Google Maps types
declare global {
  interface Window {
    google: typeof google;
    initMap: () => void;
  }
}

type AppointmentMapViewProps = {
  appointments: Appointment[];
  loading: boolean;
  onAppointmentClick: (appointment: Appointment) => void;
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
};

// Default center (Dubai)
const DEFAULT_CENTER = { lat: 25.2048, lng: 55.2708 };
// Calculate zoom level for 1.5km scale (approximately zoom 13)
const DEFAULT_ZOOM = 13;

// Status colors
const STATUS_COLORS: Record<string, string> = {
  completed: "#10b981",
  cancelled: "#ef4444",
  confirmed: "#3b82f6",
  scheduled: "#f59e0b",
};

// Appointment type colors
const TYPE_COLORS: Record<string, string> = {
  doctor_on_call: "#3b82f6",
  lab_test: "#10b981",
  teleconsultation: "#8b5cf6",
  physiotherapy: "#f59e0b",
  caregiver: "#ef4444",
  iv_therapy: "#06b6d4",
};

// Helper to get coordinates from patient
const getPatientCoordinates = (patient: Contact | null): { lat: number; lng: number } | null => {
  if (!patient) return null;
  
  if (patient.latitude != null && patient.longitude != null) {
    const lat = typeof patient.latitude === "string" ? parseFloat(patient.latitude) : patient.latitude;
    const lng = typeof patient.longitude === "string" ? parseFloat(patient.longitude) : patient.longitude;
    
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  
  return null;
};

// Helper to get fallback coordinates with random offset
const getFallbackCoordinates = (): { lat: number; lng: number } => {
  const offsetLat = (Math.random() - 0.5) * 0.01; // ~1km offset
  const offsetLng = (Math.random() - 0.5) * 0.01;
  return { lat: DEFAULT_CENTER.lat + offsetLat, lng: DEFAULT_CENTER.lng + offsetLng };
};

// Helper to format time as HH:MM in CRM timezone
const formatTimeForMarker = (timeStr: string | null | undefined): string => {
  if (!timeStr) return "00:00";
  
  try {
    // Parse the ISO string to a Date object and extract time in CRM timezone
    // This ensures the time displayed matches the calendar views (8:00 AM instead of 4:00 AM UTC)
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) {
      return "00:00";
    }
    return extractCrmTime(date);
  } catch {
    return "00:00";
  }
};

// Factory function to create the AppointmentMarkerOverlay class
// This ensures google.maps is available before the class is defined
const createAppointmentMarkerOverlay = () => {
  if (!window.google || !window.google.maps || !window.google.maps.OverlayView) {
    throw new Error("Google Maps API and OverlayView must be loaded before creating AppointmentMarkerOverlay");
  }

  // Custom marker class for Google Maps
  class AppointmentMarkerOverlay extends window.google.maps.OverlayView {
    private appointment: Appointment;
    private position: { lat: number; lng: number };
    private div: HTMLElement | null = null;
    private onClick: () => void;
    private onHover: (hovered: boolean) => void;
    private isSelected: boolean;
    private isHovered: boolean;
    private isToday: boolean;
    private time: string;

  constructor(
    appointment: Appointment,
    position: { lat: number; lng: number },
    time: string,
    isSelected: boolean,
    isHovered: boolean,
    isToday: boolean,
    onClick: () => void,
    onHover: (hovered: boolean) => void
  ) {
    super();
    this.appointment = appointment;
    this.position = position;
    this.time = time;
    this.isSelected = isSelected;
    this.isHovered = isHovered;
    this.isToday = isToday;
    this.onClick = onClick;
    this.onHover = onHover;
  }

  onAdd(): void {
    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.cursor = "pointer";
    // Dynamic z-index: selected > hovered > normal
    // Use higher base z-index to ensure markers are above map tiles
    div.style.zIndex = this.isSelected ? "2000" : (this.isHovered ? "1500" : "1000");
    
    const statusColor = this.isToday ? "#f97316" : (STATUS_COLORS[this.appointment.status] || "#6b7280");
    const typeColor = TYPE_COLORS[this.appointment.appointment_type] || "#6b7280";
    const scale = this.isHovered ? 1.15 : 1;
    const size = 60;
    const pointerSize = 10;
    const borderColor = this.isSelected ? "#3B82F6" : typeColor;
    const borderWidth = this.isSelected ? 3 : 2.5;

    div.innerHTML = `
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size + pointerSize}px;
        transform: scale(${scale});
        transition: transform 0.3s ease-out;
      ">
        ${this.isSelected ? `
          <div class="selection-ring" style="
            position: absolute;
            top: -6px;
            left: -6px;
            width: ${size + 12}px;
            height: ${size + 12}px;
            border: 3px solid rgba(59, 130, 246, 0.4);
            border-radius: 50%;
            pointer-events: none;
            z-index: -1;
            animation: pulse 2s ease-in-out infinite;
          "></div>
        ` : ""}
        <div class="marker-circle" style="
          position: relative;
          width: ${size}px;
          height: ${size}px;
          background-color: ${statusColor};
          border: ${borderWidth}px solid ${borderColor};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: ${this.isSelected 
            ? "0 4px 16px rgba(59, 130, 246, 0.5), 0 2px 6px rgba(0,0,0,0.25)" 
            : "0 3px 10px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.1)"};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-weight: 600;
          font-size: 13px;
          color: white;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          transition: all 0.3s ease-out;
          z-index: 1;
        ">
          <div class="marker-time" style="
            position: relative;
            z-index: 1;
            text-align: center;
            line-height: 1.2;
            letter-spacing: 0.3px;
          ">${this.time}</div>
        </div>
        <div class="marker-pointer" style="
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: ${pointerSize}px solid transparent;
          border-right: ${pointerSize}px solid transparent;
          border-top: ${pointerSize}px solid ${statusColor};
          filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));
          z-index: 0;
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.1); }
        }
      </style>
    `;

    div.addEventListener("click", this.onClick);
    div.addEventListener("mouseenter", () => this.onHover(true));
    div.addEventListener("mouseleave", () => this.onHover(false));

    this.div = div;
    const panes = this.getPanes();
    if (panes) {
      panes.overlayMouseTarget.appendChild(div);
    }
  }

  onRemove(): void {
    if (this.div && this.div.parentNode) {
      this.div.parentNode.removeChild(this.div);
    }
  }

  draw(): void {
    if (!this.div) return;
    
    const projection = this.getProjection();
    if (!projection) return;

    const point = projection.fromLatLngToDivPixel(
      new window.google.maps.LatLng(this.position.lat, this.position.lng)
    );

    if (point) {
      // Position marker so the pointer tip is at the exact location
      // Size is 60px circle + 10px pointer = 70px total height
      // Offset by half circle width (30px) and full height (70px) to place pointer tip at location
      const size = 60;
      const pointerSize = 10;
      this.div.style.left = point.x - (size / 2) + "px";
      this.div.style.top = point.y - (size + pointerSize) + "px";
    }
  }

  updateState(isSelected: boolean, isHovered: boolean, isToday: boolean, time: string): void {
    this.isSelected = isSelected;
    this.isHovered = isHovered;
    this.isToday = isToday;
    this.time = time;
    if (this.div) {
      // Update in place instead of recreating to avoid map refresh
      const statusColor = this.isToday ? "#f97316" : (STATUS_COLORS[this.appointment.status] || "#6b7280");
      const typeColor = TYPE_COLORS[this.appointment.appointment_type] || "#6b7280";
      const scale = this.isHovered ? 1.15 : 1;
      const size = 60;
      const pointerSize = 10;
      const borderColor = this.isSelected ? "#3B82F6" : typeColor;
      const borderWidth = this.isSelected ? 3 : 2.5;
      
      // Update z-index dynamically: selected > hovered > normal
      this.div.style.zIndex = this.isSelected ? "2000" : (this.isHovered ? "1500" : "1000");
      
      // Update the container div
      const containerDiv = this.div.querySelector('div') as HTMLElement;
      if (containerDiv) {
        containerDiv.style.transform = `scale(${scale})`;
        
        // Update selection ring
        const selectionRing = containerDiv.querySelector('.selection-ring') as HTMLElement;
        if (selectionRing) {
          if (this.isSelected) {
            selectionRing.style.display = 'block';
          } else {
            selectionRing.style.display = 'none';
          }
        }
        
        // Update marker circle
        const markerCircle = containerDiv.querySelector('.marker-circle') as HTMLElement;
        if (markerCircle) {
          markerCircle.style.backgroundColor = statusColor;
          markerCircle.style.borderColor = borderColor;
          markerCircle.style.borderWidth = `${borderWidth}px`;
          markerCircle.style.boxShadow = this.isSelected 
            ? "0 4px 16px rgba(59, 130, 246, 0.5), 0 2px 6px rgba(0,0,0,0.25)" 
            : "0 3px 10px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.1)";
          
          // Update time text
          const timeDiv = markerCircle.querySelector('.marker-time') as HTMLElement;
          if (timeDiv) {
            timeDiv.textContent = this.time;
          }
        }
        
        // Update pointer
        const markerPointer = containerDiv.querySelector('.marker-pointer') as HTMLElement;
        if (markerPointer) {
          markerPointer.style.borderTopColor = statusColor;
        }
      }
      
      // Don't call draw() here - it's only for position updates, not visual state changes
      // The draw() method will be called automatically by Google Maps when needed
    }
  }
  }

  return AppointmentMarkerOverlay;
};

// Type for the marker overlay class
type AppointmentMarkerOverlay = InstanceType<ReturnType<typeof createAppointmentMarkerOverlay>>;

export const AppointmentMapView: React.FC<AppointmentMapViewProps> = ({
  appointments,
  loading,
  onAppointmentClick,
  selectedDate: propSelectedDate,
  onDateChange,
}) => {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [hoveredAppointment, setHoveredAppointment] = useState<Appointment | null>(null);
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [internalSelectedDate, setInternalSelectedDate] = useState<Date>(() => 
    propSelectedDate || startOfDay(new Date())
  );
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<AppointmentMarkerOverlay[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const warnedPatientsRef = useRef<Set<number>>(new Set());
  const AppointmentMarkerOverlayClassRef = useRef<ReturnType<typeof createAppointmentMarkerOverlay> | null>(null);
  const [scaleDistance, setScaleDistance] = useState<string>("");
  
  // Use prop if provided, otherwise use internal state
  const selectedDate = propSelectedDate || internalSelectedDate;
  
  const handleDateChange = useCallback((date: Date) => {
    setInternalSelectedDate(date);
    onDateChange?.(date);
  }, [onDateChange]);

  // Filter appointments for the selected date
  const filteredAppointments = useMemo(() => {
    if (!appointments || appointments.length === 0) return [];
    
    const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
    
    return appointments.filter((appointment) => {
      if (!appointment.appointment_date) return false;
      const appointmentDate = new Date(appointment.appointment_date);
      const appointmentDateStr = format(appointmentDate, "yyyy-MM-dd");
      return appointmentDateStr === selectedDateStr;
    });
  }, [appointments, selectedDate]);

  // Fetch patients and staff
  const { data: patientsData } = useGetList<Contact>("clients", {
    pagination: { page: 1, perPage: 10000 },
  }, {
    retry: false,
    enabled: true,
    onError: (error) => {
      console.warn("Failed to load patients:", error);
    },
  });
  
  const { data: staffData } = useGetList<Staff>("staff", {
    pagination: { page: 1, perPage: 1000 },
  }, {
    retry: false,
    enabled: true,
    onError: (error) => {
      console.warn("Failed to load staff:", error);
    },
  });

  // Create map of patients by ID
  const patientsMap = useMemo(() => {
    if (!patientsData) return new Map<number, Contact>();
    return new Map(patientsData.map((p) => [Number(p.id), p]));
  }, [patientsData]);

  // Create map of staff by ID
  const staffMap = useMemo(() => {
    if (!staffData) return new Map<number, Staff>();
    return new Map(staffData.map((s) => [Number(s.id), s]));
  }, [staffData]);

  // Process appointments with coordinates
  const appointmentMarkers = useMemo(() => {
    if (!filteredAppointments || filteredAppointments.length === 0) return [];
    
    const markers: Array<{
      appointment: Appointment;
      coordinates: { lat: number; lng: number };
      patient: Contact | null;
    }> = [];
    
    // Track coordinates to add small offsets for overlapping markers
    const coordinateMap = new Map<string, number>();
    
    filteredAppointments.forEach((appointment) => {
      const patient = patientsMap.get(Number(appointment.patient_id));
      let coords = getPatientCoordinates(patient);
      
      if (!coords) {
        coords = getFallbackCoordinates();
        if (patient && !warnedPatientsRef.current.has(patient.id)) {
          warnedPatientsRef.current.add(patient.id);
          console.warn(`Patient ${patient.id} missing coordinates, using fallback location`);
        }
      }
      
      // Create a key for this coordinate (rounded to avoid floating point issues)
      const coordKey = `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;
      const count = coordinateMap.get(coordKey) || 0;
      coordinateMap.set(coordKey, count + 1);
      
      // Add small offset for overlapping markers (spiral pattern)
      if (count > 0) {
        const angle = (count * 60) * (Math.PI / 180); // 60 degrees apart
        const radius = 0.0003 * count; // ~30 meters per marker
        coords = {
          lat: coords.lat + Math.cos(angle) * radius,
          lng: coords.lng + Math.sin(angle) * radius,
        };
      }
      
      markers.push({
        appointment,
        coordinates: coords,
        patient,
      });
    });
    
    return markers;
  }, [filteredAppointments, patientsMap]);

  // Initialize Google Maps
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("Google Maps API key not found. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file");
      return;
    }

    // Helper to check if API is fully loaded
    const isApiReady = () => {
      return window.google && 
             window.google.maps && 
             window.google.maps.OverlayView && 
             window.google.maps.Map;
    };

    // Check if Google Maps is already loaded
    if (isApiReady()) {
      initializeMap();
      return;
    }

    // Check if script is already being loaded or exists
    const existingScript = document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`);
    if (existingScript) {
      // Script already exists, wait for it to load
      if (isApiReady()) {
        initializeMap();
      } else {
        // Wait for API to be ready
        const checkReady = setInterval(() => {
          if (isApiReady()) {
            clearInterval(checkReady);
            initializeMap();
          }
        }, 100);
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkReady);
          if (!isApiReady()) {
            console.error("Google Maps API failed to load within timeout");
          }
        }, 10000);
      }
      return;
    }

    // Load Google Maps script
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // Wait for API to be fully ready (OverlayView might not be immediately available)
      const checkReady = setInterval(() => {
        if (isApiReady()) {
          clearInterval(checkReady);
          initializeMap();
        }
      }, 100);
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkReady);
        if (!isApiReady()) {
          console.error("Google Maps API failed to initialize within timeout");
        }
      }, 10000);
    };
    script.onerror = () => {
      console.error("Failed to load Google Maps API");
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (markersRef.current) {
        markersRef.current.forEach(marker => marker.onRemove());
        markersRef.current = [];
      }
    };
  }, []);

  const initializeMap = () => {
    if (!mapContainerRef.current || !window.google || !window.google.maps || mapRef.current) return;

    // Ensure OverlayView is available before creating the class
    if (!window.google.maps.OverlayView) {
      console.warn("OverlayView not yet available, retrying...");
      setTimeout(initializeMap, 100);
      return;
    }

    // Create the AppointmentMarkerOverlay class now that google is available
    if (!AppointmentMarkerOverlayClassRef.current) {
      try {
        AppointmentMarkerOverlayClassRef.current = createAppointmentMarkerOverlay();
      } catch (error) {
        console.error("Failed to create AppointmentMarkerOverlay:", error);
        return;
      }
    }

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      mapTypeId: mapType === "satellite" ? window.google.maps.MapTypeId.SATELLITE : window.google.maps.MapTypeId.ROADMAP,
      // Disable default map type controls
      mapTypeControl: false,
      // Disable other default controls we don't need
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true, // Keep zoom control
      scaleControl: false, // Disable default scale control - we'll add custom one
    });

    mapRef.current = map;
    setMapLoaded(true);

    // Calculate zoom level for 1.5km scale (for 100px width)
    const calculateZoomForDistance = (targetKm: number, lat: number): number => {
      const targetMeters = targetKm * 1000;
      const metersPerPixel = targetMeters / 100; // 100px scale bar
      const metersPerPixelAtEquator = 156543.03392;
      const zoom = Math.log2((metersPerPixelAtEquator * Math.cos((lat * Math.PI) / 180)) / metersPerPixel);
      return Math.round(zoom);
    };

    // Set initial zoom to show 1.5km
    const targetZoom = calculateZoomForDistance(1.5, DEFAULT_CENTER.lat);
    map.setZoom(targetZoom);

    // Update scale when zoom changes
    const updateScale = () => {
      if (!map || !window.google || !window.google.maps) return;
      
      const zoom = map.getZoom();
      if (zoom === null || zoom === undefined) return;

      // Calculate approximate distance in km for 100px at current zoom
      // This is an approximation based on zoom level
      const metersPerPixel = (156543.03392 * Math.cos((DEFAULT_CENTER.lat * Math.PI) / 180)) / Math.pow(2, zoom);
      const distanceMeters = metersPerPixel * 100; // 100px width
      const distanceKm = distanceMeters / 1000;

      // Round to a nice number
      let displayDistance: number;
      let unit: string;
      
      if (distanceKm >= 1) {
        // Round to nearest 0.5, 1, 2, 5, 10, etc.
        if (distanceKm < 2) {
          displayDistance = Math.round(distanceKm * 2) / 2;
        } else if (distanceKm < 5) {
          displayDistance = Math.round(distanceKm);
        } else if (distanceKm < 10) {
          displayDistance = Math.round(distanceKm / 5) * 5;
        } else {
          displayDistance = Math.round(distanceKm / 10) * 10;
        }
        unit = "km";
      } else {
        // Show in meters
        displayDistance = Math.round(distanceMeters / 100) * 100;
        unit = "m";
      }

      setScaleDistance(`${displayDistance} ${unit}`);
    };

    // Initial scale update (after a brief delay to ensure zoom is set)
    setTimeout(() => {
      updateScale();
    }, 100);

    // Update scale on zoom change
    map.addListener('zoom_changed', updateScale);
    map.addListener('bounds_changed', updateScale);
  };

  // Update map type
  useEffect(() => {
    if (mapRef.current && window.google && window.google.maps) {
      mapRef.current.setMapTypeId(
        mapType === "satellite" ? window.google.maps.MapTypeId.SATELLITE : window.google.maps.MapTypeId.ROADMAP
      );
    }
  }, [mapType]);

  // Optimized hover handler - only updates state when appointment actually changes
  const handleMarkerHover = useCallback((appointment: Appointment | null) => {
    setHoveredAppointment(prev => {
      // Only update if the appointment actually changed
      if (prev?.id === appointment?.id) {
        return prev; // No change, return previous to prevent re-render
      }
      return appointment;
    });
  }, []);

  // Update markers when appointments change (NOT when hover/selection changes)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !window.google || !window.google.maps || !AppointmentMarkerOverlayClassRef.current) return;

    // Remove existing markers
    markersRef.current.forEach(marker => marker.onRemove());
    markersRef.current = [];

    const AppointmentMarkerOverlayClass = AppointmentMarkerOverlayClassRef.current;

    // Add new markers
    appointmentMarkers.forEach((markerData) => {
      const appointment = markerData.appointment;
      const isSelected = selectedAppointment?.id === appointment.id;
      const isHovered = hoveredAppointment?.id === appointment.id;
      const isAppointmentToday = isToday(new Date(appointment.appointment_date || ''));
      
      // Format time as HH:MM
      const time = formatTimeForMarker(appointment.start_time);

      const marker = new AppointmentMarkerOverlayClass(
        appointment,
        markerData.coordinates,
        time,
        isSelected,
        isHovered,
        isAppointmentToday,
        () => {
          setSelectedAppointment(appointment);
          onAppointmentClick(appointment);
        },
        (hovered) => {
          // Use the optimized hover handler
          handleMarkerHover(hovered ? appointment : null);
        }
      );

      marker.setMap(mapRef.current);
      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers, but with maximum zoom constraint (prevent zooming in too much)
    // Only do this when markers are actually added/removed, not on hover/selection changes
    if (appointmentMarkers.length > 0 && mapRef.current && window.google && window.google.maps) {
      const bounds = new window.google.maps.LatLngBounds();
      appointmentMarkers.forEach(marker => {
        bounds.extend(marker.coordinates);
      });
      
      // Calculate maximum allowed zoom for 1.5km scale (this is the minimum zoom level we want)
      const calculateZoomForDistance = (targetKm: number, lat: number): number => {
        const targetMeters = targetKm * 1000;
        const metersPerPixel = targetMeters / 100;
        const metersPerPixelAtEquator = 156543.03392;
        const zoom = Math.log2((metersPerPixelAtEquator * Math.cos((lat * Math.PI) / 180)) / metersPerPixel);
        return Math.round(zoom);
      };
      
      const maxAllowedZoom = calculateZoomForDistance(1.5, DEFAULT_CENTER.lat);
      
      // Get the center of bounds for setting zoom manually if needed
      const boundsCenter = bounds.getCenter();
      
      // Fit bounds but limit maximum zoom
      mapRef.current.fitBounds(bounds, { padding: 50 });
      
      // Check if current zoom exceeded our limit and adjust if needed
      setTimeout(() => {
        if (mapRef.current) {
          const currentZoom = mapRef.current.getZoom();
          if (currentZoom !== null && currentZoom !== undefined && currentZoom > maxAllowedZoom) {
            // If zoomed in too much, set to max allowed zoom and center on bounds
            mapRef.current.setZoom(maxAllowedZoom);
            mapRef.current.setCenter(boundsCenter);
          }
        }
      }, 100);
    }
  }, [appointmentMarkers, mapLoaded, onAppointmentClick, handleMarkerHover]); // Removed selectedAppointment and hoveredAppointment from dependencies

  // Update marker states when selection/hover changes
  useEffect(() => {
    markersRef.current.forEach((marker, index) => {
      const appointment = appointmentMarkers[index]?.appointment;
      if (appointment) {
        const isSelected = selectedAppointment?.id === appointment.id;
        const isHovered = hoveredAppointment?.id === appointment.id;
        const isAppointmentToday = isToday(new Date(appointment.appointment_date || ''));
        
        // Format time as HH:MM
        const time = formatTimeForMarker(appointment.start_time);

        marker.updateState(isSelected, isHovered, isAppointmentToday, time);
      }
    });
  }, [selectedAppointment, hoveredAppointment, appointmentMarkers]);

  const handleMarkerClick = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    onAppointmentClick(appointment);
  }, [onAppointmentClick]);

  const handleInfoWindowClose = useCallback(() => {
    setHoveredAppointment(null);
  }, []);

  const handleFitToMap = useCallback(() => {
    if (mapRef.current && appointmentMarkers.length > 0 && window.google && window.google.maps) {
      const bounds = new window.google.maps.LatLngBounds();
      appointmentMarkers.forEach(marker => {
        bounds.extend(marker.coordinates);
      });
      
      // Calculate maximum allowed zoom for 1.5km scale
      const calculateZoomForDistance = (targetKm: number, lat: number): number => {
        const targetMeters = targetKm * 1000;
        const metersPerPixel = targetMeters / 100;
        const metersPerPixelAtEquator = 156543.03392;
        const zoom = Math.log2((metersPerPixelAtEquator * Math.cos((lat * Math.PI) / 180)) / metersPerPixel);
        return Math.round(zoom);
      };
      
      const maxAllowedZoom = calculateZoomForDistance(1.5, DEFAULT_CENTER.lat);
      const boundsCenter = bounds.getCenter();
      
      mapRef.current.fitBounds(bounds, { padding: 50 });
      
      // Ensure we don't zoom in beyond maximum allowed
      setTimeout(() => {
        if (mapRef.current) {
          const currentZoom = mapRef.current.getZoom();
          if (currentZoom !== null && currentZoom !== undefined && currentZoom > maxAllowedZoom) {
            mapRef.current.setZoom(maxAllowedZoom);
            mapRef.current.setCenter(boundsCenter);
          }
        }
      }, 100);
    }
  }, [appointmentMarkers]);

  const handleMapTypeChange = useCallback((type: "roadmap" | "satellite") => {
    setMapType(type);
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[625px] rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col" style={{ flex: "1 1 auto", minHeight: 0 }}>
      {/* Map Container */}
      <div className="w-full flex-1 relative" style={{ minHeight: "800px", height: "100%" }}>
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%", minHeight: "800px" }} />
        
        {/* Map Controls Overlay */}
        <div className="absolute top-2 left-2 z-[1000] flex flex-col gap-2">
          {/* Map Type Toggle */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
            <Button
              type="button"
              variant={mapType === "roadmap" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleMapTypeChange("roadmap")}
              className="rounded-none border-0 h-8 px-3 text-xs"
            >
              Map
            </Button>
            <Button
              type="button"
              variant={mapType === "satellite" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleMapTypeChange("satellite")}
              className="rounded-none border-0 h-8 px-3 text-xs"
            >
              Satellite
            </Button>
          </div>
        </div>
        
        {/* Fit to Map Button - Positioned over Google logo on the map */}
        <div 
          className="absolute pointer-events-auto" 
          style={{ 
            position: 'absolute',
            bottom: '32px', 
            left: '18px',
            zIndex: 10000,
            pointerEvents: 'auto'
          }}
        >
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleFitToMap}
            className="bg-white hover:bg-slate-50 text-slate-900 shadow-lg border border-slate-200 h-9 px-3 text-xs"
            style={{ pointerEvents: 'auto' }}
          >
            <MapPin className="w-4 h-4 mr-1.5" />
            Fit to Map
          </Button>
        </div>
        
        {/* Info Window Overlay */}
        {hoveredAppointment && (
          <AppointmentInfoWindow
            appointment={hoveredAppointment}
            patient={patientsMap.get(Number(hoveredAppointment.patient_id)) || null}
            staff={hoveredAppointment.primary_staff_id ? staffMap.get(Number(hoveredAppointment.primary_staff_id)) : null}
            markerPosition={appointmentMarkers.find(m => m.appointment.id === hoveredAppointment.id)?.coordinates}
            onClose={handleInfoWindowClose}
          />
        )}
      </div>
    </div>
  );
};
