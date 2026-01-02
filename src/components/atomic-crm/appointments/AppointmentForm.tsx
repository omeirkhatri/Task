import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useGetList } from "ra-core";
import type { Appointment, Contact, Staff, RecurrenceConfig } from "../types";
import { APPOINTMENT_STATUSES } from "./types";
import { useAppointmentTypes } from "./useAppointmentTypes";
import { formatCrmTime, crmDateYmdInputString, extractCrmTime } from "../misc/timezone";
import { cn } from "@/lib/utils";

type AppointmentFormProps = {
  appointment?: Appointment | null;
  initialDateTime?: { start: Date; end: Date } | null;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
};

type AppointmentFormData = {
  patient_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  appointment_type: string;
  status: string;
  notes?: string;
  mini_notes?: string;
  full_notes?: string;
  pickup_instructions?: string;
  primary_staff_id?: string;
  driver_id?: string;
  staff_ids?: string[];
  // Recurrence fields
  is_recurring?: boolean;
  recurrence_pattern?: "daily" | "weekly" | "monthly" | "yearly" | "custom";
  recurrence_interval?: number;
  recurrence_end_type?: "date" | "occurrences";
  recurrence_end_date?: string;
  recurrence_occurrences?: number;
  recurrence_days_of_week?: number[];
  recurrence_day_of_month?: number;
  recurrence_week_of_month?: number;
  recurrence_month?: number;
  recurrence_custom_unit?: "days" | "weeks" | "months";
};

export const AppointmentForm: React.FC<AppointmentFormProps> = ({
  appointment,
  initialDateTime,
  onSubmit,
  isSubmitting,
}) => {
  const { data: patients } = useGetList<Contact>("clients", {
    pagination: { page: 1, perPage: 1000 },
  });
  const { data: staff } = useGetList<Staff>("staff", {
    pagination: { page: 1, perPage: 1000 },
  });
  const appointmentTypes = useAppointmentTypes();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AppointmentFormData>({
    defaultValues: appointment
      ? {
          patient_id: appointment.patient_id.toString(),
          appointment_date: appointment.appointment_date.split("T")[0],
          // Extract time in CRM timezone, not UTC
          // appointment.start_time and end_time are ISO strings stored in UTC
          // We need to format them in the configured CRM timezone for display
          start_time: extractCrmTime(appointment.start_time) || "",
          end_time: extractCrmTime(appointment.end_time) || "",
          duration_minutes: appointment.duration_minutes,
          appointment_type: appointment.appointment_type,
          status: appointment.status,
          notes: appointment.notes || "",
          mini_notes: appointment.mini_notes || "",
          full_notes: appointment.full_notes || "",
          pickup_instructions: appointment.pickup_instructions || "",
          primary_staff_id: appointment.primary_staff_id?.toString() || "",
          driver_id: appointment.driver_id?.toString() || "",
          staff_ids: appointment.staff_ids?.map((id) => id.toString()) || [],
        }
      : (() => {
          // Use initialDateTime if provided, otherwise use current date/time
          if (initialDateTime) {
            const start = initialDateTime.start;
            const end = initialDateTime.end;
            
            // Ensure start and end are Date objects
            const startDate = start instanceof Date ? start : new Date(start);
            const endDate = end instanceof Date ? end : new Date(end);
            
            // Validate dates - check if they're valid Date objects
            if (!(startDate instanceof Date && endDate instanceof Date) || 
                isNaN(startDate.getTime()) || 
                isNaN(endDate.getTime()) ||
                startDate.getTime() === 0 ||
                endDate.getTime() === 0) {
              // Silently use defaults instead of logging
              return {
                appointment_date: new Date().toISOString().split("T")[0],
                status: "scheduled",
                duration_minutes: 60,
                start_time: "",
                end_time: "",
                patient_id: "",
                appointment_type: "",
                primary_staff_id: "",
                driver_id: "",
                is_recurring: false,
                recurrence_pattern: "daily",
                recurrence_interval: 1,
                recurrence_end_type: "occurrences",
                recurrence_occurrences: 10,
              };
            }
            
            const durationMs = endDate.getTime() - startDate.getTime();
            const durationMinutes = Math.max(Math.round(durationMs / (60 * 1000)), 15);
            
            // Format date as YYYY-MM-DD using timezone utility
            const dateStr = crmDateYmdInputString(startDate) || new Date().toISOString().split("T")[0];
            
            // Format time as HH:MM using timezone-aware extractor
            // FullCalendar with timeZone set displays times in the configured CRM timezone,
            // but returns Date objects in the browser's local timezone.
            // We need to extract the time components as they appear in the CRM timezone.
            const startTimeStr = extractCrmTime(startDate);
            const endTimeStr = extractCrmTime(endDate);
            
          return {
            appointment_date: dateStr,
            start_time: startTimeStr || "",
            end_time: endTimeStr || "",
            duration_minutes: durationMinutes,
            status: "scheduled",
            primary_staff_id: "",
            driver_id: "",
          };
          }
          return {
            appointment_date: new Date().toISOString().split("T")[0],
            status: "scheduled",
            duration_minutes: 60,
            start_time: "",
            end_time: "",
            patient_id: "",
            appointment_type: "",
            primary_staff_id: "",
            driver_id: "",
            is_recurring: false,
            recurrence_pattern: "daily",
            recurrence_interval: 1,
            recurrence_end_type: "occurrences",
            recurrence_occurrences: 10,
          };
        })(),
  });

  const isRecurring = watch("is_recurring");
  const recurrencePattern = watch("recurrence_pattern") || "daily";
  const recurrenceEndType = watch("recurrence_end_type") || "occurrences";
  const recurrenceDaysOfWeek = watch("recurrence_days_of_week") || [];
  
  // Patient combobox state
  const [patientOpen, setPatientOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const selectedPatientId = watch("patient_id");
  
  // Filter patients based on search
  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    if (!patientSearch) return patients;
    const searchLower = patientSearch.toLowerCase();
    return patients.filter((patient) => {
      const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
      return fullName.includes(searchLower) || 
             patient.first_name?.toLowerCase().includes(searchLower) ||
             patient.last_name?.toLowerCase().includes(searchLower);
    });
  }, [patients, patientSearch]);
  
  const selectedPatient = patients?.find((p) => p.id.toString() === selectedPatientId);

  const startTime = watch("start_time");
  const durationMinutes = watch("duration_minutes");
  const appointmentDate = watch("appointment_date");
  const hasSetFromCalendar = React.useRef(false);


  // Update form values when initialDateTime is provided (for new appointments from calendar drag)
  React.useEffect(() => {
    if (!appointment && initialDateTime) {
      const start = initialDateTime.start;
      const end = initialDateTime.end;
      
      // Ensure start and end are Date objects
      const startDate = start instanceof Date ? start : new Date(start);
      const endDate = end instanceof Date ? end : new Date(end);
      
      // Validate dates - check if they're valid Date objects
      if (!(startDate instanceof Date && endDate instanceof Date) || 
          isNaN(startDate.getTime()) || 
          isNaN(endDate.getTime()) ||
          startDate.getTime() === 0 ||
          endDate.getTime() === 0) {
        // Silently skip update instead of logging
        return;
      }
      
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationMinutes = Math.max(Math.round(durationMs / (60 * 1000)), 15);
      
      // Format date and time in CRM timezone
      const dateStr = crmDateYmdInputString(startDate) || `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(startDate.getDate()).padStart(2, "0")}`;
      const startTimeStr = extractCrmTime(startDate);
      const endTimeStr = extractCrmTime(endDate);
      
      hasSetFromCalendar.current = true;
      setValue("appointment_date", dateStr, { shouldValidate: false, shouldDirty: false });
      setValue("start_time", startTimeStr, { shouldValidate: false, shouldDirty: false });
      setValue("end_time", endTimeStr, { shouldValidate: false, shouldDirty: false });
      setValue("duration_minutes", durationMinutes, { shouldValidate: false, shouldDirty: false });
      
      // Reset the flag after a short delay to allow auto-calculation on user changes
      setTimeout(() => {
        hasSetFromCalendar.current = false;
      }, 100);
    }
  }, [initialDateTime, appointment, setValue]);

  // Auto-calculate end_time when start_time or duration changes
  // Skip if we just set values from calendar selection to preserve the selected time range
  React.useEffect(() => {
    if (startTime && durationMinutes && !hasSetFromCalendar.current) {
      const [hours, minutes] = startTime.split(":").map(Number);
      const start = new Date();
      start.setHours(hours, minutes, 0, 0);
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
      const endTimeStr = `${end.getHours().toString().padStart(2, "0")}:${end
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      // Only set if end_time is not already set or if it would be different
      const currentEndTime = watch("end_time");
      if (!currentEndTime || currentEndTime !== endTimeStr) {
        setValue("end_time", endTimeStr, { shouldValidate: false });
      }
    }
  }, [startTime, durationMinutes, setValue, watch]);

  const onFormSubmit = (data: AppointmentFormData) => {
    onSubmit(data);
  };

  // Generate time options with 15-minute intervals
  const timeOptions = useMemo(() => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const displayTime = `${displayHour}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
        options.push({ value: timeString, label: displayTime });
      }
    }
    return options;
  }, []);

  return (
    <form id="appointment-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      {/* Patient Selection */}
      <div>
        <Label htmlFor="patient_id" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
          Patient <span className="text-red-500">*</span>
        </Label>
        <Popover open={patientOpen} onOpenChange={setPatientOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={patientOpen}
              className="w-full h-9 justify-between rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 font-normal text-sm"
            >
              {selectedPatient ? (
                <span className="truncate">
                  {selectedPatient.first_name} {selectedPatient.last_name}
                </span>
              ) : (
                <span className="text-slate-500 dark:text-slate-400">Search for a patient...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0" align="start" sideOffset={4} style={{ width: 'var(--radix-popover-trigger-width)' }}>
            <Command className="rounded-lg border-0">
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <CommandInput
                  placeholder="Search patients..."
                  value={patientSearch}
                  onValueChange={setPatientSearch}
                  className="border-0 focus:ring-0"
                />
              </div>
              <CommandList className="max-h-[300px]">
                <CommandEmpty>No patient found.</CommandEmpty>
                <CommandGroup>
                  {filteredPatients.map((patient) => (
                    <CommandItem
                      key={patient.id}
                      value={`${patient.first_name} ${patient.last_name}`}
                      onSelect={() => {
                        setValue("patient_id", patient.id.toString());
                        setPatientOpen(false);
                        setPatientSearch("");
                      }}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedPatientId === patient.id.toString() ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {patient.first_name} {patient.last_name}
                        </span>
                        {patient.email && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {patient.email}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {errors.patient_id && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">Patient is required</p>
        )}
      </div>

      {/* Date and Time - Compact Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="appointment_date" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
            Date <span className="text-red-500">*</span>
          </Label>
          <Input
            type="date"
            {...register("appointment_date", { required: true })}
            className="h-9 rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
          />
          {errors.appointment_date && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">Required</p>
          )}
        </div>
        <div>
          <Label htmlFor="start_time" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
            Start <span className="text-red-500">*</span>
          </Label>
          <Select
            value={watch("start_time") || ""}
            onValueChange={(value) => setValue("start_time", value)}
          >
            <SelectTrigger className="h-9 rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm">
              <SelectValue placeholder="--:--" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {timeOptions.map((time) => (
                <SelectItem key={time.value} value={time.value}>
                  {time.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.start_time && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">Required</p>
          )}
        </div>
        <div>
          <Label htmlFor="end_time" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
            End <span className="text-red-500">*</span>
          </Label>
          <Select
            value={watch("end_time") || ""}
            onValueChange={(value) => setValue("end_time", value)}
          >
            <SelectTrigger className="h-9 rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm">
              <SelectValue placeholder="--:--" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {timeOptions.map((time) => (
                <SelectItem key={time.value} value={time.value}>
                  {time.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.end_time && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">Required</p>
          )}
        </div>
      </div>

      {/* Type, Status, Duration - Compact Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="appointment_type" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
            Type <span className="text-red-500">*</span>
          </Label>
          <Select
            value={watch("appointment_type") || ""}
            onValueChange={(value) => setValue("appointment_type", value)}
          >
            <SelectTrigger className="h-9 rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {appointmentTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.appointment_type && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">Required</p>
          )}
        </div>
        <div>
          <Label htmlFor="status" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
            Status <span className="text-red-500">*</span>
          </Label>
          <Select
            value={watch("status") || ""}
            onValueChange={(value) => setValue("status", value)}
          >
            <SelectTrigger className="h-9 rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {APPOINTMENT_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="duration_minutes" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
            Duration <span className="text-red-500">*</span>
          </Label>
          <Input
            type="number"
            {...register("duration_minutes", { required: true, min: 15 })}
            className="h-9 rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
            placeholder="60"
            step="15"
            min="15"
          />
          {errors.duration_minutes && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">Min 15 min</p>
          )}
        </div>
      </div>

      {/* Staff - Compact Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="primary_staff_id" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
            Primary Staff
          </Label>
          <Select
            value={watch("primary_staff_id") || ""}
            onValueChange={(value) => setValue("primary_staff_id", value || "")}
          >
            <SelectTrigger className="h-9 rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm">
              <SelectValue placeholder="Select staff" />
            </SelectTrigger>
            <SelectContent>
              {staff?.map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  {s.first_name} {s.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="driver_id" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
            Driver
          </Label>
          <Select
            value={watch("driver_id") || ""}
            onValueChange={(value) => setValue("driver_id", value || "")}
          >
            <SelectTrigger className="h-9 rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm">
              <SelectValue placeholder="Optional" />
            </SelectTrigger>
            <SelectContent>
              {staff?.filter((s) => s.staff_type.toLowerCase().includes("driver")).map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  {s.first_name} {s.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Recurrence Configuration */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_recurring"
            checked={isRecurring || false}
            onCheckedChange={(checked) => {
              setValue("is_recurring", checked as boolean);
              if (!checked) {
                // Reset recurrence fields when disabled
                setValue("recurrence_pattern", "daily");
                setValue("recurrence_interval", 1);
                setValue("recurrence_end_type", "occurrences");
                setValue("recurrence_occurrences", 10);
                setValue("recurrence_end_date", "");
                setValue("recurrence_days_of_week", []);
              }
            }}
            className="w-5 h-5 rounded-md border-slate-300 dark:border-slate-600"
          />
          <Label htmlFor="is_recurring" className="text-base font-medium text-slate-900 dark:text-slate-100 cursor-pointer">
            Make this a recurring appointment
          </Label>
        </div>

        {isRecurring && (
          <div className="space-y-3 pl-4 border-l-2 border-purple-200 dark:border-purple-800 bg-purple-50/20 dark:bg-purple-950/10 rounded-r-lg p-4">
            {/* Pattern and Interval - Compact Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label htmlFor="recurrence_pattern" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Pattern <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={recurrencePattern}
                  onValueChange={(value) => {
                    setValue("recurrence_pattern", value as any);
                    setValue("recurrence_days_of_week", []);
                    setValue("recurrence_day_of_month", undefined);
                    setValue("recurrence_week_of_month", undefined);
                    setValue("recurrence_month", undefined);
                  }}
                >
                  <SelectTrigger className="h-9 rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="recurrence_interval" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Every
                </Label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    min="1"
                    value={watch("recurrence_interval") || 1}
                    onChange={(e) => setValue("recurrence_interval", parseInt(e.target.value) || 1)}
                    className="h-9 rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm flex-1"
                  />
                  <div className="flex items-center text-xs text-slate-600 dark:text-slate-400 px-2">
                    {recurrencePattern === "daily" && "day(s)"}
                    {recurrencePattern === "weekly" && "week(s)"}
                    {recurrencePattern === "monthly" && "month(s)"}
                    {recurrencePattern === "yearly" && "year(s)"}
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly: Days of Week */}
            {recurrencePattern === "weekly" && (
              <div>
                <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 block">
                  Days
                </Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 1, label: "Mo" },
                    { value: 2, label: "Tu" },
                    { value: 3, label: "We" },
                    { value: 4, label: "Th" },
                    { value: 5, label: "Fr" },
                    { value: 6, label: "Sa" },
                    { value: 0, label: "Su" },
                  ].map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => {
                        const current = recurrenceDaysOfWeek || [];
                        if (recurrenceDaysOfWeek.includes(day.value)) {
                          setValue(
                            "recurrence_days_of_week",
                            current.filter((d) => d !== day.value)
                          );
                        } else {
                          setValue("recurrence_days_of_week", [...current, day.value]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        recurrenceDaysOfWeek.includes(day.value)
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-blue-400"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}


            {/* Monthly: Day of Month */}
            {recurrencePattern === "monthly" && (
              <div>
                <Label htmlFor="recurrence_day_of_month">Day of Month</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="e.g., 15"
                  value={watch("recurrence_day_of_month") || ""}
                  onChange={(e) =>
                    setValue("recurrence_day_of_month", parseInt(e.target.value) || undefined)
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use the same day as start date
                </p>
              </div>
            )}

            {/* Yearly: Month */}
            {recurrencePattern === "yearly" && (
              <div>
                <Label htmlFor="recurrence_month">Month</Label>
                <Select
                  value={watch("recurrence_month")?.toString() || ""}
                  onValueChange={(value) => setValue("recurrence_month", parseInt(value) || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      { value: 1, label: "January" },
                      { value: 2, label: "February" },
                      { value: 3, label: "March" },
                      { value: 4, label: "April" },
                      { value: 5, label: "May" },
                      { value: 6, label: "June" },
                      { value: 7, label: "July" },
                      { value: 8, label: "August" },
                      { value: 9, label: "September" },
                      { value: 10, label: "October" },
                      { value: 11, label: "November" },
                      { value: 12, label: "December" },
                    ].map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* End Condition - Compact */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <input
                  type="radio"
                  id="end_type_occurrences"
                  name="recurrence_end_type"
                  value="occurrences"
                  checked={recurrenceEndType === "occurrences"}
                  onChange={() => setValue("recurrence_end_type", "occurrences")}
                  className="w-4 h-4 text-blue-600"
                />
                <Label htmlFor="end_type_occurrences" className="cursor-pointer flex items-center gap-2 text-sm flex-1">
                  <span>After</span>
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    className="h-7 w-16 rounded border-slate-300 dark:border-slate-600 text-xs"
                    value={watch("recurrence_occurrences") || 10}
                    onChange={(e) =>
                      setValue("recurrence_occurrences", parseInt(e.target.value) || 10)
                    }
                    disabled={recurrenceEndType !== "occurrences"}
                  />
                </Label>
              </div>
              <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <input
                  type="radio"
                  id="end_type_date"
                  name="recurrence_end_type"
                  value="date"
                  checked={recurrenceEndType === "date"}
                  onChange={() => setValue("recurrence_end_type", "date")}
                  className="w-4 h-4 text-blue-600"
                />
                <Label htmlFor="end_type_date" className="cursor-pointer flex items-center gap-2 text-sm flex-1">
                  <span>On</span>
                  <Input
                    type="date"
                    className="h-7 flex-1 rounded border-slate-300 dark:border-slate-600 text-xs"
                    value={watch("recurrence_end_date") || ""}
                    onChange={(e) => setValue("recurrence_end_date", e.target.value)}
                    disabled={recurrenceEndType !== "date"}
                    min={appointmentDate}
                  />
                </Label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notes Section - Compact */}
      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div>
          <Label htmlFor="mini_notes" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
            Brief Notes
          </Label>
          <Textarea
            {...register("mini_notes")}
            placeholder="Brief notes..."
            rows={2}
            className="rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 resize-none text-sm"
          />
        </div>
        <div>
          <Label htmlFor="full_notes" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
            Detailed Notes
          </Label>
          <Textarea
            {...register("full_notes")}
            placeholder="Detailed notes..."
            rows={3}
            className="rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 resize-none text-sm"
          />
        </div>
        <div>
          <Label htmlFor="pickup_instructions" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
            Pickup Instructions
          </Label>
          <Textarea
            {...register("pickup_instructions")}
            placeholder="Special instructions..."
            rows={2}
            className="rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 resize-none text-sm"
          />
        </div>
      </div>
    </form>
  );
};

