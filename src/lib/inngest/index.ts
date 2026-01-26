/**
 * Main Inngest module exports
 * Re-exports client and functions for easy importing
 */

// Export the Inngest client
export { inngest } from './client';
export type { Events } from './client';

// Export all functions
export { functions } from './functions';
export { scrapeAllRestaurants, scrapeRestaurantFn } from './functions';
