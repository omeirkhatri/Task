import { useQuery } from "@tanstack/react-query";
import { useDataProvider } from "ra-core";
import type { Identifier } from "ra-core";

type PackageUsageResult = {
  sessionsUsed: number;
  hoursUsed: number;
};

export const usePackageUsage = (packageId: Identifier | undefined) => {
  const dataProvider = useDataProvider();

  const { data, isLoading, error, refetch } = useQuery<PackageUsageResult>({
    queryKey: ["packageUsage", packageId],
    queryFn: async () => {
      if (!packageId) {
        return { sessionsUsed: 0, hoursUsed: 0 };
      }
      return await (dataProvider as any).calculatePackageUsage(packageId);
    },
    enabled: !!packageId,
    staleTime: 30000, // Cache for 30 seconds
  });

  return {
    sessionsUsed: data?.sessionsUsed ?? 0,
    hoursUsed: data?.hoursUsed ?? 0,
    isLoading,
    error,
    refetch,
  };
};

