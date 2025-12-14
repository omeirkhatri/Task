import { Droppable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Deal } from "../types";
import { findDealLabel } from "./deal";
import { DealCard } from "./DealCard";

export const DealColumn = ({
  stage,
  deals,
}: {
  stage: string;
  deals: Deal[];
}) => {
  const leadCount = deals.length;
  const { leadStages } = useConfigurationContext();
  
  return (
    <div className="flex flex-col h-full min-w-0">
      <Card className="flex flex-col h-full gap-0 border-border/50 shadow-sm bg-card">
        <CardHeader className="flex-shrink-0 pb-2.5 px-4 pt-3 border-b border-border/50">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <span className="truncate">{findDealLabel(leadStages, stage)}</span>
            {leadCount > 0 && (
              <span className="text-xs font-medium text-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                {leadCount}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto min-h-0 p-2 bg-muted/20">
          <Droppable droppableId={stage}>
            {(droppableProvided, snapshot) => (
              <div
                ref={droppableProvided.innerRef}
                {...droppableProvided.droppableProps}
                // Don't force height - let content determine height so scroll works
                className={`flex flex-col gap-2 min-h-[150px] ${
                  snapshot.isDraggingOver ? "bg-muted/50 rounded-lg transition-colors" : ""
                }`}
              >
                {deals.map((deal, index) => (
                  <DealCard key={deal.id} deal={deal} index={index} />
                ))}
                {droppableProvided.placeholder}
              </div>
            )}
          </Droppable>
        </CardContent>
      </Card>
    </div>
  );
};
