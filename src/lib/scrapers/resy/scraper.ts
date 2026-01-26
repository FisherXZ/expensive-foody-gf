/**
 * Resy scraper implementation
 * Fetches availability data from Resy API and transforms it to our common format
 */

import { BaseScraper } from '../base';
import type { ScrapeOptions, AvailabilitySlot } from '../types';
import { fetchResyAvailabilityBatch } from './client';
import { adaptResyResponses, deduplicateSlots } from './adapter';

/**
 * Scraper for the Resy reservation platform
 * Implements the Scraper interface via BaseScraper
 *
 * @example
 * ```typescript
 * const scraper = new ResyScraper();
 * const result = await scraper.scrape('1505', { partySize: 4 });
 * console.log(result.slots);
 * ```
 */
export class ResyScraper extends BaseScraper {
  readonly platform = 'resy' as const;

  /**
   * Fetches availability from Resy for the specified venue
   *
   * @param platformId - The Resy venue ID
   * @param options - Scrape options with start/end dates and party size
   * @returns Array of available slots
   */
  protected async fetchAvailability(
    platformId: string,
    options: Required<ScrapeOptions>
  ): Promise<AvailabilitySlot[]> {
    // Generate the date range to fetch
    const dates = this.getDateRange(options.startDate, options.endDate);

    // Fetch availability for all dates
    const responses = await fetchResyAvailabilityBatch(
      platformId,
      dates,
      options.partySize
    );

    // Convert Resy responses to our common format
    const slots = adaptResyResponses(responses);

    // Remove duplicates that may occur from overlapping date queries
    return deduplicateSlots(slots);
  }
}
