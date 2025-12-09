import { subMonths } from "date-fns";
import isEqual from "lodash/isEqual";
import {
  CheckSquare,
  Clock,
  Stethoscope,
  Tag,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  FilterLiveForm,
  useGetIdentity,
  useGetList,
  useListContext,
} from "ra-core";

import { SearchInput } from "@/components/admin/search-input";
import { Badge } from "@/components/ui/badge";

import { FilterCategory } from "../filters/FilterCategory";
import { FilterOptionButton } from "../filters/FilterOptionButton";
import {
  buildInFilter,
  buildOverlapFilter,
  parseInFilter,
  parseOverlapFilter,
  RangeFilter,
  toggleValueInList,
} from "../filters/filterUtils";
import { useConfigurationContext } from "../root/ConfigurationContext";
import {
  crmEndOfYesterday,
  crmStartOfMonth,
  crmStartOfWeek,
} from "../misc/timezone";

export const ContactListFilter = () => {
  const { filterValues = {}, setFilters } = useListContext();
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
  const { data: salesData } = useGetList("sales", {
    pagination: { page: 1, perPage: 50 },
    sort: { field: "first_name", order: "ASC" },
  });

  const startOfWeek = crmStartOfWeek();
  const startOfMonth = crmStartOfMonth();
  const endOfYesterday = crmEndOfYesterday();
  const lastSeenRanges = Array.isArray(filterValues.last_seen_ranges)
    ? (filterValues.last_seen_ranges as RangeFilter[])
    : [];
  const selectedLeadStages = parseInFilter(filterValues["lead_stage@in"]);
  const selectedServices = parseOverlapFilter(
    filterValues["services_interested@ov"],
  );
  const selectedTags = parseOverlapFilter(filterValues["tags@ov"]);
  const selectedManagers = parseInFilter(filterValues["sales_id@in"]);
  const hasPendingTasks =
    typeof filterValues["nb_tasks@gt"] !== "undefined" &&
    filterValues["nb_tasks@gt"] !== null;

  const updateFilters = (changes: Record<string, unknown>) => {
    const next = { ...filterValues, ...changes };
    Object.entries(changes).forEach(([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        (Array.isArray(value) && value.length === 0)
      ) {
        delete next[key];
      }
    });
    setFilters(next);
  };

  const toggleLastSeenRange = (range: RangeFilter) => {
    const isSelected = lastSeenRanges.some((item) => isEqual(item, range));
    const nextRanges = isSelected
      ? lastSeenRanges.filter((item) => !isEqual(item, range))
      : [...lastSeenRanges, range];
    updateFilters({
      last_seen_ranges: nextRanges.length ? nextRanges : undefined,
    });
  };

  const toggleLeadStage = (value: string) => {
    const next = toggleValueInList(selectedLeadStages, value);
    updateFilters({ "lead_stage@in": buildInFilter(next) });
  };

  const toggleService = (id: number) => {
    const next = toggleValueInList(selectedServices, id);
    updateFilters({ "services_interested@ov": buildOverlapFilter(next) });
  };

  const toggleTag = (id: number) => {
    const next = toggleValueInList(selectedTags, id);
    updateFilters({ "tags@ov": buildOverlapFilter(next) });
  };

  const toggleManager = (id: string | number | undefined) => {
    if (typeof id === "undefined") return;
    const next = toggleValueInList(selectedManagers, id);
    updateFilters({ "sales_id@in": buildInFilter(next) });
  };

  const toggleTasks = () => {
    if (hasPendingTasks) {
      updateFilters({ "nb_tasks@gt": undefined });
    } else {
      updateFilters({ "nb_tasks@gt": 0 });
    }
  };

  const clearLastSeen = () => updateFilters({ last_seen_ranges: undefined });
  const clearStatuses = () => updateFilters({ "lead_stage@in": undefined });
  const clearServices = () =>
    updateFilters({ "services_interested@ov": undefined });
  const clearTags = () => updateFilters({ "tags@ov": undefined });
  const clearManagers = () => updateFilters({ "sales_id@in": undefined });

  return (
    <div className="w-52 min-w-52 order-first pt-0.75 flex flex-col gap-4">
      <FilterLiveForm>
        <SearchInput source="q" placeholder="Search name, company..." />
      </FilterLiveForm>

      <FilterCategory
        label="Last activity"
        icon={<Clock />}
        count={lastSeenRanges.length}
        onClear={clearLastSeen}
      >
        <FilterOptionButton
          label="Today"
          selected={lastSeenRanges.some((range) =>
            isEqual(range, {
              field: "last_seen",
              gte: endOfYesterday?.toISOString(),
            }),
          )}
          onToggle={() =>
            toggleLastSeenRange({
              field: "last_seen",
              gte: endOfYesterday?.toISOString(),
            })
          }
        />
        <FilterOptionButton
          label="This week"
          selected={lastSeenRanges.some((range) =>
            isEqual(range, {
              field: "last_seen",
              gte: startOfWeek?.toISOString(),
            }),
          )}
          onToggle={() =>
            toggleLastSeenRange({
              field: "last_seen",
              gte: startOfWeek?.toISOString(),
            })
          }
        />
        <FilterOptionButton
          label="Before this week"
          selected={lastSeenRanges.some((range) =>
            isEqual(range, {
              field: "last_seen",
              lte: startOfWeek?.toISOString(),
            }),
          )}
          onToggle={() =>
            toggleLastSeenRange({
              field: "last_seen",
              lte: startOfWeek?.toISOString(),
            })
          }
        />
        <FilterOptionButton
          label="Before this month"
          selected={lastSeenRanges.some((range) =>
            isEqual(range, {
              field: "last_seen",
              lte: startOfMonth?.toISOString(),
            }),
          )}
          onToggle={() =>
            toggleLastSeenRange({
              field: "last_seen",
              lte: startOfMonth?.toISOString(),
            })
          }
        />
        <FilterOptionButton
          label="Before last month"
          selected={lastSeenRanges.some((range) =>
            isEqual(range, {
              field: "last_seen",
              lte: subMonths(startOfMonth ?? new Date(), 1).toISOString(),
            }),
          )}
          onToggle={() =>
            toggleLastSeenRange({
              field: "last_seen",
              lte: subMonths(startOfMonth ?? new Date(), 1).toISOString(),
            })
          }
        />
      </FilterCategory>

      <FilterCategory
        label="Status"
        icon={<TrendingUp />}
        count={selectedLeadStages.length}
        onClear={clearStatuses}
      >
        {leadStages.map((stage) => (
          <FilterOptionButton
            key={stage.value}
            label={stage.label}
            selected={selectedLeadStages.includes(stage.value)}
            onToggle={() => toggleLeadStage(stage.value)}
          />
        ))}
      </FilterCategory>

      <FilterCategory
        label="Services interested in"
        icon={<Stethoscope />}
        count={selectedServices.length}
        onClear={clearServices}
      >
        {servicesData && servicesData.length > 0 ? (
          servicesData.map((service) => (
            <FilterOptionButton
              key={service.id}
              label={service.name}
              selected={selectedServices.includes(String(service.id))}
              onToggle={() => toggleService(service.id)}
            />
          ))
        ) : (
          <div className="text-xs text-muted-foreground">
            No services available
          </div>
        )}
      </FilterCategory>

      <FilterCategory
        label="Tags"
        icon={<Tag />}
        count={selectedTags.length}
        onClear={clearTags}
      >
        {data &&
          data.map((record) => (
            <FilterOptionButton
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
              selected={selectedTags.includes(String(record.id))}
              onToggle={() => toggleTag(record.id)}
            />
          ))}
      </FilterCategory>

      <FilterCategory
        icon={<CheckSquare />}
        label="Tasks"
        count={hasPendingTasks ? 1 : 0}
        onClear={() => updateFilters({ "nb_tasks@gt": undefined })}
      >
        <FilterOptionButton
          label={"With pending tasks"}
          selected={hasPendingTasks}
          onToggle={toggleTasks}
        />
      </FilterCategory>

      <FilterCategory
        icon={<Users />}
        label="Account Manager"
        count={selectedManagers.length}
        onClear={clearManagers}
      >
        <FilterOptionButton
          label={"Me"}
          selected={selectedManagers.includes(String(identity?.id))}
          onToggle={() => toggleManager(identity?.id)}
        />
        {salesData &&
          salesData
            .filter((manager) => manager.id !== identity?.id)
            .map((manager) => (
              <FilterOptionButton
                key={manager.id}
                label={`${manager.first_name} ${manager.last_name}`}
                selected={selectedManagers.includes(String(manager.id))}
                onToggle={() => toggleManager(manager.id)}
              />
            ))}
      </FilterCategory>
    </div>
  );
};
