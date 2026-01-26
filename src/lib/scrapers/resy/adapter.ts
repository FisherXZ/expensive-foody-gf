/**
 * Adapter to transform Resy API responses to our common AvailabilitySlot format
 */

import type { ResyFindResponse, ResySlot } from './types';
import type { AvailabilitySlot } from '../types';

/**
 * Parses Resy datetime string to date and time components
 * Resy uses format: "YYYY-MM-DD HH:MM:SS"
 *
 * @param dateTimeStr - Resy datetime string
 * @returns Object with date and time strings
 */
function parseResyDateTime(dateTimeStr: string): { date: string; time: string } {
  const [datePart, timePart] = dateTimeStr.split(' ');
  // Extract just HH:MM from HH:MM:SS
  const time = timePart?.substring(0, 5) ?? '00:00';
  return {
    date: datePart,
    time,
  };
}

/**
 * Generates an array of party sizes from min to max
 *
 * @param min - Minimum party size
 * @param max - Maximum party size
 * @returns Array of available party sizes
 */
function generatePartySizes(min: number, max: number): number[] {
  const sizes: number[] = [];
  for (let i = min; i <= max; i++) {
    sizes.push(i);
  }
  return sizes;
}

/**
 * Converts a single Resy slot to our AvailabilitySlot format
 *
 * @param slot - Resy slot object
 * @param venueId - Resy venue ID (for booking URL)
 * @returns AvailabilitySlot
 */
function adaptResySlot(slot: ResySlot, venueId: number): AvailabilitySlot {
  const { date, time } = parseResyDateTime(slot.date.start);

  return {
    date,
    time,
    partySize: generatePartySizes(slot.size.min, slot.size.max),
    type: slot.config.type,
    bookingUrl: `https://resy.com/cities/sf/venues/${venueId}?date=${date}&seats=${slot.size.min}`,
  };
}

/**
 * Adapts a Resy API response to an array of AvailabilitySlots
 *
 * @param response - Resy API response
 * @returns Array of AvailabilitySlot objects
 *
 * @example
 * ```typescript
 * const response = await fetchResyAvailability(params);
 * const slots = adaptResyResponse(response);
 * ```
 */
export function adaptResyResponse(response: ResyFindResponse): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];

  for (const venueResult of response.results.venues) {
    const venueId = venueResult.venue.id.resy;

    for (const slot of venueResult.slots) {
      slots.push(adaptResySlot(slot, venueId));
    }
  }

  return slots;
}

/**
 * Adapts multiple Resy API responses to a single array of AvailabilitySlots
 * Useful when fetching multiple dates
 *
 * @param responses - Array of Resy API responses
 * @returns Combined array of AvailabilitySlot objects
 */
export function adaptResyResponses(responses: ResyFindResponse[]): AvailabilitySlot[] {
  const allSlots: AvailabilitySlot[] = [];

  for (const response of responses) {
    const slots = adaptResyResponse(response);
    allSlots.push(...slots);
  }

  return allSlots;
}

/**
 * Deduplicates slots by date+time+type combination
 * Useful when slots may appear in multiple API responses
 *
 * @param slots - Array of slots to deduplicate
 * @returns Deduplicated array
 */
export function deduplicateSlots(slots: AvailabilitySlot[]): AvailabilitySlot[] {
  const seen = new Map<string, AvailabilitySlot>();

  for (const slot of slots) {
    const key = `${slot.date}-${slot.time}-${slot.type ?? 'default'}`;

    // If we've seen this slot, merge party sizes
    if (seen.has(key)) {
      const existing = seen.get(key)!;
      const mergedSizes = [...new Set([...existing.partySize, ...slot.partySize])];
      mergedSizes.sort((a, b) => a - b);
      existing.partySize = mergedSizes;
    } else {
      seen.set(key, { ...slot });
    }
  }

  return Array.from(seen.values());
}
