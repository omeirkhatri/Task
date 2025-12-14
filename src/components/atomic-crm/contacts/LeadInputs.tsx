import { email, required } from "ra-core";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrayInput } from "@/components/admin/array-input";
import { AutocompleteArrayInput } from "@/components/admin/autocomplete-array-input";
import { BooleanInput } from "@/components/admin/boolean-input";
import { ReferenceArrayInput } from "@/components/admin/reference-array-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { SelectInput } from "@/components/admin/select-input";
import { SimpleFormIterator } from "@/components/admin/simple-form-iterator";
import { TextInput } from "@/components/admin/text-input";
import { RadioButtonGroupInput } from "@/components/admin/radio-button-group-input";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Sale } from "../types";

export const LeadInputs = () => {
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col gap-2 p-1">
      <div className={`flex gap-6 ${isMobile ? "flex-col" : "flex-row"}`}>
        <div className="flex flex-col gap-10 flex-1">
          <BasicInformation />
          <AddressInformation />
        </div>
        <Separator
          orientation={isMobile ? "horizontal" : "vertical"}
          className="flex-shrink-0"
        />
        <div className="flex flex-col gap-10 flex-1">
          <ServicesSection />
          <AccountManagerSection />
        </div>
      </div>
    </div>
  );
};

const validateServices = (value: unknown) => {
  if (Array.isArray(value) && value.length > 0) return undefined;
  return "At least one service is required";
};

const BasicInformation = () => {
  const { contactGender } = useConfigurationContext();
  // Filter to only show male and female options for the toggle
  const genderOptions = contactGender.filter(g => g.value === "male" || g.value === "female");
  
  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">Basic Information</h6>

      <div className="grid grid-cols-2 gap-4">
        <TextInput
          source="first_name"
          label="First Name"
          validate={required()}
          helperText={false}
        />
        <TextInput
          source="last_name"
          label="Last Name"
          helperText={false}
        />
      </div>

      <RadioButtonGroupInput
        source="gender"
        label="Gender"
        choices={genderOptions}
        optionText="label"
        optionValue="value"
        helperText={false}
        row
        defaultValue={genderOptions[0]?.value}
      />

      <ArrayInput source="phone_jsonb" label="Phone Number" helperText={false}>
        <SimpleFormIterator
          inline
          disableReordering
          disableClear
          className="[&>ul>li]:border-b-0 [&>ul>li]:pb-0"
        >
          <TextInput
            source="number"
            className="w-full"
            helperText={false}
            label={false}
            placeholder="Phone number"
            validate={required()}
          />
        </SimpleFormIterator>
      </ArrayInput>

      <BooleanInput
        source="phone_has_whatsapp"
        label="Phone number has WhatsApp"
        helperText={false}
      />

      <ArrayInput source="email_jsonb" label="Email" helperText={false}>
        <SimpleFormIterator
          inline
          disableReordering
          disableClear
          className="[&>ul>li]:border-b-0 [&>ul>li]:pb-0"
        >
          <TextInput
            source="email"
            className="w-full"
            helperText={false}
            label={false}
            placeholder="Email"
            validate={email()}
          />
        </SimpleFormIterator>
      </ArrayInput>

      <TextInput
        source="description"
        label="Description"
        multiline
        rows={4}
        helperText={false}
        placeholder="Add a description about this lead"
      />
    </div>
  );
};

const AddressInformation = () => {
  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">Address Information</h6>

      <TextInput
        source="flat_villa_number"
        label="Flat/Villa Number"
        helperText={false}
      />

      <TextInput
        source="building_street"
        label="Building/Street"
        helperText={false}
      />

      <TextInput source="area" label="Area" helperText={false} />

      <TextInput
        source="google_maps_link"
        label="Google Maps Link"
        helperText={false}
      />
    </div>
  );
};

const ServicesSection = () => {
  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">Services</h6>
      <ReferenceArrayInput source="services_interested" reference="services">
        <AutocompleteArrayInput
          label="Services Interested In"
          optionText="name"
          helperText={false}
          validate={validateServices}
          minItems={1}
        />
      </ReferenceArrayInput>
    </div>
  );
};

const AccountManagerSection = () => {
  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">Account Manager</h6>
      <ReferenceInput
        reference="sales"
        source="sales_id"
        sort={{ field: "last_name", order: "ASC" }}
        filter={{ "disabled@neq": true }}
      >
        <SelectInput
          helperText={false}
          label="Account manager"
          optionText={saleOptionRenderer}
          validate={required()}
        />
      </ReferenceInput>
    </div>
  );
};

const saleOptionRenderer = (choice: Sale) =>
  `${choice.first_name} ${choice.last_name}`;

