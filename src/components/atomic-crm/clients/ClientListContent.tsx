import { formatRelative } from "date-fns";
import { RecordContextProvider, useListContext } from "ra-core";
import { type MouseEvent, useCallback } from "react";
import { Link } from "react-router";
import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

import type { Contact } from "../types";
import { TagsList } from "../contacts/TagsList";

export const ClientListContent = () => {
  const {
    data: clients,
    error,
    isPending,
    onToggleItem,
    selectedIds,
  } = useListContext<Contact>();
  const isSmall = useIsMobile();

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
      {clients.map((client) => (
        <RecordContextProvider key={client.id} value={client}>
          <Link
            to={`/clients/${client.id}/show`}
            className="flex flex-row gap-4 items-center px-4 py-2 hover:bg-muted transition-colors first:rounded-t-xl last:rounded-b-xl"
            onClick={handleLinkClick}
          >
            <Checkbox
              className="cursor-pointer"
              checked={selectedIds.includes(client.id)}
              onCheckedChange={() => onToggleItem(client.id)}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium flex items-center gap-2">
                {`${client.first_name} ${client.last_name ?? ""}`}
                <Badge variant="default" className="text-xs">
                  Client
                </Badge>
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
            {client.last_seen && (
              <div className="text-right ml-4">
                <div
                  className="text-sm text-muted-foreground"
                  title={client.last_seen}
                >
                  {!isSmall && "last activity "}
                  {formatRelative(client.last_seen, now)}
                </div>
              </div>
            )}
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
