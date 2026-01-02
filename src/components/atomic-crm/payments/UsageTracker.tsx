import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PaymentPackage } from "./types";

type UsageTrackerProps = {
  package: PaymentPackage;
  sessionsUsed?: number;
  hoursUsed?: number;
};

export const UsageTracker = ({ package: pkg, sessionsUsed = 0, hoursUsed = 0 }: UsageTrackerProps) => {
  let used: number;
  let total: number;
  let label: string;
  let unit: string;

  if (pkg.package_type === "session-based" && pkg.total_sessions) {
    used = sessionsUsed;
    total = pkg.total_sessions;
    label = "Sessions";
    unit = "sessions";
  } else if (pkg.package_type === "time-based" && pkg.total_hours) {
    used = hoursUsed;
    total = pkg.total_hours;
    label = "Hours";
    unit = "hours";
  } else {
    // Post-payment or no usage tracking
    return null;
  }

  const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const remaining = Math.max(total - used, 0);

  // Color based on usage percentage
  let progressColor = "bg-green-500";
  if (percentage >= 100) {
    progressColor = "bg-red-500";
  } else if (percentage >= 80) {
    progressColor = "bg-yellow-500";
  } else if (percentage >= 50) {
    progressColor = "bg-blue-500";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Usage Tracking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{label} Used</span>
            <span className="font-medium">
              {used.toFixed(pkg.package_type === "time-based" ? 1 : 0)} / {total.toFixed(pkg.package_type === "time-based" ? 1 : 0)} {unit}
            </span>
          </div>
          <Progress value={percentage} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{percentage.toFixed(1)}% used</span>
            <span>{remaining.toFixed(pkg.package_type === "time-based" ? 1 : 0)} {unit} remaining</span>
          </div>
        </div>
        {percentage >= 100 && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-800 dark:text-red-300 font-medium">
              Package Exhausted - All {unit} have been used
            </p>
          </div>
        )}
        {percentage >= 80 && percentage < 100 && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
              Low Usage Warning - Less than {remaining.toFixed(pkg.package_type === "time-based" ? 1 : 0)} {unit} remaining
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

