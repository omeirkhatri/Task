import { Draggable } from "@hello-pangea/dnd";
import { useGetOne, useRedirect, useDataProvider, useRefresh, useNotify } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Deal, Contact } from "../types";
import { updateDealStage } from "./DealListContent";
import { findDealLabel } from "./deal";

export const DealCard = ({ deal, index }: { deal: Deal; index: number }) => {
  if (!deal) return null;

  return (
    <Draggable draggableId={String(deal.id)} index={index}>
      {(provided, snapshot) => (
        <DealCardContent provided={provided} snapshot={snapshot} deal={deal} />
      )}
    </Draggable>
  );
};

export const DealCardContent = ({
  provided,
  snapshot,
  deal,
}: {
  provided?: any;
  snapshot?: any;
  deal: Deal;
}) => {
  const redirect = useRedirect();
  const dataProvider = useDataProvider();
  const refresh = useRefresh();
  const notify = useNotify();
  const { leadStages } = useConfigurationContext();
  
  // Fetch the lead (contact) associated with this deal
  const { data: lead } = useGetOne<Contact>(
    "contacts",
    { id: deal.lead_id },
    { enabled: !!deal.lead_id },
  );

  const handleClick = () => {
    redirect(`/lead-journey/${deal.id}/show`, undefined, undefined, undefined, {
      _scrollToTop: false,
    });
  };

  const handleMoveTo = (stageValue: string) => {
    updateDealStage(
      deal,
      { stage: stageValue, index: undefined },
      dataProvider
    )
    .then(() => {
        notify("Deal moved", { type: "success" });
        refresh();
    })
    .catch((error) => {
        notify(`Error moving deal: ${error.message}`, { type: "error" });
    });
  };

  const handleArchive = () => {
    dataProvider.update("lead-journey", {
        id: deal.id,
        data: { archived_at: new Date().toISOString() },
        previousData: deal
    })
    .then(() => {
        notify("Deal archived", { type: "success" });
        refresh();
    })
    .catch((error) => {
        notify(`Error archiving deal: ${error.message}`, { type: "error" });
    });
  };

  const handleEditContact = () => {
     if (deal.lead_id) {
         redirect(`/contacts/${deal.lead_id}`);
     }
  };

  if (!lead && !deal.lead_id) {
    // Fallback if no lead is associated
    return (
      <div
        className="cursor-pointer"
        {...provided?.draggableProps}
        {...provided?.dragHandleProps}
        ref={provided?.innerRef}
        onClick={handleClick}
      >
        <ContextMenu>
          <ContextMenuTrigger>
            <Card
              className={`py-4 transition-all duration-200 ${
                snapshot?.isDragging
                  ? "opacity-90 transform rotate-1 shadow-lg"
                  : "shadow-sm hover:shadow-md"
              }`}
            >
              <CardContent className="px-4 flex">
                <div>
                  <p className="text-sm font-medium mb-2">
                    {deal.first_name || deal.last_name
                      ? `${deal.first_name ?? ""} ${deal.last_name ?? ""}`.trim()
                      : deal.name || "New Lead"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuSub>
              <ContextMenuSubTrigger>Move to</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {leadStages
                  .filter((stage) => stage.value !== deal.stage)
                  .map((stage) => (
                    <ContextMenuItem
                      key={stage.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveTo(stage.value);
                      }}
                    >
                      {stage.label}
                    </ContextMenuItem>
                  ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuItem onClick={(e) => {
                e.stopPropagation();
                handleArchive();
            }}>
              Archive
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </div>
    );
  }

  return (
    <div
      className="cursor-pointer"
      {...provided?.draggableProps}
      {...provided?.dragHandleProps}
      ref={provided?.innerRef}
      onClick={handleClick}
    >
      <ContextMenu>
        <ContextMenuTrigger>
          <Card
            className={`py-4 transition-all duration-200 ${
              snapshot?.isDragging
                ? "opacity-90 transform rotate-1 shadow-lg"
                : "shadow-sm hover:shadow-md"
            }`}
          >
            <CardContent className="px-4 flex">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium mb-1">
                  {lead
                    ? `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim() || "New Lead"
                    : deal.first_name || deal.last_name
                    ? `${deal.first_name ?? ""} ${deal.last_name ?? ""}`.trim()
                    : deal.name || "New Lead"}
                </p>
                {lead?.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {lead.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuSub>
            <ContextMenuSubTrigger>Move to</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {leadStages
                .filter((stage) => stage.value !== deal.stage)
                .map((stage) => (
                  <ContextMenuItem
                    key={stage.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveTo(stage.value);
                    }}
                  >
                    {stage.label}
                  </ContextMenuItem>
                ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuItem onClick={(e) => {
              e.stopPropagation();
              handleArchive();
          }}>
            Archive
          </ContextMenuItem>
          {deal.lead_id && (
             <ContextMenuItem onClick={(e) => {
                e.stopPropagation();
                handleEditContact();
             }}>
                Edit Contact
             </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
};
