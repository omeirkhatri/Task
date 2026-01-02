import React, { useState, useMemo, useCallback } from "react";
import { useGetList, useNotify, useDataProvider } from "ra-core";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar, CheckCircle2, XCircle, Clock, User, Package } from "lucide-react";
import type { Appointment } from "../types";
import { format } from "date-fns";
import { crmToday, crmStartOfDay, crmAddDays, crmDateYmdInputString } from "../misc/timezone";
import { supabase } from "../providers/supabase/supabase";

type DateFilter = "today" | "yesterday" | "before";

interface CancelledDialogState {
  open: boolean;
  appointmentIds: (string | number)[];
  countAsUsage: boolean | null;
}

export const BulkStatusChange = () => {
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [selectedAppointments, setSelectedAppointments] = useState<Set<string | number>>(new Set());
  const [cancelledDialog, setCancelledDialog] = useState<CancelledDialogState>({
    open: false,
    appointmentIds: [],
    countAsUsage: null,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const dataProvider = useDataProvider();
  const notify = useNotify();

  // Calculate date range based on filter
  const dateRange = useMemo(() => {
    const today = crmToday();
    const todayStart = crmStartOfDay(today);
    
    switch (dateFilter) {
      case "today":
        // Today: from today to today (inclusive)
        return {
          from: todayStart,
          to: todayStart, // Same date for inclusive range
        };
      case "yesterday":
        // Yesterday: from yesterday to yesterday (inclusive)
        const yesterdayDate = crmAddDays(today, -1);
        const yesterdayStart = crmStartOfDay(yesterdayDate);
        return {
          from: yesterdayStart,
          to: yesterdayStart, // Same date for inclusive range
        };
      case "before":
        // Before: appointments strictly before yesterday (not including yesterday)
        // If yesterday is Jan 1, this shows Dec 31 and earlier
        const beforeYesterday = crmAddDays(today, -1);
        const beforeYesterdayStart = crmStartOfDay(beforeYesterday);
        return {
          from: null,
          to: beforeYesterdayStart, // Will use @lt to exclude yesterday itself
        };
      default:
        return { from: todayStart, to: todayStart };
    }
  }, [dateFilter]);

  // Fetch appointments - include both scheduled and completed
  const now = new Date();
  
  // Build filter similar to AppointmentsPage
  const apiFilter = useMemo(() => {
    const filter: Record<string, unknown> = {};
    
    let dateFrom: string | undefined;
    let dateTo: string | undefined;
    
    // Use CRM timezone-aware date formatting
    if (dateRange.from) {
      dateFrom = crmDateYmdInputString(dateRange.from) || undefined;
    }
    
    if (dateRange.to) {
      // For the end date, we want to include the full day, so use the date as-is
      // The @lte filter will include appointments up to and including this date
      dateTo = crmDateYmdInputString(dateRange.to) || undefined;
    }
    
    if (dateFrom && dateTo) {
      // If from and to are the same, use equality check for better performance
      if (dateFrom === dateTo) {
        filter["appointment_date"] = dateFrom;
      } else {
        filter["appointment_date@gte"] = dateFrom;
        filter["appointment_date@lte"] = dateTo;
      }
    } else {
      if (dateFrom) {
        filter["appointment_date@gte"] = dateFrom;
      }
      if (dateTo) {
        // For "before" filter, use @lt to exclude the date
        if (dateFilter === "before") {
          filter["appointment_date@lt"] = dateTo;
        } else {
          filter["appointment_date@lte"] = dateTo;
        }
      }
    }
    
    // For "before" filter, only show scheduled appointments (not completed)
    // For "today" and "yesterday", show both scheduled and completed
    if (dateFilter === "before") {
      filter["status"] = "scheduled";
    } else {
      filter["status@in"] = "(scheduled,completed)";
    }
    
    return filter;
  }, [dateRange, dateFilter]);

  const { data: appointments, isLoading, error } = useGetList<Appointment>("appointments", {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: "end_time", order: "DESC" },
    filter: apiFilter,
  }, {
    retry: false,
    onError: (err) => {
      console.warn("Error fetching appointments for bulk status:", err);
    },
  });

  // Debug logging
  React.useEffect(() => {
    if (appointments !== undefined) {
      const today = crmToday();
      const yesterday = crmAddDays(today, -1);
      console.log("BulkStatusChange Debug:", {
        dateFilter,
        today: crmDateYmdInputString(today),
        yesterday: crmDateYmdInputString(yesterday),
        dateRange: {
          from: dateRange.from ? crmDateYmdInputString(dateRange.from) : null,
          to: dateRange.to ? crmDateYmdInputString(dateRange.to) : null,
        },
        apiFilter,
        totalAppointments: appointments?.length || 0,
        appointments: appointments?.slice(0, 5).map(a => ({
          id: a.id,
          date: a.appointment_date,
          status: a.status,
          end_time: a.end_time,
        })),
        error: error?.message,
      });
    }
  }, [appointments, error, dateFilter, apiFilter, dateRange]);

  // Filter appointments - "finished" means the appointment's end_time has passed
  // For "before": show all scheduled appointments (they're old and should be updated)
  // For "today" and "yesterday": only show appointments that have finished (end_time < now)
  const finishedAppointments = useMemo(() => {
    if (!appointments) return [];
    
    if (dateFilter === "before") {
      // For "before" filter, show all scheduled appointments regardless of end_time
      // These are old appointments that still need status updates
      return appointments.filter((apt) => apt.status === "scheduled");
    } else {
      // For "today" and "yesterday", only show appointments that have finished
      // "Finished" means the appointment's end_time has passed the current time
      return appointments.filter((apt) => {
        if (!apt.end_time) return false;
        const endTime = new Date(apt.end_time);
        return endTime < now;
      });
    }
  }, [appointments, now, dateFilter]);

  // Separate scheduled and completed appointments
  const scheduledAppointments = useMemo(() => {
    return finishedAppointments.filter((apt) => apt.status === "scheduled");
  }, [finishedAppointments]);

  const completedAppointments = useMemo(() => {
    return finishedAppointments.filter((apt) => apt.status === "completed");
  }, [finishedAppointments]);

  const handleSelectAll = useCallback(() => {
    // Only select scheduled appointments (completed ones can't be changed)
    if (selectedAppointments.size === scheduledAppointments.length) {
      setSelectedAppointments(new Set());
    } else {
      setSelectedAppointments(new Set(scheduledAppointments.map((apt) => apt.id)));
    }
  }, [selectedAppointments, scheduledAppointments]);

  const handleSelectAppointment = useCallback((id: string | number) => {
    // Only allow selecting scheduled appointments
    const appointment = finishedAppointments.find((apt) => apt.id === id);
    if (appointment && appointment.status !== "scheduled") {
      return; // Don't allow selecting completed appointments
    }

    setSelectedAppointments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, [finishedAppointments]);

  const handleMarkCompleted = useCallback(async () => {
    if (selectedAppointments.size === 0) {
      notify("Please select at least one appointment", { type: "warning" });
      return;
    }

    setIsUpdating(true);
    const errors: string[] = [];
    let successCount = 0;

    try {
      const updatePromises = Array.from(selectedAppointments).map(async (id) => {
        const appointment = finishedAppointments.find((apt) => apt.id === id);
        if (!appointment) {
          errors.push(`Appointment ${id} not found`);
          return;
        }

        try {
          await dataProvider.update("appointments", {
            id,
            data: { status: "completed" },
            previousData: appointment,
          });
          successCount++;
        } catch (error: any) {
          const errorMsg = error?.message || error?.body?.message || String(error);
          errors.push(`Appointment ${id}: ${errorMsg}`);
          console.error(`Error updating appointment ${id}:`, error);
        }
      });

      await Promise.allSettled(updatePromises);

      if (errors.length > 0) {
        notify(
          `Updated ${successCount} appointment(s). ${errors.length} error(s): ${errors.slice(0, 2).join(", ")}${errors.length > 2 ? "..." : ""}`,
          { type: "warning" }
        );
      } else {
        notify(`Marked ${successCount} appointment(s) as completed`, { type: "success" });
      }
      
      setSelectedAppointments(new Set());
    } catch (error: any) {
      console.error("Error marking appointments as completed:", error);
      const errorMsg = error?.message || error?.body?.message || String(error);
      notify(`Failed to update appointments: ${errorMsg}`, { type: "error" });
    } finally {
      setIsUpdating(false);
    }
  }, [selectedAppointments, dataProvider, notify, finishedAppointments]);

  const handleMarkCancelled = useCallback(() => {
    if (selectedAppointments.size === 0) {
      notify("Please select at least one appointment", { type: "warning" });
      return;
    }

    // Open dialog to ask about usage
    setCancelledDialog({
      open: true,
      appointmentIds: Array.from(selectedAppointments),
      countAsUsage: null,
    });
  }, [selectedAppointments, notify]);

  const handleConfirmCancelled = useCallback(async () => {
    if (cancelledDialog.countAsUsage === null) {
      notify("Please select whether to count as usage", { type: "warning" });
      return;
    }

    setIsUpdating(true);
    const errors: string[] = [];
    let successCount = 0;

    try {
      const updatePromises = cancelledDialog.appointmentIds.map(async (id) => {
        const appointment = finishedAppointments.find((apt) => apt.id === id);
        if (!appointment) {
          errors.push(`Appointment ${id} not found`);
          return;
        }

        try {
          await dataProvider.update("appointments", {
            id,
            data: { status: "cancelled" },
            previousData: appointment,
          });
          successCount++;
        } catch (error: any) {
          const errorMsg = error?.message || error?.body?.message || String(error);
          errors.push(`Appointment ${id}: ${errorMsg}`);
          console.error(`Error updating appointment ${id}:`, error);
        }
      });

      await Promise.allSettled(updatePromises);

      if (errors.length > 0) {
        notify(
          `Updated ${successCount} appointment(s). ${errors.length} error(s): ${errors.slice(0, 2).join(", ")}${errors.length > 2 ? "..." : ""}`,
          { type: "warning" }
        );
      }

      // If countAsUsage is true, manually create usage records
      if (cancelledDialog.countAsUsage) {
        const appointmentsToProcess = finishedAppointments.filter((apt) =>
          cancelledDialog.appointmentIds.includes(apt.id)
        );

        for (const apt of appointmentsToProcess) {
          if (apt.payment_package_id) {
            try {
              // Get package details
              const { data: packageData } = await supabase
                .from("payment_packages")
                .select("*")
                .eq("id", apt.payment_package_id)
                .eq("status", "active")
                .single();

              if (packageData) {
                if (packageData.package_type === "session-based") {
                  // Create usage record for session-based
                  await supabase.from("package_usage").insert({
                    payment_package_id: apt.payment_package_id,
                    appointment_id: apt.id,
                    usage_type: "session",
                    quantity_used: 1,
                    usage_date: apt.appointment_date,
                    is_manual_adjustment: true,
                    notes: "Usage counted for cancelled appointment",
                  });
                } else if (packageData.package_type === "time-based") {
                  // Calculate hours for time-based
                  const startTime = new Date(apt.start_time);
                  const endTime = new Date(apt.end_time);
                  const hoursUsed = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

                  if (hoursUsed > 0) {
                    await supabase.from("package_usage").insert({
                      payment_package_id: apt.payment_package_id,
                      appointment_id: apt.id,
                      usage_type: "hours",
                      quantity_used: hoursUsed,
                      usage_date: apt.appointment_date,
                      is_manual_adjustment: true,
                      notes: "Usage counted for cancelled appointment",
                    });
                  }
                }
              }
            } catch (error) {
              console.error(`Error creating usage for appointment ${apt.id}:`, error);
            }
          }
        }
      }

      if (errors.length === 0) {
        notify(
          `Marked ${successCount} appointment(s) as cancelled${cancelledDialog.countAsUsage ? " (usage counted)" : ""}`,
          { type: "success" }
        );
      }
      
      setSelectedAppointments(new Set());
      setCancelledDialog({ open: false, appointmentIds: [], countAsUsage: null });
    } catch (error: any) {
      console.error("Error marking appointments as cancelled:", error);
      const errorMsg = error?.message || error?.body?.message || String(error);
      notify(`Failed to update appointments: ${errorMsg}`, { type: "error" });
    } finally {
      setIsUpdating(false);
    }
  }, [cancelledDialog, dataProvider, notify, finishedAppointments]);

  const getPatientName = (patientId: string | number, patients: any[]) => {
    const patient = patients?.find((p) => p.id === patientId);
    if (!patient) return "Unknown";
    return `${patient.first_name} ${patient.last_name}`.trim();
  };

  const { data: patients } = useGetList("clients", {
    pagination: { page: 1, perPage: 1000 },
  });

  return (
    <>
      <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Appointment Status</CardTitle>
                <CardDescription className="text-sm">
                  Update finished appointments in bulk
                </CardDescription>
              </div>
            </div>
            {finishedAppointments.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm font-medium">
                  {finishedAppointments.length} finished
                </Badge>
                {scheduledAppointments.length > 0 && (
                  <Badge variant="outline" className="text-sm font-medium">
                    {scheduledAppointments.length} scheduled
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Filter */}
          <div className="flex gap-2">
            <Button
              variant={dateFilter === "today" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setDateFilter("today");
                setSelectedAppointments(new Set());
              }}
              className="flex-1"
            >
              Today
            </Button>
            <Button
              variant={dateFilter === "yesterday" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setDateFilter("yesterday");
                setSelectedAppointments(new Set());
              }}
              className="flex-1"
            >
              Yesterday
            </Button>
            <Button
              variant={dateFilter === "before" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setDateFilter("before");
                setSelectedAppointments(new Set());
              }}
              className="flex-1"
            >
              Before
            </Button>
          </div>

          {/* Select All */}
          {finishedAppointments.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedAppointments.size === scheduledAppointments.length && scheduledAppointments.length > 0}
                  onCheckedChange={handleSelectAll}
                  className="h-4 w-4"
                  disabled={scheduledAppointments.length === 0}
                />
                <Label className="text-sm font-medium cursor-pointer">
                  Select All ({scheduledAppointments.length} scheduled, {completedAppointments.length} completed)
                </Label>
              </div>
              <Badge variant="outline" className="font-medium">
                {selectedAppointments.size} selected
              </Badge>
            </div>
          )}

          {/* Appointments List */}
          <div className="space-y-2 max-h-[350px] overflow-y-auto">
            {isLoading ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Loading appointments...
              </div>
            ) : finishedAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  No finished appointments
                </p>
                <p className="text-xs text-muted-foreground">
                  Appointments that have passed their end time will appear here
                </p>
              </div>
            ) : (
              <>
                {/* Scheduled Appointments */}
                {scheduledAppointments.map((apt) => {
                  const endTime = apt.end_time ? new Date(apt.end_time) : null;
                  const startTime = apt.start_time ? new Date(apt.start_time) : null;
                  const isSelected = selectedAppointments.has(apt.id);
                  const hasPackage = !!apt.payment_package_id;

                  return (
                    <div
                      key={apt.id}
                      className={`group flex items-start gap-3 p-3 rounded-lg border transition-all ${
                        isSelected 
                          ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 shadow-sm" 
                          : "bg-card hover:bg-muted/50 border-border"
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleSelectAppointment(apt.id)}
                        className="mt-1 h-4 w-4"
                      />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm font-semibold truncate">
                                {getPatientName(apt.patient_id, patients || [])}
                              </span>
                              {hasPackage && (
                                <Package className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {startTime && endTime 
                                  ? `${format(startTime, "HH:mm")} - ${format(endTime, "HH:mm")}`
                                  : "N/A"}
                              </span>
                              <span>•</span>
                              <span>{format(new Date(apt.appointment_date), "MMM d")}</span>
                              <span>•</span>
                              <span className="capitalize">{apt.appointment_type.replace(/_/g, " ")}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Completed Appointments */}
                {completedAppointments.map((apt) => {
                  const endTime = apt.end_time ? new Date(apt.end_time) : null;
                  const startTime = apt.start_time ? new Date(apt.start_time) : null;
                  const hasPackage = !!apt.payment_package_id;

                  return (
                    <div
                      key={apt.id}
                      className="group flex items-start gap-3 p-3 rounded-lg border bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-800/50 opacity-75"
                    >
                      <Checkbox
                        checked={false}
                        disabled={true}
                        className="mt-1 h-4 w-4"
                      />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm font-semibold truncate">
                                {getPatientName(apt.patient_id, patients || [])}
                              </span>
                              {hasPackage && (
                                <Package className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                              )}
                              <Badge variant="default" className="ml-2 bg-green-600 text-white text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Completed
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {startTime && endTime 
                                  ? `${format(startTime, "HH:mm")} - ${format(endTime, "HH:mm")}`
                                  : "N/A"}
                              </span>
                              <span>•</span>
                              <span>{format(new Date(apt.appointment_date), "MMM d")}</span>
                              <span>•</span>
                              <span className="capitalize">{apt.appointment_type.replace(/_/g, " ")}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Action Buttons */}
          {scheduledAppointments.length > 0 && (
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="default"
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleMarkCompleted}
                disabled={selectedAppointments.size === 0 || isUpdating}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete ({selectedAppointments.size})
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={handleMarkCancelled}
                disabled={selectedAppointments.size === 0 || isUpdating}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel ({selectedAppointments.size})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancelled Dialog */}
      <Dialog open={cancelledDialog.open} onOpenChange={(open) => {
        if (!open) {
          setCancelledDialog({ open: false, appointmentIds: [], countAsUsage: null });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Cancelled</DialogTitle>
            <DialogDescription>
              Do you want to count these {cancelledDialog.appointmentIds.length} cancelled appointment(s) as usage in their payment packages?
            </DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={cancelledDialog.countAsUsage === null ? "" : cancelledDialog.countAsUsage ? "yes" : "no"}
            onValueChange={(value) => {
              setCancelledDialog((prev) => ({
                ...prev,
                countAsUsage: value === "yes" ? true : value === "no" ? false : null,
              }));
            }}
            className="space-y-3 py-4"
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer">
              <RadioGroupItem value="yes" id="yes" />
              <Label htmlFor="yes" className="cursor-pointer flex-1">
                Yes, count as usage
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer">
              <RadioGroupItem value="no" id="no" />
              <Label htmlFor="no" className="cursor-pointer flex-1">
                No, don't count as usage
              </Label>
            </div>
          </RadioGroup>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelledDialog({ open: false, appointmentIds: [], countAsUsage: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmCancelled} disabled={cancelledDialog.countAsUsage === null || isUpdating}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
