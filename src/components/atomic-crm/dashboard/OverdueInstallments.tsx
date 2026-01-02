import { useDataProvider } from "ra-core";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CrmDataProvider } from "../providers/types";

export const OverdueInstallments = () => {
  const dataProvider = useDataProvider<CrmDataProvider>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["overdueInstallments"],
    queryFn: async () => {
      try {
        return await dataProvider.getOverdueInstallments();
      } catch (err) {
        console.warn("Error fetching overdue installments:", err);
        return { total: 0, data: [] };
      }
    },
    retry: false,
    staleTime: 30000, // Cache for 30 seconds
  });

  const overdueCount = data?.total || 0;
  const installments = data?.data || [];

  if (isLoading) {
    return null;
  }

  if (error || overdueCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center">
        <div className="mr-3 flex">
          <AlertCircle className="text-red-600 dark:text-red-400 w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-muted-foreground flex-1">
          Overdue Installments
        </h2>
      </div>
      <Card className="p-4 mb-2">
        <CardHeader className="p-0 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {overdueCount} Overdue Payment{overdueCount !== 1 ? "s" : ""}
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to="/payment_packages?filter[overdue_installments]=true">
                View All
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-2">
            {installments.slice(0, 5).map((installment: any) => {
              const packageData = installment.payment_packages;
              return (
                <Link
                  key={installment.id}
                  to={`/payment_packages/${packageData?.id}/show`}
                  className="block p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        Package #{packageData?.id}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="destructive" className="text-xs">
                          Overdue
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Installment {installment.installment_number}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        AED {installment.amount_due.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(installment.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
            {overdueCount > 5 && (
              <p className="text-sm text-muted-foreground text-center pt-2">
                +{overdueCount - 5} more overdue installment{overdueCount - 5 !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

