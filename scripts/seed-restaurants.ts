/**
 * Seed script for restaurants table
 *
 * Usage:
 *   npx dotenv -e .env.local -- tsx scripts/seed-restaurants.ts
 *   OR
 *   source .env.local && npx tsx scripts/seed-restaurants.ts
 *
 * Prerequisites:
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local
 *   - Run migration 002 before seeding if not already applied
 */

import { createClient } from '@supabase/supabase-js';
import { sfRestaurants } from '../data/sf-restaurants';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseServiceKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seedRestaurants() {
  console.log(`Seeding ${sfRestaurants.length} restaurants...\n`);

  const restaurantsToInsert = sfRestaurants.map((r) => ({
    name: r.name,
    platform: r.platform === 'unknown' ? null : r.platform,
    platform_id: r.platform_id || null,
    location: r.neighborhood,
    image_url: null, // Can be added later
  }));

  // Use upsert to avoid duplicates (based on name)
  // Note: This requires a unique constraint on name, or we handle conflicts manually
  const { data, error } = await supabase
    .from('restaurants')
    .upsert(restaurantsToInsert, {
      onConflict: 'name',
      ignoreDuplicates: false,
    })
    .select();

  if (error) {
    // If upsert fails due to missing unique constraint, try insert with manual duplicate check
    if (error.message.includes('unique') || error.code === '42P10') {
      console.log('Unique constraint not found on name column, doing manual insert...\n');
      return seedRestaurantsManual();
    }
    console.error('Error seeding restaurants:', error.message);
    process.exit(1);
  }

  console.log(`Successfully seeded ${data?.length || 0} restaurants:\n`);
  data?.forEach((r) => {
    console.log(`  - ${r.name} (${r.location}) [${r.platform || 'unknown'}]`);
  });

  return data;
}

async function seedRestaurantsManual() {
  // Get existing restaurants
  const { data: existing } = await supabase
    .from('restaurants')
    .select('name');

  const existingNames = new Set((existing || []).map((r) => r.name));

  const newRestaurants = sfRestaurants
    .filter((r) => !existingNames.has(r.name))
    .map((r) => ({
      name: r.name,
      platform: r.platform === 'unknown' ? null : r.platform,
      platform_id: r.platform_id || null,
      location: r.neighborhood,
      image_url: null,
    }));

  if (newRestaurants.length === 0) {
    console.log('All restaurants already exist in the database.');
    return [];
  }

  const { data, error } = await supabase
    .from('restaurants')
    .insert(newRestaurants)
    .select();

  if (error) {
    console.error('Error inserting restaurants:', error.message);
    process.exit(1);
  }

  console.log(`Inserted ${data?.length || 0} new restaurants:\n`);
  data?.forEach((r) => {
    console.log(`  - ${r.name} (${r.location}) [${r.platform || 'unknown'}]`);
  });

  if (existingNames.size > 0) {
    console.log(`\nSkipped ${existingNames.size} existing restaurants.`);
  }

  return data;
}

// Run the seed
seedRestaurants()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
