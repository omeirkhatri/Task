import { useState, useEffect } from "react";
import { useNotify } from "ra-core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Info } from "lucide-react";
import { usePaymentSettings, type PaymentSetting } from "@/hooks/usePaymentSettings";

interface PaymentSettingFormData {
  fee_percentage: string;
  fixed_fee_amount: string;
  vat_percentage: string;
}

const PAYMENT_METHODS: PaymentSetting["payment_method"][] = [
  "POS",
  "Payment Link",
  "Ziina",
  "Tabby",
  "Cash",
];

export const PaymentSettingsSection = () => {
  const notify = useNotify();
  const { data: settings, isLoading, updateAllSettings } = usePaymentSettings();
  const [formData, setFormData] = useState<
    Record<string, PaymentSettingFormData>
  >({});
  const [errors, setErrors] = useState<
    Record<string, Partial<PaymentSettingFormData>>
  >({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when settings are loaded
  useEffect(() => {
    if (settings && settings.length > 0) {
      const initialData: Record<string, PaymentSettingFormData> = {};
      settings.forEach((setting) => {
        initialData[setting.payment_method] = {
          fee_percentage: setting.fee_percentage?.toString() ?? "",
          fixed_fee_amount: setting.fixed_fee_amount?.toString() ?? "",
          vat_percentage: setting.vat_percentage?.toString() ?? "5",
        };
      });
      setFormData(initialData);
    }
  }, [settings]);

  const validateField = (
    method: string,
    field: keyof PaymentSettingFormData,
    value: string
  ): string | undefined => {
    const numValue = parseFloat(value);
    const isEmpty = value.trim() === "";

    if (field === "fee_percentage") {
      if (!isEmpty && (isNaN(numValue) || numValue < 0 || numValue > 100)) {
        return "Fee percentage must be between 0 and 100";
      }
    } else if (field === "fixed_fee_amount") {
      if (!isEmpty && (isNaN(numValue) || numValue < 0)) {
        return "Fixed fee amount must be 0 or greater";
      }
    } else if (field === "vat_percentage") {
      if (isEmpty || isNaN(numValue) || numValue < 0 || numValue > 100) {
        return "VAT percentage must be between 0 and 100";
      }
    }

    return undefined;
  };

  const handleFieldChange = (
    method: string,
    field: keyof PaymentSettingFormData,
    value: string
  ) => {
    // Update form data
    setFormData((prev) => ({
      ...prev,
      [method]: {
        ...prev[method],
        [field]: value,
      },
    }));

    // Validate and update errors
    const error = validateField(method, field, value);
    setErrors((prev) => ({
      ...prev,
      [method]: {
        ...prev[method],
        [field]: error,
      },
    }));
  };

  const validateAllFields = (): boolean => {
    const newErrors: Record<string, Partial<PaymentSettingFormData>> = {};
    let isValid = true;

    PAYMENT_METHODS.forEach((method) => {
      const data = formData[method];
      if (!data) return;

      const methodErrors: Partial<PaymentSettingFormData> = {};

      const feeError = validateField(method, "fee_percentage", data.fee_percentage);
      if (feeError) {
        methodErrors.fee_percentage = feeError;
        isValid = false;
      }

      const fixedError = validateField(
        method,
        "fixed_fee_amount",
        data.fixed_fee_amount
      );
      if (fixedError) {
        methodErrors.fixed_fee_amount = fixedError;
        isValid = false;
      }

      const vatError = validateField(method, "vat_percentage", data.vat_percentage);
      if (vatError) {
        methodErrors.vat_percentage = vatError;
        isValid = false;
      }

      if (Object.keys(methodErrors).length > 0) {
        newErrors[method] = methodErrors;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateAllFields()) {
      notify("Please fix validation errors before saving", { type: "error" });
      return;
    }

    setIsSaving(true);

    try {
      // Prepare updates for all payment methods
      const updates: Record<PaymentSetting["payment_method"], {
        fee_percentage: number | null;
        fixed_fee_amount: number | null;
        vat_percentage: number;
      }> = {} as any;

      PAYMENT_METHODS.forEach((method) => {
        const data = formData[method];
        if (!data) return;

        updates[method] = {
          fee_percentage:
            data.fee_percentage.trim() === ""
              ? null
              : parseFloat(data.fee_percentage),
          fixed_fee_amount:
            data.fixed_fee_amount.trim() === ""
              ? null
              : parseFloat(data.fixed_fee_amount),
          vat_percentage: parseFloat(data.vat_percentage),
        };
      });

      await updateAllSettings(updates);
    } catch (error) {
      console.error("Error updating payment settings:", error);
      // Error notification is handled by the hook
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Payment Settings</CardTitle>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Bank Charge Calculation:</p>
                <p>
                  Bank charge = (Amount × Fee %) + Fixed Fee, then add VAT on
                  the total fee.
                </p>
                <p className="mt-1 text-xs">
                  Example: For AED 1,000 with POS (1.9% + 5% VAT): Base fee =
                  AED 19.00, VAT = AED 0.95, Total = AED 19.95
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {PAYMENT_METHODS.map((method) => {
              const setting = settings?.find((s) => s.payment_method === method);
              const data = formData[method];
              const methodErrors = errors[method] || {};

              if (!setting || !data) return null;

              return (
                <div
                  key={method}
                  className="border rounded-lg p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{method}</h3>
                    {method === "Tabby" && (
                      <span className="text-xs text-muted-foreground italic">
                        Fee structure to be configured once details are provided
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${method}-fee-percentage`}>
                        Fee Percentage (%)
                      </Label>
                      <Input
                        id={`${method}-fee-percentage`}
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={data.fee_percentage}
                        onChange={(e) =>
                          handleFieldChange(method, "fee_percentage", e.target.value)
                        }
                        placeholder="0.00"
                        className={
                          methodErrors.fee_percentage ? "border-destructive" : ""
                        }
                      />
                      {methodErrors.fee_percentage && (
                        <p className="text-sm text-destructive">
                          {methodErrors.fee_percentage}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${method}-fixed-fee`}>
                        Fixed Fee Amount (AED)
                      </Label>
                      <Input
                        id={`${method}-fixed-fee`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={data.fixed_fee_amount}
                        onChange={(e) =>
                          handleFieldChange(method, "fixed_fee_amount", e.target.value)
                        }
                        placeholder="0.00"
                        className={
                          methodErrors.fixed_fee_amount ? "border-destructive" : ""
                        }
                      />
                      {methodErrors.fixed_fee_amount && (
                        <p className="text-sm text-destructive">
                          {methodErrors.fixed_fee_amount}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${method}-vat-percentage`}>
                        VAT Percentage (%)
                      </Label>
                      <Input
                        id={`${method}-vat-percentage`}
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={data.vat_percentage}
                        onChange={(e) =>
                          handleFieldChange(method, "vat_percentage", e.target.value)
                        }
                        className={
                          methodErrors.vat_percentage ? "border-destructive" : ""
                        }
                      />
                      {methodErrors.vat_percentage && (
                        <p className="text-sm text-destructive">
                          {methodErrors.vat_percentage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

