/**
 * Abstract base class for all platform scrapers
 * Provides common functionality and enforces the Scraper interface
 */

import type { Platform } from '@/lib/types/database';
import type { Scraper, ScrapeResult, ScrapeOptions, AvailabilitySlot } from './types';
import { ScrapeError } from './types';

/**
 * Default scrape options
 */
const DEFAULT_OPTIONS: Required<ScrapeOptions> = {
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  partySize: 2,
};

/**
 * Abstract base class that all platform scrapers extend
 * Handles common logic like option merging and error handling
 */
export abstract class BaseScraper implements Scraper {
  abstract readonly platform: Platform;

  /**
   * Main scrape method - wraps the platform-specific implementation with error handling
   */
  async scrape(platformId: string, options?: ScrapeOptions): Promise<ScrapeResult> {
    const mergedOptions = this.mergeOptions(options);

    try {
      const slots = await this.fetchAvailability(platformId, mergedOptions);

      return {
        restaurantId: '', // Will be set by the caller
        platform: this.platform,
        scrapedAt: new Date(),
        slots,
      };
    } catch (error) {
      // Wrap errors in ScrapeError for consistent handling
      if (error instanceof ScrapeError) {
        throw error;
      }

      throw new ScrapeError(
        `Failed to scrape ${this.platform} for ${platformId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.platform,
        platformId,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Platform-specific fetch implementation
   * Must be implemented by each scraper subclass
   */
  protected abstract fetchAvailability(
    platformId: string,
    options: Required<ScrapeOptions>
  ): Promise<AvailabilitySlot[]>;

  /**
   * Merges provided options with defaults
   */
  protected mergeOptions(options?: ScrapeOptions): Required<ScrapeOptions> {
    return {
      startDate: options?.startDate ?? DEFAULT_OPTIONS.startDate,
      endDate: options?.endDate ?? DEFAULT_OPTIONS.endDate,
      partySize: options?.partySize ?? DEFAULT_OPTIONS.partySize,
    };
  }

  /**
   * Formats a Date to YYYY-MM-DD string
   */
  protected formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Generates an array of dates between start and end (inclusive)
   */
  protected getDateRange(startDate: Date, endDate: Date): string[] {
    const dates: string[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      dates.push(this.formatDate(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }
}
