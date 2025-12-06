import { CRM_TIME_ZONE_LABEL, formatCrmDateTime } from "./timezone";

type Mode = "utc+4" | "local";

// Always render using the enforced CRM timezone (UTC+4).
// The `mode` prop is kept for backward compatibility but ignored.
export function RelativeDate({
  date,
}: {
  date: string;
  mode?: Mode;
}) {
  const formatted = formatCrmDateTime(date);
  if (!formatted) return null;
  return <span title={CRM_TIME_ZONE_LABEL}>{formatted}</span>;
}
