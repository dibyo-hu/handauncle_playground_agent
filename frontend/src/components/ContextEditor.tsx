/**
 * Context Editor Component
 *
 * JSON editor for the user financial context.
 * Validates JSON on blur and shows errors.
 */

import React, { useState, useCallback } from 'react';
import { AlertCircle, Check, RotateCcw } from 'lucide-react';
import type { UserFinanceContext } from '../types';

interface ContextEditorProps {
  context: UserFinanceContext;
  defaultContext: UserFinanceContext | null;
  onChange: (context: UserFinanceContext) => void;
  disabled?: boolean;
}

export function ContextEditor({
  context,
  defaultContext,
  onChange,
  disabled,
}: ContextEditorProps) {
  const [jsonText, setJsonText] = useState(() => JSON.stringify(context, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setJsonText(value);
    setError(null);
  }, []);

  const handleBlur = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText);

      // Basic validation
      if (typeof parsed.monthly_income !== 'number' || parsed.monthly_income <= 0) {
        throw new Error('monthly_income must be a positive number');
      }
      if (typeof parsed.monthly_expenses !== 'number' || parsed.monthly_expenses <= 0) {
        throw new Error('monthly_expenses must be a positive number');
      }
      if (!Array.isArray(parsed.mutual_fund_holdings)) {
        throw new Error('mutual_fund_holdings must be an array');
      }
      if (!['low', 'moderate', 'high'].includes(parsed.risk_profile)) {
        throw new Error('risk_profile must be low, moderate, or high');
      }

      setIsValid(true);
      setError(null);
      onChange(parsed);
    } catch (err) {
      setIsValid(false);
      setError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  }, [jsonText, onChange]);

  const handleReset = useCallback(() => {
    if (defaultContext) {
      const defaultJson = JSON.stringify(defaultContext, null, 2);
      setJsonText(defaultJson);
      setIsValid(true);
      setError(null);
      onChange(defaultContext);
    }
  }, [defaultContext, onChange]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-surface-800">User Context</h3>
          {isValid ? (
            <span className="flex items-center text-green-600 text-sm">
              <Check size={14} className="mr-1" />
              Valid
            </span>
          ) : (
            <span className="flex items-center text-red-600 text-sm">
              <AlertCircle size={14} className="mr-1" />
              Invalid
            </span>
          )}
        </div>
        <button
          onClick={handleReset}
          disabled={disabled || !defaultContext}
          className="flex items-center gap-1 px-2 py-1 text-sm text-surface-600 hover:text-surface-800 hover:bg-surface-100 rounded disabled:opacity-50"
          title="Reset to default context"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      <textarea
        value={jsonText}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        className={`
          json-editor flex-1 w-full p-3 rounded-lg border resize-none
          ${error ? 'border-red-300 bg-red-50' : 'border-surface-200 bg-surface-50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          focus:ring-2 focus:ring-primary-500 focus:border-transparent
        `}
        spellCheck={false}
      />

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="mt-2 text-xs text-surface-500">
        Edit the JSON above to change user financial data. Changes apply on blur.
      </div>
    </div>
  );
}
