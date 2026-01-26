/**
 * SMS client using Twilio
 * Falls back to console logging in dev mode when credentials are missing
 *
 * TODO(claude-code): Remove dev mode fallback once production Twilio credentials are configured.
 * Dev mode code includes: DEV_MODE constant, console.log block in sendSms(), isSmsDevMode().
 */

import twilio from 'twilio';

const DEV_MODE =
  !process.env.TWILIO_ACCOUNT_SID ||
  !process.env.TWILIO_AUTH_TOKEN ||
  !process.env.TWILIO_PHONE_NUMBER;

// Lazy-initialized Twilio client
let twilioClient: twilio.Twilio | null = null;

function getClient(): twilio.Twilio {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      throw new Error('TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set');
    }
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

function getFromNumber(): string {
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!phoneNumber) {
    throw new Error('TWILIO_PHONE_NUMBER not set');
  }
  return phoneNumber;
}

export class SmsClientError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'SmsClientError';
  }
}

export interface SendSmsParams {
  to: string;
  body: string;
}

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Sends an SMS via Twilio API
 * In dev mode (missing credentials), logs to console and returns mock success
 */
export async function sendSms(params: SendSmsParams): Promise<SendSmsResult> {
  const { to, body } = params;

  // Dev mode: log and return mock success
  if (DEV_MODE) {
    console.log('─────────────────────────────────────────');
    console.log('[DEV MODE] SMS notification:');
    console.log(`  To: ${to}`);
    console.log(`  Body: ${body}`);
    console.log('─────────────────────────────────────────');
    return { success: true, messageId: `dev-${Date.now()}` };
  }

  try {
    const client = getClient();
    const message = await client.messages.create({
      to,
      from: getFromNumber(),
      body,
    });

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    throw new SmsClientError(`Failed to send SMS: ${message}`, err);
  }
}

/**
 * Check if SMS client is in dev mode
 */
export function isSmsDevMode(): boolean {
  return DEV_MODE;
}
