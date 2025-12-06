import {
  useGetList,
  ResourceContextProvider,
  useRecordContext,
} from "ra-core";
import { useMemo } from "react";

import type { ContactNote, DealNote } from "../types";
import { Note } from "./Note";
import { UnifiedNoteCreate } from "./UnifiedNoteCreate";

export const UnifiedNotesIterator = ({
  reference,
  showStatus,
  contactId,
  dealId,
  dealIds,
  leadId,
}: {
  reference: "contacts" | "lead-journey";
  showStatus?: boolean;
  contactId?: string | number;
  dealId?: string | number;
  dealIds?: (string | number)[]; // Support multiple deal IDs
  leadId?: string | number;
}) => {
  // Fetch contact notes if we have a contactId or leadId
  const contactNotesId = contactId || leadId;
  // Support both camelCase and snake_case table names (legacy vs new)
  const {
    data: contactNotesCamel,
    isPending: contactNotesPendingCamel,
    error: contactNotesErrorCamel,
    refetch: refetchContactNotesCamel,
  } = useGetList<ContactNote>(
    "contactNotes",
    {
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "date", order: "DESC" },
      filter: contactNotesId ? { contact_id: contactNotesId } : {},
    },
    {
      enabled: !!contactNotesId,
      retry: false,
    },
  );
  const {
    data: contactNotesSnake,
    isPending: contactNotesPendingSnake,
    error: contactNotesErrorSnake,
    refetch: refetchContactNotesSnake,
  } = useGetList<ContactNote>(
    "contact_notes",
    {
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "date", order: "DESC" },
      filter: contactNotesId ? { contact_id: contactNotesId } : {},
    },
    {
      enabled: !!contactNotesId,
      retry: false,
    },
  );

  // Use dealIds array if provided, otherwise fall back to single dealId
  const dealIdsToFetch = dealIds && dealIds.length > 0 ? dealIds : (dealId ? [dealId] : []);
  
  // Fetch deal notes for all deals
  const {
    data: dealNotesCamel,
    isPending: dealNotesPendingCamel,
    error: dealNotesErrorCamel,
    refetch: refetchDealNotesCamel,
  } = useGetList<DealNote>(
    "dealNotes",
    {
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "date", order: "DESC" },
      filter:
        dealIdsToFetch.length > 0
          ? { "deal_id@in": `(${dealIdsToFetch.join(",")})` }
          : { deal_id: -1 }, // Use -1 to return empty if no deals
    },
    {
      enabled: dealIdsToFetch.length > 0,
      retry: false,
    },
  );
  const {
    data: dealNotesSnake,
    isPending: dealNotesPendingSnake,
    error: dealNotesErrorSnake,
    refetch: refetchDealNotesSnake,
  } = useGetList<DealNote>(
    "deal_notes",
    {
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "date", order: "DESC" },
      filter:
        dealIdsToFetch.length > 0
          ? { "deal_id@in": `(${dealIdsToFetch.join(",")})` }
          : { deal_id: -1 },
    },
    {
      enabled: dealIdsToFetch.length > 0,
      retry: false,
    },
  );

  const contactNotes =
    (contactNotesCamel && contactNotesCamel.length > 0
      ? contactNotesCamel
      : contactNotesSnake) || [];
  const dealNotes =
    (dealNotesCamel && dealNotesCamel.length > 0 ? dealNotesCamel : dealNotesSnake) ||
    [];

  // Only pending if both variants are pending; this prevents one failing call
  // from keeping the loader spinning forever.
  const contactNotesPending = contactNotesPendingCamel && contactNotesPendingSnake;
  const dealNotesPending = dealNotesPendingCamel && dealNotesPendingSnake;

  const contactNotesErrorState =
    contactNotesErrorCamel || contactNotesErrorSnake || null;
  const dealNotesErrorState = dealNotesErrorCamel || dealNotesErrorSnake || null;

  // Merge and sort all notes by date
  const allNotes = useMemo(() => {
    const notes: Array<ContactNote | DealNote & { _noteType: "contact" | "deal" }> =
      [];

    if (contactNotes) {
      contactNotes.forEach((note) => {
        notes.push({ ...note, _noteType: "contact" } as any);
      });
    }

    if (dealNotes) {
      dealNotes.forEach((note) => {
        notes.push({ ...note, _noteType: "deal" } as any);
      });
    }

    // Sort by date descending
    return notes.sort(
      (a, b) =>
        new Date(b.date).valueOf() - new Date(a.date).valueOf(),
    );
  }, [contactNotes, dealNotes]);

  const hasNotes = allNotes.length > 0;
  // Show an error banner only if both variants fail; otherwise show what we have
  const hasError = contactNotesErrorState && dealNotesErrorState;

  // Get the record from context (set by parent ShowBase)
  const record = useRecordContext();

  const handleRefetch = () => {
    if (contactNotesId) {
      refetchContactNotesCamel();
      refetchContactNotesSnake();
    }
    if (dealIdsToFetch.length > 0) {
      refetchDealNotesCamel();
      refetchDealNotesSnake();
    }
  };

  return (
    <div className="space-y-3">
      <UnifiedNoteCreate 
        reference={reference} 
        showStatus={showStatus}
        onSuccess={handleRefetch}
        contactId={contactNotesId}
        dealId={dealIdsToFetch.length > 0 ? dealIdsToFetch[0] : dealId}
      />
      {hasError && (
        <div className="text-sm text-destructive">
          Unable to load notes. You can still add a new note above.
        </div>
      )}
      {hasNotes ? (
        <div className="space-y-2">
          {allNotes.map((note, index) => {
            const noteType = (note as any)._noteType || (reference === "contacts" ? "contact" : "deal");
            const resource = noteType === "contact" ? "contactNotes" : "dealNotes";
            
            return (
              <ResourceContextProvider key={`${resource}-${note.id}`} value={resource}>
                <Note
                  note={note}
                  isLast={index === allNotes.length - 1}
                  showStatus={showStatus}
                />
              </ResourceContextProvider>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No notes yet.</div>
      )}
    </div>
  );
};

