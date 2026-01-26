# Frontend Design Issues

This document identifies UI/UX design issues in the Foody SF frontend, categorized by priority.

---

## High Priority Issues

### 1. Mobile Menu Uses CSS Hover (Touch Devices Don't Work)

**Problem:**
The mobile navigation menu uses CSS `group-hover` to show/hide the dropdown. This pattern does not work on touch devices (phones, tablets) because hover states don't exist on touch interfaces. Users on mobile cannot access the navigation menu at all.

**Current Implementation:**
```tsx
// src/app/(dashboard)/layout.tsx:114-144
<div className="relative group">
  <button className="p-2 rounded-lg text-gray-600 hover:bg-gray-100">
    <Menu className="w-5 h-5" />
  </button>
  <div className="... opacity-0 invisible group-hover:opacity-100 group-hover:visible ...">
```

**Impact:** Critical - Mobile users cannot navigate the app.

**Files to Fix:**
| File | Lines | Change Required |
|------|-------|-----------------|
| `src/app/(dashboard)/layout.tsx` | 112-145 | Convert `MobileMenu` to client component with `useState` for open/close toggle |

**Suggested Fix:**
- Extract `MobileMenu` to a separate client component file
- Use `useState` to track open/close state
- Add click handler to toggle menu visibility
- Add click-outside detection to close menu
- Consider using a slide-out drawer pattern for better mobile UX

---

### 2. No Confirmation Dialog for Destructive Actions (Untrack)

**Problem:**
Clicking "Stop Tracking" or the untrack button immediately removes the restaurant without any confirmation. Users can accidentally lose their tracking settings with a single misclick.

**Current Implementation:**
```tsx
// src/components/restaurant/RestaurantDetailModal.tsx:101-109
const handleUntrack = () => {
  startTransition(async () => {
    const result = await toggleRestaurant(restaurant.id);
    if (result.success && !result.isTracking) {
      onUntrack?.();
      onClose();
    }
  });
};
```

```tsx
// src/app/(dashboard)/restaurants/page.tsx:72-82
const handleTrackClick = (restaurant: Restaurant) => {
  const isTracked = trackedIds.has(restaurant.id);
  if (isTracked) {
    // Direct untrack for already tracked restaurants - NO CONFIRMATION
    handleUntrack(restaurant.id);
  }
```

**Impact:** High - Users may accidentally lose tracking preferences they've configured.

**Files to Fix:**
| File | Lines | Change Required |
|------|-------|-----------------|
| `src/components/restaurant/RestaurantDetailModal.tsx` | 101-109, 221-239 | Add confirmation state and dialog before untrack |
| `src/app/(dashboard)/restaurants/page.tsx` | 72-82 | Add confirmation before direct untrack |
| `src/components/ui/ConfirmDialog.tsx` | (new file) | Create reusable confirmation dialog component |

**Suggested Fix:**
- Create a reusable `ConfirmDialog` component
- Show confirmation with message like "Stop tracking {restaurant}? Your notification preferences will be lost."
- Provide "Cancel" and "Stop Tracking" buttons
- Only proceed with untrack after user confirms

---

### 3. Using `<img>` Instead of Next.js `<Image>` Component

**Problem:**
Multiple components use native HTML `<img>` tags instead of Next.js's optimized `<Image>` component. This means:
- No automatic image optimization (WebP/AVIF conversion)
- No lazy loading by default
- No blur placeholder during load
- Larger bundle sizes and slower page loads
- No protection against Cumulative Layout Shift (CLS)

**Current Implementation:**
```tsx
// Multiple files use this pattern:
<img
  src={restaurant.image_url}
  alt={restaurant.name}
  className="w-full h-full object-cover"
/>
```

**Impact:** High - Performance degradation, especially on slower connections.

**Files to Fix:**
| File | Lines | Change Required |
|------|-------|-----------------|
| `src/components/dashboard/TrackedRestaurantsGrid.tsx` | 104-109 | Replace `<img>` with `<Image>` |
| `src/components/restaurant/RestaurantDetailModal.tsx` | 119-124 | Replace `<img>` with `<Image>` |
| `src/components/tracking/TrackingModal.tsx` | 79-84 | Replace `<img>` with `<Image>` |
| `src/app/(dashboard)/restaurants/page.tsx` | 216-221 | Replace `<img>` with `<Image>` |
| `next.config.ts` or `next.config.js` | - | Add `remotePatterns` for external image domains |

**Suggested Fix:**
```tsx
import Image from 'next/image';

// Replace:
<img src={restaurant.image_url} alt={restaurant.name} className="..." />

// With:
<Image
  src={restaurant.image_url}
  alt={restaurant.name}
  fill
  className="object-cover"
  sizes="(max-width: 768px) 100vw, 33vw"
/>
```

Also update `next.config.js` to allow external images:
```js
module.exports = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.resy.com' },
      { protocol: 'https', hostname: '**.exploretock.com' },
      // Add other restaurant image CDNs
    ],
  },
};
```

---

## Medium Priority Issues

### 4. Duplicated `PLATFORM_COLORS` Constant

**Problem:**
The same `PLATFORM_COLORS` constant is defined identically in two files. This violates DRY principles and creates maintenance burden - if a new platform is added or colors change, both files must be updated.

**Current Implementation:**
```tsx
// src/components/restaurant/RestaurantDetailModal.tsx:24-28
const PLATFORM_COLORS: Record<string, string> = {
  resy: 'bg-red-100 text-red-700',
  tock: 'bg-blue-100 text-blue-700',
  opentable: 'bg-green-100 text-green-700',
};

// src/app/(dashboard)/restaurants/page.tsx:14-18
const PLATFORM_COLORS: Record<string, string> = {
  resy: 'bg-red-100 text-red-700',
  tock: 'bg-blue-100 text-blue-700',
  opentable: 'bg-green-100 text-green-700',
};
```

**Impact:** Medium - Code duplication, maintenance burden.

**Files to Fix:**
| File | Lines | Change Required |
|------|-------|-----------------|
| `src/lib/constants/platforms.ts` | (new file) | Create shared constants file |
| `src/components/restaurant/RestaurantDetailModal.tsx` | 24-28 | Import from shared constants |
| `src/app/(dashboard)/restaurants/page.tsx` | 14-18 | Import from shared constants |

**Suggested Fix:**
Create `src/lib/constants/platforms.ts`:
```tsx
export const PLATFORM_COLORS: Record<string, string> = {
  resy: 'bg-red-100 text-red-700',
  tock: 'bg-blue-100 text-blue-700',
  opentable: 'bg-green-100 text-green-700',
};

export const PLATFORM_URLS: Record<string, (id?: string, name?: string) => string> = {
  resy: (id, name) => id ? `https://resy.com/cities/sf/${id}` : `https://resy.com/cities/sf?query=${name}`,
  // ... etc
};
```

---

### 5. Time Picker UI Inconsistency

**Problem:**
Time inputs are styled differently in different components:
- `TrackingModal` has clock icons inside the inputs
- `RestaurantNotificationSettings` has no icons

This inconsistency creates a disjointed user experience.

**Current Implementation:**
```tsx
// src/components/tracking/TrackingModal.tsx:133-155 - HAS clock icons
<div className="relative">
  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
  <input type="time" className="w-full pl-10 pr-3 py-2.5 ..." />
</div>

// src/components/restaurant/RestaurantNotificationSettings.tsx:148-156 - NO icons
<input
  type="time"
  className="w-full px-3 py-2.5 ..."  // Note: no pl-10, no icon
/>
```

**Impact:** Medium - Inconsistent UX, unprofessional appearance.

**Files to Fix:**
| File | Lines | Change Required |
|------|-------|-----------------|
| `src/components/ui/TimePicker.tsx` | (new file) | Create reusable time picker component |
| `src/components/ui/TimeRangePicker.tsx` | (new file) | Create time range component similar to DateRangePicker |
| `src/components/tracking/TrackingModal.tsx` | 125-156 | Replace inline time inputs with TimeRangePicker |
| `src/components/restaurant/RestaurantNotificationSettings.tsx` | 139-169 | Replace inline time inputs with TimeRangePicker |

**Suggested Fix:**
Create `src/components/ui/TimeRangePicker.tsx` following the same pattern as `DateRangePicker`:
```tsx
interface TimeRangePickerProps {
  startTime: string | null;
  endTime: string | null;
  onStartTimeChange: (time: string | null) => void;
  onEndTimeChange: (time: string | null) => void;
  disabled?: boolean;
}

export default function TimeRangePicker({ ... }) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Preferred Time Window
      </label>
      <p className="text-xs text-gray-500">
        Only notify me about slots within these hours
      </p>
      <div className="grid grid-cols-2 gap-3">
        {/* Start Time with Clock icon */}
        {/* End Time with Clock icon */}
      </div>
    </div>
  );
}
```

---

### 6. No Active Navigation Link Indicator

**Problem:**
The navigation links don't show which page is currently active. All links look identical regardless of the current route, making it harder for users to orient themselves.

**Current Implementation:**
```tsx
// src/app/(dashboard)/layout.tsx:92-110
function NavLink({ href, icon, children }: { ... }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center space-x-2 px-1 pt-1 text-sm font-medium text-gray-600 hover:text-orange-600 border-b-2 border-transparent hover:border-orange-600 transition-colors"
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}
```

**Impact:** Medium - Poor navigation UX, users can't tell where they are.

**Files to Fix:**
| File | Lines | Change Required |
|------|-------|-----------------|
| `src/app/(dashboard)/layout.tsx` | 92-110 | Make NavLink a client component that uses `usePathname()` |
| `src/components/nav/NavLink.tsx` | (new file) | Extract to separate client component |

**Suggested Fix:**
Create `src/components/nav/NavLink.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

export default function NavLink({ href, icon, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`inline-flex items-center space-x-2 px-1 pt-1 text-sm font-medium border-b-2 transition-colors ${
        isActive
          ? 'text-orange-600 border-orange-600'
          : 'text-gray-600 border-transparent hover:text-orange-600 hover:border-orange-600'
      }`}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}
```

---

### 7. Form Labels Below Inputs (Counter-intuitive)

**Problem:**
The "From" and "To" labels appear below their respective inputs instead of above them. This is counter-intuitive and goes against standard form design patterns where labels precede inputs.

**Current Implementation:**
```tsx
// src/components/ui/DateRangePicker.tsx:80-107
<div className="relative">
  <Calendar className="..." />
  <input type="date" ... />
  <span className="block text-xs text-gray-400 mt-1">From</span>  {/* BELOW input */}
</div>
```

```tsx
// src/components/tracking/TrackingModal.tsx:133-154
<div className="relative">
  <Clock className="..." />
  <input type="time" ... />
  <span className="block text-xs text-gray-400 mt-1">From</span>  {/* BELOW input */}
</div>
```

**Impact:** Medium - Confusing form UX, users may not understand which field is which before interacting.

**Files to Fix:**
| File | Lines | Change Required |
|------|-------|-----------------|
| `src/components/ui/DateRangePicker.tsx` | 78-108 | Move labels above inputs |
| `src/components/tracking/TrackingModal.tsx` | 132-155 | Move labels above inputs (will be fixed when TimeRangePicker is created) |
| `src/components/restaurant/RestaurantNotificationSettings.tsx` | 147-168 | Move labels above inputs (will be fixed when TimeRangePicker is created) |

**Suggested Fix:**
```tsx
// DateRangePicker.tsx - restructure each column:
<div>
  <span className="block text-xs text-gray-500 mb-1">From</span>  {/* ABOVE input */}
  <div className="relative">
    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
    <input type="date" ... />
  </div>
</div>
```

---

## Summary

| # | Issue | Priority | Files Affected | New Files Needed |
|---|-------|----------|----------------|------------------|
| 1 | Mobile menu hover-based | High | `layout.tsx` | `MobileMenu.tsx` (client) |
| 2 | No untrack confirmation | High | `RestaurantDetailModal.tsx`, `restaurants/page.tsx` | `ConfirmDialog.tsx` |
| 3 | Missing Next.js Image | High | 4 component files + config | None |
| 4 | Duplicated PLATFORM_COLORS | Medium | 2 files | `platforms.ts` |
| 5 | Time picker inconsistency | Medium | 2 files | `TimeRangePicker.tsx` |
| 6 | No active nav indicator | Medium | `layout.tsx` | `NavLink.tsx` (client) |
| 7 | Labels below inputs | Medium | `DateRangePicker.tsx`, 2 others | None |

---

## Implementation Order Recommendation

1. **Mobile menu** - Critical for mobile users
2. **Untrack confirmation** - Prevents data loss
3. **Next.js Image** - Performance impact
4. **Active nav indicator** - Quick win, improves UX
5. **PLATFORM_COLORS extraction** - Quick refactor
6. **Labels above inputs** - Form UX improvement
7. **TimeRangePicker** - Creates consistency
