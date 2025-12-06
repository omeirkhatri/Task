import { subMonths } from "date-fns";
import { CheckSquare, Clock, Stethoscope, Tag, TrendingUp, Users } from "lucide-react";
import { FilterLiveForm, useGetIdentity, useGetList } from "ra-core";
import { ToggleFilterButton } from "@/components/admin/toggle-filter-button";
import { SearchInput } from "@/components/admin/search-input";
import { Badge } from "@/components/ui/badge";

import { FilterCategory } from "../filters/FilterCategory";
import { useConfigurationContext } from "../root/ConfigurationContext";
import {
  crmEndOfYesterday,
  crmStartOfMonth,
  crmStartOfWeek,
} from "../misc/timezone";

export const ContactListFilter = () => {
  const { leadStages } = useConfigurationContext();
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
            "last_seen@gte": endOfYesterday?.toISOString(),
            "last_seen@lte": undefined,
          }}
        />
        <ToggleFilterButton
          className="w-full justify-between"
          label="This week"
          value={{
            "last_seen@gte": startOfWeek?.toISOString(),
            "last_seen@lte": undefined,
          }}
        />
        <ToggleFilterButton
          className="w-full justify-between"
          label="Before this week"
          value={{
            "last_seen@gte": undefined,
            "last_seen@lte": startOfWeek?.toISOString(),
          }}
        />
        <ToggleFilterButton
          className="w-full justify-between"
          label="Before this month"
          value={{
            "last_seen@gte": undefined,
            "last_seen@lte": startOfMonth?.toISOString(),
          }}
        />
        <ToggleFilterButton
          className="w-full justify-between"
          label="Before last month"
          value={{
            "last_seen@gte": undefined,
            "last_seen@lte": subMonths(
              startOfMonth ?? new Date(),
              1,
            ).toISOString(),
          }}
        />
      </FilterCategory>

      <FilterCategory label="Status" icon={<TrendingUp />}>
        {leadStages.map((stage) => (
          <ToggleFilterButton
            key={stage.value}
            className="w-full justify-between"
            label={stage.label}
            value={{ lead_stage: stage.value }}
          />
        ))}
      </FilterCategory>

      <FilterCategory label="Services interested in" icon={<Stethoscope />}>
        {servicesData &&
          servicesData.map((service) => (
            <ToggleFilterButton
              key={service.id}
              className="w-full justify-between"
              label={service.name}
              value={{ "services_interested@cs": `{${service.id}}` }}
            />
          ))}
      </FilterCategory>

      <FilterCategory label="Tags" icon={<Tag />}>
        {data &&
          data.map((record) => (
            <ToggleFilterButton
              className="w-full justify-between"
              key={record.id}
              label={
                <Badge
                  variant="secondary"
                  className="text-black text-xs font-normal cursor-pointer"
                  style={{
                    backgroundColor: record?.color,
                  }}
                >
                  {record?.name}
                </Badge>
              }
              value={{ "tags@cs": `{${record.id}}` }}
            />
          ))}
      </FilterCategory>

      <FilterCategory icon={<CheckSquare />} label="Tasks">
        <ToggleFilterButton
          className="w-full justify-between"
          label={"With pending tasks"}
          value={{ "nb_tasks@gt": 0 }}
        />
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
