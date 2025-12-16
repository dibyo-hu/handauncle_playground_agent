/**
 * LAYER 4 - Validation + Repair Loop
 *
 * Purpose: Ensure LLM output strictly conforms to schema and business rules.
 * This layer implements a repair loop that retries if validation fails.
 *
 * Design decisions:
 * - Uses Zod for schema validation
 * - Custom business rule validation (amount constraints, allowed instruments)
 * - Maximum 2 repair attempts before hard failure
 * - All validation errors are collected and fed back to LLM
 */

import { z } from 'zod';
import OpenAI from 'openai';
import {
  RecommendationOutput,
  RecommendationOutputSchema,
  UserFinanceContext,
  WebSearchResult,
} from '../types/schemas';
import { computeDerivedMetrics } from './context';
import { generateRecommendation, retryRecommendation } from './recommender';
import { logger } from '../utils/logger';

const MAX_REPAIR_ATTEMPTS = 2;

// Forbidden instrument patterns
const FORBIDDEN_PATTERNS = [
  /stock/i,
  /share/i,
  /crypto/i,
  /bitcoin/i,
  /ethereum/i,
  /option/i,
  /future/i,
  /derivative/i,
  /nifty\s*50\s*(call|put)/i,
  /f\s*&\s*o/i,
];

/**
 * Validate schema using Zod
 */
function validateSchema(data: unknown): {
  valid: boolean;
  errors: string[];
  data?: RecommendationOutput;
} {
  try {
    const validated = RecommendationOutputSchema.parse(data);
    return { valid: true, errors: [], data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(
        e => `Schema error at ${e.path.join('.')}: ${e.message}`
      );
      return { valid: false, errors };
    }
    return { valid: false, errors: ['Unknown schema validation error'] };
  }
}

/**
 * Validate business rules beyond schema
 */
function validateBusinessRules(
  data: RecommendationOutput,
  userContext: UserFinanceContext,
  needsRecommendations: boolean
): string[] {
  const errors: string[] = [];

  // If no recommendations needed/provided, skip recommendation-specific validation
  if (!needsRecommendations || !data.recommendations || data.recommendations.length === 0) {
    return errors;
  }

  const metrics = computeDerivedMetrics(userContext);

  // Calculate totals by action type
  let totalBuy = 0;
  let totalSell = 0;

  data.recommendations.forEach(rec => {
    if (rec.action === 'BUY') {
      totalBuy += rec.amount;
    } else if (rec.action === 'SELL') {
      totalSell += rec.amount;
    }
    // HOLD doesn't affect cash flow
  });

  // Rule 1: Net NEW money needed (BUY - SELL) must not exceed monthly surplus
  // This allows rebalancing where sells fund buys
  const netNewMoneyNeeded = totalBuy - totalSell;

  if (netNewMoneyNeeded > metrics.monthly_surplus) {
    errors.push(
      `Net new investment needed (₹${netNewMoneyNeeded} = ₹${totalBuy} buy - ₹${totalSell} sell) exceeds monthly surplus (₹${metrics.monthly_surplus})`
    );
  }

  // Rule 2: Amounts must be valid based on action type
  // - BUY: amount > 0 (how much to invest)
  // - SELL: amount > 0 (how much to sell)
  // - HOLD: amount >= 0 (can be 0, represents no new action)
  data.recommendations.forEach((rec, index) => {
    if (rec.action === 'HOLD') {
      if (rec.amount < 0) {
        errors.push(
          `Recommendation ${index + 1}: HOLD amount cannot be negative (got ${rec.amount})`
        );
      }
    } else {
      // BUY or SELL must have positive amount
      if (rec.amount <= 0) {
        errors.push(
          `Recommendation ${index + 1}: ${rec.action} amount must be positive (got ${rec.amount})`
        );
      }
    }
  });

  // Rule 3: Check for forbidden instruments
  data.recommendations.forEach((rec, index) => {
    const name = rec.instrument.name.toLowerCase();
    const rationale = rec.rationale.toLowerCase();

    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(name) || pattern.test(rationale)) {
        errors.push(
          `Recommendation ${index + 1}: Contains forbidden instrument type "${rec.instrument.name}"`
        );
        break;
      }
    }
  });

  // Rule 4: Validate instrument categories
  const allowedCategories = ['mutual_fund', 'index_fund', 'debt_fund', 'liquid_fund', 'elss'];
  data.recommendations.forEach((rec, index) => {
    if (!allowedCategories.includes(rec.instrument.category)) {
      errors.push(
        `Recommendation ${index + 1}: Invalid category "${rec.instrument.category}". Allowed: ${allowedCategories.join(', ')}`
      );
    }
  });

  // Rule 5: Execution must always be disabled
  data.recommendations.forEach((rec, index) => {
    if (rec.execution.enabled !== false) {
      errors.push(
        `Recommendation ${index + 1}: Execution must be disabled`
      );
    }
  });

  return errors;
}

/**
 * Full validation combining schema and business rules
 */
export function validateRecommendation(
  data: unknown,
  userContext: UserFinanceContext,
  needsRecommendations: boolean = true
): {
  valid: boolean;
  errors: string[];
  data?: RecommendationOutput;
} {
  logger.validator('Starting validation', { needsRecommendations });

  // Step 1: Schema validation
  const schemaResult = validateSchema(data);
  if (!schemaResult.valid) {
    logger.validator('Schema validation failed', { errors: schemaResult.errors });
    return schemaResult;
  }

  // Step 2: Business rule validation (conditional based on needsRecommendations)
  const businessErrors = validateBusinessRules(schemaResult.data!, userContext, needsRecommendations);
  if (businessErrors.length > 0) {
    logger.validator('Business rule validation failed', { errors: businessErrors });
    return {
      valid: false,
      errors: businessErrors,
      data: schemaResult.data,
    };
  }

  logger.validator('Validation passed');
  return { valid: true, errors: [], data: schemaResult.data };
}

/**
 * Generate and validate response with repair loop
 * This is the main entry point for the validation layer
 */
export async function generateValidatedRecommendation(
  openai: OpenAI,
  query: string,
  userContext: UserFinanceContext,
  webSearchResult: WebSearchResult | undefined, // Optional - only for queries needing fund data
  needsRecommendations: boolean, // Whether to generate BUY/SELL/HOLD table
  customSystemPrompt?: string
): Promise<{
  success: boolean;
  data?: RecommendationOutput;
  attempts: number;
  errors?: string[];
}> {
  logger.validator('Starting validated response generation', {
    has_web_search: !!webSearchResult,
    needs_recommendations: needsRecommendations,
  });

  let lastOutput = '';
  let lastErrors: string[] = [];

  for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
    logger.validator(`Attempt ${attempt + 1} of ${MAX_REPAIR_ATTEMPTS + 1}`);

    try {
      let result: { raw: string; parsed: unknown };

      if (attempt === 0) {
        // First attempt: normal generation
        result = await generateRecommendation(
          openai,
          query,
          userContext,
          webSearchResult,
          needsRecommendations,
          customSystemPrompt
        );
      } else {
        // Repair attempt: include previous errors
        result = await retryRecommendation(
          openai,
          query,
          userContext,
          webSearchResult,
          lastOutput,
          lastErrors,
          needsRecommendations,
          customSystemPrompt
        );
      }

      lastOutput = result.raw;

      // Validate the output
      const validation = validateRecommendation(result.parsed, userContext, needsRecommendations);

      if (validation.valid) {
        logger.validator('Validation successful', {
          attempt: attempt + 1,
          recommendations: validation.data!.recommendations?.length ?? 0,
        });

        return {
          success: true,
          data: validation.data,
          attempts: attempt + 1,
        };
      }

      // Validation failed, prepare for retry
      lastErrors = validation.errors;
      logger.validator('Validation failed, preparing retry', {
        attempt: attempt + 1,
        errors: lastErrors,
      });
    } catch (error) {
      logger.error('LAYER-4:VALIDATOR', `Attempt ${attempt + 1} threw error`, {
        error,
      });
      lastErrors = [error instanceof Error ? error.message : 'Unknown error'];
    }
  }

  // All attempts failed
  logger.error('LAYER-4:VALIDATOR', 'All validation attempts exhausted', {
    attempts: MAX_REPAIR_ATTEMPTS + 1,
    last_errors: lastErrors,
  });

  return {
    success: false,
    attempts: MAX_REPAIR_ATTEMPTS + 1,
    errors: lastErrors,
  };
}
