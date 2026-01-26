/**
 * Notification service
 * Orchestrates fetching recipients and sending notifications
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';
import type { AvailabilitySlot } from '@/lib/scrapers/types';
import { filterSlotsByPreferences } from '@/lib/services/diff';
import { sendEmail } from './clients/email';
import { sendSms } from './clients/sms';
import { buildNotificationContent, buildSmsMessage } from './templates';
import { filterAlreadyNotified, recordNotificationsSent } from './dedup';
import type { NotificationRecipient, NotificationPayload, SendResult } from './types';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient<Database>(url, key);
}

// Type for the joined query result
interface RecipientQueryRow {
  user_id: string;
  party_size: number;
  notify_new_releases: boolean;
  notify_date_start: string | null;
  notify_date_end: string | null;
  preferred_time_start: string | null;
  preferred_time_end: string | null;
  user_profiles: {
    phone: string | null;
    email_notifications: boolean;
    sms_notifications: boolean;
  };
}

/**
 * Fetches all users tracking a restaurant with their notification preferences
 */
export async function getRecipients(
  restaurantId: string
): Promise<NotificationRecipient[]> {
  const supabase = getServiceClient();

  // Get user_restaurants with user_profiles joined
  const { data, error } = await supabase
    .from('user_restaurants')
    .select(`
      user_id,
      party_size,
      notify_new_releases,
      notify_date_start,
      notify_date_end,
      preferred_time_start,
      preferred_time_end,
      user_profiles!inner (
        phone,
        email_notifications,
        sms_notifications
      )
    `)
    .eq('restaurant_id', restaurantId)
    .eq('notify_new_releases', true) as { data: RecipientQueryRow[] | null; error: unknown };

  if (error) {
    console.error('Failed to fetch recipients:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Get user emails from auth.users via admin API
  // Fetch only the users we need for better performance at scale
  const userIds = data.map((r) => r.user_id);
  const emailMap = new Map<string, string>();

  // Batch fetch users by ID (Supabase admin API doesn't support bulk ID filter,
  // so we fetch individually but could be optimized with a database function)
  await Promise.all(
    userIds.map(async (userId) => {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (!userError && userData.user?.email) {
        emailMap.set(userId, userData.user.email);
      }
    })
  );

  // Map to NotificationRecipient
  return data.map((row): NotificationRecipient => ({
    userId: row.user_id,
    email: emailMap.get(row.user_id) || null,
    phone: row.user_profiles.phone,
    emailEnabled: row.user_profiles.email_notifications,
    smsEnabled: row.user_profiles.sms_notifications,
    partySize: row.party_size,
    notifyNewReleases: row.notify_new_releases,
    dateStart: row.notify_date_start,
    dateEnd: row.notify_date_end,
    timeStart: row.preferred_time_start,
    timeEnd: row.preferred_time_end,
  }));
}

/**
 * Sends notifications to a single recipient via all enabled channels
 * Returns array of send results
 */
export async function notifyRecipient(
  recipient: NotificationRecipient,
  payload: NotificationPayload
): Promise<SendResult[]> {
  const results: SendResult[] = [];

  // Filter slots by user preferences
  const filteredSlots = filterSlotsByPreferences(payload.slots, {
    partySize: recipient.partySize,
    dateStart: recipient.dateStart || undefined,
    dateEnd: recipient.dateEnd || undefined,
    timeStart: recipient.timeStart || undefined,
    timeEnd: recipient.timeEnd || undefined,
  });

  if (filteredSlots.length === 0) {
    return results;
  }

  // Send email if enabled
  if (recipient.emailEnabled && recipient.email) {
    const slotsToNotify = await filterAlreadyNotified(
      recipient.userId,
      payload.restaurantId,
      filteredSlots,
      'email'
    );

    if (slotsToNotify.length > 0) {
      const content = buildNotificationContent(payload.restaurantName, slotsToNotify);

      try {
        const emailResult = await sendEmail({
          to: recipient.email,
          subject: content.subject,
          text: content.text,
          html: content.html,
        });

        results.push({
          success: emailResult.success,
          channel: 'email',
          messageId: emailResult.messageId,
          error: emailResult.error,
        });

        if (emailResult.success) {
          await recordNotificationsSent(
            recipient.userId,
            payload.restaurantId,
            slotsToNotify,
            'email'
          );
        }
      } catch (err) {
        results.push({
          success: false,
          channel: 'email',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  }

  // Send SMS if enabled
  if (recipient.smsEnabled && recipient.phone) {
    const slotsToNotify = await filterAlreadyNotified(
      recipient.userId,
      payload.restaurantId,
      filteredSlots,
      'sms'
    );

    if (slotsToNotify.length > 0) {
      const message = buildSmsMessage(payload.restaurantName, slotsToNotify);

      try {
        const smsResult = await sendSms({
          to: recipient.phone,
          body: message,
        });

        results.push({
          success: smsResult.success,
          channel: 'sms',
          messageId: smsResult.messageId,
          error: smsResult.error,
        });

        if (smsResult.success) {
          await recordNotificationsSent(
            recipient.userId,
            payload.restaurantId,
            slotsToNotify,
            'sms'
          );
        }
      } catch (err) {
        results.push({
          success: false,
          channel: 'sms',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  }

  return results;
}
