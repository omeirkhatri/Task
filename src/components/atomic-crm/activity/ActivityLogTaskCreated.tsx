import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { RelativeDate } from "../misc/RelativeDate";
import { SaleName } from "../sales/SaleName";
import { TASK_COMPLETED } from "../consts";
import type { ActivityTaskCreated, ActivityTaskCompleted } from "../types";
import { useActivityLogContext } from "./ActivityLogContext";

type ActivityLogTaskProps = {
  activity: ActivityTaskCreated | ActivityTaskCompleted;
};

export function ActivityLogTaskCreated({
  activity,
}: ActivityLogTaskProps) {
  const context = useActivityLogContext();
  const { task } = activity;
  const isCompleted = activity.type === TASK_COMPLETED;
  
  return (
    <div className="p-0">
      <div className="flex flex-row space-x-1 items-center w-full justify-between">
        <div className="flex flex-row space-x-1 items-center flex-grow min-w-0">
          <div className="w-5 h-5 bg-purple-200 rounded-full flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <span className="text-muted-foreground text-sm inline-flex">
              <ReferenceField
                source="sales_id"
                reference="sales"
                record={activity}
              >
                <SaleName />
              </ReferenceField>
              &nbsp;{isCompleted ? "completed" : "created"} task
              {(() => {
                const taskType = task.type?.trim();
                // Only show type if it's a valid non-empty string and not "none" or "null"
                if (taskType && 
                    taskType.toLowerCase() !== "none" && 
                    taskType.toLowerCase() !== "null" &&
                    taskType !== "") {
                  return ` (${taskType})`;
                }
                return "";
              })()} for&nbsp;
              <ReferenceField
                source="contact_id"
                reference="contacts"
                record={task}
              >
                <TextField source="first_name" />
                &nbsp;
                <TextField source="last_name" />
              </ReferenceField>
            </span>
          </div>
        </div>
        <span className="text-muted-foreground text-xs flex-shrink-0 ml-2">
          <RelativeDate date={activity.date} />
        </span>
      </div>
      {task.text && (
        <div className="ml-6 mt-1 text-sm text-muted-foreground">
          {task.text}
        </div>
      )}
    </div>
  );
}
