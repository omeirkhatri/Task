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
    // Create a corresponding deal/lead-journey entry with stage "new"
    await dataProvider.create("lead-journey", {
      data: {
        name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
        lead_id: data.id,
        stage: "new",
        sales_id: data.sales_id,
        index: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    refresh();
    handleClose();
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

