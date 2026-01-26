# Supabase Backend Design Issues Report

> Generated: 2026-01-26
> Status: Design Review

This document catalogs identified design issues in the Supabase backend integration, organized by severity. Each issue includes affected files and recommended fixes.

---

## Table of Contents

1. [Critical Issues](#critical-issues)
2. [High Severity Issues](#high-severity-issues)
3. [Medium Severity Issues](#medium-severity-issues)
4. [Low Severity Issues](#low-severity-issues)
5. [Summary](#summary)

---

## Critical Issues

### CRIT-001: Missing Unique Constraint on `restaurants.name`

**Description:**
The `restaurants` table has only an index on `name`, not a UNIQUE constraint. The seed script (`seed-restaurants.ts`) attempts to upsert with `onConflict: 'name'`, which fails without a unique constraint.

**Impact:**
- Duplicate restaurants can be created
- Upsert operations fail silently or require fallback logic
- Data integrity issues in restaurant tracking

**Affected Files:**

| File | Lines | Purpose |
|------|-------|---------|
| `supabase/migrations/001_initial_schema.sql` | 7-19 | Table definition and indexes |
| `scripts/seed-restaurants.ts` | 46-54 | Upsert assumes unique constraint |

**Current Code (001_initial_schema.sql:7-19):**
```sql
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    platform TEXT CHECK (platform IN ('resy', 'tock', 'opentable')),
    platform_id TEXT,
    location TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_restaurants_platform ON restaurants(platform);
CREATE INDEX idx_restaurants_name ON restaurants(name);  -- INDEX, not UNIQUE
```

**Fix Required:**
Create new migration `003_add_unique_constraints.sql`:
```sql
-- Add unique constraint on restaurant name
ALTER TABLE restaurants ADD CONSTRAINT restaurants_name_unique UNIQUE (name);
-- OR for composite uniqueness:
-- ALTER TABLE restaurants ADD CONSTRAINT restaurants_platform_unique UNIQUE (platform, platform_id);
```

---

### CRIT-002: Missing Unique Constraint on `availability_snapshots`

**Description:**
The `availability_snapshots` table has a composite index on `(restaurant_id, date)` but NOT a unique constraint. The `saveSnapshot()` function uses `onConflict: 'restaurant_id,date'` which requires uniqueness.

**Impact:**
- Multiple snapshots per restaurant/date can accumulate
- Upsert silently fails to update, creating duplicates instead
- Database bloat and inconsistent availability data

**Affected Files:**

| File | Lines | Purpose |
|------|-------|---------|
| `supabase/migrations/001_initial_schema.sql` | 56-68 | Table definition and indexes |
| `src/lib/services/availability.ts` | 98-103 | Upsert with onConflict |

**Current Code (001_initial_schema.sql:68):**
```sql
CREATE INDEX idx_availability_snapshots_restaurant_date ON availability_snapshots(restaurant_id, date);
```

**Current Code (availability.ts:98-103):**
```typescript
const { error } = await supabase
  .from('availability_snapshots')
  .upsert(snapshots as never, {
    onConflict: 'restaurant_id,date',  // Requires UNIQUE constraint!
    ignoreDuplicates: false,
  });
```

**Fix Required:**
Create new migration:
```sql
-- Drop the regular index
DROP INDEX IF EXISTS idx_availability_snapshots_restaurant_date;

-- Add unique constraint (which also creates an index)
ALTER TABLE availability_snapshots
ADD CONSTRAINT availability_snapshots_restaurant_date_unique
UNIQUE (restaurant_id, date);
```

---

### CRIT-003: Notification System is Non-Functional (Missing Event Handler)

**Description:**
The scraper emits an `availability/new-slots` event when new slots are found, but NO handler exists to process this event. The notification pipeline is completely broken.

**Impact:**
- Users NEVER receive notifications about new availability
- Core product functionality is missing
- `notifications_sent` table never gets populated

**Affected Files:**

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/inngest/functions/scrape-restaurant.ts` | 113-126 | Sends event with no handler |
| `src/lib/inngest/functions/index.ts` | 13-16 | Only exports scraper functions |
| `src/lib/inngest/client.ts` | 29-41 | Event type defined but unused |

**Current Code (scrape-restaurant.ts:113-126):**
```typescript
if (newSlots.length > 0) {
  await step.run('send-new-slots-event', async () => {
    await inngest.send({
      name: 'availability/new-slots',  // Event sent...
      data: {
        restaurantId,
        restaurantName: restaurant.name,
        newSlots,
      },
    });
    logger.info(`Sent new-slots event for ${restaurantId} with ${newSlots.length} slots`);
  });
}
```

**Current Code (functions/index.ts:13-16):**
```typescript
export const functions = [
  scrapeAllRestaurants,
  scrapeRestaurantFn,
  // NO HANDLER FOR availability/new-slots!
];
```

**Fix Required:**
Create new file `src/lib/inngest/functions/send-notifications.ts`:
```typescript
// Handler for availability/new-slots event
export const sendNotificationsFn = inngest.createFunction(
  { id: 'send-notifications', name: 'Send Notifications' },
  { event: 'availability/new-slots' },
  async ({ event, step }) => {
    // 1. Query user_restaurants for users tracking this restaurant
    // 2. Filter newSlots by each user's preferences (date/time/party size)
    // 3. Check notifications_sent for deduplication
    // 4. Send SMS via Twilio and/or email via Resend
    // 5. Insert records into notifications_sent
  }
);
```

Update `functions/index.ts`:
```typescript
import { sendNotificationsFn } from './send-notifications';

export const functions = [
  scrapeAllRestaurants,
  scrapeRestaurantFn,
  sendNotificationsFn,  // ADD THIS
];
```

---

### CRIT-004: Time String Comparison Bug

**Description:**
The `filterSlotsByPreferences()` function compares time strings lexicographically, which fails for 12-hour format times with AM/PM.

**Impact:**
- "9:30 PM" < "10:00 PM" evaluates incorrectly ("9" > "1" alphabetically)
- Users receive notifications for wrong time slots
- Time-based filtering is fundamentally broken

**Affected Files:**

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/services/diff.ts` | 143-149 | Time comparison logic |
| `src/lib/types/database.ts` | 14-17, 50-51 | Time format documentation |

**Current Code (diff.ts:143-149):**
```typescript
// Check time range if specified
if (preferences.timeStart && slot.time < preferences.timeStart) {
  return false;  // String comparison fails for "9:30 PM" vs "10:00 PM"
}
if (preferences.timeEnd && slot.time > preferences.timeEnd) {
  return false;
}
```

**Database Format (from schema comments):**
```sql
-- time_slots JSONB format: [{time: "7:00 PM", party_sizes: [2,4]}]
```

**Fix Required:**
Update `src/lib/services/diff.ts` with proper time parsing:
```typescript
/**
 * Converts 12-hour time string to 24-hour for comparison
 * "7:00 PM" -> "19:00", "9:30 AM" -> "09:30"
 */
function to24Hour(time12h: string): string {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  let h = parseInt(hours, 10);

  if (modifier === 'PM' && h !== 12) h += 12;
  if (modifier === 'AM' && h === 12) h = 0;

  return `${h.toString().padStart(2, '0')}:${minutes}`;
}

// Then in filterSlotsByPreferences:
if (preferences.timeStart && to24Hour(slot.time) < preferences.timeStart) {
  return false;
}
```

---

### CRIT-005: Notification Deduplication Not Enforced at Application Level

**Description:**
While a unique index exists on `notifications_sent` for deduplication, the application code never checks it because the handler doesn't exist (CRIT-003). Even when fixed, inserts must handle conflicts.

**Affected Files:**

| File | Lines | Purpose |
|------|-------|---------|
| `supabase/migrations/002_schema_enhancements.sql` | 28-32 | Unique index definition |
| (missing) `src/lib/inngest/functions/send-notifications.ts` | - | Must handle upsert |

**Current Schema (002_schema_enhancements.sql:28-32):**
```sql
CREATE UNIQUE INDEX idx_notifications_dedup
ON notifications_sent(user_id, restaurant_id, availability_date, availability_time)
WHERE availability_date IS NOT NULL AND availability_time IS NOT NULL;
```

**Fix Required:**
When creating the notification handler, use upsert or check before insert:
```typescript
// In send-notifications.ts
const { error } = await supabase
  .from('notifications_sent')
  .upsert({
    user_id,
    restaurant_id,
    type: 'new_slot',
    channel,
    availability_date: slot.date,
    availability_time: slot.time,
  }, {
    onConflict: 'user_id,restaurant_id,availability_date,availability_time',
    ignoreDuplicates: true,  // Skip if already notified
  });
```

---

## High Severity Issues

### HIGH-001: Multiple Service Client Instantiations

**Description:**
Every file that needs the service role client creates its own instance independently. This is inefficient and makes auditing service key usage difficult.

**Impact:**
- Repeated initialization overhead
- Difficult to audit where service key is used
- Inconsistent error handling across files

**Affected Files:**

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/services/availability.ts` | 14-23 | `getServiceClient()` |
| `src/lib/inngest/functions/scrape-all.ts` | 24-33 | `getServiceClient()` |
| `src/lib/inngest/functions/scrape-restaurant.ts` | 16-25 | `getServiceClient()` |

**Current Code (repeated in 3 files):**
```typescript
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(url, key);
}
```

**Fix Required:**
Create `src/lib/supabase/service.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';

let serviceClient: ReturnType<typeof createClient<Database>> | null = null;

export function getServiceClient() {
  if (serviceClient) return serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase service environment variables');
  }

  serviceClient = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return serviceClient;
}
```

Then update all affected files to import from this central location.

---

### HIGH-002: No Data Retention / Cleanup Policy

**Description:**
Old availability snapshots are never deleted. The database will grow indefinitely as the scraper runs hourly.

**Impact:**
- Unbounded database growth
- Queries slow down over time
- Increased storage costs

**Affected Files:**

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/services/availability.ts` | 179-204 | Queries without cleanup |
| (missing) cleanup job | - | No retention policy exists |

**Fix Required:**

1. Create new Inngest function `src/lib/inngest/functions/cleanup-snapshots.ts`:
```typescript
export const cleanupSnapshotsFn = inngest.createFunction(
  { id: 'cleanup-snapshots', name: 'Cleanup Old Snapshots' },
  { cron: '0 3 * * *' },  // Daily at 3 AM
  async ({ step }) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14);  // Keep 2 weeks

    await step.run('delete-old-snapshots', async () => {
      const { count, error } = await supabase
        .from('availability_snapshots')
        .delete()
        .lt('date', cutoffDate.toISOString().split('T')[0]);

      return { deleted: count };
    });
  }
);
```

2. Add to `functions/index.ts` exports.

---

### HIGH-003: Scraper Retry Without Backoff

**Description:**
The scraper retries 3 times on failure but without exponential backoff, potentially hammering rate-limited APIs.

**Impact:**
- Could trigger API bans from Resy/Tock/OpenTable
- Wasted resources on immediate retries
- No jitter means all retries happen simultaneously

**Affected Files:**

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/inngest/functions/scrape-restaurant.ts` | 43-47 | Retry configuration |

**Current Code (scrape-restaurant.ts:43-47):**
```typescript
{
  id: 'scrape-restaurant',
  name: 'Scrape Restaurant',
  concurrency: { limit: 5 },
  retries: 3,  // No backoff configuration
}
```

**Fix Required:**
```typescript
{
  id: 'scrape-restaurant',
  name: 'Scrape Restaurant',
  concurrency: { limit: 5 },
  retries: 3,
  backoff: {
    type: 'exponential',
    initialDelay: '2s',
    maxDelay: '30s',
    multiplier: 2,
  },
}
```

---

### HIGH-004: Type Assertions Bypassing Safety

**Description:**
Multiple `as never` and other type assertions are used throughout the codebase to silence TypeScript errors, masking potential runtime issues.

**Impact:**
- Real type mismatches go undetected
- Runtime errors possible
- Difficult to maintain

**Affected Files:**

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/actions/restaurants.ts` | 88, 119, 149, 175, 214, 258, 270, 290 | Type assertions |
| `src/lib/services/availability.ts` | 100 | `snapshots as never` |
| `src/lib/inngest/functions/scrape-all.ts` | 55-60 | Type assertion for query |

**Example (restaurants.ts:175):**
```typescript
const { error } = await supabase
  .from('user_restaurants')
  .insert(insertData as never);  // BAD: Hides type errors
```

**Fix Required:**

1. Generate proper Supabase types:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT > src/lib/types/supabase.ts
```

2. Update `src/lib/types/database.ts` to use generated types or fix manual types.

3. Remove all `as never` assertions and fix underlying type issues.

---

### HIGH-005: Public Access to Availability Data Without Rate Limiting

**Description:**
`availability_snapshots` is readable by anyone (`USING (true)`) with no rate limiting on the server actions that query it.

**Impact:**
- Competitors could scrape all availability data
- DDoS vulnerability
- No protection for expensive queries

**Affected Files:**

| File | Lines | Purpose |
|------|-------|---------|
| `supabase/migrations/001_initial_schema.sql` | 166-168 | Public SELECT policy |
| `src/lib/actions/restaurants.ts` | 306-362 | Public query functions |

**Current Policy (001_initial_schema.sql:166-168):**
```sql
CREATE POLICY "Availability snapshots are viewable by everyone"
    ON availability_snapshots FOR SELECT
    USING (true);
```

**Fix Required:**

Option A: Require authentication for availability:
```sql
DROP POLICY "Availability snapshots are viewable by everyone" ON availability_snapshots;
CREATE POLICY "Availability viewable by authenticated users"
    ON availability_snapshots FOR SELECT
    TO authenticated
    USING (true);
```

Option B: Add rate limiting middleware in `middleware.ts`:
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
});
```

---

## Medium Severity Issues

### MED-001: Upsert Without Transaction

**Description:**
Multiple date snapshots are upserted in separate queries, not wrapped in a transaction.

**Impact:**
- Partial data if job crashes mid-insert
- Inconsistent state between dates
- Race conditions possible

**Affected Files:**

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/services/availability.ts` | 75-111 | `saveSnapshot()` function |

**Current Code (availability.ts:96-103):**
```typescript
// Upsert snapshots - each date is a separate operation
const { error } = await supabase
  .from('availability_snapshots')
  .upsert(snapshots as never, {
    onConflict: 'restaurant_id,date',
    ignoreDuplicates: false,
  });
```

**Fix Required:**
Use Supabase RPC for transaction support:
```sql
-- Create function in migration
CREATE OR REPLACE FUNCTION save_availability_snapshots(snapshots JSONB)
RETURNS void AS $$
BEGIN
  -- Insert/update all in single transaction
  INSERT INTO availability_snapshots (restaurant_id, date, time_slots, scraped_at)
  SELECT
    (elem->>'restaurant_id')::uuid,
    (elem->>'date')::date,
    (elem->'time_slots')::jsonb,
    (elem->>'scraped_at')::timestamptz
  FROM jsonb_array_elements(snapshots) AS elem
  ON CONFLICT (restaurant_id, date)
  DO UPDATE SET
    time_slots = EXCLUDED.time_slots,
    scraped_at = EXCLUDED.scraped_at;
END;
$$ LANGUAGE plpgsql;
```

---

### MED-002: Hard-Coded Configuration Values

**Description:**
Date ranges and other configuration values are hard-coded throughout the codebase.

**Impact:**
- Cannot adjust without code changes
- Inconsistent values across files
- No runtime configuration

**Affected Files:**

| File | Lines | Value |
|------|-------|-------|
| `src/lib/actions/restaurants.ts` | 316 | 14 days lookback |
| `src/lib/services/availability.ts` | 186 | 30 days forward |

**Current Code:**
```typescript
// restaurants.ts:316
.limit(14); // Get next 2 weeks

// availability.ts:186
const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
```

**Fix Required:**
Create `src/lib/config.ts`:
```typescript
export const config = {
  availability: {
    lookbackDays: parseInt(process.env.AVAILABILITY_LOOKBACK_DAYS || '14'),
    lookforwardDays: parseInt(process.env.AVAILABILITY_LOOKFORWARD_DAYS || '30'),
  },
  scraper: {
    concurrency: parseInt(process.env.SCRAPER_CONCURRENCY || '5'),
    retries: parseInt(process.env.SCRAPER_RETRIES || '3'),
  },
  retention: {
    snapshotDays: parseInt(process.env.SNAPSHOT_RETENTION_DAYS || '14'),
    notificationDays: parseInt(process.env.NOTIFICATION_RETENTION_DAYS || '30'),
  },
};
```

---

### MED-003: No REST API Routes for Public Data

**Description:**
Only server actions exist for data fetching. No REST API endpoints for caching or external consumption.

**Impact:**
- Cannot use CDN caching
- Tightly coupled to Next.js frontend
- Difficult to add mobile apps later

**Affected Files:**

| File | Purpose |
|------|---------|
| `src/lib/actions/restaurants.ts` | Server actions only |
| (missing) `app/api/restaurants/route.ts` | No API route |
| (missing) `app/api/availability/route.ts` | No API route |

**Fix Required:**
Create `app/api/restaurants/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
```

---

### MED-004: Batch Query Inefficiency

**Description:**
`getMultipleRestaurantsAvailability()` fetches all snapshots then groups in JavaScript memory instead of using SQL aggregation.

**Impact:**
- Increased memory usage
- Slower for large datasets
- Unnecessary data transfer

**Affected Files:**

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/actions/restaurants.ts` | 328-362 | Group by in JavaScript |

**Current Code (restaurants.ts:351-359):**
```typescript
// Group by restaurant - IN JAVASCRIPT
const grouped: Record<string, AvailabilitySnapshot[]> = {};
const typedData = data as AvailabilitySnapshot[];
typedData.forEach((snapshot) => {
  if (!grouped[snapshot.restaurant_id]) {
    grouped[snapshot.restaurant_id] = [];
  }
  grouped[snapshot.restaurant_id].push(snapshot);
});
```

**Fix Required:**
Create database function for grouping:
```sql
CREATE OR REPLACE FUNCTION get_grouped_availability(restaurant_ids UUID[], start_date DATE)
RETURNS TABLE (
  restaurant_id UUID,
  snapshots JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.restaurant_id,
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'date', a.date,
        'time_slots', a.time_slots,
        'scraped_at', a.scraped_at
      ) ORDER BY a.date
    ) as snapshots
  FROM availability_snapshots a
  WHERE a.restaurant_id = ANY(restaurant_ids)
    AND a.date >= start_date
  GROUP BY a.restaurant_id;
END;
$$ LANGUAGE plpgsql;
```

---

### MED-005: Missing Audit Trail

**Description:**
No `created_by`/`updated_by` tracking on user-related tables. Cannot detect unauthorized changes.

**Impact:**
- Cannot audit who changed what
- No forensics for security incidents
- Compliance concerns

**Affected Files:**

| File | Lines | Purpose |
|------|-------|---------|
| `supabase/migrations/001_initial_schema.sql` | 39-47, 24-31 | Tables without audit |

**Fix Required:**
Create migration to add audit columns and trigger:
```sql
-- Add audit columns
ALTER TABLE user_restaurants ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_profiles ADD COLUMN last_modified_by UUID REFERENCES auth.users;

-- Create audit trigger
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_restaurants_audit
  BEFORE UPDATE ON user_restaurants
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

---

## Low Severity Issues

### LOW-001: Inconsistent Time Format Documentation

**Description:**
Comments suggest 24-hour format (`HH:MM`) but actual data uses 12-hour (`7:00 PM`).

**Affected Files:**

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/types/database.ts` | 50-51 | Comments say HH:MM |
| `supabase/migrations/001_initial_schema.sql` | 60 | Shows 12-hour format |

---

### LOW-002: Missing Index on `notifications_sent.type`

**Description:**
If querying notifications by type becomes common, an index would help.

**Affected Files:**

| File | Lines | Purpose |
|------|-------|---------|
| `supabase/migrations/001_initial_schema.sql` | 73-86 | No type index |

---

### LOW-003: Restaurant Insert Policy Too Permissive

**Description:**
Any authenticated user can insert restaurants, not just admins.

**Affected Files:**

| File | Lines | Purpose |
|------|-------|---------|
| `supabase/migrations/001_initial_schema.sql` | 107-110 | Open insert policy |

**Current Policy:**
```sql
CREATE POLICY "Restaurants are insertable by authenticated users"
    ON restaurants FOR INSERT
    TO authenticated
    WITH CHECK (true);
```

---

## Summary

### Issues by Severity

| Severity | Count | Key Concerns |
|----------|-------|--------------|
| **Critical** | 5 | Unique constraints, broken notifications, time comparison |
| **High** | 5 | Service client pattern, no cleanup, retries, type safety |
| **Medium** | 5 | Transactions, config, API routes, query optimization |
| **Low** | 3 | Documentation, indexes, policy strictness |

### Files Requiring Changes

| File | Issues |
|------|--------|
| `supabase/migrations/001_initial_schema.sql` | CRIT-001, CRIT-002, HIGH-005, LOW-003 |
| `src/lib/services/diff.ts` | CRIT-004 |
| `src/lib/services/availability.ts` | CRIT-002, HIGH-001, MED-001 |
| `src/lib/inngest/functions/scrape-restaurant.ts` | CRIT-003, HIGH-001, HIGH-003 |
| `src/lib/inngest/functions/scrape-all.ts` | HIGH-001 |
| `src/lib/inngest/functions/index.ts` | CRIT-003 |
| `src/lib/actions/restaurants.ts` | HIGH-004, MED-002, MED-004 |
| `src/lib/types/database.ts` | HIGH-004, LOW-001 |

### New Files Required

| File | Purpose |
|------|---------|
| `supabase/migrations/003_add_constraints.sql` | Fix CRIT-001, CRIT-002 |
| `src/lib/supabase/service.ts` | Fix HIGH-001 |
| `src/lib/inngest/functions/send-notifications.ts` | Fix CRIT-003, CRIT-005 |
| `src/lib/inngest/functions/cleanup-snapshots.ts` | Fix HIGH-002 |
| `src/lib/config.ts` | Fix MED-002 |
| `app/api/restaurants/route.ts` | Fix MED-003 |
| `app/api/availability/route.ts` | Fix MED-003 |

### Priority Order for Fixes

1. **CRIT-003**: Create notification handler (core functionality broken)
2. **CRIT-001 + CRIT-002**: Add unique constraints (data integrity)
3. **CRIT-004**: Fix time comparison (incorrect filtering)
4. **HIGH-001**: Consolidate service client (code quality)
5. **HIGH-002**: Add cleanup job (prevent database growth)
6. **HIGH-003**: Add retry backoff (API protection)
7. **HIGH-004**: Fix type assertions (maintainability)
8. **MED-***: Address as capacity allows
