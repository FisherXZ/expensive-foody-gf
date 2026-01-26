/**
 * Diff service
 * Compares availability snapshots to find new and removed slots
 */

import type { AvailabilitySlot } from '@/lib/scrapers/types';
import { getAllCurrentSnapshots, snapshotsToSlots } from './availability';

/**
 * Result of comparing two sets of availability slots
 */
export interface DiffResult {
  /** Slots that are in current but not in previous */
  newSlots: AvailabilitySlot[];
  /** Slots that are in previous but not in current */
  removedSlots: AvailabilitySlot[];
  /** Total slots in the current set */
  currentTotal: number;
  /** Total slots in the previous set */
  previousTotal: number;
}

/**
 * Creates a unique key for a slot for comparison purposes
 * Uses date + time + partySize to identify unique slots
 */
function getSlotKey(slot: AvailabilitySlot): string {
  // Sort party sizes for consistent comparison
  const sortedSizes = [...slot.partySize].sort((a, b) => a - b).join(',');
  return `${slot.date}|${slot.time}|${sortedSizes}|${slot.type || ''}`;
}

/**
 * Compares two sets of availability slots to find differences
 *
 * @param previous - Previous set of slots
 * @param current - Current set of slots
 * @returns DiffResult with new and removed slots
 *
 * @example
 * ```typescript
 * const diff = compareSnapshots(oldSlots, newSlots);
 * console.log(`Found ${diff.newSlots.length} new slots`);
 * console.log(`${diff.removedSlots.length} slots are no longer available`);
 * ```
 */
export function compareSnapshots(
  previous: AvailabilitySlot[],
  current: AvailabilitySlot[]
): DiffResult {
  const previousKeys = new Set(previous.map(getSlotKey));
  const currentKeys = new Set(current.map(getSlotKey));

  const newSlots: AvailabilitySlot[] = [];
  const removedSlots: AvailabilitySlot[] = [];

  // Find new slots (in current but not in previous)
  for (const slot of current) {
    const key = getSlotKey(slot);
    if (!previousKeys.has(key)) {
      newSlots.push(slot);
    }
  }

  // Find removed slots (in previous but not in current)
  for (const slot of previous) {
    const key = getSlotKey(slot);
    if (!currentKeys.has(key)) {
      removedSlots.push(slot);
    }
  }

  return {
    newSlots,
    removedSlots,
    currentTotal: current.length,
    previousTotal: previous.length,
  };
}

/**
 * Finds truly new slots by comparing scraped results with what's in the database
 * This is the main function used during scraping to detect new availability
 *
 * @param restaurantId - The restaurant ID
 * @param newSlots - Newly scraped slots
 * @returns Array of slots that are not already in the database
 *
 * @example
 * ```typescript
 * const result = await scrapeRestaurant('uuid', 'resy', '1505');
 * const trulyNewSlots = await findNewSlots(result.restaurantId, result.slots);
 * if (trulyNewSlots.length > 0) {
 *   // Notify users about new availability
 * }
 * ```
 */
export async function findNewSlots(
  restaurantId: string,
  newSlots: AvailabilitySlot[]
): Promise<AvailabilitySlot[]> {
  // Get current snapshots from the database
  const existingSnapshots = await getAllCurrentSnapshots(restaurantId);
  const existingSlots = snapshotsToSlots(existingSnapshots);

  // Compare to find truly new slots
  const diff = compareSnapshots(existingSlots, newSlots);

  return diff.newSlots;
}

/**
 * Filters slots to only include those matching user preferences
 *
 * @param slots - Slots to filter
 * @param preferences - User's notification preferences
 * @returns Filtered slots matching preferences
 */
export function filterSlotsByPreferences(
  slots: AvailabilitySlot[],
  preferences: {
    partySize?: number;
    dateStart?: string;
    dateEnd?: string;
    timeStart?: string;
    timeEnd?: string;
  }
): AvailabilitySlot[] {
  return slots.filter(slot => {
    // Check party size if specified
    if (preferences.partySize && !slot.partySize.includes(preferences.partySize)) {
      return false;
    }

    // Check date range if specified
    if (preferences.dateStart && slot.date < preferences.dateStart) {
      return false;
    }
    if (preferences.dateEnd && slot.date > preferences.dateEnd) {
      return false;
    }

    // Check time range if specified
    if (preferences.timeStart && slot.time < preferences.timeStart) {
      return false;
    }
    if (preferences.timeEnd && slot.time > preferences.timeEnd) {
      return false;
    }

    return true;
  });
}

/**
 * Groups slots by date for easier display
 *
 * @param slots - Slots to group
 * @returns Map of date to slots
 */
export function groupSlotsByDate(
  slots: AvailabilitySlot[]
): Map<string, AvailabilitySlot[]> {
  const grouped = new Map<string, AvailabilitySlot[]>();

  for (const slot of slots) {
    const existing = grouped.get(slot.date) || [];
    existing.push(slot);
    grouped.set(slot.date, existing);
  }

  // Sort slots within each date by time
  for (const [date, dateSlots] of grouped) {
    dateSlots.sort((a, b) => a.time.localeCompare(b.time));
    grouped.set(date, dateSlots);
  }

  return grouped;
}

/**
 * Summarizes a set of slots for notification messages
 *
 * @param slots - Slots to summarize
 * @returns Human-readable summary string
 */
export function summarizeSlots(slots: AvailabilitySlot[]): string {
  if (slots.length === 0) {
    return 'No new slots available';
  }

  const grouped = groupSlotsByDate(slots);
  const dates = Array.from(grouped.keys()).sort();

  if (dates.length === 1) {
    const dateSlots = grouped.get(dates[0])!;
    return `${dateSlots.length} slot${dateSlots.length > 1 ? 's' : ''} on ${dates[0]}`;
  }

  const totalSlots = slots.length;
  return `${totalSlots} slot${totalSlots > 1 ? 's' : ''} across ${dates.length} dates (${dates[0]} to ${dates[dates.length - 1]})`;
}
