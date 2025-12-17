/**
 * Message Utilities
 * Transformations and formatting for chat messages
 */

import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, MessageContent, TextBlock } from '../interfaces/chat.interface';

/**
 * Create a user message
 */
export function createUserMessage(
  conversationId: string,
  text: string,
  attachments?: string[]
): ChatMessage {
  const textBlock: TextBlock = {
    type: 'text',
    blockId: uuidv4(),
    text,
  };

  return {
    messageId: uuidv4(),
    conversationId,
    role: 'user',
    content: {
      blocks: [textBlock],
      tools: [],
      attachments: attachments || [],
      visuals: [],
    },
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create an assistant message
 */
export function createAssistantMessage(
  conversationId: string,
  text: string,
  model: string,
  tokenCount: number
): ChatMessage {
  const textBlock: TextBlock = {
    type: 'text',
    blockId: uuidv4(),
    text,
  };

  return {
    messageId: uuidv4(),
    conversationId,
    role: 'assistant',
    content: {
      blocks: [textBlock],
      tools: [],
      attachments: [],
      visuals: [],
    },
    model,
    tokenCount,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate conversation title from first message
 */
export function generateConversationTitle(firstMessage: string): string {
  // Take first 50 characters or up to first newline
  const title = firstMessage.split('\n')[0].slice(0, 50);
  return title.length < firstMessage.length ? `${title}...` : title;
}

/**
 * Extract text content from message
 */
export function extractTextContent(message: ChatMessage): string {
  return message.content.blocks
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

/**
 * Create empty message content
 */
export function createEmptyContent(): MessageContent {
  return {
    blocks: [],
    tools: [],
    attachments: [],
    visuals: [],
  };
}
