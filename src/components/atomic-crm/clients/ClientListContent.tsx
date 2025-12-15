import { RecordContextProvider, useListContext } from "ra-core";
import { type MouseEvent, useCallback, useRef } from "react";
import { Link } from "react-router";
import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

import type { Contact } from "../types";
import { TagsList } from "../contacts/TagsList";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { formatRelativeOrDate } from "../misc/timezone";

export const ClientListContent = () => {
  const {
    data: clients,
    error,
    isPending,
    onSelect,
    onToggleItem,
    selectedIds,
  } = useListContext<Contact>();
  const isSmall = useIsMobile();
  const lastClickedIndexRef = useRef<number | null>(null);

  // StopPropagation does not work for some reason on Checkbox, this handler is a workaround
  const handleLinkClick = useCallback(function handleLinkClick(
    e: MouseEvent<HTMLAnchorElement>,
  ) {
    // Prevent navigation if clicking on checkbox or if shift key is pressed
    if (
      e.target instanceof HTMLButtonElement ||
      (e.target as HTMLElement).closest('[data-slot="checkbox"]') ||
      e.shiftKey
    ) {
      e.preventDefault();
    }
  }, []);

  const handleCheckboxClick = useCallback(
    (clientId: number | string, index: number, event: MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      
      if (event.shiftKey && lastClickedIndexRef.current !== null) {
        // Shift-click: select range from last clicked to current
        const start = Math.min(lastClickedIndexRef.current, index);
        const end = Math.max(lastClickedIndexRef.current, index);
        const rangeIds = clients
          .slice(start, end + 1)
          .map((client) => client.id);
        
        // Click would toggle the current item, so apply the *toggled* state to the whole range.
        // Use onSelect (set selected IDs in one shot) to avoid flaky toggling/batching issues.
        const currentIsSelected = selectedIds.includes(clientId);
        const targetIsSelected = !currentIsSelected;

        if (onSelect) {
          const rangeSet = new Set(rangeIds);
          const selectedSet = new Set(selectedIds);
          if (targetIsSelected) {
            rangeIds.forEach((id) => selectedSet.add(id));
          } else {
            selectedIds.forEach((id) => {
              if (rangeSet.has(id)) selectedSet.delete(id);
            });
          }
          onSelect(Array.from(selectedSet));
        } else {
          // Fallback (should rarely happen): toggle items to match target state
          rangeIds.forEach((id) => {
            const isSelected = selectedIds.includes(id);
            if (isSelected !== targetIsSelected) {
              onToggleItem(id);
            }
          });
        }
      } else {
        // Normal click: toggle single item
        onToggleItem(clientId);
      }
      lastClickedIndexRef.current = index;
    },
    [clients, onSelect, onToggleItem, selectedIds],
  );

  if (isPending) {
    return <Skeleton className="w-full h-9" />;
  }

  if (error) {
    return null;
  }
  const now = Date.now();

  return (
    <div className="divide-y">
      {clients.map((client, index) => (
        <RecordContextProvider key={client.id} value={client}>
          <Link
            to={`/clients/${client.id}/show`}
            className="flex flex-row gap-4 items-center px-4 py-2 hover:bg-muted transition-colors first:rounded-t-xl last:rounded-b-xl"
            onClick={handleLinkClick}
          >
            <div 
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <Checkbox
                className="cursor-pointer"
                checked={selectedIds.includes(client.id)}
                // Use mousedown to reliably capture shiftKey with Radix checkbox
                onMouseDown={(e) => handleCheckboxClick(client.id, index, e)}
                // Prevent Radix default click toggling; selection is controlled by react-admin
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium flex items-center gap-2">
                {`${client.first_name ?? ""} ${client.last_name ?? ""}`.trim() || "New Lead"}
              </div>
              <div className="text-sm text-muted-foreground">
                {client.title}
                {client.title && client.company_id != null && " at "}
                {client.company_id != null && (
                  <ReferenceField
                    source="company_id"
                    reference="companies"
                    link={false}
                  >
                    <TextField source="name" />
                  </ReferenceField>
                )}
                {client.nb_tasks
                  ? ` - ${client.nb_tasks} task${
                      client.nb_tasks > 1 ? "s" : ""
                    }`
                  : ""}
                &nbsp;&nbsp;
                <TagsList />
              </div>
            </div>
            <div className="text-right ml-4 flex items-center gap-2">
              <Badge variant="default" className="text-xs text-white bg-emerald-600 hover:bg-emerald-700">
                Client
              </Badge>
              {client.last_seen && (
                <div
                  className="text-sm text-muted-foreground"
                  title={client.last_seen}
                >
                  {!isSmall && "last activity "}
                  {formatRelativeOrDate(client.last_seen, new Date(now))}
                </div>
              )}
            </div>
          </Link>
        </RecordContextProvider>
      ))}

      {clients.length === 0 && (
        <div className="p-4">
          <div className="text-muted-foreground">No clients found</div>
        </div>
      )}
    </div>
  );
};
