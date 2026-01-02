import React, { useEffect, useState, useRef } from "react";
import { X, Clock, MapPin, Users } from "lucide-react";
import type { Appointment, Contact, Staff } from "../types";
import { APPOINTMENT_TYPES, APPOINTMENT_STATUSES } from "./types";
import { format } from "date-fns";
import { formatCrmDate, extractCrmTime, getCrmTimeZone } from "../misc/timezone";

type AppointmentInfoWindowProps = {
  appointment: Appointment;
  patient: Contact | null;
  staff: Staff | null;
  markerPosition: [number, number] | undefined;
  onClose: () => void;
};

// Status badge configs
const STATUS_BADGES: Record<string, { bg: string; text: string; icon: string }> = {
  completed: {
    bg: "#f0fdf4",
    text: "#10b981",
    icon: "✓",
  },
  cancelled: {
    bg: "#fef2f2",
    text: "#ef4444",
    icon: "✕",
  },
  confirmed: {
    bg: "#eff6ff",
    text: "#3b82f6",
    icon: "✓",
  },
  scheduled: {
    bg: "#fffbeb",
    text: "#f59e0b",
    icon: "⏰",
  },
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

// Helper to construct address
const getPatientAddress = (patient: Contact | null): string => {
  if (!patient) return "Address not available";
  
  const parts = [
    patient.flat_villa_number,
    patient.building_street,
    patient.area,
    patient.city,
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(", ") : "Address not available";
};

// Format time
const formatTime = (timeStr: string): string => {
  try {
    const parts = timeStr.split(":");
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
  } catch {
    return timeStr;
  }
};

export const AppointmentInfoWindow: React.FC<AppointmentInfoWindowProps> = ({
  appointment,
  patient,
  staff,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [mouseInside, setMouseInside] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const infoWindowRef = useRef<HTMLDivElement>(null);
  
  const appointmentType = APPOINTMENT_TYPES.find(t => t.value === appointment.appointment_type);
  const statusConfig = APPOINTMENT_STATUSES.find(s => s.value === appointment.status);
  const statusBadge = STATUS_BADGES[appointment.status] || STATUS_BADGES.scheduled;
  const typeColor = TYPE_COLORS[appointment.appointment_type] || "#6b7280";
  
  // Show with fade-in
  useEffect(() => {
    setIsVisible(true);
  }, []);
  
  // Handle mouse leave with delay
  const handleMouseLeave = () => {
    setMouseInside(false);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      if (!mouseInside) {
        onClose();
      }
    }, 400);
  };
  
  const handleMouseEnter = () => {
    setMouseInside(true);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
  };
  
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);
  
  const patientName = patient 
    ? `${patient.first_name || ""} ${patient.last_name || ""}`.trim() || "Unknown Patient"
    : "Unknown Patient";
  
  const address = getPatientAddress(patient);
  
  // Format date and time in a readable format using CRM timezone
  let fullDateTime = "Date and time not available";
  
  try {
    const dateStr = appointment.appointment_date;
    const timeStr = appointment.start_time;
    
    // Parse the date and time to a Date object
    let dateObj: Date | null = null;
    
    // Priority: use start_time if it's a full ISO string, otherwise combine date and time
    if (timeStr) {
      // Check if start_time is already a full ISO datetime string
      if (timeStr.includes('T') || timeStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        // It's already a full datetime string
        dateObj = new Date(timeStr);
      } else if (dateStr) {
        // Combine date and time strings
        // Ensure time has seconds if missing
        const timeWithSeconds = timeStr.includes(':') && timeStr.split(':').length === 2 
          ? `${timeStr}:00` 
          : timeStr;
        const combined = `${dateStr}T${timeWithSeconds}`;
        dateObj = new Date(combined);
      }
    } else if (dateStr) {
      // Only date available
      if (dateStr.includes('T')) {
        dateObj = new Date(dateStr);
      } else {
        dateObj = new Date(`${dateStr}T00:00:00`);
      }
    }
    
    if (dateObj && !isNaN(dateObj.getTime())) {
      // Format date: "Tuesday, December 2, 2025" using CRM timezone
      const formattedDate = format(dateObj, "EEEE, MMMM d, yyyy", {
        timeZone: getCrmTimeZone()
      });
      
      // Format time in CRM timezone: "04:00 AM" (12-hour format)
      const crmTimeStr = extractCrmTime(dateObj);
      const [hoursStr, minutesStr] = crmTimeStr.split(":");
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr || '0', 10);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const formattedTime = `${displayHours}:${minutesStr.padStart(2, '0')} ${ampm}`;
      
      // Combine for display
      fullDateTime = `${formattedDate} • ${formattedTime}`;
    } else {
      // Fallback: try to format manually from strings
      if (dateStr && timeStr) {
        // Extract date parts
        const dateMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        const timeMatch = timeStr.match(/(\d{2}):(\d{2})/);
        
        if (dateMatch && timeMatch) {
          const [, year, month, day] = dateMatch;
          const [, hourStr, minuteStr] = timeMatch;
          
          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                             'July', 'August', 'September', 'October', 'November', 'December'];
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          
          const dateNum = parseInt(day, 10);
          const monthNum = parseInt(month, 10) - 1;
          const yearNum = parseInt(year, 10);
          const hour = parseInt(hourStr, 10);
          const minute = parseInt(minuteStr, 10);
          
          // Get day name
          const tempDate = new Date(yearNum, monthNum, dateNum);
          const dayName = dayNames[tempDate.getDay()];
          
          const formattedDate = `${dayName}, ${monthNames[monthNum]} ${dateNum}, ${yearNum}`;
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour % 12 || 12;
          const formattedTime = `${displayHour}:${minuteStr} ${ampm}`;
          
          fullDateTime = `${formattedDate} • ${formattedTime}`;
        }
      }
    }
  } catch (error) {
    console.error('Error formatting date/time:', error);
    // Final fallback
    if (appointment.appointment_date && appointment.start_time) {
      fullDateTime = `${appointment.appointment_date} • ${formatTime(appointment.start_time)}`;
    } else if (appointment.appointment_date) {
      fullDateTime = appointment.appointment_date;
    } else if (appointment.start_time) {
      fullDateTime = formatTime(appointment.start_time);
    }
  }
  
  const staffName = staff 
    ? `${staff.first_name || ""} ${staff.last_name || ""}`.trim() || "Unassigned"
    : "Unassigned";
  
  return (
    <div
      ref={infoWindowRef}
      className="absolute z-[1000] pointer-events-auto"
      style={{
        top: "20px",
        right: "20px",
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.2s ease-in",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
        style={{
          maxWidth: "320px",
          minWidth: "280px",
        }}
      >
        {/* Header */}
        <div
          className="relative px-4 pt-4 pb-3"
          style={{
            background: `linear-gradient(to bottom, rgba(59, 130, 246, 0.08), transparent)`,
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            style={{ zIndex: 10 }}
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
          
          {/* Patient name and status */}
          <div className="pr-10 mb-3">
            <div className="flex items-center gap-3 mb-2">
              <h3
                className="font-semibold text-gray-900 flex-1"
                style={{ fontSize: "16px", lineHeight: "1.4" }}
              >
                {patientName}
              </h3>
              <span
                className="px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 whitespace-nowrap"
                style={{
                  backgroundColor: statusBadge.bg,
                  color: statusBadge.text,
                  fontSize: "12px",
                }}
              >
                <Clock className="w-3.5 h-3.5" />
                {statusConfig?.label || appointment.status}
              </span>
            </div>
            
            {/* Appointment type button */}
            <div>
              <span
                className="inline-block px-3 py-1.5 rounded text-sm font-medium text-white"
                style={{
                  backgroundColor: typeColor,
                  fontSize: "12px",
                }}
              >
                {appointmentType?.label || appointment.appointment_type}
              </span>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-4 pb-4 pt-2 space-y-4">
          {/* Time */}
          <div className="flex items-start gap-3">
            <div
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: "#f3f4f6" }}
            >
              <Clock className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-gray-500 mb-1" style={{ fontSize: "11px", lineHeight: "1.3", fontWeight: "500" }}>
                Time
              </div>
              <div className="text-gray-900 font-medium" style={{ fontSize: "14px", lineHeight: "1.5" }}>
                {fullDateTime}
              </div>
            </div>
          </div>
          
          {/* Staff */}
          <div className="flex items-start gap-3">
            <div
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: "#f3f4f6" }}
            >
              <Users className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-gray-500 mb-1" style={{ fontSize: "11px", lineHeight: "1.3", fontWeight: "500" }}>
                Staff
              </div>
              <div className="text-gray-900" style={{ fontSize: "14px", lineHeight: "1.5" }}>
                {staff ? staffName : "Staff not assigned"}
              </div>
            </div>
          </div>
          
          {/* Address */}
          <div className="flex items-start gap-3">
            <div
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: "#f3f4f6" }}
            >
              <MapPin className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-gray-500 mb-1" style={{ fontSize: "11px", lineHeight: "1.3", fontWeight: "500" }}>
                Address
              </div>
              <div className="text-gray-900" style={{ fontSize: "14px", lineHeight: "1.5" }}>
                {address}
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};

