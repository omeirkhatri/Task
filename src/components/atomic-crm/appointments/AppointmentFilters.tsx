import React, { useMemo } from "react";
import { Filter, X, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CustomMultiSelect, type MultiSelectOption } from "./CustomMultiSelect";
import type { AppointmentFilterState } from "./types";
import { APPOINTMENT_STATUSES } from "./types";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import type { Staff } from "../types";
import { useGetList } from "ra-core";
import { useAppointmentTypes } from "./useAppointmentTypes";

type AppointmentFiltersProps = {
  filters: AppointmentFilterState;
  onFiltersChange: (filters: AppointmentFilterState) => void;
  onApply: () => void;
};

const StatusIconMap: Record<string, React.ReactNode> = {
  scheduled: <Clock className="w-3 h-3" />,
  completed: <CheckCircle className="w-3 h-3" />,
  cancelled: <XCircle className="w-3 h-3" />,
};

// Sidebar filter component - always visible, not collapsible
export const AppointmentFiltersSidebar: React.FC<AppointmentFiltersProps> = ({
  filters,
  onFiltersChange,
  onApply,
}) => {
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
    <Card className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-full flex flex-col">
      <CardHeader className="px-3 py-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Filters</span>
            {activeFilterCount > 0 && (
              <Badge className="bg-blue-600 text-white text-xs font-medium px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-3 flex-1 overflow-y-auto">
        <div className="space-y-3">
          {/* Staff Member Filter */}
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
              Staff Member
            </label>
            <CustomMultiSelect
              options={staffOptions}
              selected={filters.staffIds}
              onChange={(selected) =>
                onFiltersChange({ ...filters, staffIds: selected })
              }
              placeholder="Select staff..."
            />
          </div>

          {/* Appointment Type Filter */}
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
              Appointment Type
            </label>
            <CustomMultiSelect
              options={appointmentTypeOptions}
              selected={filters.appointmentTypes}
              onChange={(selected) =>
                onFiltersChange({ ...filters, appointmentTypes: selected })
              }
              placeholder="Select type..."
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
              Status
            </label>
            <CustomMultiSelect
              options={statusOptions}
              selected={filters.statuses}
              onChange={(selected) =>
                onFiltersChange({ ...filters, statuses: selected })
              }
              placeholder="Select status..."
            />
          </div>

          {/* Date Range Filters */}
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
                  className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="To date"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Apply Button - Fixed at bottom */}
      <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
        <Button
          onClick={onApply}
          className="w-full px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm font-medium"
        >
          Apply Filters
        </Button>
      </div>
    </Card>
  );
};
