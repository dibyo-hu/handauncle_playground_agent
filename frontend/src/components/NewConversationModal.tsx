/**
 * New Conversation Modal
 * Modal for setting system prompt and user context when starting a new conversation
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (systemPrompt: string, userContext: string) => void;
  onSkip: () => void;
}

export function NewConversationModal({
  isOpen,
  onClose,
  onSave,
  onSkip,
}: NewConversationModalProps) {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userContext, setUserContext] = useState('');

  const handleSave = () => {
    onSave(systemPrompt, userContext);
    setSystemPrompt('');
    setUserContext('');
  };

  const handleSkip = () => {
    onSkip();
    setSystemPrompt('');
    setUserContext('');
  };

  const handleClose = () => {
    onClose();
    setSystemPrompt('');
    setUserContext('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-dark-lighter rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              New Conversation
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Optional: Set custom system prompt and user context
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              System Prompt
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful assistant specialized in..."
              className={cn(
                'w-full px-4 py-3 rounded-lg border resize-none',
                'bg-white dark:bg-dark-medium',
                'border-gray-300 dark:border-gray-600',
                'text-gray-900 dark:text-gray-100',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                'transition-colors'
              )}
              rows={6}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Custom instructions for the AI's behavior and personality
            </p>
          </div>

          {/* User Context */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              User Context
            </label>
            <textarea
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              placeholder="Age: 30&#10;Occupation: Software Engineer&#10;Location: San Francisco&#10;Goals: Save for retirement"
              className={cn(
                'w-full px-4 py-3 rounded-lg border resize-none',
                'bg-white dark:bg-dark-medium',
                'border-gray-300 dark:border-gray-600',
                'text-gray-900 dark:text-gray-100',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                'transition-colors'
              )}
              rows={6}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Information about the user that will be appended to the system prompt
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>💡 Tip:</strong> Both fields are optional. Skip to start chatting immediately, or set them to customize the conversation behavior.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-medium">
          <button
            onClick={handleSkip}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-hover rounded-lg transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors shadow-sm"
          >
            Save & Start
          </button>
        </div>
      </div>
    </div>
  );
}
