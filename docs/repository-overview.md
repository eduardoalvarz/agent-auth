
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

### 🪙 Credits System (disabled)

- Credits features are disabled in this build

### 💳 Payments (Stripe) (disabled)

- Stripe payments are disabled in this build

### 🔌 API Layer

- **Graph API**: Proxies requests to LangGraph deployments
- **User/Credits API**: Manages user data and credit operations
- **Payment APIs**: Handles Stripe integration
- **Webhook Handlers**: Processes external service callbacks
