/**
 * ORCHESTRATOR - Pipeline Coordinator
 *
 * Purpose: Coordinate the flow through all layers in the correct order.
 * This is the main entry point that ties all agentic layers together.
 *
 * Pipeline Flow:
 * 1. Layer 0: Classify query → Reject if not Indian finance
 * 2. Layer 1: Inject user context
 * 3. Layer 2: ALWAYS perform web search for grounding (mandatory)
 * 4. Layer 3+4: Generate recommendations with validation loop
 * 5. Return structured response
 */

import OpenAI from 'openai';
import {
  UserFinanceContext,
  PlaygroundResponse,
  ClassificationResult,
  WebSearchResult,
} from '../types/schemas';
import { classifyQuery } from './classifier';
import { validateUserContext } from './context';
import { performWebSearch } from './webSearch';
import { generateValidatedRecommendation } from './validator';
import { logger } from '../utils/logger';

export interface OrchestratorConfig {
  openai: OpenAI;
  // Tavily removed - now using OpenAI native web search
}

/**
 * Main orchestrator function
 * Processes a query through all layers and returns structured response
 */
export async function processQuery(
  config: OrchestratorConfig,
  query: string,
  userContext: UserFinanceContext,
  customSystemPrompt?: string
): Promise<PlaygroundResponse> {
  const startTime = Date.now();

  logger.info('ORCHESTRATOR', 'Starting query processing', {
    query,
    has_custom_prompt: !!customSystemPrompt,
  });

  try {
    // ==========================================
    // LAYER 0: Query Classification
    // ==========================================
    logger.info('ORCHESTRATOR', '>>> Entering Layer 0: Classification');

    const classification = await classifyQuery(config.openai, query);

    // Early exit if not Indian finance related
    if (!classification.is_indian_finance) {
      logger.info('ORCHESTRATOR', 'Query rejected by classifier', classification);

      return {
        type: 'rejection',
        classification,
        message: generateRejectionMessage(classification),
      };
    }

    logger.info('ORCHESTRATOR', 'Classification passed', classification);

    // ==========================================
    // LAYER 1: User Context Validation
    // ==========================================
    logger.info('ORCHESTRATOR', '>>> Entering Layer 1: Context Validation');

    const contextValidation = validateUserContext(userContext);
    if (!contextValidation.valid) {
      logger.error('ORCHESTRATOR', 'Invalid user context', {
        errors: contextValidation.errors,
      });

      return {
        type: 'error',
        error: 'Invalid user context',
        layer: 'LAYER-1:CONTEXT',
        details: contextValidation.errors,
      };
    }

    logger.info('ORCHESTRATOR', 'Context validated successfully');

    // ==========================================
    // LAYER 2: Web Search (MANDATORY for grounding)
    // ==========================================
    logger.info('ORCHESTRATOR', '>>> Entering Layer 2: Web Search (MANDATORY)');

    // Web search is ALWAYS performed - recommendations must be grounded in real data
    // Uses OpenAI native web search (no Tavily)
    const webSearchResult: WebSearchResult = await performWebSearch(
      config.openai,
      query
    );

    logger.info('ORCHESTRATOR', 'Web search complete', {
      funds_found: webSearchResult.funds.length,
      sources: webSearchResult.source_urls.length,
    });

    // Warn if no funds found but continue
    if (webSearchResult.funds.length === 0) {
      logger.warn('ORCHESTRATOR', 'Web search returned no funds - recommendations may be limited');
    }

    // ==========================================
    // LAYER 3+4: Recommendation + Validation
    // ==========================================
    logger.info('ORCHESTRATOR', '>>> Entering Layer 3+4: Recommendation + Validation');

    const recommendationResult = await generateValidatedRecommendation(
      config.openai,
      query,
      contextValidation.context,
      webSearchResult,
      customSystemPrompt
    );

    if (!recommendationResult.success) {
      logger.error('ORCHESTRATOR', 'Recommendation generation failed', {
        attempts: recommendationResult.attempts,
        errors: recommendationResult.errors,
      });

      return {
        type: 'error',
        error: 'Failed to generate valid recommendations after multiple attempts',
        layer: 'LAYER-4:VALIDATOR',
        details: recommendationResult.errors,
      };
    }

    // ==========================================
    // SUCCESS: Return full response
    // ==========================================
    const elapsed = Date.now() - startTime;
    logger.info('ORCHESTRATOR', 'Query processing complete', {
      elapsed_ms: elapsed,
      recommendations_count: recommendationResult.data!.recommendations.length,
      validation_attempts: recommendationResult.attempts,
    });

    return {
      type: 'success',
      classification,
      web_search: webSearchResult, // Always included now
      recommendation: recommendationResult.data!,
      validation_attempts: recommendationResult.attempts,
    };
  } catch (error) {
    logger.error('ORCHESTRATOR', 'Unexpected error in pipeline', { error });

    return {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      layer: 'ORCHESTRATOR',
      details: error,
    };
  }
}

/**
 * Generate user-friendly rejection message
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
