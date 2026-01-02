import { useGetList } from "ra-core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import { Calendar, AlertCircle } from "lucide-react";
import type { PaymentPackage } from "../types";
import { crmAddDays, crmToday } from "../misc/timezone";

export const PackagesExpiringSoon = () => {
  const today = crmToday();
  const sevenDaysFromNow = crmAddDays(today, 7);
  
  const { data: packages, isLoading, error } = useGetList<PaymentPackage>("payment_packages", {
    pagination: { page: 1, perPage: 100 },
    filter: {
      status: "active",
      "renewal_date@gte": today?.toISOString().split("T")[0],
      "renewal_date@lte": sevenDaysFromNow?.toISOString().split("T")[0],
    },
    sort: { field: "renewal_date", order: "ASC" },
  }, {
    retry: false,
    onError: (err) => {
      console.warn("Error fetching expiring packages:", err);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Packages Expiring Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return null; // Silently fail if there's an error
  }

  const expiringCount = packages?.length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Packages Expiring Soon
        </CardTitle>
      </CardHeader>
      <CardContent>
        {expiringCount > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{expiringCount}</div>
                <div className="text-xs text-muted-foreground">
                  expiring in 7 days
                </div>
              </div>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                <AlertCircle className="w-3 h-3 mr-1" />
                Action Needed
              </Badge>
            </div>
            <Link to="/payment_packages?filter[status]=active&filter[renewal_date@lte]=7days">
              <Button variant="outline" size="sm" className="w-full cursor-pointer">
                View All Expiring
              </Button>
            </Link>
            {packages && packages.length > 0 && (
              <div className="space-y-2 mt-3">
                {packages.slice(0, 3).map((pkg) => (
                  <Link
                    key={pkg.id}
                    to={`/payment_packages/${pkg.id}/show`}
                    className="block p-2 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">
                        Package #{pkg.id}
                      </div>
                      {pkg.renewal_date && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(pkg.renewal_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
                {packages.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center pt-1">
                    +{packages.length - 3} more
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No packages expiring in the next 7 days
          </div>
        )}
      </CardContent>
    </Card>
  );
};

