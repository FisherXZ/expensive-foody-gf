/**
 * HTTP client for Resy API
 * Handles API calls with proper authentication and error handling
 */

import type { ResyFindResponse, ResyFindParams } from './types';

const RESY_API_BASE = 'https://api.resy.com';
const RESY_FIND_ENDPOINT = '/4/find';

// Default coordinates for San Francisco
const DEFAULT_LAT = 37.7749;
const DEFAULT_LONG = -122.4194;

/**
 * Error thrown when Resy API call fails
 */
export class ResyApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: string
  ) {
    super(message);
    this.name = 'ResyApiError';
  }
}

/**
 * Gets the Resy API key from environment variables
 * @throws Error if RESY_API_KEY is not set
 */
function getApiKey(): string {
  const apiKey = process.env.RESY_API_KEY;
  if (!apiKey) {
    throw new Error('RESY_API_KEY environment variable is not set');
  }
  return apiKey;
}

/**
 * Builds the authorization header for Resy API
 */
function buildAuthHeader(apiKey: string): string {
  return `ResyAPI api_key="${apiKey}"`;
}

/**
 * Builds query string from params object
 */
function buildQueryString(params: ResyFindParams): string {
  const searchParams = new URLSearchParams();
  searchParams.set('venue_id', params.venue_id);
  searchParams.set('day', params.day);
  searchParams.set('party_size', params.party_size.toString());
  searchParams.set('lat', (params.lat ?? DEFAULT_LAT).toString());
  searchParams.set('long', (params.long ?? DEFAULT_LONG).toString());
  return searchParams.toString();
}

/**
 * Fetches availability from Resy API for a specific venue and date
 *
 * @param params - Query parameters for the API call
 * @returns Promise resolving to the Resy API response
 * @throws ResyApiError if the API call fails
 *
 * @example
 * ```typescript
 * const response = await fetchResyAvailability({
 *   venue_id: '1505',
 *   day: '2024-02-15',
 *   party_size: 2
 * });
 * ```
 */
export async function fetchResyAvailability(
  params: ResyFindParams
): Promise<ResyFindResponse> {
  const apiKey = getApiKey();
  const queryString = buildQueryString(params);
  const url = `${RESY_API_BASE}${RESY_FIND_ENDPOINT}?${queryString}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': buildAuthHeader(apiKey),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => 'Unable to read response');
      throw new ResyApiError(
        `Resy API returned ${response.status}: ${response.statusText}`,
        response.status,
        responseText
      );
    }

    const data = await response.json() as ResyFindResponse;
    return data;
  } catch (error) {
    // Re-throw ResyApiError as-is
    if (error instanceof ResyApiError) {
      throw error;
    }

    // Wrap other errors
    throw new ResyApiError(
      `Failed to fetch from Resy API: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      undefined
    );
  }
}

/**
 * Fetches availability for multiple dates in parallel
 * Useful for getting a full date range in one operation
 *
 * @param venueId - The Resy venue ID
 * @param dates - Array of dates in YYYY-MM-DD format
 * @param partySize - Number of guests
 * @returns Promise resolving to an array of API responses (one per date)
 */
export async function fetchResyAvailabilityBatch(
  venueId: string,
  dates: string[],
  partySize: number
): Promise<ResyFindResponse[]> {
  const results = await Promise.allSettled(
    dates.map(day =>
      fetchResyAvailability({
        venue_id: venueId,
        day,
        party_size: partySize,
      })
    )
  );

  // Log errors but don't fail the whole batch
  const responses: ResyFindResponse[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      responses.push(result.value);
    } else {
      console.error(`Failed to fetch Resy availability for ${dates[i]}:`, result.reason);
      // Add an empty response for failed dates
      responses.push({ results: { venues: [] } });
    }
  }

  return responses;
}
