# 🚀 Quick Setup Summary

This document provides a high-level overview of setting up Supabase for this repository. For detailed instructions, see `SUPABASE_SETUP.md`.

## 📋 What You'll Set Up

1. **Supabase Database** - Users table with auth integration
2. **Row Level Security** - Secure data access policies
3. **Environment Variables** - Configuration for both web and agents apps
4. **Stripe Integration** - Payment processing and webhook handling

## ⚡ Quick Start (5 minutes)

### 1. Database Setup
```bash
# 1. Create a new Supabase project
# 2. Copy the contents of supabase-schema.sql
# 3. Paste and run in your Supabase SQL Editor
```

### 2. Environment Setup
```bash
# Run the setup script
chmod +x setup-supabase.sh
./setup-supabase.sh

# Then edit the created files with your credentials:
# - apps/web/.env.local
# - apps/agents/.env
```

### 3. Get Your Credentials

**Supabase** (Settings > API):
- Project URL
- Anon key (public)
- Service role key (secret)

**Stripe** (Developers > API keys):
- Secret key
- Publishable key
- Webhook secret

**LangSmith** (Settings):
- API key

## 🗃️ Database Schema

The setup creates a `users` table that connects to Supabase Auth with these key fields:

```sql
users (
  id UUID → auth.users(id)
  email TEXT
  stripe_customer_id TEXT
  subscription_status TEXT
  credits_available INTEGER
  -- ... more fields
)
```

## 🔐 Security Features

- **Row Level Security (RLS)** - Users can only access their own data
- **Service Role Access** - Webhooks can update all user data
- **Automatic Profile Creation** - New auth users get a profile automatically

## 🎯 Why Separate .env Files?

This repo uses separate environment files for each app:
- `apps/web/.env.local` - Next.js app with client & server variables
- `apps/agents/.env` - LangGraph agents with server-only variables

**Benefits:**
- ✅ Better security (apps only get variables they need)
- ✅ Independent deployment
- ✅ Clear separation of concerns
- ✅ Follows principle of least privilege

## 🧪 Testing Your Setup

1. **Database**: Run test query in Supabase SQL Editor
2. **Auth**: Sign up a test user and check if profile is created
3. **Stripe**: Create test subscription and verify webhook updates credits

## 📚 Full Documentation

- `SUPABASE_SETUP.md` - Complete step-by-step guide
- `supabase-schema.sql` - Ready-to-run database setup
- `setup-supabase.sh` - Automated environment file creation

## 🆘 Need Help?

Check the troubleshooting section in `SUPABASE_SETUP.md` or:
- Supabase logs in your dashboard
- Environment variable configuration
- Webhook endpoint setup 