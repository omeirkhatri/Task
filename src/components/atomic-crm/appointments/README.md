# Appointment Management Page

A comprehensive appointment management system with calendar and table views, advanced filtering, drag-and-drop functionality, and detailed appointment management capabilities.

## Features

### ✅ Completed Features

1. **Page Structure & Layout**
   - Full viewport height layout with proper spacing
   - Sticky header navigation (integrated with existing Header component)
   - Main content area with proper padding

2. **Filters Section**
   - Collapsible filter panel
   - Multi-select dropdowns for:
     - Staff members
     - Appointment types
     - Status
   - Date range filter (from/to dates)
   - Active filter count badge
   - Clear filters button

3. **Calendar View**
   - FullCalendar integration with:
     - Month view
     - Week view
     - Day view
     - List view
   - Custom header toolbar with navigation
   - Drag and drop to reschedule appointments
   - Resize to change duration
   - Click to view details
   - Right-click context menu
   - Timezone support (Asia/Dubai, UTC+4)
   - Color-coded appointment types

4. **Table View**
   - Virtualized table for performance
   - Columns: Time, Patient, Type, Duration, Status, Notes, Actions
   - Row click to view details
   - Status badges with color coding
   - Patient avatars with initials
   - Loading and empty states

5. **Appointment Modal**
   - Create new appointments
   - Edit existing appointments
   - Form validation
   - Patient selection
   - Staff assignment (primary, driver)
   - Date/time selection
   - Notes fields (brief, detailed, pickup instructions)
   - Appointment type and status selection

6. **Appointment Details Drawer**
   - Slide-in drawer from right
   - Patient information section
   - Appointment details (date, time, duration, status, type)
   - Staff details (primary, driver, other staff)
   - Transportation information
   - Notes and instructions
   - Action buttons (Print, Copy, Edit, Delete)

7. **Context Menu**
   - Right-click on calendar events
   - Quick actions: Edit, Print, Copy, Cancel, Delete
   - Position adjustment for off-screen menus
   - Keyboard support (Escape to close)

## Component Structure

```
appointments/
├── AppointmentsPage.tsx          # Main page component
├── AppointmentFilters.tsx        # Filter component
├── AppointmentCalendar.tsx       # FullCalendar integration
├── VirtualizedTable.tsx          # Table view component
├── AppointmentModal.tsx          # Create/Edit modal
├── AppointmentForm.tsx           # Appointment form
├── AppointmentDetailsDrawer.tsx  # Details drawer
├── AppointmentContextMenu.tsx    # Right-click context menu
├── CustomMultiSelect.tsx         # Reusable multi-select dropdown
├── types.ts                      # Type definitions
├── index.tsx                     # Module exports
├── DEPENDENCIES.md               # Installation instructions
└── README.md                     # This file
```

## Usage

The appointment page is accessible at `/appointments` route. It's integrated into the main CRM navigation.

### Navigation

The "Appointments" link has been added to the main header navigation, positioned between "Notes" and "Staff".

### API Integration

The components use React Admin's `useGetList` hook to fetch data. You'll need to ensure your data provider supports the following resources:

- `appointments` - Main appointment data
- `contacts` - Patient/contact data
- `staff` - Staff member data

### Data Structure

Appointments should have the following structure (see `types.ts` for full type definition):

```typescript
{
  id: string | number;
  patient_id: string | number;
  appointment_date: string; // ISO date string
  start_time: string; // ISO datetime string
  end_time: string; // ISO datetime string
  duration_minutes: number;
  appointment_type: "doctor_on_call" | "lab_test" | "teleconsultation" | "physiotherapy" | "caregiver" | "iv_therapy";
  status: "scheduled" | "confirmed" | "completed" | "cancelled";
  notes?: string;
  mini_notes?: string;
  full_notes?: string;
  pickup_instructions?: string;
  primary_staff_id?: string | number;
  driver_id?: string | number;
  staff_ids?: (string | number)[];
  custom_fields?: Record<string, any>;
}
```

## Styling

The components use CSS custom properties (design tokens) for theming:
- `--background`, `--foreground` - Base colors
- `--card`, `--card-foreground` - Card backgrounds
- `--primary`, `--primary-foreground` - Primary brand colors
- `--muted`, `--muted-foreground` - Muted colors
- `--accent`, `--accent-foreground` - Accent colors
- `--border`, `--ring` - Border and focus ring colors
- `--success`, `--warning`, `--error` - Status colors

## Dependencies

See `DEPENDENCIES.md` for required npm packages and installation instructions.

## Future Enhancements

- [ ] Google Calendar sync integration
- [ ] Print page route (`/print/appointment/[id]`)
- [ ] Copy appointment functionality
- [ ] Bulk operations
- [ ] Appointment reminders
- [ ] Email notifications
- [ ] SMS notifications

## Notes

- Timezone handling: All dates are stored in UTC and converted to Asia/Dubai (UTC+4) for display
- Drag and drop updates appointments with automatic timezone adjustment
- The calendar supports 15-minute time slots
- Virtual scrolling is used in the table view for performance with large datasets

