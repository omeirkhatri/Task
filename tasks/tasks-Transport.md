# Task List: Driver Assignment & Dispatch System

Based on PRD: `docs/Transport.md`

## Relevant Files

### Database Migrations
- `supabase/migrations/20260106000000_create_driver_trips.sql` - Creates driver_trips and trip_legs tables with all required fields, indexes, RLS policies, and foreign key constraints.
- `supabase/migrations/20260106000001_add_route_fields_to_appointments.sql` - Adds route-related fields to appointments table (pending_client_confirmation, route_locked, suggested_time_change, client_confirmation_status).

### Type Definitions
- `src/components/atomic-crm/types.ts` - Added DriverTrip and TripLeg types. Extended Appointment type with route fields (pending_client_confirmation, route_locked, suggested_time_change, client_confirmation_status).
- `src/components/atomic-crm/transport/types.ts` - Transport-specific types and interfaces including RouteConflict, ConflictType, LegType, LocationType, and related enums/interfaces.

### Core Route Planning Engine
- `src/components/atomic-crm/transport/utils/googleMapsApi.ts` - Google Maps API wrapper for Distance Matrix and Directions services with retry logic and rate limiting.
- `src/components/atomic-crm/transport/utils/distanceCalculator.ts` - Distance calculation utilities using Google Maps Distance Matrix API with batch support.
- `src/components/atomic-crm/transport/utils/travelTimeCalculator.ts` - Travel time calculation with traffic awareness and ETA calculation functions.
- `src/components/atomic-crm/transport/utils/routeOptimizer.ts` - Route optimization algorithms for stop ordering while respecting appointment times and locked legs.
- `src/components/atomic-crm/transport/utils/batchCalculator.ts` - Batch calculation utilities for multiple waypoints to minimize API calls.
- `src/components/atomic-crm/transport/utils/coordinateExtractor.ts` - Utility functions to extract coordinates from contacts (patients) and staff locations (office/home/metro).
- `src/components/atomic-crm/transport/utils/conflictDetector.ts` - Conflict detection engine (patient lateness, overlapping legs, unreachable stops).

### Dispatcher Board Components
- `src/components/atomic-crm/transport/DispatcherBoard.tsx` - Main dispatcher board component with three-panel layout.
- `src/components/atomic-crm/transport/UnplannedJobsQueue.tsx` - Left panel showing unplanned appointments with drag-and-drop.
- `src/components/atomic-crm/transport/DriverTimelineLanes.tsx` - Center panel with horizontal timeline lanes per driver.
- `src/components/atomic-crm/transport/RouteMapView.tsx` - Right panel with Google Maps showing routes and stops list.
- `src/components/atomic-crm/transport/StopsList.tsx` - Ordered stops list component below map.
- `src/components/atomic-crm/transport/hooks/useDispatcherState.ts` - State management hook for dispatcher board synchronization.

### Route Builder Components
- `src/components/atomic-crm/transport/RouteBuilder.tsx` - Per-driver route builder component.
- `src/components/atomic-crm/transport/StopsListEditor.tsx` - Editable stops list with drag-and-drop reordering.
- `src/components/atomic-crm/transport/StopRow.tsx` - Individual stop row component with type selector, location, time window, and lock toggle.
- `src/components/atomic-crm/transport/PickupDropSelector.tsx` - Office/Home/Metro selector component.

### Conflict Resolution Components
- `src/components/atomic-crm/transport/ConflictCard.tsx` - Individual conflict display card.
- `src/components/atomic-crm/transport/FixCards.tsx` - Fix Cards UI with three categories (time change, logistics, manual override).
- `src/components/atomic-crm/transport/TimeShiftOptions.tsx` - Time shift suggestion buttons (5/10/15/20 minutes).
- `src/components/atomic-crm/transport/LogisticsFixOptions.tsx` - Logistics fix options (assign second driver, split drop/pickup, etc.).

### Client Negotiation Components
- `src/components/atomic-crm/transport/ClientNegotiationDialog.tsx` - Dialog for suggesting time changes to clients.
- `src/components/atomic-crm/transport/PendingConfirmationIndicator.tsx` - Visual indicator for appointments pending client confirmation.
- `src/components/atomic-crm/transport/GhostBlock.tsx` - Ghost block component for timeline preview of pending changes.

### Draft Route Generation
- `src/components/atomic-crm/transport/utils/draftRouteGenerator.ts` - Main draft route generation algorithm.
- `src/components/atomic-crm/transport/utils/driverAssignmentSuggester.ts` - Driver assignment suggestion logic.
- `src/components/atomic-crm/transport/utils/pickupDropSuggester.ts` - Pickup/drop location suggestions (Office/Home/Metro).
- `src/components/atomic-crm/transport/utils/splitDriverLogic.ts` - Split driver logic for long caregiver shifts.

### Driver Mobile View
- `src/components/atomic-crm/transport/DriverMobileView.tsx` - Main mobile view component for drivers.
- `src/components/atomic-crm/transport/DriverRouteList.tsx` - List view of assigned stops for driver.
- `src/components/atomic-crm/transport/DriverRouteTimeline.tsx` - Timeline view of assigned stops for driver.
- `src/components/atomic-crm/transport/DriverStatusButtons.tsx` - Status update buttons (Arrived, Picked up, Dropped off, Running late).
- `src/components/atomic-crm/transport/GoogleMapsDeepLink.tsx` - Component for opening Google Maps app with navigation.

### Route Publishing & Status Tracking
- `src/components/atomic-crm/transport/hooks/useRoutePublishing.ts` - Hook for publishing routes to drivers.
- `src/components/atomic-crm/transport/hooks/useDriverStatus.ts` - Hook for tracking and updating driver status.
- `src/components/atomic-crm/transport/utils/statusImpactCalculator.ts` - Calculate impact of driver status updates on route ETAs.

### Playback Mode
- `src/components/atomic-crm/transport/PlaybackMode.tsx` - Playback mode component with time slider.
- `src/components/atomic-crm/transport/PlaybackControls.tsx` - Playback controls (play, pause, speed, time slider).
- `src/components/atomic-crm/transport/PlaybackMapView.tsx` - Map view showing driver positions at specific times.

### Main Transport Page
- `src/components/atomic-crm/transport/TransportPage.tsx` - Main page component integrating all transport features.
- `src/components/atomic-crm/transport/index.tsx` - Export file for transport components.

### Data Provider Extensions
- `src/components/atomic-crm/providers/supabase/dataProvider.ts` - Add custom methods for driver_trips and trip_legs resources.

### Existing Components to Reuse
- **Staff Management**: Staff table already exists with `first_name`, `last_name`, `phone`, `email`, `staff_type`. Drivers are identified by `staff_type` containing "driver" (case-insensitive). Use existing Staff type from `types.ts` and staff data provider methods.
- **Appointments**: Appointments table already has `driver_id`, `primary_staff_id`, `patient_id`, `start_time`, `end_time`, `appointment_type`, `status`, `pickup_instructions`. Use existing Appointment type and appointment data provider.
- **Contacts/Patients**: Contacts table already has `latitude`, `longitude`, `area`, `city`, `google_maps_link`, `flat_villa_number`, `building_street`. Use existing Contact type for patient locations.
- **Google Maps**: `AppointmentMapView.tsx` already shows Google Maps integration pattern. Reuse similar patterns for route visualization.
- **UI Components**: Use existing shadcn/ui components (Button, Badge, Card, Select, etc.) and React Admin patterns from other modules.

### Notes
- Unit tests should typically be placed alongside the code files they are testing (e.g., `distanceCalculator.ts` and `distanceCalculator.test.ts` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.
- When displaying driver names, use the existing pattern: `${staff.first_name} ${staff.last_name}`.trim() (see `StaffListContent.tsx`).
- When filtering drivers, use the existing pattern: `staff.filter(s => s.staff_type.toLowerCase().includes("driver"))` (see `AppointmentForm.tsx`).
- Staff locations (Office/Home/Metro) will need to be configured separately - these are not in the staff table yet and may need a settings/config table or hardcoded coordinates.

## Tasks

- [x] 1.0 Database Schema & Data Models

  **Context**: This task establishes the foundational database structure for the driver dispatch system. The system needs to track driver trips (planned work blocks) and trip legs (individual stops within a trip). We're extending the existing appointments system to support route planning while maintaining backward compatibility.

  **Example Scenario**: A driver (Staff member with `staff_type = "Driver"`) has a trip from 2:00 PM to 6:00 PM on 2025-01-15. The trip consists of 5 legs: (1) Pickup staff at Office, (2) Drop staff at Patient A, (3) Wait during appointment, (4) Pickup staff from Patient A, (5) Return to Office. Each leg has planned arrival/departure times, and some legs are linked to appointments.

  **Key Considerations**:
  - `driver_id` references existing `staff.id` where `staff.staff_type` contains "driver"
  - `appointment_id` in trip_legs references existing `appointments.id`
  - `staff_id` in trip_legs references existing `staff.id` for staff being picked up/dropped
  - Location types (office/home/metro) are enum values, while patient locations come from `contacts.latitude/longitude`
  - The system must support draft routes (status='draft') that can be edited before publishing (status='published')
  - [x] 1.1 Create migration file for `driver_trips` table with fields: id, driver_id, trip_date, start_time, end_time, status (draft/published/completed), vehicle_id (nullable for future), created_at, updated_at
  - [x] 1.2 Create migration file for `trip_legs` table with fields: id, trip_id, leg_type (pickup_staff/drop_staff/appointment/wait/return), leg_order, staff_id (nullable), appointment_id (nullable), location_type (office/home/metro/patient), location_id (references contacts for patient, or enum for office/metro), planned_arrival_time, planned_departure_time, actual_arrival_time (nullable), actual_departure_time (nullable), is_locked (boolean), wait_duration_minutes (nullable), return_location_type (office/home/metro), created_at, updated_at
  - [x] 1.3 Add foreign key constraints: trip_legs.trip_id → driver_trips.id, trip_legs.staff_id → staff.id, trip_legs.appointment_id → appointments.id, driver_trips.driver_id → staff.id
  - [x] 1.4 Add indexes on driver_trips (trip_date, driver_id, status) and trip_legs (trip_id, leg_order, appointment_id)
  - [x] 1.5 Enable RLS and create policies for authenticated users (read, insert, update, delete) on both tables
  - [x] 1.6 Create migration to add route-related fields to appointments: pending_client_confirmation (boolean), route_locked (boolean), suggested_time_change (timestamp nullable), client_confirmation_status (pending/approved/declined nullable)
  - [x] 1.7 Add TypeScript types for DriverTrip, TripLeg, and extend Appointment type in types.ts
  - [x] 1.8 Create transport-specific types file with RouteConflict, ConflictType, LegType, LocationType, and related enums/interfaces

- [x] 2.0 Core Route Planning Engine (Distance, Travel Time, Traffic)

  **Context**: This task builds the core calculation engine that powers all route planning decisions. The system needs to calculate real-world travel times and distances using Google Maps APIs, which account for traffic conditions. This engine is used by conflict detection, route optimization, and draft generation.

  **Example Scenario**: Manager wants to know if Driver A can pick up Staff B at Office (25.2048, 55.2708) at 2:00 PM and reach Patient C at their home (25.2764, 55.2962) by 2:30 PM. The engine calculates: distance = 12.5 km, travel time with current traffic = 18 minutes. Since 2:00 PM + 18 min = 2:18 PM < 2:30 PM, it's feasible. If traffic is heavy and travel time = 25 minutes, then 2:00 PM + 25 min = 2:25 PM, which is still feasible but tight (yellow status).

  **Key Considerations**:
  - Use existing `contacts.latitude` and `contacts.longitude` for patient locations
  - Office/Home/Metro locations for staff need to be configured (may need a settings table or constants)
  - Google Maps Distance Matrix API requires API key (already used in `AppointmentMapView.tsx`)
  - Batch calculations are essential to minimize API calls and costs
  - Traffic data is real-time and not stored permanently (recalculated on demand)
  - [x] 2.1 Create Google Maps API wrapper utility (googleMapsApi.ts) with functions for Distance Matrix API and Directions API calls
  - [x] 2.2 Implement distanceCalculator.ts with function to calculate distance between two coordinates using Google Maps Distance Matrix API
  - [x] 2.3 Implement travelTimeCalculator.ts with function to calculate travel time between locations with traffic awareness (using Distance Matrix API with traffic model)
  - [x] 2.4 Add ETA calculation function that considers current time, traffic conditions, and updates dynamically
  - [x] 2.5 Implement routeOptimizer.ts with function to optimize stop order for shortest travel time without changing appointment times
  - [x] 2.6 Add batch distance/time calculation function for multiple waypoints to minimize API calls
  - [x] 2.7 Create utility function to extract coordinates from contacts (patient locations) and staff (for office/home/metro locations)
  - [x] 2.8 Add error handling and retry logic for Google Maps API calls with rate limiting considerations

- [ ] 3.0 Dispatcher Board UI (Three-Panel Layout)

  **Context**: This is the primary workspace for managers to plan daily routes. The three-panel layout provides a comprehensive view: unplanned jobs on the left, driver timelines in the center, and map visualization on the right. All panels stay synchronized as the manager makes changes.

  **Example Scenario**: Manager opens Dispatcher Board for January 15, 2025. Left panel shows 8 unplanned appointments. Manager drags "Dr. Sarah - Patient A - 2:00 PM" from unplanned queue to Driver "Ahmed Hassan" timeline lane. The appointment appears as a block on Ahmed's timeline, and the map automatically updates showing Ahmed's route with a new stop. Manager can see Ahmed's route: Office → Patient A → Patient B → Office, with travel times and potential conflicts highlighted.

  **Key Considerations**:
  - Use existing Staff display pattern: `${staff.first_name} ${staff.last_name}` for driver names
  - Filter drivers using existing pattern: `staff.filter(s => s.staff_type.toLowerCase().includes("driver"))`
  - Appointments without assigned `driver_trips` are considered "unplanned"
  - Reuse Google Maps integration patterns from `AppointmentMapView.tsx`
  - Timeline should show color-coded blocks: green (safe buffer), yellow (tight < 10 min buffer), red (conflict/violation)
  - [ ] 3.1 Create main DispatcherBoard.tsx component with responsive three-panel layout (Unplanned Queue | Timeline Lanes | Map + Stops)
  - [ ] 3.2 Implement UnplannedJobsQueue.tsx: Fetch today's appointments without assigned trips, display as draggable cards showing time, area, staff, pickup/drop required, notes
  - [ ] 3.3 Implement DriverTimelineLanes.tsx: Display one horizontal lane per active driver, show time-based blocks (Pickup, Drop, Appointment, Wait) with color coding (green/yellow/red), support drag-and-drop from unplanned queue
  - [ ] 3.4 Implement RouteMapView.tsx: Google Maps integration showing route polylines per driver, numbered stops, icons for staff/patients/office/metro, synchronized with timeline
  - [ ] 3.5 Implement StopsList.tsx: Ordered list of stops below map, synchronized with selected driver's route, clickable to highlight on map
  - [ ] 3.6 Create useDispatcherState.ts hook to manage synchronized state between all three panels (selected driver, selected appointment, route updates)
  - [ ] 3.7 Add "Plan Today" button and date selector to switch between days
  - [ ] 3.8 Implement panel resizing and responsive breakpoints for mobile/tablet/desktop views

- [ ] 4.0 Route Builder Component (Per Driver)

  **Context**: This component allows managers to fine-tune individual driver routes. It provides detailed control over stop order, pickup/drop locations, and timing. This is where managers make manual adjustments after draft generation or when resolving conflicts.

  **Example Scenario**: Manager opens Route Builder for Driver "Ahmed Hassan" on January 15. The route shows: (1) Pickup Dr. Sarah at Office 2:00 PM, (2) Drop Dr. Sarah at Patient A 2:25 PM, (3) Wait 60 min, (4) Pickup Dr. Sarah at Patient A 3:25 PM, (5) Return to Office 3:45 PM. Manager notices Patient B appointment at 3:00 PM is not included. Manager drags to reorder: adds Patient B stop between Patient A drop and pickup. Manager changes Dr. Sarah's pickup location from "Office" to "Home" (closer to Patient A), which saves 10 minutes. Manager locks Patient A appointment time to prevent auto-changes.

  **Key Considerations**:
  - Staff names displayed using existing pattern: `${staff.first_name} ${staff.last_name}`
  - Patient names come from `contacts.first_name` and `contacts.last_name`
  - Office/Home/Metro locations need to be selectable (may need staff location preferences or settings)
  - Locked stops prevent automatic reordering during optimization
  - Validation must ensure logical sequence (e.g., can't drop staff before pickup)
  - [ ] 4.1 Create RouteBuilder.tsx component that opens in modal/drawer for selected driver, shows current route with stops list
  - [ ] 4.2 Implement StopsListEditor.tsx with drag-and-drop reordering using react-beautiful-dnd or dnd-kit
  - [ ] 4.3 Create StopRow.tsx component displaying: leg type icon, person/location name, planned time window, Pickup/Drop selector (Office/Home/Metro), drag handle, lock toggle
  - [ ] 4.4 Implement PickupDropSelector.tsx dropdown component for selecting Office/Home/Metro for staff pickup/drop locations
  - [ ] 4.5 Add "Optimize Order" button that reorders stops for shortest travel without changing appointment times
  - [ ] 4.6 Implement lock toggle functionality: locked stops cannot be auto-reordered or auto-changed
  - [ ] 4.7 Add undo functionality with history stack for route changes
  - [ ] 4.8 Add validation to prevent invalid stop sequences (e.g., drop before pickup)

- [ ] 5.0 Conflict Detection & Resolution System

  **Context**: This system automatically detects scheduling conflicts and provides managers with actionable fix options. Conflicts are normal in operations, so the system surfaces them early and clearly rather than hiding them. The Fix Cards UI presents three categories of solutions.

  **Example Scenario**: Driver "Ahmed Hassan" has a route: Pickup Dr. Sarah at Office 2:00 PM, Drop at Patient A 2:25 PM, then reach Patient B by 3:00 PM. Conflict detector calculates: Travel from Patient A to Patient B takes 35 minutes with current traffic. Arrival at Patient B would be 3:00 PM (2:25 PM + 35 min), which is exactly on time but leaves 0 buffer. If Patient A appointment runs 5 minutes late, Patient B would be 5 minutes late (violation). System shows red conflict card: "Patient B may be late by up to 5 minutes". Fix Cards offer: (A) Move Patient B appointment 10 minutes later (Recommended - 4+ hours notice), (B) Assign second driver for Patient B, (C) Force lateness (manual override).

  **Key Considerations**:
  - Patient lateness > 10 minutes is the only hard rule (not acceptable)
  - Early conflicts (≥4 hours) allow time changes without client approval
  - Late conflicts (<4 hours) require client approval for time changes
  - All fixes show preview before applying
  - Conflicts are recalculated after each route change
  - [ ] 5.1 Implement conflictDetector.ts: Function to detect conflicts (driver cannot reach stop on time, patient lateness > 10 minutes, overlapping legs)
  - [ ] 5.2 Add conflict classification logic: Early Conflict (≥4 hours before appointment) vs Late Conflict (<4 hours)
  - [ ] 5.3 Create ConflictCard.tsx component to display conflict details with severity indicator
  - [ ] 5.4 Implement FixCards.tsx component with three categories: A) Appointment Time Change (5/10/15/20 min options), B) Logistics Fixes (assign second driver, split drop/pickup, switch to metro, reorder stops), C) Manual Override (force lateness, lock route, ignore warning)
  - [ ] 5.5 Add preview functionality: Show updated route preview before applying fix
  - [ ] 5.6 Implement TimeShiftOptions.tsx with buttons for time shift suggestions, labeled as "Recommended" or "Short notice – client approval required" based on conflict classification
  - [ ] 5.7 Implement LogisticsFixOptions.tsx with options for split driver, assign second driver, switch return location, etc.
  - [ ] 5.8 Add conflict resolution handlers that update routes and recalculate ETAs after applying fixes

- [ ] 6.0 Client Negotiation Workflow

  **Context**: This workflow handles the process of requesting appointment time changes from clients. When a conflict requires a time change with short notice (<4 hours), the system enters a "pending confirmation" state where the proposed change is visible but not yet applied. The manager communicates with the client and records their response.

  **Example Scenario**: Conflict detected: Patient B appointment at 3:00 PM may be late. Manager clicks "Suggest time change to client" and selects "+10 minutes" (new time: 3:10 PM). System sets appointment status to `pending_client_confirmation` and shows ghost block on timeline at 3:10 PM. Manager calls client, explains the situation. Client agrees. Manager clicks "Client approved" → appointment time updates to 3:10 PM, routes recalculate, conflict clears. If client declined, manager clicks "Client declined" → appointment time locks at 3:00 PM, only logistics fixes remain available.

  **Key Considerations**:
  - Client information comes from `contacts` table (patient_id in appointments)
  - Ghost blocks use dotted/preview styling to indicate pending state
  - Pending confirmation status is visible on timeline, map, and appointment cards
  - Approved changes are logged (may use existing activity_log system)
  - Declined appointments get `route_locked = true` to prevent further time change suggestions
  - [ ] 6.1 Create ClientNegotiationDialog.tsx: Modal for manager to suggest time change to client, shows current time, suggested time, and reason
  - [ ] 6.2 Implement "Suggest time change to client" button in FixCards that sets appointment to pending_client_confirmation status
  - [ ] 6.3 Create PendingConfirmationIndicator.tsx: Visual indicator (badge/icon) on timeline and appointment cards showing pending status
  - [ ] 6.4 Implement GhostBlock.tsx: Dotted/preview blocks on timeline showing proposed time change before client approval
  - [ ] 6.5 Add "Client approved" button that updates appointment time, recalculates routes, clears conflict, logs as client-approved
  - [ ] 6.6 Add "Client declined" button that locks appointment time, removes time-shift options, keeps only logistics fixes available
  - [ ] 6.7 Update appointment status flow: scheduled → pending_client_confirmation → (approved → scheduled) or (declined → scheduled with locked time)

- [ ] 7.0 Draft Route Generation (Semi-Automated Suggestions)

  **Context**: This feature generates initial route suggestions automatically, saving managers significant planning time. The system analyzes all unplanned appointments, driver availability, locations, and travel times to suggest optimal assignments. All suggestions require manager approval before being applied.

  **Example Scenario**: Manager clicks "Generate Draft Routes" for January 15. System analyzes: 12 unplanned appointments, 3 active drivers (Ahmed, Mohammed, Fatima). Algorithm suggests: Ahmed handles 5 appointments in Dubai Marina area (all close together), Mohammed handles 4 appointments in JBR area, Fatima handles 3 appointments in Downtown. For each appointment, system suggests: pickup location (Office for morning, Home for afternoon based on proximity), wait vs leave (suggests WAIT for 1.5-hour gap, LEAVE for 3-hour gap), stop order (optimized for shortest travel). Manager reviews all suggestions on timeline/map, makes adjustments, then approves or regenerates.

  **Key Considerations**:
  - Only suggests, never auto-applies (manager must approve)
  - Uses existing driver filtering: `staff.filter(s => s.staff_type.toLowerCase().includes("driver"))`
  - Considers existing appointments already assigned to drivers
  - Wait vs Leave rule: ≤2 hours AND no other jobs → WAIT, otherwise → LEAVE
  - Split driver logic detects long shifts (e.g., morning drop 8 AM, evening pickup 6 PM)
  - Suggestions are clearly marked as "Draft" and can be edited before publishing
  - [ ] 7.1 Create draftRouteGenerator.ts: Main algorithm to generate draft routes for all unplanned appointments
  - [ ] 7.2 Implement driverAssignmentSuggester.ts: Logic to suggest which driver should handle which appointments based on proximity, current schedule, and availability
  - [ ] 7.3 Implement pickupDropSuggester.ts: Logic to suggest Office/Home/Metro for staff pickup/drop based on proximity and 2-hour wait rule
  - [ ] 7.4 Implement splitDriverLogic.ts: Detect when split driver is needed (long caregiver shifts, morning drop + evening pickup), suggest split assignments
  - [ ] 7.5 Add "Generate Draft Routes" button in DispatcherBoard that creates draft driver_trips and trip_legs records
  - [ ] 7.6 Implement wait vs leave recommendation: If wait ≤ 2 hours AND no other jobs → suggest WAIT, otherwise suggest LEAVE
  - [ ] 7.7 Add draft route preview before applying: Show all suggested routes on timeline/map for manager review
  - [ ] 7.8 Ensure all suggestions are clearly marked as suggestions and require manager approval before applying

- [ ] 8.0 Driver Mobile View

  **Context**: This is the read-only mobile interface for drivers to view their assigned routes and update their status. Drivers cannot edit routes or see other drivers' schedules. The interface is optimized for mobile devices with large touch targets and clear navigation.

  **Example Scenario**: Driver "Ahmed Hassan" opens mobile app on his phone. He sees his route for today (January 15): List view shows 5 stops. Stop 1: "Pickup Dr. Sarah - Office - 2:00 PM" with "Open in Google Maps" button. Ahmed taps button → Google Maps app opens with navigation to office. At 2:05 PM, Ahmed arrives and taps "Arrived". At 2:10 PM, Dr. Sarah is ready, Ahmed taps "Picked up". System updates ETAs for subsequent stops. At 2:25 PM, Ahmed reaches Patient A, taps "Arrived", then "Dropped off". If Ahmed is running 10 minutes late, he taps "Running late +10 min" → system recalculates Patient B arrival time, alerts manager if Patient B will be >10 minutes late.

  **Key Considerations**:
  - Driver identity comes from authenticated user (may need to link user to staff record)
  - Only shows routes where `driver_trips.driver_id` matches driver's staff ID
  - Status updates affect real-time ETAs and trigger manager alerts if patient lateness risk
  - Google Maps deep links use format: `https://www.google.com/maps/dir/?api=1&destination=lat,lng`
  - Mobile-responsive design with touch-friendly buttons (minimum 44x44px)
  - List and timeline views toggle for different preferences
  - [ ] 8.1 Create DriverMobileView.tsx: Main mobile-optimized component for drivers to view their assigned routes
  - [ ] 8.2 Implement DriverRouteList.tsx: List view showing all assigned stops with address, time, and status
  - [ ] 8.3 Implement DriverRouteTimeline.tsx: Timeline view showing stops in chronological order with visual timeline
  - [ ] 8.4 Add view toggle between list and timeline views
  - [ ] 8.5 Create DriverStatusButtons.tsx: Buttons for status updates (Arrived, Picked up, Dropped off, Running late with +5/+10/+15 minute options)
  - [ ] 8.6 Implement GoogleMapsDeepLink.tsx: "Open in Google Maps" button that creates deep link to Google Maps app with navigation to selected stop
  - [ ] 8.7 Add real-time status updates: When driver updates status, show updated ETAs and alert manager if patient lateness risk appears
  - [ ] 8.8 Implement mobile-responsive design with touch-friendly buttons and readable text sizes
  - [ ] 8.9 Add route filtering: Show only today's routes, or allow date selection for future routes

- [ ] 9.0 Route Publishing & Status Tracking

  **Context**: This handles the workflow of finalizing routes and tracking real-time driver status updates. Routes start as drafts, get reviewed/edited, then published to drivers. Once published, drivers can see and update their status, which triggers real-time recalculations and alerts.

  **Example Scenario**: Manager has reviewed all draft routes for January 15, resolved conflicts, and made final adjustments. Manager clicks "Publish All Routes" → system validates no unresolved conflicts exist, then updates all `driver_trips.status` from 'draft' to 'published'. Drivers receive notifications (or see updated routes in mobile app). During the day, Driver Ahmed updates status: "Running late +10 min" at 2:15 PM. System recalculates: Patient A arrival now 2:35 PM (was 2:25 PM), Patient B arrival now 3:10 PM (was 3:00 PM). Patient B appointment is at 3:00 PM, so lateness = 10 minutes (at threshold). System alerts manager: "Ahmed running late - Patient B may be 10 minutes late". Manager can then contact patient or adjust route.

  **Key Considerations**:
  - Publishing validates no red conflicts exist (yellow warnings are acceptable)
  - Published routes can be locked to prevent further changes
  - Status updates use existing `trip_legs.actual_arrival_time` and `actual_departure_time` fields
  - Real-time ETA recalculation uses current time + remaining travel time
  - Manager alerts trigger when patient lateness risk >10 minutes
  - Route completion automatically marks trip as 'completed' when all legs finished
  - [ ] 9.1 Create useRoutePublishing.ts hook: Function to publish routes (change driver_trips status from draft to published)
  - [ ] 9.2 Implement publish validation: Check for unresolved conflicts before allowing publish
  - [ ] 9.3 Create useDriverStatus.ts hook: Track driver status updates (arrived, picked up, dropped off, running late)
  - [ ] 9.4 Implement statusImpactCalculator.ts: Recalculate ETAs when driver reports "Running late", update subsequent stops, detect if patient lateness risk appears
  - [ ] 9.5 Add manager alerts: Notify manager when driver status update creates patient lateness risk (>10 minutes)
  - [ ] 9.6 Implement route locking: Published routes can be locked to prevent further changes
  - [ ] 9.7 Add route completion tracking: Mark trips as completed when all legs are finished
  - [ ] 9.8 Create data provider methods for driver_trips and trip_legs resources in dataProvider.ts

- [ ] 10.0 Playback Mode (Secondary View)

  **Context**: This is a secondary visualization tool for understanding route flow, training, and planning. It animates the day's routes over time, showing driver movements and stop activations. This helps managers visualize the entire operation and identify patterns or issues.

  **Example Scenario**: Manager wants to review yesterday's routes to understand why there were delays. Manager opens Playback Mode, selects January 14, clicks Play. Time slider moves from 8:00 AM to 6:00 PM. Map shows: At 9:00 AM, Driver Ahmed's marker appears at Office, moves along route polyline. At 9:15 AM, Stop 1 (Pickup Dr. Sarah) activates (highlighted). At 9:30 AM, Driver Ahmed reaches Patient A location, stop activates. At 10:00 AM, a conflict appears (red flash) - Patient B appointment time reached but driver still 5 minutes away. Manager can pause, rewind, change playback speed (2x, 4x) to analyze specific moments.

  **Key Considerations**:
  - Playback uses historical route data (published trips from past dates)
  - Driver positions interpolated between stops based on planned times
  - Conflicts appear at exact moments they occurred (based on planned vs actual times)
  - Useful for training new managers and understanding operational patterns
  - Can be used for "what-if" scenarios by playing back draft routes
  - Smooth animations enhance understanding of route flow
  - [ ] 10.1 Create PlaybackMode.tsx component: Secondary view accessible from DispatcherBoard for visual route understanding
  - [ ] 10.2 Implement PlaybackControls.tsx: Time slider across the day, play/pause buttons, speed controls (1x, 2x, 4x)
  - [ ] 10.3 Create PlaybackMapView.tsx: Map showing driver positions at specific time points, animated movement along routes
  - [ ] 10.4 Add stop activation: Visually highlight stops when their time window is reached in playback
  - [ ] 10.5 Implement conflict visualization: Show conflicts appearing at exact moments they occur during playback
  - [ ] 10.6 Add timeline synchronization: Playback timeline syncs with main dispatcher timeline
  - [ ] 10.7 Implement smooth animations for driver movement and stop activations

