import { getCrmTimeZoneLabel, formatCrmDateTime } from "./timezone";

type Mode = "utc+4" | "local";

// Always render using the enforced CRM timezone.
// The `mode` prop is kept for backward compatibility but ignored.
export function RelativeDate({
  date,
}: {
  date: string;
  mode?: Mode;
}) {
  const formatted = formatCrmDateTime(date);
  if (!formatted) return null;
  return <span title={getCrmTimeZoneLabel()}>{formatted}</span>;
}
