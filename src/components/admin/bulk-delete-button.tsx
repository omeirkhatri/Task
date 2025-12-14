import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import type { RaRecord, UseBulkDeleteControllerParams } from "ra-core";
import { Translate, useBulkDeleteController, useListContext, useNotify, useResourceContext, useTranslate } from "ra-core";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import * as React from "react";
import { Confirm } from "@/components/admin/confirm";

export const BulkDeleteButton = <
  RecordType extends RaRecord = any,
  MutationOptionsError = unknown,
>({
  icon = defaultIcon,
  label,
  className,
  ...props
}: BulkDeleteButtonProps<RecordType, MutationOptionsError>) => {
  const [open, setOpen] = React.useState(false);
  const { selectedIds } = useListContext();
  const resource = useResourceContext(props);
  const translate = useTranslate();
  const notify = useNotify();

  const onClose = React.useCallback(() => setOpen(false), []);

  const selectionCount = selectedIds?.length ?? 0;
  const resourceLabel =
    translate(`resources.${resource}.forcedCaseName`, {
      smart_count: selectionCount || 2,
      _: translate(`resources.${resource}.name`, {
        smart_count: selectionCount || 2,
        _: resource,
      }),
    }) || resource;

  const mergedProps: any = {
    ...props,
    // Bulk deletes should be explicit/confirmed, not "Undoable" by default
    mutationMode: (props as any).mutationMode ?? "pessimistic",
    mutationOptions: {
      ...(props as any).mutationOptions,
      onSuccess: (data: any, variables: any, context: any) => {
        notify(`${selectionCount} ${resourceLabel} deleted`, { type: "success" });
        (props as any).mutationOptions?.onSuccess?.(data, variables, context);
      },
    },
  };

  const { handleDelete, isPending } = useBulkDeleteController(mergedProps);

  const handleOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectionCount) return;
    setOpen(true);
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    handleDelete();
  };

  return (
    <>
      <Button
        variant="destructive"
        type="button"
        onClick={handleOpen}
        disabled={isPending || !selectionCount}
        className={cn("h-9", className)}
      >
        {icon}
        <Translate i18nKey={label ?? "ra.action.delete"}>
          {label ?? "Delete"}
        </Translate>
      </Button>

      <Confirm
        isOpen={open}
        loading={isPending}
        title="Confirm deletion"
        content={`Delete ${selectionCount} ${resourceLabel}? This action cannot be undone.`}
        confirm="Delete"
        cancel="Cancel"
        confirmColor="warning"
        onClose={onClose}
        onConfirm={handleConfirm}
      />
    </>
  );
};

export type BulkDeleteButtonProps<
  RecordType extends RaRecord = any,
  MutationOptionsError = unknown,
> = {
  label?: string;
  icon?: ReactNode;
} & React.ComponentPropsWithoutRef<"button"> &
  UseBulkDeleteControllerParams<RecordType, MutationOptionsError>;

const defaultIcon = <Trash />;
