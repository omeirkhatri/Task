import { useQueryClient } from "@tanstack/react-query";
import { MoreVertical, CheckCircle2, Circle } from "lucide-react";
import { useDeleteWithUndoController, useNotify, useUpdate } from "ra-core";
import { useEffect, useState } from "react";
import { ReferenceField } from "@/components/admin/reference-field";
import { DateField } from "@/components/admin/date-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { Contact, Task as TData } from "../types";
import { TaskEdit } from "./TaskEdit";
import { crmAddDays, crmDateInputString } from "../misc/timezone";
import { RelativeDate } from "../misc/RelativeDate";

export const Task = ({
  task,
  showContact,
}: {
  task: TData;
  showContact?: boolean;
}) => {
  const notify = useNotify();
  const queryClient = useQueryClient();

  const [openEdit, setOpenEdit] = useState(false);

  const handleCloseEdit = () => {
    setOpenEdit(false);
  };

  const [update, { isPending: isUpdatePending, isSuccess, variables }] =
    useUpdate();
  const { handleDelete } = useDeleteWithUndoController({
    resource: "tasks",
    record: task,
    redirect: false,
    mutationOptions: {
      onSuccess() {
        notify("Task deleted successfully", { undoable: true });
      },
    },
  });

  const handleEdit = () => {
    setOpenEdit(true);
  };

  const handleCheck = () => () => {
    update("tasks", {
      id: task.id,
      data: {
        done_date: task.done_date ? null : new Date().toISOString(),
      },
      previousData: task,
    });
  };

  useEffect(() => {
    // We do not want to invalidate the query when a tack is checked or unchecked
    if (
      isUpdatePending ||
      !isSuccess ||
      variables?.data?.done_date != undefined
    ) {
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["tasks", "getList"] });
  }, [queryClient, isUpdatePending, isSuccess, variables]);

  const labelId = `checkbox-list-label-${task.id}`;
  const isCompleted = !!task.done_date;
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && !isCompleted && dueDate < new Date();

  return (
    <>
      <Card className={cn(
        "hover:shadow-md transition-shadow py-3",
        isCompleted && "opacity-75"
      )}>
        <CardHeader className="pb-2 px-4 pt-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <div className="pt-0.5">
                <Checkbox
                  id={labelId}
                  checked={isCompleted}
                  onCheckedChange={handleCheck()}
                  disabled={isUpdatePending}
                  className="h-4 w-4"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn(
                  "text-sm font-medium mb-1",
                  isCompleted && "line-through text-muted-foreground"
                )}>
                  {task.type && task.type !== "None" && (
                    <Badge variant="outline" className="mr-1.5 text-xs">
                      {task.type}
                    </Badge>
                  )}
                  {task.text}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {dueDate && (
                    <div className={cn(
                      "text-xs flex items-center gap-1",
                      isOverdue && !isCompleted && "text-destructive font-medium",
                      isCompleted && "text-muted-foreground"
                    )}>
                      {isOverdue && !isCompleted && (
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                      )}
                      <span>Due</span>
                      <DateField source="due_date" record={task} />
                    </div>
                  )}
                  {showContact && (
                    <ReferenceField<TData, Contact>
                      source="contact_id"
                      reference="contacts"
                      record={task}
                      link="show"
                      className="text-xs text-muted-foreground"
                      render={({ referenceRecord }) => {
                        if (!referenceRecord) return null;
                        return (
                          <span className="text-xs text-muted-foreground">
                            Re: {referenceRecord?.first_name} {referenceRecord?.last_name}
                          </span>
                        );
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(task.created_at || task.done_date) && (
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  <RelativeDate date={isCompleted && task.done_date ? task.done_date : (task.created_at || task.due_date || new Date().toISOString())} />
                </span>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 cursor-pointer"
                    aria-label="task actions"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    update("tasks", {
                      id: task.id,
                      data: {
                        due_date:
                          crmDateInputString(crmAddDays(new Date(), 1)) ||
                          crmDateInputString(),
                      },
                      previousData: task,
                    });
                  }}
                >
                  Postpone to tomorrow
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    update("tasks", {
                      id: task.id,
                      data: {
                        due_date:
                          crmDateInputString(crmAddDays(new Date(), 7)) ||
                          crmDateInputString(),
                      },
                      previousData: task,
                    });
                  }}
                >
                  Postpone to next week
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={handleEdit}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-destructive" onClick={handleDelete}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* This part is for editing the Task directly via a Dialog */}
      {openEdit && (
        <TaskEdit taskId={task.id} open={openEdit} close={handleCloseEdit} />
      )}
    </>
  );
};
