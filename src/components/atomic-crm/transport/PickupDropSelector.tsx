/**
 * PickupDropSelector Component
 * 
 * Dropdown component for selecting Office/Home/Metro for staff pickup/drop locations.
 */

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Home, Train } from "lucide-react";

type PickupDropSelectorProps = {
  value: "office" | "home" | "metro";
  onChange: (value: "office" | "home" | "metro") => void;
  disabled?: boolean;
};

export const PickupDropSelector: React.FC<PickupDropSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <Select
      value={value}
      onValueChange={(val) => onChange(val as "office" | "home" | "metro")}
      disabled={disabled}
    >
      <SelectTrigger className="w-32 h-8 text-xs">
        <SelectValue>
          <div className="flex items-center gap-1.5">
            {value === "office" && <Building2 className="w-3 h-3" />}
            {value === "home" && <Home className="w-3 h-3" />}
            {value === "metro" && <Train className="w-3 h-3" />}
            <span className="capitalize">{value}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="office">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span>Office</span>
          </div>
        </SelectItem>
        <SelectItem value="home">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            <span>Home</span>
          </div>
        </SelectItem>
        <SelectItem value="metro">
          <div className="flex items-center gap-2">
            <Train className="w-4 h-4" />
            <span>Metro</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

