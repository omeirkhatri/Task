import React, { useEffect, useRef } from "react";
import { X, Edit, Printer, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import type { Appointment } from "../types";
import { APPOINTMENT_STATUSES } from "./types";
import { useAppointmentTypes } from "./useAppointmentTypes";
import { formatCrmDate } from "../misc/timezone";

type AppointmentContextMenuProps = {
  appointment: Appointment;
  x: number;
  y: number;
  onClose: () => void;
  onEdit: (appointment: Appointment) => void;
  onDelete: (appointment: Appointment) => void;
};

export const AppointmentContextMenu: React.FC<AppointmentContextMenuProps> = ({
  appointment,
  x,
  y,
  onClose,
  onEdit,
  onDelete,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Adjust position if menu would go off-screen
  const [adjustedX, adjustedY] = React.useMemo(() => {
    if (!menuRef.current) return [x, y];
    const rect = menuRef.current.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let newX = x;
    let newY = y;

    if (x + rect.width > windowWidth) {
      newX = windowWidth - rect.width - 10;
    }
    if (y + rect.height > windowHeight) {
      newY = windowHeight - rect.height - 10;
    }

    return [newX, newY];
  }, [x, y]);

  const appointmentTypes = useAppointmentTypes();
  const appointmentType = appointmentTypes.find((t) => t.value === appointment.appointment_type);
  const status = APPOINTMENT_STATUSES.find((s) => s.value === appointment.status);

  const startTime = parseISO(appointment.appointment_date + "T" + appointment.start_time.split("T")[1]);

  const handlePrint = () => {
    window.open(`/print/appointment/${appointment.id}`, "_blank");
    onClose();
  };

  const handleCopy = () => {
    // TODO: Implement copy functionality
    console.log("Copy appointment:", appointment.id);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-[--card] border border-[--border] rounded-lg shadow-lg py-2 min-w-[200px]"
      style={{
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
      }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-[--border] mb-2 relative">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-1 right-1 h-6 w-6 p-0"
          onClick={onClose}
        >
          <X className="w-3 h-3" />
        </Button>
        <div>
          <p className="text-sm font-medium">{appointmentType?.label || "Appointment"}</p>
          <p className="text-xs text-[--muted-foreground]">
            {formatCrmDate(appointment.appointment_date)} at{" "}
            {format(startTime, "HH:mm")}
          </p>
          {status && (
            <p
              className="text-xs mt-1"
              style={{ color: status.color }}
            >
              {status.label}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="py-1">
        <button
          type="button"
          className="w-full flex items-center px-3 py-2 text-sm hover:bg-[--accent] text-left"
          onClick={() => {
            onEdit(appointment);
            onClose();
          }}
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Appointment
        </button>
        <button
          type="button"
          className="w-full flex items-center px-3 py-2 text-sm hover:bg-[--accent] text-left"
          onClick={handlePrint}
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Appointment
        </button>
        <button
          type="button"
          className="w-full flex items-center px-3 py-2 text-sm hover:bg-[--accent] text-left"
          onClick={handleCopy}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy Appointment
        </button>
        {appointment.status !== "cancelled" && (
          <button
            type="button"
            className="w-full flex items-center px-3 py-2 text-sm hover:bg-[--accent] text-left"
            onClick={() => {
              // TODO: Implement cancel functionality
              onClose();
            }}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel Appointment
          </button>
        )}
        <button
          type="button"
          className="w-full flex items-center px-3 py-2 text-sm hover:bg-red-50 text-red-600 text-left"
          onClick={() => {
            onDelete(appointment);
            onClose();
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Appointment
        </button>
      </div>
    </div>
  );
};

