/**
 * STREAMING LAYER 3 - Recommendation Engine with Streaming
 *
 * Purpose: Generate schema-validated investment recommendations using LLM with streaming.
 * Streams tokens in real-time while collecting the full response for validation.
 */

import OpenAI from 'openai';
import { UserFinanceContext, WebSearchResult } from '../types/schemas';
import { formatContextForLLM, computeDerivedMetrics } from './context';
import { formatWebSearchForLLM } from './webSearch';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_OUTPUT_FORMAT_INSTRUCTIONS } from './recommender';
import { logger } from '../utils/logger';

export interface StreamCallbacks {
  onToken: (token: string) => void;
}

// Simplified output format for non-recommendation queries
const OUTPUT_FORMAT_INSTRUCTIONS_SIMPLE = `
OUTPUT FORMAT (No recommendations needed):
You MUST output ONLY valid JSON matching this schema:
{
  "conversational_response": "A friendly, helpful response to the user's question. Start with 'Welcome to the Machine.' Use your Handa Uncle style - warm, wise, practical. Reference their specific situation where relevant. End with the disclaimer.",

  "context": {
    "user_intent_summary": "Brief summary of what user is asking",
    "query_type": "one of: portfolio_review, new_investment, rebalancing, redemption, tax_planning, emergency_fund, goal_based, general_advice"
  },

  "situation": {
    "description": "Analysis of their situation relevant to the query",
    "data_basis": "one of: user_data, hypothetical, mixed",
    "scenario_type": "one of: data-backed, hypothetical, mixed"
  }
}

NOTE: Do NOT include "analysis" or "recommendations" fields for this query type.
Just provide a helpful conversational response.`;

/**
 * Build the complete prompt for response generation
 */
function buildRecommendationPrompt(
  query: string,
  userContext: UserFinanceContext,
  webSearchResult: WebSearchResult | undefined,
  needsRecommendations: boolean,
  customOutputFormat?: string
): string {
  const contextSection = formatContextForLLM(userContext);
  const metrics = computeDerivedMetrics(userContext);

  // Include web search data only if available
  const searchSection = webSearchResult
    ? formatWebSearchForLLM(webSearchResult)
    : '<WEB_SEARCH_RESULTS>\nNo web search performed for this query.\n</WEB_SEARCH_RESULTS>';

  // Use custom output format if provided, otherwise use default based on query type
  const outputInstructions = needsRecommendations
    ? (customOutputFormat || DEFAULT_OUTPUT_FORMAT_INSTRUCTIONS)
    : OUTPUT_FORMAT_INSTRUCTIONS_SIMPLE;

  return `${contextSection}

${searchSection}

USER QUERY: "${query}"

KEY NUMBERS FOR YOUR RESPONSE:
- Monthly surplus available for investment: ₹${metrics.monthly_surplus.toLocaleString('en-IN')}
- Emergency fund gap: ₹${metrics.emergency_fund_gap.toLocaleString('en-IN')} ${metrics.emergency_fund_gap > 0 ? '⚠️ PRIORITY' : '✓ Covered'}
- Current portfolio value: ₹${metrics.total_current_value.toLocaleString('en-IN')}
- Portfolio returns: ${metrics.return_percentage}%
- Current asset allocation: Equity ${metrics.asset_allocation.equity_percentage}%, Debt ${metrics.asset_allocation.debt_percentage}%, Liquid ${metrics.asset_allocation.liquid_percentage}%
- Risk profile: ${userContext.risk_profile}
- Investment horizon: ${userContext.investment_horizon_years} years
- Dependents: ${userContext.dependents}

${needsRecommendations ? `RECOMMENDATION REQUIREMENTS:
1. Start your conversational_response with "Welcome to the Machine."
2. Calculate exact amounts - show your math in analysis.amount_calculation
3. Use ONLY funds from web search results (if available)
4. If emergency fund gap exists, prioritize liquid funds first` : `RESPONSE REQUIREMENTS:
1. Start your conversational_response with "Welcome to the Machine."
2. Provide helpful, conversational advice
3. Reference the user's specific numbers where relevant
4. NO recommendations array needed - just conversational guidance`}

${outputInstructions}

Generate your response now. Output ONLY valid JSON.`;
}

/**
 * Extract and stream the conversational_response field from JSON as it's being built
 */
function extractAndStreamConversationalContent(
  partialJson: string,
  lastStreamedLength: number,
  callbacks: StreamCallbacks
): number {
  // Find the conversational_response field
  const marker = '"conversational_response"';
  const markerIndex = partialJson.indexOf(marker);

  if (markerIndex === -1) return lastStreamedLength;

  // Find the opening quote after the colon
  const colonIndex = partialJson.indexOf(':', markerIndex + marker.length);
  if (colonIndex === -1) return lastStreamedLength;

  // Find the opening quote of the string value
  let openQuoteIndex = -1;
  for (let i = colonIndex + 1; i < partialJson.length; i++) {
    if (partialJson[i] === '"') {
      openQuoteIndex = i;
      break;
    }
    if (partialJson[i] !== ' ' && partialJson[i] !== '\n' && partialJson[i] !== '\t') {
      return lastStreamedLength; // Not a string value
    }
  }

  if (openQuoteIndex === -1) return lastStreamedLength;

  // Extract content between the quotes (handling escape sequences)
  let content = '';
  let i = openQuoteIndex + 1;
  let escaped = false;

  while (i < partialJson.length) {
    const char = partialJson[i];

    if (escaped) {
      // Handle escape sequences
      switch (char) {
        case 'n': content += '\n'; break;
        case 't': content += '\t'; break;
        case 'r': content += '\r'; break;
        case '"': content += '"'; break;
        case '\\': content += '\\'; break;
        default: content += char;
      }
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === '"') {
      break; // End of string (might be partial)
    } else {
      content += char;
    }
    i++;
  }

  // Only stream new content
  if (content.length > lastStreamedLength) {
    const newContent = content.slice(lastStreamedLength);
    callbacks.onToken(newContent);
    return content.length;
  }

  return lastStreamedLength;
}

/**
 * Generate response using streaming LLM
 * Streams tokens while building the complete response
 */
export async function generateStreamingRecommendation(
  openai: OpenAI,
  query: string,
  userContext: UserFinanceContext,
  webSearchResult: WebSearchResult | undefined,
  needsRecommendations: boolean,
  callbacks: StreamCallbacks,
  customSystemPrompt?: string,
  customOutputFormat?: string
): Promise<{ raw: string; parsed: unknown }> {
  logger.recommender('Starting streaming response generation', {
    query,
    funds_available: webSearchResult?.funds.length ?? 0,
    needs_recommendations: needsRecommendations,
    using_custom_prompt: !!customSystemPrompt,
  });

  const systemPrompt = customSystemPrompt || DEFAULT_SYSTEM_PROMPT;
  const prompt = buildRecommendationPrompt(
    query,
    userContext,
    webSearchResult,
    needsRecommendations,
    customOutputFormat
  );

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
      stream: true,
    });

    let fullContent = '';
    let lastStreamedLength = 0;

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) {
        fullContent += token;

        // Try to extract and stream conversational content
        lastStreamedLength = extractAndStreamConversationalContent(
          fullContent,
          lastStreamedLength,
          callbacks
        );
      }
    }

    logger.recommender('Streaming response complete', {
      content_length: fullContent.length,
      streamed_chars: lastStreamedLength,
    });

    // Parse the complete JSON
    const parsed = JSON.parse(fullContent);
    return { raw: fullContent, parsed };
  } catch (error) {
    logger.error('LAYER-3:STREAMING_RECOMMENDER', 'Streaming generation failed', { error });
    throw error;
  }
}
