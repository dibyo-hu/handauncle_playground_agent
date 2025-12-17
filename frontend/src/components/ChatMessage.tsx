/**
 * Chat Message Component
 * Displays individual chat messages with role-based styling
 */

import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';
import { Copy, Check } from 'lucide-react';
import type { PlaygroundResponse } from '../types';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  response?: PlaygroundResponse;
}

export function ChatMessage({
  role,
  content,
  isStreaming = false,
  response,
}: ChatMessageProps) {
  const isUser = role === 'user';
  const hasContent = content && content.trim().length > 0;
  const [isCopied, setIsCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Memoize markdown rendering
  const renderedMarkdown = useMemo(() => {
    if (isUser || !content) return null;

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 first:mt-0 text-gray-900 dark:text-gray-100">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mt-5 mb-3 first:mt-0 text-gray-900 dark:text-gray-100">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-4 mb-2 first:mt-0 text-gray-900 dark:text-gray-100">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-3 leading-relaxed text-sm first:mt-0 last:mb-0 text-gray-800 dark:text-gray-200">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="my-4 ml-6 list-disc space-y-2 first:mt-0 last:mb-0 text-sm text-gray-800 dark:text-gray-200">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 ml-6 list-decimal space-y-2 first:mt-0 last:mb-0 text-sm text-gray-800 dark:text-gray-200">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed text-sm text-gray-800 dark:text-gray-200">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-4 pl-4 border-l-4 border-gray-300 dark:border-gray-600 italic text-gray-700 dark:text-gray-300 first:mt-0 last:mb-0">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {children}
            </a>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="bg-gray-200 dark:bg-gray-800 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={cn(className, 'text-sm')} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-gray-900 dark:bg-black text-gray-100 p-4 rounded-lg overflow-x-auto text-sm my-4 first:mt-0 last:mb-0">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-lg border border-gray-300 dark:border-gray-700 my-4 first:mt-0 last:mb-0">
              <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100 dark:bg-dark-lighter">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-dark-medium">
              {children}
            </tbody>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-100">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
              {children}
            </td>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900 dark:text-gray-100">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-800 dark:text-gray-200">
              {children}
            </em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    );
  }, [content, isUser]);

  return (
    <div
      className={cn(
        'group flex w-full px-2 md:px-4 py-2 md:py-3',
        isUser ? 'justify-end' : 'justify-start'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          'flex flex-col gap-1 relative min-w-0',
          isUser ? 'items-end max-w-[85%] md:max-w-[75%]' : 'items-start w-full'
        )}
      >
        {/* Message Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-3 leading-relaxed relative',
            isUser
              ? 'bg-primary-100/80 dark:bg-primary-900/40 border border-primary-200/50 dark:border-primary-800/40 text-gray-900 dark:text-gray-100 rounded-tr-sm'
              : 'bg-transparent text-gray-900 dark:text-gray-100 rounded-tl-sm'
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap text-sm">{content}</div>
          ) : (
            <div className="markdown-content">{renderedMarkdown}</div>
          )}
        </div>

        {/* Streaming indicator */}
        {isStreaming && !hasContent && (
          <div className="flex items-center gap-1.5 px-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 animate-shimmer">
              Generating...
            </span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-pulse-dot" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-pulse-dot" style={{ animationDelay: '200ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-pulse-dot" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        )}

        {/* Recommendations Table */}
        {!isUser && response?.type === 'success' && response.recommendation?.recommendations && response.recommendation.recommendations.length > 0 && (
          <div className="w-full mt-4">
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="recommendations-table w-full">
                <thead>
                  <tr>
                    <th className="text-xs">Fund</th>
                    <th className="text-xs">Action</th>
                    <th className="text-xs">Amount</th>
                    <th className="text-xs">Rationale</th>
                  </tr>
                </thead>
                <tbody>
                  {response.recommendation.recommendations.map((rec, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-dark-hover">
                      <td className="text-xs">
                        <div>
                          <span className="font-medium">{rec.instrument.name}</span>
                          <span className="text-gray-500 dark:text-gray-400 ml-1 text-[10px]">
                            ({rec.instrument.category})
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium',
                            rec.action === 'BUY' && 'badge-buy',
                            rec.action === 'SELL' && 'badge-sell',
                            rec.action === 'HOLD' && 'badge-hold'
                          )}
                        >
                          {rec.action}
                        </span>
                      </td>
                      <td className="text-xs font-medium">
                        {rec.amount > 0 ? `₹${rec.amount.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="text-xs text-gray-600 dark:text-gray-400 max-w-xs">
                        {rec.rationale}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Copy button */}
        {!isStreaming && hasContent && (
          <div
            className={cn(
              'flex items-center gap-0.5 transition-opacity duration-200',
              isHovered ? 'opacity-100' : 'opacity-0',
              isUser ? 'self-end' : 'self-start'
            )}
          >
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-md transition-colors cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              title={isCopied ? 'Copied!' : 'Copy'}
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
