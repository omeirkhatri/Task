import { useGetIdentity, useListContext } from "ra-core";
import { matchPath, useLocation } from "react-router";
import { useState } from "react";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { List } from "@/components/admin/list";
import { ReferenceInput } from "@/components/admin/reference-input";
import { Button } from "@/components/ui/button";

import { TopToolbar } from "../layout/TopToolbar";
import { DealArchivedList } from "./DealArchivedList";
import { DealCreate } from "./DealCreate";
import { DealEdit } from "./DealEdit";
import { DealEmpty } from "./DealEmpty";
import { DealListContent } from "./DealListContent";
import { DealShow } from "./DealShow";
import { ContactCreateDialog } from "./ContactCreateDialog";
import {
  LeadJourneySearchAndFilter,
  LeadJourneyTopFilter,
} from "./LeadJourneyTopFilter";

const DealList = () => {
  const { identity } = useGetIdentity();
  const [createLeadDialogOpen, setCreateLeadDialogOpen] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  if (!identity) return null;

  const dealFilters = [
    <ReferenceInput source="lead_id" reference="contacts">
      <AutocompleteInput
        label={false}
        placeholder="Lead"
        optionText={(choice: any) =>
          `${choice.first_name} ${choice.last_name || ""}`
        }
      />
    </ReferenceInput>,
  ];

  return (
    <List
      perPage={100}
      filter={{ "archived_at@is": null }}
      title={false}
      sort={{ field: "index", order: "DESC" }}
      filters={dealFilters}
      actions={
        <DealActions
          onNewLeadClick={() => setCreateLeadDialogOpen(true)}
          isFilterExpanded={isFilterExpanded}
          onFilterToggle={() => setIsFilterExpanded(!isFilterExpanded)}
          onArchivedClick={() => setShowArchived(true)}
        />
      }
      pagination={null}
    >
      <DealLayout
        createLeadDialogOpen={createLeadDialogOpen}
        setCreateLeadDialogOpen={setCreateLeadDialogOpen}
        isFilterExpanded={isFilterExpanded}
        showArchived={showArchived}
        setShowArchived={setShowArchived}
      />
    </List>
  );
};

const DealLayout = ({
  createLeadDialogOpen,
  setCreateLeadDialogOpen,
  isFilterExpanded,
  showArchived,
  setShowArchived,
}: {
  createLeadDialogOpen: boolean;
  setCreateLeadDialogOpen: (open: boolean) => void;
  isFilterExpanded: boolean;
  showArchived: boolean;
  setShowArchived: (open: boolean) => void;
}) => {
  const location = useLocation();
  const matchCreate = matchPath("/lead-journey/create", location.pathname);
  const matchShow = matchPath("/lead-journey/:id/show", location.pathname);
  const matchEdit = matchPath("/lead-journey/:id", location.pathname);

  const { data, isPending, filterValues } = useListContext();
  const hasFilters = filterValues && Object.keys(filterValues).length > 0;

  if (isPending) return null;
  if (!data?.length && !hasFilters)
    return (
      <>
        <DealEmpty>
          <DealShow open={!!matchShow} id={matchShow?.params.id} />
          <DealArchivedList open={showArchived} onOpenChange={setShowArchived} />
        </DealEmpty>
      </>
    );

  return (
    <div className="w-full">
      <LeadJourneyTopFilter isExpanded={isFilterExpanded} />
      <DealListContent />
      <DealArchivedList open={showArchived} onOpenChange={setShowArchived} />
      <DealCreate open={!!matchCreate} />
      <DealEdit open={!!matchEdit && !matchCreate} id={matchEdit?.params.id} />
      <DealShow open={!!matchShow} id={matchShow?.params.id} />
      <ContactCreateDialog
        open={createLeadDialogOpen}
        onOpenChange={setCreateLeadDialogOpen}
      />
    </div>
  );
};

const DealActions = ({
  onNewLeadClick,
  isFilterExpanded,
  onFilterToggle,
  onArchivedClick,
}: {
  onNewLeadClick: () => void;
  isFilterExpanded: boolean;
  onFilterToggle: () => void;
  onArchivedClick: () => void;
}) => (
  <TopToolbar className="flex items-center gap-4 w-full">
    <LeadJourneySearchAndFilter
      isFilterExpanded={isFilterExpanded}
      onFilterToggle={onFilterToggle}
    />
    <div className="ml-auto flex items-center gap-2">
      <Button variant="outline" onClick={onArchivedClick}>
        Archived
      </Button>
      <Button onClick={onNewLeadClick}>New Lead</Button>
    </div>
  </TopToolbar>
);

export default DealList;
