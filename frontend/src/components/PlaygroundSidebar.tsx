/**
 * Playground Sidebar Component
 * Sidebar for Tool Playground mode with model settings and conversation list
 */

import { useState, useEffect, useRef } from 'react';
import {
  Menu,
  X,
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  MessageSquare,
  Sun,
  Moon,
  Monitor,
  Settings,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/theme-context';

interface ConversationItem {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
}

interface PlaygroundSidebarProps {
  conversationId: string | null;
  onConversationSelect: (id: string | null) => void;
  conversations: ConversationItem[];
  onRefreshConversations: () => void;
  onDeleteConversation: (id: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  temperature: number;
  onTemperatureChange: (temp: number) => void;
  onNewChat: () => void;
  disabled?: boolean;
}

const MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
];

export function PlaygroundSidebar({
  conversationId,
  onConversationSelect,
  conversations,
  onRefreshConversations,
  onDeleteConversation,
  model,
  onModelChange,
  temperature,
  onTemperatureChange,
  onNewChat,
  disabled = false,
}: PlaygroundSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [conversationsExpanded, setConversationsExpanded] = useState(true);
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

  // Refresh conversations on mount
  useEffect(() => {
    onRefreshConversations();
  }, [onRefreshConversations]);

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

          {/* Model Settings */}
          <div className="space-y-2">
            <button
              onClick={() => setSettingsExpanded(!settingsExpanded)}
              className="flex items-center gap-2 w-full text-left"
            >
              {settingsExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
              <Settings className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Settings
              </span>
            </button>

            {settingsExpanded && (
              <div className="ml-6 space-y-3">
                {/* Model Selection */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Model
                  </label>
                  <select
                    value={model}
                    onChange={(e) => onModelChange(e.target.value)}
                    disabled={disabled}
                    className={cn(
                      'w-full px-3 py-2 text-sm rounded-lg border',
                      'bg-white dark:bg-dark-medium',
                      'border-gray-200 dark:border-gray-700',
                      'text-gray-900 dark:text-gray-100',
                      'focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {MODELS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Temperature */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Temperature: {temperature.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
                    disabled={disabled}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Focused</span>
                    <span>Creative</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Conversations List */}
          <div className="space-y-2">
            <button
              onClick={() => setConversationsExpanded(!conversationsExpanded)}
              className="flex items-center gap-2 w-full text-left"
            >
              {conversationsExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Conversations ({conversations.length})
              </span>
            </button>

            {conversationsExpanded && (
              <div className="ml-2 space-y-1 max-h-64 overflow-y-auto scrollbar-custom">
                {conversations.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 py-2 px-2">
                    No conversations yet
                  </p>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        'group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors',
                        conversationId === conv.id
                          ? 'bg-primary-100 dark:bg-primary-900/30'
                          : 'hover:bg-gray-200 dark:hover:bg-dark-hover'
                      )}
                      onClick={() => onConversationSelect(conv.id)}
                    >
                      <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">
                        {conv.title || 'Untitled'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conv.id);
                        }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  ))
                )}
              </div>
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
