import { ShowBase, useShowContext } from "ra-core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Phone, Mail } from "lucide-react";
import { Link } from "react-router";
import type { Staff } from "../types";

const staffTypeColors: Record<string, string> = {
  Doctor: "bg-blue-500 hover:bg-blue-600",
  Nurse: "bg-green-500 hover:bg-green-600",
  Physiotherapist: "bg-purple-500 hover:bg-purple-600",
  Caregiver: "bg-orange-500 hover:bg-orange-600",
  Management: "bg-indigo-500 hover:bg-indigo-600",
  Driver: "bg-gray-500 hover:bg-gray-600",
};

export const StaffShow = () => {
  return (
    <ShowBase>
      <StaffShowContent />
    </ShowBase>
  );
};

const StaffShowContent = () => {
  const { record, isPending } = useShowContext<Staff>();

  if (isPending || !record) {
    return (
      <div className="mt-2 flex justify-center">
        <div className="w-[90%] max-w-2xl">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-8 bg-muted animate-pulse rounded w-1/3" />
                <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const fullName = `${record.first_name} ${record.last_name}`.trim();

  return (
    <div className="mt-2 flex justify-center">
      <div className="w-[90%] max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{fullName}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge
                    className={staffTypeColors[record.staff_type] || "bg-gray-500"}
                  >
                    {record.staff_type || "Unknown"}
                  </Badge>
                </div>
              </div>
              <Button asChild>
                <Link to={`/staff/${record.id}/edit`} className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Edit
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">First Name</h3>
                <p className="text-base">{record.first_name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Last Name</h3>
                <p className="text-base">{record.last_name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Staff Type</h3>
                <Badge
                  className={staffTypeColors[record.staff_type] || "bg-gray-500"}
                >
                  {record.staff_type || "Unknown"}
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Phone</h3>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="text-base">{record.phone}</p>
                </div>
              </div>
              {record.email && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Email</h3>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-base">{record.email}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

