import { useGetList } from "ra-core";
import type { Identifier } from "ra-core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateField } from "@/components/admin/date-field";
import { Clock, Calendar, DollarSign } from "lucide-react";
import type { PaymentPackage, PaymentTransaction } from "./types";

type InstallmentScheduleProps = {
  packageId: Identifier;
  packageData?: PaymentPackage;
};

export const InstallmentSchedule = ({ packageId, packageData }: InstallmentScheduleProps) => {
  // Fetch payment transactions for this package
  const { data: transactions, isLoading: transactionsLoading } = useGetList<PaymentTransaction>(
    "payment_transactions",
    {
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "date_paid", order: "DESC" },
      filter: { payment_package_id: packageId },
    },
    { enabled: !!packageId }
  );

  if (transactionsLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Loading payment information...</p>
        </CardContent>
      </Card>
    );
  }

  if (!packageData) {
    return null;
  }

  const totalAmount = packageData.total_amount || 0;
  const paidAmount = transactions?.reduce((sum, t) => sum + (t.amount_received || 0), 0) || 0;
  const remainingAmount = totalAmount - paidAmount;
  const progressPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  // Find last payment date
  const lastPayment = transactions && transactions.length > 0 ? transactions[0] : null;
  const lastPaymentDate = lastPayment?.date_paid;

  // Get next payment date from package
  const nextPaymentDate = packageData.next_payment_date;

  // Check if next payment is overdue
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = nextPaymentDate ? new Date(nextPaymentDate) < today : false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Tracking</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Summary */}
        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
            <div>
              <p className="text-muted-foreground">Total Amount</p>
              <p className="text-lg font-semibold">AED {totalAmount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Paid Amount</p>
              <p className="text-lg font-semibold">AED {paidAmount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Remaining</p>
              <p className={`text-lg font-semibold ${remainingAmount > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}`}>
                AED {remainingAmount.toLocaleString()}
              </p>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Payment Progress</span>
              <span className="text-sm text-muted-foreground">{progressPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Payment Information Cards */}
        <div className="space-y-3">
          {/* Last Payment */}
          {lastPaymentDate ? (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                <p className="font-medium text-sm">Last Payment</p>
              </div>
              <div className="text-sm text-muted-foreground">
                <DateField source="date_paid" record={lastPayment} />
                {lastPayment && (
                  <span className="ml-2">
                    - AED {lastPayment.amount_received.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium text-sm text-muted-foreground">Last Payment</p>
              </div>
              <p className="text-sm text-muted-foreground">No payments recorded yet</p>
            </div>
          )}

          {/* Next Payment Due */}
          {nextPaymentDate ? (
            <div className={`p-4 rounded-lg border ${
              isOverdue
                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className={`h-4 w-4 ${isOverdue ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`} />
                <p className="font-medium text-sm">Next Payment Scheduled</p>
                {isOverdue && (
                  <Badge variant="destructive" className="ml-2">
                    Overdue
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                <DateField source="next_payment_date" record={packageData} />
                {remainingAmount > 0 && (
                  <span className="ml-2">
                    - AED {remainingAmount.toLocaleString()} remaining
                  </span>
                )}
              </p>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium text-sm text-muted-foreground">Next Payment Scheduled</p>
              </div>
              <p className="text-sm text-muted-foreground">No next payment date set</p>
            </div>
          )}

          {/* Remaining Amount */}
          {remainingAmount > 0 && (
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <p className="font-medium text-sm">Remaining Balance</p>
              </div>
              <p className="text-lg font-semibold text-orange-700 dark:text-orange-400">
                AED {remainingAmount.toLocaleString()}
              </p>
            </div>
          )}

          {remainingAmount <= 0 && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                <p className="font-medium text-sm text-green-700 dark:text-green-400">
                  Package fully paid
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

