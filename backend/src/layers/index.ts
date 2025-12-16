/**
 * Layer exports
 * Central export point for all agentic layers
 */

export { classifyQuery } from './classifier';
export {
  DEFAULT_USER_CONTEXT,
  validateUserContext,
  formatContextForLLM,
  computeDerivedMetrics,
} from './context';
export {
  shouldPerformWebSearch,
  performWebSearch,
  formatWebSearchForLLM,
} from './webSearch';
export { generateRecommendation, retryRecommendation } from './recommender';
export { validateRecommendation, generateValidatedRecommendation } from './validator';
export { processQuery } from './orchestrator';

export type { OrchestratorConfig } from './orchestrator';
export type { DerivedMetrics } from './context';
