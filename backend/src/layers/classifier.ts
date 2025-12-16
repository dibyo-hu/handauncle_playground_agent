/**
 * LAYER 0 - Query Classifier (LLM-based)
 *
 * Purpose: Classify if query is Indian finance related using LLM intelligence.
 * This is a gate-keeper layer - if classification fails, NO downstream processing occurs.
 *
 * Design decisions:
 * - Purely LLM-based classification (no keyword heuristics)
 * - LLM has better contextual understanding than keyword matching
 * - Uses gpt-4o-mini for cost efficiency
 * - Strict JSON output schema
 */

import OpenAI from 'openai';
import { ClassificationResult, ClassificationResultSchema } from '../types/schemas';
import { logger } from '../utils/logger';

const CLASSIFICATION_SYSTEM_PROMPT = `You are a query classifier for an Indian personal finance recommendation system called "Handa Uncle".

Your job is to determine if the user's query is something Handa Uncle can help with.

**ACCEPT queries related to:**
- Indian mutual funds (equity, debt, hybrid, liquid, index funds, ELSS)
- SIP (Systematic Investment Plans) - starting, modifying, or stopping
- Investment recommendations for Indian investors
- Portfolio review and rebalancing
- Tax-saving investments (Section 80C, ELSS)
- Emergency fund planning
- Goal-based investing (retirement, child education, home, etc.)
- Asset allocation advice
- Comparing funds or investment options
- General personal finance questions in Indian context
- Questions about expense ratios, NAV, returns, AUM
- FD, RD, PPF, EPF, NPS discussions
- Insurance needs assessment (term, health)

**REJECT queries about:**
- Individual stock picking or equity trading tips
- Cryptocurrency, Bitcoin, NFTs
- Derivatives trading (options, futures, F&O)
- Forex or currency trading
- Non-Indian financial products (401k, IRA, etc.)
- Get-rich-quick schemes or speculation
- Completely unrelated topics (weather, recipes, movies, sports, etc.)

**IMPORTANT:** Be lenient and helpful. If the query is even tangentially related to personal finance or investing in the Indian context, accept it. Handa Uncle can gently redirect if needed.

Output ONLY valid JSON:
{
  "is_indian_finance": boolean,
  "confidence": number (0.0 to 1.0),
  "reason": string (1-2 sentence explanation)
}`;

export async function classifyQuery(
  openai: OpenAI,
  query: string
): Promise<ClassificationResult> {
  logger.classifier('Starting LLM classification', { query });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cheap for classification
      messages: [
        { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
        { role: 'user', content: query },
      ],
      temperature: 0, // Deterministic
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from classifier LLM');
    }

    logger.classifier('Raw LLM response', { content });

    const parsed = JSON.parse(content);
    const validated = ClassificationResultSchema.parse(parsed);

    logger.classifier('Classification complete', validated);
    return validated;
  } catch (error) {
    logger.error('LAYER-0:CLASSIFIER', 'Classification failed', { error });

    // On error, be lenient - let the query through
    // The recommendation layer can handle edge cases gracefully
    return {
      is_indian_finance: true,
      confidence: 0.5,
      reason: 'Classification error - allowing query to proceed for manual handling',
    };
  }
}
