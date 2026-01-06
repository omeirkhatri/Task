# Playback Mode User Guide

## Overview

Playback Mode is a visualization tool that allows managers to review and analyze route operations by animating driver movements and route activities over time. It's perfect for:
- **Training**: Teaching new managers how routes flow throughout the day
- **Review**: Analyzing past operations to identify patterns or issues
- **Planning**: Visualizing draft routes before publishing
- **Troubleshooting**: Understanding why delays or conflicts occurred

## Accessing Playback Mode

1. Navigate to the **Dispatcher Board** (`/transport`)
2. Select the date you want to review using the date navigation controls
3. Click the **"Playback Mode"** button in the header (with the Play icon ▶️)
4. The Playback Mode dialog will open in full-screen mode

## Interface Components

### Map View (Top Section)

The map displays:
- **Route Polylines**: Blue lines showing each driver's planned route
- **Stop Markers**: Numbered circles indicating each stop in sequence
  - **Blue markers**: Regular stops
  - **Green markers**: Active stops (currently being serviced)
  - **Red markers**: Stops with conflicts
- **Driver Markers**: Red circles showing driver positions
  - Drivers move smoothly along routes during playback
  - Position is interpolated between stops for realistic movement

### Controls Panel (Bottom Section)

#### Time Display
- **Current Time**: Shows the current playback time (e.g., "2:30 PM")
- **Day Range**: Shows the start and end times for the day (e.g., "8:00 AM - 6:00 PM")

#### Time Slider
- Drag the slider to jump to any time in the day
- The blue portion shows elapsed time
- Click anywhere on the slider to jump to that time

#### Playback Controls

**Reset Button** (↻)
- Returns playback to the start of the day
- Stops playback if it's running

**Skip Back** (⏮)
- Jumps backward 15 minutes
- Useful for reviewing specific moments

**Play/Pause** (▶️/⏸)
- Starts or pauses playback
- When playing, time advances automatically
- Playback stops automatically at the end of the day

**Skip Forward** (⏭)
- Jumps forward 15 minutes
- Useful for fast-forwarding through quiet periods

#### Speed Controls

- **1x**: Normal speed (1 minute per second)
- **2x**: Double speed (2 minutes per second)
- **4x**: Quadruple speed (4 minutes per second)

Use faster speeds to quickly review long periods, then slow down for detailed analysis.

## How to Use Playback Mode

### Basic Playback

1. **Start Playback**
   - Click the Play button (▶️)
   - Watch drivers move along their routes
   - Observe stops activate (turn green) when drivers arrive

2. **Control Playback**
   - Pause at any time to examine the current state
   - Use the slider to jump to specific times
   - Adjust speed based on what you're reviewing

3. **Review Conflicts**
   - Red markers indicate stops with conflicts
   - Conflicts appear when drivers cannot reach stops on time
   - Red pulsing circles highlight conflict locations

### Analyzing Routes

**Reviewing Past Operations:**
1. Select a past date from the Dispatcher Board
2. Open Playback Mode
3. Play through the day to see how routes actually flowed
4. Identify bottlenecks, delays, or inefficiencies

**Training New Managers:**
1. Use Playback Mode with a typical day's routes
2. Explain how drivers move between stops
3. Show how conflicts appear and resolve
4. Demonstrate optimal route patterns

**Planning Future Routes:**
1. Generate draft routes for a future date
2. Open Playback Mode to visualize the draft
3. Review the flow before publishing
4. Identify potential issues before they occur

### Understanding Visual Indicators

**Stop Markers:**
- **Blue (small)**: Regular stop, not currently active
- **Green (medium)**: Active stop - driver is currently at this location
- **Red (large)**: Conflict detected - driver cannot reach on time

**Driver Markers:**
- **Red circles**: Current driver position
- **Smooth movement**: Drivers move smoothly between stops
- **Position accuracy**: Position is interpolated based on planned times

**Route Lines:**
- **Blue polylines**: Planned route paths
- **Multiple routes**: Each driver's route is shown in a different color (if multiple drivers)

### Tips for Effective Use

1. **Start Slow**: Begin at 1x speed to understand the flow
2. **Speed Up**: Use 2x or 4x for overview, then slow down for details
3. **Jump Around**: Use skip buttons or slider to focus on specific time periods
4. **Watch Conflicts**: Pay attention to when and where conflicts appear
5. **Compare Days**: Review multiple days to identify patterns
6. **Use for Training**: Show new managers how routes work in practice

## Common Use Cases

### Case 1: Reviewing Yesterday's Operations

**Scenario**: Manager wants to understand why there were delays yesterday.

**Steps**:
1. Navigate to yesterday's date in Dispatcher Board
2. Open Playback Mode
3. Play through the day at 2x speed
4. Slow down to 1x when approaching known delay times
5. Observe driver positions and stop activations
6. Identify bottlenecks or route inefficiencies

### Case 2: Training a New Manager

**Scenario**: Training a new manager on route planning.

**Steps**:
1. Select a typical day with good route coverage
2. Open Playback Mode
3. Play at 1x speed, explaining:
   - How drivers move between stops
   - When stops become active
   - How conflicts appear and resolve
   - Optimal route patterns
4. Pause to answer questions
5. Review conflict resolution strategies

### Case 3: Previewing Draft Routes

**Scenario**: Manager wants to review draft routes before publishing.

**Steps**:
1. Generate draft routes for tomorrow
2. Open Playback Mode
3. Play through the draft routes
4. Look for potential conflicts or inefficiencies
5. Return to Dispatcher Board to make adjustments
6. Re-review in Playback Mode until satisfied

### Case 4: Analyzing Conflict Patterns

**Scenario**: Manager wants to understand when conflicts typically occur.

**Steps**:
1. Select a date with known conflicts
2. Open Playback Mode
3. Play through the day, watching for red conflict markers
4. Note the times and locations of conflicts
5. Analyze patterns (e.g., conflicts always occur after 3 PM)
6. Use insights to improve future route planning

## Keyboard Shortcuts

Currently, Playback Mode uses mouse/touch controls. Future enhancements may include:
- **Spacebar**: Play/Pause
- **Arrow Left**: Skip back 15 minutes
- **Arrow Right**: Skip forward 15 minutes
- **R**: Reset to start

## Troubleshooting

### Map Not Loading
- **Issue**: Map shows blank or error message
- **Solution**: Check that Google Maps API key is configured in environment variables (`VITE_GOOGLE_MAPS_API_KEY`)

### No Routes Showing
- **Issue**: Map loads but no routes or drivers appear
- **Solution**: 
  - Ensure there are published or draft routes for the selected date
  - Check that drivers have assigned trips
  - Verify trip legs exist for the trips

### Playback Too Fast/Slow
- **Issue**: Can't control playback speed effectively
- **Solution**: Use speed controls (1x, 2x, 4x) to adjust. Pause frequently to examine details.

### Conflicts Not Showing
- **Issue**: Conflicts should appear but don't
- **Solution**: 
  - Conflicts are detected based on planned vs actual times
  - Ensure routes have been published and have actual arrival/departure times
  - Check that conflict detection is working in the main Dispatcher Board

## Technical Details

### How Driver Positions Are Calculated

Driver positions are interpolated between stops based on:
- Planned departure time from previous stop
- Planned arrival time at next stop
- Current playback time
- Linear interpolation between coordinates

### How Active Stops Are Determined

A stop is considered "active" when:
- Current playback time >= planned arrival time
- Current playback time <= planned departure time (or arrival + 30 min default)

### How Conflicts Are Detected

Conflicts are detected when:
- Driver cannot reach a stop on time (unreachable stop)
- Patient appointment will be late > 10 minutes (patient lateness)
- Driver scheduled in two places at once (overlapping legs)
- Insufficient buffer time between stops (< 10 minutes)

## Best Practices

1. **Regular Reviews**: Use Playback Mode regularly to review operations
2. **Pattern Recognition**: Look for recurring issues across multiple days
3. **Training Tool**: Use it as a training resource for new team members
4. **Pre-Flight Check**: Always preview draft routes before publishing
5. **Conflict Analysis**: Study conflicts to improve route planning
6. **Documentation**: Take screenshots or notes of interesting patterns

## Future Enhancements

Potential improvements coming in future versions:
- Real-time conflict detection during playback
- Export playback as video
- Multiple day comparison view
- Driver-specific filtering
- Stop-specific filtering
- Conflict timeline view
- Performance metrics overlay

## Support

For issues or questions about Playback Mode:
1. Check this guide first
2. Review the main Transport documentation (`docs/Transport.md`)
3. Check the Dispatcher Board documentation
4. Contact your system administrator

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Related Documentation**: `docs/Transport.md`, `tasks/tasks-Transport.md`

