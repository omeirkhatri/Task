import { useListContext } from "ra-core";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Staff } from "../types";

export const StaffListFilter = () => {
  const { filterValues = {}, setFilters } = useListContext<Staff>();

  const handleStaffTypeChange = (value: string) => {
    if (value === "all") {
      const newFilters = { ...filterValues };
      delete newFilters.staff_type;
      setFilters(newFilters);
    } else {
      setFilters({ ...filterValues, staff_type: value });
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasFilters = Object.keys(filterValues).length > 0;

  return (
    <div className="flex items-center gap-2">
      <Select
        value={(filterValues.staff_type as string) || "all"}
        onValueChange={handleStaffTypeChange}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Roles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          <SelectItem value="Doctor">Doctor</SelectItem>
          <SelectItem value="Nurse">Nurse</SelectItem>
          <SelectItem value="Physiotherapist">Physiotherapist</SelectItem>
          <SelectItem value="Caregiver">Caregiver</SelectItem>
          <SelectItem value="Management">Management</SelectItem>
          <SelectItem value="Driver">Driver</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="outline" onClick={clearFilters}>
          Clear Filters
        </Button>
      )}
    </div>
  );
};

