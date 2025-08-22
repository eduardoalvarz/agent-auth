# Agent with Auth and Payments Repo

A monorepo containing a Agent with Auth and Payments application with LangGraph agents and Next.js UI.

> Important: Payments and the credits system are disabled in this build. All Stripe-related features have been removed or stubbed.

## 🏗️ Architecture

This monorepo contains two main applications:

- **`apps/web`** - Next.js chat UI application with LangGraph integration
- **`apps/agents`** - LangGraph.js ReAct agents backend

## 🚀 Quick Start
### Terminal Tab 1:
```bash
# Clone the repo
git clone https://github.com/langchain-ai/agentic-saas-template.git```

#  **Environment Files**: Copy the `.env.example` files to `.env` and fill in credentials
cp apps/web/.env.example apps/web/.env
cp apps/agents/.env.example apps/agents/.env

# Install dependencies for all apps
pnpm install

# Start development servers for both apps
pnpm dev
```
### 🗄️ Database Setup

1. **Database Schema**: Copy and paste `supabase-schema.sql` in your Supabase SQL Editor

### What gets set up:
- ✅ Users table
- ✅ Row Level Security (RLS) policies  
- ✅ Automatic user profile creation
- ✅ Performance indexes and triggers

You're ready to use the app!

### Use the App

```markdown
1. Open localhost:3000
2. Sign up -> confirm email
3. login
4. Start chatting — credits are not required
```


## 📦 Package Management

This monorepo uses **pnpm workspaces** for efficient dependency management and task orchestration.

### Available Scripts

#### Root Level Commands

```bash
# Development
pnpm dev              # Start all apps in development mode (parallel)
pnpm build            # Build all apps
pnpm lint             # Lint all apps
pnpm lint:fix         # Fix linting issues in all apps
pnpm format           # Format code in all apps
pnpm format:check     # Check code formatting in all apps
pnpm test             # Run tests in all apps
pnpm test:int         # Run integration tests in all apps
pnpm clean            # Clean all build artifacts and node_modules

# Individual App Commands
pnpm web:dev          # Start only the web app
pnpm web:build        # Build only the web app
pnpm agents:dev       # Start only the agents app
pnpm agents:build     # Build only the agents app
pnpm agents:test      # Test only the agents app
pnpm agents:test:int  # Integration tests for agents app
```



## 🏗️ Project Structure

```
├── apps/
│   ├── web/                 # Next.js chat UI
│   │   ├── src/
│   │   ├── package.json
│   │   └── ...
│   └── agents/              # LangGraph agents
│       ├── src/
│       ├── package.json
│       └── ...
├── package.json             # Root package.json with workspaces
├── pnpm-workspace.yaml     # pnpm workspace configuration
├── .npmrc                  # pnpm configuration
└── README.md
```

## 🛠️ Technology Stack

### Web App (`apps/web`)
- **Framework**: Next.js 15
- **UI**: Radix UI + Tailwind CSS + shadcn/ui
- **Auth**: Supabase, 
- **State**: Nuqs, Zustand
- **Package Manager**: pnpm

### Agents App (`apps/agents`)
- **Runtime**: Node.js + TypeScript
- **Framework**: LangGraph.js
- **AI**: LangChain + Anthropic
- **Auth**: Langgraph Middleware
- **Testing**: Jest
- **Package Manager**: pnpm

## 🔧 Development Workflow

### Adding Dependencies

```bash
# Add to specific app
pnpm --filter web add <package>
pnpm --filter agents add <package>

# Add dev dependency to specific app
pnpm --filter web add -D <package>

# Add to root (for tooling)
pnpm add -D <package> -w
```

### Running Tests

```bash
# All tests
pnpm test

# Only agents tests
pnpm agents:test

# Integration tests
pnpm test:int
```

### Building for Production

```bash
# Build all apps
pnpm build

# Build specific app
pnpm web:build
pnpm agents:build
```

## 🚀 Deployment

Each app can be deployed independently:

- **Web App**: Deploy to Vercel, Netlify, or any Node.js hosting
- **Agents**: Deploy to any Node.js hosting or containerize with Docker

## 🤝 Contributing

1. Install dependencies: `pnpm install`
2. Start development: `pnpm dev`
3. Make your changes
4. Run tests: `pnpm test`
5. Format code: `pnpm format`
6. Submit a pull request
