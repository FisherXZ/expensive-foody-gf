/**
 * Public API for the scraper module
 * Provides factory function and main scraping interface
 */

import type { Platform } from '@/lib/types/database';
import type { Scraper, ScrapeResult, ScrapeOptions } from './types';
import { ScrapeError } from './types';
import { ResyScraper } from './resy/scraper';

// Export types for external use
export type { Scraper, ScrapeResult, ScrapeOptions, AvailabilitySlot } from './types';
export { ScrapeError } from './types';

// Singleton instances of scrapers
const scraperInstances: Partial<Record<Platform, Scraper>> = {};

/**
 * Factory function to get a scraper for a specific platform
 * Returns a singleton instance for each platform
 *
 * @param platform - The reservation platform
 * @returns The scraper instance
 * @throws Error if platform is not supported
 *
 * @example
 * ```typescript
 * const resyScraper = getScraper('resy');
 * const result = await resyScraper.scrape('1505');
 * ```
 */
export function getScraper(platform: Platform): Scraper {
  // Return cached instance if available
  if (scraperInstances[platform]) {
    return scraperInstances[platform]!;
  }

  // Create new instance based on platform
  let scraper: Scraper;

  switch (platform) {
    case 'resy':
      scraper = new ResyScraper();
      break;

    case 'tock':
      // TODO: Implement TockScraper
      throw new Error(`Scraper for platform '${platform}' is not yet implemented`);

    case 'opentable':
      // TODO: Implement OpenTableScraper
      throw new Error(`Scraper for platform '${platform}' is not yet implemented`);

    default:
      throw new Error(`Unknown platform: ${platform}`);
  }

  // Cache and return
  scraperInstances[platform] = scraper;
  return scraper;
}

/**
 * Main function to scrape a restaurant's availability
 * This is the primary interface used by orchestration (Inngest)
 *
 * @param restaurantId - Our internal restaurant ID
 * @param platform - The reservation platform (resy, tock, opentable)
 * @param platformId - The restaurant's ID on the platform
 * @param options - Optional scrape configuration
 * @returns Promise resolving to scrape results with our restaurant ID set
 *
 * @example
 * ```typescript
 * const result = await scrapeRestaurant(
 *   'uuid-of-restaurant',
 *   'resy',
 *   '1505',
 *   { partySize: 4 }
 * );
 * console.log(`Found ${result.slots.length} slots`);
 * ```
 */
export async function scrapeRestaurant(
  restaurantId: string,
  platform: Platform,
  platformId: string,
  options?: ScrapeOptions
): Promise<ScrapeResult> {
  const scraper = getScraper(platform);

  try {
    const result = await scraper.scrape(platformId, options);

    // Set our restaurant ID on the result
    return {
      ...result,
      restaurantId,
    };
  } catch (error) {
    // Ensure errors are properly typed
    if (error instanceof ScrapeError) {
      throw error;
    }

    throw new ScrapeError(
      `Failed to scrape restaurant ${restaurantId} (${platform}:${platformId}): ${error instanceof Error ? error.message : 'Unknown error'}`,
      platform,
      platformId,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Checks if a platform has an implemented scraper
 *
 * @param platform - The platform to check
 * @returns True if the platform is supported
 */
export function isPlatformSupported(platform: Platform): boolean {
  switch (platform) {
    case 'resy':
      return true;
    case 'tock':
    case 'opentable':
      return false;
    default:
      return false;
  }
}
