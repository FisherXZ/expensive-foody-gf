-- Foody SF Restaurant Reservation Tracker
-- Initial Database Schema

-- ============================================
-- RESTAURANTS TABLE
-- ============================================
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    platform TEXT CHECK (platform IN ('resy', 'tock', 'opentable')),
    platform_id TEXT,
    location TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for restaurants
CREATE INDEX idx_restaurants_platform ON restaurants(platform);
CREATE INDEX idx_restaurants_name ON restaurants(name);

-- ============================================
-- USER PROFILES TABLE
-- ============================================
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    phone TEXT,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for user_profiles
CREATE INDEX idx_user_profiles_phone ON user_profiles(phone);

-- ============================================
-- USER RESTAURANTS TABLE (Junction table)
-- ============================================
CREATE TABLE user_restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    party_size INT DEFAULT 2,
    notify_new_releases BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_user_restaurant UNIQUE (user_id, restaurant_id)
);

-- Indexes for user_restaurants
CREATE INDEX idx_user_restaurants_user_id ON user_restaurants(user_id);
CREATE INDEX idx_user_restaurants_restaurant_id ON user_restaurants(restaurant_id);

-- ============================================
-- AVAILABILITY SNAPSHOTS TABLE
-- ============================================
CREATE TABLE availability_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_slots JSONB, -- format: [{time: "7:00 PM", party_sizes: [2,4]}]
    scraped_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for availability_snapshots
CREATE INDEX idx_availability_snapshots_restaurant_id ON availability_snapshots(restaurant_id);
CREATE INDEX idx_availability_snapshots_date ON availability_snapshots(date);
CREATE INDEX idx_availability_snapshots_scraped_at ON availability_snapshots(scraped_at);
CREATE INDEX idx_availability_snapshots_restaurant_date ON availability_snapshots(restaurant_id, date);

-- ============================================
-- NOTIFICATIONS SENT TABLE
-- ============================================
CREATE TABLE notifications_sent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('new_slot', 'cancellation')),
    channel TEXT CHECK (channel IN ('sms', 'email')),
    sent_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for notifications_sent
CREATE INDEX idx_notifications_sent_user_id ON notifications_sent(user_id);
CREATE INDEX idx_notifications_sent_restaurant_id ON notifications_sent(restaurant_id);
CREATE INDEX idx_notifications_sent_sent_at ON notifications_sent(sent_at);
CREATE INDEX idx_notifications_sent_user_restaurant ON notifications_sent(user_id, restaurant_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_sent ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RESTAURANTS POLICIES
-- Restaurants are publicly readable, but only admins can modify
-- ============================================
CREATE POLICY "Restaurants are viewable by everyone"
    ON restaurants FOR SELECT
    USING (true);

CREATE POLICY "Restaurants are insertable by authenticated users"
    ON restaurants FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ============================================
-- USER PROFILES POLICIES
-- Users can only access their own profile
-- ============================================
CREATE POLICY "Users can view their own profile"
    ON user_profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON user_profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON user_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
    ON user_profiles FOR DELETE
    TO authenticated
    USING (auth.uid() = id);

-- ============================================
-- USER RESTAURANTS POLICIES
-- Users can only access their own restaurant subscriptions
-- ============================================
CREATE POLICY "Users can view their own restaurant subscriptions"
    ON user_restaurants FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own restaurant subscriptions"
    ON user_restaurants FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own restaurant subscriptions"
    ON user_restaurants FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own restaurant subscriptions"
    ON user_restaurants FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================
-- AVAILABILITY SNAPSHOTS POLICIES
-- Availability data is publicly readable
-- ============================================
CREATE POLICY "Availability snapshots are viewable by everyone"
    ON availability_snapshots FOR SELECT
    USING (true);

CREATE POLICY "Availability snapshots are insertable by authenticated users"
    ON availability_snapshots FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ============================================
-- NOTIFICATIONS SENT POLICIES
-- Users can only view their own notifications
-- ============================================
CREATE POLICY "Users can view their own notifications"
    ON notifications_sent FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications"
    ON notifications_sent FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_profiles updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on auth.users insert
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
