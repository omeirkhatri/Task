import { required } from "ra-core";
import { TextInput } from "@/components/admin/text-input";

export const ServiceInputs = () => {
  return (
    <div className="flex flex-col gap-4">
      <TextInput
        source="name"
        label="Service name"
        validate={required()}
        helperText={false}
      />
    </div>
  );
};

