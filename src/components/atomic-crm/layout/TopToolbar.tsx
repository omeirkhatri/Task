import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

export interface TopToolbarProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export const TopToolbar = (inProps: TopToolbarProps) => {
  const { className, children, ...props } = inProps;

  return (
    <div
      className={cn(
        "flex flex-auto items-end gap-2 whitespace-nowrap w-full",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default TopToolbar;
