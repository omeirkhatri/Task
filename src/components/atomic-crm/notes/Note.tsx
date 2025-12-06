import { CircleX, Edit, Save, Trash2 } from "lucide-react";
import {
  Form,
  useDelete,
  useNotify,
  useResourceContext,
  useUpdate,
  WithRecord,
} from "ra-core";
import { useState } from "react";
import type { FieldValues, SubmitHandler } from "react-hook-form";
import { ReferenceField } from "@/components/admin/reference-field";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { RelativeDate } from "../misc/RelativeDate";
import { Status } from "../misc/Status";
import { SaleName } from "../sales/SaleName";
import type { ContactNote, DealNote } from "../types";
import { NoteInputs } from "./NoteInputs";

export const Note = ({
  showStatus,
  note,
}: {
  showStatus?: boolean;
  note: DealNote | ContactNote;
  isLast: boolean;
}) => {
  const [isHover, setHover] = useState(false);
  const [isEditing, setEditing] = useState(false);
  const resource = useResourceContext();
  const notify = useNotify();

  const [update, { isPending }] = useUpdate();

  const [deleteNote] = useDelete(
    resource,
    { id: note.id, previousData: note },
    {
      mutationMode: "undoable",
      onSuccess: () => {
        notify("Note deleted", { type: "info", undoable: true });
      },
    },
  );

  const handleDelete = () => {
    deleteNote();
  };

  const handleEnterEditMode = () => {
    setEditing(!isEditing);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setHover(false);
  };

  const handleNoteUpdate: SubmitHandler<FieldValues> = (values) => {
    update(
      resource,
      { id: note.id, data: values, previousData: note },
      {
        onSuccess: () => {
          setEditing(false);
          setHover(false);
        },
      },
    );
  };

  return (
    <Card
      className="hover:shadow-md transition-shadow py-3 gap-2"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <CardHeader className="pb-2 px-4 pt-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">
                  <ReferenceField
                    record={note}
                    resource={resource}
                    source="sales_id"
                    reference="sales"
                    link={false}
                  >
                    <WithRecord render={(record) => <SaleName sale={record} />} />
                  </ReferenceField>
                </span>
                <span className="text-sm text-muted-foreground">added a note</span>
                {showStatus && note.status && (
                  <Status className="ml-1" status={note.status} />
                )}
              </div>
            </div>
          </div>
          <div className={`flex items-center gap-1 ${isHover ? "opacity-100" : "opacity-0"} transition-opacity`}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEnterEditMode}
                    className="h-7 w-7 p-0 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit note</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="h-7 w-7 p-0 cursor-pointer text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete note</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-0">
        {isEditing ? (
          <Form onSubmit={handleNoteUpdate} record={note}>
            <NoteInputs showStatus={showStatus} />
            <div className="flex justify-end gap-2 mt-3">
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                type="button"
                size="sm"
                className="cursor-pointer"
              >
                <CircleX className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                size="sm"
                className="cursor-pointer"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </Form>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 [&_p:empty]:min-h-[0.75em]">
              {note.text?.split("\n").map((paragraph: string, index: number) => (
                <p className="text-sm leading-5 m-0 mb-1.5 last:mb-0" key={index}>
                  {paragraph}
                </p>
              ))}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">
              <RelativeDate date={note.date} />
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
