/**
 * Seed script for availability_snapshots table
 *
 * Usage:
 *   npx dotenv -e .env.local -- tsx scripts/seed-availability.ts
 *
 * This creates test availability data for the next 30 days
 * to verify the calendar component is working correctly.
 */

import { createClient } from '@supabase/supabase-js';
import { format, addDays } from 'date-fns';
import type { TimeSlot } from '../src/lib/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseServiceKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Generate realistic time slots for a day
function generateTimeSlots(dayOffset: number): TimeSlot[] {
  const baseSlots = [
    { time: '5:00 PM', party_sizes: [2, 4] },
    { time: '5:30 PM', party_sizes: [2, 4, 6] },
    { time: '6:00 PM', party_sizes: [2, 4] },
    { time: '6:30 PM', party_sizes: [2, 4, 6] },
    { time: '7:00 PM', party_sizes: [2] },
    { time: '7:30 PM', party_sizes: [2, 4] },
    { time: '8:00 PM', party_sizes: [4, 6] },
    { time: '8:30 PM', party_sizes: [2, 4, 6] },
    { time: '9:00 PM', party_sizes: [2, 4] },
    { time: '9:30 PM', party_sizes: [2] },
  ];

  // Vary availability based on day to make it realistic
  // Weekends (5, 6 = Fri, Sat) have fewer slots
  const dayOfWeek = (new Date().getDay() + dayOffset) % 7;
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

  if (isWeekend) {
    // Fewer slots on weekends
    return baseSlots.slice(0, 3 + Math.floor(Math.random() * 3));
  }

  // Some days have lots of availability, some have limited
  const randomFactor = Math.random();
  if (randomFactor < 0.2) {
    // 20% of days have very limited availability
    return baseSlots.slice(0, 2);
  } else if (randomFactor < 0.5) {
    // 30% have moderate availability
    return baseSlots.slice(0, 5);
  }
  // 50% have good availability
  return baseSlots;
}

async function seedAvailability() {
  // First, get all restaurants
  const { data: restaurants, error: fetchError } = await supabase
    .from('restaurants')
    .select('id, name')
    .limit(10); // Seed for first 10 restaurants

  if (fetchError) {
    console.error('Error fetching restaurants:', fetchError.message);
    process.exit(1);
  }

  if (!restaurants || restaurants.length === 0) {
    console.error('No restaurants found. Run seed-restaurants.ts first.');
    process.exit(1);
  }

  console.log(`Seeding availability for ${restaurants.length} restaurants...\n`);

  const today = new Date();
  const availabilityRecords: {
    restaurant_id: string;
    date: string;
    time_slots: TimeSlot[];
    scraped_at: string;
  }[] = [];

  // Generate 30 days of availability for each restaurant
  for (const restaurant of restaurants) {
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const date = addDays(today, dayOffset);
      const dateStr = format(date, 'yyyy-MM-dd');

      // Skip some days randomly to simulate no availability
      if (Math.random() < 0.15) continue;

      const timeSlots = generateTimeSlots(dayOffset);

      availabilityRecords.push({
        restaurant_id: restaurant.id,
        date: dateStr,
        time_slots: timeSlots,
        scraped_at: new Date().toISOString(),
      });
    }
  }

  console.log(`Inserting ${availabilityRecords.length} availability records...`);

  // Delete existing availability for these restaurants first
  const restaurantIds = restaurants.map((r) => r.id);
  await supabase
    .from('availability_snapshots')
    .delete()
    .in('restaurant_id', restaurantIds);

  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < availabilityRecords.length; i += batchSize) {
    const batch = availabilityRecords.slice(i, i + batchSize);
    const { error } = await supabase
      .from('availability_snapshots')
      .insert(batch);

    if (error) {
      console.error('Error inserting batch:', error.message);
      process.exit(1);
    }

    inserted += batch.length;
    console.log(`  Inserted ${inserted}/${availabilityRecords.length} records`);
  }

  console.log('\nAvailability seeded for:');
  restaurants.forEach((r) => {
    console.log(`  - ${r.name}`);
  });
}

seedAvailability()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
