/**
 * TypeScript types for Foody SF database schema
 * These types match the Supabase database tables
 */

// Platform types for restaurant reservations
export type Platform = 'resy' | 'tock' | 'opentable';

// Notification types
export type NotificationType = 'new_slot' | 'cancellation';
export type NotificationChannel = 'sms' | 'email';

// Time slot format for availability snapshots
export interface TimeSlot {
  time: string; // e.g., "7:00 PM"
  party_sizes: number[]; // e.g., [2, 4]
}

// ============================================
// TABLE TYPES
// ============================================

export interface Restaurant {
  id: string;
  name: string;
  platform: Platform | null;
  platform_id: string | null;
  location: string | null;
  image_url: string | null;
  created_at: string;
}

export interface UserProfile {
  id: string;
  phone: string | null;
  email_notifications: boolean;
  sms_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRestaurant {
  id: string;
  user_id: string;
  restaurant_id: string;
  party_size: number;
  notify_new_releases: boolean;
  notify_date_start: string | null; // ISO date (YYYY-MM-DD)
  notify_date_end: string | null; // ISO date (YYYY-MM-DD)
  preferred_time_start: string | null; // HH:MM format
  preferred_time_end: string | null; // HH:MM format
  created_at: string;
}

export interface AvailabilitySnapshot {
  id: string;
  restaurant_id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  time_slots: TimeSlot[] | null;
  scraped_at: string;
}

export interface NotificationSent {
  id: string;
  user_id: string;
  restaurant_id: string;
  type: NotificationType;
  channel: NotificationChannel;
  availability_date: string | null; // For deduplication
  availability_time: string | null; // For deduplication
  sent_at: string;
}

// ============================================
// INSERT TYPES (for creating new records)
// ============================================

export interface RestaurantInsert {
  id?: string;
  name: string;
  platform?: Platform | null;
  platform_id?: string | null;
  location?: string | null;
  image_url?: string | null;
  created_at?: string;
}

export interface UserProfileInsert {
  id: string; // Required - references auth.users
  phone?: string | null;
  email_notifications?: boolean;
  sms_notifications?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserRestaurantInsert {
  id?: string;
  user_id: string;
  restaurant_id: string;
  party_size?: number;
  notify_new_releases?: boolean;
  notify_date_start?: string | null;
  notify_date_end?: string | null;
  preferred_time_start?: string | null;
  preferred_time_end?: string | null;
  created_at?: string;
}

export interface AvailabilitySnapshotInsert {
  id?: string;
  restaurant_id: string;
  date: string;
  time_slots?: TimeSlot[] | null;
  scraped_at?: string;
}

export interface NotificationSentInsert {
  id?: string;
  user_id: string;
  restaurant_id: string;
  type: NotificationType;
  channel: NotificationChannel;
  availability_date?: string | null;
  availability_time?: string | null;
  sent_at?: string;
}

// ============================================
// UPDATE TYPES (for updating existing records)
// ============================================

export interface RestaurantUpdate {
  name?: string;
  platform?: Platform | null;
  platform_id?: string | null;
  location?: string | null;
  image_url?: string | null;
}

export interface UserProfileUpdate {
  phone?: string | null;
  email_notifications?: boolean;
  sms_notifications?: boolean;
}

export interface UserRestaurantUpdate {
  party_size?: number;
  notify_new_releases?: boolean;
  notify_date_start?: string | null;
  notify_date_end?: string | null;
  preferred_time_start?: string | null;
  preferred_time_end?: string | null;
}

export interface AvailabilitySnapshotUpdate {
  date?: string;
  time_slots?: TimeSlot[] | null;
}

// ============================================
// SUPABASE DATABASE TYPE DEFINITION
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: Restaurant;
        Insert: RestaurantInsert;
        Update: RestaurantUpdate;
        Relationships: [];
      };
      user_profiles: {
        Row: UserProfile;
        Insert: UserProfileInsert;
        Update: UserProfileUpdate;
        Relationships: [];
      };
      user_restaurants: {
        Row: UserRestaurant;
        Insert: UserRestaurantInsert;
        Update: UserRestaurantUpdate;
        Relationships: [];
      };
      availability_snapshots: {
        Row: AvailabilitySnapshot;
        Insert: AvailabilitySnapshotInsert;
        Update: AvailabilitySnapshotUpdate;
        Relationships: [];
      };
      notifications_sent: {
        Row: NotificationSent;
        Insert: NotificationSentInsert;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      platform: Platform;
      notification_type: NotificationType;
      notification_channel: NotificationChannel;
    };
    CompositeTypes: Record<string, never>;
  };
}

// ============================================
// JOINED TYPES (for queries with relations)
// ============================================

export interface UserRestaurantWithRestaurant extends UserRestaurant {
  restaurant: Restaurant;
}

export interface AvailabilitySnapshotWithRestaurant extends AvailabilitySnapshot {
  restaurant: Restaurant;
}

export interface NotificationSentWithDetails extends NotificationSent {
  restaurant: Restaurant;
  user_profile: UserProfile;
}
