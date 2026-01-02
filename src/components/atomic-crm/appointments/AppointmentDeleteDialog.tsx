import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { Appointment } from "../types";

type AppointmentDeleteDialogProps = {
  open: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onConfirm: (deleteFutureOnly: boolean) => void;
  isDeleting?: boolean;
};

export const AppointmentDeleteDialog: React.FC<AppointmentDeleteDialogProps> = ({
  open,
  onClose,
  appointment,
  onConfirm,
  isDeleting = false,
}) => {
  const [deleteOption, setDeleteOption] = useState<"this" | "future">("this");

  if (!appointment) {
    return null;
  }

  const isRecurring = appointment.is_recurring || !!appointment.recurrence_id;
  const isParent = appointment.recurrence_sequence === 0;
  const isChild = appointment.recurrence_sequence !== undefined && appointment.recurrence_sequence > 0;

  const handleConfirm = () => {
    // deleteOption "this" means delete only this appointment (deleteFutureOnly = false)
    // deleteOption "future" means delete this and all future (deleteFutureOnly = true)
    onConfirm(deleteOption === "future");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Appointment</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this appointment?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isRecurring ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                This appointment is part of a recurring series. What would you like to delete?
              </p>
              <RadioGroup value={deleteOption} onValueChange={(value) => setDeleteOption(value as "this" | "future")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="this" id="delete-this" />
                  <Label htmlFor="delete-this" className="cursor-pointer">
                    Delete this appointment only
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="future" id="delete-future" />
                  <Label htmlFor="delete-future" className="cursor-pointer">
                    Delete this appointment and all future appointments in this series
                  </Label>
                </div>
              </RadioGroup>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              This will permanently delete the appointment. This action cannot be undone.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

