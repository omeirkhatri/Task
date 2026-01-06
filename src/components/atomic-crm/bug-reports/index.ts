export { BugReportPage } from "./BugReportPage";
export { BugReportsPage } from "./BugReportsPage";
export { BugReportList } from "./BugReportList";
export { BugReportShow } from "./BugReportShow";

import { BugReportsPage } from "./BugReportsPage";
import { BugReportShow } from "./BugReportShow";
import { Bug } from "lucide-react";
import type { BugReport } from "../types";

export default {
  list: BugReportsPage,
  show: BugReportShow,
  icon: Bug,
  recordRepresentation: (record: BugReport) => {
    return record.title || `Bug Report #${record.id}`;
  },
};

