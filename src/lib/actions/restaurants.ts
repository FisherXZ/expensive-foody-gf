'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  Restaurant,
  UserRestaurantWithRestaurant,
  AvailabilitySnapshot,
} from '@/lib/types/database';

/**
 * Fetch all restaurants from the database
 */
export async function getRestaurants(): Promise<{
  data: Restaurant[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('name');

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Fetch a single restaurant by ID
 */
export async function getRestaurant(
  restaurantId: string
): Promise<{ data: Restaurant | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Fetch user's tracked restaurants with restaurant details
 */
export async function getUserRestaurants(): Promise<{
  data: UserRestaurantWithRestaurant[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('user_restaurants')
    .select(
      `
      *,
      restaurant:restaurants(*)
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  // Type assertion needed due to Supabase join typing
  return { data: data as UserRestaurantWithRestaurant[], error: null };
}

/**
 * Get IDs of restaurants the user is tracking
 */
export async function getUserRestaurantIds(): Promise<{
  data: string[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('user_restaurants')
    .select('restaurant_id')
    .eq('user_id', user.id);

  if (error) {
    return { data: null, error: error.message };
  }

  // Type assertion for partial select
  const typedData = data as Array<{ restaurant_id: string }>;
  return { data: typedData.map((r) => r.restaurant_id), error: null };
}

/**
 * Toggle tracking for a restaurant (add or remove)
 */
export async function toggleRestaurant(
  restaurantId: string
): Promise<{ success: boolean; isTracking: boolean; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, isTracking: false, error: 'Not authenticated' };
  }

  // Check if already tracking
  const { data: existing } = await supabase
    .from('user_restaurants')
    .select('id')
    .eq('user_id', user.id)
    .eq('restaurant_id', restaurantId)
    .single();

  // Type assertion for partial select
  const existingRecord = existing as { id: string } | null;

  if (existingRecord) {
    // Remove tracking
    const { error } = await supabase
      .from('user_restaurants')
      .delete()
      .eq('id', existingRecord.id);

    if (error) {
      return { success: false, isTracking: true, error: error.message };
    }

    revalidatePath('/dashboard');
    revalidatePath('/restaurants');
    return { success: true, isTracking: false, error: null };
  } else {
    // Add tracking
    const insertData = {
      user_id: user.id,
      restaurant_id: restaurantId,
      party_size: 2, // Default party size
      notify_new_releases: true,
    };
    const { error } = await supabase
      .from('user_restaurants')
      .insert(insertData as never);

    if (error) {
      return { success: false, isTracking: false, error: error.message };
    }

    revalidatePath('/dashboard');
    revalidatePath('/restaurants');
    return { success: true, isTracking: true, error: null };
  }
}

/**
 * Update tracking settings for a specific restaurant
 */
export async function updateUserRestaurant(
  userRestaurantId: string,
  updates: {
    party_size?: number;
    notify_new_releases?: boolean;
    notify_date_start?: string | null;
    notify_date_end?: string | null;
    preferred_time_start?: string | null;
    preferred_time_end?: string | null;
  }
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('user_restaurants')
    .update(updates as never)
    .eq('id', userRestaurantId)
    .eq('user_id', user.id); // Ensure user owns this record

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true, error: null };
}

/**
 * Track a restaurant with custom settings (party size, date range, time preferences)
 */
export async function trackRestaurantWithSettings(
  restaurantId: string,
  settings: {
    party_size: number;
    notify_date_start: string | null;
    notify_date_end: string | null;
    preferred_time_start: string | null;
    preferred_time_end: string | null;
  }
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if already tracking
  const { data: existing } = await supabase
    .from('user_restaurants')
    .select('id')
    .eq('user_id', user.id)
    .eq('restaurant_id', restaurantId)
    .single();

  const existingRecord = existing as { id: string } | null;

  if (existingRecord) {
    // Update existing tracking settings
    const { error } = await supabase
      .from('user_restaurants')
      .update({
        party_size: settings.party_size,
        notify_date_start: settings.notify_date_start,
        notify_date_end: settings.notify_date_end,
        preferred_time_start: settings.preferred_time_start,
        preferred_time_end: settings.preferred_time_end,
      } as never)
      .eq('id', existingRecord.id);

    if (error) {
      return { success: false, error: error.message };
    }
  } else {
    // Create new tracking record
    const insertData = {
      user_id: user.id,
      restaurant_id: restaurantId,
      party_size: settings.party_size,
      notify_new_releases: true,
      notify_date_start: settings.notify_date_start,
      notify_date_end: settings.notify_date_end,
      preferred_time_start: settings.preferred_time_start,
      preferred_time_end: settings.preferred_time_end,
    };

    const { error } = await supabase
      .from('user_restaurants')
      .insert(insertData as never);

    if (error) {
      return { success: false, error: error.message };
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/restaurants');
  return { success: true, error: null };
}

/**
 * Get latest availability snapshot for a restaurant
 */
export async function getAvailability(
  restaurantId: string
): Promise<{ data: AvailabilitySnapshot[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('availability_snapshots')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('date', { ascending: true })
    .limit(14); // Get next 2 weeks

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Get availability for multiple restaurants (for dashboard)
 */
export async function getMultipleRestaurantsAvailability(
  restaurantIds: string[]
): Promise<{
  data: Record<string, AvailabilitySnapshot[]> | null;
  error: string | null;
}> {
  if (restaurantIds.length === 0) {
    return { data: {}, error: null };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('availability_snapshots')
    .select('*')
    .in('restaurant_id', restaurantIds)
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  // Group by restaurant
  const grouped: Record<string, AvailabilitySnapshot[]> = {};
  const typedData = data as AvailabilitySnapshot[];
  typedData.forEach((snapshot) => {
    if (!grouped[snapshot.restaurant_id]) {
      grouped[snapshot.restaurant_id] = [];
    }
    grouped[snapshot.restaurant_id].push(snapshot);
  });

  return { data: grouped, error: null };
}
