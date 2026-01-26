/**
 * Inngest function: Scrape single restaurant
 * Handles scraping a single restaurant and detecting new availability
 */

import { createClient } from '@supabase/supabase-js';
import { inngest } from '../client';
import type { Database } from '@/lib/types/database';
import { scrapeRestaurant } from '@/lib/scrapers';
import { saveSnapshot } from '@/lib/services/availability';
import { findNewSlots } from '@/lib/services/diff';

/**
 * Creates a Supabase client with service role for server-side operations
 */
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(url, key);
}

/**
 * Scrape Restaurant Function
 *
 * This function scrapes availability for a single restaurant and:
 * 1. Calls the platform-specific scraper
 * 2. Compares with existing data to find new slots
 * 3. Saves the new snapshot to the database
 * 4. Sends "availability/new-slots" event if new slots are found
 *
 * Concurrency is limited to prevent overwhelming platform APIs
 */
export const scrapeRestaurantFn = inngest.createFunction(
  {
    id: 'scrape-restaurant',
    name: 'Scrape Restaurant',
    // Limit concurrent scrapes to respect rate limits
    concurrency: {
      limit: 5,
    },
    // Retry configuration
    retries: 3,
  },
  // Trigger: restaurant/scrape event
  { event: 'restaurant/scrape' },
  async ({ event, step, logger }) => {
    const { restaurantId, platform, platformId } = event.data;

    logger.info(`Scraping restaurant ${restaurantId} (${platform}:${platformId})`);

    // Step 1: Get restaurant name for notifications
    const restaurant = await step.run('get-restaurant-info', async () => {
      const supabase = getServiceClient();

      const { data, error } = await supabase
        .from('restaurants')
        .select('name')
        .eq('id', restaurantId)
        .single();

      if (error) {
        logger.warn(`Failed to get restaurant info: ${error.message}`);
        return { name: 'Unknown Restaurant' };
      }

      return data;
    });

    // Step 2: Scrape availability from the platform
    const scrapeResult = await step.run('scrape-availability', async () => {
      const result = await scrapeRestaurant(
        restaurantId,
        platform,
        platformId
      );

      logger.info(`Scraped ${result.slots.length} slots for ${restaurantId}`);

      return {
        restaurantId: result.restaurantId,
        platform: result.platform,
        scrapedAt: result.scrapedAt.toISOString(),
        slots: result.slots,
        slotCount: result.slots.length,
      };
    });

    // Step 3: Find new slots by comparing with database
    const newSlots = await step.run('find-new-slots', async () => {
      const slots = await findNewSlots(restaurantId, scrapeResult.slots);
      logger.info(`Found ${slots.length} new slots for ${restaurantId}`);
      return slots;
    });

    // Step 4: Save the new snapshot to the database
    await step.run('save-snapshot', async () => {
      await saveSnapshot({
        restaurantId: scrapeResult.restaurantId,
        platform: scrapeResult.platform,
        scrapedAt: new Date(scrapeResult.scrapedAt),
        slots: scrapeResult.slots,
      });

      logger.info(`Saved snapshot for ${restaurantId}`);
    });

    // Step 5: If new slots found, send notification event
    if (newSlots.length > 0) {
      await step.run('send-new-slots-event', async () => {
        await inngest.send({
          name: 'availability/new-slots',
          data: {
            restaurantId,
            restaurantName: restaurant.name,
            newSlots,
          },
        });

        logger.info(`Sent new-slots event for ${restaurantId} with ${newSlots.length} slots`);
      });
    }

    return {
      restaurantId,
      platform,
      totalSlots: scrapeResult.slotCount,
      newSlots: newSlots.length,
      notificationSent: newSlots.length > 0,
    };
  }
);
