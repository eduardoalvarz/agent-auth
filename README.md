# Fullstack Chat Repo

A monorepo containing a fullstack chat application with LangGraph agents and Next.js UI.

## 🏗️ Architecture

This monorepo contains two main applications:

- **`apps/web`** - Next.js chat UI application with LangGraph integration
- **`apps/agents`** - LangGraph.js ReAct agents backend

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm 8+ (recommended package manager)

### Installation

```bash
# Install dependencies for all apps
pnpm install

# Start development servers for both apps
pnpm dev
```

## Setup

1. Clone both repos

```bash
git clone https://github.com/starmorph/fullstack-chat-server/tree/main

git clone https://github.com/starmorph/fullstack-chat-client
```

### Terminal Tab 1: Server

```bash
1. cp .env.example .env
2. fill out env
3. pnpm install
4. npx @langchain/langgraph-cli dev --no-browser
```

### Terminal Tab 2: Client

```bash
1. cp .env.example .env
2. fill out env
3. pnpm install && pnpm dev
```

### Terminal Tab 3: Stripe Webhook (for purchases + credits)

```bash
stripe listen --events customer.subscription.created,customer.subscription.updated,customer.subscription.deleted --forward-to localhost:3000/api/webhooks/stripe
```

### Use the App

```markdown
1. Open localhost:3000
2. Sign up -> confirm email
3. login
4. pricing page --> purchase credits
   a. should see stripe events in Terminal Tab 3
5. should see success page, new credits added
6. back to home, chat with app, credits get deducted
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

#### Working with Individual Apps

```bash
# Run commands in specific workspaces
pnpm --filter web <command>
pnpm --filter agents <command>

# Examples
pnpm --filter web add @langchain/core
pnpm --filter agents add dotenv
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
- **State**: Nuqs, Zustand
- **LangGraph**: @langchain/langgraph-sdk
- **Package Manager**: pnpm

### Agents App (`apps/agents`)
- **Runtime**: Node.js + TypeScript
- **Framework**: LangGraph.js
- **AI**: LangChain + Anthropic
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

## 📝 Migration Notes

This monorepo was created by combining two separate repositories:
- The agents app was migrated from yarn to pnpm
- Both apps now use consistent tooling and scripts
- pnpm workspaces provide efficient build caching and task orchestration 