# Fullstack Chat Repository Overview

```mermaid
graph TB
    %% User Interface Layer
    subgraph "Frontend (Next.js 14)"
        UI[Chat Interface]
        AUTH_UI[Auth Pages<br/>signin/signup]
        PRICING[Pricing Page]
        NAVBAR[Navigation<br/>w/ Credit Balance]
    end

    %% Authentication System
    subgraph "Authentication"
        SUPABASE[Supabase Auth]
        AUTH_MW[Auth Middleware]
        AUTH_CB[Auth Callback]
    end

    %% Core Chat Features
    subgraph "Chat System"
        THREAD[Thread Management]
        AGENT_INBOX[Agent Inbox<br/>w/ Interrupts]
        MESSAGES[Message Components<br/>AI/Human/Tool]
        ARTIFACTS[Artifacts & Previews]
    end

    %% LangGraph Integration
    subgraph "LangGraph JS"
        GRAPHS[Graph Deployments]
        TOOLS[Tool Calls]
        INTERRUPTS[Interrupt Handling]
        STREAM[Streaming Responses]
    end

    %% Credits System
    subgraph "Credits Management"
        CREDIT_BAL[Credit Balance]
        CREDIT_HOOK[Credit Deduction Hook]
        CREDIT_API[Credits API]
    end

    %% Payment System
    subgraph "Payments (Stripe)"
        CHECKOUT[Checkout Session]
        WEBHOOKS[Stripe Webhooks]
        SUCCESS[Success Page]
    end

    %% API Layer
    subgraph "API Routes"
        GRAPH_API[Graph API<br/>[..._path]]
        USER_API[User/Credits API]
        PAYMENT_API[Payment APIs]
        WEBHOOK_API[Webhook Handlers]
    end

    %% Data Flow Connections
    UI --> THREAD
    AUTH_UI --> SUPABASE
    PRICING --> CHECKOUT

    SUPABASE --> AUTH_MW
    AUTH_MW --> UI
    AUTH_CB --> SUPABASE

    THREAD --> AGENT_INBOX
    AGENT_INBOX --> MESSAGES
    AGENT_INBOX --> ARTIFACTS

    THREAD --> GRAPH_API
    GRAPH_API --> GRAPHS
    GRAPHS --> TOOLS
    GRAPHS --> INTERRUPTS
    GRAPHS --> STREAM

    NAVBAR --> CREDIT_BAL
    CREDIT_BAL --> CREDIT_API
    CREDIT_HOOK --> USER_API

    CHECKOUT --> PAYMENT_API
    PAYMENT_API --> WEBHOOKS
    WEBHOOKS --> WEBHOOK_API
    WEBHOOKS --> CREDIT_API
    SUCCESS --> PRICING

    %% Styling
    classDef frontend fill:#e1f5fe
    classDef auth fill:#f3e5f5
    classDef chat fill:#e8f5e8
    classDef langgraph fill:#fff3e0
    classDef credits fill:#fce4ec
    classDef payments fill:#e0f2f1
    classDef api fill:#f5f5f5

    class UI,AUTH_UI,PRICING,NAVBAR frontend
    class SUPABASE,AUTH_MW,AUTH_CB auth
    class THREAD,AGENT_INBOX,MESSAGES,ARTIFACTS chat
    class GRAPHS,TOOLS,INTERRUPTS,STREAM langgraph
    class CREDIT_BAL,CREDIT_HOOK,CREDIT_API credits
    class CHECKOUT,WEBHOOKS,SUCCESS payments
    class GRAPH_API,USER_API,PAYMENT_API,WEBHOOK_API api
```

---

## Detailed Auth & Credits Flow

```mermaid
graph TB
    %% User Entry Points
    subgraph "User Entry"
        VISITOR[Anonymous Visitor]
        RETURNING[Returning User]
    end

    %% Authentication Flow
    subgraph "Authentication System"
        SIGNIN_PAGE[Sign In Page<br/>/signin]
        SIGNUP_PAGE[Sign Up Page<br/>/signup]
        SIGNIN_FORM[SignIn Component<br/>features/signin]
        SIGNUP_FORM[SignUp Component<br/>features/signup]

        subgraph "Supabase Auth"
            SUPABASE_CLIENT[Supabase Client<br/>lib/auth/supabase-client]
            SUPABASE_SERVER[Supabase Server<br/>lib/auth/supabase-server]
            AUTH_UTILS[Auth Utils<br/>lib/auth/supabase-utils]
        end

        AUTH_CALLBACK[Auth Callback<br/>api/auth/callback]
        AUTH_MIDDLEWARE[Auth Middleware<br/>lib/auth/middleware]
    end

    %% Session Management
    subgraph "Session & State"
        AUTH_PROVIDER[Auth Provider<br/>providers/Auth.tsx]
        USER_STATUS[User Auth Status<br/>features/user-auth-status]
        SESSION_STATE[Session State]
    end

    %% Credits System Detail
    subgraph "Credits Management"
        CREDIT_PROVIDER[Credits Provider<br/>providers/Credits.tsx]
        CREDIT_BALANCE_COMP[Credit Balance Component<br/>components/credits/credit-balance]
        CREDIT_HOOK[Credit Deduction Hook<br/>hooks/use-credit-deduction]
        CREDIT_API_ROUTE[Credits API Route<br/>api/user/credits]

        subgraph "Credit Operations"
            CHECK_BALANCE[Check Balance]
            DEDUCT_CREDITS[Deduct Credits]
            UPDATE_BALANCE[Update Balance]
            VALIDATE_CREDITS[Validate Sufficient Credits]
        end
    end

    %% Payment Integration
    subgraph "Payment Flow"
        PRICING_PAGE[Pricing Page<br/>/pricing]
        CHECKOUT_API[Checkout Session API<br/>api/create-checkout-session]
        STRIPE_CHECKOUT[Stripe Checkout]
        STRIPE_WEBHOOK[Stripe Webhook<br/>api/webhooks/stripe]
        SUCCESS_PAGE[Success Page<br/>/success]

        subgraph "Stripe Operations"
            CREATE_SESSION[Create Checkout Session]
            PROCESS_PAYMENT[Process Payment]
            WEBHOOK_VERIFY[Verify Webhook]
            ADD_CREDITS[Add Credits to Account]
        end
    end

    %% Database Layer
    subgraph "Data Layer"
        SUPABASE_DB[(Supabase Database)]
        USER_TABLE[Users Table]
        CREDITS_TABLE[Credits Table]
        TRANSACTIONS_TABLE[Transactions Table]
    end

    %% Flow Connections - Authentication
    VISITOR --> SIGNIN_PAGE
    VISITOR --> SIGNUP_PAGE
    RETURNING --> AUTH_MIDDLEWARE

    SIGNIN_PAGE --> SIGNIN_FORM
    SIGNUP_PAGE --> SIGNUP_FORM

    SIGNIN_FORM --> SUPABASE_CLIENT
    SIGNUP_FORM --> SUPABASE_CLIENT

    SUPABASE_CLIENT --> AUTH_CALLBACK
    AUTH_CALLBACK --> SUPABASE_SERVER
    SUPABASE_SERVER --> AUTH_UTILS

    AUTH_UTILS --> SESSION_STATE
    SESSION_STATE --> AUTH_PROVIDER
    AUTH_PROVIDER --> USER_STATUS

    AUTH_MIDDLEWARE --> AUTH_PROVIDER

    %% Flow Connections - Credits
    AUTH_PROVIDER --> CREDIT_PROVIDER
    CREDIT_PROVIDER --> CREDIT_BALANCE_COMP
    CREDIT_BALANCE_COMP --> CHECK_BALANCE
    CHECK_BALANCE --> CREDIT_API_ROUTE

    CREDIT_HOOK --> VALIDATE_CREDITS
    VALIDATE_CREDITS --> DEDUCT_CREDITS
    DEDUCT_CREDITS --> CREDIT_API_ROUTE
    CREDIT_API_ROUTE --> UPDATE_BALANCE
    UPDATE_BALANCE --> CREDIT_PROVIDER

    %% Flow Connections - Payments
    CREDIT_BALANCE_COMP --> PRICING_PAGE
    PRICING_PAGE --> CHECKOUT_API
    CHECKOUT_API --> CREATE_SESSION
    CREATE_SESSION --> STRIPE_CHECKOUT
    STRIPE_CHECKOUT --> PROCESS_PAYMENT
    PROCESS_PAYMENT --> STRIPE_WEBHOOK
    STRIPE_WEBHOOK --> WEBHOOK_VERIFY
    WEBHOOK_VERIFY --> ADD_CREDITS
    ADD_CREDITS --> CREDIT_API_ROUTE
    STRIPE_CHECKOUT --> SUCCESS_PAGE

    %% Database Connections
    SUPABASE_SERVER --> SUPABASE_DB
    AUTH_UTILS --> USER_TABLE
    CREDIT_API_ROUTE --> CREDITS_TABLE
    STRIPE_WEBHOOK --> TRANSACTIONS_TABLE

    USER_TABLE --> SUPABASE_DB
    CREDITS_TABLE --> SUPABASE_DB
    TRANSACTIONS_TABLE --> SUPABASE_DB

    %% Styling
    classDef entry fill:#e3f2fd
    classDef auth fill:#f3e5f5
    classDef session fill:#e8f5e8
    classDef credits fill:#fce4ec
    classDef payments fill:#e0f2f1
    classDef database fill:#fff3e0
    classDef operations fill:#f5f5f5

    class VISITOR,RETURNING entry
    class SIGNIN_PAGE,SIGNUP_PAGE,SIGNIN_FORM,SIGNUP_FORM,SUPABASE_CLIENT,SUPABASE_SERVER,AUTH_UTILS,AUTH_CALLBACK,AUTH_MIDDLEWARE auth
    class AUTH_PROVIDER,USER_STATUS,SESSION_STATE session
    class CREDIT_PROVIDER,CREDIT_BALANCE_COMP,CREDIT_HOOK,CREDIT_API_ROUTE credits
    class PRICING_PAGE,CHECKOUT_API,STRIPE_CHECKOUT,STRIPE_WEBHOOK,SUCCESS_PAGE payments
    class SUPABASE_DB,USER_TABLE,CREDITS_TABLE,TRANSACTIONS_TABLE database
    class CHECK_BALANCE,DEDUCT_CREDITS,UPDATE_BALANCE,VALIDATE_CREDITS,CREATE_SESSION,PROCESS_PAYMENT,WEBHOOK_VERIFY,ADD_CREDITS operations
```

## Key Components Overview

### 🔐 Authentication

- **Supabase Auth**: Handles user authentication and session management
- **Auth Middleware**: Protects routes and manages user sessions
- **Auth Pages**: Sign-in and sign-up user interfaces

### 💬 Chat System

- **Thread Management**: Organizes conversation flows
- **Agent Inbox**: Handles AI agent interactions with interrupt capabilities
- **Message Components**: Renders different message types (AI, Human, Tool calls)
- **Artifacts**: Displays rich content and previews

### 🤖 LangGraph Integration

- **Graph Deployments**: Connects to LangGraph JS SDK for AI workflows
- **Tool Calls**: Executes and displays tool interactions
- **Interrupt Handling**: Manages conversation interrupts and user input
- **Streaming**: Real-time response streaming

### 🪙 Credits System

- **Credit Balance**: Displays user's available credits
- **Credit Deduction**: Automatically deducts credits for AI interactions
- **Credits API**: Manages credit transactions and balance updates

### 💳 Payments (Stripe)

- **Checkout Sessions**: Handles payment processing
- **Webhooks**: Processes payment confirmations
- **Success Flow**: Confirms successful purchases and credit additions

### 🔌 API Layer

- **Graph API**: Proxies requests to LangGraph deployments
- **User/Credits API**: Manages user data and credit operations
- **Payment APIs**: Handles Stripe integration
- **Webhook Handlers**: Processes external service callbacks
