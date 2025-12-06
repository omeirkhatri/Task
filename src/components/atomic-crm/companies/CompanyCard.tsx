import { DollarSign } from "lucide-react";
import { Link } from "react-router";
import { useCreatePath, useRecordContext } from "ra-core";
import { Card } from "@/components/ui/card";

import type { Company } from "../types";

export const CompanyCard = (props: { record?: Company }) => {
  const createPath = useCreatePath();
  const record = useRecordContext<Company>(props);
  if (!record) return null;

  return (
    <Link
      to={createPath({
        resource: "companies",
        id: record.id,
        type: "show",
      })}
      className="no-underline"
    >
      <Card className="h-[200px] flex flex-col justify-between p-4 hover:bg-muted">
        <div className="flex flex-col items-center gap-1">
          <div className="text-center mt-1">
            <h6 className="text-sm font-medium">{record.name}</h6>
            <p className="text-xs text-muted-foreground">{record.sector}</p>
          </div>
        </div>
        <div className="flex flex-row w-full justify-between gap-2">
          <div className="flex items-center">
          </div>
          {record.nb_deals ? (
            <div className="flex items-center ml-2 gap-0.5">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{record.nb_deals}</span>
              <span className="text-xs text-muted-foreground">
                {record.nb_deals
                  ? record.nb_deals > 1
                    ? "deals"
                    : "deal"
                  : "deal"}
              </span>
            </div>
          ) : null}
        </div>
      </Card>
    </Link>
  );
};
