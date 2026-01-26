/**
 * Availability service
 * Handles saving and retrieving availability snapshots from the database
 */

import { createClient } from '@supabase/supabase-js';
import type { Database, AvailabilitySnapshot, AvailabilitySnapshotInsert, TimeSlot } from '@/lib/types/database';
import type { ScrapeResult, AvailabilitySlot } from '@/lib/scrapers/types';

/**
 * Creates a Supabase client with service role for server-side operations
 * This bypasses RLS for background jobs
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
 * Converts AvailabilitySlot array to TimeSlot array for database storage
 * Groups slots by date and converts to the database format
 */
function convertToTimeSlots(slots: AvailabilitySlot[]): TimeSlot[] {
  return slots.map(slot => ({
    time: slot.time,
    party_sizes: slot.partySize,
  }));
}

/**
 * Converts TimeSlot array back to AvailabilitySlot array
 */
function convertFromTimeSlots(timeSlots: TimeSlot[], date: string): AvailabilitySlot[] {
  return timeSlots.map(slot => ({
    date,
    time: slot.time,
    partySize: slot.party_sizes,
  }));
}

/**
 * Groups slots by date for batch insertion
 */
function groupSlotsByDate(slots: AvailabilitySlot[]): Map<string, AvailabilitySlot[]> {
  const grouped = new Map<string, AvailabilitySlot[]>();

  for (const slot of slots) {
    const existing = grouped.get(slot.date) || [];
    existing.push(slot);
    grouped.set(slot.date, existing);
  }

  return grouped;
}

/**
 * Saves a scrape result to the database as availability snapshots
 * Creates one snapshot per date with all slots for that date
 *
 * @param result - The scrape result to save
 * @returns Promise resolving when save is complete
 *
 * @example
 * ```typescript
 * const result = await scrapeRestaurant('uuid', 'resy', '1505');
 * await saveSnapshot(result);
 * ```
 */
export async function saveSnapshot(result: ScrapeResult): Promise<void> {
  const supabase = getServiceClient();
  const slotsByDate = groupSlotsByDate(result.slots);

  // Create upsert operations for each date
  const snapshots: AvailabilitySnapshotInsert[] = [];

  for (const [date, slots] of slotsByDate) {
    snapshots.push({
      restaurant_id: result.restaurantId,
      date,
      time_slots: convertToTimeSlots(slots),
      scraped_at: result.scrapedAt.toISOString(),
    });
  }

  if (snapshots.length === 0) {
    console.log(`No slots to save for restaurant ${result.restaurantId}`);
    return;
  }

  // Upsert snapshots (update if date already exists for this restaurant)
  // Type assertion needed due to Supabase typing
  const { error } = await supabase
    .from('availability_snapshots')
    .upsert(snapshots as never, {
      onConflict: 'restaurant_id,date',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('Failed to save availability snapshots:', error);
    throw new Error(`Failed to save availability snapshots: ${error.message}`);
  }

  console.log(`Saved ${snapshots.length} availability snapshots for restaurant ${result.restaurantId}`);
}

/**
 * Gets the latest snapshot for a restaurant
 *
 * @param restaurantId - The restaurant ID
 * @returns The most recent snapshot or null if none exists
 */
export async function getLatestSnapshot(
  restaurantId: string
): Promise<AvailabilitySnapshot | null> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('availability_snapshots')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('scraped_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null;
    }
    console.error('Failed to get latest snapshot:', error);
    throw new Error(`Failed to get latest snapshot: ${error.message}`);
  }

  return data;
}

/**
 * Gets all snapshots for a restaurant on a specific date
 *
 * @param restaurantId - The restaurant ID
 * @param date - The date in YYYY-MM-DD format
 * @returns Array of snapshots for that date
 */
export async function getSnapshotsForDate(
  restaurantId: string,
  date: string
): Promise<AvailabilitySnapshot[]> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('availability_snapshots')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('date', date)
    .order('scraped_at', { ascending: false });

  if (error) {
    console.error('Failed to get snapshots for date:', error);
    throw new Error(`Failed to get snapshots for date: ${error.message}`);
  }

  return data || [];
}

/**
 * Gets all current snapshots for a restaurant (one per date)
 * Returns the most recent snapshot for each date
 *
 * @param restaurantId - The restaurant ID
 * @returns Array of current snapshots grouped by date
 */
export async function getAllCurrentSnapshots(
  restaurantId: string
): Promise<AvailabilitySnapshot[]> {
  const supabase = getServiceClient();

  // Get all snapshots for the next 30 days
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data, error } = await supabase
    .from('availability_snapshots')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .gte('date', today)
    .lte('date', thirtyDaysLater)
    .order('date', { ascending: true });

  if (error) {
    console.error('Failed to get all current snapshots:', error);
    throw new Error(`Failed to get all current snapshots: ${error.message}`);
  }

  return data || [];
}

/**
 * Converts database snapshots to AvailabilitySlot array for comparison
 *
 * @param snapshots - Array of database snapshots
 * @returns Flattened array of AvailabilitySlot objects
 */
export function snapshotsToSlots(snapshots: AvailabilitySnapshot[]): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];

  for (const snapshot of snapshots) {
    if (snapshot.time_slots) {
      const converted = convertFromTimeSlots(snapshot.time_slots, snapshot.date);
      slots.push(...converted);
    }
  }

  return slots;
}
