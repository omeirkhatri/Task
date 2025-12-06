import type { ConfigurationContextValue } from "../root/ConfigurationContext";
import type { Deal } from "../types";

export type DealsByStage = Record<Deal["stage"], Deal[]>;

export const getDealsByStage = (
  unorderedDeals: Deal[],
  stages: ConfigurationContextValue["dealStages"] | ConfigurationContextValue["leadStages"],
) => {
  if (!stages || stages.length === 0) return {};

  const initialColumns = stages.reduce(
    (obj, stage) => ({ ...obj, [stage.value]: [] }),
    {} as Record<Deal["stage"], Deal[]>,
  );

  const dealsByStage: Record<Deal["stage"], Deal[]> = unorderedDeals.reduce(
    (acc, deal) => {
      if (!acc[deal.stage]) {
        acc[deal.stage] = [];
      }
      acc[deal.stage].push(deal);
      return acc;
    },
    { ...initialColumns },
  );

  // order each column by index
  stages.forEach((stage) => {
    dealsByStage[stage.value] = (dealsByStage[stage.value] ?? []).sort(
      (recordA: Deal, recordB: Deal) => recordA.index - recordB.index,
    );
  });
  return dealsByStage;
};
