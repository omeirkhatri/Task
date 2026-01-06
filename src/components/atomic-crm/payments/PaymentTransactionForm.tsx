import { useState, useEffect, useMemo } from "react";
import { required } from "ra-core";
import { useFormContext, useWatch } from "react-hook-form";
import { ReferenceInput } from "@/components/admin/reference-input";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { SelectInput } from "@/components/admin/select-input";
import { NumberInput } from "@/components/admin/number-input";
import { DateInput } from "@/components/admin/date-input";
import { TextInput } from "@/components/admin/text-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetList } from "ra-core";
import type { PaymentTransaction, PaymentPackage } from "./types";
import type { Contact } from "../types";
import { useBankChargeCalculation } from "./BankChargeCalculator";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";

// Validation functions
const validatePositive = (value: any) => {
  if (value == null || value === "") return undefined;
  const num = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(num) || num <= 0) {
    return "Must be greater than 0";
  }
  return undefined;
};

const validateNonNegative = (value: any) => {
  if (value == null || value === "") return undefined;
  const num = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(num) || num < 0) {
    return "Must be 0 or greater";
  }
  return undefined;
};

type PaymentTransactionFormProps = {
  record?: PaymentTransaction | null;
  defaultPackageId?: string | number;
  defaultAppointmentId?: string | number;
};

const paymentMethodChoices = [
  { id: "POS", name: "POS" },
  { id: "Tabby", name: "Tabby" },
  { id: "Payment Link", name: "Payment Link" },
  { id: "Ziina", name: "Ziina" },
  { id: "Cash", name: "Cash" },
];

export const PaymentTransactionForm = ({ record, defaultPackageId, defaultAppointmentId }: PaymentTransactionFormProps) => {
  const { setValue, getValues } = useFormContext();
  
  // Custom validation: require at least one of package_id or appointment_id
  const validatePackageOrAppointment = (value: any) => {
    const formValues = getValues();
    const packageId = value || formValues?.payment_package_id;
    const appointmentId = formValues?.appointment_id || defaultAppointmentId;
    
    if (!packageId && !appointmentId) {
      return "Either a payment package or appointment must be selected";
    }
    return undefined;
  };
  const [useDefaultBankCharge, setUseDefaultBankCharge] = useState(true);
  const [showCalculationBreakdown, setShowCalculationBreakdown] = useState(false);

  // Watch form values
  const paymentPackageId = useWatch({ name: "payment_package_id" }) || defaultPackageId;
  const appointmentId = useWatch({ name: "appointment_id" });
  const amountReceived = useWatch({ name: "amount_received" });
  const paymentMethod = useWatch({ name: "payment_method" });
  const bankCharge = useWatch({ name: "bank_charge" });
  const datePaid = useWatch({ name: "date_paid" });
  const dateReceived = useWatch({ name: "date_received" });

  // Fetch payment package to get installment info
  const { data: packageData } = useGetList<PaymentPackage>(
    "payment_packages",
    {
      pagination: { page: 1, perPage: 1 },
      filter: paymentPackageId ? { id: paymentPackageId } : {},
    },
    { enabled: !!paymentPackageId }
  );

  const selectedPackage = packageData?.[0];

  // Fetch patients for name lookup
  const { data: patients } = useGetList<Contact>("clients", {
    pagination: { page: 1, perPage: 1000 },
  });

  // Create patients map for quick lookup
  const patientsMap = useMemo(() => {
    if (!patients) return new Map<number, Contact>();
    return new Map(patients.map((p) => [Number(p.id), p]));
  }, [patients]);

  // Calculate bank charge using hook
  const { calculation: bankChargeCalculation, isLoading: calculatingCharge } = useBankChargeCalculation(
    amountReceived,
    paymentMethod as any
  );

  // Auto-calculate bank charge when amount or payment method changes (if using default)
  useEffect(() => {
    if (useDefaultBankCharge && bankChargeCalculation && amountReceived && paymentMethod) {
      setValue("bank_charge", bankChargeCalculation.totalCharge, { shouldDirty: false, shouldValidate: false });
    }
  }, [useDefaultBankCharge, bankChargeCalculation, amountReceived, paymentMethod, setValue]);

  // Auto-calculate net amount
  useEffect(() => {
    if (amountReceived != null && bankCharge != null) {
      const netAmount = amountReceived - bankCharge;
      setValue("net_amount", netAmount, { shouldDirty: false, shouldValidate: false });
    }
  }, [amountReceived, bankCharge, setValue]);

  // Set default dates to today
  useEffect(() => {
    if (!record) {
      const today = new Date().toISOString().split("T")[0];
      if (!datePaid) {
        setValue("date_paid", today);
      }
      if (!dateReceived) {
        setValue("date_received", today);
      }
    }
  }, [record, datePaid, dateReceived, setValue]);


  // Set default package if provided
  useEffect(() => {
    if (defaultPackageId && !paymentPackageId) {
      setValue("payment_package_id", defaultPackageId);
    }
  }, [defaultPackageId, paymentPackageId, setValue]);

  // Set default appointment if provided
  useEffect(() => {
    if (defaultAppointmentId && !appointmentId) {
      setValue("appointment_id", defaultAppointmentId);
    }
  }, [defaultAppointmentId, appointmentId, setValue]);

  const netAmount = amountReceived && bankCharge ? amountReceived - bankCharge : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Payment Package Selection (Optional) */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Package (Optional)</CardTitle>
          <CardDescription>
            Select a payment package, or leave empty for a standalone payment
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ReferenceInput
            source="payment_package_id"
            reference="payment_packages"
          >
            <AutocompleteInput
              label="Payment Package"
              optionText={(pkg: PaymentPackage) => {
                // Get patient name from map
                const patient = patientsMap.get(Number(pkg.patient_id));
                const patientName = patient 
                  ? `${patient.first_name} ${patient.last_name}`.trim()
                  : `Patient #${pkg.patient_id}`;
                
                // Use package name if available, otherwise use ID
                const packageName = (pkg as any).name || `Package #${pkg.id}`;
                
                // Return: "Package Name - Patient Name - AED Amount"
                return `${packageName} - ${patientName} - AED ${pkg.total_amount.toLocaleString()}`;
              }}
              helperText="Leave empty to create a standalone payment"
              validate={validatePackageOrAppointment}
            />
          </ReferenceInput>

          {selectedPackage && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm">
              <p className="font-medium">Package Details:</p>
              <p className="text-muted-foreground">
                Type: {selectedPackage.package_type} | Total: AED {selectedPackage.total_amount.toLocaleString()}
              </p>
              {selectedPackage.next_payment_date && (
                <p className="text-muted-foreground mt-1">
                  Next payment scheduled: {new Date(selectedPackage.next_payment_date).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>Enter payment amount and method</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <NumberInput
            source="amount_received"
            label="Amount Received (AED)"
            validate={[required(), validatePositive]}
            helperText="Gross amount before bank charges"
            min={0}
            step={0.01}
          />

          <SelectInput
            source="payment_method"
            label="Payment Method"
            choices={paymentMethodChoices}
            validate={required()}
            helperText={false}
          />

          {/* Bank Charge Section */}
          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <Label className="text-sm font-medium">Bank Charge Calculation</Label>
                <span className="text-xs text-muted-foreground">
                  Use default calculation or enter manually
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm ${useDefaultBankCharge ? "font-medium" : "text-muted-foreground"}`}>
                  Use Default
                </span>
                <Switch
                  checked={useDefaultBankCharge}
                  onCheckedChange={setUseDefaultBankCharge}
                />
                <span className={`text-sm ${!useDefaultBankCharge ? "font-medium" : "text-muted-foreground"}`}>
                  Manual Entry
                </span>
              </div>
            </div>

            <NumberInput
              source="bank_charge"
              label="Bank Charge (AED)"
              validate={[required(), validateNonNegative]}
              helperText={useDefaultBankCharge ? "Auto-calculated based on payment method" : "Enter bank charge manually"}
              min={0}
              step={0.01}
              disabled={useDefaultBankCharge && calculatingCharge}
            />

            {/* Calculation Breakdown */}
            {bankChargeCalculation && useDefaultBankCharge && (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => setShowCalculationBreakdown(!showCalculationBreakdown)}
                >
                  <span className="text-sm">Show Calculation Breakdown</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showCalculationBreakdown ? "rotate-180" : ""}`} />
                </Button>
                {showCalculationBreakdown && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Base Fee:</span>
                      <span className="font-medium">AED {bankChargeCalculation.baseFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT ({paymentMethod === "POS" ? "5%" : paymentMethod === "Payment Link" ? "5%" : "5%"}):</span>
                      <span className="font-medium">AED {bankChargeCalculation.vatAmount.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total Charge:</span>
                      <span>AED {bankChargeCalculation.totalCharge.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Net Amount Display - value is set via useEffect setValue */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Net Amount (After Charges):</span>
              <span className="text-lg font-semibold text-green-700 dark:text-green-400">
                AED {netAmount.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Amount received minus bank charges (auto-calculated)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Dates and Invoice */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
          <CardDescription>Record payment dates and invoice details</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <DateInput
              source="date_paid"
              label="Date Paid"
              validate={required()}
              helperText={false}
            />
            <DateInput
              source="date_received"
              label="Date Received"
              validate={required()}
              helperText={false}
            />
          </div>

          <TextInput
            source="invoice_number"
            label="Invoice Number"
            helperText="Optional invoice number from accounting system"
          />
        </CardContent>
      </Card>

    </div>
  );
};

