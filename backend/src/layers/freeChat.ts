/**
 * FREE CHAT - Unconstrained Chat Mode
 *
 * Purpose: Provide a free-form chat without finance constraints.
 * No classifier, no validator, no structured output - just direct LLM conversation.
 */

import OpenAI from 'openai';
import { Response } from 'express';
import { logger } from '../utils/logger';

export interface FreeChatConfig {
  openai: OpenAI;
}

// Default system prompt for free chat mode
export const DEFAULT_FREE_CHAT_PROMPT = `You are a helpful AI assistant. You can discuss any topic and help with various tasks.

Be helpful, accurate, and conversational. If you don't know something, say so honestly.`;

/**
 * Send SSE event to client
 */
function sendSSE(res: Response, type: string, data: Record<string, unknown>) {
  res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
}

/**
 * Process a free chat message with streaming
 */
export async function processFreeChat(
  config: FreeChatConfig,
  res: Response,
  query: string,
  systemPrompt?: string,
  context?: string
): Promise<void> {
  const startTime = Date.now();

  logger.info('FREE_CHAT', 'Starting free chat processing', {
    query_length: query.length,
    has_custom_prompt: !!systemPrompt,
    has_context: !!context,
  });

  try {
    sendSSE(res, 'progress', { stage: 'generating', message: 'Thinking...' });

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt || DEFAULT_FREE_CHAT_PROMPT },
    ];

    // If context is provided, add it as a system message
    if (context) {
      messages.push({
        role: 'system',
        content: `Context/Parameters:\n${context}`,
      });
    }

    messages.push({ role: 'user', content: query });

    const stream = await config.openai.chat.completions.create({
      model: 'gpt-4.1-2025-04-14',
      messages,
      temperature: 0.7,
      max_tokens: 4000,
      stream: true,
    });

    let fullContent = '';

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) {
        fullContent += token;
        sendSSE(res, 'token', { content: token });
      }
    }

    const elapsed = Date.now() - startTime;
    logger.info('FREE_CHAT', 'Chat complete', {
      elapsed_ms: elapsed,
      response_length: fullContent.length,
    });

    // Send done event with the full response
    sendSSE(res, 'done', {
      data: {
        type: 'success',
        content: fullContent,
      },
    });
  } catch (error) {
    logger.error('FREE_CHAT', 'Error in free chat', { error });

    sendSSE(res, 'error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
