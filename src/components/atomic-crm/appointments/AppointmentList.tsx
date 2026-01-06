import { List } from "@/components/admin/list";
import { DataTable } from "@/components/admin/data-table";
import { DateField } from "@/components/admin/date-field";
import { ReferenceField } from "@/components/admin/reference-field";
import { Badge } from "@/components/ui/badge";
import { WithRecord, useListContext, useGetList } from "ra-core";
import { useMemo } from "react";
import type { Appointment, Service } from "../types";
import { useAppointmentTypes } from "./useAppointmentTypes";

const AppointmentListContent = () => {
  const { data: appointments } = useListContext<Appointment>();
  
  const appointmentTypes = useAppointmentTypes();
  
  // Get service names for an appointment - matches drawer logic exactly
  const getAppointmentServices = useMemo(() => {
    return (appointment: Appointment): string[] => {
      if (!appointment?.appointment_type) return [];
      
      // If appointmentTypes haven't loaded yet, return formatted appointment_type
      if (!appointmentTypes || appointmentTypes.length === 0) {
        const formatAppointmentType = (type: string) => {
          return type
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        };
        return [formatAppointmentType(appointment.appointment_type)];
      }
      
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('Appointment:', {
          id: appointment.id,
          appointment_type: appointment.appointment_type,
          custom_fields: appointment.custom_fields,
          selected_service_ids: appointment?.custom_fields?.selected_service_ids,
        });
        console.log('AppointmentTypes count:', appointmentTypes.length);
      }
      
      // First, check if we have selected service IDs stored in custom_fields
      const selectedServiceIds = appointment?.custom_fields?.selected_service_ids;
      if (Array.isArray(selectedServiceIds) && selectedServiceIds.length > 0) {
        // Find matching appointment types by serviceId (handle type coercion)
        const matchingTypes = appointmentTypes.filter((t) => {
          const serviceType = t as any;
          if (!serviceType.serviceId) return false;
          // Convert both to numbers for comparison
          const serviceIdNum = Number(serviceType.serviceId);
          return selectedServiceIds.some((id) => Number(id) === serviceIdNum);
        });
        if (matchingTypes.length > 0) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Found matching types from selected_service_ids:', matchingTypes.map(t => t.label));
          }
          return matchingTypes.map(t => t.label);
        }
      }
      
      // Fallback: Find all services that map to this appointment_type
      const matchingTypes = appointmentTypes.filter((t) => t.appointmentType === appointment.appointment_type);
      if (matchingTypes.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Found matching types from appointment_type:', matchingTypes.map(t => t.label));
        }
        return matchingTypes.map(t => t.label);
      }
      
      // Last resort: format the appointment_type string
      const formatAppointmentType = (type: string) => {
        return type
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      };
      if (process.env.NODE_ENV === 'development') {
        console.log('Using formatted appointment_type fallback');
      }
      return [formatAppointmentType(appointment.appointment_type)];
    };
  }, [appointmentTypes]);

  const ServiceNameCell = ({ record }: { record: Appointment }) => {
    const serviceNames = getAppointmentServices(record);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('ServiceNames for appointment', record.id, ':', serviceNames);
    }
    
    if (serviceNames.length === 0) {
      return <span className="text-muted-foreground text-sm">—</span>;
    }
    
    if (serviceNames.length === 1) {
      return <span className="text-sm">{serviceNames[0]}</span>;
    }
    
    // Multiple services - show as badges
    return (
      <div className="flex flex-wrap gap-1">
        {serviceNames.map((name, idx) => (
          <Badge key={idx} variant="outline" className="text-xs">
            {name}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <DataTable rowClick="show">
      <DataTable.Col
        source="appointment_date"
        label="Date"
        field={DateField}
        headerClassName="text-left"
        cellClassName="text-left"
      />
      <DataTable.Col
        source="patient_id"
        label="Patient"
        headerClassName="text-left"
        cellClassName="text-left"
      >
        <ReferenceField source="patient_id" reference="clients" link="show">
          <WithRecord
            render={(contact) => (
              <span>
                {contact.first_name} {contact.last_name}
              </span>
            )}
          />
        </ReferenceField>
      </DataTable.Col>
      <DataTable.Col
        source="appointment_type"
        label="Services"
        headerClassName="text-left"
        cellClassName="text-left"
      >
        <WithRecord render={(record) => <ServiceNameCell record={record} />} />
      </DataTable.Col>
      <DataTable.Col
        source="status"
        label="Status"
        headerClassName="text-center"
        cellClassName="text-center"
        render={(record: Appointment) => {
          const statusColors: Record<string, string> = {
            scheduled: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
            completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
            cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
          };
          return (
            <Badge className={statusColors[record.status] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}>
              {record.status}
            </Badge>
          );
        }}
      />
      <DataTable.Col
        source="primary_staff_id"
        label="Staff"
        headerClassName="text-left"
        cellClassName="text-left"
      >
        <ReferenceField source="primary_staff_id" reference="staff" link="show">
          <WithRecord
            render={(staff) => (
              <span>
                {staff.first_name} {staff.last_name}
              </span>
            )}
          />
        </ReferenceField>
      </DataTable.Col>
    </DataTable>
  );
};

export const AppointmentList = () => {
  return (
    <List title="Appointments">
      <AppointmentListContent />
    </List>
  );
};

