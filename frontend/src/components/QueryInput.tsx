/**
 * Query Input Component
 *
 * Text input for user queries with submit button.
 * Shows loading state during processing.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Loader2, RefreshCw } from 'lucide-react';

interface QueryInputProps {
  onSubmit: (query: string) => void;
  onReplay: () => void;
  isLoading: boolean;
  lastQuery: string | null;
}

const EXAMPLE_QUERIES = [
  "Which mutual fund should I start a SIP in?",
  "Is my portfolio well balanced?",
  "How should I invest my monthly surplus?",
  "Should I increase my emergency fund?",
  "Recommend some good ELSS funds for tax saving",
  "I want to invest for my child's education in 15 years",
];

export function QueryInput({ onSubmit, onReplay, isLoading, lastQuery }: QueryInputProps) {
  const [query, setQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [query]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim() && !isLoading) {
        onSubmit(query.trim());
      }
    },
    [query, isLoading, onSubmit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (query.trim() && !isLoading) {
          onSubmit(query.trim());
        }
      }
    },
    [query, isLoading, onSubmit]
  );

  const handleExampleClick = useCallback((example: string) => {
    setQuery(example);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Ask about Indian mutual funds, SIPs, portfolio allocation..."
          className={`
            w-full p-4 pr-24 rounded-lg border border-surface-200
            bg-white text-surface-800 placeholder-surface-400
            focus:ring-2 focus:ring-primary-500 focus:border-transparent
            resize-none min-h-[56px]
            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          rows={1}
        />

        <div className="absolute right-2 bottom-2 flex items-center gap-2">
          {lastQuery && (
            <button
              type="button"
              onClick={onReplay}
              disabled={isLoading}
              className="p-2 text-surface-500 hover:text-surface-700 hover:bg-surface-100 rounded-lg transition-colors disabled:opacity-50"
              title="Replay last query with current context"
            >
              <RefreshCw size={18} />
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className={`
              p-2 rounded-lg transition-colors
              ${
                isLoading || !query.trim()
                  ? 'bg-surface-100 text-surface-400 cursor-not-allowed'
                  : 'bg-primary-500 text-white hover:bg-primary-600'
              }
            `}
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-surface-500">Try:</span>
        {EXAMPLE_QUERIES.slice(0, 3).map((example) => (
          <button
            key={example}
            onClick={() => handleExampleClick(example)}
            disabled={isLoading}
            className="text-sm px-2 py-1 rounded bg-surface-100 text-surface-600 hover:bg-surface-200 hover:text-surface-800 transition-colors disabled:opacity-50"
          >
            {example.length > 40 ? example.slice(0, 40) + '...' : example}
          </button>
        ))}
      </div>
    </div>
  );
}
