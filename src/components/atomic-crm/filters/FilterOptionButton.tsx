import { CircleX } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const FilterOptionButton = ({
  label,
  selected,
  onToggle,
  className,
}: {
  label: ReactNode;
  selected: boolean;
  onToggle: () => void;
  className?: string;
}) => (
  <Button
    variant={selected ? "secondary" : "ghost"}
    size="sm"
    onClick={onToggle}
    className={cn(
      "cursor-pointer flex flex-row items-center justify-between gap-2 px-2.5 w-full",
      className,
    )}
  >
    {label}
    {selected && <CircleX className="h-4 w-4 opacity-50" />}
  </Button>
);
