import { FileText, Search } from "lucide-react";
import {
  ResourceContextProvider,
  useGetIdentity,
  useGetList,
  WithRecord,
} from "ra-core";
import { useEffect, useMemo, useState } from "react";
import { ReferenceField } from "@/components/admin/reference-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { ContactNote, Deal, DealNote, Contact } from "../types";
import { Note } from "./Note";

type NotesTab = "all" | "mentions" | "authored";

type UnifiedNote =
  | (ContactNote & { _noteType: "contact" })
  | (DealNote & { _noteType: "deal" });

export const NotesPage = () => {
  const { identity } = useGetIdentity();

  const [tab, setTab] = useState<NotesTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [perPage, setPerPage] = useState(50);

  // When the user changes the scope (tab/search), reset pagination.
  useEffect(() => {
    setPerPage(50);
  }, [tab, searchQuery]);

  const baseFilter = useMemo(() => {
    const filter: Record<string, unknown> = {};

    if (tab === "mentions") {
      if (Number.isInteger(identity?.id)) {
        filter["tagged_user_ids@cs"] = `{${identity!.id}}`;
      } else {
        // No identity yet; force empty result until we know who the user is.
        filter["id@in"] = "(-1)";
      }
    }

    if (tab === "authored") {
      if (Number.isInteger(identity?.id)) {
        filter.sales_id = identity!.id;
      } else {
        filter["id@in"] = "(-1)";
      }
    }

    if (searchQuery.trim()) {
      filter["text@ilike"] = `%${searchQuery.trim()}%`;
    }

    return filter;
  }, [tab, identity?.id, searchQuery]);

  const listEnabled = tab === "all" || Number.isInteger(identity?.id);

  const {
    data: contactNotes,
    total: contactNotesTotal,
    isPending: contactNotesPending,
    error: contactNotesError,
  } = useGetList<ContactNote>(
    "contactNotes",
    {
      pagination: { page: 1, perPage },
      sort: { field: "date", order: "DESC" },
      filter: baseFilter,
    },
    { enabled: listEnabled, retry: false },
  );

  const {
    data: dealNotes,
    total: dealNotesTotal,
    isPending: dealNotesPending,
    error: dealNotesError,
  } = useGetList<DealNote>(
    "dealNotes",
    {
      pagination: { page: 1, perPage },
      sort: { field: "date", order: "DESC" },
      filter: baseFilter,
    },
    { enabled: listEnabled, retry: false },
  );

  const mergedNotes = useMemo(() => {
    const notes: UnifiedNote[] = [];
    (contactNotes ?? []).forEach((n) => notes.push({ ...n, _noteType: "contact" }));
    (dealNotes ?? []).forEach((n) => notes.push({ ...n, _noteType: "deal" }));

    notes.sort((a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf());
    return notes;
  }, [contactNotes, dealNotes]);

  const isPending = contactNotesPending && dealNotesPending;
  const hasError = !!contactNotesError && !!dealNotesError;

  const combinedTotal = (contactNotesTotal ?? 0) + (dealNotesTotal ?? 0);
  const canLoadMore = combinedTotal > 0 && mergedNotes.length < combinedTotal;

  return (
    <div className="flex flex-col w-full lg:h-[calc(100vh-8rem)] h-auto -mx-4 -mt-4 p-6 gap-4 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 pb-2">
        <div className="flex items-center gap-3">
          <FileText className="text-muted-foreground w-6 h-6" />
          <h1 className="text-2xl font-semibold text-foreground">Notes</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs value={tab} onValueChange={(v) => setTab(v as NotesTab)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="mentions">Mentions</TabsTrigger>
            <TabsTrigger value="authored">Authored</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex-shrink-0 w-full sm:max-w-md">
          <div className="flex flex-grow relative">
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-8"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Feed */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2.5 px-4 pt-3 border-b border-border/50">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {tab === "all" ? "All notes" : tab === "mentions" ? "Mentions" : "Authored"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {hasError ? (
            <div className="text-sm text-destructive">
              Unable to load notes right now.
            </div>
          ) : isPending ? (
            <div className="text-sm text-muted-foreground">Loading notes…</div>
          ) : mergedNotes.length > 0 ? (
            <div className="space-y-4">
              {mergedNotes.map((note, index) => {
                const resource = note._noteType === "contact" ? "contactNotes" : "dealNotes";

                const context =
                  note._noteType === "contact" ? (
                    <ReferenceField
                      record={note}
                      source="contact_id"
                      reference="contacts"
                      link="show"
                    >
                      <WithRecord
                        render={(contact: Contact) => (
                          <span className="font-medium text-foreground">
                            {`${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() ||
                              `Lead #${contact.id}`}
                          </span>
                        )}
                      />
                    </ReferenceField>
                  ) : (
                    <ReferenceField
                      record={note}
                      source="deal_id"
                      reference="lead-journey"
                      link="show"
                    >
                      <WithRecord
                        render={(deal: Deal) => (
                          <span className="font-medium text-foreground">
                            {deal.name ||
                              `${deal.first_name ?? ""} ${deal.last_name ?? ""}`.trim() ||
                              `Deal #${deal.id}`}
                          </span>
                        )}
                      />
                    </ReferenceField>
                  );

                return (
                  <div key={`${resource}-${note.id}`} className="space-y-2">
                    <ResourceContextProvider value={resource}>
                      <Note
                        note={note}
                        isLast={index === mergedNotes.length - 1}
                        context={context}
                      />
                    </ResourceContextProvider>
                  </div>
                );
              })}

              {canLoadMore && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
                    onClick={() => setPerPage((p) => p + 50)}
                  >
                    Load more
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No notes yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

NotesPage.path = "/notes";


