import { FilterLiveForm, useListContext } from "ra-core";
import { CreateButton } from "@/components/admin/create-button";
import { ExportButton } from "@/components/admin/export-button";
import { List } from "@/components/admin/list";
import { SortButton } from "@/components/admin/sort-button";
import { SearchInput } from "@/components/admin/search-input";
import { Card } from "@/components/ui/card";
import { TopToolbar } from "../layout/TopToolbar";
import { StaffListContent } from "./StaffListContent";
import { StaffListFilter } from "./StaffListFilter";
import type { Staff } from "../types";

export const StaffList = () => {
  return (
    <List
      title={false}
      actions={<StaffListActions />}
      perPage={25}
      sort={{ field: "created_at", order: "DESC" }}
    >
      <StaffListLayout />
    </List>
  );
};

const StaffListLayout = () => {
  const { data, isPending } = useListContext<Staff>();

  if (isPending) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Staff</h1>
            <p className="text-muted-foreground">Manage healthcare staff and schedules</p>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-bold">{data?.length || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Doctors</p>
                <p className="text-2xl font-bold">
                  {data?.filter((s) => s.staff_type === "Doctor").length || 0}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nurses</p>
                <p className="text-2xl font-bold">
                  {data?.filter((s) => s.staff_type === "Nurse").length || 0}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Management</p>
                <p className="text-2xl font-bold">
                  {data?.filter((s) => s.staff_type === "Management").length || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <FilterLiveForm>
                <SearchInput source="q" placeholder="Search staff..." />
              </FilterLiveForm>
            </div>
            <StaffListFilter />
          </div>
        </Card>
      </div>

      {/* Staff Table */}
      <Card className="py-0">
        <StaffListContent />
      </Card>
    </div>
  );
};

const StaffListActions = () => {
  return (
    <TopToolbar>
      <SortButton fields={["first_name", "last_name", "created_at", "staff_type"]} />
      <CreateButton label="+ Add Staff" />
    </TopToolbar>
  );
};

