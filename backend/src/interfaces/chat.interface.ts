/**
 * Chat API Interfaces
 * All TypeScript types, events, and interfaces for the Chat API
 */

// ============================================
// Request/Response Types
// ============================================

export interface ChatRequest {
  message: string;
  attachments?: string[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: boolean;
  visualsEnabled?: boolean;
}

export interface TextBlock {
  type: 'text';
  blockId: string;
  text: string;
}

export interface MessageContent {
  blocks: TextBlock[];
  tools: unknown[];
  attachments: unknown[];
  visuals: unknown[];
}

export interface ChatMessage {
  messageId: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: MessageContent;
  model?: string;
  tokenCount?: number;
  createdAt: string;
}

export interface ChatResponse {
  success: boolean;
  data: {
    messageId: string;
    conversationId: string;
    role: 'assistant';
    content: MessageContent;
    model: string;
    tokenCount: number;
    createdAt: string;
    isNewConversation: boolean;
    conversationTitle: string;
  };
  message: string;
}

// ============================================
// Conversation Types
// ============================================

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationListItem {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Stream Event Types
// ============================================

export type StreamEventType =
  // Message lifecycle
  | 'message.started'
  | 'message.completed'
  | 'message.failed'
  // Text streaming
  | 'text.block.started'
  | 'text.delta'
  | 'text.block.completed'
  // Reasoning (Extended thinking)
  | 'reasoning.started'
  | 'reasoning.delta'
  | 'reasoning.completed'
  // Tool calls
  | 'tool.call.started'
  | 'tool.call.arguments'
  | 'tool.call.completed'
  | 'tool.call.failed'
  // Visuals
  | 'visual.intent'
  | 'visual.block.created'
  | 'visual.patch'
  | 'visual.completed'
  // Control
  | 'conversation.info'
  | 'stream.keepalive'
  | 'stream.end';

export interface BaseStreamEvent {
  type: StreamEventType;
  messageId: string;
  sequence: number;
}

export interface MessageStartedEvent extends BaseStreamEvent {
  type: 'message.started';
  payload: {
    role: 'assistant';
    model: string;
    timestamp: string;
  };
}

export interface MessageCompletedEvent extends BaseStreamEvent {
  type: 'message.completed';
  payload: {
    tokenCount: number;
    status: 'success' | 'error';
    finishReason: string;
  };
}

export interface MessageFailedEvent extends BaseStreamEvent {
  type: 'message.failed';
  payload: {
    error: string;
    code?: string;
  };
}

export interface TextBlockStartedEvent extends BaseStreamEvent {
  type: 'text.block.started';
  payload: {
    blockId: string;
  };
}

export interface TextDeltaEvent extends BaseStreamEvent {
  type: 'text.delta';
  payload: {
    blockId: string;
    text: string;
  };
}

export interface TextBlockCompletedEvent extends BaseStreamEvent {
  type: 'text.block.completed';
  payload: {
    blockId: string;
  };
}

export interface ConversationInfoEvent extends BaseStreamEvent {
  type: 'conversation.info';
  payload: {
    conversationId: string;
    isNewConversation: boolean;
    conversationTitle: string;
  };
}

export interface StreamKeepaliveEvent extends BaseStreamEvent {
  type: 'stream.keepalive';
  payload: Record<string, never>;
}

export interface StreamEndEvent extends BaseStreamEvent {
  type: 'stream.end';
  payload: Record<string, never>;
}

export type StreamEvent =
  | MessageStartedEvent
  | MessageCompletedEvent
  | MessageFailedEvent
  | TextBlockStartedEvent
  | TextDeltaEvent
  | TextBlockCompletedEvent
  | ConversationInfoEvent
  | StreamKeepaliveEvent
  | StreamEndEvent;

// ============================================
// Stream Context
// ============================================

export interface StreamContext {
  messageId: string;
  sequence: number;
  blockId: string | null;
}
