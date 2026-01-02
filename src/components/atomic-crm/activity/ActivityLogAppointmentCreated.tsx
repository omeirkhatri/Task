import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { RelativeDate } from "../misc/RelativeDate";
import { SaleName } from "../sales/SaleName";
import type { ActivityAppointmentCreated } from "../types";
import { useActivityLogContext } from "./ActivityLogContext";
import { formatCrmDate, formatCrmTime } from "../misc/timezone";

type ActivityLogAppointmentCreatedProps = {
  activity: ActivityAppointmentCreated;
};

export function ActivityLogAppointmentCreated({
  activity,
}: ActivityLogAppointmentCreatedProps) {
  const context = useActivityLogContext();
  const { appointment } = activity;
  
  const appointmentTypeLabels: Record<string, string> = {
    doctor_on_call: "Doctor on Call",
    lab_test: "Lab Test",
    teleconsultation: "Teleconsultation",
    physiotherapy: "Physiotherapy",
    caregiver: "Caregiver",
    iv_therapy: "IV Therapy",
  };
  
  const appointmentTypeLabel = appointment?.appointment_type
    ? appointmentTypeLabels[appointment.appointment_type] || appointment.appointment_type
    : activity.appointment_type || "Appointment";
  
  return (
    <div className="p-0">
      <div className="flex flex-row space-x-1 items-center w-full justify-between">
        <div className="flex flex-row space-x-1 items-center flex-grow min-w-0">
          <div className="w-5 h-5 bg-blue-200 rounded-full flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <span className="text-muted-foreground text-sm inline-flex">
              <ReferenceField
                source="sales_id"
                reference="sales"
                record={activity}
              >
                <SaleName />
              </ReferenceField>
              &nbsp;created {appointmentTypeLabel.toLowerCase()} appointment
              {activity.contact_id && (
                <>
                  &nbsp;for&nbsp;
                  <ReferenceField
                    source="contact_id"
                    reference="contacts"
                    record={activity}
                  >
                    <TextField source="first_name" />
                    &nbsp;
                    <TextField source="last_name" />
                  </ReferenceField>
                </>
              )}
              {appointment?.start_time && (
                <>
                  &nbsp;on&nbsp;
                  {formatCrmDate(appointment.start_time)}&nbsp;at&nbsp;
                  {formatCrmTime(appointment.start_time)}
                </>
              )}
            </span>
          </div>
        </div>
        <span className="text-muted-foreground text-xs flex-shrink-0 ml-2">
          <RelativeDate date={activity.date} />
        </span>
      </div>
      {appointment?.mini_notes && (
        <div className="ml-6 mt-1 text-sm text-muted-foreground">
          {appointment.mini_notes}
        </div>
      )}
    </div>
  );
}

