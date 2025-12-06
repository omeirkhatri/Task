import { CreateBase, Form, useDataProvider, useGetIdentity, useNotify } from "ra-core";
import { FormToolbar } from "@/components/admin/simple-form";
import { Card, CardContent } from "@/components/ui/card";

import type { Contact } from "../types";
import { LeadInputs } from "../contacts/LeadInputs";

export const ClientCreate = () => {
  const { identity } = useGetIdentity();
  const dataProvider = useDataProvider();
  const notify = useNotify();

  const handleSuccess = async (data: Contact) => {
    if (!data?.id) {
      console.error("ClientCreate: Missing contact ID", data);
      return;
    }
    try {
      const leadJourneyData = {
        name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() || "New Lead",
        lead_id: data.id,
        stage: "new",
        sales_id: data.sales_id ?? identity?.id,
        index: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      console.log("ClientCreate: Creating lead-journey entry", leadJourneyData);
      await dataProvider.create("lead-journey", {
        data: leadJourneyData,
      });
      console.log("ClientCreate: Successfully created lead-journey entry");
    } catch (error) {
      notify("Client created but could not add to journey", { type: "warning" });
      console.error("ClientCreate: lead-journey create failed", error);
    }
  };
  return (
    <CreateBase
      redirect="show"
      transform={(data: Contact) => ({
        ...data,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        tags: [],
        services_interested: data.services_interested || [],
      })}
      mutationOptions={{
        onSuccess: (response) => {
          // Handle both response.data (react-admin structure) and direct data
          const contact = ((response as any)?.data ?? response) as Contact | undefined;
          if (!contact || !contact.id) {
            console.warn("ClientCreate: Invalid response structure", response);
            return;
          }
          handleSuccess(contact);
        },
      }}
    >
      <div className="mt-2 flex lg:mr-72">
        <div className="flex-1">
          <Form 
            defaultValues={{ 
              sales_id: identity?.id,
              phone_has_whatsapp: false,
              services_interested: [],
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
      </div>
    </CreateBase>
  );
};
