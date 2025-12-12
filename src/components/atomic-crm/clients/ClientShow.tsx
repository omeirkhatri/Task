import { ShowBase, useShowContext, useGetList, RecordContextProvider, useRefresh, useUpdate, useNotify } from "ra-core";
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

import type { Contact, Task, Quote, Deal } from "../types";
import { ContactAside } from "../contacts/ContactAside";
import { QuoteItem } from "../quotes/QuoteItem";
import { AddQuote } from "../quotes/AddQuote";
import { Task as TaskComponent } from "../tasks/Task";
import { AddTask } from "../tasks/AddTask";
import { UnifiedNotesIterator } from "../notes/UnifiedNotesIterator";
import { ActivityLog } from "../activity/ActivityLog";

export const ClientShow = () => (
  <ShowBase>
    <ClientShowContent />
  </ShowBase>
);

const ClientShowContent = () => {
  const { record, isPending } = useShowContext<Contact>();
  const refresh = useRefresh();
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [update, { isPending: isUpdating }] = useUpdate();
  const notify = useNotify();

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

  // Sort tasks: Due ones on top (newest to oldest), then completed ones (newest to oldest)
  const sortedTasks = useMemo(() => {
    if (!tasks) return [];
    
    const dueTasks = tasks
      .filter(task => !task.done_date)
      .sort((a, b) => {
        // Sort by id DESC (newest created first, assuming auto-incrementing IDs)
        // If IDs are not sequential, fall back to due_date DESC
        if (typeof a.id === 'number' && typeof b.id === 'number') {
          return b.id - a.id;
        }
        const dateA = new Date(a.due_date || 0).valueOf();
        const dateB = new Date(b.due_date || 0).valueOf();
        return dateB - dateA;
      });
    
    const completedTasks = tasks
      .filter(task => task.done_date)
      .sort((a, b) => {
        // Sort by done_date DESC (newest completed first)
        const dateA = new Date(a.done_date || 0).valueOf();
        const dateB = new Date(b.done_date || 0).valueOf();
        return dateB - dateA;
      });
    
    return [...dueTasks, ...completedTasks];
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
            
            <Tabs defaultValue="activity" className="mt-6">
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
                {sortedTasks && sortedTasks.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {sortedTasks.map((task) => (
                      <TaskComponent task={task} key={task.id} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <ContactAside deals={sortedDeals} />
    </div>
  );
};
