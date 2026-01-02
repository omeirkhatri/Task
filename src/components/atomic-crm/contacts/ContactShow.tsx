import {
  ShowBase,
  useShowContext,
  useGetList,
  RecordContextProvider,
  useRefresh,
  useUpdate,
  useNotify,
} from "ra-core";
import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Save, CircleX } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import type { SubmitHandler, FieldValues } from "react-hook-form";
import { useForm, FormProvider } from "react-hook-form";
import { useLocation } from "react-router";

import type { Contact, Task, Quote, Deal } from "../types";
import { ContactAside } from "./ContactAside";
import { QuoteItem } from "../quotes/QuoteItem";
import { AddQuote } from "../quotes/AddQuote";
import { Task as TaskComponent } from "../tasks/Task";
import { AddTask } from "../tasks/AddTask";
import { UnifiedNotesIterator } from "../notes/UnifiedNotesIterator";
import { ActivityLog } from "../activity/ActivityLog";
import { Badge } from "@/components/ui/badge";
import { DateField } from "@/components/admin/date-field";
import {
  crmAddDays,
  crmEndOfDay,
  crmEndOfWeek,
  crmStartOfDay,
} from "../misc/timezone";

export const ContactShow = () => (
  <ShowBase>
    <ContactShowContent />
  </ShowBase>
);

const ContactShowContent = () => {
  const { record, isPending } = useShowContext<Contact>();
  const refresh = useRefresh();
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [update, { isPending: isUpdating }] = useUpdate();
  const notify = useNotify();
  const location = useLocation();

  // Fetch deals associated with this contact to get deal IDs for notes
  // Fetch both archived and non-archived deals
  const { data: deals } = useGetList<Deal>("lead-journey", {
    pagination: { page: 1, perPage: 1000 },
    filter: record?.id ? { lead_id: record.id } : {},
    sort: { field: "archived_at", order: "ASC" }, // Non-archived first
  }, { enabled: !!record?.id });
  
  // Separate archived and non-archived deals
  const sortedDeals = useMemo(() => {
    if (!deals) return [];
    const active = deals.filter(d => !d.archived_at);
    const archived = deals.filter(d => d.archived_at);
    return [...active, ...archived];
  }, [deals]);

  // Get all deal IDs for fetching notes from all deals
  const dealIds = useMemo(() => {
    return deals?.map(deal => deal.id) || [];
  }, [deals]);

  const { data: quotes } = useGetList<Quote>("quotes", {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: "created_at", order: "DESC" },
    filter: record?.id ? { contact_id: record.id } : {},
  }, { enabled: !!record?.id });

  const { data: tasks } = useGetList<Task>("tasks", {
    pagination: { page: 1, perPage: 1000 },
    filter: record?.id ? { contact_id: record.id } : {},
  }, { enabled: !!record?.id });

  const [showCompletedTasks, setShowCompletedTasks] = useState(false);

  const groupedTasks = useMemo(() => {
    const empty = {
      overdue: [] as Task[],
      today: [] as Task[],
      tomorrow: [] as Task[],
      thisWeek: [] as Task[],
      later: [] as Task[],
      completed: [] as Task[],
    };
    if (!tasks) return empty;

    const startOfToday = crmStartOfDay() ?? new Date();
    const endOfToday = crmEndOfDay() ?? new Date();
    const endOfTomorrow = crmEndOfDay(crmAddDays(new Date(), 1)) ?? new Date();
    const endOfWeek = crmEndOfWeek() ?? new Date();

    for (const task of tasks) {
      if (task.done_date) {
        empty.completed.push(task);
        continue;
      }

      const due = task.due_date ? new Date(task.due_date) : null;
      if (!due || Number.isNaN(due.getTime())) {
        empty.later.push(task);
        continue;
      }

      if (due < startOfToday) empty.overdue.push(task);
      else if (due <= endOfToday) empty.today.push(task);
      else if (due <= endOfTomorrow) empty.tomorrow.push(task);
      else if (due <= endOfWeek) empty.thisWeek.push(task);
      else empty.later.push(task);
    }

    const byDueDateAsc = (a: Task, b: Task) =>
      new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime();

    empty.overdue.sort(byDueDateAsc);
    empty.today.sort(byDueDateAsc);
    empty.tomorrow.sort(byDueDateAsc);
    empty.thisWeek.sort(byDueDateAsc);
    empty.later.sort(byDueDateAsc);

    empty.completed.sort(
      (a, b) => new Date(b.done_date || 0).getTime() - new Date(a.done_date || 0).getTime(),
    );

    return empty;
  }, [tasks]);

  const form = useForm<{ description: string }>({
    defaultValues: {
      description: record?.description || "",
    },
  });

  // Reset form when record ID changes (different contact)
  useEffect(() => {
    if (record) {
      form.reset({ description: record.description || "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id]);

  // If we deep-link with a hash (#note-123 / #task-456), scroll to it once content renders.
  useEffect(() => {
    if (!record) return;
    const hash = (location.hash || "").replace(/^#/, "");
    if (!hash) return;

    let tries = 0;
    const tryScroll = () => {
      tries += 1;
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        return;
      }
      if (tries < 20) {
        setTimeout(tryScroll, 150);
      }
    };
    tryScroll();
  }, [location.hash, record]);

  const handleDescriptionUpdate: SubmitHandler<FieldValues> = (values) => {
    if (!record) return;
    update(
      "contacts",
      { id: record.id, data: { description: values.description || null }, previousData: record },
      {
        onSuccess: () => {
          setIsEditingDescription(false);
          refresh();
          notify("Description updated", { type: "info" });
        },
        onError: (error: any) => {
          console.error("Error updating description:", error);
          notify(
            error?.message?.includes("description") 
              ? "Description column not found. Please ensure migrations are applied."
              : "Failed to update description",
            { type: "error" }
          );
        },
      },
    );
  };

  const handleCancelEdit = () => {
    if (record) {
      form.reset({ description: record.description || "" });
    }
    setIsEditingDescription(false);
  };

  if (isPending || !record) return null;

  const defaultTab = (() => {
    const tab = new URLSearchParams(location.search).get("tab");
    if (tab === "notes" || tab === "quotes" || tab === "tasks" || tab === "activity" || tab === "packages") {
      return tab;
    }
    return "activity";
  })();

  return (
    <div className="mt-2 mb-2 flex gap-8">
      <div className="flex-1">
        <Card>
          <CardContent>
            <div className="flex">
              <div className="flex-1">
                <h5 className="text-xl font-semibold">
                  {record.first_name} {record.last_name}
                </h5>
                <div className="inline-flex text-sm text-muted-foreground">
                  {record.title}
                  {record.title && record.company_id != null && " at "}
                  {record.company_id != null && (
                    <ReferenceField
                      source="company_id"
                      reference="companies"
                      link="show"
                    >
                      &nbsp;
                      <TextField source="name" />
                    </ReferenceField>
                  )}
                </div>
                <div className="mt-4">
                  {isEditingDescription ? (
                    <FormProvider {...form}>
                      <form onSubmit={form.handleSubmit(handleDescriptionUpdate)}>
                        <div className="flex flex-col gap-2">
                          <Textarea
                            {...form.register("description")}
                            placeholder="Add a description..."
                            rows={4}
                            className="text-sm"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={handleCancelEdit}
                              type="button"
                              size="sm"
                              className="cursor-pointer"
                            >
                              <CircleX className="w-4 h-4 mr-2" />
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={isUpdating}
                              size="sm"
                              className="cursor-pointer"
                            >
                              <Save className="w-4 h-4 mr-2" />
                              Save
                            </Button>
                          </div>
                        </div>
                      </form>
                    </FormProvider>
                  ) : (
                    <div className="group relative">
                      {record.description ? (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {record.description}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No description
                        </p>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          form.reset({ description: record.description || "" });
                          setIsEditingDescription(true);
                        }}
                        className="mt-2 h-7 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5 mr-2" />
                        {record.description ? "Edit description" : "Add description"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <Tabs defaultValue={defaultTab} className="mt-6">
              <TabsList className="w-full">
                <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
                <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
                <TabsTrigger value="quotes" className="flex-1">Quotes</TabsTrigger>
                <TabsTrigger value="tasks" className="flex-1">Tasks</TabsTrigger>
              </TabsList>
              
              <TabsContent value="activity" className="pt-4">
                <Card className="mb-2 p-6">
                  <ActivityLog contactId={record.id} pageSize={10} context="contact" />
                </Card>
              </TabsContent>
              
              <TabsContent value="notes" className="pt-4">
                <RecordContextProvider value={record}>
                  <UnifiedNotesIterator
                    reference="contacts"
                    showStatus
                    contactId={record.id}
                    leadId={record.id}
                    dealIds={dealIds}
                  />
                </RecordContextProvider>
              </TabsContent>
              
              <TabsContent value="quotes" className="pt-4">
                <RecordContextProvider value={record}>
                  <AddQuote />
                </RecordContextProvider>
                {quotes && quotes.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {quotes.map((quote) => (
                      <QuoteItem quote={quote} key={quote.id} />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="tasks" className="pt-4">
                <RecordContextProvider value={record}>
                  <AddTask />
                </RecordContextProvider>
                <div className="mt-4 space-y-6">
                  {tasks && tasks.length > 0 ? (
                    <>
                      {groupedTasks.overdue.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                            Overdue
                          </p>
                          <div className="space-y-2">
                            {groupedTasks.overdue.map((task) => (
                              <TaskComponent task={task} key={task.id} />
                            ))}
                          </div>
                        </div>
                      )}

                      {groupedTasks.today.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                            Today
                          </p>
                          <div className="space-y-2">
                            {groupedTasks.today.map((task) => (
                              <TaskComponent task={task} key={task.id} />
                            ))}
                          </div>
                        </div>
                      )}

                      {groupedTasks.tomorrow.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                            Tomorrow
                          </p>
                          <div className="space-y-2">
                            {groupedTasks.tomorrow.map((task) => (
                              <TaskComponent task={task} key={task.id} />
                            ))}
                          </div>
                        </div>
                      )}

                      {groupedTasks.thisWeek.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                            This Week
                          </p>
                          <div className="space-y-2">
                            {groupedTasks.thisWeek.map((task) => (
                              <TaskComponent task={task} key={task.id} />
                            ))}
                          </div>
                        </div>
                      )}

                      {groupedTasks.later.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                            Later
                          </p>
                          <div className="space-y-2">
                            {groupedTasks.later.map((task) => (
                              <TaskComponent task={task} key={task.id} />
                            ))}
                          </div>
                        </div>
                      )}

                      {groupedTasks.completed.length > 0 && (
                        <div className="space-y-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            onClick={() => setShowCompletedTasks((v) => !v)}
                          >
                            {showCompletedTasks ? "Hide" : "Show"} completed (
                            {groupedTasks.completed.length})
                          </Button>
                          {showCompletedTasks && (
                            <div className="space-y-2">
                              {groupedTasks.completed.map((task) => (
                                <TaskComponent task={task} key={task.id} />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No tasks yet</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <ContactAside deals={sortedDeals} />
    </div>
  );
};

