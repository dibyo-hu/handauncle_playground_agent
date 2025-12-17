/**
 * Chat Library
 * OpenAI integration for chat completions
 */

import OpenAI from 'openai';
import { ChatMessage } from '../interfaces/chat.interface';

const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_TEMPERATURE = 1;
const DEFAULT_MAX_TOKENS = 4000;
const MAX_CONTEXT_MESSAGES = 20; // Limit to prevent token overflow

/**
 * Build OpenAI messages from conversation history
 */
export function buildOpenAIMessages(
  messages: ChatMessage[],
  systemPrompt?: string
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const openAIMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  // Add system prompt if provided
  if (systemPrompt) {
    openAIMessages.push({
      role: 'system',
      content: systemPrompt,
    });
  }

  // Limit context to prevent token overflow
  const contextMessages = messages.slice(-MAX_CONTEXT_MESSAGES);

  // Convert chat messages to OpenAI format
  for (const msg of contextMessages) {
    const textContent = msg.content.blocks
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    openAIMessages.push({
      role: msg.role,
      content: textContent,
    });
  }

  return openAIMessages;
}

/**
 * Create streaming chat completion
 */
export async function createStreamingCompletion(
  openai: OpenAI,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
  const stream = await openai.chat.completions.create({
    model: options.model || DEFAULT_MODEL,
    messages,
    temperature: options.temperature ?? DEFAULT_TEMPERATURE,
    max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    stream: true,
  });

  return stream;
}

/**
 * Create non-streaming chat completion
 */
export async function createCompletion(
  openai: OpenAI,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const completion = await openai.chat.completions.create({
    model: options.model || DEFAULT_MODEL,
    messages,
    temperature: options.temperature ?? DEFAULT_TEMPERATURE,
    max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    stream: false,
  });

  return completion;
}

/**
 * Estimate token count (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}
