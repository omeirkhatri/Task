import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AppointmentForm } from "./AppointmentForm";
import type { Appointment, RecurrenceConfig } from "../types";
import { useCreate, useUpdate, useNotify, useDataProvider } from "ra-core";
import { crmDateTimeStringToISO } from "../misc/timezone";

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
  const [create] = useCreate();
  const [update] = useUpdate();
  const dataProvider = useDataProvider();
  const notify = useNotify();

  const handleSubmit = async (formData: any) => {
    setIsSubmitting(true);
    setError(null);
    try {
      // Transform form data to match database schema
      // Combine date and time into ISO strings
      const appointmentDate = formData.appointment_date; // YYYY-MM-DD
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

      const appointmentData: any = {
        patient_id: parseInt(formData.patient_id, 10),
        appointment_date: startDateTimeISO.split("T")[0], // Store date part only
        start_time: startDateTimeISO,
        end_time: endDateTimeISO,
        duration_minutes: formData.duration_minutes,
        appointment_type: formData.appointment_type,
        status: formData.status || "scheduled",
        notes: formData.notes || null,
        mini_notes: formData.mini_notes || null,
        full_notes: formData.full_notes || null,
        pickup_instructions: formData.pickup_instructions || null,
        primary_staff_id: formData.primary_staff_id ? parseInt(formData.primary_staff_id, 10) : null,
        driver_id: formData.driver_id ? parseInt(formData.driver_id, 10) : null,
        // Include recurrence config if present
        recurrence_config: recurrenceConfig,
        is_recurring: !!formData.is_recurring,
        staff_ids: staffIds, // Pass staff_ids separately for processing
      };

      console.log("Saving appointment:", appointmentData);
      console.log("Recurrence config:", JSON.stringify(recurrenceConfig, null, 2));
      console.log("Form data recurrence_occurrences:", formData.recurrence_occurrences, "Type:", typeof formData.recurrence_occurrences);
      console.log("Form data recurrence_end_type:", formData.recurrence_end_type);
      if (recurrenceConfig?.days_of_week) {
        console.log("Days of week selected:", recurrenceConfig.days_of_week);
      }

      if (appointment) {
        // Update appointment
        await update(
          "appointments",
          {
            id: appointment.id,
            data: appointmentData,
            previousData: appointment,
          },
          {
            onSuccess: async () => {
              // Update staff assignments
              const appointmentId = appointment.id;
              try {
                // Delete existing assignments
                const { data: existingAssignments } = await dataProvider.getList("appointment_staff_assignments", {
                  pagination: { page: 1, perPage: 1000 },
                  filter: { appointment_id: appointmentId },
                });
                
                for (const assignment of existingAssignments || []) {
                  await dataProvider.delete("appointment_staff_assignments", { id: assignment.id });
                }
                
                // Create new assignments
                for (const staffId of staffIds) {
                  await dataProvider.create("appointment_staff_assignments", {
                    data: {
                      appointment_id: appointmentId,
                      staff_id: staffId,
                      role: "other",
                    },
                  });
                }
              } catch (staffError) {
                console.error("Error updating staff assignments:", staffError);
                // Don't fail the whole update if staff assignments fail
              }
              
              notify("Appointment updated successfully", { type: "success" });
              onSuccess();
            },
            onError: (error: any) => {
              console.error("Error updating appointment:", error);
              const errorMessage = error?.message || error?.body?.message || JSON.stringify(error) || "Failed to update appointment";
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
            onSuccess: async (result: any) => {
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
              } catch (staffError) {
                console.error("Error creating staff assignments:", staffError);
                notify("Appointment created but staff assignments failed", { type: "warning" });
              }
              
              notify("Appointment created successfully", { type: "success" });
              onSuccess();
            },
            onError: (error: any) => {
              console.error("Error creating appointment:", error);
              const errorMessage = error?.message || error?.body?.message || JSON.stringify(error) || "Failed to create appointment";
              setError(errorMessage);
              notify(`Failed to create appointment: ${errorMessage}`, { type: "error" });
            },
          }
        );
      }
    } catch (err) {
      console.error("Error in handleSubmit:", err);
      setError(err instanceof Error ? err.message : "Failed to save appointment");
      notify("Failed to save appointment", { type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
  );
};

