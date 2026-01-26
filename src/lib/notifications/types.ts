/**
 * Notification system types
 */

import type { AvailabilitySlot } from '@/lib/scrapers/types';
import type { NotificationChannel } from '@/lib/types/database';

/**
 * User info with notification preferences for a specific restaurant
 */
export interface NotificationRecipient {
  userId: string;
  email: string | null;
  phone: string | null;
  emailEnabled: boolean;
  smsEnabled: boolean;
  // Per-restaurant preferences
  partySize: number;
  notifyNewReleases: boolean;
  dateStart: string | null;
  dateEnd: string | null;
  timeStart: string | null;
  timeEnd: string | null;
}

/**
 * Data passed to notification functions
 */
export interface NotificationPayload {
  restaurantId: string;
  restaurantName: string;
  slots: AvailabilitySlot[];
}

/**
 * Result of sending a notification
 */
export interface SendResult {
  success: boolean;
  channel: NotificationChannel;
  messageId?: string;
  error?: string;
}

/**
 * Content for notification messages
 */
export interface NotificationContent {
  subject: string;
  text: string;
  html: string;
}
