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
    text: null;
    attachments: null;
    tagged_user_ids?: undefined;
  } = {
    text: null,
    attachments: null,
    tagged_user_ids: undefined,
  };

  const handleSuccess = (data: any) => {
    reset(resetValues, { keepValues: false });
    refetch();
    update(reference, {
      id: (record && record.id) as unknown as Identifier,
      data: { last_seen: new Date().toISOString() },
      previousData: record,
    });
    notify("Note added");
  };

  return (
    <div className="flex justify-end">
      <SaveButton
        type="button"
        label="Add this note"
        transform={(data) => {
          const { tagged_user_ids, ...restData } = data;
          const result: any = {
            ...restData,
            [foreignKeyMapping[reference]]: record.id,
            sales_id: identity?.id,
            // Always save notes with current time
            date: new Date().toISOString(),
          };
          // Only include tagged_user_ids if it's a non-empty array
          // This avoids schema cache issues if the column doesn't exist yet
          if (Array.isArray(tagged_user_ids) && tagged_user_ids.length > 0) {
            result.tagged_user_ids = tagged_user_ids;
          }
          return result;
        }}
        mutationOptions={{
          onSuccess: handleSuccess,
        }}
      >
        Add this note
      </SaveButton>
    </div>
  );
};
