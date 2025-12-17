/**
 * API Routes
 *
 * Exposes the agentic playground functionality via REST API.
 * All routes are prefixed with /api
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PlaygroundRequestSchema } from '../types/schemas';
import { DEFAULT_USER_CONTEXT, computeDerivedMetrics } from '../layers/context';
import { processQuery, OrchestratorConfig } from '../layers/orchestrator';
import { processQueryStreaming, StreamingOrchestratorConfig } from '../layers/streamingOrchestrator';
import { processFreeChat, DEFAULT_FREE_CHAT_PROMPT, FreeChatConfig } from '../layers/freeChat';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_OUTPUT_FORMAT_INSTRUCTIONS } from '../layers/recommender';
import { logger } from '../utils/logger';

// Schema for free chat requests
const FreeChatRequestSchema = z.object({
  query: z.string().min(1),
  system_prompt: z.string().optional(),
  context: z.string().optional(),
});

export function createApiRouter(config: OrchestratorConfig): Router {
  const router = Router();

  /**
   * GET /api/health
   * Health check endpoint
   */
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/default-context
   * Returns the default user financial context
   */
  router.get('/default-context', (_req: Request, res: Response) => {
    const metrics = computeDerivedMetrics(DEFAULT_USER_CONTEXT);
    res.json({
      context: DEFAULT_USER_CONTEXT,
      derived_metrics: metrics,
    });
  });

  /**
   * GET /api/default-prompt
   * Returns the default system prompt for experimentation
   */
  router.get('/default-prompt', (_req: Request, res: Response) => {
    res.json({
      system_prompt: DEFAULT_SYSTEM_PROMPT,
    });
  });

  /**
   * GET /api/default-output-format
   * Returns the default output format instructions for experimentation
   */
  router.get('/default-output-format', (_req: Request, res: Response) => {
    res.json({
      output_format: DEFAULT_OUTPUT_FORMAT_INSTRUCTIONS,
    });
  });

  /**
   * GET /api/free-chat/default-prompt
   * Returns the default system prompt for free chat mode
   */
  router.get('/free-chat/default-prompt', (_req: Request, res: Response) => {
    res.json({
      system_prompt: DEFAULT_FREE_CHAT_PROMPT,
    });
  });

  /**
   * POST /api/free-chat/stream
   * Free-form chat endpoint without finance constraints (SSE streaming)
   *
   * Request body:
   * {
   *   "query": string,
   *   "system_prompt": string (optional),
   *   "context": string (optional)
   * }
   */
  router.post('/free-chat/stream', async (req: Request, res: Response) => {
    try {
      logger.info('API', 'Received free chat request', {
        body_size: JSON.stringify(req.body).length,
      });

      // Validate request body
      const parseResult = FreeChatRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        logger.warn('API', 'Invalid free chat request body', {
          errors: parseResult.error.errors,
        });

        return res.status(400).json({
          type: 'error',
          error: 'Invalid request body',
          details: parseResult.error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const { query, system_prompt, context } = parseResult.data;

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      // Cast config for free chat
      const freeChatConfig: FreeChatConfig = {
        openai: config.openai,
      };

      // Process free chat
      await processFreeChat(
        freeChatConfig,
        res,
        query,
        system_prompt,
        context
      );

      res.end();
    } catch (error) {
      logger.error('API', 'Unhandled error in /free-chat/stream', { error });

      if (!res.headersSent) {
        return res.status(500).json({
          type: 'error',
          error: error instanceof Error ? error.message : 'Internal server error',
        });
      }

      res.write(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Internal server error' })}\n\n`);
      res.end();
    }
  });

  /**
   * POST /api/recommend
   * Main endpoint for processing queries
   *
   * Request body:
   * {
   *   "query": string,
   *   "user_context": UserFinanceContext,
   *   "system_prompt": string (optional)
   * }
   *
   * Response:
   * - RejectionResponse (if query not Indian finance)
   * - SuccessResponse (with recommendations)
   * - ErrorResponse (on failure)
   */
  router.post('/recommend', async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      logger.info('API', 'Received recommend request', {
        body_size: JSON.stringify(req.body).length,
        has_custom_prompt: !!req.body.system_prompt,
      });

      // Validate request body
      const parseResult = PlaygroundRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        logger.warn('API', 'Invalid request body', {
          errors: parseResult.error.errors,
        });

        return res.status(400).json({
          type: 'error',
          error: 'Invalid request body',
          layer: 'API',
          details: parseResult.error.errors.map((e: { path: (string | number)[]; message: string }) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const { query, user_context, system_prompt, output_format } = parseResult.data;

      // Process through orchestrator with optional custom prompts
      const response = await processQuery(config, query, user_context, system_prompt, output_format);

      const elapsed = Date.now() - startTime;
      logger.info('API', 'Request complete', {
        elapsed_ms: elapsed,
        response_type: response.type,
      });

      // Set appropriate status code based on response type
      const statusCode = response.type === 'error' ? 500 : 200;
      return res.status(statusCode).json(response);
    } catch (error) {
      logger.error('API', 'Unhandled error in /recommend', { error });

      return res.status(500).json({
        type: 'error',
        error: error instanceof Error ? error.message : 'Internal server error',
        layer: 'API',
      });
    }
  });

  /**
   * POST /api/recommend/stream
   * Streaming endpoint for processing queries with SSE
   *
   * Request body:
   * {
   *   "query": string,
   *   "user_context": UserFinanceContext,
   *   "system_prompt": string (optional),
   *   "output_format": string (optional)
   * }
   *
   * Response: Server-Sent Events stream
   */
  router.post('/recommend/stream', async (req: Request, res: Response) => {
    try {
      logger.info('API', 'Received streaming recommend request', {
        body_size: JSON.stringify(req.body).length,
        has_custom_prompt: !!req.body.system_prompt,
      });

      // Validate request body
      const parseResult = PlaygroundRequestSchema.safeParse(req.body);

      if (!parseResult.success) {
        logger.warn('API', 'Invalid request body for streaming', {
          errors: parseResult.error.errors,
        });

        return res.status(400).json({
          type: 'error',
          error: 'Invalid request body',
          layer: 'API',
          details: parseResult.error.errors.map((e: { path: (string | number)[]; message: string }) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const { query, user_context, system_prompt, output_format } = parseResult.data;

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      res.flushHeaders();

      // Cast config for streaming orchestrator
      const streamingConfig: StreamingOrchestratorConfig = {
        openai: config.openai,
      };

      // Process with streaming
      await processQueryStreaming(
        streamingConfig,
        res,
        query,
        user_context,
        system_prompt,
        output_format
      );

      // End the stream
      res.end();
    } catch (error) {
      logger.error('API', 'Unhandled error in /recommend/stream', { error });

      // If headers haven't been sent, send error response
      if (!res.headersSent) {
        return res.status(500).json({
          type: 'error',
          error: error instanceof Error ? error.message : 'Internal server error',
          layer: 'API',
        });
      }

      // If streaming, send error event
      res.write(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Internal server error' })}\n\n`);
      res.end();
    }
  });

  /**
   * GET /api/logs
   * Returns recent logs for debugging
   */
  router.get('/logs', (_req: Request, res: Response) => {
    res.json({
      logs: logger.getLogs(),
    });
  });

  /**
   * DELETE /api/logs
   * Clears the log buffer
   */
  router.delete('/logs', (_req: Request, res: Response) => {
    logger.clear();
    res.json({ message: 'Logs cleared' });
  });

  return router;
}
