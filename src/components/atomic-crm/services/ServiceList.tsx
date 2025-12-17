import { CreateButton } from "@/components/admin/create-button";
import { DataTable } from "@/components/admin/data-table";
import { DateField } from "@/components/admin/date-field";
import { ExportButton } from "@/components/admin/export-button";
import { List } from "@/components/admin/list";
import { SearchInput } from "@/components/admin/search-input";
import { TopToolbar } from "../layout/TopToolbar";

const filters = [<SearchInput key="service-search" source="q" alwaysOn />];

const ServiceListActions = () => (
  <TopToolbar>
    <ExportButton />
    <CreateButton label="New service" />
  </TopToolbar>
);

export const ServiceList = () => {
  return (
    <List filters={filters} actions={<ServiceListActions />}>
      <DataTable>
        <DataTable.Col source="name" label="Service" />
        <DataTable.Col
          source="created_at"
          label="Created"
          field={DateField}
          headerClassName="text-right"
          cellClassName="text-right"
        />
      </DataTable>
    </List>
  );
};






