import { CreateBase, Form } from "ra-core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormToolbar } from "@/components/admin/simple-form";

import { ServiceInputs } from "./ServiceInputs";

export const ServiceCreate = () => {
  return (
    <CreateBase redirect="list">
      <div className="max-w-lg w-full mx-auto mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Create service</CardTitle>
          </CardHeader>
          <CardContent>
            <Form className="flex flex-col gap-4">
              <ServiceInputs />
              <FormToolbar />
            </Form>
          </CardContent>
        </Card>
      </div>
    </CreateBase>
  );
};

