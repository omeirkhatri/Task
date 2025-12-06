import { Link } from "react-router";
import type { RaRecord } from "ra-core";

import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { RelativeDate } from "../misc/RelativeDate";
import { SaleName } from "../sales/SaleName";
import type { ActivityDealArchived } from "../types";

type ActivityLogDealArchivedProps = {
  activity: RaRecord & ActivityDealArchived;
};

export function ActivityLogDealArchived({
  activity,
}: ActivityLogDealArchivedProps) {
  const { deal } = activity;
  
  return (
    <div className="p-0">
      <div className="flex flex-row gap-2 items-center w-full justify-between">
        <div className="flex flex-row gap-2 items-center flex-grow min-w-0">
          <div className="w-5 h-5 bg-gray-400 rounded-full flex-shrink-0" />
          <span className="text-muted-foreground text-sm inline-flex">
            <ReferenceField
              source="sales_id"
              reference="sales"
              record={activity}
            >
              <SaleName />
            </ReferenceField>
            &nbsp;archived&nbsp;
            {deal.lead_id ? (
              <ReferenceField
                source="lead_id"
                reference="contacts"
                record={deal}
                link="show"
              >
                <TextField source="first_name" />
                &nbsp;
                <TextField source="last_name" />
              </ReferenceField>
            ) : (
              <Link to={`/lead-journey/${deal.id}/show`}>{deal.name}</Link>
            )}
          </span>
        </div>
        <span className="text-muted-foreground text-xs flex-shrink-0 ml-2">
          <RelativeDate date={activity.date} />
        </span>
      </div>
    </div>
  );
}
