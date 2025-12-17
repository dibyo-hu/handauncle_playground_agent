/**
 * Event Utilities
 * Builders for SSE stream events
 */

import { v4 as uuidv4 } from 'uuid';
import {
  MessageStartedEvent,
  MessageCompletedEvent,
  MessageFailedEvent,
  TextBlockStartedEvent,
  TextDeltaEvent,
  TextBlockCompletedEvent,
  ConversationInfoEvent,
  StreamEndEvent,
} from '../interfaces/chat.interface';
import { StreamContextManager } from '../lib/stream.lib';

/**
 * Create message.started event
 */
export function createMessageStartedEvent(
  ctx: StreamContextManager,
  model: string
): MessageStartedEvent {
  return {
    type: 'message.started',
    messageId: ctx.getMessageId(),
    sequence: ctx.nextSequence(),
    payload: {
      role: 'assistant',
      model,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create text.block.started event
 */
export function createTextBlockStartedEvent(
  ctx: StreamContextManager
): TextBlockStartedEvent {
  const blockId = uuidv4();
  ctx.setBlockId(blockId);

  return {
    type: 'text.block.started',
    messageId: ctx.getMessageId(),
    sequence: ctx.nextSequence(),
    payload: {
      blockId,
    },
  };
}

/**
 * Create text.delta event
 */
export function createTextDeltaEvent(
  ctx: StreamContextManager,
  text: string
): TextDeltaEvent {
  return {
    type: 'text.delta',
    messageId: ctx.getMessageId(),
    sequence: ctx.nextSequence(),
    payload: {
      blockId: ctx.getBlockId()!,
      text,
    },
  };
}

/**
 * Create text.block.completed event
 */
export function createTextBlockCompletedEvent(
  ctx: StreamContextManager
): TextBlockCompletedEvent {
  const blockId = ctx.getBlockId()!;
  ctx.clearBlockId();

  return {
    type: 'text.block.completed',
    messageId: ctx.getMessageId(),
    sequence: ctx.nextSequence(),
    payload: {
      blockId,
    },
  };
}

/**
 * Create message.completed event
 */
export function createMessageCompletedEvent(
  ctx: StreamContextManager,
  tokenCount: number,
  finishReason: string = 'stop'
): MessageCompletedEvent {
  return {
    type: 'message.completed',
    messageId: ctx.getMessageId(),
    sequence: ctx.nextSequence(),
    payload: {
      tokenCount,
      status: 'success',
      finishReason,
    },
  };
}

/**
 * Create message.failed event
 */
export function createMessageFailedEvent(
  ctx: StreamContextManager,
  error: string,
  code?: string
): MessageFailedEvent {
  return {
    type: 'message.failed',
    messageId: ctx.getMessageId(),
    sequence: ctx.nextSequence(),
    payload: {
      error,
      code,
    },
  };
}

/**
 * Create conversation.info event
 */
export function createConversationInfoEvent(
  ctx: StreamContextManager,
  conversationId: string,
  isNewConversation: boolean,
  conversationTitle: string
): ConversationInfoEvent {
  return {
    type: 'conversation.info',
    messageId: ctx.getMessageId(),
    sequence: ctx.nextSequence(),
    payload: {
      conversationId,
      isNewConversation,
      conversationTitle,
    },
  };
}

/**
 * Create stream.end event
 */
export function createStreamEndEvent(ctx: StreamContextManager): StreamEndEvent {
  return {
    type: 'stream.end',
    messageId: ctx.getMessageId(),
    sequence: ctx.nextSequence(),
    payload: {},
  };
}
