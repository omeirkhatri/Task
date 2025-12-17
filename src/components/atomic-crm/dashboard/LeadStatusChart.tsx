import { ResponsiveBar } from "@nivo/bar";
import { Users } from "lucide-react";
import { useGetList, useRedirect } from "ra-core";
import { memo, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

import type { Deal } from "../types";
import { useConfigurationContext } from "../root/ConfigurationContext";

// Define a color map for stages to ensure consistency
const STAGE_COLORS: Record<string, string> = {
  new: "#3b82f6",       // Blue 500
  contacted: "#6366f1", // Indigo 500
  quoted: "#8b5cf6",    // Violet 500
  qualified: "#06b6d4", // Cyan 500
  "not-qualified": "#94a3b8", // Slate 400
  converted: "#22c55e", // Green 500
  deleted: "#ef4444",   // Red 500
};

export const LeadStatusChart = memo(() => {
  const { leadStages } = useConfigurationContext();
  const redirect = useRedirect();
  
  const { data, isPending } = useGetList<Deal>("lead-journey", {
    pagination: { perPage: 1000, page: 1 },
    sort: {
      field: "created_at",
      order: "ASC",
    },
    // Filter out archived leads, orphaned deals (deals without a lead_id), and deleted stage
    // This matches the filter used in DealList to ensure consistency
    filter: { 
      "archived_at@is": null, 
      "lead_id@not.is": null,
      "stage@neq": "deleted"
    },
  });

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Count leads by stage
    const stageCounts = leadStages.reduce((acc, stage) => {
      acc[stage.value] = 0;
      return acc;
    }, {} as Record<string, number>);

    data.forEach((deal) => {
      if (stageCounts.hasOwnProperty(deal.stage)) {
        stageCounts[deal.stage] = (stageCounts[deal.stage] || 0) + 1;
      }
    });

    // Convert to chart format
    return leadStages.map((stage) => ({
      id: stage.value,
      stage: stage.label,
      value: stageCounts[stage.value] || 0,
      color: STAGE_COLORS[stage.value] || "#cbd5e1",
    }));
  }, [data, leadStages]);

  const handleBarClick = (node: any) => {
    // Navigate to the list view filtered by the clicked stage
    const filter = JSON.stringify({ stage: node.data.id });
    redirect(`/lead-journey?filter=${encodeURIComponent(filter)}`);
  };

  if (isPending) return null;
  if (!chartData || chartData.length === 0) return null;

  return (
    <Card className="col-span-1 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-primary/10 rounded-full">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Lead Journey Overview</CardTitle>
            <CardDescription>
              Distribution of leads across pipeline stages
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveBar
            data={chartData}
            keys={["value"]}
            indexBy="stage"
            margin={{ top: 20, right: 30, bottom: 60, left: 60 }}
            padding={0.4}
            valueScale={{ type: "linear" }}
            indexScale={{ type: "band", round: true }}
            colors={({ data }: any) => data.color}
            borderRadius={6}
            borderColor={{
              from: "color",
              modifiers: [["darker", 1.6]],
            }}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 0,
              tickPadding: 16,
              tickRotation: -45,
              legend: "",
              legendPosition: "middle",
              legendOffset: 32,
            }}
            axisLeft={{
              tickSize: 0,
              tickPadding: 16,
              tickRotation: 0,
              legend: "",
              legendPosition: "middle",
              legendOffset: -40,
              tickValues: 5,
            }}
            enableLabel={true}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor="#ffffff"
            role="application"
            ariaLabel="Lead Status Distribution Chart"
            barAriaLabel={(e) =>
              `${e.id}: ${e.formattedValue} in stage: ${e.indexValue}`
            }
            onClick={handleBarClick}
            cursor="pointer"
            theme={{
              axis: {
                ticks: {
                  text: {
                    fill: "var(--muted-foreground)",
                    fontSize: 12,
                    fontFamily: "inherit",
                  },
                },
              },
              grid: {
                line: {
                  stroke: "var(--border)",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                },
              },
              tooltip: {
                container: {
                  background: "var(--popover)",
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                  borderRadius: "6px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                },
              },
            }}
            tooltip={({ id, value, indexValue, color }) => (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-semibold text-sm">{indexValue}</span>
                </div>
                <div className="text-xs text-muted-foreground pl-5">
                  <span className="font-medium text-foreground">{value}</span>{" "}
                  leads
                </div>
              </div>
            )}
            animate={true}
            motionConfig="gentle"
          />
        </div>
      </CardContent>
    </Card>
  );
});
