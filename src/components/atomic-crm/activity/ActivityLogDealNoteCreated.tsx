import type { RaRecord } from "ra-core";

import { ReferenceField } from "@/components/admin/reference-field";
import { RelativeDate } from "../misc/RelativeDate";
import { SaleName } from "../sales/SaleName";
import type { ActivityDealNoteCreated } from "../types";
import { useActivityLogContext } from "./ActivityLogContext";
import { ActivityLogNote } from "./ActivityLogNote";

type ActivityLogDealNoteCreatedProps = {
  activity: RaRecord & ActivityDealNoteCreated;
};

export function ActivityLogDealNoteCreated({
  activity,
}: ActivityLogDealNoteCreatedProps) {
  const context = useActivityLogContext();
  const { dealNote } = activity;
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
                link={false}
              >
                <SaleName />
              </ReferenceField>
              &nbsp;added a note about lead&nbsp;
              <ReferenceField
                source="deal_id"
                reference="lead-journey"
                record={dealNote}
                link="show"
              />
              {context !== "company" && (
                <>
                  {" at "}
                  <ReferenceField
                    source="deal_id"
                    reference="deals"
                    record={dealNote}
                    link={false}
                  >
                    <ReferenceField
                      source="company_id"
                      reference="companies"
                      link="show"
                    />
                  </ReferenceField>{" "}
                </>
              )}
            </span>
          </div>
          <span className="text-muted-foreground text-xs flex-shrink-0 ml-2">
            <RelativeDate date={activity.date} />
          </span>
        </>
      }
      text={dealNote.text}
    />
  );
}
