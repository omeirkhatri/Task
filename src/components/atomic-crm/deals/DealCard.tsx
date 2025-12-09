import { Draggable } from "@hello-pangea/dnd";
import { useGetOne, useRedirect } from "ra-core";
import { Card, CardContent } from "@/components/ui/card";

import type { Deal, Contact } from "../types";

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
        <Card
          className={`py-4 transition-all duration-200 ${
            snapshot?.isDragging
              ? "opacity-90 transform rotate-1 shadow-lg"
              : "shadow-sm hover:shadow-md"
          }`}
        >
          <CardContent className="px-4 flex">
            <div>
              <p className="text-sm font-medium mb-2">{deal.name}</p>
            </div>
          </CardContent>
        </Card>
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
              {lead ? `${lead.first_name} ${lead.last_name || ""}`.trim() : deal.name}
            </p>
            {lead?.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {lead.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
