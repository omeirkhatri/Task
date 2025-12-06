import { X, Plus } from "lucide-react";
import {
  useGetList,
  useGetMany,
  useRecordContext,
  useUpdate,
  type Identifier,
} from "ra-core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { Contact, Service } from "../types";

export const ServicesListEdit = () => {
  const record = useRecordContext<Contact>();

  const { data: allServices, isPending: isPendingAllServices } = useGetList<Service>(
    "services",
    {
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "name", order: "ASC" },
    },
  );
  const { data: services, isPending: isPendingRecordServices } = useGetMany<Service>(
    "services",
    { ids: record?.services_interested || [] },
    { enabled: record && record.services_interested && record.services_interested.length > 0 },
  );
  const [update] = useUpdate<Contact>();

  const unselectedServices =
    allServices && record && record.services_interested
      ? allServices.filter((service) => !record.services_interested.includes(service.id))
      : allServices;

  const handleServiceAdd = (id: Identifier) => {
    if (!record) {
      throw new Error("No contact record found");
    }
    const services_interested = [...(record.services_interested || []), id];
    update("contacts", {
      id: record.id,
      data: { services_interested },
      previousData: record,
    });
  };

  const handleServiceDelete = async (id: Identifier) => {
    if (!record) {
      throw new Error("No contact record found");
    }
    const services_interested = (record.services_interested || []).filter((serviceId) => serviceId !== id);
    await update("contacts", {
      id: record.id,
      data: { services_interested },
      previousData: record,
    });
  };

  if (isPendingRecordServices || isPendingAllServices) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {services?.map((service) => (
        <Badge
          key={service.id}
          variant="secondary"
          className="text-xs font-normal pr-1"
        >
          {service.name}
          <button
            onClick={() => handleServiceDelete(service.id)}
            className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
            aria-label={`Remove ${service.name}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {unselectedServices && unselectedServices.length > 0 && (
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 cursor-pointer">
                <Plus className="h-3 w-3 mr-1" />
                Add service
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {unselectedServices.map((service) => (
                <DropdownMenuItem
                  key={service.id}
                  onClick={() => handleServiceAdd(service.id)}
                >
                  {service.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};

