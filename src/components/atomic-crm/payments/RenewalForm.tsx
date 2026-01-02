import { useState, useEffect } from "react";
import { required } from "ra-core";
import { useFormContext, useWatch } from "react-hook-form";
import { ReferenceInput } from "@/components/admin/reference-input";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { RadioButtonGroupInput } from "@/components/admin/radio-button-group-input";
import { NumberInput } from "@/components/admin/number-input";
import { DateInput } from "@/components/admin/date-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { PaymentPackage } from "./types";

// Validation functions
const validatePositive = (value: any) => {
  if (value == null || value === "") return undefined;
  const num = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(num) || num <= 0) {
    return "Must be greater than 0";
  }
  return undefined;
};

const validatePositiveInteger = (value: any) => {
  if (value == null || value === "") return undefined;
  const num = typeof value === "number" ? value : parseInt(value, 10);
  if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
    return "Must be a positive whole number";
  }
  return undefined;
};

type RenewalFormProps = {
  currentPackage: PaymentPackage;
};

const packageTypeChoices = [
  { id: "session-based", name: "Session-based" },
  { id: "time-based", name: "Time-based" },
  { id: "post-payment", name: "Post-payment" },
];

export const RenewalForm = ({ currentPackage }: RenewalFormProps) => {
  const packageType = useWatch({ name: "package_type" }) || currentPackage.package_type || "session-based";
  const [priceMode, setPriceMode] = useState<"total" | "perHour">(
    currentPackage.price_per_hour ? "perHour" : "total"
  );
  const { setValue, reset } = useFormContext();
  const startDate = useWatch({ name: "start_date" });

  // Watch for changes in time-based fields to calculate price
  const totalAmount = useWatch({ name: "total_amount" });
  const pricePerHour = useWatch({ name: "price_per_hour" });
  const durationDays = useWatch({ name: "duration_days" });
  const hoursPerDay = useWatch({ name: "hours_per_day" });

  // Initialize form with current package values
  useEffect(() => {
    const defaultValues = {
      patient_id: currentPackage.patient_id,
      service_id: currentPackage.service_id,
      package_type: currentPackage.package_type,
      total_amount: currentPackage.total_amount,
      price_per_hour: currentPackage.price_per_hour,
      total_sessions: currentPackage.total_sessions,
      total_hours: currentPackage.total_hours,
      duration_days: currentPackage.duration_days,
      hours_per_day: currentPackage.hours_per_day,
      start_date: new Date().toISOString().split("T")[0], // Default to today for renewal
    };
    reset(defaultValues);
  }, [currentPackage, reset]);

  // Auto-calculate price_per_hour when total_amount, duration_days, or hours_per_day changes
  useEffect(() => {
    if (packageType === "time-based" && priceMode === "total") {
      if (totalAmount && durationDays && hoursPerDay && hoursPerDay > 0) {
        const totalHours = durationDays * hoursPerDay;
        if (totalHours > 0) {
          const calculatedPricePerHour = totalAmount / totalHours;
          setValue("price_per_hour", calculatedPricePerHour, { shouldDirty: false, shouldValidate: false });
          setValue("total_hours", totalHours, { shouldDirty: false, shouldValidate: false });
        }
      }
    }
  }, [packageType, priceMode, totalAmount, durationDays, hoursPerDay, setValue]);

  // Auto-calculate total_amount when price_per_hour, duration_days, or hours_per_day changes
  useEffect(() => {
    if (packageType === "time-based" && priceMode === "perHour") {
      if (pricePerHour && durationDays && hoursPerDay && hoursPerDay > 0) {
        const totalHours = durationDays * hoursPerDay;
        if (totalHours > 0) {
          const calculatedTotalAmount = pricePerHour * totalHours;
          setValue("total_amount", calculatedTotalAmount, { shouldDirty: false, shouldValidate: false });
          setValue("total_hours", totalHours, { shouldDirty: false, shouldValidate: false });
        }
      }
    }
  }, [packageType, priceMode, pricePerHour, durationDays, hoursPerDay, setValue]);

  // Auto-calculate end_date and renewal_date when start_date or duration_days changes
  useEffect(() => {
    if (packageType === "time-based" && startDate && durationDays) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + durationDays);
      const endDateStr = end.toISOString().split("T")[0];
      setValue("end_date", endDateStr, { shouldDirty: false, shouldValidate: false });
      setValue("renewal_date", endDateStr, { shouldDirty: false, shouldValidate: false });
    }
  }, [packageType, startDate, durationDays, setValue]);

  return (
    <div className="flex flex-col gap-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Review and update patient, service, and package type</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
            <ReferenceInput
              source="patient_id"
              reference="clients"
              filter={{ isClient: true, "archived_at@is": null }}
            >
            <AutocompleteInput
              label="Patient"
              optionText={(contact: any) => `${contact.first_name} ${contact.last_name}`}
              helperText={false}
              validate={required()}
            />
          </ReferenceInput>

          <ReferenceInput
            source="service_id"
            reference="services"
          >
            <AutocompleteInput
              label="Service"
              optionText="name"
              helperText={false}
            />
          </ReferenceInput>

          <RadioButtonGroupInput
            source="package_type"
            label="Package Type"
            choices={packageTypeChoices}
            validate={required()}
            row
            helperText={false}
          />
        </CardContent>
      </Card>

      {/* Session-based Package Fields */}
      {packageType === "session-based" && (
        <Card>
          <CardHeader>
            <CardTitle>Session-based Package Details</CardTitle>
            <CardDescription>Enter total amount and number of sessions</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <NumberInput
              source="total_amount"
              label="Total Amount (AED)"
              validate={[required(), validatePositive]}
              helperText={false}
              min={0}
              step={0.01}
            />
            <NumberInput
              source="total_sessions"
              label="Total Sessions"
              validate={[required(), validatePositiveInteger]}
              helperText={false}
              min={1}
            />
          </CardContent>
        </Card>
      )}

      {/* Time-based Package Fields */}
      {packageType === "time-based" && (
        <Card>
          <CardHeader>
            <CardTitle>Time-based Package Details</CardTitle>
            <CardDescription>Configure duration and pricing</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Price Mode Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex flex-col">
                <Label className="text-sm font-medium">Price Entry Mode</Label>
                <span className="text-xs text-muted-foreground">
                  Choose how to enter the package price
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm ${priceMode === "total" ? "font-medium" : "text-muted-foreground"}`}>
                  Total Price
                </span>
                <Switch
                  checked={priceMode === "perHour"}
                  onCheckedChange={(checked) => setPriceMode(checked ? "perHour" : "total")}
                />
                <span className={`text-sm ${priceMode === "perHour" ? "font-medium" : "text-muted-foreground"}`}>
                  Price Per Hour
                </span>
              </div>
            </div>

            <Separator />

            {/* Conditional Price Fields */}
            {priceMode === "total" ? (
              <NumberInput
                source="total_amount"
                label="Total Amount (AED)"
                validate={[required(), validatePositive]}
                helperText={false}
                min={0}
                step={0.01}
              />
            ) : (
              <NumberInput
                source="price_per_hour"
                label="Price Per Hour (AED)"
                validate={[required(), validatePositive]}
                helperText={false}
                min={0}
                step={0.01}
              />
            )}

            {/* Duration Fields */}
            <div className="grid grid-cols-2 gap-4">
              <NumberInput
                source="duration_days"
                label="Duration (Days)"
                validate={[required(), validatePositiveInteger]}
                helperText={false}
                min={1}
              />
              <NumberInput
                source="hours_per_day"
                label="Hours Per Day"
                validate={[required(), validatePositive]}
                helperText={false}
                min={0.1}
                max={24}
                step={0.1}
              />
            </div>

            {/* Calculated Display */}
            <PriceCalculationDisplay
              priceMode={priceMode}
              totalAmount={totalAmount}
              pricePerHour={pricePerHour}
              durationDays={durationDays}
              hoursPerDay={hoursPerDay}
            />
            
            {/* Hidden field to store total_hours */}
            <input type="hidden" name="total_hours" />
          </CardContent>
        </Card>
      )}

      {/* Post-payment Package Fields */}
      {packageType === "post-payment" && (
        <Card>
          <CardHeader>
            <CardTitle>Post-payment Package Details</CardTitle>
            <CardDescription>Enter amount and optionally link to appointment</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <NumberInput
              source="total_amount"
              label="Total Amount (AED)"
              validate={[required(), validatePositive]}
              helperText={false}
              min={0}
              step={0.01}
            />
            <ReferenceInput
              source="appointment_id"
              reference="appointments"
              filter={{ status: "completed" }}
            >
              <AutocompleteInput
                label="Link to Appointment (Optional)"
                optionText={(appointment: any) => 
                  `${appointment.appointment_type} - ${new Date(appointment.appointment_date).toLocaleDateString()}`
                }
                helperText={false}
              />
            </ReferenceInput>
          </CardContent>
        </Card>
      )}

      {/* Common Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Package Schedule</CardTitle>
          <CardDescription>Set start date and optional end/renewal dates</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <DateInput
            source="start_date"
            label="Start Date"
            validate={required()}
            helperText={false}
          />
          <DateInput
            source="end_date"
            label="End Date (Auto-calculated for time-based)"
            helperText={false}
          />
          <DateInput
            source="renewal_date"
            label="Renewal Date (Auto-calculated for time-based)"
            helperText={false}
          />
        </CardContent>
      </Card>
    </div>
  );
};

// Helper component to display calculated values
const PriceCalculationDisplay = ({
  priceMode,
  totalAmount,
  pricePerHour,
  durationDays,
  hoursPerDay,
}: {
  priceMode: "total" | "perHour";
  totalAmount?: number;
  pricePerHour?: number;
  durationDays?: number;
  hoursPerDay?: number;
}) => {
  const [calculatedTotal, setCalculatedTotal] = useState<number | null>(null);
  const [calculatedPricePerHour, setCalculatedPricePerHour] = useState<number | null>(null);
  const [totalHours, setTotalHours] = useState<number | null>(null);

  useEffect(() => {
    if (durationDays && hoursPerDay) {
      const hours = durationDays * hoursPerDay;
      setTotalHours(hours);

      if (priceMode === "total" && totalAmount && hours > 0) {
        // Calculate price per hour from total
        setCalculatedPricePerHour(totalAmount / hours);
        setCalculatedTotal(null);
      } else if (priceMode === "perHour" && pricePerHour && hours > 0) {
        // Calculate total from price per hour
        setCalculatedTotal(pricePerHour * hours);
        setCalculatedPricePerHour(null);
      } else {
        setCalculatedTotal(null);
        setCalculatedPricePerHour(null);
      }
    } else {
      setCalculatedTotal(null);
      setCalculatedPricePerHour(null);
      setTotalHours(null);
    }
  }, [priceMode, totalAmount, pricePerHour, durationDays, hoursPerDay]);

  if (!calculatedTotal && !calculatedPricePerHour && !totalHours) {
    return null;
  }

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border">
      <div className="text-sm font-medium mb-2">Calculated Values</div>
      <div className="space-y-1 text-sm">
        {totalHours !== null && (
          <div>Total Hours: <span className="font-medium">{totalHours.toFixed(1)}</span></div>
        )}
        {calculatedPricePerHour !== null && (
          <div>Price Per Hour: <span className="font-medium">AED {calculatedPricePerHour.toFixed(2)}</span></div>
        )}
        {calculatedTotal !== null && (
          <div>Total Amount: <span className="font-medium">AED {calculatedTotal.toFixed(2)}</span></div>
        )}
      </div>
    </div>
  );
};

