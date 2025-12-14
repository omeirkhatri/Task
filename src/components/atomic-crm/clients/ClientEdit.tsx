import { Card, CardContent } from "@/components/ui/card";
import { EditBase, Form, useEditContext } from "ra-core";
import { FormToolbar } from "@/components/admin/simple-form";

import type { Contact } from "../types";
import { ClientAside } from "./ClientAside";
import { LeadInputs } from "../contacts/LeadInputs";

export const ClientEdit = () => (
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
    <ClientEditContent />
  </EditBase>
);

const ClientEditContent = () => {
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
          className="flex flex-1 flex-col gap-4"
          defaultValues={{
            ...record,
            first_name: fullName,
          }}
        >
        <Card>
          <CardContent>
              <LeadInputs />
            <FormToolbar />
          </CardContent>
        </Card>
      </Form>
        </div>
        <ClientAside link="show" />
      </div>
    </div>
  );
};


