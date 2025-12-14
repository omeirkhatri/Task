import jsonExport from "jsonexport/dist";
import {
  downloadCSV,
  useDataProvider,
  useGetIdentity,
  useListContext,
  useNotify,
  useRefresh,
  type Exporter,
} from "ra-core";
import { BulkActionsToolbar } from "@/components/admin/bulk-actions-toolbar";
import { CreateButton } from "@/components/admin/create-button";
import { ExportButton } from "@/components/admin/export-button";
import { List } from "@/components/admin/list";
import { SortButton } from "@/components/admin/sort-button";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layers } from "lucide-react";
import * as React from "react";

import type { Company, Contact, Sale, Tag } from "../types";
import { ContactEmpty } from "./ContactEmpty";
import { ContactImportButton } from "./ContactImportButton";
import { ContactListContent } from "./ContactListContent";
import { ContactListFilter } from "./ContactListFilter";
import { TopToolbar } from "../layout/TopToolbar";
import { useConfigurationContext } from "../root/ConfigurationContext";

export const ContactList = () => {
  const { identity } = useGetIdentity();

  if (!identity) return null;

  return (
    <List
      title={false}
      actions={<ContactListActions />}
      perPage={25}
      sort={{ field: "last_seen", order: "DESC" }}
      exporter={exporter}
    >
      <ContactListLayout />
    </List>
  );
};

const ContactListLayout = () => {
  const { data, isPending, filterValues } = useListContext();
  const { identity } = useGetIdentity();

  const hasFilters = filterValues && Object.keys(filterValues).length > 0;

  if (!identity || isPending) return null;

  if (!data?.length && !hasFilters) return <ContactEmpty />;

  return (
    <div className="flex flex-row gap-8">
      <ContactListFilter />
      <div className="w-full flex flex-col gap-4">
        <Card className="py-0">
          <ContactListContent />
        </Card>
      </div>
      <BulkActionsToolbar />
    </div>
  );
};

const ContactListActions = () => (
  <TopToolbar>
    <SortButton fields={["first_name", "last_name", "last_seen"]} />
    <ContactImportButton />
    <ExportButton exporter={exporter} />
    <BulkLeadStageButton />
    <CreateButton />
  </TopToolbar>
);

const BulkLeadStageButton = () => {
  const { selectedIds } = useListContext<Contact>();
  const { leadStages } = useConfigurationContext();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const refresh = useRefresh();

  const [open, setOpen] = React.useState(false);
  const [stage, setStage] = React.useState<string>("new");
  const [isSaving, setIsSaving] = React.useState(false);

  const selectedCount = selectedIds?.length ?? 0;

  const stageOptions = React.useMemo(() => {
    // Ensure we only show the stages requested (and keep order stable)
    const allowed = new Set([
      "new",
      "contacted",
      "quoted",
      "qualified",
      "not-qualified",
      "converted",
    ]);
    const fromConfig =
      leadStages?.filter((s) => allowed.has(s.value)) ?? [];
    if (fromConfig.length > 0) return fromConfig;
    // Fallback (in case config is missing)
    return [
      { value: "new", label: "New" },
      { value: "contacted", label: "Contacted" },
      { value: "quoted", label: "Quoted" },
      { value: "qualified", label: "Qualified" },
      { value: "not-qualified", label: "Not Qualified" },
      { value: "converted", label: "Converted" },
    ];
  }, [leadStages]);

  const selectedStageLabel =
    stageOptions.find((s) => s.value === stage)?.label ?? stage;

  const handleOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedCount) {
      notify("Select at least one lead first", { type: "info" });
      return;
    }
    setOpen(true);
  };

  const handleConfirm = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedCount) return;

    setIsSaving(true);
    try {
      // Fetch deals for selected leads (contacts)
      const { data: deals } = await dataProvider.getList("lead-journey", {
        pagination: { page: 1, perPage: 10000 },
        sort: { field: "id", order: "ASC" },
        filter: {
          "archived_at@is": null,
          "lead_id@in": `(${selectedIds.join(",")})`,
        },
      });

      const dealsToUpdate = Array.isArray(deals) ? deals : [];

      if (dealsToUpdate.length === 0) {
        notify("No lead journey records found for selected leads", {
          type: "info",
        });
        setOpen(false);
        return;
      }

      await Promise.all(
        dealsToUpdate.map((deal: any) =>
          dataProvider.update("lead-journey", {
            id: deal.id,
            data: { stage },
            previousData: deal,
          }),
        ),
      );

      notify(
        `${selectedCount} lead${selectedCount === 1 ? "" : "s"} updated to ${selectedStageLabel}`,
        { type: "success" },
      );
      setOpen(false);
      refresh();
    } catch (error: any) {
      console.error("BulkLeadStageButton: update failed", error);
      notify("Failed to update lead stage", { type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="flex items-center gap-2 h-9"
        onClick={handleOpen}
        disabled={isSaving}
        title={
          selectedCount
            ? `Change stage for ${selectedCount} selected lead${selectedCount === 1 ? "" : "s"}`
            : "Select leads to enable"
        }
      >
        <Layers className="h-4 w-4" />
        Bulk Stage
      </Button>

      <Dialog open={open} onOpenChange={(v) => !isSaving && setOpen(v)}>
        <DialogContent
          onPointerDownOutside={(e) => {
            if (isSaving) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Bulk change lead stage</DialogTitle>
            <DialogDescription>
              Update the stage for {selectedCount} selected lead
              {selectedCount === 1 ? "" : "s"}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium">New stage</div>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stageOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleConfirm}
              disabled={isSaving || !selectedCount}
            >
              {isSaving ? "Updating..." : "Update stage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const exporter: Exporter<Contact> = async (records, fetchRelatedRecords) => {
  const companies = await fetchRelatedRecords<Company>(
    records,
    "company_id",
    "companies",
  );
  const sales = await fetchRelatedRecords<Sale>(records, "sales_id", "sales");
  const tags = await fetchRelatedRecords<Tag>(records, "tags", "tags");

  const contacts = records.map((contact) => {
    const exportedContact = {
      id: contact.id,
      first_name: contact.first_name || "",
      last_name: contact.last_name || "",
      gender: contact.gender || "",
      email_jsonb: JSON.stringify(contact.email_jsonb || []),
      phone_jsonb: JSON.stringify(contact.phone_jsonb || []),
      flat_villa_number: contact.flat_villa_number || "",
      building_street: contact.building_street || "",
      area: contact.area || "",
      google_maps_link: contact.google_maps_link || "",
      phone_has_whatsapp: contact.phone_has_whatsapp ? "TRUE" : "FALSE",
      services_interested: Array.isArray(contact.services_interested)
        ? contact.services_interested.join(";")
        : "",
      description: contact.description || "",
      first_seen: contact.first_seen || "",
      last_seen: contact.last_seen || "",
      tags: contact.tags.map((tagId) => tags[tagId]?.name || "").filter(Boolean).join(", ") || "",
      sales_id: contact.sales_id || "",
      nb_tasks: contact.nb_tasks || 0,
      sales: sales[contact.sales_id]
        ? `${sales[contact.sales_id].first_name} ${sales[contact.sales_id].last_name}`
        : "",
    };
    return exportedContact;
  });
  return jsonExport(contacts, {}, (_err: any, csv: string) => {
    downloadCSV(csv, "contacts");
  });
};
