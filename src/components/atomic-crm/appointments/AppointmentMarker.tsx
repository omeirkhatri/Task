import React, { useRef, useEffect, useState, useMemo } from "react";
import { Marker, useMap } from "react-leaflet";
import L from "leaflet";
import type { Appointment, Contact, Staff } from "../types";
import { APPOINTMENT_TYPES, APPOINTMENT_STATUSES } from "./types";
import { format } from "date-fns";

type AppointmentMarkerProps = {
  position: [number, number];
  appointment: Appointment;
  patient: Contact | null;
  staff: Staff | null;
  isSelected: boolean;
  isHovered: boolean;
  isToday?: boolean;
  onClick: () => void;
  onHover: (hovered: boolean) => void;
};

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

// Create custom marker icon
const createMarkerIcon = (
  status: string,
  type: string,
  time: string,
  isSelected: boolean,
  isHovered: boolean,
  isToday: boolean = false
): L.DivIcon => {
  // Use orange for today's appointments
  const statusColor = isToday ? "#f97316" : (STATUS_COLORS[status] || "#6b7280");
  const typeColor = TYPE_COLORS[type] || "#6b7280";
  const scale = isHovered ? 1.25 : 1;
  const size = 48 * scale;
  const pointerSize = 8 * scale;
  
  // Status indicator dot
  const statusDot = `
    <div style="
      position: absolute;
      top: 2px;
      right: 2px;
      width: 6px;
      height: 6px;
      background-color: ${statusColor};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      z-index: 10;
    "></div>
  `;
  
  // Selection ring
  const selectionRing = isSelected ? `
    <div style="
      position: absolute;
      top: -4px;
      left: -4px;
      width: ${size + 8}px;
      height: ${size + 8}px;
      border: 4px solid rgba(59, 130, 246, 0.3);
      border-radius: 12px;
      pointer-events: none;
      z-index: -1;
    "></div>
  ` : "";
  
  // Hover glow
  const hoverGlow = isHovered ? `
    <div style="
      position: absolute;
      top: -2px;
      left: -2px;
      width: ${size + 4}px;
      height: ${size + 4}px;
      border: 2px solid rgba(255, 255, 255, 0.5);
      border-radius: 10px;
      pointer-events: none;
      z-index: -1;
    "></div>
  ` : "";
  
  // Inner glow effect
  const innerGlow = `
    <div style="
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at center, rgba(255,255,255,0.2) 0%, transparent 70%);
      border-radius: 8px;
      pointer-events: none;
    "></div>
  `;
  
  const borderColor = isSelected ? "#3B82F6" : typeColor;
  
  return L.divIcon({
    className: "appointment-marker",
    html: `
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
        transform: scale(${scale});
        transition: transform 0.3s ease-out;
      ">
        ${selectionRing}
        ${hoverGlow}
        <div style="
          position: relative;
          width: ${size}px;
          height: ${size}px;
          background-color: ${statusColor};
          border: 2.5px solid ${borderColor};
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: ${isSelected 
            ? "0 4px 12px rgba(59, 130, 246, 0.4), 0 2px 4px rgba(0,0,0,0.2)" 
            : "0 2px 8px rgba(0,0,0,0.15)"};
          cursor: pointer;
          font-family: Arial, sans-serif;
          font-weight: bold;
          font-size: ${12 * scale}px;
          color: white;
          text-shadow: 
            -1px -1px 0 #000,
            1px -1px 0 #000,
            -1px 1px 0 #000,
            1px 1px 0 #000;
        ">
          ${innerGlow}
          ${statusDot}
          <div style="
            position: relative;
            z-index: 1;
            text-align: center;
            line-height: 1;
          ">${time}</div>
        </div>
        <div style="
          position: absolute;
          bottom: -${pointerSize}px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: ${pointerSize}px solid transparent;
          border-right: ${pointerSize}px solid transparent;
          border-top: ${pointerSize}px solid ${statusColor};
          filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2));
        "></div>
      </div>
    `,
    iconSize: [size, size + pointerSize],
    iconAnchor: [size / 2, size + pointerSize],
    popupAnchor: [0, -(size + pointerSize)],
  });
};

export const AppointmentMarker: React.FC<AppointmentMarkerProps> = ({
  position,
  appointment,
  isSelected,
  isHovered,
  isToday = false,
  onClick,
  onHover,
}) => {
  const markerRef = useRef<L.Marker>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Format time
  const time = useMemo(() => {
    try {
      const timeStr = appointment.start_time;
      if (timeStr) {
        // Handle both HH:MM:SS and HH:MM formats
        const parts = timeStr.split(":");
        if (parts.length >= 2) {
          return `${parts[0]}:${parts[1]}`;
        }
      }
      return "00:00";
    } catch {
      return "00:00";
    }
  }, [appointment.start_time]);
  
  // Update icon when state changes
  useEffect(() => {
    if (markerRef.current) {
      const icon = createMarkerIcon(
        appointment.status,
        appointment.appointment_type,
        time,
        isSelected,
        isHovered,
        isToday
      );
      markerRef.current.setIcon(icon);
    }
  }, [appointment.status, appointment.appointment_type, time, isSelected, isHovered, isToday]);
  
  // Bounce animation on hover
  useEffect(() => {
    if (isHovered && !isAnimating) {
      setIsAnimating(true);
      const marker = markerRef.current;
      if (marker) {
        const element = marker.getElement();
        if (element) {
          element.style.animation = "bounce 0.75s ease-out";
          setTimeout(() => {
            if (element) {
              element.style.animation = "";
            }
            setIsAnimating(false);
          }, 750);
        }
      }
    }
  }, [isHovered, isAnimating]);
  
  // Ripple effect on click
  const handleClick = () => {
    const marker = markerRef.current;
    if (marker) {
      const element = marker.getElement();
      if (element) {
        // Add ripple animation
        element.style.animation = "ping 0.6s ease-out";
        setTimeout(() => {
          if (element) {
            element.style.animation = "";
          }
        }, 600);
      }
    }
    onClick();
  };
  
  return (
    <>
      <Marker
        ref={markerRef}
        position={position}
        icon={createMarkerIcon(
          appointment.status,
          appointment.appointment_type,
          time,
          isSelected,
          isHovered,
          isToday
        )}
        eventHandlers={{
          click: handleClick,
          mouseover: () => onHover(true),
          mouseout: () => onHover(false),
        }}
      />
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          25% { transform: translateY(-8px) scale(1.05); }
          50% { transform: translateY(-4px) scale(1.02); }
          75% { transform: translateY(-2px) scale(1.01); }
        }
        
        @keyframes ping {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        
        .appointment-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </>
  );
};

