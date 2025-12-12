import { Link } from "react-router";

import { ReferenceField } from "@/components/admin/reference-field";
import { RelativeDate } from "../misc/RelativeDate";
import { SaleName } from "../sales/SaleName";
import type { ActivityContactCreated } from "../types";
import { useActivityLogContext } from "./ActivityLogContext";

type ActivityLogContactCreatedProps = {
  activity: ActivityContactCreated;
};

export function ActivityLogContactCreated({
  activity,
}: ActivityLogContactCreatedProps) {
  const context = useActivityLogContext();
  const { contact } = activity;
  return (
    <div className="p-0">
      <div className="flex flex-row gap-2 items-center w-full justify-between">
        <div className="flex flex-row gap-2 items-center flex-grow min-w-0">
          <div className="w-5 h-5 bg-teal-200 rounded-full flex-shrink-0" />
          <span className="text-muted-foreground text-sm inline-flex">
            <ReferenceField source="sales_id" reference="sales" record={activity}>
              <SaleName />
            </ReferenceField>
            &nbsp;added&nbsp;
            <Link to={`/contacts/${contact.id}/show`}>
              {`${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() || "New Lead"}
            </Link>
          </span>
        </div>
        <span className="text-muted-foreground text-xs flex-shrink-0 ml-2">
          <RelativeDate date={activity.date} />
        </span>
      </div>
    </div>
  );
}
