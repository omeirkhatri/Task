import { RecordContextProvider, useListContext } from "ra-core";
import { Link } from "react-router";
import { TextField } from "@/components/admin/text-field";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail } from "lucide-react";
import type { Staff } from "../types";

const staffTypeColors: Record<string, string> = {
  Doctor: "bg-blue-500 hover:bg-blue-600",
  Nurse: "bg-green-500 hover:bg-green-600",
  Physiotherapist: "bg-purple-500 hover:bg-purple-600",
  Caregiver: "bg-orange-500 hover:bg-orange-600",
  Management: "bg-indigo-500 hover:bg-indigo-600",
  Driver: "bg-gray-500 hover:bg-gray-600",
};

export const StaffListContent = () => {
  const {
    data: staff,
    isPending,
    onSelect,
    onToggleItem,
    selectedIds,
  } = useListContext<Staff>();

  if (isPending) {
    return (
      <div className="p-4">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!staff || staff.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>No staff members found. Click "+ Add Staff" to create your first staff member.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="p-4 text-left w-12">
              <Checkbox
                checked={selectedIds?.length === staff.length && staff.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    staff.forEach((s) => onSelect(s.id));
                  } else {
                    staff.forEach((s) => onToggleItem(s.id));
                  }
                }}
              />
            </th>
            <th className="p-4 text-left font-medium">Staff Member</th>
            <th className="p-4 text-left font-medium">Role</th>
            <th className="p-4 text-left font-medium">Contact</th>
            <th className="p-4 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => (
            <RecordContextProvider key={member.id} value={member}>
              <StaffRow member={member} selectedIds={selectedIds} onToggleItem={onToggleItem} />
            </RecordContextProvider>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const StaffRow = ({
  member,
  selectedIds,
  onToggleItem,
}: {
  member: Staff;
  selectedIds?: (string | number)[];
  onToggleItem: (id: string | number) => void;
}) => {
  const isSelected = selectedIds?.includes(member.id);
  const fullName = `${member.first_name} ${member.last_name}`.trim();

  return (
    <tr className="border-b hover:bg-muted/50 transition-colors">
      <td className="p-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleItem(member.id)}
          onClick={(e) => e.stopPropagation()}
        />
      </td>
      <td className="p-4">
        <Link
          to={`/staff/${member.id}/show`}
          className="hover:underline font-medium"
        >
          {fullName}
        </Link>
        {member.email && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <Mail className="h-3 w-3" />
            <span>{member.email}</span>
          </div>
        )}
      </td>
      <td className="p-4">
        <Badge
          className={staffTypeColors[member.staff_type] || "bg-gray-500"}
        >
          {member.staff_type || "Unknown"}
        </Badge>
      </td>
      <td className="p-4">
        <div className="flex items-center gap-1 text-sm">
          <Phone className="h-3 w-3 text-muted-foreground" />
          <span>{member.phone}</span>
        </div>
      </td>
      <td className="p-4">
        <Link
          to={`/staff/${member.id}/edit`}
          className="text-sm text-primary hover:underline"
        >
          Edit
        </Link>
      </td>
    </tr>
  );
};

