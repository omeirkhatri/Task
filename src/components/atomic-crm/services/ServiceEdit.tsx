import { EditBase, Form } from "ra-core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteButton } from "@/components/admin/delete-button";
import { CancelButton } from "@/components/admin/cancel-button";
import { SaveButton } from "@/components/admin/form";
import { FormToolbar } from "@/components/admin/simple-form";

import { ServiceInputs } from "./ServiceInputs";

export const ServiceEdit = () => {
  return (
    <EditBase redirect="list">
      <div className="max-w-lg w-full mx-auto mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Edit service</CardTitle>
          </CardHeader>
          <CardContent>
            <Form className="flex flex-col gap-4">
              <ServiceInputs />
              <FormToolbar>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <DeleteButton redirect="list" />
                  <div className="flex flex-row gap-2 justify-end">
                    <CancelButton />
                    <SaveButton />
                  </div>
                </div>
              </FormToolbar>
            </Form>
          </CardContent>
        </Card>
      </div>
    </EditBase>
  );
};

