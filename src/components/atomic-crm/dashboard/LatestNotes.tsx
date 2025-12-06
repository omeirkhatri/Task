import { formatDistance } from "date-fns";
import { FileText, CheckSquare, ArrowRightLeft, Receipt } from "lucide-react";
import { useGetIdentity, useGetList } from "ra-core";
import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { Card, CardContent } from "@/components/ui/card";

import type { Contact, ContactNote, Quote, Task, Deal } from "../types";

export const LatestNotes = () => {
  const { identity } = useGetIdentity();
  const { data: contactNotesData, isPending: contactNotesLoading } = useGetList(
    "contactNotes",
    {
      pagination: { page: 1, perPage: 10 },
      sort: { field: "date", order: "DESC" },
      filter: { sales_id: identity?.id },
    },
    { enabled: Number.isInteger(identity?.id) },
  );
  const { data: dealNotesData, isPending: dealNotesLoading } = useGetList(
    "dealNotes",
    {
      pagination: { page: 1, perPage: 10 },
      sort: { field: "date", order: "DESC" },
      filter: { sales_id: identity?.id },
    },
    { enabled: Number.isInteger(identity?.id) },
  );
  const { data: quotesData, isPending: quotesLoading } = useGetList<Quote>(
    "quotes",
    {
      pagination: { page: 1, perPage: 10 },
      sort: { field: "updated_at", order: "DESC" },
      filter: { sales_id: identity?.id },
    },
    { enabled: Number.isInteger(identity?.id) },
  );
  const { data: tasksData, isPending: tasksLoading } = useGetList<Task>(
    "tasks",
    {
      pagination: { page: 1, perPage: 10 },
      sort: { field: "due_date", order: "DESC" },
      filter: identity?.id ? { sales_id: identity.id } : {},
    },
    { enabled: Number.isInteger(identity?.id) },
  );
  const { data: dealsData, isPending: dealsLoading } = useGetList<Deal>(
    "lead-journey",
    {
      pagination: { page: 1, perPage: 10 },
      sort: { field: "updated_at", order: "DESC" },
      filter: { sales_id: identity?.id },
    },
    { enabled: Number.isInteger(identity?.id) },
  );

  if (
    contactNotesLoading ||
    dealNotesLoading ||
    quotesLoading ||
    tasksLoading ||
    dealsLoading
  ) {
    return null;
  }

  // TypeScript guards
  if (
    !contactNotesData ||
    !dealNotesData ||
    !quotesData ||
    !tasksData ||
    !dealsData
  ) {
    return null;
  }

  // Combine all activities
  const allActivities = ([] as any[])
    .concat(
      // Notes
      contactNotesData.map((note) => ({
        ...note,
        type: "contactNote",
        activityDate: note.date,
      })),
      dealNotesData.map((note) => ({
        ...note,
        type: "dealNote",
        activityDate: note.date,
      })),
      // Quotes - use updated_at if available, otherwise created_at
      quotesData.map((quote) => ({
        ...quote,
        type: "quote",
        activityDate: quote.updated_at || quote.created_at,
      })),
      // Tasks - use done_date if completed, otherwise due_date for created tasks
      tasksData.map((task) => ({
        ...task,
        type: task.done_date ? "taskCompleted" : "taskCreated",
        activityDate: task.done_date || task.due_date,
      })),
      // Status changes - deals that were updated (stage changes)
      dealsData
        .filter((deal) => deal.updated_at && deal.updated_at !== deal.created_at)
        .map((deal) => ({
          ...deal,
          type: "statusChange",
          activityDate: deal.updated_at,
        })),
    )
    .sort(
      (a, b) =>
        new Date(b.activityDate).valueOf() - new Date(a.activityDate).valueOf(),
    )
    .slice(0, 10);

  return (
    <div>
      <div className="flex items-center mb-4">
        <div className="ml-8 mr-8 flex">
          <FileText className="text-muted-foreground w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-muted-foreground">
          My Latest Activity
        </h2>
      </div>
      <Card>
        <CardContent>
          {allActivities.map((activity) => (
            <div
              id={`${activity.type}_${activity.id}`}
              key={`${activity.type}_${activity.id}`}
              className="mb-8"
            >
              <div className="text-sm text-muted-foreground">
                {activity.type === "contactNote" && (
                  <>
                    <FileText className="inline w-4 h-4 mr-1" />
                    Note on <Contact record={activity} />, added{" "}
                    {formatDistance(activity.activityDate, new Date(), {
                      addSuffix: true,
                    })}
                  </>
                )}
                {activity.type === "dealNote" && (
                  <>
                    <FileText className="inline w-4 h-4 mr-1" />
                    Note on <Deal record={activity} />, added{" "}
                    {formatDistance(activity.activityDate, new Date(), {
                      addSuffix: true,
                    })}
                  </>
                )}
                {activity.type === "quote" && (
                  <>
                    <Receipt className="inline w-4 h-4 mr-1" />
                    Quote for <Contact record={activity} />{" "}
                    {activity.status && `(${activity.status})`}, updated{" "}
                    {formatDistance(activity.activityDate, new Date(), {
                      addSuffix: true,
                    })}
                  </>
                )}
                {activity.type === "taskCompleted" && (
                  <>
                    <CheckSquare className="inline w-4 h-4 mr-1" />
                    Task completed for <Contact record={activity} />, done{" "}
                    {formatDistance(activity.activityDate, new Date(), {
                      addSuffix: true,
                    })}
                  </>
                )}
                {activity.type === "taskCreated" && (
                  <>
                    <CheckSquare className="inline w-4 h-4 mr-1" />
                    Task created for <Contact record={activity} />, due{" "}
                    {formatDistance(activity.activityDate, new Date(), {
                      addSuffix: true,
                    })}
                  </>
                )}
                {activity.type === "statusChange" && (
                  <>
                    <ArrowRightLeft className="inline w-4 h-4 mr-1" />
                    Status changed for <Deal record={activity} /> to{" "}
                    <span className="font-medium">{activity.stage}</span>,{" "}
                    {formatDistance(activity.activityDate, new Date(), {
                      addSuffix: true,
                    })}
                  </>
                )}
              </div>
              <div>
                {(activity.type === "contactNote" ||
                  activity.type === "dealNote") && (
                  <p className="text-sm line-clamp-3 overflow-hidden">
                    {activity.text}
                  </p>
                )}
                {activity.type === "quote" && (
                  <p className="text-sm line-clamp-3 overflow-hidden">
                    {activity.description || `Amount: د.إ${activity.amount}`}
                  </p>
                )}
                {(activity.type === "taskCompleted" ||
                  activity.type === "taskCreated") && (
                  <p className="text-sm line-clamp-3 overflow-hidden">
                    {activity.text}
                  </p>
                )}
                {activity.type === "statusChange" && (
                  <p className="text-sm line-clamp-3 overflow-hidden">
                    {activity.description || activity.name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

const Deal = ({ record }: { record: any }) => (
  <>
    Deal{" "}
    <ReferenceField
      record={record}
      source={record.deal_id ? "deal_id" : "id"}
      reference="lead-journey"
      link="show"
    >
      <TextField source="name" />
    </ReferenceField>
  </>
);

const Contact = ({ record }: { record: any }) => (
  <>
    Contact{" "}
    <ReferenceField<ContactNote | Quote | Task, Contact>
      record={record}
      source="contact_id"
      reference="contacts"
      link="show"
    />
  </>
);
