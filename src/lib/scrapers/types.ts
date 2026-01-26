/**
 * Shared types for all scrapers
 * These types define the common interface for scraping restaurant availability
 */

import type { Platform } from '@/lib/types/database';

/**
 * Represents a single availability slot at a restaurant
 */
export interface AvailabilitySlot {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Time in HH:MM format (24-hour) */
  time: string;
  /** Available party sizes for this slot */
  partySize: number[];
  /** Type of seating (e.g., "Dining Room", "Bar", "Patio") */
  type?: string;
  /** Direct URL to book this specific slot */
  bookingUrl?: string;
}

/**
 * Result of scraping a restaurant's availability
 */
export interface ScrapeResult {
  /** The restaurant ID in our database */
  restaurantId: string;
  /** The platform this result came from */
  platform: Platform;
  /** When the scrape was performed */
  scrapedAt: Date;
  /** All available slots found */
  slots: AvailabilitySlot[];
}

/**
 * Options for customizing a scrape operation
 */
export interface ScrapeOptions {
  /** Start date for availability search (default: today) */
  startDate?: Date;
  /** End date for availability search (default: today + 30 days) */
  endDate?: Date;
  /** Party size to search for (default: 2) */
  partySize?: number;
}

/**
 * Interface that all platform scrapers must implement
 */
export interface Scraper {
  /** The platform this scraper handles */
  platform: Platform;

  /**
   * Scrapes availability for a restaurant
   * @param platformId - The restaurant's ID on the platform
   * @param options - Optional scrape configuration
   * @returns Promise resolving to scrape results
   */
  scrape(platformId: string, options?: ScrapeOptions): Promise<ScrapeResult>;
}

/**
 * Error thrown when a scrape operation fails
 */
export class ScrapeError extends Error {
  constructor(
    message: string,
    public readonly platform: Platform,
    public readonly platformId: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ScrapeError';
  }
}
