import { useRecordContext } from "ra-core";

import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { RelativeDate } from "../misc/RelativeDate";
import { SaleName } from "../sales/SaleName";
import type { ActivityContactNoteCreated, Contact } from "../types";
import { useActivityLogContext } from "./ActivityLogContext";
import { ActivityLogNote } from "./ActivityLogNote";

type ActivityLogContactNoteCreatedProps = {
  activity: ActivityContactNoteCreated;
};

export function ActivityLogContactNoteCreated({
  activity,
}: ActivityLogContactNoteCreatedProps) {
  const context = useActivityLogContext();
  const { contactNote } = activity;
  return (
    <ActivityLogNote
      header={
        <>
          <div className="text-sm text-muted-foreground">
            <span className="text-muted-foreground text-sm inline-flex">
              <ReferenceField
                source="sales_id"
                reference="sales"
                record={activity}
              >
                <SaleName />
              </ReferenceField>
              <ReferenceField
                source="contact_id"
                reference="contacts"
                record={activity.contactNote}
              >
            &nbsp;added a note about{" "}
            <TextField source="first_name" />
                &nbsp;
                <TextField source="last_name" />
              </ReferenceField>
            </span>
          </div>
          <span className="text-muted-foreground text-xs flex-shrink-0 ml-2">
            <RelativeDate date={activity.date} />
          </span>
        </>
      }
      text={contactNote.text}
    />
  );
}
