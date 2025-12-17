/**
 * Playground Sidebar Component
 * Simplified sidebar for Tool Playground mode with just system prompt and context
 */

import { useState, useEffect, useRef } from 'react';
import {
  Menu,
  X,
  Plus,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/theme-context';

interface PlaygroundSidebarProps {
  systemPrompt: string;
  defaultPrompt: string | null;
  onPromptChange: (prompt: string) => void;
  context: string;
  onContextChange: (context: string) => void;
  onNewChat: () => void;
  disabled?: boolean;
}

export function PlaygroundSidebar({
  systemPrompt,
  defaultPrompt,
  onPromptChange,
  context,
  onContextChange,
  onNewChat,
  disabled = false,
}: PlaygroundSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [contextExpanded, setContextExpanded] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close on click outside for mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobile &&
        isOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, isOpen]);

  const isPromptModified = systemPrompt !== defaultPrompt;

  const resetPrompt = () => {
    if (defaultPrompt) {
      onPromptChange(defaultPrompt);
    }
  };

  const themeOptions = [
    { value: 'system', icon: Monitor, label: 'System' },
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
  ] as const;

  return (
    <>
      {/* Mobile menu button */}
      {isMobile && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-dark-lighter shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
      )}

      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={cn(
          'flex flex-col h-full bg-gray-50 dark:bg-dark-lighter border-r border-gray-200 dark:border-gray-800 transition-all duration-300 z-50',
          isMobile ? 'fixed left-0 top-0' : 'relative',
          isOpen ? 'w-80' : 'w-0',
          !isOpen && 'overflow-hidden'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tool Playground
          </h1>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-custom">
          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            disabled={disabled}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors',
              disabled
                ? 'bg-gray-200 dark:bg-dark-medium text-gray-500 cursor-not-allowed'
                : 'bg-primary-500 hover:bg-primary-600 text-white'
            )}
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>

          {/* System Prompt Editor */}
          <div className="space-y-2">
            <button
              onClick={() => setPromptExpanded(!promptExpanded)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                {promptExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  System Prompt
                </span>
                {isPromptModified && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                    Modified
                  </span>
                )}
              </div>
              {isPromptModified && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetPrompt();
                  }}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-dark-hover"
                  title="Reset to default"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                </button>
              )}
            </button>

            {promptExpanded && (
              <textarea
                value={systemPrompt}
                onChange={(e) => onPromptChange(e.target.value)}
                disabled={disabled}
                className={cn(
                  'w-full h-48 p-3 text-sm rounded-lg border resize-none',
                  'bg-white dark:bg-dark-medium',
                  'border-gray-200 dark:border-gray-700',
                  'text-gray-900 dark:text-gray-100',
                  'focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'scrollbar-custom'
                )}
                placeholder="Enter system prompt..."
              />
            )}
          </div>

          {/* Context Editor */}
          <div className="space-y-2">
            <button
              onClick={() => setContextExpanded(!contextExpanded)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                {contextExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Context / Parameters
                </span>
                {context && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    Set
                  </span>
                )}
              </div>
              {context && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onContextChange('');
                  }}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-dark-hover"
                  title="Clear context"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                </button>
              )}
            </button>

            {contextExpanded && (
              <textarea
                value={context}
                onChange={(e) => onContextChange(e.target.value)}
                disabled={disabled}
                className={cn(
                  'w-full h-48 p-3 text-sm rounded-lg border resize-none',
                  'bg-white dark:bg-dark-medium',
                  'border-gray-200 dark:border-gray-700',
                  'text-gray-900 dark:text-gray-100',
                  'focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'scrollbar-custom'
                )}
                placeholder="Add any context or parameters to include with each message..."
              />
            )}
          </div>
        </div>

        {/* Footer - Theme Switcher */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Theme</span>
            <div className="flex items-center gap-1 p-0.5 bg-gray-200 dark:bg-dark-medium rounded-lg">
              {themeOptions.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    'p-1.5 rounded-md transition-colors',
                    theme === value
                      ? 'bg-white dark:bg-dark-hover text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  )}
                  title={label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Toggle button when sidebar is closed (desktop) */}
      {!isMobile && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="absolute top-4 left-4 p-2 rounded-lg bg-white dark:bg-dark-lighter shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors z-10"
        >
          <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
      )}
    </>
  );
}
