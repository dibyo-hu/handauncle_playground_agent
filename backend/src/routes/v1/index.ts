/**
 * V1 API Routes
 * Route mounting for v1 API
 */

import { Router } from 'express';
import OpenAI from 'openai';
import { createChatRouter } from './chat.route';

export function createV1Router(openai: OpenAI): Router {
  const router = Router();

  // Mount chat routes at /v1/chat
  router.use('/chat', createChatRouter(openai));

  return router;
}
