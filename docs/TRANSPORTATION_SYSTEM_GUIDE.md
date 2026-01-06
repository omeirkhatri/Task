# Driver Assignment & Dispatch System - Complete User Guide

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Dispatcher Board](#dispatcher-board)
4. [Route Planning](#route-planning)
5. [Conflict Resolution](#conflict-resolution)
6. [Client Negotiation](#client-negotiation)
7. [Route Publishing](#route-publishing)
8. [Driver Mobile View](#driver-mobile-view)
9. [Playback Mode](#playback-mode)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The Driver Assignment & Dispatch System is a visual, conflict-aware, semi-automated driver dispatch system designed for home healthcare operations. It helps managers:

- **Reduce daily planning effort** through automated route suggestions
- **Make routing decisions fast and visual** with timeline and map views
- **Detect conflicts early** and resolve them before they become problems
- **Negotiate with clients** for time changes when needed
- **Save fuel, time, and money** through optimized routing
- **Scale efficiently** as drivers and vehicles increase

### Key Principles

1. **Manager Control First**: No route, assignment, or time change is auto-applied without approval
2. **Visual > Algorithmic**: Timeline + Map + Stops List is the source of truth
3. **Extreme Flexibility**: Staff pickup/drop can be Office, Home, or Metro
4. **Conflicts Are Normal**: The system surfaces them early, not hides them
5. **Client Negotiation Is Allowed Anytime**: Even short notice time changes are allowed if client agrees
6. **One Strict Rule**: Patient appointment lateness > 10 minutes is not acceptable

---

## Getting Started

### Accessing the System

1. Navigate to **Transport** in the main menu (`/transport`)
2. The **Dispatcher Board** will open showing today's date
3. You'll see three panels:
   - **Left**: Unplanned Jobs Queue
   - **Center**: Driver Timeline Lanes
   - **Right**: Route Map View + Stops List

### Understanding the Interface

**Unplanned Jobs Queue (Left Panel)**
- Shows appointments without assigned driver trips
- Displays time, area, staff, pickup/drop requirements, and notes
- Drag appointments to driver lanes to assign them

**Driver Timeline Lanes (Center Panel)**
- One horizontal lane per active driver
- Shows time-based blocks (Pickup, Drop, Appointment, Wait)
- Color coding: Green (safe), Yellow (tight < 10 min buffer), Red (conflict)
- Supports drag-and-drop from unplanned queue

**Route Map View (Right Panel)**
- Google Maps showing route polylines per driver
- Numbered stops with icons for staff/patients/office/metro
- Synchronized with timeline selection
- Stops List below map shows ordered stops for selected driver

---

## Dispatcher Board

### Date Navigation

**Changing Dates:**
- Use **←** and **→** arrows to move between days
- Click **"Today"** to jump to current date
- Date selector shows current date in format: "Monday, January 15, 2025"
- Click **"Plan Today"** to focus on today's routes

**Viewing Different Days:**
- Past dates: Review completed routes
- Today: Plan and manage current routes
- Future dates: Plan ahead

### Panel Resizing

- **Left Panel**: Drag the right edge to resize
- **Right Panel**: Drag the left edge to resize
- Panels automatically adjust for mobile/tablet views

### Selecting Drivers

- Click on a driver's timeline lane to select them
- Selected driver's route highlights on the map
- Stops List updates to show selected driver's stops

---

## Route Planning

### Method 1: Generate Draft Routes (Recommended)

**When to Use:**
- Starting fresh for a new day
- Many unplanned appointments
- Want system suggestions

**Steps:**
1. Ensure you're on the correct date
2. Review unplanned appointments in left panel
3. Click **"Generate Draft Routes"** button (with Sparkles icon ✨)
4. System analyzes:
   - Unplanned appointments
   - Driver availability
   - Locations and travel times
   - Proximity and workload
5. Review suggested routes on timeline and map
6. Make adjustments as needed
7. Click **"Apply Draft Routes"** to save, or **"Discard Drafts"** to start over

**What the System Suggests:**
- Driver assignments based on proximity and workload
- Pickup/drop locations (Office/Home/Metro) based on proximity
- Stop order optimized for shortest travel
- Wait vs Leave decisions (≤2 hours AND no other jobs → WAIT, otherwise → LEAVE)
- Split driver assignments for long shifts

### Method 2: Manual Assignment

**When to Use:**
- Few appointments to assign
- Specific driver preferences
- Fine-tuning after draft generation

**Steps:**
1. Drag appointment from **Unplanned Jobs Queue** to driver's timeline lane
2. System creates trip and trip legs automatically
3. Use **Route Builder** to fine-tune:
   - Click on driver's route block
   - Opens Route Builder modal
   - Reorder stops with drag-and-drop
   - Change pickup/drop locations
   - Lock stops to prevent auto-changes

### Route Builder

**Accessing:**
- Click on any route block in timeline, or
- Right-click on driver's route

**Features:**
- **Stops List Editor**: Drag-and-drop reordering
- **Stop Details**: Shows leg type, person/location, time window
- **Pickup/Drop Selector**: Change Office/Home/Metro locations
- **Lock Toggle**: Lock stops to prevent auto-reordering
- **Optimize Order**: Button to reorder for shortest travel (respects locked stops)
- **Undo**: History stack for route changes
- **Validation**: Prevents invalid sequences (e.g., drop before pickup)

**Best Practices:**
- Lock critical appointment times
- Optimize order after manual changes
- Review conflicts before saving

---

## Conflict Resolution

### Understanding Conflicts

The system detects four types of conflicts:

1. **Patient Lateness** (> 10 minutes)
   - Hard rule violation
   - Driver cannot reach appointment on time
   - Must be resolved before publishing

2. **Unreachable Stop**
   - Driver cannot reach stop on time
   - Travel time exceeds available time

3. **Overlapping Legs**
   - Driver scheduled in two places at once
   - Time windows overlap

4. **Insufficient Buffer** (< 10 minutes)
   - Warning (not error)
   - Tight schedule with minimal buffer
   - May become conflict if delays occur

### Conflict Classification

- **Early Conflict** (≥4 hours before appointment)
  - Time changes can be made without client approval
  - More flexibility in resolution

- **Late Conflict** (< 4 hours before appointment)
  - Time changes require client approval
  - Limited resolution options

### Resolving Conflicts

**Step 1: Identify Conflicts**
- Red blocks on timeline indicate conflicts
- Conflict cards appear showing details
- Map shows conflict locations with red markers

**Step 2: Review Fix Options**

**Category A: Appointment Time Change**
- **5/10/15/20 minute options**
- Labeled as "Recommended" (early conflicts) or "Short notice – client approval required" (late conflicts)
- Shows preview of updated route

**Category B: Logistics Fixes**
- **Assign Second Driver**: Split route between two drivers
- **Split Drop/Pickup**: Use different drivers for drop and pickup
- **Switch to Metro**: Change return location to metro station
- **Reorder Stops**: Optimize stop sequence

**Category C: Manual Override**
- **Force Lateness**: Accept lateness (not recommended)
- **Lock Route**: Prevent further changes
- **Ignore Warning**: For insufficient buffer warnings

**Step 3: Apply Fix**
- Click on desired fix option
- Review preview if available
- Click **"Apply Fix"** to implement
- System recalculates routes and ETAs
- Conflicts update automatically

**Step 4: Verify Resolution**
- Check timeline for cleared conflicts
- Review updated route on map
- Ensure no new conflicts created

---

## Client Negotiation

### When to Negotiate

- Late conflicts (< 4 hours) requiring time changes
- Client flexibility needed for route optimization
- Emergency situations requiring schedule changes

### Suggesting Time Changes

**Steps:**
1. Identify conflict requiring time change
2. Click **"Suggest time change to client"** in Fix Cards
3. Select time shift (5/10/15/20 minutes)
4. System shows:
   - Current appointment time
   - Suggested new time
   - Reason for change
   - Client contact information
5. Contact client (phone/email) to discuss
6. Record client response:
   - **"Client Approved"**: Updates appointment time, recalculates routes
   - **"Client Declined"**: Locks appointment time, removes time-shift options

### Visual Indicators

**Pending Confirmation:**
- Ghost blocks (dotted/preview) on timeline
- Badge/icon on appointment cards
- Shows proposed time change before approval

**After Response:**
- Approved: Appointment time updates, routes recalculate
- Declined: Appointment locks, only logistics fixes available

### Best Practices

- Contact clients early for better success rates
- Explain reason clearly (traffic, previous delays, etc.)
- Offer alternatives when possible
- Document responses in appointment notes

---

## Route Publishing

### Before Publishing

**Checklist:**
- ✅ All appointments assigned to drivers
- ✅ No red conflicts (errors)
- ✅ Yellow warnings reviewed and acceptable
- ✅ Routes optimized and efficient
- ✅ Client negotiations completed (if any)
- ✅ All stops have valid locations

### Publishing Routes

**Steps:**
1. Review all routes on timeline and map
2. Verify no unresolved conflicts
3. Click **"Publish Routes"** button
4. System validates:
   - No error-level conflicts
   - All routes complete
   - Valid trip data
5. Routes change status from "draft" to "published"
6. Drivers receive notifications (if configured)
7. Routes appear in Driver Mobile View

### After Publishing

- Routes can be locked to prevent changes
- Drivers can update status (arrived, picked up, dropped off, running late)
- Real-time ETAs recalculate based on driver status
- Manager alerts trigger if patient lateness risk appears

### Route Locking

- Lock published routes to prevent further changes
- Useful for routes already in progress
- Unlock if adjustments needed

---

## Driver Mobile View

### Access

Drivers access their routes through the mobile-optimized view:
- Navigate to Transport section
- System shows only driver's assigned routes
- Filter by date (today or future dates)

### Features

**List View:**
- All assigned stops in order
- Shows address, time, status badges
- Google Maps deep link buttons
- Status update buttons

**Timeline View:**
- Stops in chronological order
- Visual timeline with position indicators
- Status updates synchronized

**Status Updates:**
- **Arrived**: Driver has reached stop location
- **Picked Up**: Staff member picked up
- **Dropped Off**: Staff member dropped off
- **Running Late**: Driver reports delay (+5/+10/+15/+20/+30 minutes)

**Google Maps Integration:**
- **"Open in Google Maps"** button for each stop
- Opens Google Maps app with navigation
- Deep link format: `https://www.google.com/maps/dir/?api=1&destination=lat,lng`

### Real-Time Updates

- Status updates affect ETAs for subsequent stops
- System recalculates arrival times automatically
- Manager alerts if patient lateness risk appears
- Route completion tracked automatically

### Driver Best Practices

- Update status promptly at each stop
- Use "Running Late" if delays occur
- Check next stop ETA after status updates
- Contact manager if significant delays expected

---

## Playback Mode

### Overview

Playback Mode is a visualization tool for reviewing route operations over time. Perfect for:
- **Training**: Teaching new managers route flow
- **Review**: Analyzing past operations
- **Planning**: Visualizing draft routes
- **Troubleshooting**: Understanding delays or conflicts

### Accessing

1. Navigate to Dispatcher Board
2. Select date to review
3. Click **"Playback Mode"** button (Play icon ▶️)
4. Full-screen dialog opens

### Interface

**Map View (Top):**
- Route polylines (blue lines)
- Stop markers (numbered circles)
  - Blue: Regular stops
  - Green: Active stops (currently being serviced)
  - Red: Conflict stops
- Driver markers (red circles) showing positions

**Controls Panel (Bottom):**
- **Time Display**: Current playback time and day range
- **Time Slider**: Drag to jump to any time
- **Playback Controls**: Reset, Skip Back, Play/Pause, Skip Forward
- **Speed Controls**: 1x, 2x, 4x

### Using Playback Mode

**Basic Playback:**
1. Click Play button (▶️)
2. Watch drivers move along routes
3. Observe stops activate (turn green) when drivers arrive
4. Pause to examine current state

**Analyzing Routes:**
- Use slider to jump to specific times
- Adjust speed (1x for detail, 4x for overview)
- Watch for conflict appearances
- Review driver movements and stop activations

**Common Use Cases:**
- **Review Yesterday**: Play through completed routes to identify issues
- **Training**: Show new managers how routes work
- **Preview Drafts**: Visualize draft routes before publishing
- **Conflict Analysis**: Study when and where conflicts occur

See `docs/PLAYBACK_MODE_GUIDE.md` for detailed Playback Mode documentation.

---

## Best Practices

### Daily Workflow

**Morning Routine:**
1. Open Dispatcher Board for today
2. Review unplanned appointments
3. Generate draft routes
4. Review suggestions on timeline and map
5. Resolve conflicts
6. Make final adjustments
7. Publish routes

**During the Day:**
1. Monitor driver status updates
2. Respond to manager alerts
3. Handle unexpected changes
4. Update routes if needed
5. Communicate with drivers and clients

**End of Day:**
1. Review completed routes
2. Use Playback Mode to analyze operations
3. Identify patterns or issues
4. Plan improvements for next day

### Route Planning Tips

1. **Start Early**: Generate draft routes early in the day
2. **Review Conflicts**: Address conflicts before publishing
3. **Optimize Order**: Use optimize button after manual changes
4. **Lock Critical Times**: Lock important appointment times
5. **Consider Traffic**: Account for traffic patterns in planning
6. **Balance Workload**: Distribute routes evenly among drivers

### Conflict Resolution Tips

1. **Address Early**: Resolve conflicts as soon as detected
2. **Use Time Changes**: Often simplest solution for early conflicts
3. **Consider Logistics**: Split drivers or routes when needed
4. **Communicate**: Keep clients informed of changes
5. **Document**: Note resolutions in appointment notes

### Client Negotiation Tips

1. **Contact Early**: More time = better success rate
2. **Explain Clearly**: Provide reason for time change
3. **Offer Alternatives**: Give options when possible
4. **Be Flexible**: Consider client preferences
5. **Follow Up**: Confirm changes with clients

### Driver Management Tips

1. **Clear Communication**: Provide clear route instructions
2. **Status Updates**: Encourage prompt status updates
3. **Monitor ETAs**: Watch for lateness risks
4. **Support Drivers**: Help when delays occur
5. **Feedback Loop**: Learn from driver feedback

---

## Troubleshooting

### Common Issues

**No Routes Showing:**
- **Issue**: Map or timeline empty
- **Solution**: 
  - Check date selection
  - Verify appointments exist for date
  - Ensure routes are published or draft
  - Check driver assignments

**Conflicts Not Clearing:**
- **Issue**: Conflicts persist after applying fixes
- **Solution**:
  - Verify fix was applied correctly
  - Check for new conflicts created
  - Review route calculations
  - Try different fix option

**Map Not Loading:**
- **Issue**: Google Maps shows error or blank
- **Solution**:
  - Check `VITE_GOOGLE_MAPS_API_KEY` environment variable
  - Verify API key is valid
  - Check browser console for errors
  - Ensure internet connection

**Driver Positions Incorrect:**
- **Issue**: Driver markers in wrong locations
- **Solution**:
  - Verify patient coordinates in contacts
  - Check office/home/metro locations configured
  - Review trip leg locations
  - Refresh map view

**Playback Mode Not Working:**
- **Issue**: Playback doesn't start or shows no data
- **Solution**:
  - Ensure routes exist for selected date
  - Check trip legs are loaded
  - Verify driver trips are published
  - Refresh page if needed

**Status Updates Not Reflecting:**
- **Issue**: Driver status changes don't update ETAs
- **Solution**:
  - Verify status update was saved
  - Check route recalculation
  - Refresh view
  - Review conflict detection

### Getting Help

1. **Check Documentation**: Review this guide and related docs
2. **System Logs**: Check browser console for errors
3. **Data Verification**: Verify appointments, drivers, and routes exist
4. **Support**: Contact system administrator if issues persist

---

## Keyboard Shortcuts

Currently, the system primarily uses mouse/touch controls. Future enhancements may include:
- **Spacebar**: Play/Pause (Playback Mode)
- **Arrow Keys**: Navigate timeline
- **Escape**: Close dialogs/modals
- **Ctrl/Cmd + S**: Save route changes

---

## System Requirements

### Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge

### Mobile Support
- iOS Safari
- Android Chrome
- Responsive design for tablets

### Required Configuration
- Google Maps API key (`VITE_GOOGLE_MAPS_API_KEY`)
- Supabase connection configured
- Staff with driver type configured
- Contacts with coordinates for patients

---

## Advanced Features

### Draft Route Generation

The system uses sophisticated algorithms to suggest routes:
- **Proximity Analysis**: Assigns drivers based on location
- **Workload Balancing**: Distributes routes evenly
- **Travel Time Calculation**: Uses Google Maps with traffic
- **Wait vs Leave Logic**: Optimizes driver time usage
- **Split Driver Detection**: Identifies long shifts needing splits

### Conflict Detection

Real-time conflict detection uses:
- **Google Maps Distance Matrix API**: Accurate travel times
- **Traffic Awareness**: Considers current traffic conditions
- **Buffer Calculations**: Ensures adequate time between stops
- **Overlap Detection**: Identifies scheduling conflicts

### Route Optimization

Optimization algorithms:
- **Stop Reordering**: Minimizes total travel time
- **Locked Stop Respect**: Maintains critical time constraints
- **Multi-Driver Coordination**: Avoids conflicts across drivers

---

## Related Documentation

- **PRD**: `docs/Transport.md` - Complete product requirements
- **Task List**: `tasks/tasks-Transport.md` - Implementation tasks
- **Playback Mode**: `docs/PLAYBACK_MODE_GUIDE.md` - Detailed playback guide
- **Database Schema**: `supabase/migrations/` - Database structure
- **API Setup**: `docs/GOOGLE_MAPS_API_SETUP.md` - Google Maps configuration

---

## Version History

**Version 1.0** (January 2025)
- Initial release
- Dispatcher Board with three-panel layout
- Draft route generation
- Conflict detection and resolution
- Client negotiation workflow
- Route publishing
- Driver mobile view
- Playback Mode

---

## Support and Feedback

For issues, questions, or feedback:
1. Check this guide first
2. Review related documentation
3. Check system logs and console
4. Contact your system administrator
5. Provide detailed information about the issue

---

**Last Updated**: January 2025  
**Version**: 1.0  
**System**: Driver Assignment & Dispatch System

