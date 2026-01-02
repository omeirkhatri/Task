import { useMemo, useState, useEffect, useCallback } from "react";
import { useGetList } from "ra-core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import { AlertTriangle, Package } from "lucide-react";
import type { PaymentPackage } from "../types";
import { usePackageUsage } from "@/hooks/usePackageUsage";

interface PackageWithUsage extends PaymentPackage {
  remaining: number;
  usageType: string;
  percentage: number;
}

const PackageUsageItem = ({ pkg }: { pkg: PackageWithUsage }) => {
  return (
    <Link
      to={`/payment_packages/${pkg.id}/show`}
      className="block p-2 rounded-lg border hover:bg-accent transition-colors"
    >
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-medium">
          Package #{pkg.id}
        </div>
        <Badge 
          variant="outline" 
          className={pkg.remaining <= 0 ? "bg-red-50 text-red-700 border-red-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"}
        >
          {pkg.remaining} {pkg.usageType} left
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground">
        {Math.round(pkg.percentage)}% used
      </div>
    </Link>
  );
};

const PackageUsageCalculator = ({ 
  pkg, 
  onUsageCalculated 
}: { 
  pkg: PaymentPackage;
  onUsageCalculated: (pkgId: number, hasLowUsage: boolean, usageData: PackageWithUsage | null) => void;
}) => {
  const { sessionsUsed, hoursUsed, isLoading } = usePackageUsage(pkg.id);
  
  const usageData = useMemo(() => {
    let remaining = 0;
    let total = 0;
    let usageType = "";
    
    if (pkg.package_type === "session-based" && pkg.total_sessions) {
      total = pkg.total_sessions;
      remaining = total - (sessionsUsed || 0);
      usageType = "sessions";
    } else if (pkg.package_type === "time-based" && pkg.total_hours) {
      total = pkg.total_hours;
      remaining = total - (hoursUsed || 0);
      usageType = "hours";
    } else {
      return null; // Skip post-payment packages
    }
    
    if (remaining > 2) return null; // Only show if 2 or fewer remaining
    
    const percentage = total > 0 ? ((total - remaining) / total) * 100 : 0;
    
    return {
      ...pkg,
      remaining,
      usageType,
      percentage,
    };
  }, [pkg, sessionsUsed, hoursUsed]);
  
  useEffect(() => {
    if (!isLoading && usageData !== undefined) {
      onUsageCalculated(pkg.id as number, usageData !== null, usageData);
    }
  }, [isLoading, usageData, pkg.id, onUsageCalculated]);
  
  if (isLoading || !usageData) return null;
  
  return <PackageUsageItem pkg={usageData} />;
};

export const LowUsageWarnings = () => {
  const { data: packages, isLoading, error } = useGetList<PaymentPackage>("payment_packages", {
    pagination: { page: 1, perPage: 50 },
    filter: {
      status: "active",
      "package_type@in": "('session-based','time-based')",
    },
    sort: { field: "created_at", order: "DESC" },
  }, {
    retry: false,
    onError: (err) => {
      console.warn("Error fetching packages for low usage warnings:", err);
    },
  });

  const [lowUsagePackagesMap, setLowUsagePackagesMap] = useState<Map<number, PackageWithUsage>>(new Map());

  const handleUsageCalculated = useCallback((pkgId: number, hasLowUsage: boolean, usageData: PackageWithUsage | null) => {
    setLowUsagePackagesMap(prev => {
      const newMap = new Map(prev);
      if (hasLowUsage && usageData) {
        newMap.set(pkgId, usageData);
      } else {
        newMap.delete(pkgId);
      }
      return newMap;
    });
  }, []);

  const lowUsagePackages = useMemo(() => {
    return Array.from(lowUsagePackagesMap.values());
  }, [lowUsagePackagesMap]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Package className="w-4 h-4" />
            Low Usage Warnings
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Package className="w-4 h-4" />
          Low Usage Warnings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">
                {lowUsagePackages.length}
              </div>
              <div className="text-xs text-muted-foreground">
                packages with low usage
              </div>
            </div>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Warning
            </Badge>
          </div>
          <Link to="/payment_packages?filter[status]=active">
            <Button variant="outline" size="sm" className="w-full cursor-pointer">
              View All Packages
            </Button>
          </Link>
          {packages && packages.length > 0 && (
            <div className="space-y-2 mt-3">
              {packages.slice(0, 10).map((pkg) => (
                <PackageUsageCalculator 
                  key={pkg.id} 
                  pkg={pkg} 
                  onUsageCalculated={handleUsageCalculated}
                />
              ))}
            </div>
          )}
          {lowUsagePackages.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No packages with low usage warnings
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


