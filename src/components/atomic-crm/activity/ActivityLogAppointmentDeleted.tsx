import { ReferenceField } from "@/components/admin/reference-field";
import { RelativeDate } from "../misc/RelativeDate";
import { SaleName } from "../sales/SaleName";
import type { ActivityAppointmentDeleted } from "../types";
import { useActivityLogContext } from "./ActivityLogContext";
import { formatCrmDate } from "../misc/timezone";

type ActivityLogAppointmentDeletedProps = {
  activity: ActivityAppointmentDeleted;
};

export function ActivityLogAppointmentDeleted({
  activity,
}: ActivityLogAppointmentDeletedProps) {
  const context = useActivityLogContext();
  
  const appointmentTypeLabels: Record<string, string> = {
    doctor_on_call: "Doctor on Call",
    lab_test: "Lab Test",
    teleconsultation: "Teleconsultation",
    physiotherapy: "Physiotherapy",
    caregiver: "Caregiver",
    iv_therapy: "IV Therapy",
  };
  
  const appointmentTypeLabel = activity.appointment_type
    ? appointmentTypeLabels[activity.appointment_type] || activity.appointment_type
    : "appointment";
  
  return (
    <div className="p-0">
      <div className="flex flex-row space-x-1 items-center w-full justify-between">
        <div className="flex flex-row space-x-1 items-center flex-grow min-w-0">
          <div className="w-5 h-5 bg-red-200 rounded-full flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <span className="text-muted-foreground text-sm inline-flex">
              <ReferenceField
                source="sales_id"
                reference="sales"
                record={activity}
              >
                <SaleName />
              </ReferenceField>
              &nbsp;deleted {appointmentTypeLabel}
              {activity.contact_id && (
                <>
                  &nbsp;for&nbsp;
                  <ReferenceField
                    source="contact_id"
                    reference="contacts"
                    record={activity}
                  >
                    <span>contact</span>
                  </ReferenceField>
                </>
              )}
              {activity.appointment_date && (
                <>
                  &nbsp;scheduled for&nbsp;
                  {formatCrmDate(activity.appointment_date)}
                </>
              )}
            </span>
          </div>
        </div>
        <span className="text-muted-foreground text-xs flex-shrink-0 ml-2">
          <RelativeDate date={activity.date} />
        </span>
      </div>
    </div>
  );
}

