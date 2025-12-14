import { useMutation } from "@tanstack/react-query";
import { Archive, ArchiveRestore, Phone, Mail, MapPin, Stethoscope } from "lucide-react";
import {
  ShowBase,
  useDataProvider,
  useGetList,
  useGetOne,
  useNotify,
  useRecordContext,
  useRedirect,
  useRefresh,
  useUpdate,
  RecordContextProvider,
  useListContext,
} from "ra-core";
import { DeleteButton } from "@/components/admin/delete-button";
import { ReferenceManyField } from "@/components/admin/reference-many-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router";
import { subHours } from "date-fns";

import { NotesIterator } from "../notes/NotesIterator";
import { UnifiedNotesIterator } from "../notes/UnifiedNotesIterator";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Deal, Contact, DealNote, ContactNote } from "../types";
import { TagsListEdit } from "../contacts/TagsListEdit";
import { ServicesListEdit } from "../contacts/ServicesListEdit";
import { QuotesIterator } from "../quotes/QuotesIterator";
import { AddQuote } from "../quotes/AddQuote";
import { TasksIterator } from "../tasks/TasksIterator";
import { AddTask } from "../tasks/AddTask";
import { findDealLabel } from "./deal";

export const DealShow = ({ open, id }: { open: boolean; id?: string }) => {
  const redirect = useRedirect();
  const handleClose = () => {
    redirect("list", "lead-journey");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="lg:max-w-4xl p-4 overflow-y-auto max-h-9/10 top-1/20 translate-y-0">
        {id ? (
          <ShowBase id={id} resource="lead-journey">
            <DealShowContent />
          </ShowBase>
        ) : (
          <>
            <DialogTitle className="sr-only">Deal Details</DialogTitle>
            <DialogDescription className="sr-only">View deal information</DialogDescription>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const DealShowContent = () => {
  const { leadStages } = useConfigurationContext();
  const record = useRecordContext<Deal>();
  if (!record) return null;

  // Fetch Contact data using lead_id
  const { data: contact } = useGetOne<Contact>(
    "contacts",
    { id: record.lead_id },
    { enabled: !!record.lead_id }
  );

  // Fetch services from database to match with services_interested IDs
  const { data: servicesData } = useGetList("services", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "name", order: "ASC" },
  });

  // Fetch notes, quotes, and tasks for notification badges
  const { data: dealNotes } = useGetList<DealNote>("dealNotes", {
    pagination: { page: 1, perPage: 1000 },
    filter: { deal_id: record.id },
  }, { enabled: !!record.id });

  const { data: contactNotes } = useGetList<ContactNote>("contactNotes", {
    pagination: { page: 1, perPage: 1000 },
    filter: record.lead_id ? { contact_id: record.lead_id } : {},
  }, { enabled: !!record.lead_id });

  const { data: quotes } = useGetList("quotes", {
    pagination: { page: 1, perPage: 1000 },
    filter: record.lead_id ? { contact_id: record.lead_id } : {},
  }, { enabled: !!record.lead_id });

  const { data: tasks } = useGetList("tasks", {
    pagination: { page: 1, perPage: 1000 },
    filter: record.lead_id ? { contact_id: record.lead_id } : {},
  }, { enabled: !!record.lead_id });

  // Calculate notification counts for last 24 hours
  const twentyFourHoursAgo = subHours(new Date(), 24);
  
  const newNotesCount = [
    ...(dealNotes || []).filter(note => new Date(note.date) > twentyFourHoursAgo),
    ...(contactNotes || []).filter(note => new Date(note.date) > twentyFourHoursAgo),
  ].length;
  
  const newQuotesCount = (quotes || []).filter(quote => {
    const createdAt = quote.created_at || quote.date;
    return createdAt && new Date(createdAt) > twentyFourHoursAgo;
  }).length;
  
  const newTasksCount = (tasks || []).filter(task => {
    // Show tasks that are due within the next 24 hours or overdue
    if (!task.due_date) return false;
    const dueDate = new Date(task.due_date);
    const now = new Date();
    return dueDate <= now || (dueDate > now && dueDate <= new Date(now.getTime() + 24 * 60 * 60 * 1000));
  }).length;

  const displayName = contact 
    ? `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "New Lead"
    : record.first_name || record.last_name
    ? `${record.first_name ?? ""} ${record.last_name ?? ""}`.trim()
    : record.name || "New Lead";

  return (
    <>
      <DialogTitle className="sr-only">{displayName}</DialogTitle>
      <DialogDescription className="sr-only">Deal details and information</DialogDescription>
      <div className="space-y-2">
        {record.archived_at ? <ArchivedTitle /> : null}
        <div className="flex-1">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-semibold">{displayName}</h2>
              <span className="text-sm font-medium text-muted-foreground">
                {record.stage === "converted" ? "Client" : findDealLabel(leadStages, record.stage)}
              </span>
            </div>
            <div className={`flex gap-2 ${record.archived_at ? "" : "pr-12"}`}>
              {record.archived_at ? (
                <>
                  <UnarchiveButton record={record} />
                  <DeleteButton />
                </>
              ) : (
                <>
                  <ArchiveButton record={record} />
                  <AddToClientsButton record={record} />
                  {contact && (
                    <Button asChild variant="outline" size="sm" className="h-9">
                      <Link to={`/contacts/${contact.id}/show`}>See Contact</Link>
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Lead Information Section - All in one row */}
          {contact && (
            <div className="m-4">
              <Separator className="mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Phone Numbers */}
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground tracking-wide flex items-center gap-2 mb-1">
                    <Phone className="h-4 w-4" />
                    Phone
                  </span>
                  {contact.phone_jsonb && contact.phone_jsonb.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {contact.phone_jsonb.map((phone, index) => (
                        <span key={index} className="text-sm">
                          {phone.number}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>

                {/* Services Interested */}
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground tracking-wide flex items-center gap-2 mb-1">
                    <Stethoscope className="h-4 w-4" />
                    Services Interested
                  </span>
                  <RecordContextProvider value={contact}>
                    <ServicesListEdit />
                  </RecordContextProvider>
                </div>

                {/* Tags */}
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground tracking-wide mb-1">
                    Tags
                  </span>
                  <RecordContextProvider value={contact}>
                    <TagsListEdit />
                  </RecordContextProvider>
                </div>

                {/* Stage */}
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground tracking-wide mb-1">
                    Stage
                  </span>
                  <StageSelect deal={record} leadStages={leadStages} />
                </div>
              </div>
            </div>
          )}

          {/* Email and Address Section */}
          {contact && (
            <div className="m-4 space-y-4">
              <Separator />
              
              {/* Email Addresses */}
              {contact.email_jsonb && contact.email_jsonb.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground tracking-wide flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </span>
                  <div className="flex flex-col gap-1">
                    {contact.email_jsonb.map((email, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <a 
                          href={`mailto:${email.email}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {email.email}
                        </a>
                        <Badge variant="outline" className="text-xs">
                          {email.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Address */}
              {(contact.flat_villa_number || contact.building_street || contact.area) && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground tracking-wide flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Address
                  </span>
                  <div className="text-sm">
                    {contact.flat_villa_number && <span>{contact.flat_villa_number}, </span>}
                    {contact.building_street && <span>{contact.building_street}, </span>}
                    {contact.area && <span>{contact.area}</span>}
                    {contact.google_maps_link && (
                      <a
                        href={contact.google_maps_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-primary hover:underline"
                      >
                        View on Map
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tabs for Notes, Quotes, Tasks */}
          <div className="m-4">
            <Separator className="mb-4" />
            <Tabs defaultValue="notes">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="notes" className="relative gap-2">
                  <span>Notes</span>
                  {newNotesCount > 0 && (
                    <span className="h-5 min-w-5 px-1.5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px] font-semibold">
                      {newNotesCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="quotes" className="relative gap-2">
                  <span>Quotes</span>
                  {newQuotesCount > 0 && (
                    <span className="h-5 min-w-5 px-1.5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px] font-semibold">
                      {newQuotesCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="tasks" className="relative gap-2">
                  <span>Tasks</span>
                  {newTasksCount > 0 && (
                    <span className="h-5 min-w-5 px-1.5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px] font-semibold">
                      {newTasksCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="notes" className="pt-4">
                <UnifiedNotesIterator
                  reference="lead-journey"
                  dealId={record.id}
                  // Prefer lead_id when present, fallback to the first legacy contact_ids entry
                  contactId={
                    record.lead_id ?? (Array.isArray(record.contact_ids) ? record.contact_ids[0] : undefined)
                  }
                  leadId={record.lead_id}
                />
              </TabsContent>
              <TabsContent value="quotes" className="pt-4">
                {record.lead_id && contact ? (
                  <RecordContextProvider value={contact}>
                    <ReferenceManyField
                      target="contact_id"
                      reference="quotes"
                      sort={{ field: "created_at", order: "DESC" }}
                    >
                      <QuotesIterator />
                    </ReferenceManyField>
                  </RecordContextProvider>
                ) : null}
                {record.lead_id && contact && (
                  <div className="mt-4">
                    <RecordContextProvider value={contact}>
                      <AddQuote />
                    </RecordContextProvider>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="tasks" className="pt-4">
                {record.lead_id && contact ? (
                  <RecordContextProvider value={contact}>
                    <ReferenceManyField
                      target="contact_id"
                      reference="tasks"
                      sort={{ field: "due_date", order: "ASC" }}
                    >
                      <TasksIterator showAll />
                    </ReferenceManyField>
                  </RecordContextProvider>
                ) : null}
                {record.lead_id && contact && (
                  <div className="mt-4">
                    <RecordContextProvider value={contact}>
                      <AddTask />
                    </RecordContextProvider>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
};

const ArchivedTitle = () => (
  <div className="bg-orange-500 px-6 py-4">
    <h3 className="text-lg font-bold text-white">Archived Deal</h3>
  </div>
);

const ArchiveButton = ({ record }: { record: Deal }) => {
  const [update] = useUpdate();
  const redirect = useRedirect();
  const notify = useNotify();
  const refresh = useRefresh();
  const handleClick = () => {
    update(
      "lead-journey",
      {
        id: record.id,
        data: { archived_at: new Date().toISOString() },
        previousData: record,
      },
      {
        onSuccess: () => {
          redirect("list", "lead-journey");
          notify("Deal archived", { type: "info", undoable: false });
          refresh();
        },
        onError: () => {
          notify("Error: deal not archived", { type: "error" });
        },
      },
    );
  };

  return (
    <Button
      onClick={handleClick}
      size="sm"
      variant="outline"
      className="flex items-center gap-2 h-9"
    >
      <Archive className="w-4 h-4" />
      Archive
    </Button>
  );
};

const UnarchiveButton = ({ record }: { record: Deal }) => {
  const dataProvider = useDataProvider();
  const redirect = useRedirect();
  const notify = useNotify();
  const refresh = useRefresh();

  const { mutate } = useMutation({
    mutationFn: () => dataProvider.unarchiveDeal(record),
    onSuccess: () => {
      redirect("list", "lead-journey");
      notify("Deal unarchived", {
        type: "info",
        undoable: false,
      });
      refresh();
    },
    onError: () => {
      notify("Error: deal not unarchived", { type: "error" });
    },
  });

  const handleClick = () => {
    mutate();
  };

  return (
    <Button
      onClick={handleClick}
      size="sm"
      variant="outline"
      className="flex items-center gap-2 h-9"
    >
      <ArchiveRestore className="w-4 h-4" />
      Send back to the board
    </Button>
  );
};

const AddToClientsButton = ({ record }: { record: Deal }) => {
  const [update] = useUpdate();
  const notify = useNotify();
  const refresh = useRefresh();
  const isClient = record.stage === "converted";

  const handleClick = () => {
    if (isClient) {
      // Already a client, maybe show a message or navigate to client page
      notify("This lead is already a client", { type: "info", undoable: false });
    } else {
      // Convert to client by updating stage to "converted"
      update(
        "lead-journey",
        {
          id: record.id,
          data: { stage: "converted" },
          previousData: record,
        },
        {
          onSuccess: () => {
            notify("Lead converted to client", { type: "success", undoable: false });
            refresh();
          },
          onError: () => {
            notify("Error: lead not converted to client", { type: "error" });
          },
        },
      );
    }
  };

  return (
    <Button
      onClick={handleClick}
      size="sm"
      variant={isClient ? "default" : "outline"}
      className="flex items-center gap-2 h-9"
      disabled={isClient}
    >
      {isClient ? "Client" : "Add to Clients"}
    </Button>
  );
};

const StageSelect = ({ deal, leadStages }: { deal: Deal; leadStages: any[] }) => {
  const [update] = useUpdate();
  const notify = useNotify();
  const refresh = useRefresh();

  const handleStageChange = (newStage: string) => {
    if (newStage === deal.stage) return;
    
    update(
      "lead-journey",
      {
        id: deal.id,
        data: { stage: newStage },
        previousData: deal,
      },
      {
        onSuccess: () => {
          notify("Deal stage updated", { type: "info" });
          refresh();
        },
        onError: () => {
          notify("Error updating deal stage", { type: "error" });
        },
      },
    );
  };

  return (
    <Select value={deal.stage} onValueChange={handleStageChange}>
      <SelectTrigger className="h-8 text-sm">
        <SelectValue>
          {deal.stage === "converted" ? "Client" : findDealLabel(leadStages, deal.stage)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {leadStages.map((stage) => (
          <SelectItem key={stage.value} value={stage.value}>
            {stage.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
