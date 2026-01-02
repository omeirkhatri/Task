import React, { useMemo, useState } from "react";
import { Filter, X, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CustomMultiSelect, type MultiSelectOption } from "./CustomMultiSelect";
import type { AppointmentFilterState } from "./types";
import { APPOINTMENT_STATUSES } from "./types";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import type { Staff } from "../types";
import { useGetList } from "ra-core";
import { useAppointmentTypes } from "./useAppointmentTypes";

type AppointmentFiltersTopProps = {
  filters: AppointmentFilterState;
  onFiltersChange: (filters: AppointmentFilterState) => void;
  onApply: () => void;
};

const StatusIconMap: Record<string, React.ReactNode> = {
  scheduled: <Clock className="w-3 h-3" />,
  completed: <CheckCircle className="w-3 h-3" />,
  cancelled: <XCircle className="w-3 h-3" />,
};

export const AppointmentFiltersTop: React.FC<AppointmentFiltersTopProps> = ({
  filters,
  onFiltersChange,
  onApply,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { data: staffData } = useGetList<Staff>("staff", {
    pagination: { page: 1, perPage: 1000 },
  }, {
    retry: false,
    enabled: true,
    onError: (error) => {
      console.warn("Failed to load staff for filters:", error);
    },
  });

  const appointmentTypes = useAppointmentTypes();

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.staffIds.length > 0) count++;
    if (filters.appointmentTypes.length > 0) count++;
    if (filters.statuses.length > 0) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    return count;
  }, [filters]);

  const staffOptions: MultiSelectOption[] = useMemo(() => {
    if (!staffData) return [];
    return staffData.map((staff) => ({
      value: staff.id.toString(),
      label: `${staff.first_name} ${staff.last_name} (${staff.staff_type})`,
      color: "#6b7280",
    }));
  }, [staffData]);

  const appointmentTypeOptions: MultiSelectOption[] = useMemo(() => {
    return appointmentTypes.map((type) => ({
      value: type.value,
      label: type.label,
      color: type.color,
      serviceId: type.serviceId,
    }));
  }, [appointmentTypes]);

  const statusOptions: MultiSelectOption[] = useMemo(() => {
    return APPOINTMENT_STATUSES.map((status) => ({
      value: status.value,
      label: status.label,
      color: status.color,
      icon: StatusIconMap[status.value],
    }));
  }, []);

  const handleClear = () => {
    onFiltersChange({
      staffIds: [],
      appointmentTypes: [],
      statuses: [],
      dateFrom: null,
      dateTo: null,
    });
  };

  return (
    <div className="bg-transparent">
      {/* Collapsed Header - Single Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 px-2"
          >
            <Filter className="w-4 h-4 mr-1" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 ml-1" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-1" />
            )}
          </Button>
          
          {/* Active filters summary when collapsed */}
          {!isExpanded && activeFilterCount > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {filters.staffIds.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {filters.staffIds.length} staff
                </Badge>
              )}
              {filters.appointmentTypes.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {filters.appointmentTypes.length} types
                </Badge>
              )}
              {filters.statuses.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {filters.statuses.length} statuses
                </Badge>
              )}
              {(filters.dateFrom || filters.dateTo) && (
                <Badge variant="outline" className="text-xs">
                  Date range
                </Badge>
              )}
            </div>
          )}
        </div>
        
        {!isExpanded && activeFilterCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-8 px-2 text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Staff Filter */}
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                Staff
              </label>
              <CustomMultiSelect
                options={staffOptions}
                selectedValues={filters.staffIds}
                onChange={(values) =>
                  onFiltersChange({ ...filters, staffIds: values })
                }
                placeholder="Select staff"
              />
            </div>

            {/* Appointment Type Filter */}
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                Appointment Type
              </label>
              <CustomMultiSelect
                options={appointmentTypeOptions}
                selectedValues={filters.appointmentTypes}
                onChange={(values) =>
                  onFiltersChange({ ...filters, appointmentTypes: values })
                }
                placeholder="Select types"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                Status
              </label>
              <CustomMultiSelect
                options={statusOptions}
                selectedValues={filters.statuses}
                onChange={(values) =>
                  onFiltersChange({ ...filters, statuses: values })
                }
                placeholder="Select statuses"
              />
            </div>

            {/* Date Range */}
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                Date Range
              </label>
              <div className="space-y-1.5">
                <div className="relative">
                  <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                  <Input
                    type="date"
                    value={filters.dateFrom || ""}
                    onChange={(e) =>
                      onFiltersChange({ ...filters, dateFrom: e.target.value || null })
                    }
                    className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    placeholder="From date"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                  <Input
                    type="date"
                    value={filters.dateTo || ""}
                    onChange={(e) =>
                      onFiltersChange({ ...filters, dateTo: e.target.value || null })
                    }
                    className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    placeholder="To date"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              Clear All
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onApply();
                  setIsExpanded(false);
                }}
                className="text-xs"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

