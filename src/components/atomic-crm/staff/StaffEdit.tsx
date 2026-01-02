import { EditBase, Form, useEditContext } from "ra-core";
import { FormToolbar } from "@/components/admin/simple-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDataProvider, useNotify, useRedirect } from "ra-core";
import { Trash2 } from "lucide-react";
import type { Staff } from "../types";
import { StaffInputs } from "./StaffInputs";

export const StaffEdit = () => {
  return (
    <EditBase redirect="show">
      <StaffEditContent />
    </EditBase>
  );
};

const StaffEditContent = () => {
  const { record } = useEditContext<Staff>();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const redirect = useRedirect();

  const handleDelete = async () => {
    if (!record?.id || !confirm("Are you sure you want to delete this staff member?")) {
      return;
    }

    try {
      await dataProvider.delete("staff", { id: record.id });
      notify("Staff member deleted successfully", { type: "success" });
      redirect("list", "staff");
    } catch (error) {
      notify("Failed to delete staff member", { type: "error" });
      console.error(error);
    }
  };

  if (!record) return null;

  return (
    <div className="mt-2 flex justify-center">
      <div className="w-[90%] max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Edit Staff Member</CardTitle>
            <p className="text-sm text-muted-foreground">Update staff member information</p>
          </CardHeader>
          <CardContent>
            <Form defaultValues={record}>
              <StaffInputs />
              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Staff
                </Button>
                <FormToolbar />
              </div>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

