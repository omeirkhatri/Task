import { DataTable } from "@/components/admin/data-table";
import { DateField } from "@/components/admin/date-field";
import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { ShowButton } from "@/components/admin/show-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WithRecord, useUpdate, useNotify } from "ra-core";
import { CheckCircle2 } from "lucide-react";
import type { BugReport } from "../types";

const StatusBadge = ({ record }: { record: BugReport }) => {
  if (!record) return null;
  
  const statusColors = {
    open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    closed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  };

  return (
    <Badge className={statusColors[record.status] || statusColors.open}>
      {record.status}
    </Badge>
  );
};

const PriorityBadge = ({ record }: { record: BugReport }) => {
  if (!record) return null;
  
  const priorityColors = {
    low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };

  return (
    <Badge className={priorityColors[record.priority] || priorityColors.medium}>
      {record.priority}
    </Badge>
  );
};

const MarkAsFixedButton = ({ record }: { record: BugReport }) => {
  const [update] = useUpdate();
  const notify = useNotify();

  const handleMarkAsFixed = async () => {
    try {
      await update(
        "bug_reports",
        {
          id: record.id,
          data: {
            status: "resolved",
          },
          previousData: record,
        },
        {
          onSuccess: () => {
            notify("Bug report marked as resolved", { type: "success" });
          },
          onError: (error: unknown) => {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to update bug report";
            notify(errorMessage, { type: "error" });
          },
        }
      );
    } catch (error) {
      notify("Failed to mark as fixed", { type: "error" });
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleMarkAsFixed}
      className="h-8 text-xs"
    >
      <CheckCircle2 className="w-3 h-3 mr-1" />
      Mark Fixed
    </Button>
  );
};

export const BugReportList = () => {
  return (
    <DataTable>
      <DataTable.Col
        source="id"
        label="ID"
        sortable
      />
      <DataTable.Col
        source="title"
        label="Title"
        sortable
      />
      <DataTable.Col
        source="reported_by"
        label="Reported By"
        sortable
      >
        <ReferenceField source="reported_by" reference="sales" />
      </DataTable.Col>
      <DataTable.Col
        source="status"
        label="Status"
        sortable
      >
        <WithRecord render={(record) => <StatusBadge record={record} />} />
      </DataTable.Col>
      <DataTable.Col
        source="priority"
        label="Priority"
        sortable
      >
        <WithRecord render={(record) => <PriorityBadge record={record} />} />
      </DataTable.Col>
      <DataTable.Col
        source="created_at"
        label="Created"
        sortable
      >
        <DateField showTime />
      </DataTable.Col>
      <DataTable.Col
        source="updated_at"
        label="Updated"
        sortable
      >
        <DateField showTime />
      </DataTable.Col>
      <DataTable.Col
        source="actions"
        label="Actions"
      >
        <WithRecord
          render={(record) => (
            <div className="flex items-center gap-2">
              <ShowButton />
              {record.status !== "resolved" && record.status !== "closed" && (
                <MarkAsFixedButton record={record} />
              )}
            </div>
          )}
        />
      </DataTable.Col>
    </DataTable>
  );
};

