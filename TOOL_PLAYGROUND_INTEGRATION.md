# Tool Playground - External Chat API Integration

## Overview

The Tool Playground tab now uses an **external Chat API v1** instead of the local backend. This allows:

1. **Financial Advisor** tab → Uses local backend (`/api/*` endpoints)
2. **Tool Playground** tab → Uses external Chat API v1 (`/v1/chat` endpoints)

## Architecture

### API Client Structure

```
frontend/src/lib/
├── api.ts              # Finance Advisor API client (local backend)
├── chat-api.ts         # Tool Playground API client (external Chat API v1) ✨ NEW
└── hooks/
    └── use-streaming-chat.ts
```

### Chat API Client (`chat-api.ts`)

A complete client implementation for the external Chat API v1 with:

- ✅ **Streaming support** via SSE (Server-Sent Events)
- ✅ **Non-streaming support** for synchronous responses
- ✅ **Conversation management** (list, get, delete)
- ✅ **System prompt & user context** updates
- ✅ **TypeScript types** for all requests/responses
- ✅ **Async generator** for easy stream consumption

### Key Functions

```typescript
// Send streaming message
sendChatMessage(request, conversationId?, signal?)

// Send non-streaming message
sendChatMessageSync(request, conversationId?, signal?)

// Stream processing helper
readChatStream(response): AsyncGenerator<ChatStreamEvent>

// Conversation management
listConversations(): Promise<ConversationItem[]>
getConversation(id): Promise<ConversationDetails>
deleteConversation(id): Promise<void>

// Context management
updateSystemPrompt(conversationId, systemPrompt)
updateUserContext(conversationId, userContext)
```

## Configuration

### Environment Variable

Set the Chat API base URL in `frontend/.env`:

```bash
VITE_CHAT_API_URL=http://localhost:8080/v1/chat
```

**Default**: `http://localhost:8080/v1/chat`

Copy the example file:

```bash
cd frontend
cp .env.example .env
```

### TypeScript Setup

Created `frontend/src/vite-env.d.ts` for environment variable typing:

```typescript
interface ImportMetaEnv {
  readonly VITE_CHAT_API_URL?: string;
}
```

## Backend Health Check Behavior

### Before
- Health check blocked entire app if local backend was down
- Both tabs were unusable

### After ✨
- Health check **only affects Finance Advisor tab**
- Tool Playground works independently
- Shows inline warning banner on Finance Advisor tab if backend is offline
- User can switch to Tool Playground without reloading

### Offline Warning Banner

When Finance Advisor backend is offline, users see:

```
⚠️ Finance Advisor Backend Offline

[Error message]

To start the Finance Advisor backend:
  cd handauncle_playground_agent/backend
  npm install
  npm run dev

[Retry Connection] [Use Tool Playground Instead]
```

## Changes Made

### 1. Created `frontend/src/lib/chat-api.ts`
Complete Chat API v1 client with:
- Request/response types
- Streaming support
- Conversation management
- SSE parsing utilities

### 2. Updated `frontend/src/App.tsx`
- Import chat API client functions
- Refactored `handlePlaygroundMessage()` to use new client
- Updated conversation management to use API functions
- Changed health check to be non-blocking
- Added inline offline warning banner for Finance Advisor
- Removed unused types (moved to chat-api.ts)

### 3. Created `frontend/src/vite-env.d.ts`
TypeScript definitions for Vite environment variables.

### 4. Created `frontend/.env.example`
Template for configuring Chat API URL.

## Usage

### Development

1. **Start the external Chat API backend** (your existing chat API):
   ```bash
   # Your chat API should be running on http://localhost:8080
   ```

2. **Start the Finance Advisor backend** (optional):
   ```bash
   cd backend
   npm run dev
   ```

3. **Start the frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

### Production

Set `VITE_CHAT_API_URL` to your production Chat API URL:

```bash
VITE_CHAT_API_URL=https://api.yourapp.com/v1/chat
```

## Testing

### Test Tool Playground (without Finance Advisor backend)

1. Stop the local backend
2. Frontend should load successfully
3. Switch to **Tool Playground** tab
4. Chat should work using external Chat API
5. Finance Advisor tab shows offline warning

### Test Both Tabs

1. Start both backends
2. **Finance Advisor** → Uses `/api/recommend/stream`
3. **Tool Playground** → Uses external Chat API `/v1/chat`
4. Both tabs work independently

## Event Flow

### Tool Playground Stream Events

```
text.delta          → Incremental text chunks
conversation.info   → Conversation ID & metadata
message.completed   → Response finished
stream.end          → Stream closed
message.failed      → Error occurred
```

### Stream Processing

The new implementation uses an async generator for clean stream handling:

```typescript
const response = await sendChatMessage(request, conversationId);

for await (const event of readChatStream(response)) {
  switch (event.type) {
    case 'text.delta':
      // Handle text chunk
      break;
    case 'conversation.info':
      // Save conversation ID
      break;
    // ...
  }
}
```

## API Endpoints Used

### Tool Playground Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1/chat` | Send message (streaming/non-streaming) |
| `GET` | `/v1/chat/conversations` | List all conversations |
| `GET` | `/v1/chat/conversations/:id` | Get conversation details |
| `DELETE` | `/v1/chat/conversations/:id` | Delete conversation |
| `PATCH` | `/v1/chat/conversations/:id/system-prompt` | Update system prompt |
| `PATCH` | `/v1/chat/conversations/:id/user-context` | Update user context |

### Finance Advisor Endpoints (unchanged)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/default-context` | Get default user context |
| `GET` | `/api/default-prompt` | Get default system prompt |
| `GET` | `/api/default-output-format` | Get default output format |
| `POST` | `/api/recommend/stream` | Send message (streaming) |

## Migration Guide

If you were using the old implementation:

### Before
```typescript
// Hardcoded fetch calls in App.tsx
const response = await fetch('/v1/chat', { ... });
```

### After
```typescript
// Using chat API client
import { sendChatMessage, readChatStream } from './lib/chat-api';

const response = await sendChatMessage(request, conversationId);
for await (const event of readChatStream(response)) {
  // Process events
}
```

## Benefits

✅ **Separation of concerns** - Each tab uses appropriate backend  
✅ **Independent operation** - Tool Playground works even if Finance Advisor is down  
✅ **Type safety** - Full TypeScript definitions  
✅ **Reusable client** - Clean API abstraction  
✅ **Better UX** - Inline warnings instead of blocking screens  
✅ **Configurable** - Easy to point to different Chat API URLs  
✅ **Cleaner code** - Async generator pattern for streams  

## Troubleshooting

### Tool Playground not connecting

1. Check `VITE_CHAT_API_URL` is set correctly
2. Verify Chat API backend is running
3. Check browser console for CORS errors
4. Verify Chat API endpoints match documentation

### Finance Advisor offline warning

This is expected if the local backend isn't running. Either:
- Start the backend: `cd backend && npm run dev`
- Use Tool Playground tab instead

### TypeScript errors about `import.meta.env`

Ensure `frontend/src/vite-env.d.ts` exists and is included in your tsconfig.

## Next Steps

Consider adding:
- [ ] Token usage tracking
- [ ] Conversation search
- [ ] Export conversations
- [ ] Custom system prompts in UI
- [ ] Streaming interruption (stop generation)
- [ ] Reconnection logic for dropped streams
