import { EditBase, Form, required, useNotify, type Identifier } from "ra-core";
import { DeleteButton } from "@/components/admin/delete-button";
import { TextInput } from "@/components/admin/text-input";
import { DateInput } from "@/components/admin/date-input";
import { SelectInput } from "@/components/admin/select-input";
import { SaveButton } from "@/components/admin/form";
import { ReferenceArrayInput } from "@/components/admin/reference-array-input";
import { AutocompleteArrayInput } from "@/components/admin/autocomplete-array-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Sale } from "../types";

export const TaskEdit = ({
  open,
  close,
  taskId,
}: {
  taskId: Identifier;
  open: boolean;
  close: () => void;
}) => {
  const { taskTypes } = useConfigurationContext();
  const notify = useNotify();
  return (
    <Dialog open={open} onOpenChange={close}>
      {taskId && (
        <EditBase
          id={taskId}
          resource="tasks"
          className="mt-0"
          mutationOptions={{
            onSuccess: () => {
              close();
              notify("Task updated", {
                type: "info",
                undoable: true,
              });
            },
          }}
          redirect={false}
        >
          <DialogContent className="lg:max-w-xl overflow-y-auto max-h-9/10 top-1/20 translate-y-0">
            <Form className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>Edit task</DialogTitle>
                <DialogDescription className="sr-only">
                  Edit task details including description, due date, type, and tagged users.
                </DialogDescription>
              </DialogHeader>
              <TextInput
                autoFocus
                source="text"
                label="Description"
                validate={required()}
                multiline
                helperText={false}
              />
              <div className="grid grid-cols-2 gap-4">
                <DateInput
                  source="due_date"
                  helperText={false}
                  validate={required()}
                />
                <SelectInput
                  source="type"
                  choices={taskTypes.map((type) => ({
                    id: type,
                    name: type,
                  }))}
                  helperText={false}
                  validate={required()}
                />
              </div>
              <ReferenceArrayInput
                source="tagged_user_ids"
                reference="sales"
                filter={{ "disabled@neq": true }}
                sort={{ field: "last_name", order: "ASC" }}
              >
                <AutocompleteArrayInput
                  label="Tag users"
                  helperText={false}
                  optionText={(choice: Sale) => `${choice.first_name} ${choice.last_name}`}
                  placeholder="Search users to tag..."
                />
              </ReferenceArrayInput>
              <DialogFooter className="w-full sm:justify-between gap-4">
                <DeleteButton
                  mutationOptions={{
                    onSuccess: () => {
                      close();
                      notify("Task deleted", {
                        type: "info",
                        undoable: true,
                      });
                    },
                  }}
                  redirect={false}
                />
                <SaveButton label="Save" />
              </DialogFooter>
            </Form>
          </DialogContent>
        </EditBase>
      )}
    </Dialog>
  );
};
