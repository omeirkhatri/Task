# Timezone Usage Guide for Developers

## ⚠️ CRITICAL: Always Use Timezone Utilities

**NEVER use native JavaScript Date methods directly** for timezone-aware operations. Always use the utilities from `timezone-api.ts`.

## Quick Reference

### ✅ DO THIS

```typescript
import {
  formatCrmDate,
  formatCrmTime,
  extractCrmTime,
  createCrmDate,
  parseCrmDateString,
  getCrmTimeComponents,
  getCrmDateComponents,
  crmDateTimeStringToISO,
  crmAddDays,
  crmStartOfDay,
} from "@/components/atomic-crm/misc/timezone-api";

// Format dates/times
const dateStr = formatCrmDate(new Date()); // "26/12/2025"
const timeStr = formatCrmTime(new Date()); // "14:30"
const timeOnly = extractCrmTime(new Date()); // "14:30"

// Create dates in CRM timezone
const date = createCrmDate(2025, 12, 26, 14, 30); // Dec 26, 2025 at 14:30 in CRM timezone

// Parse date strings
const parsed = parseCrmDateString("2025-12-26T14:30");

// Get components
const { hour, minute } = getCrmTimeComponents(new Date());
const { year, month, day } = getCrmDateComponents(new Date());

// Date manipulation
const tomorrow = crmAddDays(new Date(), 1);
const startOfDay = crmStartOfDay(new Date());

// Convert to ISO for database
const isoString = crmDateTimeStringToISO("2025-12-26T14:30");
```

### ❌ DON'T DO THIS

```typescript
// ❌ WRONG: Direct Date methods ignore timezone
const hour = new Date().getHours(); // Browser local time, not CRM timezone!
const date = new Date(2025, 11, 26, 14, 30); // Browser local timezone, not CRM!

// ❌ WRONG: toISOString() always returns UTC
const iso = new Date().toISOString(); // UTC, not CRM timezone!

// ❌ WRONG: Manual date arithmetic
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1); // May have timezone issues
```

## Common Patterns

### Pattern 1: Display Current Time in CRM Timezone

```typescript
import { formatCrmTime, formatCrmDate } from "@/components/atomic-crm/misc/timezone-api";

const now = new Date();
const time = formatCrmTime(now); // "14:30" in CRM timezone
const date = formatCrmDate(now); // "26/12/2025" in CRM timezone
```

### Pattern 2: Create Date from User Input

```typescript
import { createCrmDate, crmDateTimeStringToISO } from "@/components/atomic-crm/misc/timezone-api";

// User enters: "2025-12-26" and "14:30"
const date = createCrmDate(2025, 12, 26, 14, 30);
const isoForDB = crmDateTimeStringToISO("2025-12-26T14:30");
```

### Pattern 3: Extract Time from Date

```typescript
import { extractCrmTime, getCrmTimeComponents } from "@/components/atomic-crm/misc/timezone-api";

const date = new Date(); // From database or API
const timeStr = extractCrmTime(date); // "14:30" in CRM timezone
const { hour, minute } = getCrmTimeComponents(date); // { hour: 14, minute: 30 }
```

### Pattern 4: Date Arithmetic

```typescript
import { crmAddDays, crmAddHours, crmStartOfDay } from "@/components/atomic-crm/misc/timezone-api";

const tomorrow = crmAddDays(new Date(), 1);
const in2Hours = crmAddHours(new Date(), 2);
const startToday = crmStartOfDay(new Date());
```

### Pattern 5: Parse Date from String

```typescript
import { parseCrmDateString, crmDateTimeStringToDate } from "@/components/atomic-crm/misc/timezone-api";

// From database (ISO string)
const date1 = parseCrmDateString("2025-12-26T14:30:00Z");

// From form input (YYYY-MM-DDTHH:MM)
const date2 = crmDateTimeStringToDate("2025-12-26T14:30");
```

## When Adding New Features

### Checklist

- [ ] Import from `timezone-api.ts`, not directly from `timezone.ts`
- [ ] Use `formatCrmTime()` instead of `date.getHours()` + `date.getMinutes()`
- [ ] Use `formatCrmDate()` instead of `date.getDate()` + `date.getMonth()` + `date.getFullYear()`
- [ ] Use `createCrmDate()` instead of `new Date(year, month, day, hour, minute)`
- [ ] Use `crmDateTimeStringToISO()` instead of `date.toISOString()` for database storage
- [ ] Use `crmAddDays()`, `crmAddHours()` instead of manual date arithmetic
- [ ] Test with different timezones (especially UTC+4 and UTC-5)

### Testing Timezone-Aware Code

```typescript
// Test that time extraction works correctly
const testDate = createCrmDate(2025, 12, 26, 0, 0); // Midnight in CRM timezone
const time = extractCrmTime(testDate);
expect(time).toBe("00:00"); // Should be 00:00, not 08:00 or 20:00

// Test date arithmetic
const tomorrow = crmAddDays(crmStartOfDay(new Date()), 1);
expect(formatCrmDate(tomorrow)).toBe(/* tomorrow's date in CRM timezone */);
```

## Migration Guide

If you find code using direct Date methods:

1. **Replace `date.getHours()` / `date.getMinutes()`**
   ```typescript
   // Before
   const hour = date.getHours();
   const minute = date.getMinutes();
   
   // After
   const { hour, minute } = getCrmTimeComponents(date);
   ```

2. **Replace `new Date(year, month, day, hour, minute)`**
   ```typescript
   // Before
   const date = new Date(2025, 11, 26, 14, 30);
   
   // After
   const date = createCrmDate(2025, 12, 26, 14, 30); // Note: month is 1-12, not 0-11
   ```

3. **Replace `date.toISOString()` for database storage**
   ```typescript
   // Before
   const iso = date.toISOString();
   
   // After (if you have a datetime string)
   const iso = crmDateTimeStringToISO("2025-12-26T14:30");
   // Or format the date first
   const dateStr = formatCrmDate(date);
   const timeStr = formatCrmTime(date);
   const iso = crmDateTimeStringToISO(`${dateStr}T${timeStr}`);
   ```

## Related Documentation

- `timezone-api.ts` - All available timezone utility functions
- `timezone.ts` - Internal implementation (use timezone-api.ts instead)

## Questions?

If you're unsure which function to use, check `timezone-api.ts` for available functions and their JSDoc comments.


