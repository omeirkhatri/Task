import { CreateBase, Form, useNotify, useRefresh } from "ra-core";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SaveButton } from "@/components/admin/form";
import { PaymentTransactionForm } from "./PaymentTransactionForm";
import type { PaymentTransaction } from "./types";

type PaymentCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPackageId?: string | number;
  defaultAppointmentId?: string | number;
};

export const PaymentCreateDialog = ({
  open,
  onOpenChange,
  defaultPackageId,
  defaultAppointmentId,
}: PaymentCreateDialogProps) => {
  const notify = useNotify();
  const refresh = useRefresh();

  const handleSuccess = (response: any) => {
    // Handle both response.data (react-admin structure) and direct data
    const transactionData = ((response as any)?.data ?? response) as PaymentTransaction | undefined;
    
    if (!transactionData) {
      console.warn("PaymentCreateDialog: Invalid response structure", response);
      notify("Payment created but response was invalid", { type: "warning" });
      refresh();
      onOpenChange(false);
      return;
    }

    notify("Payment recorded successfully", { type: "success" });
    refresh();
    onOpenChange(false);
  };

  const handleError = (error: any) => {
    console.error("PaymentCreateDialog: Error creating payment", error);
    notify("Failed to record payment", { type: "error" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Create a payment transaction. Select a package or leave empty for a standalone payment.
          </DialogDescription>
        </DialogHeader>
        <CreateBase
          resource="payment_transactions"
          redirect={false}
          transform={(data: any) => {
            // Transform data before submission
            const result: any = {
              amount_received: data.amount_received,
              bank_charge: data.bank_charge,
              net_amount: data.net_amount,
              payment_method: data.payment_method,
              date_paid: data.date_paid,
              date_received: data.date_received,
              invoice_number: data.invoice_number || null,
              installment_number: data.installment_number || null,
            };

            // Only include payment_package_id if it has a value
            if (data.payment_package_id) {
              result.payment_package_id = typeof data.payment_package_id === 'string' 
                ? Number(data.payment_package_id) 
                : data.payment_package_id;
            }

            // Include appointment_id if provided (for standalone payments)
            if (data.appointment_id || defaultAppointmentId) {
              result.appointment_id = data.appointment_id || defaultAppointmentId;
              result.appointment_id = typeof result.appointment_id === 'string' 
                ? Number(result.appointment_id) 
                : result.appointment_id;
            }

            return result;
          }}
          mutationOptions={{
            onSuccess: handleSuccess,
            onError: handleError,
          }}
        >
          <Form className="flex flex-col gap-4">
            <div className="overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
              <PaymentTransactionForm 
                defaultPackageId={defaultPackageId} 
                defaultAppointmentId={defaultAppointmentId}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <SaveButton 
                label="Record Payment"
                className="bg-blue-600 text-white hover:bg-blue-700"
              />
            </DialogFooter>
          </Form>
        </CreateBase>
      </DialogContent>
    </Dialog>
  );
};

