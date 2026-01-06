# Transportation System - Quick Reference Guide

## Quick Access

- **Dispatcher Board**: `/transport`
- **Playback Mode**: Click "Playback Mode" button in Dispatcher Board header

## Common Tasks

### Assign Appointments to Drivers

**Option 1: Generate Draft Routes (Recommended)**
1. Click **"Generate Draft Routes"** ✨
2. Review suggestions on timeline/map
3. Click **"Apply Draft Routes"** or make adjustments first

**Option 2: Manual Assignment**
1. Drag appointment from **Unplanned Queue** to driver's timeline lane
2. System creates trip automatically
3. Use Route Builder to fine-tune

### Resolve Conflicts

1. **Identify**: Red blocks on timeline = conflicts
2. **Review**: Click conflict card to see details
3. **Fix Options**:
   - **Time Change**: 5/10/15/20 min (early conflicts) or client approval (late conflicts)
   - **Logistics**: Assign second driver, split route, switch location
   - **Override**: Force lateness, lock route (not recommended)
4. **Apply**: Click fix option → Preview → Apply

### Publish Routes

1. **Check**: No red conflicts, all appointments assigned
2. **Review**: Timeline and map look good
3. **Publish**: Click **"Publish Routes"** button
4. **Verify**: Routes appear in Driver Mobile View

### Review Past Operations

1. Navigate to past date
2. Click **"Playback Mode"** ▶️
3. Play through day at 2x speed
4. Slow to 1x for details
5. Watch for conflicts and delays

## Visual Indicators

### Timeline Colors
- **Green**: Safe buffer (> 10 min)
- **Yellow**: Tight buffer (< 10 min)
- **Red**: Conflict (must resolve)

### Map Markers
- **Blue circles**: Regular stops
- **Green circles**: Active stops (driver currently there)
- **Red circles**: Conflict stops
- **Red markers**: Driver positions

### Status Badges
- **Scheduled**: Appointment planned
- **Pending Confirmation**: Waiting for client approval
- **Published**: Route sent to driver
- **Completed**: Route finished

## Keyboard Shortcuts

- **Escape**: Close dialogs
- **Spacebar**: Play/Pause (Playback Mode) - Coming soon
- **Arrow Keys**: Navigate timeline - Coming soon

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| No routes showing | Check date, verify appointments exist, ensure routes published |
| Conflicts not clearing | Try different fix option, check for new conflicts |
| Map not loading | Check Google Maps API key configuration |
| Driver positions wrong | Verify patient coordinates, check location settings |
| Playback not working | Ensure routes exist for date, refresh page |

## Contact Information

- **Support**: Contact system administrator
- **Documentation**: See `docs/TRANSPORTATION_SYSTEM_GUIDE.md`
- **PRD**: See `docs/Transport.md`

---

**Quick Tip**: Always review draft routes in Playback Mode before publishing!

