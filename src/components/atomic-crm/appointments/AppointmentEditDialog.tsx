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

type AppointmentEditDialogProps = {
  open: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onConfirm: (updateFutureOnly: boolean) => void;
  isSubmitting?: boolean;
};

export const AppointmentEditDialog: React.FC<AppointmentEditDialogProps> = ({
  open,
  onClose,
  appointment,
  onConfirm,
  isSubmitting = false,
}) => {
  const [editOption, setEditOption] = useState<"this" | "future">("this");

  if (!appointment) {
    return null;
  }

  const isRecurring = appointment.is_recurring || !!appointment.recurrence_id;

  const handleConfirm = () => {
    // editOption "this" means edit only this appointment (updateFutureOnly = false)
    // editOption "future" means edit this and all future (updateFutureOnly = true)
    onConfirm(editOption === "future");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Recurring Appointment</DialogTitle>
          <DialogDescription>
            This appointment is part of a recurring series. What would you like to edit?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isRecurring ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Changes will be applied to the selected appointments. The date will remain unchanged - only time, type, staff, and other details will be updated.
              </p>
              <RadioGroup value={editOption} onValueChange={(value) => setEditOption(value as "this" | "future")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="this" id="edit-this" />
                  <Label htmlFor="edit-this" className="cursor-pointer">
                    Edit this appointment only
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="future" id="edit-future" />
                  <Label htmlFor="edit-future" className="cursor-pointer">
                    Edit this appointment and all future appointments in this series
                  </Label>
                </div>
              </RadioGroup>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This appointment will be updated with your changes.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

