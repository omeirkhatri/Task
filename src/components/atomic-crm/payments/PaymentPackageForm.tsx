import { useState, useEffect } from "react";
import { required } from "ra-core";
import { useFormContext, useWatch } from "react-hook-form";
import { ReferenceInput } from "@/components/admin/reference-input";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { RadioButtonGroupInput } from "@/components/admin/radio-button-group-input";
import { NumberInput } from "@/components/admin/number-input";
import { DateInput } from "@/components/admin/date-input";
import { TextInput } from "@/components/admin/text-input";
import { BooleanInput } from "@/components/admin/boolean-input";
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

const validateDateAfterStart = (startDate: string | undefined) => (value: any) => {
  if (!value || !startDate) return undefined;
  const valueDate = new Date(value);
  const start = new Date(startDate);
  if (valueDate <= start) {
    return "Must be after start date";
  }
  return undefined;
};

type PaymentPackageFormProps = {
  record?: PaymentPackage | null;
};

const packageTypeChoices = [
  { id: "session-based", name: "Session-based" },
  { id: "time-based", name: "Time-based" },
  { id: "post-payment", name: "Post-payment" },
];

export const PaymentPackageForm = ({ record }: PaymentPackageFormProps) => {
  const packageType = useWatch({ name: "package_type" }) || record?.package_type || "session-based";
  const [priceMode, setPriceMode] = useState<"total" | "perHour">("total");
  const { setValue } = useFormContext();
  const startDate = useWatch({ name: "start_date" });
  const patientId = useWatch({ name: "patient_id" });
  const isPatientPreFilled = !!patientId && !record; // Pre-filled if patient_id exists and we're creating (not editing)

  // Watch for changes in time-based fields to calculate price
  const totalAmount = useWatch({ name: "total_amount" });
  const pricePerHour = useWatch({ name: "price_per_hour" });
  const durationDays = useWatch({ name: "duration_days" });
  const hoursPerDay = useWatch({ name: "hours_per_day" });

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

  return (
    <div className="flex flex-col gap-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Select patient, service, and package type</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ReferenceInput
            source="patient_id"
            reference="clients"
            filter={{ isClient: true, "archived_at@is": null }}
          >
            <AutocompleteInput
              label="Patient (Client Only)"
              optionText={(contact: any) => `${contact.first_name} ${contact.last_name}`}
              placeholder={isPatientPreFilled ? undefined : "Select a client..."}
              helperText={isPatientPreFilled ? "Client pre-selected from page" : "Search and select a client (only clients with converted deals can have payment packages)"}
              validate={required()}
              readOnly={isPatientPreFilled}
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
            label="End Date (Optional)"
            validate={startDate ? validateDateAfterStart(startDate) : undefined}
            helperText={false}
          />
          <DateInput
            source="renewal_date"
            label="Renewal Date (Optional)"
            validate={startDate ? validateDateAfterStart(startDate) : undefined}
            helperText={false}
          />
        </CardContent>
      </Card>

      {/* Payment Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Schedule (Optional)</CardTitle>
          <CardDescription>Set the next scheduled payment date</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <DateInput
            source="next_payment_date"
            label="Next Payment Date"
            helperText="Optional: Set when the next payment is expected"
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

