/**
 * UnplannedJobsQueue Component
 * 
 * Left panel showing unplanned appointments (appointments without assigned trips).
 * Displays draggable cards that can be dragged to driver timeline lanes.
 */

import React, { useMemo } from "react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, MapPin, User, FileText } from "lucide-react";
import { format } from "date-fns";
import type { Appointment, Contact, Staff } from "../types";
import type { Identifier } from "ra-core";
import { useGetList } from "ra-core";

type UnplannedJobsQueueProps = {
  appointments: Appointment[];
  loading: boolean;
  selectedDate: Date;
  onAppointmentClick: (appointmentId: Identifier) => void;
  onAppointmentHover: (appointmentId: Identifier | null) => void;
};

export const UnplannedJobsQueue: React.FC<UnplannedJobsQueueProps> = ({
  appointments,
  loading,
  selectedDate,
  onAppointmentClick,
  onAppointmentHover,
}) => {
  // Fetch patients for appointments
  const patientIds = useMemo(() => {
    return appointments.map((a) => a.patient_id).filter(Boolean);
  }, [appointments]);

  const { data: patients } = useGetList<Contact>(
    "clients",
    {
      pagination: { page: 1, perPage: 1000 },
      filter: {
        id: patientIds.length > 0 ? { "@in": `(${patientIds.join(",")})` } : undefined,
      },
    },
    {
      enabled: patientIds.length > 0,
      retry: false,
    }
  );

  // Fetch staff for appointments
  const staffIds = useMemo(() => {
    const ids = new Set<Identifier>();
    appointments.forEach((a) => {
      if (a.primary_staff_id) ids.add(a.primary_staff_id);
      if (a.driver_id) ids.add(a.driver_id);
    });
    return Array.from(ids);
  }, [appointments]);

  const { data: staff } = useGetList<Staff>(
    "staff",
    {
      pagination: { page: 1, perPage: 1000 },
      filter: {
        id: staffIds.length > 0 ? { "@in": `(${staffIds.join(",")})` } : undefined,
      },
    },
    {
      enabled: staffIds.length > 0,
      retry: false,
    }
  );

  // Create maps for quick lookup
  const patientsMap = useMemo(() => {
    if (!patients) return new Map<Identifier, Contact>();
    return new Map(patients.map((p) => [p.id, p]));
  }, [patients]);

  const staffMap = useMemo(() => {
    if (!staff) return new Map<Identifier, Staff>();
    return new Map(staff.map((s) => [s.id, s]));
  }, [staff]);

  // Sort appointments by time
  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const timeA = a.start_time ? new Date(a.start_time).getTime() : 0;
      const timeB = b.start_time ? new Date(b.start_time).getTime() : 0;
      return timeA - timeB;
    });
  }, [appointments]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Unplanned Jobs
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {sortedAppointments.length} appointment{sortedAppointments.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Scrollable List */}
      <Droppable droppableId="unplanned-queue" isDropDisabled={true}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-y-auto p-4 space-y-2"
          >
            {sortedAppointments.length === 0 ? (
              <div className="text-center text-slate-500 dark:text-slate-400 py-8 text-sm">
                No unplanned appointments
              </div>
            ) : (
              sortedAppointments.map((appointment, index) => {
                const patient = patientsMap.get(appointment.patient_id);
                const primaryStaff = appointment.primary_staff_id
                  ? staffMap.get(appointment.primary_staff_id)
                  : null;

                return (
                  <Draggable
                    key={appointment.id}
                    draggableId={`appointment-${appointment.id}`}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`cursor-grab active:cursor-grabbing ${
                          snapshot.isDragging
                            ? "shadow-lg ring-2 ring-blue-500"
                            : "hover:shadow-md"
                        } transition-shadow`}
                        onMouseEnter={() => onAppointmentHover(appointment.id)}
                        onMouseLeave={() => onAppointmentHover(null)}
                        onClick={() => onAppointmentClick(appointment.id)}
                      >
                        <CardContent className="p-3">
                          {/* Time */}
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {appointment.start_time
                                ? format(new Date(appointment.start_time), "h:mm a")
                                : "No time"}
                            </span>
                          </div>

                          {/* Patient */}
                          {patient && (
                            <div className="flex items-center gap-2 mb-2">
                              <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                              <span className="text-sm text-slate-700 dark:text-slate-300">
                                {patient.first_name} {patient.last_name}
                              </span>
                            </div>
                          )}

                          {/* Area */}
                          {patient?.area && (
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                              <span className="text-xs text-slate-600 dark:text-slate-400">
                                {patient.area}
                              </span>
                            </div>
                          )}

                          {/* Staff */}
                          {primaryStaff && (
                            <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                              Staff: {primaryStaff.first_name} {primaryStaff.last_name}
                            </div>
                          )}

                          {/* Pickup/Drop Required */}
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                            {appointment.pickup_instructions
                              ? "Pickup/Drop required"
                              : "No transport needed"}
                          </div>

                          {/* Notes */}
                          {appointment.notes && (
                            <div className="flex items-start gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                              <FileText className="w-3 h-3 text-slate-500 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                              <span className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                {appointment.notes}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                );
              })
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

