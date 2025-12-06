import { CreateBase, Form, useDataProvider, useGetIdentity, useNotify, useRedirect, useRefresh } from "ra-core";
import { FormToolbar } from "@/components/admin/simple-form";
import { Card, CardContent } from "@/components/ui/card";

import type { Contact } from "../types";
import { LeadInputs } from "./LeadInputs";

export const ContactCreate = () => {
  const { identity } = useGetIdentity();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const redirect = useRedirect();
  const refresh = useRefresh();

  const handleSuccess = async (data: Contact) => {
    if (!data?.id) {
      console.error("ContactCreate: Missing contact ID", data);
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
      console.log("ContactCreate: Creating lead-journey entry", leadJourneyData);
      await dataProvider.create("lead-journey", {
        data: leadJourneyData,
      });
      console.log("ContactCreate: Successfully created lead-journey entry");
      refresh();
      redirect("show", "contacts", data.id);
    } catch (error) {
      notify("Lead created but could not add to journey", { type: "warning" });
      console.error("ContactCreate: lead-journey create failed", error);
      // Still redirect even if lead-journey creation fails
      refresh();
      redirect("show", "contacts", data.id);
    }
  };
  return (
    <CreateBase
      redirect={false}
      transform={(data: Contact) => ({
        ...data,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        tags: [],
        services_interested: data.services_interested || [],
      })}
      mutationOptions={{
        onSuccess: async (response) => {
          // Handle both response.data (react-admin structure) and direct data
          const contact = ((response as any)?.data ?? response) as Contact | undefined;
          if (!contact || !contact.id) {
            console.warn("ContactCreate: Invalid response structure", response);
            return;
          }
          await handleSuccess(contact);
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
