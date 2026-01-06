# Product Requirements Document (PRD)
## Driver Assignment & Dispatch System  
**Product:** Home Healthcare Operations Platform  
**Document Type:** Founder / Manager–Facing PRD  
**Primary User:** Operations Manager  
**Secondary User:** Driver (read-only mobile view)  
**Status:** Final (based on full conversation context)

---

## 1. Product Vision

Build a **visual, conflict-aware, semi-automated driver dispatch system** that reflects real-world home healthcare operations.

The system must:
- Reduce daily mental planning effort
- Make routing decisions fast and visual
- Detect conflicts early and clearly
- Support negotiation with clients (time changes at any notice)
- Save fuel, time, and money
- Scale cleanly as drivers and vehicles increase

This is **not** a fully autonomous system.  
The system **suggests**, the manager **decides**.

---

## 2. Core Principles (Non-Negotiable)

1. **Manager Control First**
   - No route, assignment, or time change is auto-applied without approval.

2. **Visual > Algorithmic**
   - Timeline + Map + Stops List is the source of truth.

3. **Extreme Flexibility**
   - Staff pickup/drop can be Office, Home, or Metro — always selectable.

4. **Conflicts Are Normal**
   - The system must surface them early, not hide them.

5. **Client Negotiation Is Allowed Anytime**
   - Even short notice time changes are allowed if the client agrees.

6. **No Ambiguous Timing Rules**
   - Only one strict rule:
     - **Patient appointment lateness > 10 minutes is not acceptable**

---

## 3. User Roles

### 3.1 Manager (Primary User)
Capabilities:
- Plan daily driver routes
- View all drivers, appointments, and routes
- Resolve conflicts
- Suggest and approve appointment time changes
- Assign/split drivers
- Override any suggestion
- Publish routes to drivers

### 3.2 Driver (Secondary – Mobile View)
Capabilities:
- View own schedule (list or timeline)
- See pickup/drop locations
- Click a button to **open Google Maps app** for navigation
- Update status:
  - Arrived
  - Picked up
  - Dropped off
  - Running late (+5 / +10 / +15 minutes)

Drivers **cannot**:
- Edit routes
- See map inside the app
- Change timing or assignments

---

## 4. Key Concepts & Terminology

### 4.1 Driver Trip
A **Driver Trip** is a planned block of work for one driver over a time window.

Example:
> Driver 1 – 2:00 PM to 6:00 PM

### 4.2 Trip Legs
Each trip consists of ordered **legs**:
- Pickup staff
- Drop staff
- Appointment anchor
- Wait
- Return (Office / Home / Metro)

Legs are editable and reorderable by the manager.

---

## 5. Primary Screen: Dispatcher Board

### 5.1 Layout (Daily Planning Workspace)

**A. Unplanned Jobs Queue (Left Panel)**
- List of today’s appointments not yet routed
- Each card shows:
  - Time & duration
  - Area
  - Staff assigned
  - Pickup/drop required (yes/no)
  - Key notes
- Cards are draggable

**B. Driver Timeline Lanes (Center Panel)**
- One horizontal lane per driver
- Time-based blocks:
  - Pickup
  - Drop
  - Appointment
  - Wait
- Color states:
  - Green: safe
  - Yellow: tight
  - Red: violation

**C. Map + Stops List (Right Panel – Manager Only)**
- Google Maps view
- Shows:
  - Route polyline per driver
  - Numbered stops
  - Icons for staff, patients, office, metro
- Below map: ordered **Stops List**

All three panels are synchronized.

---

## 6. Daily Workflow (Manager)

1. Open **Plan Today**
2. Click **Generate Draft Routes**
3. Review each driver lane
4. Open Route Builder for a driver
5. Adjust:
   - Pickup/drop type (Office/Home/Metro)
   - Stop order
6. Resolve conflicts via Fix Cards
7. If needed, negotiate time changes with clients
8. Publish routes
9. Drivers receive updated schedules

---

## 7. Automation vs Manual Control

### 7.1 Fully Automated (Always On)
- Distance & travel time calculation
- Traffic-aware ETA (Google APIs)
- Conflict detection
- Patient lateness rule enforcement (10 minutes max)
- Wait vs Leave recommendation (2-hour rule)

### 7.2 Semi-Automated (Suggestions)
- Draft route generation
- Driver assignment suggestions
- Pickup/drop suggestions
- Split driver suggestions
- Appointment time-shift suggestions

### 7.3 Always Manual
- Final approval
- Client communication
- Accept/reject time changes
- Locking routes
- Forcing returns to office
- Overrides

---

## 8. Route Builder (Per Driver)

### 8.1 Stops List
Each stop row contains:
- Type: Pickup / Drop / Wait
- Person & location
- Planned time window
- **Pickup/Drop selector:** Office | Home | Metro
- Drag handle (reorder)
- Lock toggle (prevents auto changes)

### 8.2 Controls
- **Optimize Order** (reorders for shortest travel without changing appointment times)
- Undo (always available)

---

## 9. Conflict Detection

### 9.1 What Is a Conflict
A conflict exists if:
- Driver cannot reach a stop on time
- Patient lateness exceeds 10 minutes
- Driver has overlapping legs

### 9.2 Conflict Classification
- **Early Conflict:** ≥ 4 hours before appointment
- **Late Conflict:** < 4 hours before appointment

Classification affects **messaging**, not availability of options.

---

## 10. Conflict Resolution (Fix Cards)

When a conflict appears, the system shows Fix Cards with three categories:

### A. Appointment Time Change (Client-Dependent)
- Move earlier or later by:
  - 5 / 10 / 15 / 20 minutes
- Always allowed
- Labeled as:
  - “Recommended” (early notice)
  - “Short notice – client approval required”

### B. Logistics Fixes (Internal)
- Assign second driver
- Split drop/pickup
- Switch staff return to metro
- Reorder stops

### C. Manual Override
- Force lateness
- Lock route
- Ignore warning

Each option previews the updated route before applying.

---

## 11. Client Negotiation Flow

### Step 1: Suggest Time Change
Manager clicks **Suggest time change to client**

System:
- Sets appointment to **Pending Client Confirmation**
- Shows ghost blocks on timeline
- Dotted route preview
- No changes committed

### Step 2: Client Response

#### If Client Agrees
Manager clicks **Client approved**
- Appointment time updated
- Routes recalculated
- Conflict cleared
- Change logged as client-approved

#### If Client Declines
Manager clicks **Client declined**
- Appointment time locked
- Time-shift options removed
- Only logistics fixes remain

---

## 12. Wait vs Leave Logic

Default rule:
- If wait ≤ 2 hours AND no other jobs → suggest **WAIT**
- Otherwise → suggest **LEAVE**

Manager can override at any time.

---

## 13. Split Driver Logic

- Avoided by default
- Used when necessary:
  - Long caregiver shifts (morning drop, evening pickup)
  - Unavoidable conflicts

Split routes are clearly labeled.

---

## 14. Driver Mobile View

### What Driver Sees
- List/timeline of assigned stops
- Each stop has:
  - Address
  - **Open in Google Maps** button (deep link)
- Status buttons:
  - Arrived
  - Picked up
  - Dropped off
  - Running late (+5 / +10 / +15)

### Effects of “Running Late”
- Timeline shifts automatically
- Traffic ETAs recalculated
- Manager alerted if patient lateness risk appears

---

## 15. Traffic & ETA Handling

- Uses Google traffic-aware APIs
- ETAs refreshed:
  - On route planning
  - On driver status updates
  - On manual refresh
- Traffic data is **not permanently stored**, only recalculated

---

## 16. Playback Mode (Secondary View)

### Purpose
- Visual understanding
- Planning
- Training

### Behavior
- Time slider across the day
- Driver position moves along route
- Stops activate visually
- Conflicts appear at the exact moment they occur

---

## 17. Scalability

System must support:
- Unlimited drivers
- Unlimited vehicles
- Future constraints (vehicle assignment, fuel type)
- No redesign required as scale increases

---

## 18. Out of Scope (V1)

- Live GPS tracking
- In-app navigation
- Automatic client messaging
- Fully autonomous dispatch

---

## 19. Phase Roadmap

### Phase 1 – Visual + Manual
- Dispatcher Board
- Manual route building
- Conflict detection
- Driver mobile view

### Phase 2 – Smart Suggestions
- Draft route generation
- Pickup/drop recommendations
- Time-shift suggestions

### Phase 3 – Advanced (Optional)
- Learning from overrides
- Partial automation
- Performance analytics

---

## 20. Success Metrics

- Reduced daily planning time
- Fewer last-minute conflicts
- Reduced fuel/time wastage
- Clearer operational visibility
- Easier scaling of drivers & vehicles

---

## Progress Notes

### Task 5.0: Conflict Detection & Resolution System (Completed)

**Files Created:**
- `src/components/atomic-crm/transport/utils/conflictDetector.ts` - Main conflict detection engine that detects:
  - Patient lateness > 10 minutes (hard rule violation)
  - Unreachable stops (driver cannot reach stop on time)
  - Overlapping legs (driver scheduled in two places at once)
  - Insufficient buffer time (warnings for tight schedules)
- `src/components/atomic-crm/transport/ConflictCard.tsx` - Component to display conflict details with severity indicator, timing information, and affected patient
- `src/components/atomic-crm/transport/FixCards.tsx` - Main component with three tabs for conflict resolution options (Time Change, Logistics, Manual Override)
- `src/components/atomic-crm/transport/TimeShiftOptions.tsx` - Time shift suggestion buttons (5/10/15/20 minutes) with classification-based labeling
- `src/components/atomic-crm/transport/LogisticsFixOptions.tsx` - Logistics fix options (assign second driver, split drop/pickup, switch to metro, reorder stops)
- `src/components/atomic-crm/transport/hooks/useConflictResolution.ts` - Hook for applying fixes and recalculating routes

**Implementation Details:**
- Conflict detection uses Google Maps Distance Matrix API with traffic awareness
- Conflicts classified as "early" (≥4 hours) or "late" (<4 hours) for messaging
- ConflictCard displays severity (error/warning), classification, timing details, and affected patient
- FixCards provides three categories: Time Change (with TimeShiftOptions), Logistics Fixes, Manual Override
- Preview functionality shows route changes before applying fixes
- TimeShiftOptions labels buttons as "Recommended" or "Short notice – client approval required" based on classification
- Conflict resolution hook handles applying fixes, updating routes, and recalculating ETAs
- Integration with react-admin data providers for updating trip legs and appointments

**Testing:**
- No linting errors detected
- All TypeScript types properly integrated
- Components follow existing UI patterns (shadcn/ui components)
- Ready for integration with DispatcherBoard and RouteBuilder components

**Status:** ✅ All subtasks completed (5.1-5.8)

### Task 6.0: Client Negotiation Workflow (Completed)

**Files Created:**
- `src/components/atomic-crm/transport/ClientNegotiationDialog.tsx` - Modal dialog for manager to suggest time changes to clients, displaying current time, suggested time, reason, and client contact information with approval/decline buttons
- `src/components/atomic-crm/transport/PendingConfirmationIndicator.tsx` - Visual indicator component with multiple variants (badge, icon, inline) for showing pending client confirmation status
- `src/components/atomic-crm/transport/GhostBlock.tsx` - Dotted/preview blocks for timeline showing proposed time changes before client approval, with TimelineGhostBlock variant for timeline lanes
- `src/components/atomic-crm/transport/hooks/useClientNegotiation.ts` - Hook managing client negotiation workflow (suggest time change, handle approval/decline) with appointment status updates

**Files Modified:**
- `src/components/atomic-crm/transport/FixCards.tsx` - Added "Suggest time change to client" button in time change tab that triggers client negotiation dialog

**Implementation Details:**
- ClientNegotiationDialog shows patient contact info (phone, email), time change details, reason, and classification notice
- PendingConfirmationIndicator provides flexible display options (badge, icon, inline) for different UI contexts
- GhostBlock uses dotted border styling and orange color scheme to indicate preview/pending state
- useClientNegotiation hook handles:
  - Suggesting time changes (sets pending_client_confirmation, suggested_time_change, client_confirmation_status)
  - Client approval (updates appointment time, clears pending status, sets status to approved)
  - Client decline (locks appointment time with route_locked, clears pending status, sets status to declined)
- Integration with FixCards allows managers to suggest time changes directly from conflict resolution
- Appointment status flow: scheduled → pending_client_confirmation → (approved → scheduled) or (declined → scheduled with locked time)

**Testing:**
- No linting errors detected
- All TypeScript types properly integrated
- Components follow existing UI patterns (shadcn/ui Dialog, Badge, Button)
- Ready for integration with DispatcherBoard timeline and appointment cards

**Status:** ✅ All subtasks completed (6.1-6.7)

### Task 7.0: Draft Route Generation (Semi-Automated Suggestions) (Completed)

**Files Created:**
- `src/components/atomic-crm/transport/utils/draftRouteGenerator.ts` - Main algorithm that generates draft routes for all unplanned appointments, analyzing driver availability, locations, and travel times
- `src/components/atomic-crm/transport/utils/driverAssignmentSuggester.ts` - Logic to suggest driver assignments based on proximity score, workload score, and schedule fit score
- `src/components/atomic-crm/transport/utils/pickupDropSuggester.ts` - Logic to suggest Office/Home/Metro for staff pickup/drop based on proximity, time of day, and wait time
- `src/components/atomic-crm/transport/utils/splitDriverLogic.ts` - Detects when split driver is needed (long shifts >8 hours, morning drop + evening pickup, unavoidable conflicts)
- `src/components/atomic-crm/transport/hooks/useDraftRouteGeneration.ts` - Hook managing draft route generation workflow (generate, preview, apply, discard)

**Files Modified:**
- `src/components/atomic-crm/transport/DispatcherBoard.tsx` - Added "Generate Draft Routes" button, preview mode, and apply/discard functionality

**Implementation Details:**
- Draft route generator analyzes all unplanned appointments and suggests optimal driver assignments
- Driver assignment uses weighted scoring: proximity (40%), workload (30%), schedule fit (30%)
- Pickup/drop suggester considers time of day (office for morning, home/metro for afternoon) and wait time
- Wait vs Leave logic: ≤2 hours AND no other jobs → WAIT, otherwise → LEAVE
- Split driver detection for long shifts (>8 hours), morning/evening patterns, and unavoidable conflicts
- All generated routes are marked as "draft" status and require manager approval
- Preview mode shows all suggested routes on timeline/map before applying
- Apply functionality creates driver_trips and trip_legs records in database
- Discard functionality allows manager to reject suggestions and regenerate

**Testing:**
- No linting errors detected
- All TypeScript types properly integrated
- Ready for integration with timeline and map views for preview

**Status:** ✅ All subtasks completed (7.1-7.8)

### Task 8.0: Driver Mobile View (Completed)

**Files Created:**
- `src/components/atomic-crm/transport/DriverMobileView.tsx` - Main mobile-optimized component with date navigation, list/timeline toggle, route display, and status updates
- `src/components/atomic-crm/transport/DriverRouteList.tsx` - List view component showing stops with address, time, status, Google Maps links, and status buttons
- `src/components/atomic-crm/transport/DriverRouteTimeline.tsx` - Timeline view component with visual timeline, chronological ordering, and status indicators
- `src/components/atomic-crm/transport/DriverStatusButtons.tsx` - Touch-friendly status buttons (Arrived, Picked up, Dropped off, Running late dropdown) with minimum 44x44px size
- `src/components/atomic-crm/transport/GoogleMapsDeepLink.tsx` - Component for opening Google Maps app with navigation deep links
- `src/components/atomic-crm/transport/hooks/useDriverStatus.ts` - Hook for updating driver status, recalculating ETAs, and detecting patient lateness risks

**Implementation Details:**
- Mobile-responsive design with touch-friendly buttons (minimum 44x44px)
- List and timeline view toggle for different preferences
- Date navigation (previous/next day) for viewing routes
- Google Maps deep links use format: `https://www.google.com/maps/dir/?api=1&destination=lat,lng`
- Status updates: Arrived, Picked up, Dropped off, Running late (+5/+10/+15/+20/+30 min)
- Real-time ETA recalculation when driver reports "Running late"
- Patient lateness risk detection (>10 minutes) triggers alerts
- Only shows routes for authenticated driver (driver_id matches staff ID)
- Status badges show completion state (Completed, Arrived, etc.)
- Location display with addresses and icons for different location types
- Read-only interface - drivers cannot edit routes or see other drivers' schedules

**Testing:**
- No linting errors detected
- All TypeScript types properly integrated
- Mobile-responsive with touch-friendly interactions
- Ready for integration with authentication system

**Status:** ✅ All subtasks completed (8.1-8.9)

### Task 9.0: Route Publishing & Status Tracking (Completed)

**Files Created:**
- `src/components/atomic-crm/transport/hooks/useRoutePublishing.ts` - Hook for publishing routes (draft to published), validating unresolved conflicts, and locking/unlocking routes
- `src/components/atomic-crm/transport/hooks/useRouteCompletion.ts` - Hook for tracking route completion and automatically marking trips as completed when all legs finished (checks every 30 seconds)
- `src/components/atomic-crm/transport/utils/statusImpactCalculator.ts` - Calculates impact of driver status updates on route ETAs, recalculates subsequent stops, and detects patient lateness risks
- `src/components/atomic-crm/transport/utils/routeCompletionTracker.ts` - Utility functions for tracking route completion status
- `src/components/atomic-crm/transport/ManagerAlerts.tsx` - Component for displaying manager alerts with toast notifications (sonner), acknowledge/dismiss functionality

**Files Modified:**
- `src/components/atomic-crm/transport/hooks/useDriverStatus.ts` - Enhanced to use statusImpactCalculator for ETA recalculation and manager alerts with patient information
- `src/components/atomic-crm/transport/DispatcherBoard.tsx` - Integrated route publishing button, manager alerts display, and route completion tracking
- `src/components/atomic-crm/transport/DriverMobileView.tsx` - Enhanced driver status updates with patient info for lateness notifications
- `src/components/atomic-crm/providers/supabase/dataProvider.ts` - Added resource mappings for driver_trips and trip_legs

**Implementation Details:**
- Route publishing validates no red conflicts exist (yellow warnings are acceptable) before allowing publish
- Publishing changes driver_trips status from 'draft' to 'published'
- Route locking prevents further changes to published routes
- Status updates use trip_legs.actual_arrival_time and actual_departure_time fields
- Real-time ETA recalculation uses current time + remaining travel time when driver reports "Running late"
- Manager alerts trigger when patient lateness risk >10 minutes
- Status impact calculator recalculates all subsequent legs and detects conflicts
- Route completion tracker automatically marks trips as 'completed' when all legs finished
- Data provider methods support driver_trips and trip_legs resources

**Testing:**
- No linting errors detected
- All TypeScript types properly integrated
- Ready for integration with DispatcherBoard and DriverMobileView

**Status:** ✅ All subtasks completed (9.1-9.8)

**Integration Notes:**
- Route publishing integrated in DispatcherBoard with "Publish Routes" button
- Manager alerts component displayed at top of DispatcherBoard when alerts exist
- Route completion tracking runs automatically every 30 seconds
- Manager alerts triggered when drivers update status through DriverMobileView
- Toast notifications (sonner) used for real-time alert display

---

**End of PRD**
