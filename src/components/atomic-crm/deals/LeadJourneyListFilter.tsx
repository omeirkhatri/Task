import { subMonths } from "date-fns";
import {
  CheckSquare,
  Clock,
  Stethoscope,
  Tag,
  TrendingUp,
  Users,
} from "lucide-react";
import { FilterLiveForm, useGetIdentity, useGetList } from "ra-core";
import { ToggleFilterButton } from "@/components/admin/toggle-filter-button";
import { SearchInput } from "@/components/admin/search-input";
import { Badge } from "@/components/ui/badge";

import { FilterCategory } from "../filters/FilterCategory";
import { Status } from "../misc/Status";
import { useConfigurationContext } from "../root/ConfigurationContext";
import {
  crmEndOfYesterday,
  crmStartOfMonth,
  crmStartOfWeek,
} from "../misc/timezone";

export const LeadJourneyListFilter = () => {
  const { noteStatuses, leadStages } = useConfigurationContext();
  const { identity } = useGetIdentity();
  const { data } = useGetList("tags", {
    pagination: { page: 1, perPage: 10 },
    sort: { field: "name", order: "ASC" },
  });
  const { data: servicesData } = useGetList("services", {
    pagination: { page: 1, perPage: 50 },
    sort: { field: "name", order: "ASC" },
  });
  const startOfWeek = crmStartOfWeek();
  const startOfMonth = crmStartOfMonth();
  const endOfYesterday = crmEndOfYesterday();

  return (
    <div className="w-52 min-w-52 order-first pt-0.75 flex flex-col gap-4">
      <FilterLiveForm>
        <SearchInput source="q" placeholder="Search name, company..." />
      </FilterLiveForm>

      <FilterCategory label="Last activity" icon={<Clock />}>
        <ToggleFilterButton
          className="w-full justify-between"
          label="Today"
          value={{
            "updated_at@gte": endOfYesterday?.toISOString(),
            "updated_at@lte": undefined,
          }}
        />
        <ToggleFilterButton
          className="w-full justify-between"
          label="This week"
          value={{
            "updated_at@gte": startOfWeek?.toISOString(),
            "updated_at@lte": undefined,
          }}
        />
        <ToggleFilterButton
          className="w-full justify-between"
          label="Before this week"
          value={{
            "updated_at@gte": undefined,
            "updated_at@lte": startOfWeek?.toISOString(),
          }}
        />
        <ToggleFilterButton
          className="w-full justify-between"
          label="Before this month"
          value={{
            "updated_at@gte": undefined,
            "updated_at@lte": startOfMonth?.toISOString(),
          }}
        />
        <ToggleFilterButton
          className="w-full justify-between"
          label="Before last month"
          value={{
            "updated_at@gte": undefined,
            "updated_at@lte": subMonths(
              startOfMonth ?? new Date(),
              1,
            ).toISOString(),
          }}
        />
      </FilterCategory>

      <FilterCategory label="Stage" icon={<TrendingUp />}>
        {leadStages.map((stage) => (
          <ToggleFilterButton
            key={stage.value}
            className="w-full justify-between"
            label={stage.label}
            value={{ stage: stage.value }}
          />
        ))}
      </FilterCategory>

      <FilterCategory icon={<Users />} label="Account Manager">
        <ToggleFilterButton
          className="w-full justify-between"
          label={"Me"}
          value={{ sales_id: identity?.id }}
        />
      </FilterCategory>
    </div>
  );
};

