/* eslint-disable react-refresh/only-export-components */
import { useGetIdentity, useGetList } from "ra-core";
import { useEffect, useState, useMemo } from "react";
import { useRedirect } from "ra-core";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";

import type { Contact } from "../types";
import { formatCrmDate } from "../misc/timezone";

interface ClientArchivedListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ClientArchivedList = ({ open, onOpenChange }: ClientArchivedListProps) => {
  const { identity } = useGetIdentity();
  const {
    data: archivedClients,
    total,
    isPending,
  } = useGetList<Contact>("contacts", {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: "archived_at", order: "DESC" },
    filter: { 
      "archived_at@not.is": null,
      isClient: true 
    },
  });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isPending && total === 0) {
      onOpenChange(false);
    }
  }, [isPending, total, onOpenChange]);

  // Filter clients by search query
  const filteredClients = useMemo(() => {
    if (!archivedClients || !searchQuery.trim()) return archivedClients || [];
    
    const query = searchQuery.toLowerCase();
    return archivedClients.filter((client: Contact) => {
      const firstName = client.first_name?.toLowerCase() || "";
      const lastName = client.last_name?.toLowerCase() || "";
      const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
      const title = client.title?.toLowerCase() || "";
      const companyName = client.company_name?.toLowerCase() || "";
      return fullName.includes(query) || title.includes(query) || companyName.includes(query);
    });
  }, [archivedClients, searchQuery]);

  // Group filtered archived clients by date
  const archivedClientsByDate: { [date: string]: Contact[] } = useMemo(() => {
    if (!filteredClients || filteredClients.length === 0) return {};
    return filteredClients.reduce(
      (acc, client) => {
        const date = client.archived_at ? new Date(client.archived_at).toDateString() : "Unknown";
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(client);
        return acc;
      },
      {} as { [date: string]: Contact[] },
    );
  }, [filteredClients]);

  if (!identity || isPending || !total || !archivedClients) return null;

  return (
    <div className="w-full flex flex-row items-center justify-center">
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="lg:max-w-4xl overflow-y-auto max-h-9/10 top-1/20 translate-y-0">
          <DialogTitle>Archived Clients</DialogTitle>
          <DialogDescription>
            View and search through archived clients
          </DialogDescription>
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search archived clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {Object.keys(archivedClientsByDate).length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No archived clients found
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {Object.entries(archivedClientsByDate).map(([date, clients]) => (
                  <div key={date} className="flex flex-col gap-4">
                    <h4 className="font-bold">{getRelativeTimeString(date)}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                      {clients.map((client: Contact) => (
                        <div key={client.id}>
                          <ArchivedClientCard client={client} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export function getRelativeTimeString(dateString: string): string {
  // Handle "Unknown" or invalid date strings
  if (dateString === "Unknown" || !dateString) {
    return "Unknown";
  }

  const date = new Date(dateString);
  
  // Check if date is invalid
  if (isNaN(date.getTime())) {
    return dateString; // Return the original string if date is invalid
  }

  date.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diff = date.getTime() - today.getTime();
  const unitDiff = Math.round(diff / (1000 * 60 * 60 * 24));

  // Check if unitDiff is not a finite number
  if (!isFinite(unitDiff)) {
    return formatCrmDate(date);
  }

  // Check if the date is more than one week old
  if (Math.abs(unitDiff) > 7) {
    return formatCrmDate(date);
  }

  // Intl.RelativeTimeFormat for dates within the last week
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  return ucFirst(rtf.format(unitDiff, "day"));
}

function ucFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const ArchivedClientCard = ({ client }: { client: Contact }) => {
  const redirect = useRedirect();
  
  const archivedDate = client.archived_at ? formatCrmDate(client.archived_at) : null;
  
  const handleClick = () => {
    redirect(`/clients/${client.id}/show`, undefined, undefined, undefined, {
      _scrollToTop: false,
    });
  };

  return (
    <div
      className="cursor-pointer"
      onClick={handleClick}
    >
      <Card className="py-4 transition-all duration-200 shadow-sm hover:shadow-md">
        <CardContent className="px-4 flex">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium mb-1">
              {`${client.first_name || ""} ${client.last_name || ""}`.trim() || "New Client"}
            </p>
            {client.title && (
              <p className="text-xs text-muted-foreground">
                {client.title}
                {client.company_name && ` at ${client.company_name}`}
              </p>
            )}
            {archivedDate && (
              <p className="text-xs text-muted-foreground mt-1">
                Archived {archivedDate}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
