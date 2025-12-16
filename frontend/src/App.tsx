/**
 * Main App Component
 *
 * Agentic Finance Playground - Experiment-driven UI for Indian personal finance recommendations.
 *
 * Layout:
 * - Left panel: User context editor + System prompt editor
 * - Right panel: Query input + Results display
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, Activity } from 'lucide-react';
import { ContextEditor } from './components/ContextEditor';
import { SystemPromptEditor } from './components/SystemPromptEditor';
import { OutputFormatEditor } from './components/OutputFormatEditor';
import { QueryInput } from './components/QueryInput';
import { ResultDisplay } from './components/ResultDisplay';
import { fetchDefaultContext, fetchDefaultPrompt, fetchDefaultOutputFormat, submitQuery, checkHealth } from './lib/api';
import type { UserFinanceContext, PlaygroundResponse } from './types';

type Status = 'idle' | 'loading' | 'error' | 'offline';

export default function App() {
  // State
  const [status, setStatus] = useState<Status>('loading');
  const [backendError, setBackendError] = useState<string | null>(null);
  const [userContext, setUserContext] = useState<UserFinanceContext | null>(null);
  const [defaultContext, setDefaultContext] = useState<UserFinanceContext | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [defaultPrompt, setDefaultPrompt] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<string>('');
  const [defaultOutputFormat, setDefaultOutputFormat] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [response, setResponse] = useState<PlaygroundResponse | null>(null);

  // Initialize - fetch defaults
  useEffect(() => {
    async function init() {
      try {
        // Check backend health
        await checkHealth();

        // Fetch defaults in parallel
        const [contextData, promptData, formatData] = await Promise.all([
          fetchDefaultContext(),
          fetchDefaultPrompt(),
          fetchDefaultOutputFormat(),
        ]);

        setDefaultContext(contextData.context);
        setUserContext(contextData.context);
        setDefaultPrompt(promptData.system_prompt);
        setSystemPrompt(promptData.system_prompt);
        setDefaultOutputFormat(formatData.output_format);
        setOutputFormat(formatData.output_format);
        setStatus('idle');
      } catch (err) {
        console.error('Initialization failed:', err);
        setBackendError(err instanceof Error ? err.message : 'Failed to connect to backend');
        setStatus('offline');
      }
    }

    init();
  }, []);

  // Handle query submission
  const handleSubmit = useCallback(
    async (query: string) => {
      if (!userContext) return;

      setIsQuerying(true);
      setLastQuery(query);
      setResponse(null);

      try {
        // Pass system prompt and output format only if different from default
        const customPrompt = systemPrompt !== defaultPrompt ? systemPrompt : undefined;
        const customOutputFormat = outputFormat !== defaultOutputFormat ? outputFormat : undefined;
        const result = await submitQuery(query, userContext, customPrompt, customOutputFormat);
        setResponse(result);
      } catch (err) {
        console.error('Query failed:', err);
        setResponse({
          type: 'error',
          error: err instanceof Error ? err.message : 'Request failed',
          layer: 'FRONTEND',
        });
      } finally {
        setIsQuerying(false);
      }
    },
    [userContext, systemPrompt, defaultPrompt, outputFormat, defaultOutputFormat]
  );

  // Handle replay (same query with potentially modified context/prompt)
  const handleReplay = useCallback(() => {
    if (lastQuery) {
      handleSubmit(lastQuery);
    }
  }, [lastQuery, handleSubmit]);

  // Handle context change
  const handleContextChange = useCallback((newContext: UserFinanceContext) => {
    setUserContext(newContext);
  }, []);

  // Handle prompt change
  const handlePromptChange = useCallback((newPrompt: string) => {
    setSystemPrompt(newPrompt);
  }, []);

  // Handle output format change
  const handleOutputFormatChange = useCallback((newFormat: string) => {
    setOutputFormat(newFormat);
  }, []);

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-3" />
          <p className="text-surface-600">Connecting to backend...</p>
        </div>
      </div>
    );
  }

  // Offline state
  if (status === 'offline') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-surface-800 mb-2">Backend Offline</h1>
          <p className="text-surface-600 mb-4">{backendError}</p>
          <div className="bg-surface-100 rounded-lg p-4 text-left text-sm">
            <p className="font-medium mb-2">To start the backend:</p>
            <code className="block bg-surface-200 p-2 rounded text-xs">
              cd agentic-playground/backend<br />
              npm install<br />
              npm run dev
            </code>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="bg-white border-b border-surface-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-surface-800 flex items-center gap-2">
              <Activity className="text-primary-500" />
              Agentic Finance Playground
            </h1>
            <p className="text-sm text-surface-500">
              Experiment with Indian personal finance recommendations
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-surface-600">Backend Connected</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Context & Prompt Editors */}
          <div className="lg:col-span-1 space-y-4">
            {/* User Context Editor */}
            <div className="bg-white rounded-lg border border-surface-200 p-4 h-[500px] flex flex-col">
              {userContext && (
                <ContextEditor
                  context={userContext}
                  defaultContext={defaultContext}
                  onChange={handleContextChange}
                  disabled={isQuerying}
                />
              )}
            </div>

            {/* System Prompt Editor */}
            <SystemPromptEditor
              prompt={systemPrompt}
              defaultPrompt={defaultPrompt}
              onChange={handlePromptChange}
              disabled={isQuerying}
            />

            {/* Output Format Editor */}
            <OutputFormatEditor
              outputFormat={outputFormat}
              defaultOutputFormat={defaultOutputFormat}
              onChange={handleOutputFormatChange}
              disabled={isQuerying}
            />
          </div>

          {/* Right Panel - Query & Results */}
          <div className="lg:col-span-2 space-y-4">
            {/* Query Input */}
            <div className="bg-white rounded-lg border border-surface-200 p-4">
              <QueryInput
                onSubmit={handleSubmit}
                onReplay={handleReplay}
                isLoading={isQuerying}
                lastQuery={lastQuery}
              />
            </div>

            {/* Results */}
            <div className="bg-white rounded-lg border border-surface-200 p-4 min-h-[500px]">
              {isQuerying && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-3" />
                  <p className="text-surface-600">Processing your query...</p>
                  <p className="text-sm text-surface-400 mt-1">
                    Running through classification, web search, and recommendation layers
                  </p>
                </div>
              )}

              {!isQuerying && !response && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mb-4">
                    <Activity className="w-8 h-8 text-surface-400" />
                  </div>
                  <h3 className="text-lg font-medium text-surface-700 mb-2">
                    Ready for experiments
                  </h3>
                  <p className="text-surface-500 max-w-md">
                    Enter a query about Indian personal finance to get AI-powered recommendations.
                    Modify the user context or system prompt to see how recommendations change.
                  </p>
                </div>
              )}

              {!isQuerying && response && lastQuery && (
                <ResultDisplay response={response} query={lastQuery} />
              )}
            </div>

            {/* Experiment Info */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-800">
              <strong>Experiment Mode:</strong> This is a behavior experimentation tool.
              Modify the user context JSON or system prompt on the left and replay the same query
              to observe how recommendations change based on different profiles or AI personalities.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
