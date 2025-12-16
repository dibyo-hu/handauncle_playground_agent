/**
 * API Routes
 *
 * Exposes the agentic playground functionality via REST API.
 * All routes are prefixed with /api
 */

import { Router, Request, Response } from 'express';
import { PlaygroundRequestSchema } from '../types/schemas';
import { DEFAULT_USER_CONTEXT, computeDerivedMetrics } from '../layers/context';
import { processQuery, OrchestratorConfig } from '../layers/orchestrator';
import { DEFAULT_SYSTEM_PROMPT } from '../layers/recommender';
import { logger } from '../utils/logger';

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

      const { query, user_context, system_prompt } = parseResult.data;

      // Process through orchestrator with optional custom system prompt
      const response = await processQuery(config, query, user_context, system_prompt);

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
