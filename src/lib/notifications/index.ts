/**
 * Notification module public exports
 */

export type {
  NotificationRecipient,
  NotificationPayload,
  SendResult,
  NotificationContent,
} from './types';

export { getRecipients, notifyRecipient } from './service';
export { buildNotificationContent, buildSmsMessage } from './templates';
export { filterAlreadyNotified, recordNotificationsSent } from './dedup';
export { sendEmail, isEmailDevMode } from './clients/email';
export { sendSms, isSmsDevMode } from './clients/sms';
