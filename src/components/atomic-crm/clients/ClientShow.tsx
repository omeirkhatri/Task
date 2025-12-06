import { ShowBase, useShowContext, useGetList, RecordContextProvider, useRefresh } from "ra-core";
import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useMemo } from "react";

import type { Contact, Task, Quote, Deal } from "../types";
import { ClientAside } from "./ClientAside";
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

  // Fetch deals associated with this contact to get deal IDs for notes
  const { data: deals } = useGetList<Deal>("lead-journey", {
    pagination: { page: 1, perPage: 1000 },
    filter: record?.id ? { lead_id: record.id } : {},
  }, { enabled: !!record?.id });

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
              </div>
            </div>
            
            <Tabs defaultValue="activity" className="mt-6">
              <TabsList>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="quotes">Quotes</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
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
      <ClientAside />
    </div>
  );
};
