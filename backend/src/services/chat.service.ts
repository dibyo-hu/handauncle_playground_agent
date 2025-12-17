/**
 * Chat Service
 * Business logic with in-memory storage for conversations
 */

import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { Response } from 'express';
import {
  ChatRequest,
  ChatMessage,
  Conversation,
  ConversationListItem,
  ChatResponse,
  TextBlock,
} from '../interfaces/chat.interface';
import {
  initSSEResponse,
  sendSSEEvent,
  endSSEStream,
  createKeepalive,
  StreamContextManager,
} from '../lib/stream.lib';
import {
  buildOpenAIMessages,
  createStreamingCompletion,
  createCompletion,
  estimateTokens,
} from '../lib/chat.lib';
import {
  createUserMessage,
  createAssistantMessage,
  generateConversationTitle,
} from '../utils/message.util';
import {
  createMessageStartedEvent,
  createTextBlockStartedEvent,
  createTextDeltaEvent,
  createTextBlockCompletedEvent,
  createMessageCompletedEvent,
  createMessageFailedEvent,
  createConversationInfoEvent,
  createStreamEndEvent,
} from '../utils/event.util';
import { logger } from '../utils/logger';

// In-memory storage
const conversations = new Map<string, Conversation>();

/**
 * Get or create a conversation
 */
function getOrCreateConversation(
  conversationId: string | undefined,
  model: string
): { conversation: Conversation; isNew: boolean } {
  if (conversationId && conversations.has(conversationId)) {
    return {
      conversation: conversations.get(conversationId)!,
      isNew: false,
    };
  }

  // Create new conversation
  const newId = uuidv4();
  const newConversation: Conversation = {
    id: newId,
    title: '',
    messages: [],
    model,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  conversations.set(newId, newConversation);

  return {
    conversation: newConversation,
    isNew: true,
  };
}

/**
 * Process chat request with streaming
 */
export async function processChatStreaming(
  openai: OpenAI,
  res: Response,
  request: ChatRequest,
  conversationId?: string
): Promise<void> {
  const model = request.model || 'gpt-4o';
  const messageId = uuidv4();

  logger.info('CHAT_SERVICE', 'Processing streaming chat request', {
    conversationId,
    model,
    messageLength: request.message.length,
  });

  try {
    // Get or create conversation
    const { conversation, isNew } = getOrCreateConversation(conversationId, model);

    // Add user message to conversation
    const userMessage = createUserMessage(
      conversation.id,
      request.message,
      request.attachments
    );
    conversation.messages.push(userMessage);

    // Set title from first message
    if (isNew) {
      conversation.title = generateConversationTitle(request.message);
    }

    // Set response headers
    res.setHeader('X-Conversation-Id', conversation.id);
    res.setHeader('X-Is-New-Conversation', isNew.toString());
    if (isNew) {
      res.setHeader('X-Conversation-Title', conversation.title);
    }

    // Initialize SSE
    initSSEResponse(res);

    // Create stream context
    const ctx = new StreamContextManager(messageId);

    // Start keepalive
    const keepaliveInterval = createKeepalive(res, messageId, () => ctx.nextSequence());

    try {
      // Send message.started
      sendSSEEvent(res, createMessageStartedEvent(ctx, model));

      // Send text.block.started
      sendSSEEvent(res, createTextBlockStartedEvent(ctx));

      // Build messages for OpenAI
      const openAIMessages = buildOpenAIMessages(conversation.messages);

      // Stream completion
      const stream = await createStreamingCompletion(openai, openAIMessages, {
        model,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      });

      let fullText = '';
      let finishReason = 'stop';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          sendSSEEvent(res, createTextDeltaEvent(ctx, delta));
        }

        if (chunk.choices[0]?.finish_reason) {
          finishReason = chunk.choices[0].finish_reason;
        }
      }

      // Send text.block.completed
      sendSSEEvent(res, createTextBlockCompletedEvent(ctx));

      // Calculate tokens
      const tokenCount = estimateTokens(fullText);

      // Send message.completed
      sendSSEEvent(res, createMessageCompletedEvent(ctx, tokenCount, finishReason));

      // Add assistant message to conversation
      const assistantMessage = createAssistantMessage(
        conversation.id,
        fullText,
        model,
        tokenCount
      );
      conversation.messages.push(assistantMessage);
      conversation.updatedAt = new Date().toISOString();

      // Send conversation.info
      sendSSEEvent(
        res,
        createConversationInfoEvent(ctx, conversation.id, isNew, conversation.title)
      );

      // Send stream.end
      sendSSEEvent(res, createStreamEndEvent(ctx));

      logger.info('CHAT_SERVICE', 'Streaming chat complete', {
        conversationId: conversation.id,
        tokenCount,
        messagesInConversation: conversation.messages.length,
      });
    } finally {
      clearInterval(keepaliveInterval);
    }
  } catch (error) {
    logger.error('CHAT_SERVICE', 'Streaming chat failed', { error });

    // Try to send error event if possible
    try {
      const ctx = new StreamContextManager(messageId);
      sendSSEEvent(
        res,
        createMessageFailedEvent(
          ctx,
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
      sendSSEEvent(res, createStreamEndEvent(ctx));
    } catch {
      // Ignore if we can't send
    }
  } finally {
    endSSEStream(res);
  }
}

/**
 * Process chat request without streaming
 */
export async function processChatNonStreaming(
  openai: OpenAI,
  request: ChatRequest,
  conversationId?: string
): Promise<ChatResponse> {
  const model = request.model || 'gpt-4o';

  logger.info('CHAT_SERVICE', 'Processing non-streaming chat request', {
    conversationId,
    model,
    messageLength: request.message.length,
  });

  // Get or create conversation
  const { conversation, isNew } = getOrCreateConversation(conversationId, model);

  // Add user message to conversation
  const userMessage = createUserMessage(
    conversation.id,
    request.message,
    request.attachments
  );
  conversation.messages.push(userMessage);

  // Set title from first message
  if (isNew) {
    conversation.title = generateConversationTitle(request.message);
  }

  // Build messages for OpenAI
  const openAIMessages = buildOpenAIMessages(conversation.messages);

  // Get completion
  const completion = await createCompletion(openai, openAIMessages, {
    model,
    temperature: request.temperature,
    maxTokens: request.maxTokens,
  });

  const content = completion.choices[0]?.message?.content || '';
  const tokenCount = completion.usage?.completion_tokens || estimateTokens(content);

  // Add assistant message to conversation
  const assistantMessage = createAssistantMessage(
    conversation.id,
    content,
    model,
    tokenCount
  );
  conversation.messages.push(assistantMessage);
  conversation.updatedAt = new Date().toISOString();

  logger.info('CHAT_SERVICE', 'Non-streaming chat complete', {
    conversationId: conversation.id,
    tokenCount,
    messagesInConversation: conversation.messages.length,
  });

  const textBlock: TextBlock = {
    type: 'text',
    blockId: uuidv4(),
    text: content,
  };

  return {
    success: true,
    data: {
      messageId: assistantMessage.messageId,
      conversationId: conversation.id,
      role: 'assistant',
      content: {
        blocks: [textBlock],
        tools: [],
        attachments: [],
        visuals: [],
      },
      model,
      tokenCount,
      createdAt: assistantMessage.createdAt,
      isNewConversation: isNew,
      conversationTitle: conversation.title,
    },
    message: 'Message sent successfully',
  };
}

/**
 * Get all conversations
 */
export function getAllConversations(): ConversationListItem[] {
  const list: ConversationListItem[] = [];

  conversations.forEach((conv) => {
    list.push({
      id: conv.id,
      title: conv.title,
      messageCount: conv.messages.length,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    });
  });

  // Sort by updatedAt descending
  list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return list;
}

/**
 * Get a single conversation
 */
export function getConversation(
  conversationId: string
): { conversation: Conversation } | null {
  const conversation = conversations.get(conversationId);
  if (!conversation) {
    return null;
  }

  return { conversation };
}

/**
 * Delete a conversation
 */
export function deleteConversation(conversationId: string): boolean {
  return conversations.delete(conversationId);
}
