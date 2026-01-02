# Timezone Utilities

## ⚠️ CRITICAL: Always Use `timezone-api.ts`

**For all timezone-aware date/time operations, import from `timezone-api.ts`, NOT directly from `timezone.ts`.**

```typescript
// ✅ CORRECT
import { formatCrmTime, createCrmDate } from "@/components/atomic-crm/misc/timezone-api";

// ❌ WRONG
import { formatCrmTime } from "@/components/atomic-crm/misc/timezone";
```

## Quick Start

See [TIMEZONE_USAGE_GUIDE.md](./TIMEZONE_USAGE_GUIDE.md) for complete usage examples.

## Files

- **`timezone-api.ts`** - ✅ **USE THIS** - Public API with all safe timezone utilities
- **`timezone.ts`** - ⚠️ Internal implementation - Do not import directly
- **`TIMEZONE_USAGE_GUIDE.md`** - Developer guide with examples

## Why?

The timezone conversion system is complex and easy to break. Using `timezone-api.ts` ensures:
1. ✅ All operations respect CRM timezone configuration
2. ✅ Consistent behavior across the application
3. ✅ Protection against timezone bugs
4. ✅ ESLint warnings if you use unsafe Date methods

## Common Functions

```typescript
import {
  // Formatting
  formatCrmDate,      // "26/12/2025"
  formatCrmTime,      // "14:30"
  extractCrmTime,     // "14:30" (time only)
  
  // Creation
  createCrmDate,      // Create date in CRM timezone
  parseCrmDateString, // Parse date string
  
  // Manipulation
  crmAddDays,         // Add days (timezone-aware)
  crmStartOfDay,      // Start of day in CRM timezone
  
  // Conversion
  crmDateTimeStringToISO, // Convert to ISO for database
} from "@/components/atomic-crm/misc/timezone-api";
```

## Need Help?

1. Check [TIMEZONE_USAGE_GUIDE.md](./TIMEZONE_USAGE_GUIDE.md) for examples
2. See function JSDoc comments in `timezone-api.ts`


