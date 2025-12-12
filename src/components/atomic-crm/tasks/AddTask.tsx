import { Plus } from "lucide-react";
import {
  CreateBase,
  Form,
  RecordRepresentation,
  required,
  useDataProvider,
  useGetIdentity,
  useNotify,
  useRecordContext,
  useUpdate,
} from "ra-core";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useFormContext } from "react-hook-form";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { ReferenceArrayInput } from "@/components/admin/reference-array-input";
import { AutocompleteArrayInput } from "@/components/admin/autocomplete-array-input";
import { DateInput } from "@/components/admin/date-input";
import { SelectInput } from "@/components/admin/select-input";
import { SaveButton } from "@/components/admin/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FormControl,
  FormError,
  FormField,
  FormLabel,
} from "@/components/admin/form";
import { FieldTitle, useInput, useResourceContext } from "ra-core";
import { InputHelperText } from "@/components/admin/input-helper-text";

import { contactOptionText } from "../misc/ContactOption";
import { useConfigurationContext } from "../root/ConfigurationContext";
import {
  crmDateInputString,
  crmDateStringToISO,
  crmStartOfDay,
} from "../misc/timezone";
import { SmartTextInput } from "../misc/SmartTextInput";
import type { Sale } from "../types";

export const AddTask = ({
  selectContact,
  display = "chip",
}: {
  selectContact?: boolean;
  display?: "chip" | "icon";
}) => {
  const { identity } = useGetIdentity();
  const dataProvider = useDataProvider();
  const [update] = useUpdate();
  const notify = useNotify();
  const { taskTypes } = useConfigurationContext();
  const contact = useRecordContext();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const handleOpen = () => {
    setOpen(true);
  };

  const handleSuccess = async (data: any) => {
    setOpen(false);
    const contact = await dataProvider.getOne("contacts", {
      id: data.contact_id,
    });
    if (!contact.data) return;

    await update("contacts", {
      id: contact.data.id,
      data: { last_seen: new Date().toISOString() },
      previousData: contact.data,
    });

    // Refresh activity log so the new task shows immediately (any scope)
    queryClient.invalidateQueries({
      predicate: ({ queryKey }) =>
        Array.isArray(queryKey) && queryKey[0] === "activityLog",
    });
    notify("Task added");
  };

  if (!identity) return null;

  return (
    <>
      {display === "icon" ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="p-2 cursor-pointer"
                onClick={handleOpen}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create task</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <div className="my-2">
          <Button
            variant="outline"
            className="h-6 cursor-pointer"
            onClick={handleOpen}
            size="sm"
          >
            <Plus className="w-4 h-4" />
            Add task
          </Button>
        </div>
      )}

      <CreateBase
        resource="tasks"
        record={{
          type: "None",
          contact_id: contact?.id,
          due_date: crmDateInputString() || new Date().toISOString().slice(0, 10),
          sales_id: identity.id,
          // Explicitly omit tagged_user_ids from initial record to avoid schema cache issues
        }}
        transform={(data) => {
          const dueDateIso =
            crmDateStringToISO(data.due_date) ||
            crmStartOfDay()?.toISOString() ||
            data.due_date;
          
          // Build result object excluding problematic fields
          const result: any = {
            type: data.type,
            contact_id: data.contact_id,
            text: data.text,
            due_date: dueDateIso,
            sales_id: data.sales_id,
          };
          
          // Only include tagged_user_ids if it's a valid non-empty array
          // This avoids schema cache issues if the column doesn't exist in Supabase's cache yet
          if (Array.isArray(data.tagged_user_ids) && data.tagged_user_ids.length > 0) {
            result.tagged_user_ids = data.tagged_user_ids;
          }
          
          // Explicitly do NOT include created_at or any other fields that might cause issues
          return result;
        }}
        mutationOptions={{ onSuccess: handleSuccess }}
      >
        <Dialog open={open} onOpenChange={() => setOpen(false)}>
          <DialogContent className="lg:max-w-xl overflow-y-auto max-h-9/10 top-1/20 translate-y-0">
            <Form className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>
                  {!selectContact
                    ? "Create a new task for "
                    : "Create a new task"}
                  {!selectContact && contact && 
                   (() => {
                     const firstName = contact.first_name?.trim();
                     const lastName = contact.last_name?.trim();
                     const validFirstName = firstName && firstName !== "null" && firstName !== "";
                     const validLastName = lastName && lastName !== "null" && lastName !== "";
                     
                     if (validFirstName || validLastName) {
                       const nameParts = [validFirstName ? firstName : null, validLastName ? lastName : null]
                         .filter(Boolean)
                         .join(" ");
                       return nameParts || "this contact";
                     }
                     return "this contact";
                   })()}
                </DialogTitle>
                <DialogDescription>
                  Add a new task with a description, due date, type, and optionally tag users.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <TaskDescriptionInput />
                {selectContact && (
                  <ReferenceInput
                    source="contact_id"
                    reference="contacts_summary"
                  >
                    <AutocompleteInput
                      label="Contact"
                      optionText={contactOptionText}
                      helperText={false}
                      validate={required()}
                    />
                  </ReferenceInput>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <DateInput
                    source="due_date"
                    helperText={false}
                    validate={required()}
                  />
                  <SelectInput
                    source="type"
                    validate={required()}
                    choices={taskTypes.map((type) => ({
                      id: type,
                      name: type,
                    }))}
                    helperText={false}
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
              </div>
              <DialogFooter className="w-full justify-end">
                <SaveButton />
              </DialogFooter>
            </Form>
          </DialogContent>
        </Dialog>
      </CreateBase>
    </>
  );
};

// Component that wraps SmartTextInput with form integration
const TaskDescriptionInput = () => {
  const resource = useResourceContext();
  const { id, field, isRequired } = useInput({
    source: "text",
    validate: required(),
  });
  const { setValue } = useFormContext();

  const handleDateDetected = (date: string) => {
    // Update the due_date field when a date is detected
    try {
      const dateObj = new Date(date);
      if (!isNaN(dateObj.getTime())) {
        const dateStr = crmDateInputString(dateObj);
        if (dateStr) {
          setValue("due_date", dateStr, { shouldDirty: true, shouldValidate: false });
        }
      }
    } catch (error) {
      console.error("Error parsing date:", error);
    }
  };

  const handleUsersTagged = (userIds: number[]) => {
    // Update the tagged_user_ids field when users are tagged
    setValue("tagged_user_ids", userIds.length > 0 ? userIds : undefined, { shouldDirty: true });
  };

  return (
    <FormField id={id} className="m-0" name={field.name}>
      <FormLabel>
        <FieldTitle
          label="Description"
          source="text"
          resource={resource}
          isRequired={isRequired}
        />
      </FormLabel>
      <FormControl>
        <SmartTextInput
          value={field.value || ""}
          onChange={field.onChange}
          onBlur={field.onBlur}
          multiline
          placeholder="Type a task description. Try typing a date like 'tomorrow' or tag someone with @"
          className="m-0"
          onDateDetected={handleDateDetected}
          onUsersTagged={handleUsersTagged}
          autoFocus
        />
      </FormControl>
      <InputHelperText helperText={false} />
      <FormError />
    </FormField>
  );
};
