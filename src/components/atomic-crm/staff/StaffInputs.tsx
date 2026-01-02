import { TextInput } from "@/components/admin/text-input";
import { SelectInput } from "@/components/admin/select-input";

const staffTypeOptions = [
  { id: "Doctor", name: "Doctor" },
  { id: "Nurse", name: "Nurse" },
  { id: "Physiotherapist", name: "Physiotherapist" },
  { id: "Caregiver", name: "Caregiver" },
  { id: "Management", name: "Management" },
  { id: "Driver", name: "Driver" },
];

export const StaffInputs = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput
          source="first_name"
          label="First Name"
          required
          fullWidth
        />
        <TextInput
          source="last_name"
          label="Last Name"
          required
          fullWidth
        />
      </div>

      <SelectInput
        source="staff_type"
        label="Staff Type"
        choices={staffTypeOptions}
        optionText="name"
        optionValue="id"
        required
        fullWidth
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput
          source="phone"
          label="Phone"
          required
          fullWidth
          helperText="Include country code (e.g., +971501234567)"
        />
        <TextInput
          source="email"
          label="Email"
          fullWidth
          type="email"
        />
      </div>
    </div>
  );
};

