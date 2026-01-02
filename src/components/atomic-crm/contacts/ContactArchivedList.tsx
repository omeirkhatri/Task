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

interface ContactArchivedListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ContactArchivedList = ({ open, onOpenChange }: ContactArchivedListProps) => {
  const { identity } = useGetIdentity();
  const {
    data: archivedContacts,
    total,
    isPending,
  } = useGetList<Contact>("contacts", {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: "archived_at", order: "DESC" },
    filter: { "archived_at@not.is": null },
  });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isPending && total === 0) {
      onOpenChange(false);
    }
  }, [isPending, total, onOpenChange]);

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    if (!archivedContacts || !searchQuery.trim()) return archivedContacts || [];
    
    const query = searchQuery.toLowerCase();
    return archivedContacts.filter((contact: Contact) => {
      const firstName = contact.first_name?.toLowerCase() || "";
      const lastName = contact.last_name?.toLowerCase() || "";
      const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
      const title = contact.title?.toLowerCase() || "";
      const companyName = contact.company_name?.toLowerCase() || "";
      return fullName.includes(query) || title.includes(query) || companyName.includes(query);
    });
  }, [archivedContacts, searchQuery]);

  // Group filtered archived contacts by date
  const archivedContactsByDate: { [date: string]: Contact[] } = useMemo(() => {
    if (!filteredContacts || filteredContacts.length === 0) return {};
    return filteredContacts.reduce(
      (acc, contact) => {
        const date = contact.archived_at ? new Date(contact.archived_at).toDateString() : "Unknown";
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(contact);
        return acc;
      },
      {} as { [date: string]: Contact[] },
    );
  }, [filteredContacts]);

  if (!identity || isPending || !total || !archivedContacts) return null;

  return (
    <div className="w-full flex flex-row items-center justify-center">
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="lg:max-w-4xl overflow-y-auto max-h-9/10 top-1/20 translate-y-0">
          <DialogTitle>Archived Leads</DialogTitle>
          <DialogDescription>
            View and search through archived leads
          </DialogDescription>
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search archived leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {Object.keys(archivedContactsByDate).length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No archived leads found
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {Object.entries(archivedContactsByDate).map(([date, contacts]) => (
                  <div key={date} className="flex flex-col gap-4">
                    <h4 className="font-bold">{getRelativeTimeString(date)}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                      {contacts.map((contact: Contact) => (
                        <div key={contact.id}>
                          <ArchivedContactCard contact={contact} />
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
  const date = new Date(dateString);
  
  // Validate date is valid
  if (isNaN(date.getTime())) {
    return dateString; // Return original string if invalid
  }
  
  date.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diff = date.getTime() - today.getTime();
  const unitDiff = Math.round(diff / (1000 * 60 * 60 * 24));

  // Validate unitDiff is a finite number
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

const ArchivedContactCard = ({ contact }: { contact: Contact }) => {
  const redirect = useRedirect();
  
  const archivedDate = contact.archived_at ? formatCrmDate(contact.archived_at) : null;
  
  const handleClick = () => {
    redirect(`/contacts/${contact.id}/show`, undefined, undefined, undefined, {
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
              {`${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "New Lead"}
            </p>
            {contact.title && (
              <p className="text-xs text-muted-foreground">
                {contact.title}
                {contact.company_name && ` at ${contact.company_name}`}
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
