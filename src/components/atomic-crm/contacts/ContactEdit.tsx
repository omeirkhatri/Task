import { EditBase, Form, useEditContext } from "ra-core";
import { FormToolbar } from "@/components/admin/simple-form";

import type { Contact } from "../types";
import { ContactAside } from "./ContactAside";
import { LeadInputs } from "./LeadInputs";

export const ContactEdit = () => (
  <EditBase
    redirect="show"
    transform={(data: Contact) => {
      // Split full name back into first_name and last_name before saving
      if (data.first_name) {
        const parts = data.first_name.trim().split(/\s+/);
        data.first_name = parts[0] || "";
        data.last_name = parts.slice(1).join(" ") || "";
      }
      return data;
    }}
  >
    <ContactEditContent />
  </EditBase>
);

const ContactEditContent = () => {
  const { isPending, record } = useEditContext<Contact>();
  if (isPending || !record) return null;
  
  // Combine first_name and last_name for the form's default value
  const fullName = record.first_name && record.last_name
    ? `${record.first_name} ${record.last_name}`.trim()
    : record.first_name || "";
  
  return (
    <div className="mt-2 flex justify-center">
      <div className="w-[90%] max-w-6xl flex gap-8">
        <div className="flex-1">
          <Form 
            className="flex flex-1 flex-col gap-6"
            defaultValues={{
              ...record,
              first_name: fullName,
            }}
          >
            <LeadInputs />
            <div className="flex justify-end pt-4 border-t">
              <FormToolbar />
            </div>
          </Form>
        </div>
        <ContactAside link="show" />
      </div>
    </div>
  );
};
