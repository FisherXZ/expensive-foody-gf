/**
 * Inngest function: Scrape all restaurants
 * Runs on a schedule (hourly) to fan out scrape jobs for each restaurant
 */

import { createClient } from '@supabase/supabase-js';
import { inngest } from '../client';
import type { Database, Platform } from '@/lib/types/database';
import { isPlatformSupported } from '@/lib/scrapers';

/**
 * Restaurant data needed for scraping
 */
interface RestaurantToScrape {
  id: string;
  name: string;
  platform: Platform;
  platformId: string;
}

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
 * Fetches restaurants that can be scraped from the database
 */
async function fetchScrapableRestaurants(): Promise<RestaurantToScrape[]> {
  const supabase = getServiceClient();

  // Fetch all restaurants
  const { data, error } = await supabase
    .from('restaurants')
    .select('*');

  if (error) {
    throw new Error(`Failed to fetch restaurants: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  // Type assertion needed due to Supabase typing
  const restaurants = data as Array<{
    id: string;
    name: string;
    platform: Platform | null;
    platform_id: string | null;
  }>;

  // Filter and transform the data
  const result: RestaurantToScrape[] = [];

  for (const r of restaurants) {
    // Only include if platform is valid and supported
    if (r.platform && r.platform_id && isPlatformSupported(r.platform)) {
      result.push({
        id: r.id,
        name: r.name,
        platform: r.platform,
        platformId: r.platform_id,
      });
    }
  }

  return result;
}

/**
 * Scrape All Restaurants Function
 *
 * This function runs on a cron schedule (every hour) and:
 * 1. Fetches all restaurants with supported platforms from the database
 * 2. Sends a "restaurant/scrape" event for each restaurant
 * 3. Each event triggers a separate scrape job with concurrency control
 *
 * This fan-out pattern allows:
 * - Parallel processing with controlled concurrency
 * - Individual retries for failed restaurant scrapes
 * - Better observability in the Inngest dashboard
 */
export const scrapeAllRestaurants = inngest.createFunction(
  {
    id: 'scrape-all-restaurants',
    name: 'Scrape All Restaurants',
  },
  // Trigger: Cron schedule (every hour at minute 0)
  { cron: '0 * * * *' },
  async ({ step, logger }) => {
    logger.info('Starting hourly scrape of all restaurants');

    // Step 1: Fetch all restaurants with platform info
    const restaurantsToScrape = await step.run('fetch-restaurants', async () => {
      return fetchScrapableRestaurants();
    });

    logger.info(`Found ${restaurantsToScrape.length} restaurants to scrape`);

    if (restaurantsToScrape.length === 0) {
      logger.info('No restaurants to scrape');
      return { scraped: 0 };
    }

    // Step 2: Send scrape events for each restaurant (fan-out)
    await step.run('fan-out-scrape-events', async () => {
      const events = restaurantsToScrape.map(restaurant => ({
        name: 'restaurant/scrape' as const,
        data: {
          restaurantId: restaurant.id,
          platform: restaurant.platform,
          platformId: restaurant.platformId,
        },
      }));

      // Send all events at once - Inngest will handle them with concurrency control
      await inngest.send(events);

      return { eventsSent: events.length };
    });

    logger.info(`Sent scrape events for ${restaurantsToScrape.length} restaurants`);

    return {
      scraped: restaurantsToScrape.length,
      restaurants: restaurantsToScrape.map(r => ({
        id: r.id,
        name: r.name,
        platform: r.platform,
      })),
    };
  }
);
