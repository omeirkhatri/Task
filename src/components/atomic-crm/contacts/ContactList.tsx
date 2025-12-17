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
import { ContactArchivedList } from "./ContactArchivedList";
import { TopToolbar } from "../layout/TopToolbar";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const ContactList = () => {
  const { identity } = useGetIdentity();
  const [showArchived, setShowArchived] = React.useState(false);

  if (!identity) return null;

  return (
    <List
      title={false}
      actions={<ContactListActions onArchivedClick={() => setShowArchived(true)} />}
      perPage={25}
      sort={{ field: "last_seen", order: "DESC" }}
      exporter={exporter}
      filter={{ "archived_at@is": null }}
    >
      <ContactListLayout showArchived={showArchived} setShowArchived={setShowArchived} />
    </List>
  );
};

const ContactListLayout = ({ showArchived, setShowArchived }: { showArchived: boolean; setShowArchived: (open: boolean) => void }) => {
  const { data, isPending, filterValues } = useListContext();
  const { identity } = useGetIdentity();

  const hasFilters = filterValues && Object.keys(filterValues).length > 0;

  if (!identity || isPending) return null;

  if (!data?.length && !hasFilters) return (
    <>
      <ContactEmpty />
      <ContactArchivedList open={showArchived} onOpenChange={setShowArchived} />
    </>
  );

  return (
    <div className="flex flex-row gap-8">
      <ContactListFilter />
      <div className="w-full flex flex-col gap-4">
        <Card className="py-0">
          <ContactListContent />
        </Card>
      </div>
      <BulkActionsToolbar />
      <ContactArchivedList open={showArchived} onOpenChange={setShowArchived} />
    </div>
  );
};

const ContactListActions = ({ onArchivedClick }: { onArchivedClick: () => void }) => {
  const { filterValues = {}, setFilters } = useListContext<Contact>();
  
  // Parse current lead_stage filter
  const parseLeadStages = (filter: string | undefined): string[] => {
    if (!filter) return [];
    return filter
      .replace(/[()]/g, "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const currentStages = parseLeadStages(filterValues["lead_stage@in"] as string | undefined);
  const hasConverted = currentStages.includes("converted");
  const allNonConvertedStages = ["new", "contacted", "quoted", "qualified", "not-qualified"];
  
  // Determine if clients should be shown based on current filter
  const shouldShowClients = React.useMemo(() => {
    if (currentStages.length === 0) return true; // No filter = show all
    if (hasConverted) return true; // "converted" is included
    // Check if filter only contains non-converted stages (clients hidden)
    const onlyNonConverted = currentStages.length > 0 && 
      currentStages.every((s) => allNonConvertedStages.includes(s));
    return !onlyNonConverted; // If only non-converted, clients are hidden
  }, [currentStages, hasConverted, allNonConvertedStages]);

  const handleToggleClients = (checked: boolean) => {
    const updated = { ...filterValues };

    if (checked) {
      // Show clients: include "converted" or remove exclusion
      if (currentStages.length === 0) {
        // No filter, show all (including clients) - remove filter
        delete updated["lead_stage@in"];
      } else if (hasConverted) {
        // Already includes "converted", do nothing
        return;
      } else {
        // Add "converted" to existing stages
        const newStages = [...currentStages, "converted"];
        updated["lead_stage@in"] = `(${newStages.join(",")})`;
      }
    } else {
      // Hide clients: exclude "converted" stage
      const stagesWithoutConverted = currentStages.filter((s) => s !== "converted");
      
      if (stagesWithoutConverted.length > 0) {
        // Keep other selected stages, exclude "converted"
        updated["lead_stage@in"] = `(${stagesWithoutConverted.join(",")})`;
      } else {
        // No other stages selected, show all non-converted stages
        updated["lead_stage@in"] = `(${allNonConvertedStages.join(",")})`;
      }
    }

    setFilters(updated);
  };

  return (
    <TopToolbar>
      <SortButton fields={["first_name", "last_name", "last_seen"]} />
      <ContactImportButton />
      <ExportButton exporter={exporter} />
      <BulkLeadStageButton />
      <div className="flex items-center gap-2 px-2">
        <Switch
          id="show-clients"
          checked={shouldShowClients}
          onCheckedChange={handleToggleClients}
        />
        <Label htmlFor="show-clients" className="text-sm font-normal cursor-pointer">
          Show Clients
        </Label>
      </div>
      <Button variant="outline" onClick={onArchivedClick}>
        Archived
      </Button>
      <CreateButton />
    </TopToolbar>
  );
};

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
