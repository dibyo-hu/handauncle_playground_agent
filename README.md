# Agentic Finance Playground

A local, experiment-driven agentic system with two modes:
1. **Finance Advisor** - A controlled decision engine for Indian personal finance recommendations with strict schemas and validation
2. **Tool Playground** - An unconstrained chat interface for testing and building custom agents

---

## Table of Contents

- [Quick Start](#quick-start)
- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Backend Guide](#backend-guide)
- [Frontend Guide](#frontend-guide)
- [API Reference](#api-reference)
- [SSE Streaming Protocol](#sse-streaming-protocol)
- [Environment Variables](#environment-variables)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm
- OpenAI API key

### 1. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add: OPENAI_API_KEY=sk-your-key-here
npm run dev
```

Backend runs at: **http://localhost:3001**

### 2. Setup Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:3000**

### 3. Open Browser

Navigate to http://localhost:3000 and you'll see two tabs:
- **Finance Advisor** - Indian personal finance recommendations
- **Tool Playground** - Unconstrained chat for agent development

---

## Overview

### Finance Advisor Tab

A structured recommendation engine with:
- **Query Classification** - Filters non-Indian finance queries
- **User Context Injection** - Financial data drives recommendations
- **Web Search Grounding** - Real-time fund data (optional)
- **Schema Validation** - Strict output format enforcement
- **Business Rule Validation** - No stocks, crypto, or derivatives

### Tool Playground Tab

An unconstrained chat interface with:
- **Model Selection** - Choose GPT-4o, GPT-4o Mini, GPT-4 Turbo, or GPT-3.5 Turbo
- **Temperature Control** - Adjust creativity (0-2)
- **Conversation Management** - Create, switch, and delete conversations
- **SSE Streaming** - Real-time response streaming
- **No Constraints** - No validation or business rules

---

## Architecture

### Finance Advisor Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                        ORCHESTRATOR                             │
│                                                                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│  │   LAYER 0   │   │   LAYER 1   │   │   LAYER 2   │           │
│  │  Classifier │──▶│   Context   │──▶│  Web Search │           │
│  │  (GPT-4o-m) │   │  Injection  │   │    OpenAI   │           │
│  └─────────────┘   └─────────────┘   └─────────────┘           │
│         │                                    │                 │
│         │ REJECT if not                     │                  │
│         │ Indian finance                    ▼                  │
│         │                          ┌─────────────────┐         │
│         │                          │    LAYER 3+4    │         │
│         ▼                          │  Recommender +  │         │
│   ┌──────────┐                     │   Validator     │         │
│   │ REJECTION│                     │  (Repair Loop)  │         │
│   │ RESPONSE │                     └─────────────────┘         │
│   └──────────┘                              │                  │
│                                             ▼                  │
│                                    ┌─────────────────┐         │
│                                    │ RECOMMENDATIONS │         │
│                                    │    (SSE JSON)   │         │
│                                    └─────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### Tool Playground Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CHAT API v1                                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    /v1/chat                              │   │
│  │                                                          │   │
│  │  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │   │
│  │  │   Request    │───▶│   OpenAI     │───▶│    SSE    │  │   │
│  │  │   Handler    │    │   Streaming  │    │  Response │  │   │
│  │  └──────────────┘    └──────────────┘    └───────────┘  │   │
│  │         │                                      │         │   │
│  │         │            ┌──────────────┐         │         │   │
│  │         └───────────▶│ Conversation │◀────────┘         │   │
│  │                      │   Storage    │                   │   │
│  │                      │  (In-Memory) │                   │   │
│  │                      └──────────────┘                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
agentic-playground/
├── backend/
│   ├── src/
│   │   │
│   │   │── controllers/           # HTTP request handlers
│   │   │   └── chat.controller.ts # Chat API v1 handlers
│   │   │
│   │   │── interfaces/            # TypeScript type definitions
│   │   │   └── chat.interface.ts  # Chat API types & SSE events
│   │   │
│   │   │── layers/                # Finance Advisor pipeline
│   │   │   ├── classifier.ts      # Layer 0: Query classification
│   │   │   ├── context.ts         # Layer 1: User context
│   │   │   ├── webSearch.ts       # Layer 2: Web search
│   │   │   ├── recommender.ts     # Layer 3: Recommendations
│   │   │   ├── streamingRecommender.ts  # Layer 3: SSE streaming
│   │   │   ├── validator.ts       # Layer 4: Validation
│   │   │   ├── orchestrator.ts    # Pipeline coordinator
│   │   │   ├── streamingOrchestrator.ts # SSE pipeline
│   │   │   ├── freeChat.ts        # Unconstrained chat mode
│   │   │   └── index.ts           # Exports
│   │   │
│   │   │── lib/                   # Shared libraries
│   │   │   ├── chat.lib.ts        # OpenAI API wrapper
│   │   │   └── stream.lib.ts      # SSE stream utilities
│   │   │
│   │   │── routes/                # Express route definitions
│   │   │   ├── api.ts             # Finance Advisor routes (/api)
│   │   │   └── v1/
│   │   │       ├── index.ts       # V1 router mount
│   │   │       └── chat.route.ts  # Chat API routes (/v1/chat)
│   │   │
│   │   │── services/              # Business logic
│   │   │   └── chat.service.ts    # Chat processing & storage
│   │   │
│   │   │── types/
│   │   │   └── schemas.ts         # Zod schemas for validation
│   │   │
│   │   │── utils/
│   │   │   ├── logger.ts          # Structured logging
│   │   │   ├── event.util.ts      # SSE event builders
│   │   │   └── message.util.ts    # Message transformers
│   │   │
│   │   └── server.ts              # Express server entry point
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   │── components/
│   │   │   ├── ChatInput.tsx        # Message input component
│   │   │   ├── ChatMessage.tsx      # Message display component
│   │   │   ├── ContextEditor.tsx    # User context JSON editor
│   │   │   ├── OutputFormatEditor.tsx # Output format settings
│   │   │   ├── PlaygroundSidebar.tsx  # Tool Playground sidebar
│   │   │   ├── QueryInput.tsx       # Finance Advisor query input
│   │   │   ├── ResultDisplay.tsx    # Recommendation results
│   │   │   ├── Sidebar.tsx          # Finance Advisor sidebar
│   │   │   ├── SystemPromptEditor.tsx # System prompt settings
│   │   │   ├── TabSwitcher.tsx      # Tab navigation component
│   │   │   └── index.ts             # Exports
│   │   │
│   │   │── lib/
│   │   │   ├── api.ts               # API client functions
│   │   │   ├── theme-context.tsx    # Dark/light mode context
│   │   │   ├── utils.ts             # Utility functions (cn)
│   │   │   └── hooks/
│   │   │       └── use-streaming-chat.ts  # Streaming hook
│   │   │
│   │   │── types/
│   │   │   └── index.ts             # TypeScript types
│   │   │
│   │   ├── App.tsx                  # Main application component
│   │   ├── main.tsx                 # React entry point
│   │   └── index.css                # Tailwind styles
│   │
│   ├── package.json
│   ├── vite.config.ts               # Vite + proxy config
│   └── tailwind.config.js
│
└── README.md
```

---

## Backend Guide

### Key Files Explained

#### `server.ts` - Entry Point
- Creates Express app
- Configures CORS for frontend origins
- Mounts `/api` routes (Finance Advisor)
- Mounts `/v1` routes (Tool Playground)

#### `layers/` - Finance Advisor Pipeline

| File | Purpose | Model |
|------|---------|-------|
| `classifier.ts` | Filters non-Indian finance queries | GPT-4o-mini |
| `context.ts` | Manages user financial data | - |
| `webSearch.ts` | Grounds recommendations with web data | OpenAI |
| `recommender.ts` | Generates investment suggestions | GPT-4o |
| `validator.ts` | Enforces schema + business rules | - |
| `orchestrator.ts` | Coordinates all layers | - |

#### `services/chat.service.ts` - Tool Playground Logic

```typescript
// Key functions:
processChatStreaming()    // SSE streaming chat
processChatNonStreaming() // JSON response chat
getConversation()         // Fetch conversation
listConversations()       // List all conversations
deleteConversation()      // Delete conversation
```

Conversations are stored **in-memory** using a `Map<string, Conversation>`.

#### `lib/stream.lib.ts` - SSE Utilities

```typescript
// SSE helper functions:
setupSSEResponse(res)     // Configure response headers
sendSSEEvent(res, event)  // Send formatted SSE event
closeSSEConnection(res)   // End stream
StreamContextManager      // Track message IDs, sequences, blocks
```

---

## Frontend Guide

### Key Files Explained

#### `App.tsx` - Main Application

Manages two modes with a tab switcher:
- **Finance Advisor**: Uses `/api/recommend/stream` with user context
- **Tool Playground**: Uses `/v1/chat` with conversation management

```typescript
// State for Tool Playground:
const [conversationId, setConversationId] = useState<string | null>(null);
const [conversations, setConversations] = useState<ConversationItem[]>([]);
const [playgroundModel, setPlaygroundModel] = useState<string>('gpt-4o');
const [playgroundTemperature, setPlaygroundTemperature] = useState<number>(1);
```

#### `PlaygroundSidebar.tsx` - Tool Playground Controls

Features:
- New Chat button
- Model dropdown (GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo)
- Temperature slider (0-2)
- Conversation list with delete
- Theme switcher

#### `vite.config.ts` - Proxy Configuration

```typescript
proxy: {
  '/api': { target: 'http://localhost:3001', changeOrigin: true },
  '/v1': { target: 'http://localhost:3001', changeOrigin: true },
}
```

---

## API Reference

### Finance Advisor API (`/api`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/default-context` | Get default user context |
| GET | `/api/default-prompt` | Get default system prompt |
| POST | `/api/recommend/stream` | Process query (SSE streaming) |
| GET | `/api/logs` | View debug logs |

#### POST /api/recommend/stream

**Request:**
```json
{
  "query": "Which mutual fund should I start a SIP in?",
  "user_context": {
    "monthly_income": 150000,
    "monthly_expenses": 80000,
    "bank_balance": 500000,
    "mutual_fund_holdings": [],
    "risk_profile": "moderate",
    "investment_horizon_years": 10
  }
}
```

**Response:** SSE stream with events:
- `classification` - Query classification result
- `web_search` - Web search results (if triggered)
- `recommendation_chunk` - Streaming text chunks
- `recommendation` - Final structured recommendation
- `error` - Error details

---

### Tool Playground Chat API (`/v1`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/chat` | Send message (auto-creates conversation) |
| GET | `/v1/chat/conversations` | List all conversations |
| GET | `/v1/chat/conversations/:id` | Get specific conversation |
| DELETE | `/v1/chat/conversations/:id` | Delete conversation |

#### POST /v1/chat

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-Conversation-Id` | No | Existing conversation ID (omit for new) |
| `X-Stream` | No | `true` (default) or `false` |

**Request:**
```json
{
  "message": "Hello, how are you?",
  "model": "gpt-4o",
  "temperature": 1,
  "maxTokens": 4096
}
```

**Response Headers:**
| Header | Description |
|--------|-------------|
| `X-Conversation-Id` | The conversation ID |
| `X-Is-New-Conversation` | `true` if newly created |
| `X-Conversation-Title` | Auto-generated title |

**SSE Response:** See [SSE Streaming Protocol](#sse-streaming-protocol)

**Non-Streaming Response (X-Stream: false):**
```json
{
  "id": "msg_abc123",
  "conversationId": "conv_xyz789",
  "role": "assistant",
  "content": "Hello! I'm doing well, thank you...",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### GET /v1/chat/conversations

**Response:**
```json
{
  "conversations": [
    {
      "id": "conv_xyz789",
      "title": "Hello conversation",
      "messageCount": 4,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

## SSE Streaming Protocol

### Event Format

```
event: <event_type>
data: <json_payload>

```

### Event Types

| Event | Description | When Sent |
|-------|-------------|-----------|
| `message.started` | Stream begins | First event |
| `text.block.started` | Text block begins | Before text |
| `text.delta` | Text chunk | During streaming |
| `text.block.completed` | Text block ends | After all text |
| `conversation.info` | Conversation metadata | After message.started |
| `message.completed` | Stream ends successfully | Last event |
| `message.failed` | Error occurred | On error |
| `stream.end` | Connection closing | Final event |

### Event Payloads

#### message.started
```json
{
  "type": "message.started",
  "messageId": "msg_abc123",
  "sequence": 0,
  "payload": {
    "role": "assistant"
  }
}
```

#### text.delta
```json
{
  "type": "text.delta",
  "messageId": "msg_abc123",
  "sequence": 2,
  "payload": {
    "text": "Hello",
    "blockId": "block_xyz"
  }
}
```

#### conversation.info
```json
{
  "type": "conversation.info",
  "messageId": "msg_abc123",
  "sequence": 1,
  "payload": {
    "conversationId": "conv_xyz789",
    "isNewConversation": true,
    "conversationTitle": "Hello conversation"
  }
}
```

### JavaScript Client Example

```javascript
async function chat(message, conversationId = null) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Stream': 'true',
  };

  if (conversationId) {
    headers['X-Conversation-Id'] = conversationId;
  }

  const response = await fetch('/v1/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, model: 'gpt-4o', temperature: 1 }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let newConversationId = response.headers.get('X-Conversation-Id');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let eventType = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7);
      } else if (line.startsWith('data: ') && eventType) {
        const data = JSON.parse(line.slice(6));

        if (data.type === 'text.delta') {
          process.stdout.write(data.payload.text);
        }

        eventType = '';
      }
    }
  }

  return newConversationId;
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | - | OpenAI API key |
| `PORT` | No | 3001 | Backend server port |

### .env.example

```bash
# Required
OPENAI_API_KEY=sk-your-key-here

# Optional
PORT=3001
```

---

## Development Workflow

### Running in Development

```bash
# Terminal 1 - Backend with hot reload
cd backend
npm run dev

# Terminal 2 - Frontend with hot reload
cd frontend
npm run dev
```

### Type Checking

```bash
# Backend
cd backend
npx tsc --noEmit

# Frontend
cd frontend
npx tsc --noEmit
```

### Adding New Features

#### Adding a New Chat API Endpoint

1. Define types in `backend/src/interfaces/chat.interface.ts`
2. Add business logic in `backend/src/services/chat.service.ts`
3. Create handler in `backend/src/controllers/chat.controller.ts`
4. Register route in `backend/src/routes/v1/chat.route.ts`

#### Adding a New Finance Advisor Layer

1. Create layer in `backend/src/layers/yourLayer.ts`
2. Export from `backend/src/layers/index.ts`
3. Integrate in `backend/src/layers/orchestrator.ts`

---

## Troubleshooting

### Common Issues

#### "OPENAI_API_KEY environment variable is required"
- Create `.env` file in `backend/` directory
- Add `OPENAI_API_KEY=sk-your-key-here`

#### CORS Errors
- Ensure backend is running on port 3001
- Ensure frontend is running on port 3000 or 5173
- Check `server.ts` CORS configuration

#### SSE Events Not Parsing
- Ensure proper `\n\n` between events
- Check for `event:` and `data:` prefixes
- Buffer incomplete chunks until `\n\n` received

#### Conversations Not Persisting
- Conversations are stored **in-memory**
- Restarting backend clears all conversations
- For persistence, implement database storage in `chat.service.ts`

### Debug Logs

```bash
# View Finance Advisor logs
curl http://localhost:3001/api/logs

# Clear logs
curl -X DELETE http://localhost:3001/api/logs
```

---

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **AI**: OpenAI SDK
- **Validation**: Zod

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Language**: TypeScript

---

## Hard Constraints (Finance Advisor Only)

These constraints are **enforced in code** for the Finance Advisor tab:

- **NO individual stocks** - Mutual funds only
- **NO cryptocurrency**
- **NO derivatives** (options, futures, F&O)
- **NO PMS, AIF, ULIP**
- **Allowed instruments**: Mutual funds, Index funds, Debt funds, Liquid funds, ELSS
- **Amount constraint**: Sum of all recommendation amounts ≤ monthly surplus
- **Execution disabled**: All execute buttons are disabled

The Tool Playground tab has **no constraints**.

---

## License

This is an internal experimentation tool. Not for production use.
