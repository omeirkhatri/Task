import { ReferenceField } from "@/components/admin/reference-field";
import { RelativeDate } from "../misc/RelativeDate";
import { SaleName } from "../sales/SaleName";
import type { ActivityQuoteDeleted } from "../types";
import { useActivityLogContext } from "./ActivityLogContext";

type ActivityLogQuoteDeletedProps = {
  activity: ActivityQuoteDeleted;
};

export function ActivityLogQuoteDeleted({
  activity,
}: ActivityLogQuoteDeletedProps) {
  const context = useActivityLogContext();
  
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
              &nbsp;deleted a quote
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
            </span>
          </div>
        </div>
        <span className="text-muted-foreground text-xs flex-shrink-0 ml-2">
          <RelativeDate date={activity.date} />
        </span>
      </div>
      {(activity.quote_description || activity.quote_amount) && (
        <div className="ml-6 mt-1 text-sm text-muted-foreground line-through opacity-75">
          {activity.quote_description && (
            <span>
              {activity.quote_description.length > 100
                ? `${activity.quote_description.substring(0, 100)}...`
                : activity.quote_description}
            </span>
          )}
          {activity.quote_amount && (
            <span className="ml-2 font-semibold">
              {new Intl.NumberFormat("en-AE", {
                style: "currency",
                currency: "AED",
              }).format(Number(activity.quote_amount))}
            </span>
          )}
        </div>
      )}
    </div>
  );
}





