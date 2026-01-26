/**
 * Export all Inngest functions
 * This file aggregates all functions for registration with the Inngest serve handler
 */

import { scrapeAllRestaurants } from './scrape-all';
import { scrapeRestaurantFn } from './scrape-restaurant';

/**
 * Array of all Inngest functions to register
 * Add new functions here as they are created
 */
export const functions = [
  scrapeAllRestaurants,
  scrapeRestaurantFn,
];

// Re-export individual functions for direct imports
export { scrapeAllRestaurants } from './scrape-all';
export { scrapeRestaurantFn } from './scrape-restaurant';
