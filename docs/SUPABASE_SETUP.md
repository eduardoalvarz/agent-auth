# Supabase Setup Guide

This guide will help you set up the exact same Supabase configuration as this repository, including database tables, Row Level Security (RLS) policies, and authentication settings.

## 📋 Prerequisites

- A Supabase account (free tier works)
- Basic understanding of SQL and Supabase dashboard

## 🚀 Quick Setup

### 1. Create a New Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization
4. Enter project name and database password
5. Select a region close to your users
6. Click "Create new project"

### 2. Database Schema Setup

Navigate to the SQL Editor in your Supabase dashboard and run the following SQL commands:

#### Create the Users Table

```sql
-- Create users table with all required columns
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

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON public.users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id ON public.users(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
```

#### Set Up Row Level Security (RLS)

```sql
-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "Service role can manage all users" ON public.users
    FOR ALL USING (
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    );
```

#### Create User Profile Function (Optional but Recommended)

```sql
-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, credits_available, subscription_status)
    VALUES (NEW.id, NEW.email, 0, 'inactive');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. Authentication Configuration

#### Enable Email Authentication

1. Go to **Authentication > Settings** in your Supabase dashboard
2. Under **Auth Providers**, ensure **Email** is enabled
3. Configure email templates if desired

#### Enable Google OAuth (Optional)

1. Go to **Authentication > Settings > Auth Providers**
2. Enable **Google**
3. Add your Google OAuth credentials:
   - Client ID
   - Client Secret
4. Add authorized redirect URLs:
   - `https://your-project-ref.supabase.co/auth/v1/callback`
   - `http://localhost:3000/api/auth/callback` (for development)

### 4. Environment Variables Setup

This repository uses separate environment files for each app, which is the recommended approach for monorepos.

#### Quick Setup with Script

Run the provided script to automatically create environment files from the existing templates:

```bash
# Make the script executable and run it
chmod +x setup-supabase.sh
./setup-supabase.sh
```

#### Manual Setup

Alternatively, you can manually copy the environment template files:

```bash
# Web app environment
cp apps/web/.env.example apps/web/.env.local

# Agents app environment  
cp apps/agents/.env.example apps/agents/.env
```

#### Required Environment Variables

You'll need to fill in the following variables in each app:

**For Web App (`apps/web/.env.local`):**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-only)
- `STRIPE_SECRET_KEY` - Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `NEXT_PUBLIC_API_URL` - LangGraph API URL (usually `http://localhost:2024`)
- `NEXT_PUBLIC_ASSISTANT_ID` - Your LangGraph assistant ID

**For Agents App (`apps/agents/.env`):**
- `SUPABASE_URL` - Your Supabase project URL (same as `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_KEY` - Supabase service role key (same as `SUPABASE_SERVICE_ROLE_KEY`)
- `LANGSMITH_API_KEY` - LangSmith API key for tracing

### 5. Get Your Supabase Credentials

1. **Project URL**: Go to **Settings > General** in your Supabase dashboard
2. **Anon Key**: Go to **Settings > API** and copy the `anon` `public` key
3. **Service Role Key**: Go to **Settings > API** and copy the `service_role` `secret` key

⚠️ **Important**: Keep your service role key secret and never expose it in client-side code!

## 🔧 Database Schema Details

### Users Table Structure

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, references `auth.users(id)` |
| `email` | TEXT | User's email address |
| `stripe_customer_id` | TEXT | Stripe customer ID (unique) |
| `stripe_subscription_id` | TEXT | Stripe subscription ID (unique) |
| `subscription_status` | TEXT | Subscription status (`active`, `inactive`, `canceled`, etc.) |
| `price_id` | TEXT | Stripe price ID for the current subscription |
| `credits_available` | INTEGER | Number of credits available to the user |
| `current_period_end` | TIMESTAMPTZ | When the current subscription period ends |
| `created_at` | TIMESTAMPTZ | When the record was created |
| `updated_at` | TIMESTAMPTZ | When the record was last updated |

### Key Relationships

- `users.id` → `auth.users.id` (Foreign Key)
- Each user has one Stripe customer ID
- Each user can have one active subscription
- Credits are managed per user

## 🔐 Security Policies

The RLS policies ensure:

1. **Users can only access their own data**
2. **Server-side operations (webhooks) can access all data using service role**
3. **Automatic user profile creation on signup**

## 🧪 Testing Your Setup

### 1. Test Database Connection

Run this in the SQL Editor to verify your setup:

```sql
-- Test query to check if everything is working
SELECT 
    id,
    email,
    credits_available,
    subscription_status,
    created_at
FROM public.users
LIMIT 5;
```

### 2. Test User Creation

1. Sign up a test user in your app
2. Check if the user appears in the `users` table
3. Verify the user has `credits_available = 0` and `subscription_status = 'inactive'`

### 3. Test Stripe Integration

1. Set up Stripe webhooks pointing to your app
2. Create a test subscription
3. Verify the webhook updates the user's credits and subscription status

## 🚨 Common Issues & Solutions

### Issue: "relation 'public.users' does not exist"
**Solution**: Make sure you've run the table creation SQL in the SQL Editor.

### Issue: RLS policies blocking access
**Solution**: Verify your policies are correctly set up and you're using the right authentication context.

### Issue: Webhook not updating user data
**Solution**: 
- Check your `SUPABASE_SERVICE_ROLE_KEY` is correct
- Verify the webhook endpoint is receiving events
- Check Supabase logs for any errors

### Issue: User not created automatically on signup
**Solution**: Verify the trigger function is created and enabled.

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)

## 🔄 Migration from Existing Setup

If you're migrating from an existing setup:

1. **Export your current data** using Supabase dashboard or pg_dump
2. **Create the new schema** using the SQL above
3. **Import your data** ensuring it matches the new schema
4. **Update your environment variables**
5. **Test all functionality** before going live

---

**Need Help?** If you encounter any issues, check the Supabase logs in your dashboard and ensure all environment variables are correctly set. 