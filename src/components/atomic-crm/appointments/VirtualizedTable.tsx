import React, { useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MoreHorizontal, Repeat } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import type { Appointment } from "../types";
import { APPOINTMENT_STATUSES } from "./types";
import { useGetList } from "ra-core";
import type { Contact, Staff } from "../types";
import { formatCrmDate } from "../misc/timezone";

type VirtualizedTableProps = {
  appointments: Appointment[];
  loading: boolean;
  onAppointmentClick: (appointment: Appointment) => void;
};

const ITEM_HEIGHT = 80;


export const VirtualizedTable: React.FC<VirtualizedTableProps> = ({
  appointments,
  loading,
  onAppointmentClick,
}) => {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const { data: patientsData } = useGetList<Contact>("clients", {
    pagination: { page: 1, perPage: 1000 },
  });
  const { data: staffData } = useGetList<Staff>("staff", {
    pagination: { page: 1, perPage: 1000 },
  });

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      // Parse dates - start_time is an ISO datetime string
      let dateA: Date;
      let dateB: Date;
      
      try {
        if (a.start_time) {
          dateA = new Date(a.start_time);
        } else if (a.appointment_date) {
          dateA = new Date(a.appointment_date + "T00:00:00");
        } else {
          dateA = new Date(0); // Fallback to epoch
        }
        
        if (b.start_time) {
          dateB = new Date(b.start_time);
        } else if (b.appointment_date) {
          dateB = new Date(b.appointment_date + "T00:00:00");
        } else {
          dateB = new Date(0); // Fallback to epoch
        }
        
        // Validate dates
        if (isNaN(dateA.getTime())) dateA = new Date(0);
        if (isNaN(dateB.getTime())) dateB = new Date(0);
        
        return dateA.getTime() - dateB.getTime();
      } catch (error) {
        console.warn("Error sorting appointments:", error);
        return 0;
      }
    });
  }, [appointments]);

  const virtualizer = useVirtualizer({
    count: sortedAppointments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = APPOINTMENT_STATUSES.find((s) => s.value === status);
    if (!statusConfig) {
      return (
        <Badge className="bg-[--muted] text-[--muted-foreground]">
          {status}
        </Badge>
      );
    }

    const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      confirmed: "default",
      scheduled: "secondary",
      cancelled: "destructive",
      completed: "default",
    };

    return (
      <Badge
        variant={variantMap[status] || "outline"}
        className={`${
          status === "confirmed"
            ? "bg-[--success]/10 text-[--success]"
            : status === "scheduled"
            ? "bg-[--warning]/10 text-[--warning]"
            : status === "cancelled"
            ? "bg-[--error]/10 text-[--error]"
            : status === "completed"
            ? "bg-[--primary]/10 text-[--primary]"
            : ""
        } inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium`}
      >
        {statusConfig.label}
      </Badge>
    );
  };

  const getPatientName = (patientId: string | number) => {
    const patient = patientsData?.find((p) => p.id === patientId);
    if (!patient) return "Unknown";
    return `${patient.first_name} ${patient.last_name}`.trim();
  };

  const getPatientInitials = (patientId: string | number) => {
    const patient = patientsData?.find((p) => p.id === patientId);
    if (!patient) return "U";
    const first = patient.first_name?.[0] || "";
    const last = patient.last_name?.[0] || "";
    return (first + last).toUpperCase() || "U";
  };

  const formatAppointmentType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (loading) {
    return (
      <Card className="bg-[--card] border border-[--border] rounded-xl shadow-lg p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (sortedAppointments.length === 0) {
    return (
      <Card className="bg-[--card] border border-[--border] rounded-xl shadow-lg p-6">
        <div className="text-center py-12 text-[--muted-foreground]">
          No appointments found
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-[--card] border border-[--border] rounded-xl shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Table Header */}
          <div className="grid grid-cols-[150px_200px_150px_100px_120px_200px_100px] gap-4 px-4 py-3 border-b border-[--border] bg-[--muted]/50">
            <div className="text-xs font-semibold text-[--muted-foreground] uppercase">
              Time
            </div>
            <div className="text-xs font-semibold text-[--muted-foreground] uppercase">
              Patient
            </div>
            <div className="text-xs font-semibold text-[--muted-foreground] uppercase">
              Type
            </div>
            <div className="text-xs font-semibold text-[--muted-foreground] uppercase">
              Duration
            </div>
            <div className="text-xs font-semibold text-[--muted-foreground] uppercase">
              Status
            </div>
            <div className="text-xs font-semibold text-[--muted-foreground] uppercase">
              Notes
            </div>
            <div className="text-xs font-semibold text-[--muted-foreground] uppercase">
              Actions
            </div>
          </div>

          {/* Virtualized Rows */}
          <div
            ref={parentRef}
            className="overflow-y-auto"
            style={{ height: "600px" }}
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const appointment = sortedAppointments[virtualRow.index];
                
                // Parse dates - start_time and end_time are ISO datetime strings
                let startTime: Date;
                let endTime: Date;
                
                try {
                  if (appointment.start_time) {
                    startTime = new Date(appointment.start_time);
                  } else if (appointment.appointment_date) {
                    startTime = new Date(appointment.appointment_date + "T00:00:00");
                  } else {
                    startTime = new Date();
                  }
                  
                  if (appointment.end_time) {
                    endTime = new Date(appointment.end_time);
                  } else if (appointment.appointment_date) {
                    endTime = new Date(appointment.appointment_date + "T01:00:00");
                  } else {
                    endTime = new Date();
                  }
                  
                  // Validate dates
                  if (isNaN(startTime.getTime())) startTime = new Date();
                  if (isNaN(endTime.getTime())) endTime = new Date();
                } catch (error) {
                  console.warn("Error parsing appointment times:", error);
                  startTime = new Date();
                  endTime = new Date();
                }

                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="grid grid-cols-[150px_200px_150px_100px_120px_200px_100px] gap-4 px-4 py-3 border-b border-[--border] hover:bg-[--accent] cursor-pointer items-center"
                    onClick={() => onAppointmentClick(appointment)}
                  >
                    {/* Time */}
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="text-sm text-[--foreground] font-medium">
                          {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
                        </div>
                        <div className="text-xs text-[--muted-foreground]">
                          {formatCrmDate(appointment.appointment_date)}
                        </div>
                      </div>
                    </div>

                    {/* Patient */}
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-[--muted] flex items-center justify-center text-xs font-medium text-[--foreground]">
                        {getPatientInitials(appointment.patient_id)}
                      </div>
                      <span className="text-sm text-[--foreground]">
                        {getPatientName(appointment.patient_id)}
                      </span>
                    </div>

                    {/* Type */}
                    <div className="text-sm text-[--foreground]">
                      {formatAppointmentType(appointment.appointment_type)}
                    </div>

                    {/* Duration */}
                    <div className="text-sm text-[--foreground]">
                      {appointment.duration_minutes} min
                    </div>

                    {/* Status */}
                    <div>{getStatusBadge(appointment.status)}</div>

                    {/* Notes */}
                    <div className="text-sm text-[--foreground] truncate">
                      {appointment.notes || appointment.mini_notes || "No notes"}
                    </div>

                    {/* Actions */}
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--accent] rounded-lg transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Open actions menu
                        }}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

