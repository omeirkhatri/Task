export type AppointmentFilterState = {
  staffIds: string[];
  appointmentTypes: string[];
  statuses: string[];
  dateFrom: string | null;
  dateTo: string | null;
};

export type AppointmentViewMode = "calendar" | "table" | "map";

export type AppointmentTypeConfig = {
  value: string;
  label: string;
  color: string;
  serviceId?: string | number; // Optional service ID for unique identification
  appointmentType?: string; // The mapped appointment type value for database storage
};

export type StatusConfig = {
  value: string;
  label: string;
  color: string;
  icon?: string;
};

export const APPOINTMENT_TYPES: AppointmentTypeConfig[] = [
  { value: "doctor_on_call", label: "Doctor on Call", color: "#3b82f6" },
  { value: "lab_test", label: "Lab Test", color: "#10b981" },
  { value: "teleconsultation", label: "Teleconsultation", color: "#8b5cf6" },
  { value: "physiotherapy", label: "Physiotherapy", color: "#f59e0b" },
  { value: "caregiver", label: "Caregiver", color: "#ef4444" },
  { value: "iv_therapy", label: "IV Therapy", color: "#06b6d4" },
];

export const APPOINTMENT_STATUSES: StatusConfig[] = [
  { value: "scheduled", label: "Scheduled", color: "#f59e0b", icon: "Clock" },
  { value: "completed", label: "Completed", color: "#10b981", icon: "CheckCircle" },
  { value: "cancelled", label: "Cancelled", color: "#ef4444", icon: "XCircle" },
];


