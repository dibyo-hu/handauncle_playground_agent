/**
 * LAYER 0 - Query Classifier (LLM-based)
 *
 * Purpose: Classify query and determine processing requirements.
 * This layer decides:
 * 1. Is this an Indian finance query? (gate-keeper)
 * 2. Does it need web search for real-time fund data?
 * 3. Does it need specific recommendations (table)?
 *
 * Design decisions:
 * - Purely LLM-based classification
 * - Smart routing - not all queries need web search or recommendations
 * - Uses gpt-4o-mini for cost efficiency
 */

import OpenAI from 'openai';
import { ClassificationResult, ClassificationResultSchema } from '../types/schemas';
import { logger } from '../utils/logger';

const CLASSIFICATION_SYSTEM_PROMPT = `You are a query classifier for an Indian personal finance recommendation system called "Handa Uncle".

Your job is to:
1. Determine if the query is something Handa Uncle can help with
2. Decide if web search is needed for real-time fund data
3. Decide if specific fund/investment recommendations are needed

**ACCEPT queries related to:**
- Indian mutual funds, SIPs, ELSS, index funds
- Investment recommendations and portfolio advice
- Tax-saving investments (Section 80C)
- Emergency fund and goal-based investing
- Asset allocation and rebalancing
- General personal finance questions (Indian context)
- FD, RD, PPF, EPF, NPS discussions
- Insurance needs assessment

**REJECT queries about:**
- Individual stocks, crypto, derivatives, F&O
- Non-Indian financial products (401k, IRA)
- Unrelated topics (weather, recipes, sports)

**WHEN TO SET needs_web_search = true:**
- User asks for specific fund recommendations ("which fund should I invest in")
- User wants current fund data, returns, expense ratios
- Portfolio review needing current market data
- Comparing specific funds

**WHEN TO SET needs_web_search = false:**
- General concepts ("what is SIP", "how does ELSS work")
- Personal finance advice not needing specific funds
- Questions about user's existing data/situation
- Explaining financial concepts

**WHEN TO SET needs_recommendations = true:**
- User wants to know what to BUY, SELL, or HOLD
- Portfolio rebalancing advice
- Investment allocation suggestions
- Specific fund recommendations

**WHEN TO SET needs_recommendations = false:**
- Conceptual/educational questions
- General advice without specific action items
- Questions about existing holdings (just analysis, no action)

Output ONLY valid JSON:
{
  "is_indian_finance": boolean,
  "confidence": number (0.0 to 1.0),
  "reason": string (1-2 sentence explanation),
  "needs_web_search": boolean,
  "needs_recommendations": boolean
}`;

export async function classifyQuery(
  openai: OpenAI,
  query: string
): Promise<ClassificationResult> {
  logger.classifier('Starting LLM classification', { query });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
        { role: 'user', content: query },
      ],
      temperature: 0,
      max_tokens: 250,
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

    // On error, be lenient and assume full processing needed
    return {
      is_indian_finance: true,
      confidence: 0.5,
      reason: 'Classification error - allowing query to proceed',
      needs_web_search: true,
      needs_recommendations: true,
    };
  }
}
