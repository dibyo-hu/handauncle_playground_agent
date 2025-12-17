/**
 * Server Entry Point
 *
 * Express server setup with CORS, logging, and route registration.
 */

import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { createApiRouter } from './routes/api';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Validate required environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = parseInt(process.env.PORT || '3001', 10);

if (!OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP', `${req.method} ${req.path}`, {
      status: res.statusCode,
      duration_ms: duration,
    });
  });

  next();
});

// Mount API routes
// Using OpenAI native web search (no Tavily)
const apiRouter = createApiRouter({
  openai,
});

app.use('/api', apiRouter);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'Agentic Finance Playground API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      default_context: 'GET /api/default-context',
      recommend: 'POST /api/recommend',
      logs: 'GET /api/logs',
    },
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    type: 'error',
    error: 'Not found',
    layer: 'API',
  });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('SERVER', 'Unhandled error', { error: err.message, stack: err.stack });

  res.status(500).json({
    type: 'error',
    error: 'Internal server error',
    layer: 'SERVER',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║          AGENTIC FINANCE PLAYGROUND - BACKEND                 ║
╠═══════════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}                     ║
║                                                               ║
║  Finance Advisor Endpoints:                                   ║
║    GET  /api/health           - Health check                  ║
║    GET  /api/default-context  - Get default user context      ║
║    GET  /api/default-prompt   - Get default system prompt     ║
║    POST /api/recommend        - Process query (non-streaming) ║
║    POST /api/recommend/stream - Process query (SSE streaming) ║
║                                                               ║
║  Tool Playground Endpoints:                                   ║
║    GET  /api/free-chat/default-prompt - Get default prompt    ║
║    POST /api/free-chat/stream         - Free chat (streaming) ║
║                                                               ║
║    GET  /api/logs             - View debug logs               ║
║                                                               ║
║  Environment:                                                 ║
║    OpenAI API: ${OPENAI_API_KEY ? '✓ Configured' : '✗ Missing'}                                 ║
║    Web Search: OpenAI Native (no Tavily required)             ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
