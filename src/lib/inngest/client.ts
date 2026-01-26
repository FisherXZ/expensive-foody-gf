/**
 * Inngest client configuration
 * Central client instance used by all Inngest functions
 */

import { Inngest, EventSchemas } from 'inngest';
import type { AvailabilitySlot } from '@/lib/scrapers/types';
import type { Platform } from '@/lib/types/database';

/**
 * Event types for the Foody application
 * These define the shape of data passed between Inngest functions
 */
export type Events = {
  /**
   * Triggered to scrape a single restaurant's availability
   */
  'restaurant/scrape': {
    data: {
      /** Our internal restaurant ID */
      restaurantId: string;
      /** The reservation platform */
      platform: Platform;
      /** The restaurant's ID on the platform */
      platformId: string;
    };
  };

  /**
   * Triggered when new availability slots are found
   */
  'availability/new-slots': {
    data: {
      /** Our internal restaurant ID */
      restaurantId: string;
      /** The restaurant name (for notifications) */
      restaurantName: string;
      /** Array of new slots found */
      newSlots: AvailabilitySlot[];
    };
  };

  /**
   * Triggered to run the hourly scrape of all restaurants
   * Can be triggered by cron or manually
   */
  'scrape/all': {
    data: Record<string, never>;
  };
};

/**
 * Inngest client instance
 * Use this to send events and define functions
 *
 * @example
 * ```typescript
 * // Send an event
 * await inngest.send({
 *   name: 'restaurant/scrape',
 *   data: { restaurantId: 'uuid', platform: 'resy', platformId: '1505' }
 * });
 *
 * // Define a function
 * inngest.createFunction(
 *   { id: 'my-function' },
 *   { event: 'my/event' },
 *   async ({ event, step }) => { ... }
 * );
 * ```
 */
export const inngest = new Inngest({
  id: 'foody',
  schemas: new EventSchemas().fromRecord<Events>(),
});
