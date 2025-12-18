# Chat API Complete Reference

Complete API documentation with curl examples for all chat endpoints.

---

## Base URL
```
http://localhost:8080
```

---

## Authentication
Currently no authentication required. Headers are optional unless specified.

---

## API Endpoints

### 1. Send Chat Message (Main Endpoint)

**Endpoint:** `POST /v1/chat`

**Description:** Send a message to the AI assistant. Auto-creates conversation on first message. Supports both streaming and non-streaming modes.

**Headers:**
- `Content-Type: application/json` (required)
- `X-Stream: true|false` (optional, default: true) - Controls streaming mode

**Request Body:**
```json
{
  "message": "string (required) - The user's message",
  "conversationId": "string (optional) - UUID of existing conversation",
  "model": "string (optional) - AI model to use (default: gpt-4o)",
  "temperature": "number (optional) - 0-2, controls randomness (default: 1)",
  "maxTokens": "number (optional) - Maximum tokens to generate",
  "tools": "boolean (optional) - Enable tool usage (default: true)",
  "visualsEnabled": "boolean (optional) - Enable visuals (default: false)",
  "systemPrompt": "string (optional) - Custom system prompt override",
  "userContext": "string (optional) - User context appended to system prompt"
}
```

**Response (Non-Streaming):**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "messageId": "uuid",
    "conversationId": "uuid",
    "role": "assistant",
    "content": {
      "blocks": [
        {
          "type": "text",
          "blockId": "uuid",
          "text": "Assistant's response..."
        }
      ],
      "tools": [],
      "attachments": [],
      "visuals": []
    },
    "model": "gpt-4o",
    "tokenCount": 150,
    "createdAt": "2025-12-17T10:30:00.000Z",
    "isNewConversation": true,
    "conversationTitle": "Chat about TypeScript"
  }
}
```

**Response (Streaming):**
Server-Sent Events (SSE) stream with multiple event types:
- `message.started`
- `text.block.started`
- `text.delta` (token-by-token)
- `text.block.completed`
- `tool.call.started`
- `tool.call.executing`
- `tool.call.completed`
- `agent.tool.call.*` (for internal tools)
- `conversation.info` (final event with conversationId)
- `message.completed`

---

#### Examples:

**Example 1: Start New Conversation (Streaming)**
```bash
curl -N -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-Stream: true" \
  -d '{
    "message": "Hello! Can you help me with retirement planning?",
    "userContext": "Age: 35, Savings: $100k, Goal: Retire at 55"
  }'
```

**Example 2: Continue Conversation (Streaming)**
```bash
curl -N -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-Stream: true" \
  -d '{
    "message": "How much should I save monthly?",
    "conversationId": "abc-123-uuid-from-first-response"
  }'
```

**Example 3: Non-Streaming Response**
```bash
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-Stream: false" \
  -d '{
    "message": "Calculate retirement corpus for 20 years",
    "conversationId": "abc-123-uuid",
    "model": "gpt-4o",
    "temperature": 0.7
  }'
```

**Example 4: Custom System Prompt**
```bash
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-Stream: false" \
  -d '{
    "message": "Should I invest in cryptocurrency?",
    "systemPrompt": "You are a conservative financial advisor who prioritizes capital preservation.",
    "userContext": "Risk Profile: Conservative, Age: 45"
  }'
```

**Example 5: Using FIRE Agent Tools**
```bash
curl -N -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Starting corpus ₹4.8Cr, annual expense ₹20L, mean return 9.5%, volatility 18%, inflation 6.5%, simulation period 40 years - run monte carlo, deep corpus, and dynamic spending"
  }'
```

---

### 2. Get Conversation Details

**Endpoint:** `GET /v1/chat/conversations/:id`

**Description:** Retrieve a conversation with all its messages.

**Parameters:**
- `id` (path parameter) - Conversation UUID

**Response:**
```json
{
  "success": true,
  "message": "Conversation retrieved successfully",
  "data": {
    "conversation": {
      "conversationId": "uuid",
      "title": "Retirement Planning Discussion",
      "createdAt": "2025-12-17T10:00:00.000Z",
      "updatedAt": "2025-12-17T10:30:00.000Z"
    },
    "messages": [
      {
        "messageId": "uuid",
        "conversationId": "uuid",
        "role": "user",
        "content": { ... },
        "createdAt": "2025-12-17T10:00:00.000Z"
      },
      {
        "messageId": "uuid",
        "conversationId": "uuid",
        "role": "assistant",
        "content": { ... },
        "model": "gpt-4o",
        "tokenCount": 150,
        "createdAt": "2025-12-17T10:00:30.000Z"
      }
    ]
  }
}
```

**Example:**
```bash
# Save conversation ID from first request
CONV_ID="abc-123-uuid"

# Get conversation details
curl http://localhost:8080/v1/chat/conversations/$CONV_ID | jq .
```

---

### 3. List All Conversations

**Endpoint:** `GET /v1/chat/conversations`

**Description:** List all conversations, sorted by most recently updated.

**Response:**
```json
{
  "success": true,
  "message": "Conversations retrieved successfully",
  "data": {
    "conversations": [
      {
        "conversationId": "uuid-1",
        "title": "Retirement Planning",
        "createdAt": "2025-12-17T10:00:00.000Z",
        "updatedAt": "2025-12-17T10:30:00.000Z"
      },
      {
        "conversationId": "uuid-2",
        "title": "Investment Strategy",
        "createdAt": "2025-12-16T15:00:00.000Z",
        "updatedAt": "2025-12-16T16:00:00.000Z"
      }
    ],
    "count": 2
  }
}
```

**Example:**
```bash
curl http://localhost:8080/v1/chat/conversations | jq .
```

---

### 4. Delete Conversation

**Endpoint:** `DELETE /v1/chat/conversations/:id`

**Description:** Delete a conversation and all its messages.

**Parameters:**
- `id` (path parameter) - Conversation UUID

**Response:**
```json
{
  "success": true,
  "message": "Conversation deleted successfully",
  "data": {
    "conversationId": "uuid",
    "deleted": true
  }
}
```

**Example:**
```bash
curl -X DELETE http://localhost:8080/v1/chat/conversations/$CONV_ID | jq .
```

---

### 5. Update System Prompt

**Endpoint:** `PATCH /v1/chat/conversations/:id/system-prompt`

**Description:** Update the system prompt for an existing conversation.

**Parameters:**
- `id` (path parameter) - Conversation UUID

**Request Body:**
```json
{
  "systemPrompt": "string (required) - New system prompt"
}
```

**Response:**
```json
{
  "success": true,
  "message": "System prompt updated successfully",
  "data": {
    "conversationId": "uuid",
    "systemPrompt": "Updated system prompt text..."
  }
}
```

**Examples:**

```bash
# Make assistant more conservative
curl -X PATCH http://localhost:8080/v1/chat/conversations/$CONV_ID/system-prompt \
  -H "Content-Type: application/json" \
  -d '{
    "systemPrompt": "You are a conservative financial advisor. Always prioritize safety and capital preservation over growth."
  }' | jq .

# Make assistant more aggressive
curl -X PATCH http://localhost:8080/v1/chat/conversations/$CONV_ID/system-prompt \
  -H "Content-Type: application/json" \
  -d '{
    "systemPrompt": "You are an aggressive growth investor who focuses on high-risk, high-reward opportunities."
  }' | jq .
```

---

### 6. Update User Context

**Endpoint:** `PATCH /v1/chat/conversations/:id/user-context`

**Description:** Update user context that gets appended to system prompt.

**Parameters:**
- `id` (path parameter) - Conversation UUID

**Request Body:**
```json
{
  "userContext": "string (required) - User context information"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User context updated successfully",
  "data": {
    "conversationId": "uuid",
    "userContext": "Updated user context..."
  }
}
```

**Examples:**

```bash
# Initial user context
curl -X PATCH http://localhost:8080/v1/chat/conversations/$CONV_ID/user-context \
  -H "Content-Type: application/json" \
  -d '{
    "userContext": "Age: 35\nCurrent Savings: $100,000\nIncome: $80,000/year\nGoal: Retire by 55"
  }' | jq .

# Update after life event
curl -X PATCH http://localhost:8080/v1/chat/conversations/$CONV_ID/user-context \
  -H "Content-Type: application/json" \
  -d '{
    "userContext": "Age: 36\nCurrent Savings: $150,000\nIncome: $100,000/year (got 25% raise!)\nGoal: Retire by 55\nRecent: Got married, expecting first child"
  }' | jq .
```

---

## Health Check

**Endpoint:** `GET /health` or `GET /api/health`

**Description:** Check if the server is running.

**Response:**
```json
{
  "success": true,
  "message": "healthy",
  "data": {
    "status": "ok",
    "env": "development",
    "uptimeMs": 12345
  }
}
```

**Example:**
```bash
curl http://localhost:8080/health
curl http://localhost:8080/api/health
```

---

## Complete Workflow Examples

### Workflow 1: Simple Chat Session

```bash
# 1. Start new conversation
RESPONSE=$(curl -s -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-Stream: false" \
  -d '{
    "message": "Hi, I need help planning my retirement"
  }')

echo $RESPONSE | jq .

# Extract conversation ID
CONV_ID=$(echo $RESPONSE | jq -r '.data.conversationId')
echo "Conversation ID: $CONV_ID"

# 2. Continue conversation
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-Stream: false" \
  -d "{
    \"message\": \"How much should I save each month?\",
    \"conversationId\": \"$CONV_ID\"
  }" | jq .

# 3. View conversation history
curl http://localhost:8080/v1/chat/conversations/$CONV_ID | jq .

# 4. Delete conversation
curl -X DELETE http://localhost:8080/v1/chat/conversations/$CONV_ID | jq .
```

---

### Workflow 2: Personalized Financial Advice

```bash
# 1. Create conversation with user context
RESPONSE=$(curl -s -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-Stream: false" \
  -d '{
    "message": "Help me plan my retirement",
    "userContext": "Age: 35\nCurrent Savings: $100,000\nIncome: $80,000/year\nDebt: $20,000 student loans\nGoal: Retire by 55 with $2M corpus"
  }')

CONV_ID=$(echo $RESPONSE | jq -r '.data.conversationId')

# 2. Ask specific questions (context persists)
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-Stream: false" \
  -d "{
    \"message\": \"Should I pay off my student loans or invest more?\",
    \"conversationId\": \"$CONV_ID\"
  }" | jq .

# 3. Update context after life event
curl -X PATCH http://localhost:8080/v1/chat/conversations/$CONV_ID/user-context \
  -H "Content-Type: application/json" \
  -d '{
    "userContext": "Age: 35\nCurrent Savings: $120,000\nIncome: $100,000/year (got raise!)\nDebt: $15,000 student loans\nGoal: Retire by 55 with $2M corpus\nRecent: Got married"
  }' | jq .

# 4. Continue with updated context
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-Stream: false" \
  -d "{
    \"message\": \"How should my strategy change now that I'm married?\",
    \"conversationId\": \"$CONV_ID\"
  }" | jq .
```

---

### Workflow 3: FIRE Planning with Tools

```bash
# Run comprehensive FIRE analysis (streaming)
curl -N -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Starting corpus ₹4.8Cr, annual expense ₹20L, mean return 9.5%, volatility 18%, inflation 6.5%, simulation period 40 years - run monte carlo, deep corpus, and dynamic spending"
  }'

# This will:
# 1. Call fire_agent tool
# 2. fire_agent internally calls:
#    - monte_carlo (probabilistic analysis)
#    - deep_corpus (corpus depth analysis)
#    - dynamic_spending (withdrawal strategy)
# 3. Stream all internal tool calls and results
# 4. Return comprehensive analysis
```

---

### Workflow 4: Different Advisor Personalities

```bash
# Conservative advisor
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-Stream: false" \
  -d '{
    "message": "Should I invest in cryptocurrency?",
    "systemPrompt": "You are a conservative financial advisor. Always prioritize safety and capital preservation."
  }' | jq .

# Aggressive growth advisor
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-Stream: false" \
  -d '{
    "message": "Should I invest in cryptocurrency?",
    "systemPrompt": "You are an aggressive growth investor who loves high-risk, high-reward opportunities."
  }' | jq .

# Tax optimization specialist
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-Stream: false" \
  -d '{
    "message": "How can I minimize my tax burden?",
    "systemPrompt": "You are a tax optimization specialist. Focus on tax-efficient strategies and legal deductions."
  }' | jq .
```

---

## Streaming Response Format

When `X-Stream: true`, the response is an SSE stream with events:

```
data: {"type":"message.started","messageId":"uuid","sequence":1,"payload":{"model":"gpt-4o"}}

data: {"type":"text.block.started","messageId":"uuid","sequence":2,"payload":{"blockId":"uuid"}}

data: {"type":"text.delta","messageId":"uuid","sequence":3,"payload":{"blockId":"uuid","delta":"Hello"}}

data: {"type":"text.delta","messageId":"uuid","sequence":4,"payload":{"blockId":"uuid","delta":" there"}}

data: {"type":"text.block.completed","messageId":"uuid","sequence":5,"payload":{"blockId":"uuid"}}

data: {"type":"tool.call.started","messageId":"uuid","sequence":6,"payload":{"toolCallId":"uuid","toolName":"fire_agent","depth":0}}

data: {"type":"agent.tool.call.started","messageId":"uuid","sequence":7,"payload":{"toolCallId":"uuid","toolName":"monte_carlo","parentToolCallId":"parent-uuid","depth":1}}

data: {"type":"agent.tool.call.completed","messageId":"uuid","sequence":8,"payload":{"toolCallId":"uuid","result":"..."}}

data: {"type":"conversation.info","messageId":"uuid","sequence":9,"payload":{"conversationId":"uuid","isNewConversation":true,"conversationTitle":"Title"}}

data: {"type":"message.completed","messageId":"uuid","sequence":10,"payload":{"tokenCount":150,"finishReason":"stop"}}
```

---

## Error Responses

All endpoints follow the same error format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

**Common Error Codes:**
- `INVALID_REQUEST` - Invalid request parameters (400)
- `NOT_FOUND` - Resource not found (404)
- `INTERNAL_ERROR` - Server error (500)

**Examples:**

```bash
# Invalid message (empty)
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": ""}'
# Response: {"success":false,"error":{"code":"INVALID_REQUEST","message":"Message cannot be empty"}}

# Conversation not found
curl http://localhost:8080/v1/chat/conversations/invalid-uuid
# Response: {"success":false,"error":{"code":"NOT_FOUND","message":"Conversation not found"}}
```

---

## Tips & Best Practices

1. **Save conversation ID**: Always extract and save `conversationId` from the first response
2. **Use streaming for UX**: Set `X-Stream: true` for better user experience
3. **Update user context**: Keep user information current for personalized advice
4. **Custom prompts**: Use `systemPrompt` to change advisor personality per conversation
5. **Tool usage**: Let the AI decide when to use tools - don't disable unless needed
6. **Error handling**: Always check `success` field in response

---

## Testing Script

Save as `test-chat-api.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:8080"

echo "🧪 Testing Chat API"
echo ""

# Test health
echo "1. Health Check..."
curl -s $BASE_URL/health | jq .
echo ""

# Start conversation
echo "2. Starting new conversation..."
RESPONSE=$(curl -s -X POST $BASE_URL/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-Stream: false" \
  -d '{
    "message": "Hello! Help me with retirement planning",
    "userContext": "Age: 35, Savings: $100k"
  }')

echo $RESPONSE | jq .
CONV_ID=$(echo $RESPONSE | jq -r '.data.conversationId')
echo "Conversation ID: $CONV_ID"
echo ""

# Continue conversation
echo "3. Continuing conversation..."
curl -s -X POST $BASE_URL/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-Stream: false" \
  -d "{
    \"message\": \"How much should I save?\",
    \"conversationId\": \"$CONV_ID\"
  }" | jq .
echo ""

# List conversations
echo "4. Listing conversations..."
curl -s $BASE_URL/v1/chat/conversations | jq .
echo ""

# Get conversation details
echo "5. Getting conversation details..."
curl -s $BASE_URL/v1/chat/conversations/$CONV_ID | jq .
echo ""

echo "✅ Tests complete!"
```

Run with: `chmod +x test-chat-api.sh && ./test-chat-api.sh`

---

## Rate Limits

Currently no rate limits implemented. For production, consider adding rate limiting middleware.

---

## Support

For issues or questions, check the logs or contact the development team.
