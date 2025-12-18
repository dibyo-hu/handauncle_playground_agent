/**
 * Chat Message Component
 * Displays individual chat messages with role-based styling
 * Supports rich content blocks: text, reasoning, tools, visuals
 */

import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';
import { Copy, Check, Wrench, Loader2, CheckCircle, XCircle, Lightbulb, ImageIcon, ChevronDown } from 'lucide-react';
import type { PlaygroundResponse } from '../types';

// Content block types
interface TextBlock {
  type: 'text';
  blockId: string;
  text: string;
}

interface ReasoningBlock {
  type: 'reasoning';
  blockId: string;
  text: string;
}

interface ToolCallBlock {
  type: 'tool';
  blockId: string;
  toolName: string;
  arguments: string;
  status: 'executing' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

interface VisualBlock {
  type: 'visual';
  blockId: string;
  visualType?: string;
  intent?: string;
  state?: unknown;
  status: 'creating' | 'updating' | 'completed';
}

type ContentBlock = TextBlock | ReasoningBlock | ToolCallBlock | VisualBlock;

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  response?: PlaygroundResponse;
  blocks?: ContentBlock[];
}

// Separate component for tool blocks to properly use hooks
function ToolBlock({ block }: { block: ToolCallBlock }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="my-2 border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden bg-blue-50/50 dark:bg-blue-900/10 max-w-full">
      {/* Tool Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-blue-100/50 dark:hover:bg-blue-900/20 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">
            {block.toolName}
          </span>
          {block.status === 'executing' && (
            <Loader2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
          )}
          {block.status === 'completed' && (
            <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
          )}
          {block.status === 'failed' && (
            <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-blue-700 dark:text-blue-300 capitalize">
            {block.status === 'executing' ? 'Running...' : block.status}
          </span>
          <ChevronDown 
            className={cn(
              "w-4 h-4 text-blue-600 dark:text-blue-400 transition-transform",
              isExpanded && "rotate-180"
            )} 
          />
        </div>
      </button>
      
      {/* Tool Details - Collapsible */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-blue-200 dark:border-blue-800 max-w-full overflow-hidden">
          {block.arguments && (
            <div className="mt-2">
              <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Arguments:</div>
              <pre className="text-xs bg-white dark:bg-blue-950/30 p-2 rounded border border-blue-200 dark:border-blue-800 overflow-x-auto text-blue-900 dark:text-blue-100 max-w-full whitespace-pre-wrap break-words">
                {typeof block.arguments === 'string' ? block.arguments : JSON.stringify(block.arguments, null, 2)}
              </pre>
            </div>
          )}

          {block.status === 'completed' && block.result !== undefined && (
            <div>
              <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">Result:</div>
              <pre className="text-xs bg-white dark:bg-green-950/30 p-2 rounded border border-green-200 dark:border-green-800 text-green-900 dark:text-green-100 max-h-96 overflow-y-auto max-w-full whitespace-pre-wrap break-words">
                {typeof block.result === 'string' ? block.result : JSON.stringify(block.result, null, 2)}
              </pre>
            </div>
          )}

          {block.status === 'failed' && block.error && (
            <div>
              <div className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">Error:</div>
              <div className="text-xs bg-white dark:bg-red-950/30 p-2 rounded border border-red-200 dark:border-red-800 text-red-900 dark:text-red-100 max-w-full whitespace-pre-wrap break-words">
                {block.error}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatMessage({
  role,
  content,
  isStreaming = false,
  response,
  blocks = [],
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

  // Render reasoning block
  const renderReasoningBlock = (block: ReasoningBlock) => (
    <div key={block.blockId} className="my-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">
          Reasoning
        </span>
      </div>
      <div className="text-sm text-purple-800 dark:text-purple-200 whitespace-pre-wrap font-mono">
        {block.text || <span className="text-purple-400">Thinking...</span>}
      </div>
    </div>
  );

  // Render visual block
  const renderVisualBlock = (block: VisualBlock) => (
    <div key={block.blockId} className="my-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            {block.visualType || 'Visual'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {block.status === 'creating' && (
            <>
              <Loader2 className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin" />
              <span className="text-xs text-amber-700 dark:text-amber-300">Creating...</span>
            </>
          )}
          {block.status === 'updating' && (
            <>
              <Loader2 className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin" />
              <span className="text-xs text-amber-700 dark:text-amber-300">Updating...</span>
            </>
          )}
          {block.status === 'completed' && (
            <>
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs text-green-700 dark:text-green-300">Ready</span>
            </>
          )}
        </div>
      </div>

      {block.intent && (
        <div className="text-sm text-amber-700 dark:text-amber-300 mb-2">
          {block.intent}
        </div>
      )}

      {block.state !== undefined && (
        <div className="mt-2">
          <div className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">State:</div>
          <pre className="text-xs bg-amber-100 dark:bg-amber-950/50 p-2 rounded overflow-x-auto text-amber-900 dark:text-amber-100">
            {JSON.stringify(block.state, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );

  // Render text block
  const renderTextBlock = (block: TextBlock) => {
    console.log('[ChatMessage] Rendering text block:', {
      blockId: block.blockId,
      text: block.text,
      hasText: !!block.text,
      textLength: block.text?.length || 0,
    });
    
    if (!block.text) {
      console.log('[ChatMessage] Skipping empty text block:', block.blockId);
      return null;
    }
    
    return (
      <div key={block.blockId} className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => (
              <p className="my-2 leading-relaxed text-sm text-gray-800 dark:text-gray-200">
                {children}
              </p>
            ),
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold my-4 text-gray-900 dark:text-gray-100 first:mt-0">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-bold my-3 text-gray-900 dark:text-gray-100 first:mt-0">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-bold my-2 text-gray-900 dark:text-gray-100 first:mt-0">
                {children}
              </h3>
            ),
            ul: ({ children }) => (
              <ul className="my-3 ml-6 list-disc space-y-1 text-sm text-gray-800 dark:text-gray-200 first:mt-0 last:mb-0">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="my-3 ml-6 list-decimal space-y-1 text-sm text-gray-800 dark:text-gray-200 first:mt-0 last:mb-0">
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
                  <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono text-gray-800 dark:text-gray-200">
                    {children}
                  </code>
                );
              }
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre className="my-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto text-xs first:mt-0 last:mb-0">
                {children}
              </pre>
            ),
          }}
        >
          {block.text}
        </ReactMarkdown>
      </div>
    );
  };

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
            <div className="markdown-content">
              {/* Render rich content blocks if available (Tool Playground) */}
              {blocks && blocks.length > 0 ? (
                <div className="space-y-3">
                  {(() => {
                    console.log('[ChatMessage] Rendering blocks:', {
                      count: blocks.length,
                      types: blocks.map(b => b.type),
                      blockIds: blocks.map(b => b.blockId),
                      blocks: blocks,
                    });
                    return null;
                  })()}
                  {blocks.map((block) => {
                    switch (block.type) {
                      case 'reasoning':
                        return renderReasoningBlock(block);
                      case 'tool':
                        return <ToolBlock key={block.blockId} block={block} />;
                      case 'visual':
                        return renderVisualBlock(block);
                      case 'text':
                        return renderTextBlock(block);
                      default:
                        return null;
                    }
                  })}
                </div>
              ) : (
                // Fallback to regular markdown rendering
                renderedMarkdown
              )}
            </div>
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
