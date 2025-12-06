import { useListContext } from "ra-core";

import { Note } from "./Note";
import { NoteCreate } from "./NoteCreate";

export const NotesIterator = ({
  reference,
  showStatus,
}: {
  reference: "contacts" | "lead-journey";
  showStatus?: boolean;
}) => {
  const { data, error, isPending } = useListContext();
  return (
    <div className="space-y-3">
      <NoteCreate reference={reference} showStatus={showStatus} />
      {error ? (
        <div className="text-sm text-destructive">
          Unable to load notes. You can still add a new note above.
        </div>
      ) : isPending ? (
        <div className="text-sm text-muted-foreground">Loading notes…</div>
      ) : data && data.length > 0 ? (
        <div className="space-y-2">
          {data.map((note, index) => (
            <Note
              note={note}
              isLast={index === data.length - 1}
              key={index}
              showStatus={showStatus}
            />
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No notes yet.</div>
      )}
    </div>
  );
};
