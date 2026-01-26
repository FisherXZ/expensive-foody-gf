-- Foody SF Restaurant Reservation Tracker
-- Schema Enhancements (Migration 002)
-- See: plans/002-data-model-enhancements.md

-- ============================================
-- ADD DATE/TIME PREFERENCES TO USER_RESTAURANTS
-- ============================================

-- Date range for notifications (when user wants to be notified)
ALTER TABLE user_restaurants
ADD COLUMN notify_date_start DATE,
ADD COLUMN notify_date_end DATE;

-- Preferred dining time window
ALTER TABLE user_restaurants
ADD COLUMN preferred_time_start TIME,
ADD COLUMN preferred_time_end TIME;

-- ============================================
-- ADD NOTIFICATION DEDUPLICATION
-- ============================================

-- Add columns to track which specific availability was notified
ALTER TABLE notifications_sent
ADD COLUMN availability_date DATE,
ADD COLUMN availability_time TEXT;

-- Create unique index for deduplication
-- Prevents sending duplicate notifications for the same slot
CREATE UNIQUE INDEX idx_notifications_dedup
ON notifications_sent(user_id, restaurant_id, availability_date, availability_time)
WHERE availability_date IS NOT NULL AND availability_time IS NOT NULL;

-- ============================================
-- TIGHTEN AVAILABILITY_SNAPSHOTS INSERT POLICY
-- ============================================

-- Remove overly permissive policy that allows any authenticated user to insert
-- The scraper will use service_role key which bypasses RLS
DROP POLICY IF EXISTS "Availability snapshots are insertable by authenticated users"
ON availability_snapshots;

-- ============================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN user_restaurants.notify_date_start IS 'Start date for notification window (inclusive)';
COMMENT ON COLUMN user_restaurants.notify_date_end IS 'End date for notification window (inclusive)';
COMMENT ON COLUMN user_restaurants.preferred_time_start IS 'Earliest preferred dining time (e.g., 18:00)';
COMMENT ON COLUMN user_restaurants.preferred_time_end IS 'Latest preferred dining time (e.g., 21:00)';
COMMENT ON COLUMN notifications_sent.availability_date IS 'Date of the availability slot that triggered this notification';
COMMENT ON COLUMN notifications_sent.availability_time IS 'Time of the availability slot that triggered this notification';
