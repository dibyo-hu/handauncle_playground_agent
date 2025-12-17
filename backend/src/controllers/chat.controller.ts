/**
 * Chat Controller
 * HTTP handlers for chat endpoints
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import OpenAI from 'openai';
import {
  processChatStreaming,
  processChatNonStreaming,
  getAllConversations,
  getConversation,
  deleteConversation,
} from '../services/chat.service';
import { logger } from '../utils/logger';

// Request validation schema
const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  attachments: z.array(z.string()).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  tools: z.boolean().optional(),
  visualsEnabled: z.boolean().optional(),
});

/**
 * POST /v1/chat
 * Main chat endpoint - handles both streaming and non-streaming
 */
export function createChatHandler(openai: OpenAI) {
  return async (req: Request, res: Response) => {
    try {
      // Parse headers
      const conversationId = req.headers['x-conversation-id'] as string | undefined;
      const streamHeader = req.headers['x-stream'] as string | undefined;
      const shouldStream = streamHeader?.toLowerCase() !== 'false';

      logger.info('CHAT_CONTROLLER', 'Received chat request', {
        conversationId,
        stream: shouldStream,
        bodySize: JSON.stringify(req.body).length,
      });

      // Validate request body
      const parseResult = ChatRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        logger.warn('CHAT_CONTROLLER', 'Invalid request body', {
          errors: parseResult.error.errors,
        });

        return res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: parseResult.error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const request = parseResult.data;

      if (shouldStream) {
        // Streaming response
        await processChatStreaming(openai, res, request, conversationId);
      } else {
        // Non-streaming response
        const response = await processChatNonStreaming(openai, request, conversationId);
        return res.json(response);
      }
    } catch (error) {
      logger.error('CHAT_CONTROLLER', 'Unhandled error in chat handler', { error });

      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        });
      }
    }
  };
}

/**
 * GET /v1/chat/conversations
 * List all conversations
 */
export function listConversationsHandler(_req: Request, res: Response) {
  try {
    const conversations = getAllConversations();

    return res.json({
      success: true,
      data: {
        conversations,
        total: conversations.length,
      },
    });
  } catch (error) {
    logger.error('CHAT_CONTROLLER', 'Error listing conversations', { error });

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * GET /v1/chat/conversations/:id
 * Get a single conversation with messages
 */
export function getConversationHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = getConversation(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('CHAT_CONTROLLER', 'Error getting conversation', { error });

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * DELETE /v1/chat/conversations/:id
 * Delete a conversation
 */
export function deleteConversationHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const deleted = deleteConversation(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    return res.json({
      success: true,
      message: 'Conversation deleted successfully',
    });
  } catch (error) {
    logger.error('CHAT_CONTROLLER', 'Error deleting conversation', { error });

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
