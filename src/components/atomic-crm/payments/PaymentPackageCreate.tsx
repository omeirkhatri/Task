import { CreateBase, Form, useRedirect, useRefresh, useNotify } from "ra-core";
import { useSearchParams } from "react-router";
import { useFormContext } from "react-hook-form";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormToolbar } from "@/components/admin/simple-form";
import { PaymentPackageForm } from "./PaymentPackageForm";
import type { PaymentPackage } from "./types";

const PaymentPackageCreateForm = () => {
  const { setValue, getValues } = useFormContext();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patient_id");

  // Set patient_id from URL query parameter if provided
  useEffect(() => {
    if (patientId) {
      // Convert to number if it's a numeric string
      const patientIdValue = isNaN(Number(patientId)) ? patientId : Number(patientId);
      // Only set if not already set to avoid overwriting user selection
      const currentValue = getValues("patient_id");
      if (!currentValue) {
        setValue("patient_id", patientIdValue, { shouldDirty: false, shouldValidate: true });
      }
    }
  }, [patientId, setValue, getValues]);

  return <PaymentPackageForm />;
};

export const PaymentPackageCreate = () => {
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patient_id");
  const redirect = useRedirect();
  const refresh = useRefresh();
  const notify = useNotify();

  // Prepare default values if patient_id is in URL
  const defaultValues = patientId 
    ? { patient_id: isNaN(Number(patientId)) ? patientId : Number(patientId) } 
    : {};

  const handleSuccess = (data: PaymentPackage) => {
    if (!data?.id) {
      console.error("PaymentPackageCreate: Missing package ID", data);
      notify("Package created but could not redirect", { type: "warning" });
      return;
    }
    
    // Force refresh to ensure the new package appears in lists
    refresh();
    
    // Small delay to ensure backend has processed
    setTimeout(() => {
      refresh();
      redirect("show", "payment_packages", data.id);
    }, 100);
  };

  return (
    <CreateBase 
      redirect={false}
      record={defaultValues}
      transform={(data) => {
        // Convert patient_id to number if it's a string
        // Form validation will ensure it's present
        const result = {
          ...data,
        };
        
        if (data.patient_id) {
          result.patient_id = typeof data.patient_id === 'string' ? Number(data.patient_id) : data.patient_id;
        }
        
        return result;
      }}
      mutationOptions={{
        onSuccess: (response) => {
          console.log("PaymentPackageCreate: Success response", response);
          // Handle both response.data (react-admin structure) and direct data
          const packageData = ((response as any)?.data ?? response) as PaymentPackage | undefined;
          console.log("PaymentPackageCreate: Extracted package data", packageData);
          if (!packageData || !packageData.id) {
            console.warn("PaymentPackageCreate: Invalid response structure", response);
            notify("Package created but could not redirect", { type: "warning" });
            // Still redirect to list if we can't get the ID
            setTimeout(() => {
              redirect("list", "payment_packages");
            }, 100);
            return;
          }
          handleSuccess(packageData);
        },
        onError: (error) => {
          console.error("PaymentPackageCreate: Error creating package", error);
          notify("Failed to create payment package", { type: "error" });
        },
      }}
    >
      <div className="max-w-4xl w-full mx-auto mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Create Payment Package</CardTitle>
          </CardHeader>
          <CardContent>
            <Form className="flex flex-col gap-4" defaultValues={defaultValues}>
              <PaymentPackageCreateForm />
              <FormToolbar />
            </Form>
          </CardContent>
        </Card>
      </div>
    </CreateBase>
  );
};

