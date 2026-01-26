/**
 * Notification deduplication
 * Prevents sending duplicate notifications for the same slot
 */

import { createClient } from '@supabase/supabase-js';
import type { Database, NotificationChannel, NotificationSentInsert } from '@/lib/types/database';
import type { AvailabilitySlot } from '@/lib/scrapers/types';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient<Database>(url, key);
}

/**
 * Filters out slots that have already been notified to this user
 */
export async function filterAlreadyNotified(
  userId: string,
  restaurantId: string,
  slots: AvailabilitySlot[],
  channel: NotificationChannel
): Promise<AvailabilitySlot[]> {
  if (slots.length === 0) return [];

  const supabase = getServiceClient();

  // Get all notifications sent for this user/restaurant/channel
  const { data: sent, error } = await supabase
    .from('notifications_sent')
    .select('availability_date, availability_time')
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId)
    .eq('channel', channel)
    .eq('type', 'new_slot') as {
      data: Array<{ availability_date: string | null; availability_time: string | null }> | null;
      error: unknown;
    };

  if (error) {
    console.error('Failed to check notification history:', error);
    // On error, allow all slots (better to potentially duplicate than to miss)
    return slots;
  }

  // Build set of already-notified slot keys
  const sentKeys = new Set(
    (sent || []).map((n) => `${n.availability_date}|${n.availability_time}`)
  );

  // Filter out already-notified slots
  return slots.filter((slot) => {
    const key = `${slot.date}|${slot.time}`;
    return !sentKeys.has(key);
  });
}

/**
 * Records that notifications were sent for these slots
 */
export async function recordNotificationsSent(
  userId: string,
  restaurantId: string,
  slots: AvailabilitySlot[],
  channel: NotificationChannel
): Promise<void> {
  if (slots.length === 0) return;

  const supabase = getServiceClient();

  const records: NotificationSentInsert[] = slots.map((slot) => ({
    user_id: userId,
    restaurant_id: restaurantId,
    type: 'new_slot' as const,
    channel,
    availability_date: slot.date,
    availability_time: slot.time,
  }));

  const { error } = await supabase.from('notifications_sent').insert(records as never);

  if (error) {
    console.error('Failed to record sent notifications:', error);
    // Don't throw - recording failure shouldn't break notification flow
  }
}
