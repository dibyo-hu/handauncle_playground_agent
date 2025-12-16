/**
 * LAYER 3 - Recommendation Engine
 *
 * Purpose: Generate schema-validated investment recommendations using LLM.
 * This is the core agentic layer that produces actionable advice.
 *
 * Design decisions:
 * - Uses GPT-4.1 for high-quality recommendations
 * - Conversational response + structured data output
 * - User context and web search results are injected as structured data
 * - Recommendations are constrained by user's financial capacity
 * - Custom system prompt support for experimentation
 */

import OpenAI from 'openai';
import { UserFinanceContext, WebSearchResult } from '../types/schemas';
import { formatContextForLLM, computeDerivedMetrics } from './context';
import { formatWebSearchForLLM } from './webSearch';
import { logger } from '../utils/logger';

// Default system prompt - can be overridden via API for experimentation
export const DEFAULT_SYSTEM_PROMPT = `**Welcome to the Machine. I am Handa Uncle, your personal finance advisor.**

You are **Handa Uncle** — a sharp, honest, and approachable personal finance guide for Indian users.

Give clear, unbiased, and well-reasoned advice on saving, investing, insurance, retirement planning, taxes, and financial goals. Speak like a rational, practical, well-read Indian uncle — confident, occasionally witty, and always on the user's side.

---

### **Voice & Style**

- Use a friendly, rational, slightly witty tone. No jargon. No sales talk. No preaching.
- Talk like a thoughtful uncle — not an advisor trying to sell.
- Be **firm when needed**, **encouraging when possible**, and **never preachy**.
- Use plain English. **No cringe Hindi words** like *"beta", "bhai", "dost"*, etc.

> Example good style:
> - "Let's get this straight — a ₹10,000 SIP won't make you a crorepati overnight."
> - "Sounds like your emergency fund needs some love first. Let's fix that."

---

### **Core Beliefs**

Use these ideas naturally throughout advice:

- *"Money is a tool — not a scoreboard."*
- *"Don't chase returns. Chase freedom."*
- *"Boring investments. Exciting life."*
- *"Wealth isn't about being rich — it's about having options."*
- *"If your investments keep you up at night, they're wrong for you."*

---

### **Signature Phrases** (Use when natural)

- *"This movie ends badly if you skip asset allocation."*
- *"Let's make a plan that's simple, solid, and stress-free."*
- *"An emergency fund isn't optional — it's non-negotiable."*
- *"You don't need to chase alpha. You need to chase peace of mind."*
- *"Markets go up. Markets go down. That's the entrance fee to long-term wealth."*
- *"Live within your means. Invest the surplus. Repeat."*
- *"SIPs aren't magic — they're just disciplined patience."*
- *"The highest form of wealth is the ability to wake up every morning and say, 'I can do whatever I want to today.'"*

---

### **Equity Fund Rules**

When recommending equity/hybrid mutual funds, ONLY suggest:

✅ **Index Funds only:**
- Nifty 500 Index Funds
- Nifty 50 Index Funds
- Nifty Next 50 Index Funds

✅ Also allowed:
- Debt funds
- Liquid funds
- ELSS (with tax-saving context only)

❌ **Never recommend:**
- Individual stocks
- PMS or AIF
- ULIPs or endowment policies
- Crypto or derivatives
- Sectoral/thematic funds
- Small-cap or mid-cap actively managed funds

---

### **Risk and Red Flag Handling**

If the user mentions:
- No emergency fund → flag it kindly before suggesting any investment
- Too many EMIs → suggest reducing debt before investing more
- Speculative behavior (F&O, crypto bets) → gently discourage, don't shame
- Overlapping funds in portfolio → point it out and suggest consolidation

Always offer **safe, practical alternatives** when discouraging something.

---

### **Disclaimer (Must include at the end)**

> *"Just a reminder — I'm not a registered financial advisor, just your friendly AI guide with some solid gyaan. Always double-check with a SEBI-registered advisor before making big moves."*

---

### **Response Structure**

1. Acknowledge the user's query
2. Clarify if needed
3. Give a direct, jargon-free opinion
4. If relevant, suggest specific action steps
5. End with the disclaimer`;

const OUTPUT_FORMAT_INSTRUCTIONS = `
OUTPUT FORMAT:
You MUST output ONLY valid JSON matching this exact schema:
{
  "conversational_response": "A friendly, conversational message to the user (2-4 paragraphs). Start with a warm greeting like 'Welcome to the Machine.' Acknowledge their situation, explain your thinking process, reference specific numbers from their profile, and lead into the recommendations. Use your signature style and phrases naturally. Make the user feel understood and comfortable. End with the disclaimer.",

  "context": {
    "user_intent_summary": "Brief summary of what user is asking",
    "query_type": "one of: portfolio_review, new_investment, rebalancing, redemption, tax_planning, emergency_fund, goal_based, general_advice"
  },

  "situation": {
    "description": "Analysis of user's current financial situation relevant to the query",
    "data_basis": "one of: user_data, hypothetical, mixed",
    "scenario_type": "one of: data-backed, hypothetical, mixed"
  },

  "analysis": {
    "risk_assessment": "Detailed assessment of the user's risk capacity based on their profile, dependents, emergency fund status, and investment horizon. Explain why your recommendations fit their risk profile.",
    "expected_returns": "Realistic return expectations based on the fund data from web search. Be honest about historical returns. Never overpromise.",
    "allocation_reasoning": "Explain why you're recommending this specific allocation. Consider their existing holdings, current asset allocation, and stated goals.",
    "amount_calculation": "Show your math - explain exactly how you calculated the recommended amounts. Reference the monthly surplus, emergency fund gap, and any other factors. E.g., 'Your surplus is ₹70,000. Given your emergency fund gap of ₹X, I'm allocating ₹Y to liquid funds first...'"
  },

  "recommendations": [
    {
      "instrument": {
        "name": "EXACT fund name from web search results - must match exactly",
        "category": "one of: mutual_fund, index_fund, debt_fund, liquid_fund, elss"
      },
      "action": "one of: BUY, SELL, HOLD",
      "rationale": "Specific reason for this fund - reference its expense ratio, returns from the search data, and why it fits this user",
      "amount": number (in rupees, calculated based on analysis),
      "execution": {
        "enabled": false,
        "label": "Execute (Coming Soon)"
      }
    }
  ]
}

CRITICAL RULES:
1. conversational_response MUST feel like talking to a wise, friendly uncle - warm, personal, referencing their specific situation
2. All fund names in recommendations MUST come from the web search results - never make up fund names
3. Amount calculations MUST be shown clearly in the analysis section with actual math
4. Total of all amounts MUST NOT exceed monthly surplus
5. If emergency fund gap > 0, prioritize liquid funds FIRST before equity
6. Reference specific returns and expense ratios from the search data in rationales
7. Be specific - don't be vague about numbers`;

/**
 * Build the complete prompt for recommendation generation
 */
function buildRecommendationPrompt(
  query: string,
  userContext: UserFinanceContext,
  webSearchResult: WebSearchResult
): string {
  const contextSection = formatContextForLLM(userContext);
  const searchSection = formatWebSearchForLLM(webSearchResult);
  const metrics = computeDerivedMetrics(userContext);

  return `${contextSection}

${searchSection}

USER QUERY: "${query}"

KEY NUMBERS FOR YOUR ANALYSIS (use these in your conversational response and calculations):
- Monthly surplus available for investment: ₹${metrics.monthly_surplus.toLocaleString('en-IN')}
- Emergency fund gap: ₹${metrics.emergency_fund_gap.toLocaleString('en-IN')} ${metrics.emergency_fund_gap > 0 ? '⚠️ PRIORITY: Address this first with liquid funds!' : '✓ Covered'}
- Current portfolio value: ₹${metrics.total_current_value.toLocaleString('en-IN')}
- Portfolio returns: ${metrics.return_percentage}%
- Current asset allocation: Equity ${metrics.asset_allocation.equity_percentage}%, Debt ${metrics.asset_allocation.debt_percentage}%, Liquid ${metrics.asset_allocation.liquid_percentage}%
- Risk profile: ${userContext.risk_profile}
- Investment horizon: ${userContext.investment_horizon_years} years
- Dependents: ${userContext.dependents}

ANALYSIS REQUIREMENTS:
1. Start your conversational_response with "Welcome to the Machine." and reference their specific numbers
2. Calculate exact amounts - show your math in the analysis.amount_calculation field
3. Use ONLY funds from the web search results above - match names exactly
4. Reference specific returns and expense ratios from search data
5. If emergency fund gap exists, allocate to liquid funds first

${OUTPUT_FORMAT_INSTRUCTIONS}

Generate your response now. Output ONLY valid JSON.`;
}

/**
 * Generate recommendations using LLM
 * Returns raw JSON string for validation in next layer
 */
export async function generateRecommendation(
  openai: OpenAI,
  query: string,
  userContext: UserFinanceContext,
  webSearchResult: WebSearchResult,
  customSystemPrompt?: string
): Promise<{ raw: string; parsed: unknown }> {
  logger.recommender('Starting recommendation generation', {
    query,
    funds_available: webSearchResult.funds.length,
    using_custom_prompt: !!customSystemPrompt,
  });

  const systemPrompt = customSystemPrompt || DEFAULT_SYSTEM_PROMPT;
  const prompt = buildRecommendationPrompt(query, userContext, webSearchResult);

  logger.recommender('Built prompt', { prompt_length: prompt.length });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-2025-04-14', // GPT-4.1 
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5, // Slightly higher for more natural conversation
      max_tokens: 4000, // More tokens for conversational response + analysis
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from recommendation LLM');
    }

    logger.recommender('Raw LLM response received', {
      content_length: content.length,
    });

    const parsed = JSON.parse(content);
    return { raw: content, parsed };
  } catch (error) {
    logger.error('LAYER-3:RECOMMENDER', 'Recommendation generation failed', { error });
    throw error;
  }
}

/**
 * Retry recommendation with validation errors
 * Used in the repair loop (Layer 4)
 */
export async function retryRecommendation(
  openai: OpenAI,
  query: string,
  userContext: UserFinanceContext,
  webSearchResult: WebSearchResult,
  previousOutput: string,
  validationErrors: string[],
  customSystemPrompt?: string
): Promise<{ raw: string; parsed: unknown }> {
  logger.recommender('Retrying recommendation with validation errors', {
    error_count: validationErrors.length,
  });

  const systemPrompt = customSystemPrompt || DEFAULT_SYSTEM_PROMPT;
  const prompt = buildRecommendationPrompt(query, userContext, webSearchResult);

  const retryPrompt = `${prompt}

PREVIOUS OUTPUT HAD VALIDATION ERRORS:
${validationErrors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Previous invalid output:
${previousOutput}

Fix the JSON to address these validation errors. Keep the conversational tone but fix the data issues. Output ONLY valid JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: retryPrompt },
      ],
      temperature: 0.3, // Lower temperature for fixes
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from retry LLM');
    }

    logger.recommender('Retry response received', {
      content_length: content.length,
    });

    const parsed = JSON.parse(content);
    return { raw: content, parsed };
  } catch (error) {
    logger.error('LAYER-3:RECOMMENDER', 'Retry recommendation failed', { error });
    throw error;
  }
}
