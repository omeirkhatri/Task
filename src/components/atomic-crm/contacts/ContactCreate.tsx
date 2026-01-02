import { CreateBase, Form, useDataProvider, useGetIdentity, useNotify, useRedirect, useRefresh } from "ra-core";
import { FormToolbar } from "@/components/admin/simple-form";

import type { Contact } from "../types";
import { createLeadJourneyDealForContact } from "../deals/createLeadJourneyDeal";
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
      await createLeadJourneyDealForContact(dataProvider, data, identity?.id);
      
      // Force refresh to ensure the new lead appears in lists
      refresh();
      
      // Small delay to ensure backend has processed
      setTimeout(() => {
        refresh();
      }, 100);
      
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
      <div className="mt-2 flex justify-center">
        <div className="w-[90%] max-w-6xl">
          <Form 
            className="flex flex-col gap-6"
            defaultValues={{ 
              sales_id: identity?.id,
              phone_has_whatsapp: false,
              services_interested: [],
            }}
          >
            <LeadInputs />
            <div className="flex justify-end pt-4 border-t">
              <FormToolbar />
            </div>
          </Form>
        </div>
      </div>
    </CreateBase>
  );
};
