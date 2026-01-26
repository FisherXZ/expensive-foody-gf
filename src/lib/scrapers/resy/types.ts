/**
 * Resy API response types
 * Based on the Resy API v4 response format
 */

/**
 * Resy venue ID structure
 */
export interface ResyVenueId {
  resy: number;
}

/**
 * Resy venue information
 */
export interface ResyVenue {
  id: ResyVenueId;
  name: string;
}

/**
 * Resy slot date/time information
 */
export interface ResySlotDate {
  /** Start time in "YYYY-MM-DD HH:MM:SS" format */
  start: string;
  /** End time in "YYYY-MM-DD HH:MM:SS" format */
  end: string;
}

/**
 * Resy slot configuration
 */
export interface ResySlotConfig {
  /** Type of seating (e.g., "Dining Room", "Bar") */
  type: string;
  /** Token used for booking */
  token: string;
}

/**
 * Resy party size constraints
 */
export interface ResySlotSize {
  min: number;
  max: number;
}

/**
 * Individual slot from Resy API
 */
export interface ResySlot {
  date: ResySlotDate;
  config: ResySlotConfig;
  size: ResySlotSize;
}

/**
 * Venue result with slots
 */
export interface ResyVenueResult {
  venue: ResyVenue;
  slots: ResySlot[];
}

/**
 * Results container
 */
export interface ResyResults {
  venues: ResyVenueResult[];
}

/**
 * Top-level Resy API response for /4/find endpoint
 */
export interface ResyFindResponse {
  results: ResyResults;
}

/**
 * Parameters for the Resy /4/find API call
 */
export interface ResyFindParams {
  /** Restaurant's Resy ID */
  venue_id: string;
  /** Date in YYYY-MM-DD format */
  day: string;
  /** Number of guests */
  party_size: number;
  /** Latitude for search context (SF: 37.7749) */
  lat?: number;
  /** Longitude for search context (SF: -122.4194) */
  long?: number;
}
