import { useQueryClient } from "@tanstack/react-query";
import { MoreVertical, CheckCircle2, Circle } from "lucide-react";
import { useDeleteWithUndoController, useNotify, useUpdate } from "ra-core";
import { useEffect, useState } from "react";
import { ReferenceField } from "@/components/admin/reference-field";
import { ReferenceArrayField } from "@/components/admin/reference-array-field";
import { SingleFieldList } from "@/components/admin/single-field-list";
import { DateField } from "@/components/admin/date-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRecordContext, RecordContextProvider } from "ra-core";

import type { Contact, Task as TData, Sale } from "../types";
import { TaskEdit } from "./TaskEdit";
import { crmAddDays, crmDateInputString } from "../misc/timezone";
import { RelativeDate } from "../misc/RelativeDate";

// Component to display user initials
const UserInitials = () => {
  const record = useRecordContext<Sale>();
  if (!record) return null;
  const initials = `${record.first_name?.charAt(0) || ""}${record.last_name?.charAt(0) || ""}`.toUpperCase();
  return (
    <div 
      className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground border border-border"
      title={`${record.first_name} ${record.last_name}`}
    >
      {initials}
    </div>
  );
};

export const Task = ({
  task,
  showContact,
  showTimestamp = true,
}: {
  task: TData;
  showContact?: boolean;
  showTimestamp?: boolean;
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
    // Invalidate queries when task completion status changes
    if (isSuccess && variables?.data?.done_date !== undefined) {
      queryClient.invalidateQueries({ queryKey: ["tasks", "getList"] });
    }
  }, [queryClient, isSuccess, variables]);

  const labelId = `checkbox-list-label-${task.id}`;
  const isCompleted = !!task.done_date;
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && !isCompleted && dueDate < new Date();

  return (
    <>
      <Card className={cn(
        "group border border-border/50 bg-card hover:border-border hover:shadow-sm transition-all duration-200",
        isCompleted && "opacity-60"
      )}>
        <CardContent className="p-2 flex items-start gap-2">
          <Checkbox
            id={labelId}
            checked={isCompleted}
            onCheckedChange={handleCheck()}
            disabled={isUpdatePending}
            className="mt-1 h-4 w-4 border-2 flex-shrink-0"
          />
          
          <div className="flex flex-col flex-1 min-w-0 gap-1">
            <div className="flex items-start justify-between gap-2">
              {/* Description */}
              <p className={cn(
                "text-sm font-medium leading-snug break-words min-w-0",
                isCompleted ? "line-through text-muted-foreground" : "text-foreground"
              )}>
                {task.text || "No description"}
              </p>

              {/* Right Side: Initials + Actions */}
              <div className="flex items-start gap-1 flex-shrink-0">
                {task.tagged_user_ids && task.tagged_user_ids.length > 0 && (
                  <RecordContextProvider value={task}>
                    <ReferenceArrayField
                      source="tagged_user_ids"
                      reference="sales"
                    >
                      <SingleFieldList className="flex items-center gap-1">
                        <UserInitials />
                      </SingleFieldList>
                    </ReferenceArrayField>
                  </RecordContextProvider>
                )}
                
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 cursor-pointer hover:bg-muted"
                        aria-label="task actions"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isCompleted ? (
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => {
                            update("tasks", {
                              id: task.id,
                              data: {
                                done_date: null,
                              },
                              previousData: task,
                            });
                            notify("Task added back to tasks board", { type: "success" });
                          }}
                        >
                          Add back to tasks
                        </DropdownMenuItem>
                      ) : (
                        <>
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
                        </>
                      )}
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
            </div>

            {/* Footer Metadata */}
            <div className="flex items-center gap-2 text-xs min-w-0">
              {dueDate && (
                <div className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap flex-shrink-0",
                  isOverdue && !isCompleted ? "text-destructive font-medium" : "text-muted-foreground"
                )}>
                  {isOverdue && !isCompleted && (
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0" />
                  )}
                  <DateField source="due_date" record={task} />
                </div>
              )}

              {dueDate && showContact && (
                <span className="text-muted-foreground/30 flex-shrink-0">•</span>
              )}

              {showContact && (
                <div className="min-w-0 truncate">
                  <ReferenceField<TData, Contact>
                    source="contact_id"
                    reference="contacts"
                    record={task}
                    link="show"
                    className="text-muted-foreground hover:underline truncate block"
                    render={({ referenceRecord }) => {
                      if (!referenceRecord) return null;
                      const fullName = `${referenceRecord?.first_name ?? ""} ${referenceRecord?.last_name ?? ""}`.trim() || "New Lead";
                      return (
                        <span className="truncate block" title={fullName}>
                          {fullName}
                        </span>
                      );
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* This part is for editing the Task directly via a Dialog */}
      {openEdit && (
        <TaskEdit taskId={task.id} open={openEdit} close={handleCloseEdit} />
      )}
    </>
  );
};
