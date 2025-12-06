import { Link } from "react-router";
import type { RaRecord } from "ra-core";

import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { RelativeDate } from "../misc/RelativeDate";
import { SaleName } from "../sales/SaleName";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { findDealLabel } from "../deals/deal";
import type { ActivityDealStatusChanged } from "../types";

type ActivityLogDealStatusChangedProps = {
  activity: RaRecord & ActivityDealStatusChanged;
};

export function ActivityLogDealStatusChanged({
  activity,
}: ActivityLogDealStatusChangedProps) {
  const { leadStages } = useConfigurationContext();
  const { deal } = activity;
  
  // Use new_stage from activity if available, otherwise fall back to deal.stage
  const newStage = activity.new_stage ?? deal.stage;
  const oldStage = activity.old_stage;
  
  const newStageLabel = findDealLabel(leadStages, newStage) || newStage;
  const oldStageLabel = oldStage ? (findDealLabel(leadStages, oldStage) || oldStage) : null;
  
  return (
    <div className="p-0">
      <div className="flex flex-row gap-2 items-center w-full justify-between">
        <div className="flex flex-row gap-2 items-center flex-grow min-w-0">
          <div className="w-5 h-5 bg-amber-200 rounded-full flex-shrink-0" />
          <span className="text-muted-foreground text-sm inline-flex">
            <ReferenceField
              source="sales_id"
              reference="sales"
              record={activity}
            >
              <SaleName />
            </ReferenceField>
            &nbsp;moved&nbsp;
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
            {oldStageLabel ? (
              <>
                &nbsp;from&nbsp;
                <span className="font-medium">{oldStageLabel}</span>
                &nbsp;to&nbsp;
              </>
            ) : (
              <> &nbsp;to&nbsp; </>
            )}
            <span className="font-medium">{newStageLabel}</span>
          </span>
        </div>
        <span className="text-muted-foreground text-xs flex-shrink-0 ml-2">
          <RelativeDate date={activity.date} />
        </span>
      </div>
    </div>
  );
}
