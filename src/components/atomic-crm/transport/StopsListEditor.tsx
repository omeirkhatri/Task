/**
 * StopsListEditor Component
 * 
 * Editable stops list with drag-and-drop reordering.
 */

import React from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import type { TripLeg } from "../types";
import type { Identifier } from "ra-core";
import { StopRow } from "./StopRow";

type StopsListEditorProps = {
  legs: TripLeg[];
  onLegsReorder: (legs: TripLeg[]) => void;
  onLegUpdate: (legId: Identifier, updates: Partial<TripLeg>) => void;
  selectedDate: Date;
};

export const StopsListEditor: React.FC<StopsListEditorProps> = ({
  legs,
  onLegsReorder,
  onLegUpdate,
  selectedDate,
}) => {
  const handleDragEnd = (result: DropResult) => {
    const { destination, source } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Reorder legs
    const newLegs = Array.from(legs);
    const [removed] = newLegs.splice(source.index, 1);
    newLegs.splice(destination.index, 0, removed);

    // Update leg_order
    const reorderedLegs = newLegs.map((leg, index) => ({
      ...leg,
      leg_order: index + 1,
    }));

    onLegsReorder(reorderedLegs);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="stops-list">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-2 p-4 ${
              snapshot.isDraggingOver ? "bg-blue-50 dark:bg-blue-900/20" : ""
            }`}
          >
            {legs.length === 0 ? (
              <div className="text-center text-slate-500 dark:text-slate-400 py-8 text-sm">
                No stops in route
              </div>
            ) : (
              legs.map((leg, index) => (
                <Draggable key={leg.id} draggableId={String(leg.id)} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`${
                        snapshot.isDragging
                          ? "shadow-lg ring-2 ring-blue-500"
                          : "hover:shadow-md"
                      } transition-shadow`}
                    >
                      <StopRow
                        leg={leg}
                        index={index}
                        dragHandleProps={provided.dragHandleProps}
                        onUpdate={(updates) => onLegUpdate(leg.id, updates)}
                        selectedDate={selectedDate}
                      />
                    </div>
                  )}
                </Draggable>
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

