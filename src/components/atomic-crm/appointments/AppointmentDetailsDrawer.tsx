import React from "react";
import { X, User, Calendar, Clock, Stethoscope, Car, FileText, MapPin, Phone, ExternalLink, Printer, Copy, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import type { Appointment } from "../types";
import { APPOINTMENT_STATUSES } from "./types";
import { useAppointmentTypes } from "./useAppointmentTypes";
import { useGetList } from "ra-core";
import type { Contact, Staff } from "../types";
import { formatCrmDate, formatCrmTime } from "../misc/timezone";

type AppointmentDetailsDrawerProps = {
  open: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onEdit: (appointment: Appointment) => void;
  onDelete: (appointment: Appointment) => void;
};

export const AppointmentDetailsDrawer: React.FC<AppointmentDetailsDrawerProps> = ({
  open,
  onClose,
  appointment,
  onEdit,
  onDelete,
}) => {
  const { data: patients } = useGetList<Contact>("clients", {
    pagination: { page: 1, perPage: 1000 },
  });
  const { data: staff } = useGetList<Staff>("staff", {
    pagination: { page: 1, perPage: 1000 },
  });
  const appointmentTypes = useAppointmentTypes();

  if (!appointment) return null;

  const patient = patients?.find((p) => p.id === appointment.patient_id);
  const primaryStaff = staff?.find((s) => s.id === appointment.primary_staff_id);
  const driver = staff?.find((s) => s.id === appointment.driver_id);
  const appointmentType = appointmentTypes.find((t) => t.value === appointment.appointment_type);
  const status = APPOINTMENT_STATUSES.find((s) => s.value === appointment.status);

  // Parse times using the timezone utility to ensure correct Dubai timezone display
  const startTimeDate = appointment.start_time ? new Date(appointment.start_time) : null;
  const endTimeDate = appointment.end_time ? new Date(appointment.end_time) : null;
  const startTimeStr = startTimeDate ? formatCrmTime(startTimeDate) : "";
  const endTimeStr = endTimeDate ? formatCrmTime(endTimeDate) : "";

  const handlePrint = () => {
    window.open(`/print/appointment/${appointment.id}`, "_blank");
  };

  const handleCopy = () => {
    // TODO: Implement copy functionality
    console.log("Copy appointment:", appointment.id);
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 transition-transform duration-200 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Appointment Details</h2>
              {appointmentType && (
                <p className="text-gray-600 mt-1">{appointmentType.label}</p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-200px)] p-6 space-y-6">
          {/* Patient Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold">Patient Information</h3>
            </div>
            {patient && (
              <div className="space-y-2">
                <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                {patient.phone_jsonb && patient.phone_jsonb.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{patient.phone_jsonb[0].number}</span>
                  </div>
                )}
                {(patient.building_street || patient.area) && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {[patient.building_street, patient.area, patient.city]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}
                {patient.google_maps_link && (
                  <a
                    href={patient.google_maps_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in Google Maps
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Appointment Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold">Appointment Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Date</p>
                <p className="font-medium">{formatCrmDate(appointment.appointment_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Time</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <p className="font-medium">
                    {startTimeStr && endTimeStr ? `${startTimeStr} - ${endTimeStr}` : "N/A"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="font-medium">{appointment.duration_minutes} minutes</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                {status && (
                  <Badge
                    className={`${
                      status.value === "confirmed"
                        ? "bg-blue-100 text-blue-700"
                        : status.value === "scheduled"
                        ? "bg-yellow-100 text-yellow-700"
                        : status.value === "cancelled"
                        ? "bg-red-100 text-red-700"
                        : status.value === "completed"
                        ? "bg-green-100 text-green-700"
                        : ""
                    }`}
                  >
                    {status.label}
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600">Type</p>
                {appointmentType && (
                  <Badge
                    style={{
                      backgroundColor: appointmentType.color + "20",
                      color: appointmentType.color,
                    }}
                  >
                    {appointmentType.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Staff Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Stethoscope className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold">Staff Details</h3>
            </div>
            <div className="space-y-2">
              {primaryStaff && (
                <div className="p-3 bg-white rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{primaryStaff.first_name} {primaryStaff.last_name}</p>
                    <Badge className="bg-blue-100 text-blue-700">Primary</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{primaryStaff.staff_type} {primaryStaff.specialization && `- ${primaryStaff.specialization}`}</p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{primaryStaff.phone}</span>
                  </div>
                </div>
              )}
              {driver && (
                <div className="p-3 bg-white rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{driver.first_name} {driver.last_name}</p>
                    <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      Driver
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{driver.staff_type}</p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{driver.phone}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Transportation */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Car className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold">Transportation</h3>
            </div>
            {driver ? (
              <p className="text-sm">{driver.first_name} {driver.last_name} - {driver.phone}</p>
            ) : (
              <p className="text-sm text-gray-600">Self Transport</p>
            )}
          </div>

          {/* Notes and Instructions */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold">Notes and Instructions</h3>
            </div>
            <div className="space-y-3">
              {appointment.mini_notes && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Brief Notes</p>
                  <p className="text-sm text-gray-600">{appointment.mini_notes}</p>
                </div>
              )}
              {appointment.full_notes && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Detailed Notes</p>
                  <p className="text-sm text-gray-600">{appointment.full_notes}</p>
                </div>
              )}
              {appointment.pickup_instructions && (
                <div className="border border-orange-200 rounded-lg p-3 bg-orange-50">
                  <p className="text-sm font-medium text-orange-700 mb-1">Pickup Instructions</p>
                  <p className="text-sm text-orange-700">{appointment.pickup_instructions}</p>
                </div>
              )}
              {appointment.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">General Notes</p>
                  <p className="text-sm text-gray-600">{appointment.notes}</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-6">
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button
              onClick={() => onEdit(appointment)}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => onDelete(appointment)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

