-- =====================================================
-- Supabase Database Schema Setup
-- =====================================================
-- This script sets up the complete database schema for the
-- Agentic SaaS Boilerplate including users table, RLS policies,
-- and automatic user profile creation.
--
-- Instructions:
-- 1. Copy this entire script
-- 2. Go to your Supabase dashboard > SQL Editor
-- 3. Paste and run this script
-- 4. Verify the setup by checking the Tables section
-- =====================================================

-- =====================================================
-- 1. CREATE USERS TABLE
-- =====================================================

-- Create users table with all required columns for the application
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    subscription_status TEXT DEFAULT 'inactive',
    price_id TEXT,
    credits_available INTEGER DEFAULT 0,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON public.users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id ON public.users(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON public.users(subscription_status);

-- =====================================================
-- 3. CREATE UPDATED_AT TRIGGER
-- =====================================================

-- Function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to call the function before any update
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CREATE RLS POLICIES
-- =====================================================

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Policy: Users can insert their own data
CREATE POLICY "Users can insert own data" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy: Service role can do everything (for webhooks and server operations)
-- This is crucial for Stripe webhooks to work properly
CREATE POLICY "Service role can manage all users" ON public.users
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );

-- =====================================================
-- 6. AUTOMATIC USER PROFILE CREATION
-- =====================================================

-- Function to automatically create user profile when someone signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, credits_available, subscription_status)
    VALUES (NEW.id, NEW.email, 0, 'inactive');
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- User already exists, just return NEW
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log error but don't fail the auth process
        RAISE WARNING 'Error creating user profile: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 7. VERIFICATION QUERIES
-- =====================================================

-- Check if the table was created successfully
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        RAISE NOTICE 'SUCCESS: users table created successfully';
    ELSE
        RAISE NOTICE 'ERROR: users table was not created';
    END IF;
END $$;

-- Check if RLS is enabled
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' 
        AND c.relname = 'users' 
        AND c.relrowsecurity = true
    ) THEN
        RAISE NOTICE 'SUCCESS: RLS is enabled on users table';
    ELSE
        RAISE NOTICE 'ERROR: RLS is not enabled on users table';
    END IF;
END $$;

-- Check if policies exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public') THEN
        RAISE NOTICE 'SUCCESS: RLS policies created successfully';
        RAISE NOTICE 'Number of policies: %', (SELECT count(*) FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public');
    ELSE
        RAISE NOTICE 'ERROR: No RLS policies found for users table';
    END IF;
END $$;

-- =====================================================
-- 8. SAMPLE TEST QUERY
-- =====================================================

-- You can run this query to test if everything is working
-- (This will return empty results initially, which is expected)
SELECT 
    'Schema setup complete!' as status,
    count(*) as user_count
FROM public.users;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- 
-- Next steps:
-- 1. Set up your environment variables: run 'pnpm run setup:env'
-- 2. Configure authentication providers in Supabase dashboard
-- 3. Test user signup and verify automatic profile creation
-- 4. Set up Stripe webhooks to update user credits
--
-- =====================================================
-- POST-SETUP VERIFICATION CHECKLIST
-- =====================================================
--
-- Run these verification steps in your Supabase dashboard:
--
-- 1. ✅ Verify table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users' 
ORDER BY ordinal_position;

-- 2. ✅ Verify RLS policies  
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- 3. ✅ Verify indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users' AND schemaname = 'public';

-- 4. ✅ Verify triggers
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'users';
