import { CreateButton } from "@/components/admin/create-button";

import useAppBarHeight from "../misc/useAppBarHeight";

export const ClientEmpty = () => {
  const appbarHeight = useAppBarHeight();
  return (
    <div
      className="flex flex-col justify-center items-center gap-3"
      style={{
        height: `calc(100dvh - ${appbarHeight}px)`,
      }}
    >
      <img src="./img/empty.svg" alt="No clients found" />
      <div className="flex flex-col gap-0 items-center">
        <h6 className="text-lg font-bold">No clients found</h6>
        <p className="text-sm text-muted-foreground text-center mb-4">
          It seems your client list is empty.
        </p>
      </div>
      <div className="flex flex-row gap-2">
        <CreateButton label="New Client" />
      </div>
    </div>
  );
};
