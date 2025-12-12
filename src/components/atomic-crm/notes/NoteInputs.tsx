import { Fragment, useState } from "react";
import { useFormContext } from "react-hook-form";
import { SelectInput } from "@/components/admin/select-input";
import { DateTimeInput } from "@/components/admin/date-time-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useInput, useResourceContext, FieldTitle } from "ra-core";
import {
  FormControl,
  FormError,
  FormField,
  FormLabel,
} from "@/components/admin/form";
import { InputHelperText } from "@/components/admin/input-helper-text";

import { Status } from "../misc/Status";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { getCurrentDate } from "./utils";
import { SmartTextInput } from "../misc/SmartTextInput";

export const NoteInputs = ({ showStatus }: { showStatus?: boolean }) => {
  const { noteStatuses } = useConfigurationContext();
  const { setValue } = useFormContext();
  const [displayMore, setDisplayMore] = useState(false);
  const resource = useResourceContext();
  const { id, field } = useInput({ source: "text" });

  const handleUsersTagged = (userIds: number[]) => {
    // Update the tagged_user_ids field when users are tagged
    setValue("tagged_user_ids", userIds.length > 0 ? userIds : undefined, { shouldDirty: true });
  };

  return (
    <Fragment>
      <FormField id={id} className="m-0" name={field.name}>
        <FormControl>
          <SmartTextInput
            value={field.value || ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            multiline
            placeholder="Add a note. Try tagging someone with @username"
            rows={6}
            onUsersTagged={handleUsersTagged}
          />
        </FormControl>
        <InputHelperText helperText={false} />
        <FormError />
      </FormField>

      {!displayMore && (
        <div className="flex justify-end items-center gap-2">
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setDisplayMore(!displayMore);
              setValue("date", getCurrentDate());
            }}
            className="text-sm text-muted-foreground underline hover:no-underline p-0 h-auto cursor-pointer"
          >
            Show options
          </Button>
          <span className="text-sm text-muted-foreground">
            (change details)
          </span>
        </div>
      )}

      <div
        className={cn(
          "space-y-3 mt-3 overflow-hidden transition-transform ease-in-out duration-300 origin-top",
          !displayMore ? "scale-y-0 max-h-0 h-0" : "scale-y-100",
        )}
      >
        <div className="grid grid-cols-2 gap-4">
          {showStatus && (
            <SelectInput
              source="status"
              choices={noteStatuses.map((status) => ({
                id: status.value,
                name: status.label,
                value: status.value,
              }))}
              optionText={optionRenderer}
              defaultValue={"warm"}
              helperText={false}
            />
          )}
          <DateTimeInput
            source="date"
            label="Date"
            helperText={false}
            className="text-primary"
            defaultValue={getCurrentDate()}
          />
        </div>
      </div>
    </Fragment>
  );
};

const optionRenderer = (choice: any) => {
  return (
    <div>
      <Status status={choice.value} /> {choice.name}
    </div>
  );
};
