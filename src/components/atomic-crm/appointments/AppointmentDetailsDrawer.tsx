import React, { useState } from "react";
import { X, User, Calendar, Clock, Stethoscope, Car, FileText, MapPin, Phone, ExternalLink, Printer, Copy, Edit, Trash2, CreditCard, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Appointment, PaymentPackage, Service, PaymentTransaction } from "../types";
import { APPOINTMENT_STATUSES } from "./types";
import { useAppointmentTypes } from "./useAppointmentTypes";
import { useGetList, useRefresh } from "ra-core";
import type { Contact, Staff } from "../types";
import { formatCrmDate, formatCrmTime } from "../misc/timezone";
import { Link } from "react-router";
import { usePackageUsage } from "@/hooks/usePackageUsage";
import { PaymentCreateDialog } from "../payments/PaymentCreateDialog";

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
  // All hooks must be called before any early returns
  const { data: patients } = useGetList<Contact>("clients", {
    pagination: { page: 1, perPage: 1000 },
  });
  const { data: staff } = useGetList<Staff>("staff", {
    pagination: { page: 1, perPage: 1000 },
  });
  const appointmentTypes = useAppointmentTypes();
  
  const refresh = useRefresh();
  
  // Fetch payment package if linked
  const { data: paymentPackages } = useGetList<PaymentPackage>("payment_packages", {
    pagination: { page: 1, perPage: 1 },
    filter: appointment?.payment_package_id ? { id: appointment.payment_package_id } : {},
  }, { enabled: !!appointment?.payment_package_id });
  
  const paymentPackage = paymentPackages?.[0];
  
  // Fetch standalone payments linked to this appointment
  const { data: standalonePayments } = useGetList<PaymentTransaction>("payment_transactions", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "date_paid", order: "DESC" },
    filter: appointment?.id ? { appointment_id: appointment.id, "payment_package_id@is": null } : { id: -1 }, // Only standalone payments
  }, { enabled: !!appointment?.id });
  
  // Fetch service for payment package
  const { data: services } = useGetList<Service>("services", {
    pagination: { page: 1, perPage: 1000 },
  });
  
  // Get package usage if package exists
  const { sessionsUsed, hoursUsed } = usePackageUsage(paymentPackage?.id);
  
  // State for payment creation dialog
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  // Calculate total standalone payments
  const totalStandaloneAmount = standalonePayments?.reduce((sum, payment) => sum + (payment.amount_received || 0), 0) || 0;

  // Get all assigned staff from staff_ids array
  const assignedStaff = React.useMemo(() => {
    if (!staff || !appointment?.staff_ids || appointment.staff_ids.length === 0) return [];
    return appointment.staff_ids
      .map((staffId) => staff.find((s) => s.id === staffId))
      .filter((s): s is Staff => s !== undefined);
  }, [staff, appointment?.staff_ids]);
  
  // Find selected appointment types - use selected_service_ids from custom_fields if available
  // Otherwise fall back to showing the first service that matches the appointment_type
  const appointmentTypesList = React.useMemo(() => {
    if (!appointment?.appointment_type) return [];
    
    // First, check if we have selected service IDs stored in custom_fields
    const selectedServiceIds = appointment?.custom_fields?.selected_service_ids;
    if (Array.isArray(selectedServiceIds) && selectedServiceIds.length > 0) {
      // Show only the selected services
      return appointmentTypes.filter((t) => {
        const serviceType = t as any;
        return selectedServiceIds.includes(serviceType.serviceId);
      });
    }
    
    // Fallback: The database stores the mapped appointment_type (e.g., "doctor_on_call")
    // Find the first service that maps to this appointment_type (for backward compatibility)
    // Only show one service to avoid showing multiple services that map to the same appointment_type
    const matchingType = appointmentTypes.find((t) => t.appointmentType === appointment.appointment_type);
    return matchingType ? [matchingType] : [];
  }, [appointmentTypes, appointment?.appointment_type, appointment?.custom_fields]);
  
  // For backward compatibility, also try to find by direct value match
  const appointmentType = React.useMemo(() => {
    if (!appointment?.appointment_type) return undefined;
    // First try to find by appointment_type directly (for old data)
    let found = appointmentTypes.find((t) => t.appointmentType === appointment.appointment_type);
    if (!found) {
      // Try to find by value (for new service ID format)
      found = appointmentTypes.find((t) => t.value === appointment.appointment_type);
    }
    // If still not found and appointment_type looks like a service ID, try to match
    if (!found && typeof appointment.appointment_type === "string" && appointment.appointment_type.startsWith("service_")) {
      const serviceId = appointment.appointment_type.replace("service_", "");
      found = appointmentTypes.find((t) => t.serviceId?.toString() === serviceId);
    }
    return found || appointmentTypesList[0]; // Fallback to first matching type
  }, [appointmentTypes, appointment?.appointment_type, appointmentTypesList]);

  // Early return after all hooks
  if (!appointment) return null;

  const patient = patients?.find((p) => p.id === appointment.patient_id);
  const primaryStaff = staff?.find((s) => s.id === appointment.primary_staff_id);
  const driver = staff?.find((s) => s.id === appointment.driver_id);
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
        className={`fixed right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl z-50 transition-transform duration-200 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Appointment Details</h2>
              {appointmentTypesList.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-1">
                  {appointmentTypesList.map((type) => (
                    <Badge
                      key={type.value}
                      style={{
                        backgroundColor: type.color + "20",
                        color: type.color,
                      }}
                      className="text-xs dark:opacity-90"
                    >
                      {type.label}
                    </Badge>
                  ))}
                </div>
              ) : appointmentType ? (
                <p className="text-gray-600 dark:text-slate-400 mt-1">{appointmentType.label}</p>
              ) : null}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-200px)] p-6 space-y-6">
          {/* Patient Information */}
          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-gray-600 dark:text-slate-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Patient Information</h3>
            </div>
            {patient && (
              <div className="space-y-2">
                <p className="font-medium text-gray-900 dark:text-slate-100">{patient.first_name} {patient.last_name}</p>
                {patient.phone_jsonb && patient.phone_jsonb.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                    <Phone className="w-4 h-4" />
                    <span>{patient.phone_jsonb[0].number}</span>
                  </div>
                )}
                {(patient.building_street || patient.area) && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
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
                    className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in Google Maps
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Appointment Details */}
          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-gray-600 dark:text-slate-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Appointment Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400">Date</p>
                <p className="font-medium text-gray-900 dark:text-slate-100">{formatCrmDate(appointment.appointment_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400">Time</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                  <p className="font-medium text-gray-900 dark:text-slate-100">
                    {startTimeStr && endTimeStr ? `${startTimeStr} - ${endTimeStr}` : "N/A"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400">Duration</p>
                <p className="font-medium text-gray-900 dark:text-slate-100">{appointment.duration_minutes} minutes</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400">Status</p>
                {status && (
                  <Badge
                    className={`${
                      status.value === "scheduled"
                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                        : status.value === "cancelled"
                        ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        : status.value === "completed"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                        : ""
                    }`}
                  >
                    {status.label}
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400">Type</p>
                {appointmentTypesList.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {appointmentTypesList.map((type) => (
                      <Badge
                        key={type.value}
                        style={{
                          backgroundColor: type.color + "20",
                          color: type.color,
                        }}
                        className="dark:opacity-90"
                      >
                        {type.label}
                      </Badge>
                    ))}
                  </div>
                ) : appointmentType ? (
                  <Badge
                    style={{
                      backgroundColor: appointmentType.color + "20",
                      color: appointmentType.color,
                    }}
                    className="dark:opacity-90"
                  >
                    {appointmentType.label}
                  </Badge>
                ) : (
                  <span className="text-sm text-gray-500 dark:text-slate-500">N/A</span>
                )}
              </div>
            </div>
          </div>

          {/* Staff Details */}
          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Stethoscope className="w-5 h-5 text-gray-600 dark:text-slate-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Staff Details</h3>
            </div>
            <div className="space-y-2">
              {primaryStaff && (
                <div className="p-3 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-900 dark:text-slate-100">{primaryStaff.first_name} {primaryStaff.last_name}</p>
                    <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">Primary</Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-400">{primaryStaff.staff_type} {primaryStaff.specialization && `- ${primaryStaff.specialization}`}</p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-slate-400">
                    <Phone className="w-4 h-4" />
                    <span>{primaryStaff.phone}</span>
                  </div>
                </div>
              )}
              {assignedStaff.length > 0 && (
                <>
                  {assignedStaff.map((assignedStaffMember) => {
                    // Skip if this staff member is already shown as primary or driver
                    if (assignedStaffMember.id === appointment.primary_staff_id || assignedStaffMember.id === appointment.driver_id) {
                      return null;
                    }
                    return (
                      <div key={assignedStaffMember.id} className="p-3 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-gray-900 dark:text-slate-100">{assignedStaffMember.first_name} {assignedStaffMember.last_name}</p>
                          <Badge className="bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-slate-300">Staff</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-slate-400">{assignedStaffMember.staff_type} {assignedStaffMember.specialization && `- ${assignedStaffMember.specialization}`}</p>
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-slate-400">
                          <Phone className="w-4 h-4" />
                          <span>{assignedStaffMember.phone}</span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              {driver && (
                <div className="p-3 bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-900 dark:text-slate-100">{driver.first_name} {driver.last_name}</p>
                    <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      Driver
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-400">{driver.staff_type}</p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-slate-400">
                    <Phone className="w-4 h-4" />
                    <span>{driver.phone}</span>
                  </div>
                </div>
              )}
              {!primaryStaff && assignedStaff.length === 0 && !driver && (
                <p className="text-sm text-gray-500 dark:text-slate-500 italic">No staff assigned</p>
              )}
            </div>
          </div>

          {/* Transportation */}
          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Car className="w-5 h-5 text-gray-600 dark:text-slate-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Transportation</h3>
            </div>
            {driver ? (
              <p className="text-sm text-gray-900 dark:text-slate-100">{driver.first_name} {driver.last_name} - {driver.phone}</p>
            ) : (
              <p className="text-sm text-gray-600 dark:text-slate-400">Self Transport</p>
            )}
          </div>

          {/* Payment Package */}
          {paymentPackage && (
            <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5 text-gray-600 dark:text-slate-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Payment Package</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    {services && paymentPackage.service_id && (
                      <p className="font-medium text-gray-900 dark:text-slate-100">
                        {services.find((s) => s.id === paymentPackage.service_id)?.name || "Service"} Package #{paymentPackage.id}
                      </p>
                    )}
                    {!paymentPackage.service_id && (
                      <p className="font-medium text-gray-900 dark:text-slate-100">Package #{paymentPackage.id}</p>
                    )}
                  </div>
                  <Badge
                    className={
                      paymentPackage.status === "active"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                        : paymentPackage.status === "completed"
                        ? "bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-slate-300"
                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                    }
                  >
                    {paymentPackage.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-400 space-y-1">
                  {paymentPackage.package_type === "session-based" && paymentPackage.total_sessions && (
                    <p>
                      Usage: {sessionsUsed || 0} / {paymentPackage.total_sessions} sessions
                      {paymentPackage.total_sessions > 0 && (
                        <span className="ml-2">
                          ({Math.round(((sessionsUsed || 0) / paymentPackage.total_sessions) * 100)}% used)
                        </span>
                      )}
                    </p>
                  )}
                  {paymentPackage.package_type === "time-based" && paymentPackage.total_hours && (
                    <p>
                      Usage: {hoursUsed || 0} / {paymentPackage.total_hours} hours
                      {paymentPackage.total_hours > 0 && (
                        <span className="ml-2">
                          ({Math.round(((hoursUsed || 0) / paymentPackage.total_hours) * 100)}% used)
                        </span>
                      )}
                    </p>
                  )}
                  {paymentPackage.renewal_date && (
                    <p>Renewal Date: {formatCrmDate(paymentPackage.renewal_date)}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <Button
                    onClick={() => setIsPaymentDialogOpen(true)}
                    className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                    size="sm"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Create Payment
                  </Button>
                  <Link
                    to={`/payment_packages/${paymentPackage.id}/show`}
                    className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Package Details
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Payment Section (when no package linked or showing standalone payments) */}
          {!paymentPackage && (
            <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 border-2 border-dashed border-gray-300 dark:border-slate-600">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5 text-gray-600 dark:text-slate-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Payment</h3>
              </div>
              
              {/* Show standalone payments if any exist */}
              {standalonePayments && standalonePayments.length > 0 ? (
                <div className="space-y-3 mb-3">
                  <div className="bg-white dark:bg-slate-700 rounded-lg p-3 border border-gray-200 dark:border-slate-600">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900 dark:text-slate-100">Standalone Payments</p>
                      <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        {standalonePayments.length} payment{standalonePayments.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {standalonePayments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between text-sm">
                          <div>
                            <p className="text-gray-900 dark:text-slate-100">
                              {formatCrmDate(payment.date_paid)} - {payment.payment_method}
                            </p>
                            {payment.invoice_number && (
                              <p className="text-xs text-gray-500 dark:text-slate-400">
                                Invoice: {payment.invoice_number}
                              </p>
                            )}
                          </div>
                          <p className="font-medium text-gray-900 dark:text-slate-100">
                            AED {payment.amount_received.toLocaleString()}
                          </p>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-gray-200 dark:border-slate-600">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900 dark:text-slate-100">Total Paid</p>
                          <p className="font-semibold text-gray-900 dark:text-slate-100">
                            AED {totalStandaloneAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">
                  No payment package linked to this appointment. Create a payment by selecting a package or leave it empty for a standalone payment.
                </p>
              )}
              
              <Button
                onClick={() => {
                  setIsPaymentDialogOpen(true);
                }}
                variant="outline"
                size="sm"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Create Payment
              </Button>
            </div>
          )}

          {/* Notes and Instructions */}
          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-gray-600 dark:text-slate-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Notes and Instructions</h3>
            </div>
            <div className="space-y-3">
              {appointment.mini_notes && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Brief Notes</p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">{appointment.mini_notes}</p>
                </div>
              )}
              {appointment.full_notes && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Detailed Notes</p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">{appointment.full_notes}</p>
                </div>
              )}
              {appointment.pickup_instructions && (
                <div className="border border-orange-200 dark:border-orange-800 rounded-lg p-3 bg-orange-50 dark:bg-orange-900/20">
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-1">Pickup Instructions</p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">{appointment.pickup_instructions}</p>
                </div>
              )}
              {appointment.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">General Notes</p>
                  <p className="text-sm text-gray-600 dark:text-slate-400">{appointment.notes}</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 p-6">
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
              className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
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

      {/* Payment Creation Dialog */}
      <PaymentCreateDialog
        open={isPaymentDialogOpen}
        onOpenChange={(open) => {
          setIsPaymentDialogOpen(open);
          if (!open) {
            // Refresh data when dialog closes (payment might have been created)
            refresh();
          }
        }}
        defaultPackageId={appointment.payment_package_id}
        defaultAppointmentId={appointment.id}
      />
    </>
  );
};

