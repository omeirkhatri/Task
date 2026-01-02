import { useState } from "react";
import { ShowBase, useShowContext, useGetList, useCreatePath, useCreate, useUpdate, useDelete, useNotify, Form, useRedirect, useRefresh } from "ra-core";
import { useQueryClient } from "@tanstack/react-query";
import { Show } from "@/components/admin/show";
import { TopToolbar } from "../layout/TopToolbar";
import { EditButton } from "@/components/admin/edit-button";
import { PaymentPackageDeleteButton } from "./PaymentPackageDeleteButton";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateField } from "@/components/admin/date-field";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, RefreshCw, Edit, ExternalLink, ArrowLeft, Trash2 } from "lucide-react";
import { Link } from "react-router";
import type { PaymentPackage, PaymentTransaction, PackageUsage } from "../types";
import { PackageDetailsView } from "./PackageDetailsView";
import { UsageTracker } from "./UsageTracker";
import { UsageAdjustmentForm } from "./UsageAdjustmentForm";
import { RenewalForm } from "./RenewalForm";
import { InstallmentSchedule as InstallmentScheduleComponent } from "./InstallmentSchedule";
import { usePackageUsage } from "@/hooks/usePackageUsage";

export const PaymentPackageShow = () => (
  <ShowBase>
    <PaymentPackageShowContent />
  </ShowBase>
);

const PaymentPackageShowContent = () => {
  const { record, isPending } = useShowContext<PaymentPackage>();
  const createPath = useCreatePath();
  const createPaymentPath = createPath({ resource: "payment_transactions", type: "create" });
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [isRenewalDialogOpen, setIsRenewalDialogOpen] = useState(false);
  const [isRenewalConfirmOpen, setIsRenewalConfirmOpen] = useState(false);
  const [renewalData, setRenewalData] = useState<any>(null);
  const [isRenewalSubmitting, setIsRenewalSubmitting] = useState(false);
  const [newPackageId, setNewPackageId] = useState<number | null>(null);
  const [usageToDelete, setUsageToDelete] = useState<PackageUsage | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [create] = useCreate();
  const [update] = useUpdate();
  const [deleteOne] = useDelete();
  const notify = useNotify();
  const redirect = useRedirect();
  const refresh = useRefresh();
  const queryClient = useQueryClient();

  // Use the usePackageUsage hook to get usage data
  const { sessionsUsed, hoursUsed, refetch: refetchUsage } = usePackageUsage(record?.id);

  // Fetch payment transactions
  const { data: transactions, isLoading: transactionsLoading } = useGetList<PaymentTransaction>(
    "payment_transactions",
    {
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "date_paid", order: "DESC" },
      filter: record?.id ? { payment_package_id: record.id } : {},
    },
    { enabled: !!record?.id }
  );

  // Fetch package usage records
  const { data: usageRecords, isLoading: usageLoading, refetch: refetchUsageRecords } = useGetList<PackageUsage>(
    "package_usage",
    {
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "usage_date", order: "DESC" },
      filter: record?.id ? { payment_package_id: record.id } : {},
    },
    { enabled: !!record?.id }
  );


  const handleAdjustUsage = async (data: {
    usage_type: "session" | "hours";
    quantity_used: number;
    usage_date: string;
    notes?: string;
  }) => {
    if (!record?.id) {
      notify("Package not found", { type: "error" });
      return;
    }
    try {
      await create("package_usage", {
        data: {
          payment_package_id: record.id,
          usage_type: data.usage_type,
          quantity_used: data.quantity_used,
          usage_date: data.usage_date,
          notes: data.notes || null,
          is_manual_adjustment: true,
        },
      });
      notify("Usage adjustment recorded successfully", { type: "success" });
      setIsAdjustmentDialogOpen(false);
      // Invalidate and refetch usage data
      queryClient.invalidateQueries({ queryKey: ["packageUsage", record.id] });
      await refetchUsage();
      await refetchUsageRecords();
    } catch (error: any) {
      notify(`Failed to record usage adjustment: ${error.message}`, { type: "error" });
    }
  };

  const handleDeleteUsage = async () => {
    if (!usageToDelete?.id) {
      return;
    }
    try {
      await deleteOne("package_usage", { id: usageToDelete.id });
      notify("Usage record deleted successfully", { type: "success" });
      setIsDeleteDialogOpen(false);
      setUsageToDelete(null);
      // Invalidate and refetch usage data
      queryClient.invalidateQueries({ queryKey: ["packageUsage", record?.id] });
      await refetchUsage();
      await refetchUsageRecords();
    } catch (error: any) {
      notify(`Failed to delete usage record: ${error.message}`, { type: "error" });
    }
  };

  // Fetch renewed from package (parent package)
  const { data: renewedFromPackage } = useGetList<PaymentPackage>(
    "payment_packages",
    {
      pagination: { page: 1, perPage: 1 },
      filter: record?.renewed_from_package_id ? { id: record.renewed_from_package_id } : {},
    },
    { enabled: !!record?.renewed_from_package_id }
  );

  // Fetch renewed to package (child package)
  const { data: renewedToPackages } = useGetList<PaymentPackage>(
    "payment_packages",
    {
      pagination: { page: 1, perPage: 10 },
      filter: record?.id ? { renewed_from_package_id: record.id } : {},
    },
    { enabled: !!record?.id }
  );

  const handleRenewalSubmit = async (data: any) => {
    setRenewalData(data);
    setIsRenewalConfirmOpen(true);
  };

  const handleRenewalConfirm = async () => {
    if (!renewalData || !record) return;

    setIsRenewalSubmitting(true);
    try {
      // Calculate end_date and renewal_date for time-based packages
      let endDate = renewalData.end_date;
      let renewalDate = renewalData.renewal_date;

      if (renewalData.package_type === "time-based" && renewalData.start_date && renewalData.duration_days) {
        const start = new Date(renewalData.start_date);
        const end = new Date(start);
        end.setDate(end.getDate() + renewalData.duration_days);
        endDate = end.toISOString().split("T")[0];
        renewalDate = endDate;
      }

      // Create new package with renewal data
      const newPackageData = {
        ...renewalData,
        end_date: endDate || null,
        renewal_date: renewalDate || null,
        renewed_from_package_id: record.id,
        status: "active" as const,
      };

      const { data: newPackage } = await create("payment_packages", {
        data: newPackageData,
      });

      // Mark old package as completed
      await update("payment_packages", {
        id: record.id,
        data: { status: "completed" },
        previousData: record,
      });

      setNewPackageId(newPackage.id);
      setIsRenewalConfirmOpen(false);
      setIsRenewalDialogOpen(false);
      setIsRenewalSubmitting(false);
      refresh();
      notify("Package renewed successfully", { type: "success" });
    } catch (error: any) {
      notify(`Failed to renew package: ${error.message}`, { type: "error" });
      setIsRenewalSubmitting(false);
    }
  };

  const handleRecordPaymentAfterRenewal = () => {
    if (newPackageId) {
      redirect("create", "payment_transactions", undefined, { package_id: newPackageId });
      setNewPackageId(null);
    }
  };

  if (isPending || !record) return null;

  const totalPaid = transactions?.reduce((sum, t) => sum + t.amount_received, 0) || 0;
  const totalNetAmount = transactions?.reduce((sum, t) => sum + t.net_amount, 0) || 0;

  return (
    <Show
      title={`Payment Package #${record.id}`}
      actions={
        <TopToolbar>
          <EditButton />
          <Button variant="outline" size="sm" asChild>
            <Link to={`${createPaymentPath}?package_id=${record.id}`}>
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Link>
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsRenewalDialogOpen(true)}
            disabled={record.status === "completed" || record.status === "expired"}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Renew Package
          </Button>
          <PaymentPackageDeleteButton redirect="list" />
        </TopToolbar>
      }
    >
      <div className="mt-4">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            <TabsTrigger value="payments" className="flex-1">Payments</TabsTrigger>
            <TabsTrigger value="usage" className="flex-1">Usage</TabsTrigger>
            <TabsTrigger value="installments" className="flex-1">Payment Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="pt-4">
            {/* Package History */}
            {(renewedFromPackage && renewedFromPackage.length > 0) || (renewedToPackages && renewedToPackages.length > 0) ? (
              <Card className="mb-4">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">Package History</h3>
                  <div className="space-y-3">
                    {renewedFromPackage && renewedFromPackage.length > 0 && (
                      <div className="flex items-center gap-2 p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <ArrowLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Renewed from</p>
                          <Link
                            to={`/payment_packages/${renewedFromPackage[0].id}/show`}
                            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Package #{renewedFromPackage[0].id}
                          </Link>
                        </div>
                      </div>
                    )}
                    {renewedToPackages && renewedToPackages.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Renewed to:</p>
                        {renewedToPackages.map((pkg) => (
                          <div key={pkg.id} className="flex items-center gap-2 p-3 border rounded-lg bg-green-50 dark:bg-green-900/20">
                            <RefreshCw className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <div className="flex-1">
                              <Link
                                to={`/payment_packages/${pkg.id}/show`}
                                className="font-medium text-green-600 dark:text-green-400 hover:underline"
                              >
                                Package #{pkg.id}
                              </Link>
                              <p className="text-xs text-muted-foreground mt-1">
                                Status: {pkg.status} | Started: {new Date(pkg.start_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : null}
            <PackageDetailsView package={record} sessionsUsed={sessionsUsed} hoursUsed={hoursUsed} />
          </TabsContent>

          <TabsContent value="payments" className="pt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Payment History</h3>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`${createPaymentPath}?package_id=${record.id}`}>
                      <Plus className="mr-2 h-4 w-4" />
                      Record Payment
                    </Link>
                  </Button>
                </div>
                {transactionsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading transactions...</p>
                ) : !transactions || transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">No payments recorded yet</p>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`${createPaymentPath}?package_id=${record.id}`}>
                        <Plus className="mr-2 h-4 w-4" />
                        Record First Payment
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-lg font-semibold">AED {transaction.amount_received.toLocaleString()}</p>
                            <Badge variant="outline">{transaction.payment_method}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Paid:</span> <DateField source="date_paid" record={transaction} />
                            </div>
                            <div>
                              <span className="font-medium">Received:</span> <DateField source="date_received" record={transaction} />
                            </div>
                            {transaction.invoice_number && (
                              <div>
                                <span className="font-medium">Invoice:</span> {transaction.invoice_number}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">Net: AED {transaction.net_amount.toLocaleString()}</p>
                          {transaction.bank_charge > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Fee: AED {transaction.bank_charge.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total Paid</p>
                          <p className="text-lg font-semibold">AED {totalPaid.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Net Amount</p>
                          <p className="text-lg font-semibold">AED {totalNetAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Remaining</p>
                          <p className="text-lg font-semibold">
                            AED {(record.total_amount - totalPaid).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="pt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4">
                  <UsageTracker package={record} sessionsUsed={sessionsUsed} hoursUsed={hoursUsed} />
                </div>
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Usage Timeline</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAdjustmentDialogOpen(true)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Adjust Usage
                    </Button>
                  </div>
                  {usageLoading ? (
                    <p className="text-sm text-muted-foreground">Loading usage records...</p>
                  ) : !usageRecords || usageRecords.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground mb-4">No usage recorded yet</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAdjustmentDialogOpen(true)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Add Manual Adjustment
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {usageRecords.map((usage) => (
                        <div
                          key={usage.id}
                          className={`flex items-center justify-between p-3 border rounded-lg ${
                            usage.appointment_id
                              ? "hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                              : ""
                          }`}
                          onClick={() => {
                            if (usage.appointment_id) {
                              window.open(`/appointments/${usage.appointment_id}/show`, "_blank");
                            }
                          }}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {usage.quantity_used.toFixed(usage.usage_type === "hours" ? 1 : 0)}{" "}
                                {usage.usage_type === "hours" ? "hours" : "sessions"}
                              </p>
                              {usage.is_manual_adjustment && (
                                <Badge variant="outline" className="text-xs">Manual</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <DateField source="usage_date" record={usage} />
                              {usage.appointment_id ? (
                                <Link
                                  to={`/appointments/${usage.appointment_id}/show`}
                                  className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Appointment #{usage.appointment_id}
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              ) : null}
                              {usage.notes && <span>{usage.notes}</span>}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUsageToDelete(usage);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="installments" className="pt-4">
            <InstallmentScheduleComponent packageId={record.id} packageData={record} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Usage Adjustment Dialog */}
      <Dialog open={isAdjustmentDialogOpen} onOpenChange={setIsAdjustmentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adjust Package Usage</DialogTitle>
            <DialogDescription>
              Manually add or adjust usage for this package. This will create a manual adjustment record.
            </DialogDescription>
          </DialogHeader>
          <Form
            onSubmit={async (data: any) => {
              await handleAdjustUsage({
                usage_type: data.usage_type,
                quantity_used: data.quantity_used,
                usage_date: data.usage_date,
                notes: data.notes,
              });
            }}
            defaultValues={{
              usage_type: record.package_type === "session-based" ? "session" : "hours",
              usage_date: new Date().toISOString().split("T")[0],
            }}
          >
            <UsageAdjustmentForm package={record} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAdjustmentDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Save Adjustment
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Renewal Dialog */}
      <Dialog open={isRenewalDialogOpen} onOpenChange={setIsRenewalDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Renew Package</DialogTitle>
            <DialogDescription>
              Create a new package based on the current one. All fields are editable. The current package will be marked as completed.
            </DialogDescription>
          </DialogHeader>
          <Form onSubmit={handleRenewalSubmit}>
            <RenewalForm currentPackage={record} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsRenewalDialogOpen(false);
                  setRenewalData(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                Continue to Confirm
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Renewal Confirmation Dialog */}
      <Dialog open={isRenewalConfirmOpen} onOpenChange={setIsRenewalConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Package Renewal</DialogTitle>
            <DialogDescription>
              Are you sure you want to create a new package with these parameters? The current package (Package #{record.id}) will be marked as completed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRenewalConfirmOpen(false);
                setRenewalData(null);
              }}
              disabled={isRenewalSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenewalConfirm}
              disabled={isRenewalSubmitting}
            >
              {isRenewalSubmitting ? "Creating..." : "Confirm Renewal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prompt to Record Payment After Renewal */}
      <Dialog open={!!newPackageId} onOpenChange={(open) => !open && setNewPackageId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Package Renewed Successfully</DialogTitle>
            <DialogDescription>
              A new package has been created. Would you like to record a payment for the new package?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewPackageId(null)}
            >
              Later
            </Button>
            <Button onClick={handleRecordPaymentAfterRenewal}>
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Usage Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Usage Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this usage record?
              {usageToDelete && (
                <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded text-sm">
                  <p className="font-medium">
                    {usageToDelete.quantity_used.toFixed(usageToDelete.usage_type === "hours" ? 1 : 0)}{" "}
                    {usageToDelete.usage_type === "hours" ? "hours" : "sessions"}
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Date: {new Date(usageToDelete.usage_date).toLocaleDateString()}
                    {usageToDelete.appointment_id && ` • From Appointment #${usageToDelete.appointment_id}`}
                  </p>
                </div>
              )}
              {usageToDelete && !usageToDelete.is_manual_adjustment && (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  Warning: This usage record was automatically created from an appointment. Deleting it may cause inconsistencies.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setUsageToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUsage}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Show>
  );
};

