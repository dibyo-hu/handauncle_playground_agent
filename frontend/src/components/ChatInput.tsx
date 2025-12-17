/**
 * Chat Input Component
 * Text input with send button for chat interface
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Square, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  isGenerating?: boolean;
  onStopGenerating?: () => void;
  placeholder?: string;
}

const PLACEHOLDERS = [
  'Ask about investment strategies...',
  'Help me plan my retirement...',
  'Which mutual fund should I invest in?',
  'How to build an emergency fund?',
  'Review my portfolio allocation...',
];

export function ChatInput({
  onSubmit,
  disabled = false,
  isGenerating = false,
  onStopGenerating,
  placeholder,
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cycle placeholder text
  useEffect(() => {
    if (placeholder || inputValue) return;

    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDERS.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [placeholder, inputValue]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, 44), 200);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [inputValue]);

  const handleSubmit = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || disabled || isSending || isGenerating) return;

    setIsSending(true);
    setInputValue('');

    try {
      await onSubmit(trimmed);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const displayPlaceholder = placeholder || PLACEHOLDERS[placeholderIndex];
  const isDisabled = disabled || isSending || isGenerating;
  const canSend = inputValue.trim() && !isDisabled;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div
        className={cn(
          'flex items-end gap-2 rounded-2xl border transition-all duration-200',
          'bg-gray-100 dark:bg-dark-lighter',
          'border-gray-200 dark:border-gray-700',
          'focus-within:ring-2 focus-within:ring-primary-500/50 focus-within:border-primary-500',
          'p-2'
        )}
      >
        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            rows={1}
            className={cn(
              'w-full border-0 outline-0 rounded-lg py-2 px-3 text-sm bg-transparent',
              'resize-none overflow-y-auto custom-scrollbar',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'text-gray-900 dark:text-gray-100',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            placeholder={displayPlaceholder}
            style={{ minHeight: '44px', maxHeight: '200px' }}
          />
        </div>

        {/* Send/Stop Button */}
        {isGenerating ? (
          <button
            onClick={onStopGenerating}
            className={cn(
              'flex items-center justify-center h-10 w-10 rounded-full transition-colors shrink-0',
              'bg-red-500 hover:bg-red-600 text-white'
            )}
            title="Stop generating"
          >
            <Square className="w-4 h-4 fill-white" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canSend}
            className={cn(
              'flex items-center justify-center h-10 w-10 rounded-full transition-colors shrink-0',
              canSend
                ? 'bg-gray-900 dark:bg-gray-100 hover:bg-gray-700 dark:hover:bg-gray-200 text-white dark:text-gray-900'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            )}
            title="Send message"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
        <strong className="font-medium">Not a financial advisor</strong>, just your AI guide.
      </p>
    </div>
  );
}
