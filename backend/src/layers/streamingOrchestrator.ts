/**
 * STREAMING ORCHESTRATOR - Pipeline Coordinator with SSE Support
 *
 * Purpose: Coordinate the flow through all layers with real-time streaming.
 * Sends Server-Sent Events for progress updates and token streaming.
 */

import OpenAI from 'openai';
import { Response } from 'express';
import {
  UserFinanceContext,
  PlaygroundResponse,
  ClassificationResult,
  WebSearchResult,
} from '../types/schemas';
import { classifyQuery } from './classifier';
import { validateUserContext } from './context';
import { performWebSearch } from './webSearch';
import { generateStreamingRecommendation, StreamCallbacks } from './streamingRecommender';
import { validateRecommendation } from './validator';
import { logger } from '../utils/logger';

export interface StreamingOrchestratorConfig {
  openai: OpenAI;
}

/**
 * Send SSE event to client
 */
function sendSSE(res: Response, type: string, data: Record<string, unknown>) {
  res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
}

/**
 * Generate rejection message
 */
function generateRejectionMessage(classification: ClassificationResult): string {
  const baseMessage =
    "Welcome to the Machine! I'm Handa Uncle, and I can only help with Indian personal finance topics — mutual funds, SIPs, and investment recommendations.";

  const suggestions = [
    "Try asking about:",
    "- Which mutual fund should I invest in?",
    "- How should I allocate my SIP?",
    "- Is my portfolio balanced?",
    "- How to save tax with ELSS?",
    "- Should I increase my emergency fund?",
  ];

  return `${baseMessage}\n\n${classification.reason}\n\n${suggestions.join('\n')}`;
}

/**
 * Main streaming orchestrator function
 * Processes a query through all layers with streaming response
 */
export async function processQueryStreaming(
  config: StreamingOrchestratorConfig,
  res: Response,
  query: string,
  userContext: UserFinanceContext,
  customSystemPrompt?: string,
  customOutputFormat?: string
): Promise<void> {
  const startTime = Date.now();

  logger.info('STREAMING_ORCHESTRATOR', 'Starting streaming query processing', {
    query,
    has_custom_prompt: !!customSystemPrompt,
  });

  try {
    // ==========================================
    // LAYER 0: Query Classification
    // ==========================================
    sendSSE(res, 'progress', { stage: 'classification', message: 'Analyzing your query...' });

    const classification = await classifyQuery(config.openai, query);

    sendSSE(res, 'classification', { data: classification });

    // Early exit if not Indian finance related
    if (!classification.is_indian_finance) {
      const rejectionMessage = generateRejectionMessage(classification);

      // Stream the rejection message token by token for effect
      const words = rejectionMessage.split(' ');
      for (const word of words) {
        sendSSE(res, 'token', { content: word + ' ' });
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      const response: PlaygroundResponse = {
        type: 'rejection',
        classification,
        message: rejectionMessage,
      };

      sendSSE(res, 'done', { data: response });
      return;
    }

    // ==========================================
    // LAYER 1: User Context Validation
    // ==========================================
    sendSSE(res, 'progress', { stage: 'context', message: 'Reviewing your financial profile...' });

    const contextValidation = validateUserContext(userContext);
    if (!contextValidation.valid) {
      const response: PlaygroundResponse = {
        type: 'error',
        error: 'Invalid user context',
        layer: 'LAYER-1:CONTEXT',
        details: contextValidation.errors,
      };

      sendSSE(res, 'error', { error: response.error, data: response });
      return;
    }

    // ==========================================
    // LAYER 2: Web Search (CONDITIONAL)
    // ==========================================
    let webSearchResult: WebSearchResult | undefined;

    if (classification.needs_web_search) {
      sendSSE(res, 'progress', { stage: 'web_search', message: 'Searching for relevant fund data...' });

      webSearchResult = await performWebSearch(config.openai, query);

      sendSSE(res, 'web_search', {
        data: {
          funds_found: webSearchResult.funds.length,
          sources: webSearchResult.source_urls.length,
        }
      });
    } else {
      sendSSE(res, 'progress', { stage: 'web_search_skip', message: 'No web search needed for this query' });
    }

    // ==========================================
    // LAYER 3+4: Response Generation + Validation (STREAMING)
    // ==========================================
    sendSSE(res, 'progress', { stage: 'generating', message: 'Crafting your personalized advice...' });

    const callbacks: StreamCallbacks = {
      onToken: (token: string) => {
        sendSSE(res, 'token', { content: token });
      },
    };

    const recommendationResult = await generateStreamingRecommendation(
      config.openai,
      query,
      contextValidation.context,
      webSearchResult,
      classification.needs_recommendations,
      callbacks,
      customSystemPrompt,
      customOutputFormat
    );

    // Validate the output
    const validation = validateRecommendation(
      recommendationResult.parsed,
      userContext,
      classification.needs_recommendations
    );

    if (!validation.valid) {
      // If validation fails, we still got streamed content, just note the error
      logger.warn('STREAMING_ORCHESTRATOR', 'Validation failed after streaming', {
        errors: validation.errors,
      });

      const response: PlaygroundResponse = {
        type: 'error',
        error: 'Response validation failed',
        layer: 'LAYER-4:VALIDATOR',
        details: validation.errors,
      };

      sendSSE(res, 'error', { error: response.error, data: response });
      return;
    }

    // ==========================================
    // SUCCESS: Send final response
    // ==========================================
    const elapsed = Date.now() - startTime;
    logger.info('STREAMING_ORCHESTRATOR', 'Query processing complete', {
      elapsed_ms: elapsed,
      recommendations_count: validation.data!.recommendations?.length ?? 0,
    });

    const response: PlaygroundResponse = {
      type: 'success',
      classification,
      web_search: webSearchResult,
      recommendation: validation.data!,
      validation_attempts: 1,
    };

    sendSSE(res, 'done', { data: response });
  } catch (error) {
    logger.error('STREAMING_ORCHESTRATOR', 'Unexpected error in pipeline', { error });

    const response: PlaygroundResponse = {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      layer: 'ORCHESTRATOR',
      details: error,
    };

    sendSSE(res, 'error', { error: response.error, data: response });
  }
}
