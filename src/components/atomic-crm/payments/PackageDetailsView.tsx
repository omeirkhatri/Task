import { useGetList, WithRecord } from "ra-core";
import { ReferenceField } from "@/components/admin/reference-field";
import { DateField } from "@/components/admin/date-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import { ExternalLink } from "lucide-react";
import type { PaymentPackage, PaymentTransaction, Contact, Service } from "../types";
import { UsageTracker } from "./UsageTracker";

type PackageDetailsViewProps = {
  package: PaymentPackage;
  sessionsUsed?: number;
  hoursUsed?: number;
};

export const PackageDetailsView = ({ package: pkg, sessionsUsed = 0, hoursUsed = 0 }: PackageDetailsViewProps) => {
  // Fetch payment transactions for this package
  const { data: transactions, isLoading: transactionsLoading } = useGetList<PaymentTransaction>(
    "payment_transactions",
    {
      pagination: { page: 1, perPage: 100 },
      sort: { field: "date_paid", order: "DESC" },
      filter: { payment_package_id: pkg.id },
    },
    { enabled: !!pkg.id }
  );

  // Calculate total paid
  const totalPaid = transactions?.reduce((sum, t) => sum + t.amount_received, 0) || 0;
  const totalNetAmount = transactions?.reduce((sum, t) => sum + t.net_amount, 0) || 0;

  const statusColors = {
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    completed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    expired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };

  const packageTypeLabels = {
    "session-based": "Session-based",
    "time-based": "Time-based",
    "post-payment": "Post-payment",
  };

  return (
    <div className="space-y-6">
      {/* Package Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Package Details</CardTitle>
            <Badge className={statusColors[pkg.status] || statusColors.completed}>
              {pkg.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Patient</p>
              {pkg.patient_id ? (
                <ReferenceField source="patient_id" reference="clients" record={pkg} link="show">
                  <WithRecord
                    render={(contact: Contact) => (
                      <p className="font-medium">
                        {contact.first_name} {contact.last_name}
                      </p>
                    )}
                  />
                </ReferenceField>
              ) : (
                <p className="font-medium text-muted-foreground">No patient assigned</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Service</p>
              {pkg.service_id ? (
                <ReferenceField source="service_id" reference="services" record={pkg} link="show">
                  <WithRecord
                    render={(service: Service) => <p className="font-medium">{service.name}</p>}
                  />
                </ReferenceField>
              ) : (
                <p className="font-medium text-muted-foreground">No service assigned</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Package Type</p>
              <p className="font-medium">{packageTypeLabels[pkg.package_type]}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="font-medium">AED {pkg.total_amount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Start Date</p>
              <DateField source="start_date" record={pkg} />
            </div>
            {pkg.renewal_date && (
              <div>
                <p className="text-sm text-muted-foreground">Renewal Date</p>
                <DateField source="renewal_date" record={pkg} />
              </div>
            )}
            {pkg.end_date && (
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <DateField source="end_date" record={pkg} />
              </div>
            )}
          </div>
          {pkg.package_type === "session-based" && pkg.total_sessions && (
            <div>
              <p className="text-sm text-muted-foreground">Total Sessions</p>
              <p className="font-medium">{pkg.total_sessions} sessions</p>
            </div>
          )}
          {pkg.package_type === "time-based" && (
            <div className="grid grid-cols-3 gap-4">
              {pkg.duration_days && (
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{pkg.duration_days} days</p>
                </div>
              )}
              {pkg.hours_per_day && (
                <div>
                  <p className="text-sm text-muted-foreground">Hours Per Day</p>
                  <p className="font-medium">{pkg.hours_per_day} hours</p>
                </div>
              )}
              {pkg.total_hours && (
                <div>
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                  <p className="font-medium">{pkg.total_hours.toFixed(1)} hours</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Tracker */}
      <UsageTracker package={pkg} sessionsUsed={sessionsUsed} hoursUsed={hoursUsed} />

      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-lg font-semibold">AED {totalPaid.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net Amount</p>
              <p className="text-lg font-semibold">AED {totalNetAmount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-lg font-semibold">
                AED {(pkg.total_amount - totalPaid).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Payment Transactions</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link to={`/payment_packages/${pkg.id}/show`}>
                View All <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <p className="text-sm text-muted-foreground">Loading transactions...</p>
          ) : !transactions || transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">AED {transaction.amount_received.toLocaleString()}</p>
                      <Badge variant="outline">{transaction.payment_method}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <DateField source="date_paid" record={transaction} />
                      {transaction.invoice_number && (
                        <span>Invoice: {transaction.invoice_number}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Net: AED {transaction.net_amount.toLocaleString()}</p>
                    {transaction.bank_charge > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Fee: AED {transaction.bank_charge.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {transactions.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  +{transactions.length - 5} more transactions
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

