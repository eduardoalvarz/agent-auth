# Authentication & Credit System Documentation

> Important: The credits system is disabled in this build. This document is retained for historical reference only.

This document explains how the authentication and credit deduction systems are implemented in the Agent with Auth and Payments application.

## System Overview

### 1. Authentication System
The application uses **Supabase Auth** with JWT tokens for secure user authentication. The auth system handles user registration, login, session management, and route protection.

### 2. Credit System  
The credit system deducts **1 credit** from the user's account for every LLM request made through the chat interface. This includes sending new messages, regenerating AI responses, and editing messages.


## Authentication System Components

### Core Files and Functions

1. **`AuthProvider`** (`src/providers/Auth.tsx`)
   - Global authentication state management
   - Wraps the entire application
   - Provides user session, loading states, and auth methods
   - Integrates with SupabaseAuthProvider

2. **`SupabaseAuthProvider`** (`src/lib/auth/supabase-utils.ts`)
   - Implements AuthProvider interface
   - Handles Supabase-specific authentication logic
   - Methods: `signIn`, `signUp`, `signInWithGoogle`, `signOut`, `resetPassword`
   - Converts Supabase types to application types

3. **Auth Middleware** (`src/lib/auth/middleware.ts`)
   - Protects routes that require authentication  
   - Redirects unauthenticated users to `/signin`
   - Handles API route protection with 401 responses
   - Excludes auth routes (`/signin`, `/signup`, `/api/auth`) from protection

4. **Auth Callback** (`src/app/api/auth/callback/route.ts`)
   - Handles OAuth callback from providers (Google, etc.)
   - Exchanges authorization codes for sessions
   - Redirects users after successful authentication

5. **Database Integration**
   - Automatic user profile creation via trigger (`handle_new_user()`)
   - Row Level Security (RLS) policies for data protection
   - User table with auth.users foreign key relationship

### Authentication Flow Details

1. **User Registration/Login**:
   - User submits credentials through auth forms
   - SupabaseAuthProvider handles the request
   - Supabase returns JWT token and user data
   - AuthProvider updates global state
   - Database trigger creates user profile automatically

2. **Session Management**:
   - JWT tokens stored in HTTP-only cookies
   - Automatic session refresh handled by Supabase
   - Auth state changes propagated through context

3. **Route Protection**:
   - Middleware checks authentication on every request
   - API routes return 401 for unauthorized access
   - Protected pages redirect to signin

## Credit System Implementation

### Core Components

1. **`deductUserCredits` function** (`src/lib/stripe.ts`)
   - Handles the actual credit deduction logic
   - Updates user's credit balance in Supabase
   - Returns success status and new balance
   - Validates sufficient credits before deduction

2. **`useCreditDeduction` hook** (`src/hooks/use-credit-deduction.ts`)
   - **Central credit deduction logic**
   - Handles authentication checks before deduction
   - Provides optimistic UI updates
   - Automatic credit refunds for failed requests
   - User-friendly error messages and toast notifications
   - Integrates with CreditsProvider for real-time updates

3. **`CreditsProvider` context** (`src/providers/Credits.tsx`)
   - **Global state management for credits**
   - Provides optimistic updates for instant UI feedback
   - Handles credit fetching and error states
   - Methods: `refreshCredits`, `deductCredits`, `addCredits`, `updateCredits`
   - Automatic refresh when user authentication changes

4. **`CreditBalance` component** (`src/components/credits/credit-balance.tsx`)
   - **Real-time credit balance display** with Badge design
   - **Color-coded indicators**:
     - **Red**: 0 credits (urgent, with pulse animation)
     - **Orange**: 1-5 credits (low)
     - **Green**: 6+ credits (good) 
   - Loading states with pulse animation
   - Error handling with fallback displays
   - Number formatting (1,000 instead of 1000)

5. **Credit integration points:**
   - `src/components/thread/index.tsx` - Message submission (`handleSubmit`) and regeneration (`handleRegenerate`)
   - `src/components/thread/messages/human.tsx` - Message editing (`handleSubmitEdit`)

### Credit System Flow Details

1. **Pre-request validation**: Before any LLM request:
   - Checks if user is authenticated via `useAuthContext`
   - Validates sufficient credits in UI state
   - Performs optimistic deduction from UI immediately
   - Attempts to deduct credits from database
   - Only proceeds with LLM request if database deduction succeeds
   - Reverts optimistic update if deduction fails

2. **Real-time UI Updates**:
   - Credits deducted from UI instantly for immediate feedback
   - Database updated in background
   - UI refreshed with actual balance from server after request
   - Failed requests automatically refund credits

3. **Error handling**: If credit deduction fails:
   - Automatically reverts optimistic UI updates
   - Shows appropriate error messages (insufficient credits, authentication required)
   - Prevents the LLM request from being made
   - Suggests purchasing more credits when needed

4. **Success flow**: When credits are deducted:
   - UI updates immediately (optimistic)
   - Optional success toast with remaining balance
   - Proceeds with the LLM request
   - Refreshes with actual balance from server
   - Auto-refunds if LLM request fails (server overload, etc.)

### Credit Refund System

The `useCreditDeduction` hook returns a `refundCredits` function that:
- Automatically refunds credits if LLM requests fail
- Handles server overload errors gracefully
- Shows user-friendly refund notifications
- Updates UI state optimistically and refreshes actual balance

### User Experience Features

- **Immediate feedback**: Users see credit deduction instantly in the UI
- **Fail-fast approach**: Prevents unnecessary LLM calls when credits are insufficient  
- **Clear messaging**: Descriptive error messages explain what went wrong
- **Real-time balance visibility**: Credit balance updates across all components instantly
- **Automatic error recovery**: Failed requests automatically refund credits
- **Optimistic updates**: UI feels responsive with instant feedback

## Database Schema

The credit system relies on the `users` table with these key columns:

```sql
CREATE TABLE public.users (
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
```

### Key Features:
- **Row Level Security (RLS)** enabled for data protection
- **Automatic user profile creation** via database trigger
- **Foreign key relationship** with `auth.users` table
- **Service role policies** for Stripe webhook access

## Stripe Integration

### Credit Replenishment
- **Webhook handler** (`src/app/api/webhooks/stripe/route.ts`) processes subscription events
- **Credit limits** determined by subscription tier via `getCreditLimitByPriceId()`
- **Automatic credit allocation** when subscriptions become active
- **Credit removal** when subscriptions are canceled

### Subscription Tiers
Defined in `src/lib/stripe-config.ts`:
- **Starter**: Limited credits
- **Professional**: More credits  
- **Enterprise**: Higher credit limit
- **Test Product**: Development tier

## API Endpoints

### Credit Management
- **GET `/api/user/credits`** - Fetch current credit balance
- **Server-side functions** in `src/lib/stripe.ts`:
  - `deductUserCredits(userId, amount)` - Deduct credits
  - `addUserCredits(userId, amount)` - Add credits (refunds, purchases)

## Global State Management

### CreditsProvider Context

The `CreditsProvider` wraps the entire application and provides:

```typescript
interface CreditsContextProps {
  credits: number | null;           // Current credit balance
  loading: boolean;                 // Loading state
  error: string | null;             // Error state  
  refreshCredits: () => Promise<void>;  // Refresh from server
  updateCredits: (newCredits: number) => void;  // Set exact amount
  deductCredits: (amount: number) => void;      // Optimistic deduction
  addCredits: (amount: number) => void;         // Optimistic addition
}
```

### Integration Pattern

Components can access and update credits using the context:

```typescript
const { credits, deductCredits, addCredits, refreshCredits } = useCreditsContext();

// Optimistic deduction
deductCredits(1);
// Later: refresh with actual balance  
refreshCredits();
```

## Error Scenarios

1. **Insufficient Credits**: User has 0 credits remaining
2. **Authentication Required**: User is not signed in
3. **Database Errors**: Network issues or database connectivity problems
4. **Server Overload**: LangGraph server temporarily unavailable (credits auto-refunded)
5. **LLM Request Failures**: Any error during AI processing (credits auto-refunded)

## Usage Examples

### Basic credit deduction:
```typescript
const { deductCredits } = useCreditDeduction();
const result = await deductCredits({ reason: "send message" });
if (!result.success) {
  return; // Error already handled by hook
}
// Proceed with LLM request
```

### Custom credit amount:
```typescript
const result = await deductCredits({
  reason: "premium feature",
  creditsToDeduct: 5,
  showSuccessToast: false,
});
```

### Using global credit state:
```typescript
const { credits, loading, error } = useCreditsContext();

if (loading) return <Spinner />;
if (error) return <ErrorMessage />;
return <div>Credits: {credits}</div>;
```

### Credit refund on failure:
```typescript
try {
  const result = await deductCredits({ reason: "send message" });
  if (!result.success) return;
  
  // Make LLM request
  await makeLLMRequest();
} catch (error) {
  // Auto-refund via result.refundCredits()
  if (result.refundCredits) {
    await result.refundCredits();
  }
}
```

## Security Features

### Authentication Security
- **JWT token validation** on all protected routes
- **HTTP-only cookies** for token storage
- **Row Level Security (RLS)** for database access
- **Service role separation** for webhook operations
- **CORS protection** with proper headers

### Credit Security  
- **Server-side validation** of all credit operations
- **Database-level constraints** prevent negative credits
- **User isolation** via RLS policies
- **Audit trail** with timestamps and user tracking

## Future Enhancements

1. **Variable credit costs**: Different LLM models could cost different amounts
2. **Credit packages**: Bulk credit purchases with discounts  
3. **Usage analytics**: Track credit usage patterns
4. **Credit expiration**: Time-based credit expiration
5. **Subscription integration**: Automatic credit replenishment for subscribers
6. **Credit notifications**: Push notifications for low credit warnings
7. **Credit history**: Transaction log for credit usage tracking
8. **Admin dashboard**: Credit management interface for administrators
9. **Rate limiting**: Prevent abuse with request rate limits
10. **Multi-factor authentication**: Enhanced security for high-value accounts
