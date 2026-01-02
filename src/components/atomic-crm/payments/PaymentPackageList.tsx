import { CreateButton } from "@/components/admin/create-button";
import { DataTable } from "@/components/admin/data-table";
import { DateField } from "@/components/admin/date-field";
import { ExportButton } from "@/components/admin/export-button";
import { ReferenceField } from "@/components/admin/reference-field";
import { SearchInput } from "@/components/admin/search-input";
import { BooleanInput } from "@/components/admin/boolean-input";
import { SelectInput } from "@/components/admin/select-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { DateInput } from "@/components/admin/date-input";
import { ShowButton } from "@/components/admin/show-button";
import { EditButton } from "@/components/admin/edit-button";
import { PaymentPackageDeleteButton } from "./PaymentPackageDeleteButton";
import { Badge } from "@/components/ui/badge";
import { WithRecord } from "ra-core";
import type { PaymentPackage, Contact, Service } from "../types";

const filters = [
  <SearchInput key="package-search" source="q" />,
  <BooleanInput key="overdue-installments" source="overdue_installments" label="Overdue Installments" />,
  <SelectInput
    key="status-filter"
    source="status"
    label="Status"
    choices={[
      { id: "active", name: "Ongoing" },
      { id: "completed", name: "Completed" },
      { id: "expired", name: "Expired" },
    ]}
  />,
  <ReferenceInput
    key="patient-filter"
    source="patient_id"
    reference="clients"
    label="Patient"
  />,
  <ReferenceInput
    key="service-filter"
    source="service_id"
    reference="services"
    label="Service"
  />,
  <DateInput
    key="renewal-date-from"
    source="renewal_date@gte"
    label="Renewal Date From"
  />,
  <DateInput
    key="renewal-date-to"
    source="renewal_date@lte"
    label="Renewal Date To"
  />,
];

const PaymentPackageListActions = () => (
  <>
    <ExportButton />
    <CreateButton label="New Package" />
  </>
);

const StatusBadge = ({ record }: { record: PaymentPackage }) => {
  if (!record) return null;
  
  const statusColors = {
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    completed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    expired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };

  return (
    <Badge className={statusColors[record.status] || statusColors.completed}>
      {record.status}
    </Badge>
  );
};

const UsageDisplay = ({ record }: { record: PaymentPackage }) => {
  if (!record) return <span>-</span>;
  
  // TODO: Calculate actual usage from package_usage table
  // For now, show placeholder
  if (record.package_type === "session-based" && record.total_sessions) {
    return <span>0/{record.total_sessions} sessions</span>;
  }
  if (record.package_type === "time-based" && record.total_hours) {
    return <span>0/{record.total_hours} hours</span>;
  }
  return <span>-</span>;
};

const AmountDisplay = ({ record }: { record: PaymentPackage }) => {
  if (!record) return <span>-</span>;
  
  // TODO: Calculate amount paid from payment_transactions
  // For now, show total amount
  return <span>AED {record.total_amount.toLocaleString()}</span>;
};

export const PaymentPackageList = () => {
  return (
    <DataTable rowClick="show">
      <DataTable.Col
        source="patient_id"
        label="Patient"
        headerClassName="text-left"
        cellClassName="text-left"
      >
        <ReferenceField source="patient_id" reference="clients" link="show">
          <WithRecord
            render={(contact: Contact) => (
              <span>
                {contact.first_name} {contact.last_name}
              </span>
            )}
          />
        </ReferenceField>
      </DataTable.Col>
      <DataTable.Col
        source="service_id"
        label="Service"
        headerClassName="text-left"
        cellClassName="text-left"
      >
        <ReferenceField source="service_id" reference="services" link="show">
          <WithRecord
            render={(service: Service) => <span>{service.name}</span>}
          />
        </ReferenceField>
      </DataTable.Col>
      <DataTable.Col
        source="status"
        label="Status"
        headerClassName="text-center"
        cellClassName="text-center"
      >
        <StatusBadge />
      </DataTable.Col>
      <DataTable.Col
        source="usage"
        label="Usage"
        headerClassName="text-center"
        cellClassName="text-center"
      >
        <UsageDisplay />
      </DataTable.Col>
      <DataTable.Col
        source="renewal_date"
        label="Renewal Date"
        field={DateField}
        headerClassName="text-right"
        cellClassName="text-right"
      />
      <DataTable.Col
        source="amount"
        label="Amount"
        headerClassName="text-right"
        cellClassName="text-right"
      >
        <AmountDisplay />
      </DataTable.Col>
      <DataTable.Col
        label="Actions"
        headerClassName="text-right"
        cellClassName="text-right"
      >
        <div className="flex justify-end gap-2">
          <ShowButton />
          <EditButton />
          <PaymentPackageDeleteButton redirect="list" />
        </div>
      </DataTable.Col>
    </DataTable>
  );
};

export { PaymentPackageListActions, filters };

