import {
  CreateBase,
  Form,
  useDataProvider,
  useGetIdentity,
  useRedirect,
  useRefresh,
} from "ra-core";
import { SaveButton } from "@/components/admin/form";
import { FormToolbar } from "@/components/admin/simple-form";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import type { Contact } from "../types";
import { LeadInputs } from "../contacts/LeadInputs";
import { createLeadJourneyDealForContact } from "./createLeadJourneyDeal";

export const ContactCreateDialog = ({ 
  open, 
  onOpenChange 
}: { 
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  const { identity } = useGetIdentity();
  const redirect = useRedirect();
  const dataProvider = useDataProvider();
  const refresh = useRefresh();

  const handleClose = () => {
    if (onOpenChange) {
      onOpenChange(false);
    } else {
      redirect("/lead-journey");
    }
  };

  const handleSuccess = async (data: Contact) => {
    try {
      await createLeadJourneyDealForContact(dataProvider, data, identity?.id);

      // Force refresh of the lead journey list
      refresh();
      
      // Small delay to ensure the backend has processed the creation
      setTimeout(() => {
        refresh();
        handleClose();
      }, 100);
    } catch (error) {
      console.error("Error creating lead-journey entry:", error);
      // Still refresh and close even if lead-journey creation fails
      refresh();
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        handleClose();
      } else if (onOpenChange) {
        onOpenChange(open);
      }
    }}>
      <DialogContent className="lg:max-w-4xl overflow-y-auto max-h-9/10 top-1/20 translate-y-0">
        <DialogTitle className="sr-only">Create New Contact</DialogTitle>
        <DialogDescription className="sr-only">Create a new contact and lead</DialogDescription>
        <CreateBase
          resource="contacts"
          redirect={false}
          transform={(data: Contact) => ({
            ...data,
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            tags: [],
            services_interested: data.services_interested || [],
          })}
          mutationOptions={{
            onSuccess: handleSuccess,
          }}
        >
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
                <FormToolbar>
                  <SaveButton />
                </FormToolbar>
              </CardContent>
            </Card>
          </Form>
        </CreateBase>
      </DialogContent>
    </Dialog>
  );
};

