import { Plus } from "lucide-react";
import {
  CreateBase,
  Form,
  useGetIdentity,
  useNotify,
  useRecordContext,
  useUpdate,
  useRefresh,
} from "ra-core";
import { useState } from "react";
import { ReferenceInput } from "@/components/admin/reference-input";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { TextInput } from "@/components/admin/text-input";
import { NumberInput } from "@/components/admin/number-input";
import { SelectInput } from "@/components/admin/select-input";
import { SaveButton } from "@/components/admin/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { required } from "ra-core";

import type { Quote } from "../types";

const quoteStatuses = [
  { id: "Draft", name: "Draft" },
  { id: "Sent", name: "Sent" },
  { id: "Accepted", name: "Accepted" },
  { id: "Rejected", name: "Rejected" },
];

export const AddQuote = () => {
  const { identity } = useGetIdentity();
  const contact = useRecordContext();
  const [update] = useUpdate();
  const notify = useNotify();
  const refresh = useRefresh();
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleSuccess = async (data: Quote) => {
    setOpen(false);
    if (contact?.id) {
      await update("contacts", {
        id: contact.id,
        data: { last_seen: new Date().toISOString() },
        previousData: contact,
      });
    }
    notify("Quote added");
    refresh();
  };

  if (!identity || !contact) return null;

  return (
    <>
      <div className="my-2">
        <Button
          variant="outline"
          className="h-6 cursor-pointer"
          onClick={handleOpen}
          size="sm"
        >
          <Plus className="w-4 h-4" />
          Add quote
        </Button>
      </div>

      <CreateBase
        resource="quotes"
        record={{
          contact_id: contact.id,
          amount: 0,
          status: "Draft",
          sales_id: identity.id,
        }}
        mutationOptions={{ onSuccess: handleSuccess }}
      >
        <Dialog open={open} onOpenChange={(open) => !open && setOpen(false)}>
          <DialogContent className="lg:max-w-xl overflow-y-auto max-h-9/10 top-1/20 translate-y-0">
            <Form className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>Create New Quote</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <ReferenceInput
                    source="service_id"
                    reference="services"
                  >
                    <AutocompleteInput
                      label="Service Type"
                      optionText="name"
                      helperText={false}
                      validate={required()}
                    />
                  </ReferenceInput>
                  <SelectInput
                    source="status"
                    choices={quoteStatuses}
                    helperText={false}
                    defaultValue="Draft"
                  />
                </div>
                <TextInput
                  source="description"
                  label="Description"
                  multiline
                  rows={4}
                  helperText={false}
                  placeholder="Describe the service details..."
                />
                <NumberInput
                  source="amount"
                  label="Amount"
                  helperText={false}
                  defaultValue={0}
                  validate={required()}
                />
              </div>
              <DialogFooter className="w-full justify-end">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  type="button"
                >
                  Cancel
                </Button>
                <SaveButton label="Create Quote" />
              </DialogFooter>
            </Form>
          </DialogContent>
        </Dialog>
      </CreateBase>
    </>
  );
};

