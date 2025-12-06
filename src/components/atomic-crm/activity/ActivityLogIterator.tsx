import { Fragment, useState } from "react";

import { Separator } from "@/components/ui/separator";
import {
  COMPANY_CREATED,
  CONTACT_CREATED,
  CONTACT_NOTE_CREATED,
  DEAL_CREATED,
  DEAL_NOTE_CREATED,
  QUOTE_CREATED,
  QUOTE_UPDATED,
  TASK_CREATED,
  TASK_COMPLETED,
  DEAL_STATUS_CHANGED,
  DEAL_ARCHIVED,
  DEAL_UNARCHIVED,
  NOTE_DELETED,
  QUOTE_DELETED,
  TASK_DELETED,
} from "../consts";
import type { Activity } from "../types";
import { ActivityLogDealCreated } from "./ActivityLogDealCreated";
import { ActivityLogCompanyCreated } from "./ActivityLogCompanyCreated";
import { ActivityLogContactCreated } from "./ActivityLogContactCreated";
import { ActivityLogContactNoteCreated } from "./ActivityLogContactNoteCreated";
import { ActivityLogDealNoteCreated } from "./ActivityLogDealNoteCreated";
import { ActivityLogQuoteCreated } from "./ActivityLogQuoteCreated";
import { ActivityLogTaskCreated } from "./ActivityLogTaskCreated";
import { ActivityLogDealStatusChanged } from "./ActivityLogDealStatusChanged";
import { ActivityLogDealArchived } from "./ActivityLogDealArchived";
import { ActivityLogDealUnarchived } from "./ActivityLogDealUnarchived";
import { ActivityLogNoteDeleted } from "./ActivityLogNoteDeleted";
import { ActivityLogQuoteDeleted } from "./ActivityLogQuoteDeleted";
import { ActivityLogTaskDeleted } from "./ActivityLogTaskDeleted";

type ActivityLogIteratorProps = {
  activities: Activity[];
  pageSize: number;
};

export function ActivityLogIterator({
  activities,
  pageSize,
}: ActivityLogIteratorProps) {
  const [activitiesDisplayed, setActivityDisplayed] = useState(pageSize);

  return (
    <div className="space-y-4">
      {activities.slice(0, activitiesDisplayed).map((activity) => (
        <Fragment key={activity.id}>
          <ActivityItem activity={activity} />
          <Separator />
        </Fragment>
      ))}

      {activitiesDisplayed < activities.length && (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setActivityDisplayed(
              (activitiesDisplayed) => activitiesDisplayed + pageSize,
            );
          }}
          className="flex w-full justify-center text-sm underline hover:no-underline"
        >
          Load more activity
        </a>
      )}
    </div>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  if (activity.type === COMPANY_CREATED) {
    return <ActivityLogCompanyCreated activity={activity} />;
  }

  if (activity.type === CONTACT_CREATED) {
    return <ActivityLogContactCreated activity={activity} />;
  }

  if (activity.type === CONTACT_NOTE_CREATED) {
    return <ActivityLogContactNoteCreated activity={activity} />;
  }

  if (activity.type === DEAL_NOTE_CREATED) {
    return <ActivityLogDealNoteCreated activity={activity} />;
  }

  if (activity.type === DEAL_CREATED) {
    return <ActivityLogDealCreated activity={activity} />;
  }

  if (activity.type === QUOTE_CREATED || activity.type === QUOTE_UPDATED) {
    return <ActivityLogQuoteCreated activity={activity} />;
  }

  if (activity.type === TASK_CREATED || activity.type === TASK_COMPLETED) {
    return <ActivityLogTaskCreated activity={activity} />;
  }

  if (activity.type === DEAL_STATUS_CHANGED) {
    return <ActivityLogDealStatusChanged activity={activity} />;
  }

  if (activity.type === DEAL_ARCHIVED) {
    return <ActivityLogDealArchived activity={activity} />;
  }

  if (activity.type === DEAL_UNARCHIVED) {
    return <ActivityLogDealUnarchived activity={activity} />;
  }

  if (activity.type === NOTE_DELETED) {
    return <ActivityLogNoteDeleted activity={activity} />;
  }

  if (activity.type === QUOTE_DELETED) {
    return <ActivityLogQuoteDeleted activity={activity} />;
  }

  if (activity.type === TASK_DELETED) {
    return <ActivityLogTaskDeleted activity={activity} />;
  }

  return null;
}
