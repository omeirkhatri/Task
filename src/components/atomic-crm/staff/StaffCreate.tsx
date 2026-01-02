import { CreateBase, Form } from "ra-core";
import { FormToolbar } from "@/components/admin/simple-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Staff } from "../types";
import { StaffInputs } from "./StaffInputs";

export const StaffCreate = () => {
  return (
    <CreateBase redirect="show">
      <div className="mt-2 flex justify-center">
        <div className="w-[90%] max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Add Staff Member</CardTitle>
            </CardHeader>
            <CardContent>
              <Form>
                <StaffInputs />
                <FormToolbar />
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </CreateBase>
  );
};

