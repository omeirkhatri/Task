import { email, required } from "ra-core";
import { ArrayInput } from "@/components/admin/array-input";
import { BooleanInput } from "@/components/admin/boolean-input";
import { SimpleFormIterator } from "@/components/admin/simple-form-iterator";
import { TextInput } from "@/components/admin/text-input";
import { RadioButtonGroupInput } from "@/components/admin/radio-button-group-input";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { useFormContext } from "react-hook-form";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInput, FieldTitle, useResourceContext } from "ra-core";
import {
  FormControl,
  FormField,
  FormLabel,
} from "@/components/admin/form";
import { Input } from "@/components/ui/input";
import { InputHelperText } from "@/components/admin/input-helper-text";
import { FormError } from "@/components/admin/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const LeadInputs = () => {
  return (
    <div className="flex flex-col gap-6">
      <BasicInformation />
      <AddressInformation />
    </div>
  );
};

const BasicInformation = () => {
  const { contactGender } = useConfigurationContext();
  // Filter to only show male and female options for the toggle
  const genderOptions = contactGender.filter(g => g.value === "male" || g.value === "female");
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
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

        <div className="space-y-4">
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
        </div>

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
      </CardContent>
    </Card>
  );
};

// Custom Coordinates Input Component
const CoordinatesInput = () => {
  const resource = useResourceContext();
  const { watch, setValue } = useFormContext();
  const latitude = watch("latitude");
  const longitude = watch("longitude");
  const { field, id, isRequired } = useInput({
    source: "coordinates",
    validate: required(),
  });

  // Format coordinates for display - prioritize lat/lng from form, fallback to field value
  const displayValue =
    latitude != null && longitude != null
      ? `${latitude}, ${longitude}`
      : field.value || "";

  // Parse coordinates from "lat, lng" format and update latitude/longitude
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    field.onChange(value);

    const parts = value.split(",").map((s) => s.trim());
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        setValue("latitude", lat, { shouldDirty: true });
        setValue("longitude", lng, { shouldDirty: true });
      }
    }
  };

  return (
    <FormField id={id} name={field.name}>
      <FormLabel>
        <FieldTitle
          label="Coordinates (Latitude, Longitude)"
          source="coordinates"
          resource={resource}
          isRequired={isRequired}
        />
      </FormLabel>
      <FormControl>
        <Input
          name={field.name}
          onBlur={field.onBlur}
          value={displayValue}
          onChange={handleChange}
          placeholder="25.157134, 55.409436"
        />
      </FormControl>
      <InputHelperText helperText={false} />
      <FormError />
    </FormField>
  );
};

const AddressInformation = () => {
  const { watch, setValue } = useFormContext();
  const latitude = watch("latitude");
  const longitude = watch("longitude");

  // Generate Google Maps link from coordinates
  const generateGoogleMapsLink = () => {
    if (latitude != null && longitude != null) {
      const link = `https://www.google.com/maps?q=${latitude},${longitude}`;
      setValue("google_maps_link", link, { shouldDirty: true });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Address Information</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {/* Two-column layout for Flat/Villa Number and Building/Street */}
        <div className="grid grid-cols-2 gap-4">
          <TextInput
            source="flat_villa_number"
            label="Flat/Villa Number"
            helperText={false}
            validate={required()}
            placeholder="e.g., Villa 123"
          />
          <TextInput
            source="building_street"
            label="Building/Street"
            helperText={false}
            validate={required()}
            placeholder="e.g., Sheikh Zayed Road"
          />
        </div>

        {/* Two-column layout for Area and City */}
        <div className="grid grid-cols-2 gap-4">
          <TextInput
            source="area"
            label="Area"
            helperText={false}
            validate={required()}
            placeholder="e.g., Dubai Marina"
          />
          <TextInput
            source="city"
            label="City"
            helperText={false}
            validate={required()}
            placeholder="e.g., Dubai"
          />
        </div>

        {/* Google Maps Link with button */}
        <div className="flex flex-col gap-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <TextInput
                source="google_maps_link"
                label="Google Maps Link"
                helperText={false}
                placeholder="https://maps.google.com/..."
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={generateGoogleMapsLink}
              disabled={latitude == null || longitude == null}
              className="h-9 w-9 shrink-0 mb-0.5"
              title="Generate Google Maps link from coordinates"
            >
              <MapPin className="h-4 w-4 text-red-500" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground px-1">
            Enter coordinates below and click the location icon to create a Google Maps link
          </p>
        </div>

        {/* Coordinates field */}
        <div className="flex flex-col gap-2">
          <CoordinatesInput />
          <p className="text-xs text-muted-foreground px-1">
            Enter coordinates manually in the field below
          </p>
        </div>
      </CardContent>
    </Card>
  );
};


