/**
 * Notification message templates
 * Builds email/SMS content from slot data
 */

import type { AvailabilitySlot } from '@/lib/scrapers/types';
import { groupSlotsByDate, summarizeSlots } from '@/lib/services/diff';
import type { NotificationContent } from './types';

/**
 * Formats a date string (YYYY-MM-DD) to readable format
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Builds notification content for new availability slots
 */
export function buildNotificationContent(
  restaurantName: string,
  slots: AvailabilitySlot[]
): NotificationContent {
  const summary = summarizeSlots(slots);
  const grouped = groupSlotsByDate(slots);

  // Build plain text version
  const textLines: string[] = [
    `New availability at ${restaurantName}!`,
    '',
    summary,
    '',
  ];

  for (const [date, dateSlots] of grouped) {
    const times = dateSlots.map((s) => s.time).join(', ');
    textLines.push(`${formatDate(date)}: ${times}`);
  }

  textLines.push('', 'Book now before these slots are taken!');

  const text = textLines.join('\n');

  // Build HTML version
  const htmlSlotRows = Array.from(grouped.entries())
    .map(([date, dateSlots]) => {
      const times = dateSlots
        .map((s) => `<span style="background:#f0f0f0;padding:2px 6px;border-radius:4px;margin:2px;">${s.time}</span>`)
        .join(' ');
      return `<tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:500;">${formatDate(date)}</td><td style="padding:8px;border-bottom:1px solid #eee;">${times}</td></tr>`;
    })
    .join('');

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;">
      <h2 style="color:#ea580c;">New availability at ${restaurantName}!</h2>
      <p style="color:#666;">${summary}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead>
          <tr style="background:#f9f9f9;">
            <th style="padding:8px;text-align:left;">Date</th>
            <th style="padding:8px;text-align:left;">Times</th>
          </tr>
        </thead>
        <tbody>
          ${htmlSlotRows}
        </tbody>
      </table>
      <p style="color:#666;font-size:14px;">Book now before these slots are taken!</p>
    </div>
  `.trim();

  return {
    subject: `🍽️ New availability at ${restaurantName}`,
    text,
    html,
  };
}

/**
 * Builds SMS-friendly short message
 */
export function buildSmsMessage(
  restaurantName: string,
  slots: AvailabilitySlot[]
): string {
  const summary = summarizeSlots(slots);
  return `Foody: ${restaurantName} has new availability! ${summary}. Book now!`;
}
