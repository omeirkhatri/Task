import { RecordContextProvider, useListContext, useGetList } from "ra-core";
import { type MouseEvent, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router";
import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

import { Status } from "../misc/Status";
import type { Contact, Deal } from "../types";
import { TagsList } from "./TagsList";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { formatRelativeOrDate } from "../misc/timezone";

// Helper function to get badge color for lead stage
const getStageBadgeColor = (stage: string): string => {
  switch (stage) {
    case "new":
      return "bg-blue-500 hover:bg-blue-600";
    case "contacted":
      return "bg-yellow-500 hover:bg-yellow-600";
    case "quoted":
      return "bg-purple-500 hover:bg-purple-600";
    case "qualified":
      return "bg-green-500 hover:bg-green-600";
    case "not-qualified":
      return "bg-red-500 hover:bg-red-600";
    case "converted":
      return "bg-emerald-600 hover:bg-emerald-700";
    default:
      return "bg-gray-500 hover:bg-gray-600";
  }
};

export const ContactListContent = () => {
  const {
    data: contacts,
    error,
    isPending,
    onSelect,
    onToggleItem,
    selectedIds,
  } = useListContext<Contact>();
  const isSmall = useIsMobile();
  const { leadStages } = useConfigurationContext();
  const lastClickedIndexRef = useRef<number | null>(null);

  // Fetch all deals to get contact stages and identify clients
  const { data: allDeals } = useGetList<Deal>("lead-journey", {
    pagination: { page: 1, perPage: 10000 },
    sort: { field: "id", order: "ASC" },
    filter: { "archived_at@is": null, "lead_id@not.is": null },
  }, { enabled: !isPending });

  // Create a map of contact ID to deal stage
  const contactStageMap = useMemo(() => {
    if (!allDeals) return new Map<number | string, string>();
    const map = new Map<number | string, string>();
    allDeals.forEach((deal) => {
      if (deal.lead_id) {
        map.set(deal.lead_id, deal.stage);
      }
    });
    return map;
  }, [allDeals]);

  // Create a Set of client contact IDs for quick lookup
  const clientContactIds = useMemo(() => {
    if (!allDeals) return new Set<number | string>();
    return new Set(
      allDeals
        .filter((deal) => deal.stage === "converted")
        .map((deal) => deal.lead_id)
        .filter((id): id is number | string => id !== undefined && id !== null)
    );
  }, [allDeals]);

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
    (contactId: number | string, index: number, event: MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      
      if (event.shiftKey && lastClickedIndexRef.current !== null) {
        // Shift-click: select range from last clicked to current
        const start = Math.min(lastClickedIndexRef.current, index);
        const end = Math.max(lastClickedIndexRef.current, index);
        const rangeIds = contacts
          .slice(start, end + 1)
          .map((contact) => contact.id);
        
        // Click would toggle the current item, so apply the *toggled* state to the whole range.
        // Use onSelect (set selected IDs in one shot) to avoid flaky toggling/batching issues.
        const currentIsSelected = selectedIds.includes(contactId);
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
        onToggleItem(contactId);
      }
      lastClickedIndexRef.current = index;
    },
    [contacts, onSelect, onToggleItem, selectedIds],
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
      {contacts.map((contact, index) => (
        <RecordContextProvider key={contact.id} value={contact}>
          <Link
            to={`/contacts/${contact.id}/show`}
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
                checked={selectedIds.includes(contact.id)}
                // Use mousedown to reliably capture shiftKey with Radix checkbox
                onMouseDown={(e) => handleCheckboxClick(contact.id, index, e)}
                // Prevent Radix default click toggling; selection is controlled by react-admin
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium flex items-center gap-2">
                {`${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() || "New Lead"}
              </div>
              <div className="text-sm text-muted-foreground">
                {contact.title}
                {contact.title && contact.company_id != null && " at "}
                {contact.company_id != null && (
                  <ReferenceField
                    source="company_id"
                    reference="companies"
                    link={false}
                  >
                    <TextField source="name" />
                  </ReferenceField>
                )}
                {contact.nb_tasks
                  ? ` - ${contact.nb_tasks} task${
                      contact.nb_tasks > 1 ? "s" : ""
                    }`
                  : ""}
                &nbsp;&nbsp;
                <TagsList />
              </div>
            </div>
            {contact.last_seen && (
              <div className="text-right ml-4 flex items-center gap-2">
                {/* Lead Stage Badge */}
                {(() => {
                  const stage = contactStageMap.get(contact.id);
                  if (stage) {
                    const stageConfig = leadStages.find((s) => s.value === stage);
                    const label = stage === "converted" ? "Client" : (stageConfig?.label || stage);
                    return (
                      <Badge
                        variant="default"
                        className={`text-xs text-white ${getStageBadgeColor(stage)}`}
                      >
                        {label}
                      </Badge>
                    );
                  }
                  return null;
                })()}
                <div
                  className="text-sm text-muted-foreground"
                  title={contact.last_seen}
                >
                  {!isSmall && "last activity "}
                  {formatRelativeOrDate(contact.last_seen, new Date(now))}{" "}
                  <Status status={contact.status} />
                </div>
              </div>
            )}
          </Link>
        </RecordContextProvider>
      ))}

      {contacts.length === 0 && (
        <div className="p-4">
          <div className="text-muted-foreground">No contacts found</div>
        </div>
      )}
    </div>
  );
};
