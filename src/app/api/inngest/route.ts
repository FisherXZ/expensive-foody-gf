/**
 * Inngest API Route Handler
 * This endpoint handles all Inngest webhook events and function invocations
 */

import { serve } from 'inngest/next';
import { inngest, functions } from '@/lib/inngest';

/**
 * Inngest serve handler
 * Exports GET, POST, and PUT handlers for Next.js App Router
 *
 * - GET: Used by Inngest to discover available functions
 * - POST: Used to receive events from Inngest
 * - PUT: Used to sync function configurations
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
