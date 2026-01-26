/**
 * Inngest function: Notify users of new availability slots
 * Listens to availability/new-slots event and sends notifications
 */

import { inngest } from '../client';
import { getRecipients, notifyRecipient } from '@/lib/notifications';

/**
 * Notify New Slots Function
 *
 * Triggered when new availability slots are found for a restaurant.
 * For each user tracking the restaurant:
 * 1. Filters slots by user preferences (party size, dates, times)
 * 2. Checks deduplication (skip already-notified slots)
 * 3. Sends email/SMS based on user settings
 * 4. Records sent notifications for future dedup
 */
export const notifyNewSlots = inngest.createFunction(
  {
    id: 'notify-new-slots',
    name: 'Notify New Slots',
    // Limit concurrency to avoid overwhelming email/SMS APIs
    concurrency: {
      limit: 10,
    },
    retries: 3,
  },
  { event: 'availability/new-slots' },
  async ({ event, step, logger }) => {
    const { restaurantId, restaurantName, newSlots } = event.data;

    logger.info(`Processing notifications for ${restaurantName} (${newSlots.length} new slots)`);

    // Step 1: Get all users tracking this restaurant with notifications enabled
    const recipients = await step.run('get-recipients', async () => {
      const result = await getRecipients(restaurantId);
      logger.info(`Found ${result.length} recipients for ${restaurantName}`);
      return result;
    });

    if (recipients.length === 0) {
      logger.info(`No recipients to notify for ${restaurantName}`);
      return {
        restaurantId,
        restaurantName,
        totalSlots: newSlots.length,
        recipientsFound: 0,
        notificationsSent: 0,
      };
    }

    // Step 2: Send notifications to each recipient
    const results = await step.run('send-notifications', async () => {
      const allResults: Array<{
        userId: string;
        email: number;
        sms: number;
        errors: string[];
      }> = [];

      for (const recipient of recipients) {
        const sendResults = await notifyRecipient(recipient, {
          restaurantId,
          restaurantName,
          slots: newSlots,
        });

        const recipientResult = {
          userId: recipient.userId,
          email: 0,
          sms: 0,
          errors: [] as string[],
        };

        for (const result of sendResults) {
          if (result.success) {
            if (result.channel === 'email') recipientResult.email++;
            if (result.channel === 'sms') recipientResult.sms++;
          } else if (result.error) {
            recipientResult.errors.push(`${result.channel}: ${result.error}`);
          }
        }

        allResults.push(recipientResult);
      }

      return allResults;
    });

    // Summarize results
    const summary = {
      restaurantId,
      restaurantName,
      totalSlots: newSlots.length,
      recipientsFound: recipients.length,
      emailsSent: results.reduce((sum, r) => sum + r.email, 0),
      smsSent: results.reduce((sum, r) => sum + r.sms, 0),
      errors: results.flatMap((r) => r.errors),
    };

    logger.info(
      `Notification summary for ${restaurantName}: ${summary.emailsSent} emails, ${summary.smsSent} SMS sent to ${summary.recipientsFound} recipients`
    );

    if (summary.errors.length > 0) {
      logger.warn(`Notification errors: ${summary.errors.join('; ')}`);
    }

    return summary;
  }
);
