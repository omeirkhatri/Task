import { MoreVertical, Edit, Trash2, FileText } from "lucide-react";
import { useDeleteWithUndoController, useNotify } from "ra-core";
import { useState } from "react";
import { ReferenceField } from "@/components/admin/reference-field";
import { TextField } from "@/components/admin/text-field";
import { NumberField } from "@/components/admin/number-field";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";

import type { Quote } from "../types";
import { QuoteEdit } from "./QuoteEdit";
import { RelativeDate } from "../misc/RelativeDate";

const statusColors = {
  Draft: "secondary",
  Sent: "default",
  Accepted: "default",
  Rejected: "destructive",
} as const;

export const QuoteItem = ({ quote }: { quote: Quote }) => {
  const notify = useNotify();
  const [openEdit, setOpenEdit] = useState(false);

  const { handleDelete } = useDeleteWithUndoController({
    resource: "quotes",
    record: quote,
    redirect: false,
    mutationOptions: {
      onSuccess() {
        notify("Quote deleted successfully", { undoable: true });
      },
    },
  });

  const handleEdit = () => {
    setOpenEdit(true);
  };

  const handleCloseEdit = () => {
    setOpenEdit(false);
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow py-3">
        <CardHeader className="pb-2 px-4 pt-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary flex-shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <ReferenceField
                    source="service_id"
                    reference="services"
                    record={quote}
                    link={false}
                  >
                    <TextField source="name" className="font-semibold text-sm" />
                  </ReferenceField>
                  <Badge variant={statusColors[quote.status] as any} className="text-xs">
                    {quote.status}
                  </Badge>
                </div>
                {quote.description && (
                  <div className="text-xs text-muted-foreground line-clamp-2 mb-1.5">
                    {quote.description}
                  </div>
                )}
                <div className="text-base font-semibold text-primary">
                  <NumberField
                    source="amount"
                    record={quote}
                    options={{
                      style: "currency",
                      currency: "AED",
                      minimumFractionDigits: 2,
                    }}
                  />
                </div>
              </div>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap mt-1">
              <RelativeDate
                date={
                  (quote as any).created_at ??
                  quote.updated_at ??
                  quote.date ??
                  quote.sent_at ??
                  quote.updated_at
                }
                mode="local"
              />
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 cursor-pointer"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="cursor-pointer text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
      </Card>
      {openEdit && (
        <QuoteEdit quote={quote} open={openEdit} onClose={handleCloseEdit} />
      )}
    </>
  );
};

