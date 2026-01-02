import { useGetList } from "ra-core";

import type { Contact, ContactNote } from "../types";
import { DashboardActivityLog } from "./DashboardActivityLog";
import { RecentLeads } from "./RecentLeads";
import { LeadStatusChart } from "./LeadStatusChart";
import { TasksList } from "./TasksList";
import { Welcome } from "./Welcome";
import { OverdueInstallments } from "./OverdueInstallments";
import { PackagesExpiringSoon } from "./PackagesExpiringSoon";
import { LowUsageWarnings } from "./LowUsageWarnings";
import { BulkStatusChange } from "./BulkStatusChange";

export const Dashboard = () => {
  const {
    total: totalContact,
    isPending: isPendingContact,
  } = useGetList<Contact>("contacts", {
    pagination: { page: 1, perPage: 1 },
  });

  const { total: totalContactNotes, isPending: isPendingContactNotes } =
    useGetList<ContactNote>("contactNotes", {
      pagination: { page: 1, perPage: 1 },
    });

  const { total: totalDeal, isPending: isPendingDeal } = useGetList<Contact>(
    "lead-journey",
    {
      pagination: { page: 1, perPage: 1 },
    },
  );

  const isPending = isPendingContact || isPendingContactNotes || isPendingDeal;

  if (isPending) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-1">
      <div className="md:col-span-3">
        <div className="flex flex-col gap-4">
          {import.meta.env.VITE_IS_DEMO === "true" ? <Welcome /> : null}
          <OverdueInstallments />
          <PackagesExpiringSoon />
          <LowUsageWarnings />
          <RecentLeads />
        </div>
      </div>
      <div className="md:col-span-6">
        <div className="flex flex-col gap-6">
          <BulkStatusChange />
          {totalDeal ? <LeadStatusChart /> : null}
          <DashboardActivityLog />
        </div>
      </div>

      <div className="md:col-span-3">
        <TasksList />
      </div>
    </div>
  );
};
