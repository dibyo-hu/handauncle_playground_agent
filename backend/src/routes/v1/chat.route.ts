/**
 * Chat Routes
 * Route definitions for the Chat API v1
 */

import { Router } from 'express';
import OpenAI from 'openai';
import {
  createChatHandler,
  listConversationsHandler,
  getConversationHandler,
  deleteConversationHandler,
} from '../../controllers/chat.controller';

export function createChatRouter(openai: OpenAI): Router {
  const router = Router();

  /**
   * POST /v1/chat
   * Main chat endpoint - auto-creates conversation, streams by default
   */
  router.post('/', createChatHandler(openai));

  /**
   * GET /v1/chat/conversations
   * List all conversations
   */
  router.get('/conversations', listConversationsHandler);

  /**
   * GET /v1/chat/conversations/:id
   * Get conversation details with full message history
   */
  router.get('/conversations/:id', getConversationHandler);

  /**
   * DELETE /v1/chat/conversations/:id
   * Delete a conversation
   */
  router.delete('/conversations/:id', deleteConversationHandler);

  return router;
}
