import { useState, useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { SelectInput } from "@/components/admin/select-input";
import { NumberInput } from "@/components/admin/number-input";
import { DateInput } from "@/components/admin/date-input";
import { TextInput } from "@/components/admin/text-input";
import { required } from "ra-core";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { PaymentPackage } from "./types";

type UsageAdjustmentFormProps = {
  package: PaymentPackage;
};

const validatePositive = (value: any) => {
  if (value == null || value === "") return undefined;
  const num = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(num) || num <= 0) {
    return "Must be greater than 0";
  }
  return undefined;
};

const usageTypeChoices = [
  { id: "session", name: "Sessions" },
  { id: "hours", name: "Hours" },
];

export const UsageAdjustmentForm = ({ package: pkg }: UsageAdjustmentFormProps) => {
  const { setValue } = useFormContext();
  const usageType = useWatch({ name: "usage_type" });
  const usageDate = useWatch({ name: "usage_date" });

  // Set default values
  useEffect(() => {
    const defaultUsageType = pkg.package_type === "session-based" ? "session" : "hours";
    if (!usageType) {
      setValue("usage_type", defaultUsageType);
    }
    if (!usageDate) {
      setValue("usage_date", new Date().toISOString().split("T")[0]);
    }
  }, [pkg.package_type, setValue, usageType, usageDate]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manual Usage Adjustment</CardTitle>
          <CardDescription>
            Add or adjust usage for this package. This will create a manual adjustment record.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SelectInput
            source="usage_type"
            label="Usage Type"
            choices={usageTypeChoices}
            validate={required()}
            helperText={
              pkg.package_type === "session-based"
                ? "This package tracks sessions"
                : "This package tracks hours"
            }
          />

          <NumberInput
            source="quantity_used"
            label={(usageType || (pkg.package_type === "session-based" ? "session" : "hours")) === "session" ? "Number of Sessions" : "Number of Hours"}
            validate={[required(), validatePositive]}
            min={0}
            step={(usageType || (pkg.package_type === "session-based" ? "session" : "hours")) === "session" ? 1 : 0.1}
            helperText={
              (usageType || (pkg.package_type === "session-based" ? "session" : "hours")) === "session"
                ? "Enter the number of sessions to add"
                : "Enter the number of hours to add"
            }
          />

          <DateInput
            source="usage_date"
            label="Usage Date"
            validate={required()}
            helperText="Date when this usage occurred"
          />

          <TextInput
            source="notes"
            label="Notes (Optional)"
            helperText="Explain why this adjustment is needed (e.g., 'Appointment was completed but not tracked automatically')"
            multiline
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  );
};

