import { Link } from "react-router";
import type { RaRecord } from "ra-core";

import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { RelativeDate } from "../misc/RelativeDate";
import { SaleName } from "../sales/SaleName";
import type { ActivityDealCreated } from "../types";

type ActivityLogDealCreatedProps = {
  activity: RaRecord & ActivityDealCreated;
};

export function ActivityLogDealCreated({
  activity,
}: ActivityLogDealCreatedProps) {
  const { deal } = activity;
  return (
    <div className="p-0">
      <div className="flex flex-row space-x-1 items-center w-full">
        <div className="w-5 h-5 bg-orange-200 rounded-full" />
        <div className="text-sm text-muted-foreground flex-grow">
          <span className="text-muted-foreground text-sm inline-flex">
            <ReferenceField
              source="sales_id"
              reference="sales"
              record={activity}
            >
              <SaleName />
            </ReferenceField>
            &nbsp;added lead&nbsp;
            <Link to={`/lead-journey/${deal.id}/show`}>
              {deal.first_name || deal.last_name
                ? `${deal.first_name ?? ""} ${deal.last_name ?? ""}`.trim()
                : deal.name || "New Lead"}
            </Link>
            {deal.lead_id && (
              <>
                &nbsp;for&nbsp;
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
              </>
            )}
            &nbsp;
            <span className="text-xs">
              <RelativeDate date={activity.date} />
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
