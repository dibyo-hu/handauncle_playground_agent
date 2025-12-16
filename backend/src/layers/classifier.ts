/**
 * LAYER 0 - Query Classifier
 *
 * Purpose: Fast, cheap classification to determine if query is Indian finance related.
 * This is a gate-keeper layer - if classification fails, NO downstream processing occurs.
 *
 * Design decisions:
 * - Uses a smaller/cheaper model for speed
 * - Strict JSON output schema
 * - Conservative classification (false positives are worse than false negatives)
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { ClassificationResult, ClassificationResultSchema } from '../types/schemas';
import { logger } from '../utils/logger';

// Keywords that strongly indicate Indian finance context
const INDIAN_FINANCE_KEYWORDS = [
  'mutual fund', 'sip', 'elss', 'ppf', 'epf', 'nps', 'lic',
  'nifty', 'sensex', 'bse', 'nse', 'sebi',
  'hdfc', 'icici', 'sbi', 'axis', 'kotak', 'nippon', 'uti', 'birla', 'tata',
  'direct plan', 'regular plan', 'growth', 'dividend',
  'liquid fund', 'debt fund', 'index fund', 'flexi cap', 'large cap', 'mid cap', 'small cap',
  'tax saving', 'section 80c', '80c', 'ltcg', 'stcg',
  'lakh', 'crore', 'rupee', 'inr', '₹',
  'demat', 'zerodha', 'groww', 'kuvera', 'coin',
  'emi', 'fd', 'rd', 'fixed deposit', 'recurring deposit',
  'gold bond', 'sgb', 'sovereign gold',
  'expense ratio', 'nav', 'aum',
];

// Keywords that indicate non-Indian or non-finance topics
const EXCLUSION_KEYWORDS = [
  'stock', 'stocks', 'share', 'shares', 'equity trading',
  'crypto', 'bitcoin', 'ethereum', 'nft',
  'forex', 'currency trading',
  'options', 'futures', 'derivatives', 'f&o',
  '401k', 'ira', 'roth',
  'weather', 'recipe', 'movie', 'sports', 'news',
];

/**
 * Quick heuristic check before calling LLM
 * Returns early classification if high confidence
 */
function quickHeuristicCheck(query: string): ClassificationResult | null {
  const lowerQuery = query.toLowerCase();

  // Check for exclusion keywords (hard reject)
  for (const keyword of EXCLUSION_KEYWORDS) {
    if (lowerQuery.includes(keyword)) {
      // Check if it's in an Indian finance context
      const hasIndianContext = INDIAN_FINANCE_KEYWORDS.some(k => lowerQuery.includes(k));
      if (!hasIndianContext) {
        return {
          is_indian_finance: false,
          confidence: 0.95,
          reason: `Query contains "${keyword}" which is outside the scope of Indian mutual fund investments.`,
        };
      }
    }
  }

  // Check for strong Indian finance indicators
  let matchCount = 0;
  const matchedKeywords: string[] = [];

  for (const keyword of INDIAN_FINANCE_KEYWORDS) {
    if (lowerQuery.includes(keyword)) {
      matchCount++;
      matchedKeywords.push(keyword);
    }
  }

  // High confidence if multiple Indian finance keywords found
  if (matchCount >= 2) {
    return {
      is_indian_finance: true,
      confidence: 0.9,
      reason: `Query contains Indian finance keywords: ${matchedKeywords.join(', ')}`,
    };
  }

  // No early return, need LLM classification
  return null;
}

const CLASSIFICATION_SYSTEM_PROMPT = `You are a query classifier for an Indian personal finance recommendation system.

Your ONLY job is to determine if the user's query is related to Indian personal finance, specifically:
- Indian mutual funds (equity, debt, hybrid, liquid, index, ELSS)
- SIP (Systematic Investment Plans)
- Portfolio management and rebalancing
- Tax-saving investments (80C, ELSS)
- Emergency funds and liquid investments
- Goal-based investing

REJECT queries about:
- Individual stocks or equity trading
- Cryptocurrency
- Derivatives (options, futures, F&O)
- Non-Indian financial products
- Non-financial topics

Output ONLY valid JSON matching this exact schema:
{
  "is_indian_finance": boolean,
  "confidence": number (0-1),
  "reason": string (brief explanation)
}

Be conservative - when in doubt, classify as NOT Indian finance related.`;

export async function classifyQuery(
  openai: OpenAI,
  query: string
): Promise<ClassificationResult> {
  logger.classifier('Starting classification', { query });

  // Try heuristic first for speed
  const heuristicResult = quickHeuristicCheck(query);
  if (heuristicResult) {
    logger.classifier('Heuristic classification succeeded', heuristicResult);
    return heuristicResult;
  }

  logger.classifier('Heuristic inconclusive, calling LLM');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cheap, fast model for classification
      messages: [
        { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
        { role: 'user', content: query },
      ],
      temperature: 0, // Deterministic for classification
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

    // Default to rejection on error (conservative)
    return {
      is_indian_finance: false,
      confidence: 0,
      reason: 'Classification error - defaulting to rejection for safety',
    };
  }
}
