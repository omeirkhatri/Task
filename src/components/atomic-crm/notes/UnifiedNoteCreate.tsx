import {
  CreateBase,
  Form,
  useGetIdentity,
  useNotify,
  useRecordContext,
  useUpdate,
  type Identifier,
  type RaRecord,
} from "ra-core";
import { useFormContext } from "react-hook-form";
import { SaveButton } from "@/components/admin/form";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

import { NoteInputs } from "./NoteInputs";
import { formatNoteDate, getCurrentDate } from "./utils";

const foreignKeyMapping = {
  contacts: "contact_id",
  "lead-journey": "deal_id",
};

export const UnifiedNoteCreate = ({
  reference,
  showStatus,
  className,
  onSuccess: onSuccessCallback,
  contactId,
  dealId,
}: {
  reference: "contacts" | "lead-journey";
  showStatus?: boolean;
  className?: string;
  onSuccess?: () => void;
  contactId?: string | number;
  dealId?: string | number;
}) => {
  const record = useRecordContext();
  const { identity } = useGetIdentity();

  if (!record) return null;

  // Determine which resource to use for creating notes
  const noteResource = reference === "contacts" ? "contactNotes" : "dealNotes";
  const recordId = reference === "contacts" ? (contactId || record.id) : (dealId || record.id);

  return (
    <Card className="bg-muted/30 py-3">
      <CardContent className="pt-0 px-4 pb-0">
        <CreateBase resource={noteResource} redirect={false}>
          <Form>
            <div className={className}>
              <NoteInputs showStatus={showStatus} />
              <UnifiedNoteCreateButton 
                reference={reference} 
                record={record}
                recordId={recordId}
                onSuccess={onSuccessCallback}
              />
            </div>
          </Form>
        </CreateBase>
      </CardContent>
    </Card>
  );
};

const UnifiedNoteCreateButton = ({
  reference,
  record,
  recordId,
  onSuccess: onSuccessCallback,
}: {
  reference: "contacts" | "lead-journey";
  record: RaRecord<Identifier>;
  recordId?: string | number;
  onSuccess?: () => void;
}) => {
  const [update] = useUpdate();
  const notify = useNotify();
  const { identity } = useGetIdentity();
  const { reset } = useFormContext();

  if (!record) return null;

  const resetValues: {
    date: string;
    text: null;
    attachments: null;
    status?: string;
  } = {
    date: getCurrentDate(),
    text: null,
    attachments: null,
  };

  if (reference === "contacts") {
    resetValues.status = "warm";
  }

  const handleSuccess = async (data: any) => {
    reset(resetValues, { keepValues: false });
    // Update contact last_seen first
    await update(reference, {
      id: (record && record.id) as unknown as Identifier,
      data: { last_seen: new Date().toISOString(), status: data.status },
      previousData: record,
    });
    notify("Note added");
    // Call the refetch callback after update completes to ensure data is synced
    if (onSuccessCallback) {
      onSuccessCallback();
    }
  };

  return (
    <div className="flex justify-end">
      <SaveButton
        type="button"
        label="Add this note"
        transform={(data) => ({
          ...data,
          [foreignKeyMapping[reference]]: recordId || record.id,
          sales_id: identity?.id,
          date: formatNoteDate(data.date || getCurrentDate()),
        })}
        mutationOptions={{
          onSuccess: handleSuccess,
        }}
      >
        Add this note
      </SaveButton>
    </div>
  );
};

