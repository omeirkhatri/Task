import jsonExport from "jsonexport/dist";
import {
  downloadCSV,
  useGetIdentity,
  useListContext,
  type Exporter,
} from "ra-core";
import { BulkActionsToolbar } from "@/components/admin/bulk-actions-toolbar";
import { CreateButton } from "@/components/admin/create-button";
import { ExportButton } from "@/components/admin/export-button";
import { List } from "@/components/admin/list";
import { SortButton } from "@/components/admin/sort-button";
import { Card } from "@/components/ui/card";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Company, Contact, Sale, Tag } from "../types";
import { ClientEmpty } from "./ClientEmpty";
import { ClientListContent } from "./ClientListContent";
import { ClientListFilter } from "./ClientListFilter";
import { ClientArchivedList } from "./ClientArchivedList";
import { TopToolbar } from "../layout/TopToolbar";

export const ClientList = () => {
  const { identity } = useGetIdentity();
  const [showArchived, setShowArchived] = useState(false);

  if (!identity) return null;

  return (
    <List
      title={false}
      actions={<ClientListActions onArchivedClick={() => setShowArchived(true)} />}
      perPage={25}
      sort={{ field: "last_seen", order: "DESC" }}
      exporter={exporter}
      filter={{ isClient: true, "archived_at@is": null }}
    >
      <ClientListLayout showArchived={showArchived} setShowArchived={setShowArchived} />
    </List>
  );
};

const ClientListLayout = ({ showArchived, setShowArchived }: { showArchived: boolean; setShowArchived: (open: boolean) => void }) => {
  const { data, isPending, filterValues } = useListContext();
  const { identity } = useGetIdentity();

  const hasFilters = filterValues && Object.keys(filterValues).length > 0;

  if (!identity || isPending) return null;

  if (!data?.length && !hasFilters) return (
    <>
      <ClientEmpty />
      <ClientArchivedList open={showArchived} onOpenChange={setShowArchived} />
    </>
  );

  return (
    <div className="flex flex-row gap-8">
      <ClientListFilter />
      <div className="w-full flex flex-col gap-4">
        <Card className="py-0">
          <ClientListContent />
        </Card>
      </div>
      <BulkActionsToolbar />
      <ClientArchivedList open={showArchived} onOpenChange={setShowArchived} />
    </div>
  );
};

const ClientListActions = ({ onArchivedClick }: { onArchivedClick: () => void }) => (
  <TopToolbar>
    <SortButton fields={["first_name", "last_name", "last_seen"]} />
    <ExportButton exporter={exporter} />
    <Button variant="outline" onClick={onArchivedClick}>
      Archived
    </Button>
    <CreateButton />
  </TopToolbar>
);

const exporter: Exporter<Contact> = async (records, fetchRelatedRecords) => {
  const companies = await fetchRelatedRecords<Company>(
    records,
    "company_id",
    "companies",
  );
  const sales = await fetchRelatedRecords<Sale>(records, "sales_id", "sales");
  const tags = await fetchRelatedRecords<Tag>(records, "tags", "tags");

  const clients = records.map((client) => {
    const exportedClient = {
      ...client,
      company:
        client.company_id != null
          ? companies[client.company_id].name
          : undefined,
      sales: `${sales[client.sales_id].first_name} ${
        sales[client.sales_id].last_name
      }`,
      tags: client.tags.map((tagId) => tags[tagId].name).join(", "),
      email_work: client.email_jsonb?.find((email) => email.type === "Work")
        ?.email,
      email_home: client.email_jsonb?.find((email) => email.type === "Home")
        ?.email,
      email_other: client.email_jsonb?.find((email) => email.type === "Other")
        ?.email,
      email_jsonb: JSON.stringify(client.email_jsonb),
      email_fts: undefined,
      phone_work: client.phone_jsonb?.find((phone) => phone.type === "Work")
        ?.number,
      phone_home: client.phone_jsonb?.find((phone) => phone.type === "Home")
        ?.number,
      phone_other: client.phone_jsonb?.find((phone) => phone.type === "Other")
        ?.number,
      phone_jsonb: JSON.stringify(client.phone_jsonb),
      phone_fts: undefined,
    };
    delete exportedClient.email_fts;
    delete exportedClient.phone_fts;
    return exportedClient;
  });
  return jsonExport(clients, {}, (_err: any, csv: string) => {
    downloadCSV(csv, "clients");
  });
};





