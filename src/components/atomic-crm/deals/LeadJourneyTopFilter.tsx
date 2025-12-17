import { subMonths } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import { FilterLiveForm, useGetIdentity, useGetList, useListContext } from "ra-core";
import { ToggleFilterButton } from "@/components/admin/toggle-filter-button";
import { SearchInput } from "@/components/admin/search-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  crmEndOfYesterday,
  crmStartOfMonth,
  crmStartOfWeek,
} from "../misc/timezone";

export const LeadJourneyTopFilter = ({ 
  isExpanded 
}: { 
  isExpanded: boolean;
}) => {
  const { identity } = useGetIdentity();
  const { data: servicesData } = useGetList("services", {
    pagination: { page: 1, perPage: 50 },
    sort: { field: "name", order: "ASC" },
  });

  const { data: salesData } = useGetList("sales", {
    pagination: { page: 1, perPage: 50 },
    sort: { field: "first_name", order: "ASC" },
  });

  const startOfWeek = crmStartOfWeek();
  const startOfMonth = crmStartOfMonth();
  const endOfYesterday = crmEndOfYesterday();

  return (
    <>
      {/* Collapsible Filter Section */}
      {isExpanded && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Last Activity */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Last activity
                </div>
                <div className="flex flex-col gap-1">
                  <ToggleFilterButton
                    className="w-full justify-start"
                    label="Today"
                    value={{
                      "updated_at@gte": endOfYesterday?.toISOString(),
                      "updated_at@lte": undefined,
                    }}
                  />
                  <ToggleFilterButton
                    className="w-full justify-start"
                    label="This week"
                    value={{
                      "updated_at@gte": startOfWeek?.toISOString(),
                      "updated_at@lte": undefined,
                    }}
                  />
                  <ToggleFilterButton
                    className="w-full justify-start"
                    label="Before this week"
                    value={{
                      "updated_at@gte": undefined,
                      "updated_at@lte": startOfWeek?.toISOString(),
                    }}
                  />
                  <ToggleFilterButton
                    className="w-full justify-start"
                    label="Before this month"
                    value={{
                      "updated_at@gte": undefined,
                      "updated_at@lte": startOfMonth?.toISOString(),
                    }}
                  />
                  <ToggleFilterButton
                    className="w-full justify-start"
                    label="Before last month"
                    value={{
                      "updated_at@gte": undefined,
                      "updated_at@lte": subMonths(
                        startOfMonth ?? new Date(),
                        1,
                      ).toISOString(),
                    }}
                  />
                </div>
              </div>

              {/* Services */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Stethoscope className="h-4 w-4" />
                  Services
                </div>
                <div className="flex flex-col gap-1">
                  {servicesData &&
                    servicesData.map((service) => (
                      <ToggleFilterButton
                        key={service.id}
                        className="w-full justify-start"
                        label={service.name}
                        value={{ "services_interested@cs": `{${service.id}}` }}
                      />
                    ))}
                </div>
              </div>

              {/* Account Manager */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Account Manager
                </div>
                <div className="flex flex-col gap-1">
                  {salesData &&
                    salesData.map((sale) => (
                      <ToggleFilterButton
                        key={sale.id}
                        className="w-full justify-start"
                        label={`${sale.first_name} ${sale.last_name}`}
                        value={{ sales_id: sale.id }}
                      />
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export const LeadJourneySearchAndFilter = ({ 
  onFilterToggle, 
  isFilterExpanded 
}: { 
  onFilterToggle: () => void;
  isFilterExpanded: boolean;
}) => {
  const { filterValues, setFilters } = useListContext();

  const hasActiveFilters = filterValues && Object.keys(filterValues).length > 0 && 
    Object.keys(filterValues).some(key => key !== "archived_at@is" && key !== "stage@neq" && key !== "q");

  const clearAllFilters = () => {
    const baseFilter = { 
      "archived_at@is": null,
      "stage@neq": "deleted"
    };
    setFilters(baseFilter, {});
  };

  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 max-w-md">
        <FilterLiveForm>
          <SearchInput 
            source="q" 
            placeholder="Search name, company..."
          />
        </FilterLiveForm>
      </div>
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onFilterToggle}
        className="flex items-center gap-2"
      >
        <Filter className="h-4 w-4" />
        Filters
        {isFilterExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};
