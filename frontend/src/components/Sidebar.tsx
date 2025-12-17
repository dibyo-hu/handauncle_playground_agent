/**
 * Sidebar Component
 *
 * Collapsible sidebar with:
 * - Logo and toggle
 * - New Chat button
 * - Tweakable Parameters (User Context, System Prompt, Output Format)
 * - Theme switcher
 */

import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/theme-context';
import {
  PanelLeftIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  PlusIcon,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  User,
  Sparkles,
  FileJson,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import type { UserFinanceContext } from '../types';

interface SidebarProps {
  // User Context
  userContext: UserFinanceContext | null;
  defaultContext: UserFinanceContext | null;
  onContextChange: (context: UserFinanceContext) => void;
  // System Prompt
  systemPrompt: string;
  defaultPrompt: string | null;
  onPromptChange: (prompt: string) => void;
  // Output Format
  outputFormat: string;
  defaultOutputFormat: string | null;
  onOutputFormatChange: (format: string) => void;
  // Other
  onNewChat: () => void;
  disabled?: boolean;
}

export function Sidebar({
  userContext,
  defaultContext,
  onContextChange,
  systemPrompt,
  defaultPrompt,
  onPromptChange,
  outputFormat,
  defaultOutputFormat,
  onOutputFormatChange,
  onNewChat,
  disabled = false,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // Context editor state
  const [contextExpanded, setContextExpanded] = useState(false);
  const [contextText, setContextText] = useState('');
  const [contextError, setContextError] = useState<string | null>(null);

  // Prompt editor state
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [localPrompt, setLocalPrompt] = useState(systemPrompt);

  // Output format editor state
  const [formatExpanded, setFormatExpanded] = useState(false);
  const [localFormat, setLocalFormat] = useState(outputFormat);

  useEffect(() => {
    setMounted(true);
    // Initialize on desktop
    if (typeof window !== 'undefined') {
      const isDesktop = window.innerWidth >= 768;
      setIsOpen(isDesktop);
    }
  }, []);

  // Sync context text
  useEffect(() => {
    if (userContext) {
      setContextText(JSON.stringify(userContext, null, 2));
    }
  }, [userContext]);

  // Sync prompt
  useEffect(() => {
    setLocalPrompt(systemPrompt);
  }, [systemPrompt]);

  // Sync output format
  useEffect(() => {
    setLocalFormat(outputFormat);
  }, [outputFormat]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  // Context handlers
  const handleContextBlur = () => {
    try {
      const parsed = JSON.parse(contextText);
      setContextError(null);
      onContextChange(parsed);
    } catch {
      setContextError('Invalid JSON');
    }
  };

  const handleContextReset = () => {
    if (defaultContext) {
      setContextText(JSON.stringify(defaultContext, null, 2));
      setContextError(null);
      onContextChange(defaultContext);
    }
  };

  // Prompt handlers
  const handlePromptBlur = () => {
    onPromptChange(localPrompt);
  };

  const handlePromptReset = () => {
    if (defaultPrompt) {
      setLocalPrompt(defaultPrompt);
      onPromptChange(defaultPrompt);
    }
  };

  // Format handlers
  const handleFormatBlur = () => {
    onOutputFormatChange(localFormat);
  };

  const handleFormatReset = () => {
    if (defaultOutputFormat) {
      setLocalFormat(defaultOutputFormat);
      onOutputFormatChange(defaultOutputFormat);
    }
  };

  const contextModified = defaultContext && contextText !== JSON.stringify(defaultContext, null, 2);
  const promptModified = defaultPrompt && localPrompt !== defaultPrompt;
  const formatModified = defaultOutputFormat && localFormat !== defaultOutputFormat;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'flex h-dvh md:h-screen flex-col bg-gray-100 dark:bg-dark-darker transition-all duration-300 ease-in-out overflow-hidden',
          'fixed md:relative z-50 md:z-auto',
          isOpen ? 'w-80' : 'w-0'
        )}
      >
        <div
          className={cn(
            'flex h-full w-80 flex-col transition-opacity duration-200',
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          {/* Header */}
          <div className="flex h-14 md:h-16 items-center justify-between px-3 md:px-4 shrink-0 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary-500" />
              <span className="text-lg font-medium text-gray-900 dark:text-white">
                Playground
              </span>
            </div>
            <button
              onClick={toggleSidebar}
              className="rounded-md p-2 text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-200/60 dark:hover:bg-gray-800/60"
              aria-label="Toggle sidebar"
            >
              <PanelLeftIcon className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col px-2 py-3 overflow-y-auto scrollbar-custom">
            {/* New Chat Button */}
            <button
              onClick={onNewChat}
              disabled={disabled}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 mb-4 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <PlusIcon className="h-4 w-4" />
              New Chat
            </button>

            {/* Parameters Section */}
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 mb-2">
              Parameters
            </div>

            <div className="space-y-2">
              {/* User Context Editor */}
              <div className="bg-white dark:bg-dark-lighter rounded-lg border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setContextExpanded(!contextExpanded)}
                  className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-dark-medium transition-colors rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-blue-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      User Context
                    </span>
                    {contextModified && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                        Modified
                      </span>
                    )}
                  </div>
                  {contextExpanded ? (
                    <ChevronUp size={16} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400" />
                  )}
                </button>

                {contextExpanded && (
                  <div className="px-3 pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        Edit user financial data (JSON)
                      </p>
                      <button
                        onClick={handleContextReset}
                        disabled={disabled || !defaultContext || !contextModified}
                        className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-medium rounded disabled:opacity-50"
                      >
                        <RotateCcw size={10} />
                        Reset
                      </button>
                    </div>

                    <textarea
                      value={contextText}
                      onChange={e => setContextText(e.target.value)}
                      onBlur={handleContextBlur}
                      disabled={disabled}
                      className={cn(
                        'w-full h-64 p-2 text-xs rounded-lg border resize-none font-mono',
                        'bg-gray-50 dark:bg-dark-medium',
                        contextError
                          ? 'border-red-300 dark:border-red-700'
                          : 'border-gray-200 dark:border-gray-700',
                        'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                        disabled && 'opacity-50 cursor-not-allowed'
                      )}
                      spellCheck={false}
                    />
                    {contextError && (
                      <p className="text-[10px] text-red-500">{contextError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* System Prompt Editor */}
              <div className="bg-white dark:bg-dark-lighter rounded-lg border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setPromptExpanded(!promptExpanded)}
                  className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-dark-medium transition-colors rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-purple-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      System Prompt
                    </span>
                    {promptModified && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                        Modified
                      </span>
                    )}
                  </div>
                  {promptExpanded ? (
                    <ChevronUp size={16} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400" />
                  )}
                </button>

                {promptExpanded && (
                  <div className="px-3 pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        Customize AI personality
                      </p>
                      <button
                        onClick={handlePromptReset}
                        disabled={disabled || !defaultPrompt || !promptModified}
                        className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-medium rounded disabled:opacity-50"
                      >
                        <RotateCcw size={10} />
                        Reset
                      </button>
                    </div>

                    <textarea
                      value={localPrompt}
                      onChange={e => setLocalPrompt(e.target.value)}
                      onBlur={handlePromptBlur}
                      disabled={disabled}
                      className={cn(
                        'w-full h-48 p-2 text-xs rounded-lg border resize-none font-mono',
                        'bg-gray-50 dark:bg-dark-medium border-gray-200 dark:border-gray-700',
                        'focus:ring-2 focus:ring-purple-500 focus:border-transparent',
                        disabled && 'opacity-50 cursor-not-allowed'
                      )}
                      spellCheck={false}
                    />
                  </div>
                )}
              </div>

              {/* Output Format Editor */}
              <div className="bg-white dark:bg-dark-lighter rounded-lg border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setFormatExpanded(!formatExpanded)}
                  className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-dark-medium transition-colors rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <FileJson size={14} className="text-orange-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Output Format
                    </span>
                    {formatModified && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded">
                        Modified
                      </span>
                    )}
                  </div>
                  {formatExpanded ? (
                    <ChevronUp size={16} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400" />
                  )}
                </button>

                {formatExpanded && (
                  <div className="px-3 pb-3 space-y-2">
                    {/* Warning */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-2 flex items-start gap-1.5">
                      <AlertTriangle size={12} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="text-[10px] text-amber-800 dark:text-amber-300">
                        <strong>Warning:</strong> Don't edit JSON schema. Safe to edit:
                        <ul className="list-disc list-inside mt-0.5">
                          <li>AMOUNT RULES</li>
                          <li>REBALANCING RULES</li>
                          <li>CRITICAL RULES</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        Output format rules
                      </p>
                      <button
                        onClick={handleFormatReset}
                        disabled={disabled || !defaultOutputFormat || !formatModified}
                        className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-medium rounded disabled:opacity-50"
                      >
                        <RotateCcw size={10} />
                        Reset
                      </button>
                    </div>

                    <textarea
                      value={localFormat}
                      onChange={e => setLocalFormat(e.target.value)}
                      onBlur={handleFormatBlur}
                      disabled={disabled}
                      className={cn(
                        'w-full h-56 p-2 text-xs rounded-lg border resize-none font-mono',
                        'bg-gray-50 dark:bg-dark-medium border-gray-200 dark:border-gray-700',
                        'focus:ring-2 focus:ring-orange-500 focus:border-transparent',
                        disabled && 'opacity-50 cursor-not-allowed'
                      )}
                      spellCheck={false}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer - Theme Switcher */}
          <div className="flex flex-col gap-1.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-base p-2.5 shrink-0 rounded-t-2xl">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-normal text-gray-700 dark:text-gray-300">
                Theme
              </span>
              <div className="inline-flex items-center gap-0.5 overflow-hidden rounded-lg bg-white/80 dark:bg-dark-medium/80 p-0.5 ring-1 ring-gray-300/50 dark:ring-white/10 ring-inset">
                <button
                  onClick={() => setTheme('system')}
                  className={cn(
                    'relative flex h-7 w-7 items-center justify-center rounded-md transition-all hover:bg-gray-100/80 dark:hover:bg-dark-hover/60',
                    mounted && theme === 'system'
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400'
                  )}
                  aria-label="System theme"
                >
                  <MonitorIcon className="h-[15px] w-[15px]" strokeWidth={2} />
                  {mounted && theme === 'system' && (
                    <div className="absolute inset-0 rounded-md bg-gray-200/40 dark:bg-gray-700/40" />
                  )}
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    'relative flex h-7 w-7 items-center justify-center rounded-md transition-all hover:bg-gray-100/80 dark:hover:bg-dark-hover/60',
                    mounted && theme === 'light'
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400'
                  )}
                  aria-label="Light theme"
                >
                  <SunIcon className="h-[15px] w-[15px]" strokeWidth={2} />
                  {mounted && theme === 'light' && (
                    <div className="absolute inset-0 rounded-md bg-gray-200/40 dark:bg-gray-700/40" />
                  )}
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    'relative flex h-7 w-7 items-center justify-center rounded-md transition-all hover:bg-gray-100/80 dark:hover:bg-dark-hover/60',
                    mounted && theme === 'dark'
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400'
                  )}
                  aria-label="Dark theme"
                >
                  <MoonIcon className="h-[15px] w-[15px]" strokeWidth={2} />
                  {mounted && theme === 'dark' && (
                    <div className="absolute inset-0 rounded-md bg-gray-200/40 dark:bg-gray-700/40" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Toggle button when sidebar is closed */}
      {!isOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed left-3 md:left-4 top-3 md:top-4 z-50 rounded-lg bg-white dark:bg-dark-lighter p-2.5 text-gray-600 dark:text-gray-300 transition-all hover:bg-gray-50 dark:hover:bg-dark-medium hover:text-gray-900 dark:hover:text-white shadow-lg"
          aria-label="Open sidebar"
        >
          <PanelLeftIcon className="h-5 w-5" strokeWidth={2} />
        </button>
      )}
    </>
  );
}
