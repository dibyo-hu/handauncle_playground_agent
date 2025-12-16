/**
 * System Prompt Editor Component
 *
 * Allows editing the system prompt for experimentation.
 * Collapsible by default to save space.
 */

import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, Sparkles } from 'lucide-react';

interface SystemPromptEditorProps {
  prompt: string;
  defaultPrompt: string | null;
  onChange: (prompt: string) => void;
  disabled?: boolean;
}

export function SystemPromptEditor({
  prompt,
  defaultPrompt,
  onChange,
  disabled,
}: SystemPromptEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localPrompt, setLocalPrompt] = useState(prompt);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalPrompt(e.target.value);
  }, []);

  const handleBlur = useCallback(() => {
    onChange(localPrompt);
  }, [localPrompt, onChange]);

  const handleReset = useCallback(() => {
    if (defaultPrompt) {
      setLocalPrompt(defaultPrompt);
      onChange(defaultPrompt);
    }
  }, [defaultPrompt, onChange]);

  const isModified = defaultPrompt && localPrompt !== defaultPrompt;

  return (
    <div className="bg-white rounded-lg border border-surface-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-surface-50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-500" />
          <span className="font-medium text-surface-700">System Prompt</span>
          {isModified && (
            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
              Modified
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp size={18} className="text-surface-400" />
        ) : (
          <ChevronDown size={18} className="text-surface-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-surface-500">
              Customize the AI's personality and behavior. Changes apply on blur.
            </p>
            <button
              onClick={handleReset}
              disabled={disabled || !defaultPrompt || !isModified}
              className="flex items-center gap-1 px-2 py-1 text-xs text-surface-600 hover:text-surface-800 hover:bg-surface-100 rounded disabled:opacity-50"
              title="Reset to default prompt"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>

          <textarea
            value={localPrompt}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            className={`
              w-full h-72 p-3 text-sm rounded-lg border resize-none
              font-mono leading-relaxed
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              border-surface-200 bg-surface-50
              focus:ring-2 focus:ring-purple-500 focus:border-transparent
            `}
            spellCheck={false}
            placeholder="Enter system prompt..."
          />

          <div className="text-xs text-surface-400">
            Tip: Try changing the personality, adding new rules, or modifying the disclaimer.
          </div>
        </div>
      )}
    </div>
  );
}
