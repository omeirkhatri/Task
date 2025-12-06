import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { RelativeDate } from "../misc/RelativeDate";
import { SaleName } from "../sales/SaleName";
import { QUOTE_UPDATED } from "../consts";
import type { ActivityQuoteCreated, ActivityQuoteUpdated } from "../types";
import { useActivityLogContext } from "./ActivityLogContext";

type ActivityLogQuoteProps = {
  activity: ActivityQuoteCreated | ActivityQuoteUpdated;
};

export function ActivityLogQuoteCreated({
  activity,
}: ActivityLogQuoteProps) {
  const context = useActivityLogContext();
  const { quote } = activity;
  const isUpdated = activity.type === QUOTE_UPDATED;
  
  // Format currency properly
  const formattedAmount = quote.amount
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "AED",
        minimumFractionDigits: 2,
      }).format(Number(quote.amount))
    : null;
  
  return (
    <div className="p-0">
      <div className="flex flex-row space-x-1 items-center w-full justify-between">
        <div className="flex flex-row space-x-1 items-center flex-grow min-w-0">
          <div className="w-5 h-5 bg-green-200 rounded-full flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <span className="text-muted-foreground text-sm inline-flex">
              <ReferenceField
                source="sales_id"
                reference="sales"
                record={activity}
              >
                <SaleName />
              </ReferenceField>
              &nbsp;{isUpdated ? "updated a" : "created a"}&nbsp;
              {quote.service_id ? (
                <>
                  <ReferenceField
                    source="service_id"
                    reference="services"
                    record={quote}
                  >
                    <TextField source="name" />
                  </ReferenceField>
                  &nbsp;Quote
                </>
              ) : (
                "Quote"
              )}
              &nbsp;for&nbsp;
              <ReferenceField
                source="contact_id"
                reference="contacts"
                record={quote}
              >
                <TextField source="first_name" />
                &nbsp;
                <TextField source="last_name" />
              </ReferenceField>
              {formattedAmount && (
                <>
                  &nbsp;-&nbsp;{formattedAmount}
                </>
              )}
            </span>
          </div>
        </div>
        <span className="text-muted-foreground text-xs flex-shrink-0 ml-2">
          <RelativeDate date={activity.date} mode="local" />
        </span>
      </div>
      {quote.description && (
        <div className="ml-6 mt-1 text-sm text-muted-foreground line-clamp-3 overflow-hidden">
          {quote.description}
        </div>
      )}
    </div>
  );
}
