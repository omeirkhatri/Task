import {
  EditBase,
  Form,
  useNotify,
  useUpdate,
} from "ra-core";
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

export const QuoteEdit = ({
  quote,
  open,
  onClose,
}: {
  quote: Quote;
  open: boolean;
  onClose: () => void;
}) => {
  const notify = useNotify();

  const handleSuccess = () => {
    notify("Quote updated");
    onClose();
  };

  return (
    <EditBase
      resource="quotes"
      id={quote.id}
      mutationOptions={{ onSuccess: handleSuccess }}
    >
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="lg:max-w-xl overflow-y-auto max-h-9/10 top-1/20 translate-y-0">
          <Form className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Edit Quote</DialogTitle>
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
                validate={required()}
              />
            </div>
            <DialogFooter className="w-full justify-end">
              <Button variant="outline" onClick={onClose} type="button">
                Cancel
              </Button>
              <SaveButton label="Update Quote" />
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </EditBase>
  );
};

