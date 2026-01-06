import { List } from "@/components/admin/list";
import { SearchInput } from "@/components/admin/search-input";
import { SelectInput } from "@/components/admin/select-input";
import { BugReportList } from "./BugReportList";

const filters = [
  <SearchInput key="search" source="q" placeholder="Search bug reports..." />,
  <SelectInput
    key="status-filter"
    source="status"
    label="Status"
    choices={[
      { id: "open", name: "Open" },
      { id: "in_progress", name: "In Progress" },
      { id: "resolved", name: "Resolved" },
      { id: "closed", name: "Closed" },
    ]}
  />,
  <SelectInput
    key="priority-filter"
    source="priority"
    label="Priority"
    choices={[
      { id: "low", name: "Low" },
      { id: "medium", name: "Medium" },
      { id: "high", name: "High" },
      { id: "critical", name: "Critical" },
    ]}
  />,
];

export const BugReportsPage = () => {
  return (
    <List filters={filters}>
      <BugReportList />
    </List>
  );
};

BugReportsPage.path = "/bug-reports-list";

