import { required } from "ra-core";
import { ReferenceInput } from "@/components/admin/reference-input";
import { TextInput } from "@/components/admin/text-input";
import { SelectInput } from "@/components/admin/select-input";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";

import { contactOptionText } from "../misc/ContactOption";
import { useConfigurationContext } from "../root/ConfigurationContext";

export const DealInputs = () => {
  return (
    <div className="flex flex-col gap-8">
      <DealInfoInputs />
      <LeadReferenceInput />
      <StageInput />
    </div>
  );
};

const DealInfoInputs = () => {
  return (
    <div className="flex flex-col gap-4 flex-1">
      <div className="grid grid-cols-2 gap-4">
        <TextInput
          source="first_name"
          label="First Name"
          helperText={false}
        />
        <TextInput
          source="last_name"
          label="Last Name"
          helperText={false}
        />
      </div>
    </div>
  );
};

const LeadReferenceInput = () => {
  return (
    <div className="flex flex-col gap-4 flex-1">
      <h3 className="text-base font-medium">Linked to Lead</h3>
      <ReferenceInput source="lead_id" reference="contacts">
        <AutocompleteInput 
          label="Lead"
          optionText={contactOptionText}
          validate={required()} 
        />
      </ReferenceInput>
    </div>
  );
};

const StageInput = () => {
  const { leadStages } = useConfigurationContext();
  return (
    <div className="flex flex-col gap-4 flex-1">
      <h3 className="text-base font-medium">Stage</h3>
      <SelectInput
        source="stage"
        choices={leadStages.map((stage) => ({
          id: stage.value,
          name: stage.label,
        }))}
        defaultValue="new"
        helperText={false}
        validate={required()}
      />
    </div>
  );
};
