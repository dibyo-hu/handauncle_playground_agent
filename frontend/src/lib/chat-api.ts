/**
 * Chat API Client for Tool Playground
 * 
 * This client interacts with the external Chat API v1 endpoints
 * Supports both streaming and non-streaming modes
 */

// Base URL for Chat API - configure this based on your deployment
const CHAT_API_BASE = import.meta.env.VITE_CHAT_API_URL || 'http://localhost:8080/v1/chat';

/**
 * Chat API v1 Stream Event Types
 */
export type StreamEventType =
  | 'message.started'
  | 'message.completed'
  | 'message.failed'
  | 'text.block.started'
  | 'text.delta'
  | 'text.block.completed'
  | 'tool.call.started'
  | 'tool.call.arguments'
  | 'tool.call.executing'
  | 'tool.call.completed'
  | 'tool.call.failed'
  | 'agent.tool.call.started'
  | 'agent.tool.call.arguments'
  | 'agent.tool.call.executing'
  | 'agent.tool.call.completed'
  | 'agent.tool.call.failed'
  | 'visual.intent'
  | 'visual.block.created'
  | 'visual.patch'
  | 'visual.completed'
  | 'reasoning.started'
  | 'reasoning.delta'
  | 'reasoning.completed'
  | 'conversation.info'
  | 'stream.keepalive'
  | 'stream.end';

/**
 * Chat API v1 Stream Events
 */
export interface ChatStreamEvent {
  type: StreamEventType;
  messageId: string;
  sequence: number;
  payload: {
    // Text content
    text?: string;
    delta?: string; // Used by text.delta events
    blockId?: string;
    
    // Conversation info
    conversationId?: string;
    isNewConversation?: boolean;
    conversationTitle?: string;
    
    // Message completion
    tokenCount?: number;
    status?: string;
    finishReason?: string;
    
    // Tool calls
    toolCallId?: string;
    toolName?: string;
    arguments?: string;
    result?: unknown;
    
    // Agent tool calls
    agentToolCallId?: string;
    agentName?: string;
    
    // Visuals
    visualId?: string;
    visualType?: string;
    intent?: string;
    patch?: unknown;
    
    // Reasoning
    reasoningId?: string;
    
    // Errors
    error?: string;
    
    // Role & model
    role?: 'assistant';
    model?: string;
    timestamp?: string;
    
    [key: string]: unknown;
  };
}

/**
 * Chat message request
 */
export interface ChatRequest {
  message: string;
  attachments?: string[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: boolean;
  visualsEnabled?: boolean;
  systemPrompt?: string;
  userContext?: string;
}

/**
 * Chat message response (non-streaming)
 */
export interface ChatResponse {
  success: boolean;
  data: {
    messageId: string;
    conversationId: string;
    role: 'assistant';
    content: {
      blocks: Array<{
        type: 'text' | 'reasoning';
        blockId: string;
        text: string;
      }>;
      tools: unknown[];
      attachments: unknown[];
      visuals: unknown[];
    };
    model: string;
    tokenCount: number;
    createdAt: string;
    isNewConversation: boolean;
    conversationTitle?: string;
  };
  message: string;
}

/**
 * Conversation item
 */
export interface ConversationItem {
  conversationId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Conversation details
 */
export interface ConversationDetails {
  conversation: {
    conversationId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  };
  messages: Array<{
    messageId: string;
    conversationId: string;
    role: 'user' | 'assistant';
    content: {
      blocks?: Array<{
        type: string;
        blockId: string;
        text?: string;
        toolName?: string;
        arguments?: string;
        status?: string;
        result?: unknown;
        error?: string;
        visualType?: string;
        intent?: string;
        state?: unknown;
      }> | string; // API returns string for user messages
    };
    model?: string;
    tokenCount?: number;
    createdAt: string;
  }>;
}

/**
 * Send a chat message with streaming support
 */
export async function sendChatMessage(
  request: ChatRequest,
  conversationId?: string,
  signal?: AbortSignal
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Stream': 'true',
  };

  const body = {
    ...request,
    ...(conversationId ? { conversationId } : {}),
  };

  console.log('[sendChatMessage] Request body:', JSON.stringify(body, null, 2));

  const response = await fetch(CHAT_API_BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Chat API request failed: ${response.status}`);
  }

  return response;
}

/**
 * Send a chat message without streaming
 */
export async function sendChatMessageSync(
  request: ChatRequest,
  conversationId?: string,
  signal?: AbortSignal
): Promise<ChatResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Stream': 'false',
  };

  const body = {
    ...request,
    ...(conversationId ? { conversationId } : {}),
  };

  const response = await fetch(CHAT_API_BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Chat API request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Parse SSE stream events
 */
export function parseSSEEvent(block: string): ChatStreamEvent | null {
  if (!block.trim()) return null;

  const lines = block.split('\n');
  let eventData: ChatStreamEvent | null = null;

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        eventData = JSON.parse(line.slice(6));
      } catch {
        // Skip malformed JSON
        return null;
      }
    }
  }

  return eventData;
}

/**
 * List all conversations
 */
export async function listConversations(): Promise<ConversationItem[]> {
  const response = await fetch(`${CHAT_API_BASE}/conversations`);

  if (!response.ok) {
    throw new Error(`Failed to fetch conversations: ${response.status}`);
  }

  const data = await response.json();
  return data.data?.conversations || [];
}

/**
 * Get conversation details with full message history
 */
export async function getConversation(
  conversationId: string
): Promise<ConversationDetails> {
  const response = await fetch(`${CHAT_API_BASE}/conversations/${conversationId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch conversation: ${response.status}`);
  }

  const data = await response.json();
  return data.data; // Returns {conversation: {...}, messages: [...]}
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const response = await fetch(`${CHAT_API_BASE}/conversations/${conversationId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete conversation: ${response.status}`);
  }
}

/**
 * Update system prompt for a conversation
 */
export async function updateSystemPrompt(
  conversationId: string,
  systemPrompt: string
): Promise<void> {
  const response = await fetch(
    `${CHAT_API_BASE}/conversations/${conversationId}/system-prompt`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ systemPrompt }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update system prompt: ${response.status}`);
  }
}

/**
 * Update user context for a conversation
 */
export async function updateUserContext(
  conversationId: string,
  userContext: string
): Promise<void> {
  const response = await fetch(
    `${CHAT_API_BASE}/conversations/${conversationId}/user-context`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userContext }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update user context: ${response.status}`);
  }
}

/**
 * Helper to read and process SSE stream
 */
export async function* readChatStream(
  response: Response
): AsyncGenerator<ChatStreamEvent, void, undefined> {
  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events (event: type\ndata: json\n\n)
      const eventBlocks = buffer.split('\n\n');
      buffer = eventBlocks.pop() || '';

      for (const block of eventBlocks) {
        const event = parseSSEEvent(block);
        if (event) {
          yield event;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
