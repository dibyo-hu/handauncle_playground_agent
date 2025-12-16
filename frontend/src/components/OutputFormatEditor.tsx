/**
 * Output Format Editor Component
 *
 * Allows editing the output format instructions for experimentation.
 * WARNING: Users should NOT edit the JSON schema structure.
 */

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, FileJson, AlertTriangle } from 'lucide-react';

interface OutputFormatEditorProps {
  outputFormat: string;
  defaultOutputFormat: string | null;
  onChange: (outputFormat: string) => void;
  disabled?: boolean;
}

export function OutputFormatEditor({
  outputFormat,
  defaultOutputFormat,
  onChange,
  disabled,
}: OutputFormatEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFormat, setLocalFormat] = useState(outputFormat);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalFormat(e.target.value);
  }, []);

  const handleBlur = useCallback(() => {
    onChange(localFormat);
  }, [localFormat, onChange]);

  const handleReset = useCallback(() => {
    if (defaultOutputFormat) {
      setLocalFormat(defaultOutputFormat);
      onChange(defaultOutputFormat);
    }
  }, [defaultOutputFormat, onChange]);

  const isModified = defaultOutputFormat && localFormat !== defaultOutputFormat;

  return (
    <div className="bg-white rounded-lg border border-surface-200">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-surface-50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <FileJson size={16} className="text-orange-500" />
          <span className="font-medium text-surface-700">Output Format</span>
          {isModified && (
            <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
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
          {/* Warning disclaimer */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800">
              <strong>Warning:</strong> Do NOT edit the JSON schema structure (the curly braces and field names).
              You CAN safely edit:
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>AMOUNT RULES BY ACTION TYPE</li>
                <li>REBALANCING RULES</li>
                <li>CRITICAL RULES</li>
                <li>Field descriptions (the text in quotes)</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-surface-500">
              Customize the output format rules. Changes apply on blur.
            </p>
            <button
              onClick={handleReset}
              disabled={disabled || !defaultOutputFormat || !isModified}
              className="flex items-center gap-1 px-2 py-1 text-xs text-surface-600 hover:text-surface-800 hover:bg-surface-100 rounded disabled:opacity-50"
              title="Reset to default format"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          </div>

          <textarea
            value={localFormat}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            className={`
              w-full h-80 p-3 text-xs rounded-lg border resize-none
              font-mono leading-relaxed
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              border-surface-200 bg-surface-50
              focus:ring-2 focus:ring-orange-500 focus:border-transparent
            `}
            spellCheck={false}
            placeholder="Enter output format instructions..."
          />

          <div className="text-xs text-surface-400">
            Tip: You can adjust the rules for amount calculations, rebalancing behavior, or add new critical rules.
          </div>
        </div>
      )}
    </div>
  );
}
