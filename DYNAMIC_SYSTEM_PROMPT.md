# Dynamic System Prompt & User Context

This guide explains how to use dynamic system prompts and user context in your chat conversations.

## Overview

You can now:
1. **Override the default system prompt** per conversation or per message
2. **Add user context** that gets appended to the system prompt dynamically
3. **Update system prompt and user context** for existing conversations

## Features

### 1. Custom System Prompt
Set a custom system prompt that replaces the default Handa financial assistant prompt.

### 2. User Context
Add dynamic user information that gets appended to the system prompt, such as:
- User's financial goals
- Current portfolio information
- Risk tolerance
- Personal preferences
- Account details

## API Usage

### Setting System Prompt & User Context on Conversation Creation

```bash
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Help me plan my retirement",
    "systemPrompt": "You are a retirement planning specialist...",
    "userContext": "User Age: 35\nCurrent Savings: $100,000\nGoal: Retire by 55"
  }'
```

### Per-Message Override

```bash
# Override system prompt for this message only
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-Conversation-Id: <conversation-id>" \
  -d '{
    "message": "Calculate my retirement corpus",
    "systemPrompt": "You are a conservative financial advisor focused on low-risk strategies",
    "userContext": "Risk Profile: Conservative\nTime Horizon: 20 years"
  }'
```

### Update System Prompt for Existing Conversation

```bash
curl -X PATCH http://localhost:8080/v1/chat/conversations/<conversation-id>/system-prompt \
  -H "Content-Type: application/json" \
  -d '{
    "systemPrompt": "You are an aggressive growth financial advisor specializing in high-risk, high-reward strategies"
  }'
```

### Update User Context for Existing Conversation

```bash
curl -X PATCH http://localhost:8080/v1/chat/conversations/<conversation-id>/user-context \
  -H "Content-Type: application/json" \
  -d '{
    "userContext": "User Age: 36\nCurrent Savings: $150,000\nRecent promotion with 30% salary increase"
  }'
```

## How It Works

### Priority Order

1. **Message-level overrides** (highest priority)
   - `req.systemPrompt` in the chat request
   - `req.userContext` in the chat request

2. **Conversation-level settings** (medium priority)
   - `conversation.systemPrompt`
   - `conversation.userContext`

3. **Default system prompt** (lowest priority)
   - The default Handa financial assistant prompt

### System Prompt Construction

The final system prompt is built as follows:

```
[Custom System Prompt OR Default SYSTEM_PROMPT]

**User Context:**
[User context if provided]
```

Example:
```
You are Handa, an advanced AI financial assistant...
[Full default prompt]

**User Context:**
User Age: 35
Current Savings: $100,000
Risk Tolerance: Moderate
Goal: Retire by 55 with $2M corpus
```

## Use Cases

### 1. Personalized Financial Advice

```json
{
  "userContext": "Age: 30\nIncome: $120k/year\nSavings: $50k\nDebts: $20k student loans\nGoal: Buy house in 3 years"
}
```

### 2. Role-Based Prompts

```json
{
  "systemPrompt": "You are a tax optimization specialist. Focus on tax-efficient investment strategies and deductions."
}
```

### 3. Context-Aware Conversations

```json
{
  "userContext": "Recent Life Events:\n- Got married last month\n- Expecting first child\n- Received $50k inheritance\n- Planning to move to a new city"
}
```

### 4. Portfolio-Specific Advice

```json
{
  "userContext": "Current Portfolio:\n- Stocks: $200k (60%)\n- Bonds: $100k (30%)\n- Cash: $33k (10%)\n- Real Estate: $500k home\n- Retirement: $150k in 401k"
}
```

## Best Practices

1. **Keep user context concise** - Include only relevant information
2. **Update context regularly** - Keep user information current
3. **Use consistent formatting** - Makes it easier for the AI to parse
4. **Don't include sensitive data** - Avoid passwords, SSN, etc.
5. **Test with different prompts** - Find what works best for your use case

## Example: Complete Workflow

### Step 1: Create conversation with user context

```bash
CONV_ID=$(curl -s -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hi, I need help with retirement planning",
    "userContext": "Age: 45\nCurrent Savings: $300k\nIncome: $150k/year\nGoal: Retire at 65"
  }' | jq -r '.data.conversationId')
```

### Step 2: Continue conversation (user context persists)

```bash
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-Conversation-Id: $CONV_ID" \
  -d '{
    "message": "How much should I save monthly?"
  }'
```

### Step 3: Update user context after life event

```bash
curl -X PATCH http://localhost:8080/v1/chat/conversations/$CONV_ID/user-context \
  -H "Content-Type: application/json" \
  -d '{
    "userContext": "Age: 45\nCurrent Savings: $350k\nIncome: $180k/year (got raise!)\nGoal: Retire at 65"
  }'
```

### Step 4: Continue with updated context

```bash
curl -X POST http://localhost:8080/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-Conversation-Id: $CONV_ID" \
  -d '{
    "message": "Given my salary increase, should I adjust my savings strategy?"
  }'
```

## API Reference

### POST /v1/chat
Send a message with optional system prompt and user context overrides.

**Request Body:**
```typescript
{
  message: string
  systemPrompt?: string      // Optional: Custom system prompt
  userContext?: string        // Optional: User context to append
  model?: string
  temperature?: number
  maxTokens?: number
}
```

### PATCH /v1/chat/conversations/:id/system-prompt
Update the system prompt for a conversation.

**Request Body:**
```typescript
{
  systemPrompt: string
}
```

### PATCH /v1/chat/conversations/:id/user-context
Update the user context for a conversation.

**Request Body:**
```typescript
{
  userContext: string
}
```

## Notes

- System prompt and user context are stored in memory with the conversation
- Changes persist for the entire conversation
- Per-message overrides don't update the stored values
- Both fields are optional - omit them to use defaults
