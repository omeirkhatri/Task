# Appointment Page Dependencies

The appointment page requires the following npm packages to be installed:

```bash
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/list @tanstack/react-virtual date-fns
```

## Required Packages

1. **@fullcalendar/react** - React wrapper for FullCalendar
2. **@fullcalendar/daygrid** - Month and day grid views
3. **@fullcalendar/timegrid** - Week and day time grid views
4. **@fullcalendar/interaction** - Drag and drop, date selection
5. **@fullcalendar/list** - List view for appointments
6. **@tanstack/react-virtual** - Virtual scrolling for table view
7. **date-fns** - Date formatting and manipulation utilities

## Installation

Run the following command in the project root:

```bash
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/list @tanstack/react-virtual date-fns
```

## CSS Imports

The FullCalendar CSS is automatically imported in the `AppointmentCalendar.tsx` component. If you need to customize the calendar styles, you can override the FullCalendar CSS classes in your global CSS file.

## Notes

- The FullCalendar CSS imports are included in the `AppointmentCalendar.tsx` component
- The calendar uses the Asia/Dubai timezone (UTC+4) as configured in the CRM
- Drag and drop functionality requires the `interactionPlugin`
- Virtual scrolling for the table view uses `@tanstack/react-virtual`

After installation, the appointment page should work correctly.

