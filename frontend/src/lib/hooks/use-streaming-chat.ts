/**
 * Streaming Chat Hook
 * Handles SSE streaming responses from the backend
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { UserFinanceContext, PlaygroundResponse } from '../../types';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  response?: PlaygroundResponse;
}

interface StreamEvent {
  type: 'token' | 'classification' | 'web_search' | 'recommendation' | 'done' | 'error';
  content?: string;
  data?: unknown;
  error?: string;
}

interface UseStreamingChatOptions {
  userContext: UserFinanceContext;
  systemPrompt?: string;
  outputFormat?: string;
}

export function useStreamingChat(options: UseStreamingChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentMessageRef = useRef<string>('');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmedContent = content.trim();
      if (!trimmedContent) return;

      setError(null);
      setIsStreaming(true);
      currentMessageRef.current = '';

      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmedContent,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, userMessage]);

      // Create assistant message placeholder
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Setup abort controller
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch('/api/recommend/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: trimmedContent,
            user_context: options.userContext,
            system_prompt: options.systemPrompt,
            output_format: options.outputFormat,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim() || !line.startsWith('data: ')) continue;

              try {
                const data = line.slice(6);
                const event: StreamEvent = JSON.parse(data);

                switch (event.type) {
                  case 'token':
                    if (event.content) {
                      currentMessageRef.current += event.content;
                      setMessages(prev =>
                        prev.map(msg =>
                          msg.id === assistantMessageId
                            ? { ...msg, content: currentMessageRef.current }
                            : msg
                        )
                      );
                    }
                    break;

                  case 'done':
                    // Final message with full response
                    setMessages(prev =>
                      prev.map(msg =>
                        msg.id === assistantMessageId
                          ? {
                              ...msg,
                              content: currentMessageRef.current,
                              response: event.data as PlaygroundResponse,
                            }
                          : msg
                      )
                    );
                    setIsStreaming(false);
                    break;

                  case 'error':
                    setError(event.error || 'An error occurred');
                    setIsStreaming(false);
                    break;
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
        }
        setIsStreaming(false);
      }
    },
    [options.userContext, options.systemPrompt, options.outputFormat]
  );

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    currentMessageRef.current = '';
  }, []);

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    cancelStream,
    clearMessages,
  };
}
