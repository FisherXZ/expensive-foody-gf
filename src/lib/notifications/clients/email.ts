/**
 * Email client using Resend
 * Falls back to console logging in dev mode when API key is missing
 *
 * TODO(claude-code): Remove dev mode fallback once production API keys are configured.
 * Dev mode code includes: DEV_MODE constant, console.log block in sendEmail(), isEmailDevMode().
 */

import { Resend } from 'resend';

const DEV_MODE = !process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Foody <notifications@foody.app>';

// Lazy-initialized Resend client
let resendClient: Resend | null = null;

function getClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY not set');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export class EmailClientError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'EmailClientError';
  }
}

export interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Sends an email via Resend API
 * In dev mode (no API key), logs to console and returns mock success
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, text, html } = params;

  // Dev mode: log and return mock success
  if (DEV_MODE) {
    console.log('─────────────────────────────────────────');
    console.log('[DEV MODE] Email notification:');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:\n${text}`);
    console.log('─────────────────────────────────────────');
    return { success: true, messageId: `dev-${Date.now()}` };
  }

  try {
    const client = getClient();
    const { data, error } = await client.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      text,
      html,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    throw new EmailClientError(`Failed to send email: ${message}`, err);
  }
}

/**
 * Check if email client is in dev mode
 */
export function isEmailDevMode(): boolean {
  return DEV_MODE;
}
