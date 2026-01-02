import { CreateBase, Form } from "ra-core";
import { useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormToolbar } from "@/components/admin/simple-form";
import { PaymentTransactionForm } from "./PaymentTransactionForm";

export const PaymentTransactionCreate = () => {
  // Get package ID from query parameters (e.g., /payment_transactions/create?package_id=123)
  const [searchParams] = useSearchParams();
  const packageId = searchParams.get("package_id");

  return (
    <CreateBase redirect="list">
      <div className="max-w-4xl w-full mx-auto mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Record Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <Form className="flex flex-col gap-4">
              <PaymentTransactionForm defaultPackageId={packageId} />
              <FormToolbar />
            </Form>
          </CardContent>
        </Card>
      </div>
    </CreateBase>
  );
};

