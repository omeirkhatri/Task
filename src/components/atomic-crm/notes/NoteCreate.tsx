import {
  CreateBase,
  Form,
  useGetIdentity,
  useListContext,
  useNotify,
  useRecordContext,
  useResourceContext,
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

export const NoteCreate = ({
  reference,
  showStatus,
  className,
}: {
  reference: "contacts" | "lead-journey";
  showStatus?: boolean;
  className?: string;
}) => {
  const resource = useResourceContext();
  const record = useRecordContext();
  const { identity } = useGetIdentity();

  if (!record) return null;

  return (
    <Card className="bg-muted/30 py-3">
      <CardContent className="pt-0 px-4 pb-0">
        <CreateBase resource={resource} redirect={false}>
          <Form>
            <div className={className}>
              <NoteInputs showStatus={showStatus} />
              <NoteCreateButton reference={reference} record={record} />
            </div>
          </Form>
        </CreateBase>
      </CardContent>
    </Card>
  );
};

const NoteCreateButton = ({
  reference,
  record,
}: {
  reference: "contacts" | "lead-journey";
  record: RaRecord<Identifier>;
}) => {
  const [update] = useUpdate();
  const notify = useNotify();
  const { identity } = useGetIdentity();
  const { reset } = useFormContext();
  const { refetch } = useListContext();

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

  const handleSuccess = (data: any) => {
    reset(resetValues, { keepValues: false });
    refetch();
    update(reference, {
      id: (record && record.id) as unknown as Identifier,
      data: { last_seen: new Date().toISOString(), status: data.status },
      previousData: record,
    });
    notify("Note added");
  };

  return (
    <div className="flex justify-end">
      <SaveButton
        type="button"
        label="Add this note"
        transform={(data) => ({
          ...data,
          [foreignKeyMapping[reference]]: record.id,
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
