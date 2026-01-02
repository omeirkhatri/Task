import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AppointmentForm } from "./AppointmentForm";
import { AppointmentEditDialog } from "./AppointmentEditDialog";
import type { Appointment, RecurrenceConfig } from "../types";
import { useCreate, useUpdate, useNotify, useDataProvider } from "ra-core";
import { crmDateTimeStringToISO } from "../misc/timezone";
import { logger } from "@/lib/logger";
import { useAppointmentTypes } from "./useAppointmentTypes";
import { useQueryClient } from "@tanstack/react-query";

type AppointmentFormData = {
  patient_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  appointment_type: string[]; // Changed to array for multiple types
  status: string;
  notes?: string;
  mini_notes?: string;
  full_notes?: string;
  pickup_instructions?: string;
  primary_staff_id?: string;
  driver_id?: string;
  staff_ids?: string[];
  payment_package_id?: string;
  is_recurring?: boolean;
  recurrence_pattern?: "daily" | "weekly" | "monthly" | "yearly" | "custom";
  recurrence_interval?: number;
  recurrence_end_type?: "date" | "occurrences";
  recurrence_end_date?: string;
  recurrence_occurrences?: number | string;
  recurrence_days_of_week?: number[];
  recurrence_day_of_month?: number;
  recurrence_week_of_month?: number;
  recurrence_month?: number;
  recurrence_custom_unit?: "days" | "weeks" | "months";
};

type AppointmentData = {
  patient_id: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  appointment_type: string;
  status: string;
  notes?: string | null;
  mini_notes?: string | null;
  full_notes?: string | null;
  pickup_instructions?: string | null;
  primary_staff_id?: number | null;
  driver_id?: number | null;
  payment_package_id?: number | null;
  recurrence_config?: RecurrenceConfig | null;
  is_recurring: boolean;
  // Note: staff_ids is NOT a database column - it's handled via appointment_staff_assignments table
};

type AppointmentModalProps = {
  open: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  initialDateTime?: { start: Date; end: Date } | null;
  onSuccess: () => void;
};

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  open,
  onClose,
  appointment,
  initialDateTime,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<AppointmentFormData | null>(null);
  const [updateFutureOnly, setUpdateFutureOnly] = useState(false);
  const [create] = useCreate();
  const [update] = useUpdate();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const appointmentTypes = useAppointmentTypes();
  const queryClient = useQueryClient();

  const isRecurring = appointment && (appointment.is_recurring || !!appointment.recurrence_id);

  const performUpdate = async (formData: AppointmentFormData, updateFuture: boolean = false) => {
    setIsSubmitting(true);
    setError(null);
    try {
      // For recurring appointments, preserve the original date - only update time and other fields
      let appointmentDate = formData.appointment_date; // YYYY-MM-DD
      if (appointment && isRecurring) {
        // Keep the original appointment date - don't change it
        appointmentDate = appointment.appointment_date.split("T")[0];
      }
      
      const startTime = formData.start_time; // HH:MM
      const endTime = formData.end_time; // HH:MM

      // Create ISO datetime strings: YYYY-MM-DDTHH:MM:SS
      const startDateTime = `${appointmentDate}T${startTime}:00`;
      const endDateTime = `${appointmentDate}T${endTime}:00`;

      // Convert to proper timezone-aware ISO strings using timezone utility
      const startDateTimeISO = crmDateTimeStringToISO(startDateTime);
      const endDateTimeISO = crmDateTimeStringToISO(endDateTime);

      if (!startDateTimeISO || !endDateTimeISO) {
        throw new Error("Invalid date/time format");
      }

      // Prepare the appointment data (exclude staff_ids - it's not a database column)
      const staffIds = formData.staff_ids?.map((id: string) => parseInt(id, 10)) || [];

      // Build recurrence config if recurring appointment
      let recurrenceConfig: RecurrenceConfig | undefined = undefined;
      if (formData.is_recurring) {
        const endType = formData.recurrence_end_type || "occurrences";
        // Parse occurrences - handle string, number, or undefined
        let occurrencesValue: number | null = null;
        if (endType === "occurrences") {
          const rawValue = formData.recurrence_occurrences;
          if (rawValue !== null && rawValue !== undefined && rawValue !== "") {
            const parsed = Number(rawValue);
            occurrencesValue = isNaN(parsed) || parsed <= 0 ? 10 : parsed;
          } else {
            occurrencesValue = 10; // Default to 10 if not set
          }
        }
        
        recurrenceConfig = {
          pattern: formData.recurrence_pattern || "daily",
          interval: formData.recurrence_interval || 1,
          end_type: endType,
          end_date: endType === "date" ? (formData.recurrence_end_date || null) : null,
          occurrences: occurrencesValue,
          days_of_week: formData.recurrence_days_of_week && formData.recurrence_days_of_week.length > 0
            ? formData.recurrence_days_of_week
            : null,
          day_of_month: formData.recurrence_day_of_month || null,
          week_of_month: formData.recurrence_week_of_month || null,
          month: formData.recurrence_month || null,
          custom_unit: formData.recurrence_custom_unit || null,
        };
      }

      // Handle multiple appointment types - convert service IDs to appointment types
      // The form now uses service IDs (e.g., "service_123") as values, so we need to map them back
      let appointmentType = "doctor_on_call"; // Default
      
      // Extract selected service IDs to store in custom_fields
      const selectedServiceIds: number[] = [];
      
      if (Array.isArray(formData.appointment_type) && formData.appointment_type.length > 0) {
        // Extract service IDs from selected values
        formData.appointment_type.forEach((value) => {
          if (typeof value === "string" && value.startsWith("service_")) {
            const serviceId = parseInt(value.replace("service_", ""), 10);
            if (!isNaN(serviceId)) {
              selectedServiceIds.push(serviceId);
            }
          }
        });
        
        // Find the first selected service and get its appointment type
        const firstSelectedValue = formData.appointment_type[0];
        const selectedType = appointmentTypes.find(t => t.value === firstSelectedValue);
        if (selectedType?.appointmentType) {
          appointmentType = selectedType.appointmentType;
        } else if (firstSelectedValue.startsWith("service_")) {
          // Fallback: if it's a service ID format, try to extract and find the type
          const serviceId = firstSelectedValue.replace("service_", "");
          const foundType = appointmentTypes.find(t => t.serviceId?.toString() === serviceId);
          if (foundType?.appointmentType) {
            appointmentType = foundType.appointmentType;
          }
        }
      } else if (formData.appointment_type && typeof formData.appointment_type === "string") {
        // Handle single string value (backward compatibility)
        if (formData.appointment_type.startsWith("service_")) {
          const serviceId = parseInt(formData.appointment_type.replace("service_", ""), 10);
          if (!isNaN(serviceId)) {
            selectedServiceIds.push(serviceId);
          }
          const foundType = appointmentTypes.find(t => t.serviceId?.toString() === serviceId.toString());
          if (foundType?.appointmentType) {
            appointmentType = foundType.appointmentType;
          }
        } else {
          appointmentType = formData.appointment_type;
        }
      }

      // Store selected service IDs in custom_fields so we can display only the selected services
      const customFields = appointment?.custom_fields || {};
      const updatedCustomFields = {
        ...customFields,
        selected_service_ids: selectedServiceIds.length > 0 ? selectedServiceIds : undefined,
      };
      
      const appointmentData: AppointmentData = {
        patient_id: parseInt(formData.patient_id, 10),
        appointment_date: startDateTimeISO.split("T")[0], // Store date part only
        start_time: startDateTimeISO,
        end_time: endDateTimeISO,
        duration_minutes: formData.duration_minutes,
        appointment_type: appointmentType,
        status: formData.status || "scheduled",
        notes: formData.notes || null,
        mini_notes: formData.mini_notes || null,
        full_notes: formData.full_notes || null,
        pickup_instructions: formData.pickup_instructions || null,
        primary_staff_id: formData.primary_staff_id ? parseInt(formData.primary_staff_id, 10) : null,
        driver_id: formData.driver_id ? parseInt(formData.driver_id, 10) : null,
        payment_package_id: formData.payment_package_id ? parseInt(formData.payment_package_id, 10) : null,
        custom_fields: updatedCustomFields,
        // Include recurrence config if present
        recurrence_config: recurrenceConfig || null,
        is_recurring: !!formData.is_recurring,
        // Note: staff_ids is NOT included here - it's handled separately via appointment_staff_assignments table
      };

      logger.debug("Saving appointment", { appointmentData, recurrenceConfig });

      if (appointment) {
        // Update appointment - pass updateFutureOnly flag via meta for recurring appointments
        await update(
          "appointments",
          {
            id: appointment.id,
            data: appointmentData,
            previousData: appointment,
            meta: isRecurring ? { updateFutureOnly: updateFuture } : undefined,
          },
          {
            onSuccess: async (result: any) => {
              // Update staff assignments for current appointment
              const appointmentId = appointment.id;
              const futureAppointmentIds = result?.meta?.futureAppointmentIds || [];
              const appointmentsToUpdate = [appointmentId, ...futureAppointmentIds];
              
              try {
                // Update staff assignments for all appointments (current + future if updateFutureOnly)
                for (const aptId of appointmentsToUpdate) {
                  // Delete existing assignments
                  const { data: existingAssignments } = await dataProvider.getList("appointment_staff_assignments", {
                    pagination: { page: 1, perPage: 1000 },
                    filter: { appointment_id: aptId },
                  });
                  
                  for (const assignment of existingAssignments || []) {
                    await dataProvider.delete("appointment_staff_assignments", { id: assignment.id });
                  }
                  
                  // Create new assignments
                  for (const staffId of staffIds) {
                    await dataProvider.create("appointment_staff_assignments", {
                      data: {
                        appointment_id: aptId,
                        staff_id: staffId,
                        role: "other",
                      },
                    });
                  }
                }
                
                // Invalidate queries to refresh appointments and staff assignments
                queryClient.invalidateQueries({
                  predicate: ({ queryKey }) =>
                    Array.isArray(queryKey) && (
                      queryKey[0] === "appointments" || 
                      queryKey[0] === "appointment_staff_assignments"
                    ),
                });
              } catch (staffError) {
                logger.error("Error updating staff assignments", staffError, { context: "AppointmentModal" });
                // Don't fail the whole update if staff assignments fail
              }
              
              const message = updateFuture && futureAppointmentIds.length > 0
                ? `Appointment and ${futureAppointmentIds.length} future appointment(s) updated successfully`
                : "Appointment updated successfully";
              notify(message, { type: "success" });
              onSuccess();
            },
            onError: (error: unknown) => {
              logger.error("Error updating appointment", error, { context: "AppointmentModal" });
              const errorMessage = error instanceof Error 
                ? error.message 
                : (typeof error === "object" && error !== null && "body" in error && typeof error.body === "object" && error.body !== null && "message" in error.body && typeof error.body.message === "string")
                  ? error.body.message
                  : "Failed to update appointment";
              setError(errorMessage);
              notify(`Failed to update appointment: ${errorMessage}`, { type: "error" });
            },
          }
        );
      } else {
        // Create new appointment
        await create(
          "appointments",
          {
            data: appointmentData,
          },
          {
            onSuccess: async (result: { id: string | number }) => {
              const appointmentId = result.id;
              
              // Create staff assignments
              try {
                for (const staffId of staffIds) {
                  await dataProvider.create("appointment_staff_assignments", {
                    data: {
                      appointment_id: appointmentId,
                      staff_id: staffId,
                      role: "other",
                    },
                  });
                }
                
                // Invalidate queries to refresh appointments and staff assignments
                queryClient.invalidateQueries({
                  predicate: ({ queryKey }) =>
                    Array.isArray(queryKey) && (
                      queryKey[0] === "appointments" || 
                      queryKey[0] === "appointment_staff_assignments"
                    ),
                });
              } catch (staffError) {
                logger.error("Error creating staff assignments", staffError, { context: "AppointmentModal" });
                notify("Appointment created but staff assignments failed", { type: "warning" });
              }
              
              notify("Appointment created successfully", { type: "success" });
              onSuccess();
            },
            onError: (error: unknown) => {
              logger.error("Error creating appointment", error, { context: "AppointmentModal" });
              const errorMessage = error instanceof Error 
                ? error.message 
                : (typeof error === "object" && error !== null && "body" in error && typeof error.body === "object" && error.body !== null && "message" in error.body && typeof error.body.message === "string")
                  ? error.body.message
                  : "Failed to create appointment";
              setError(errorMessage);
              notify(`Failed to create appointment: ${errorMessage}`, { type: "error" });
            },
          }
        );
      }
    } catch (err) {
      logger.error("Error in performUpdate", err, { context: "AppointmentModal" });
      setError(err instanceof Error ? err.message : "Failed to save appointment");
      notify("Failed to save appointment", { type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (formData: AppointmentFormData) => {
    // If editing a recurring appointment, show the edit dialog first
    if (appointment && isRecurring) {
      setPendingFormData(formData);
      setShowEditDialog(true);
      return;
    }
    
    // For non-recurring or new appointments, proceed directly
    if (appointment) {
      await performUpdate(formData, false);
    } else {
      // Create new appointment - use existing create logic
      await performUpdate(formData, false);
    }
  };

  const handleEditDialogConfirm = async (updateFuture: boolean) => {
    setShowEditDialog(false);
    if (pendingFormData) {
      await performUpdate(pendingFormData, updateFuture);
      setPendingFormData(null);
    }
  };

  const handleEditDialogClose = () => {
    setShowEditDialog(false);
    setPendingFormData(null);
  };

  return (
    <>
      <AppointmentEditDialog
        open={showEditDialog}
        onClose={handleEditDialogClose}
        appointment={appointment}
        onConfirm={handleEditDialogConfirm}
        isSubmitting={isSubmitting}
      />
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="!w-[33vw] !max-w-[600px] min-w-[500px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl">
        {/* Compact Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {appointment ? "Edit Appointment" : "New Appointment"}
          </DialogTitle>
          <DialogDescription className="mt-1 text-slate-600 dark:text-slate-400 text-sm">
            {appointment ? "Update appointment details" : "Create a new appointment"}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <span>{error}</span>
              </div>
            </div>
          )}
          <AppointmentForm
            appointment={appointment}
            initialDateTime={initialDateTime}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </div>

        {/* Compact Footer */}
        <DialogFooter className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="appointment-form"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 font-medium disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              "Save Appointment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

