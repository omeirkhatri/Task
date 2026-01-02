import { useMemo } from "react";
import { useGetList } from "ra-core";
import type { Service } from "../types";
import type { AppointmentTypeConfig } from "./types";

// Default color palette for services
const DEFAULT_COLORS = [
  "#3b82f6", // blue
  "#a855f7", // purple
  "#10b981", // green
  "#f97316", // orange
  "#ec4899", // pink
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#14b8a6", // teal
];

// Map service names to colors for consistency
const SERVICE_COLOR_MAP: Record<string, string> = {
  "doctor on call": "#3b82f6",
  "lab test": "#a855f7",
  "teleconsultation": "#10b981",
  "physiotherapy": "#f97316",
  "caregiver": "#ec4899",
  "iv therapy": "#ef4444",
  "nurse on call": "#06b6d4",
  "blood test": "#8b5cf6",
  "nanny": "#14b8a6",
  "elderly care": "#f59e0b",
};

// Map service names to allowed appointment_type constraint values
// These are the only values allowed by the database constraint
const SERVICE_TO_APPOINTMENT_TYPE_MAP: Record<string, string> = {
  "doctor on call": "doctor_on_call",
  "nurse on call": "doctor_on_call", // Map to doctor_on_call as closest match
  "lab test": "lab_test",
  "blood test": "lab_test", // Map to lab_test
  "teleconsultation": "teleconsultation",
  "physiotherapy": "physiotherapy",
  "caregiver": "caregiver",
  "nanny": "caregiver", // Map to caregiver
  "elderly care": "caregiver", // Map to caregiver
  "iv therapy": "iv_therapy",
};

// Allowed appointment type values (from database constraint)
const ALLOWED_APPOINTMENT_TYPES = [
  "doctor_on_call",
  "lab_test",
  "teleconsultation",
  "physiotherapy",
  "caregiver",
  "iv_therapy",
] as const;

/**
 * Hook to fetch services from the database and convert them to appointment types
 */
export const useAppointmentTypes = (): AppointmentTypeConfig[] => {
  const { data: services } = useGetList<Service>("services", {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: "name", order: "ASC" },
  });

  return useMemo(() => {
    if (!services || services.length === 0) {
      // Fallback to default types if no services found
      return [
        { value: "doctor_on_call", label: "Doctor on Call", color: "#3b82f6" },
        { value: "lab_test", label: "Lab Test", color: "#a855f7" },
        { value: "teleconsultation", label: "Teleconsultation", color: "#10b981" },
        { value: "physiotherapy", label: "Physiotherapy", color: "#f97316" },
        { value: "caregiver", label: "Caregiver", color: "#ec4899" },
        { value: "iv_therapy", label: "IV Therapy", color: "#ef4444" },
      ];
    }

    // Map all services to appointment types - show all services from Services Management
    // Use service ID as the value to ensure uniqueness, but store the mapped appointment_type
    return services.map((service, index) => {
      // Map service name to allowed appointment_type value
      const serviceNameLower = service.name.toLowerCase();
      const mappedType = SERVICE_TO_APPOINTMENT_TYPE_MAP[serviceNameLower] || 
                    (serviceNameLower.replace(/\s+/g, "_") as string);
      
      // Validate that the mapped type is in the allowed list, fallback to first allowed type if not
      const appointmentType = ALLOWED_APPOINTMENT_TYPES.includes(mappedType as any) 
        ? mappedType 
        : ALLOWED_APPOINTMENT_TYPES[0];
      
      // Get color from database first, then fallback to map or default
      const color = service.color || SERVICE_COLOR_MAP[serviceNameLower] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];

      return {
        value: `service_${service.id}`, // Use service ID as unique value
        label: service.name, // Use the exact service name from Services Management
        color,
        serviceId: service.id, // Include service ID for unique identification
        appointmentType, // Store the mapped appointment type for submission
      };
    });
  }, [services]);
};

