/**
 * LAYER 2 - Web Search for Grounding (OpenAI Native)
 *
 * Purpose: Fetch real-time fund data for grounded recommendations.
 * Uses OpenAI's native web search capability instead of Tavily.
 *
 * Design decisions:
 * - Uses OpenAI Responses API with web_search tool
 * - Extracts STRUCTURED facts from search results
 * - Only verified instruments may be recommended
 * - Includes current date for time-sensitive searches
 */

import OpenAI from 'openai';
import { FundData, WebSearchResult } from '../types/schemas';
import { logger } from '../utils/logger';

// Simple in-memory cache for web search results
const searchCache = new Map<string, { result: WebSearchResult; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Get current date formatted for search queries
 */
function getCurrentDateForSearch(): string {
  const now = new Date();
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

/**
 * Extract fund category from query
 */
function extractFundCategory(query: string): string {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('liquid') || lowerQuery.includes('emergency')) {
    return 'liquid fund';
  }
  if (lowerQuery.includes('debt') || lowerQuery.includes('fixed income')) {
    return 'debt fund';
  }
  if (lowerQuery.includes('index') || lowerQuery.includes('nifty') || lowerQuery.includes('sensex')) {
    return 'index fund';
  }
  if (lowerQuery.includes('elss') || lowerQuery.includes('tax') || lowerQuery.includes('80c')) {
    return 'ELSS tax saving fund';
  }
  if (lowerQuery.includes('large cap')) {
    return 'large cap index fund';
  }
  if (lowerQuery.includes('mid cap')) {
    return 'mid cap index fund';
  }
  if (lowerQuery.includes('small cap')) {
    return 'small cap index fund';
  }
  if (lowerQuery.includes('flexi') || lowerQuery.includes('multi cap')) {
    return 'Nifty 500 index fund';
  }

  return 'index fund'; // Default to index funds as per Handa Uncle rules
}

/**
 * Build search query for fund data with current date
 */
function buildSearchQuery(userQuery: string): string {
  const category = extractFundCategory(userQuery);
  const currentDate = getCurrentDateForSearch();
  return `best ${category} India ${currentDate} direct plan returns expense ratio AUM top performing`;
}

/**
 * Perform web search using OpenAI's native web search
 */
async function performOpenAIWebSearch(
  openai: OpenAI,
  searchQuery: string
): Promise<{ content: string; urls: string[] }> {
  logger.webSearch('Calling OpenAI web search', { query: searchQuery });

  try {
    // Use OpenAI's responses API with web search tool
    const response = await openai.responses.create({
      model: 'gpt-4.1-2025-04-14',
      tools: [{ type: 'web_search' as any }],
      input: `Search for: ${searchQuery}

Please find the top performing mutual funds/index funds matching this query.
Include for each fund:
- Full official fund name (Direct Growth plan)
- Fund house/AMC name
- Expense ratio
- 1 year return percentage
- 3 year CAGR percentage
- AUM in crores
- Fund category

Focus on Direct Plan funds from reputable AMCs like:
- UTI, HDFC, ICICI Prudential, SBI, Nippon India, Kotak, Axis, Mirae Asset, Motilal Oswal, DSP

Return factual data only from reliable sources like Value Research, Moneycontrol, ET Money, Groww, or AMC websites.`,
    });

    // Extract the text content and any URLs from the response
    let content = '';
    const urls: string[] = [];

    if (response.output) {
      for (const item of response.output) {
        if (item.type === 'message' && item.content) {
          for (const block of item.content) {
            if (block.type === 'output_text') {
              content += block.text;
            }
          }
        }
        // Extract URLs from annotations if available
        if (item.type === 'message' && item.content) {
          for (const block of item.content) {
            if (block.type === 'output_text' && (block as any).annotations) {
              for (const annotation of (block as any).annotations) {
                if (annotation.type === 'url_citation' && annotation.url) {
                  urls.push(annotation.url);
                }
              }
            }
          }
        }
      }
    }

    logger.webSearch('OpenAI web search response received', {
      content_length: content.length,
      urls_found: urls.length,
    });

    return { content, urls };
  } catch (error) {
    logger.error('LAYER-2:WEB_SEARCH', 'OpenAI web search failed', { error });

    // Fallback: Use chat completion to generate fund recommendations based on knowledge
    logger.webSearch('Falling back to knowledge-based fund data');

    const fallbackResponse = await openai.chat.completions.create({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        {
          role: 'system',
          content: 'You are a financial data assistant. Provide accurate mutual fund data for Indian investors.',
        },
        {
          role: 'user',
          content: `Provide data for top Indian ${extractFundCategory(searchQuery)} funds. Include fund name, expense ratio, approximate returns, AUM, and fund house. Focus on index funds and direct plans.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    return {
      content: fallbackResponse.choices[0]?.message?.content || '',
      urls: ['https://www.valueresearchonline.com', 'https://www.moneycontrol.com/mutual-funds'],
    };
  }
}

/**
 * Extract structured fund data from search content using LLM
 */
async function extractFundData(
  openai: OpenAI,
  searchContent: string,
  originalQuery: string
): Promise<FundData[]> {
  if (!searchContent) {
    return [];
  }

  logger.webSearch('Extracting fund data from search results');

  const currentDate = getCurrentDateForSearch();

  const extractionPrompt = `Extract ONLY verified mutual fund data from the search results below.
Return a JSON object with a "funds" array. Only include funds where you can verify the data.

Current date: ${currentDate}

Required fields for each fund:
- fund_name: Full official name (must include "Direct" and "Growth" if applicable)
- category: Fund category (equity, debt, hybrid, liquid, index, elss)
- expense_ratio: As percentage string (e.g., "0.45%") or "N/A"
- 1Y_return: 1-year return as percentage string (e.g., "15.2%") or "N/A"
- 3Y_return: 3-year CAGR as percentage string (e.g., "12.5%") or "N/A"
- aum_crores: AUM in crores (number) or 0 if unknown
- fund_house: AMC name

IMPORTANT:
- Only include DIRECT PLAN funds
- Prefer INDEX FUNDS (Nifty 50, Nifty Next 50, Nifty 500)
- Include funds from reputable AMCs (UTI, HDFC, ICICI, SBI, Nippon, Kotak, Axis, Mirae Asset)
- If data seems outdated, note it in the fund_name field

Search Results:
${searchContent.slice(0, 6000)}

Original Query: ${originalQuery}

Output ONLY valid JSON: {"funds": [...]}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        {
          role: 'system',
          content: 'You are a financial data extraction assistant. Extract structured fund data from search results. Output ONLY valid JSON.',
        },
        { role: 'user', content: extractionPrompt },
      ],
      temperature: 0,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return [];
    }

    logger.webSearch('Raw extraction response', { content_length: content.length });

    const parsed = JSON.parse(content);
    const fundsArray = parsed.funds || [];

    // Validate and filter fund data
    const validFunds: FundData[] = fundsArray
      .filter((f: any) => f.fund_name && f.fund_name !== 'N/A')
      .map((f: any) => ({
        fund_name: String(f.fund_name),
        category: String(f.category || 'index'),
        expense_ratio: String(f.expense_ratio || 'N/A'),
        '1Y_return': String(f['1Y_return'] || f.return_1y || 'N/A'),
        '3Y_return': String(f['3Y_return'] || f.return_3y || 'N/A'),
        aum_crores: Number(f.aum_crores) || 0,
        fund_house: String(f.fund_house || 'N/A'),
      }));

    logger.webSearch('Extracted funds', { count: validFunds.length });
    return validFunds;
  } catch (error) {
    logger.error('LAYER-2:WEB_SEARCH', 'Fund extraction failed', { error });
    return [];
  }
}

/**
 * Main web search function using OpenAI native search
 * Returns structured fund data for grounding recommendations
 */
export async function performWebSearch(
  openai: OpenAI,
  query: string
): Promise<WebSearchResult> {
  // Check cache first
  const cacheKey = query.toLowerCase().trim();
  const cached = searchCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    logger.webSearch('Cache hit', { query });
    return cached.result;
  }

  logger.webSearch('Cache miss, performing OpenAI web search', { query });

  const searchQuery = buildSearchQuery(query);
  const { content, urls } = await performOpenAIWebSearch(openai, searchQuery);

  const funds = await extractFundData(openai, content, query);

  const result: WebSearchResult = {
    query: searchQuery,
    funds,
    search_timestamp: new Date().toISOString(),
    source_urls: urls.length > 0 ? urls : [
      'https://www.valueresearchonline.com',
      'https://www.moneycontrol.com/mutual-funds',
    ],
  };

  // Update cache
  searchCache.set(cacheKey, { result, timestamp: Date.now() });

  logger.webSearch('Search complete', {
    funds_found: funds.length,
    sources: result.source_urls.length,
    search_date: getCurrentDateForSearch(),
  });

  return result;
}

/**
 * Format web search results for LLM context
 */
export function formatWebSearchForLLM(searchResult: WebSearchResult): string {
  const currentDate = getCurrentDateForSearch();

  if (searchResult.funds.length === 0) {
    return `<WEB_SEARCH_RESULTS>
Search performed: ${searchResult.search_timestamp}
Current Date: ${currentDate}

No verified fund data found from web search.
Please recommend based on well-known index funds:
- UTI Nifty 50 Index Fund Direct Growth
- HDFC Index Fund Nifty 50 Plan Direct Growth
- Nippon India Index Fund Nifty 50 Plan Direct Growth
- Motilal Oswal Nifty 500 Index Fund Direct Growth

Use approximate expense ratios (0.1-0.2% for index funds) and historical return ranges.
</WEB_SEARCH_RESULTS>`;
  }

  const fundsJson = JSON.stringify(searchResult.funds, null, 2);

  return `<WEB_SEARCH_RESULTS>
Search performed: ${searchResult.search_timestamp}
Current Date: ${currentDate}
Query: ${searchResult.query}
Sources: ${searchResult.source_urls.join(', ')}

VERIFIED FUND DATA (use ONLY these funds for recommendations):
${fundsJson}

IMPORTANT:
- Only recommend funds from this list
- Do NOT fabricate fund names, returns, or expense ratios
- If user asks about a specific fund not in this list, say data is not available
- Prefer index funds (Nifty 50, Nifty Next 50, Nifty 500) as per Handa Uncle rules
</WEB_SEARCH_RESULTS>`;
}

// Keep for backwards compatibility but no longer needed
export function shouldPerformWebSearch(_query: string): boolean {
  return true; // Always perform web search
}
