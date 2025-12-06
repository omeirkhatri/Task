import { FilterLiveForm, useGetIdentity, useListContext } from "ra-core";
import { matchPath, useLocation } from "react-router";
import { useState } from "react";
import { AutocompleteInput } from "@/components/admin/autocomplete-input";
import { List } from "@/components/admin/list";
import { ReferenceInput } from "@/components/admin/reference-input";
import { FilterButton } from "@/components/admin/filter-form";
import { SearchInput } from "@/components/admin/search-input";
import { Button } from "@/components/ui/button";

import { TopToolbar } from "../layout/TopToolbar";
import { DealArchivedList } from "./DealArchivedList";
import { DealCreate } from "./DealCreate";
import { DealEdit } from "./DealEdit";
import { DealEmpty } from "./DealEmpty";
import { DealListContent } from "./DealListContent";
import { DealShow } from "./DealShow";
import { OnlyMineInput } from "./OnlyMineInput";
import { ContactCreateDialog } from "./ContactCreateDialog";

const DealList = () => {
  const { identity } = useGetIdentity();
  const [createLeadDialogOpen, setCreateLeadDialogOpen] = useState(false);

  if (!identity) return null;

  const dealFilters = [
    <ReferenceInput source="lead_id" reference="contacts">
      <AutocompleteInput 
        label={false} 
        placeholder="Lead" 
        optionText={(choice: any) => `${choice.first_name} ${choice.last_name || ""}`}
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
      actions={<DealActions onNewLeadClick={() => setCreateLeadDialogOpen(true)} />}
      pagination={null}
    >
      <DealLayout createLeadDialogOpen={createLeadDialogOpen} setCreateLeadDialogOpen={setCreateLeadDialogOpen} />
    </List>
  );
};

const DealLayout = ({ 
  createLeadDialogOpen, 
  setCreateLeadDialogOpen 
}: { 
  createLeadDialogOpen: boolean;
  setCreateLeadDialogOpen: (open: boolean) => void;
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
          <DealArchivedList />
        </DealEmpty>
      </>
    );

  return (
    <div className="w-full">
      <DealListContent />
      <DealArchivedList />
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

const DealActions = ({ onNewLeadClick }: { onNewLeadClick: () => void }) => (
  <TopToolbar className="flex items-center gap-4 w-full">
    <div className="flex-1 max-w-md">
      <FilterLiveForm>
        <SearchInput 
          source="q" 
          placeholder="Search name, company..."
        />
      </FilterLiveForm>
    </div>
    <div className="[&>div]:!mt-0 [&>div]:!pb-0">
      <OnlyMineInput source="sales_id" alwaysOn />
    </div>
    <FilterButton />
    <div className="ml-auto">
      <Button onClick={onNewLeadClick}>New Lead</Button>
    </div>
  </TopToolbar>
);

export default DealList;
