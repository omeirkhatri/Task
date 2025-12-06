import { formatRelative } from "date-fns";
import { RecordContextProvider, useListContext, useGetList } from "ra-core";
import { type MouseEvent, useCallback, useMemo } from "react";
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

export const ContactListContent = () => {
  const {
    data: contacts,
    error,
    isPending,
    onToggleItem,
    selectedIds,
  } = useListContext<Contact>();
  const isSmall = useIsMobile();

  // Fetch all converted deals to identify clients
  const { data: convertedDeals } = useGetList<Deal>("lead-journey", {
    pagination: { page: 1, perPage: 10000 },
    sort: { field: "id", order: "ASC" },
    filter: { stage: "converted" },
  }, { enabled: !isPending });

  // Create a Set of client contact IDs for quick lookup
  const clientContactIds = useMemo(() => {
    if (!convertedDeals) return new Set<number | string>();
    return new Set(
      convertedDeals
        .map((deal) => deal.lead_id)
        .filter((id): id is number | string => id !== undefined && id !== null)
    );
  }, [convertedDeals]);

  // StopPropagation does not work for some reason on Checkbox, this handler is a workaround
  const handleLinkClick = useCallback(function handleLinkClick(
    e: MouseEvent<HTMLAnchorElement>,
  ) {
    if (e.target instanceof HTMLButtonElement) {
      e.preventDefault();
    }
  }, []);

  if (isPending) {
    return <Skeleton className="w-full h-9" />;
  }

  if (error) {
    return null;
  }
  const now = Date.now();

  return (
    <div className="divide-y">
      {contacts.map((contact) => (
        <RecordContextProvider key={contact.id} value={contact}>
          <Link
            to={`/contacts/${contact.id}/show`}
            className="flex flex-row gap-4 items-center px-4 py-2 hover:bg-muted transition-colors first:rounded-t-xl last:rounded-b-xl"
            onClick={handleLinkClick}
          >
            <Checkbox
              className="cursor-pointer"
              checked={selectedIds.includes(contact.id)}
              onCheckedChange={() => onToggleItem(contact.id)}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium flex items-center gap-2">
                {`${contact.first_name} ${contact.last_name ?? ""}`}
                {clientContactIds.has(contact.id) && (
                  <Badge variant="default" className="text-xs">
                    Client
                  </Badge>
                )}
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
              <div className="text-right ml-4">
                <div
                  className="text-sm text-muted-foreground"
                  title={contact.last_seen}
                >
                  {!isSmall && "last activity "}
                  {formatRelative(contact.last_seen, now)}{" "}
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
