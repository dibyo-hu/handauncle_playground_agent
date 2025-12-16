/**
 * API Client for Agentic Finance Playground
 */

import type {
  UserFinanceContext,
  PlaygroundResponse,
  DerivedMetrics,
} from '../types';

const API_BASE = '/api';

/**
 * Fetch default user context from backend
 */
export async function fetchDefaultContext(): Promise<{
  context: UserFinanceContext;
  derived_metrics: DerivedMetrics;
}> {
  const response = await fetch(`${API_BASE}/default-context`);

  if (!response.ok) {
    throw new Error(`Failed to fetch default context: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch default system prompt from backend
 */
export async function fetchDefaultPrompt(): Promise<{
  system_prompt: string;
}> {
  const response = await fetch(`${API_BASE}/default-prompt`);

  if (!response.ok) {
    throw new Error(`Failed to fetch default prompt: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch default output format instructions from backend
 */
export async function fetchDefaultOutputFormat(): Promise<{
  output_format: string;
}> {
  const response = await fetch(`${API_BASE}/default-output-format`);

  if (!response.ok) {
    throw new Error(`Failed to fetch default output format: ${response.status}`);
  }

  return response.json();
}

/**
 * Submit query for recommendation
 */
export async function submitQuery(
  query: string,
  userContext: UserFinanceContext,
  systemPrompt?: string,
  outputFormat?: string
): Promise<PlaygroundResponse> {
  const response = await fetch(`${API_BASE}/recommend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      user_context: userContext,
      system_prompt: systemPrompt,
      output_format: outputFormat,
    }),
  });

  if (!response.ok && response.status !== 500) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Health check
 */
export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  const response = await fetch(`${API_BASE}/health`);

  if (!response.ok) {
    throw new Error('Backend health check failed');
  }

  return response.json();
}
