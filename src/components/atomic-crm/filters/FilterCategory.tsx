import { Translate } from "ra-core";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export const FilterCategory = ({
  icon,
  label,
  children,
  count,
  onClear,
}: {
  icon: ReactNode;
  label: string;
  children?: ReactNode;
  count?: number;
  onClear?: () => void;
}) => (
  <div className="flex flex-col gap-2">
    <div className="flex flex-row items-center justify-between gap-2">
      <h3 className="flex flex-row items-center gap-2 font-bold text-sm">
        {icon}
        <Translate i18nKey={label} />
      </h3>
      <div className="flex flex-row items-center gap-1">
        {count !== undefined && count > 0 ? (
          <span className="text-xs text-muted-foreground">{count}</span>
        ) : null}
        {onClear ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onClear}
            disabled={!count}
          >
            Clear
          </Button>
        ) : null}
      </div>
    </div>
    <div className="flex flex-col items-start pl-4">{children}</div>
  </div>
);
