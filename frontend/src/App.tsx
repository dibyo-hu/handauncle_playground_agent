/**
 * Main App Component
 *
 * Agentic Finance Playground - Dual mode chat interface
 * - Finance Advisor: Constrained Indian finance advisor with structured output
 * - Tool Playground: Free-form chat without constraints
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, AlertCircle, Activity, Wrench } from 'lucide-react';
import { ThemeProvider } from './lib/theme-context';
import { Sidebar } from './components/Sidebar';
import { PlaygroundSidebar } from './components/PlaygroundSidebar';
import { TabSwitcher, TabMode } from './components/TabSwitcher';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import {
  fetchDefaultContext,
  fetchDefaultPrompt,
  fetchDefaultOutputFormat,
  fetchFreeChatDefaultPrompt,
  checkHealth,
} from './lib/api';
import type { UserFinanceContext, PlaygroundResponse } from './types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  response?: PlaygroundResponse;
}

interface StreamEvent {
  type: 'progress' | 'token' | 'classification' | 'web_search' | 'done' | 'error';
  content?: string;
  data?: unknown;
  error?: string;
  stage?: string;
  message?: string;
}

type Status = 'idle' | 'loading' | 'error' | 'offline';

function AppContent() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabMode>('advisor');

  // Common state
  const [status, setStatus] = useState<Status>('loading');
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentMessageRef = useRef<string>('');

  // Finance Advisor state
  const [advisorMessages, setAdvisorMessages] = useState<Message[]>([]);
  const [userContext, setUserContext] = useState<UserFinanceContext | null>(null);
  const [defaultContext, setDefaultContext] = useState<UserFinanceContext | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [defaultPrompt, setDefaultPrompt] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<string>('');
  const [defaultOutputFormat, setDefaultOutputFormat] = useState<string | null>(null);

  // Tool Playground state
  const [playgroundMessages, setPlaygroundMessages] = useState<Message[]>([]);
  const [playgroundPrompt, setPlaygroundPrompt] = useState<string>('');
  const [defaultPlaygroundPrompt, setDefaultPlaygroundPrompt] = useState<string | null>(null);
  const [playgroundContext, setPlaygroundContext] = useState<string>('');

  // Get current messages based on active tab
  const messages = activeTab === 'advisor' ? advisorMessages : playgroundMessages;

  // Initialize - fetch defaults
  useEffect(() => {
    async function init() {
      try {
        await checkHealth();

        const [contextData, promptData, formatData, freeChatPromptData] = await Promise.all([
          fetchDefaultContext(),
          fetchDefaultPrompt(),
          fetchDefaultOutputFormat(),
          fetchFreeChatDefaultPrompt(),
        ]);

        // Finance Advisor defaults
        setDefaultContext(contextData.context);
        setUserContext(contextData.context);
        setDefaultPrompt(promptData.system_prompt);
        setSystemPrompt(promptData.system_prompt);
        setDefaultOutputFormat(formatData.output_format);
        setOutputFormat(formatData.output_format);

        // Tool Playground defaults
        setDefaultPlaygroundPrompt(freeChatPromptData.system_prompt);
        setPlaygroundPrompt(freeChatPromptData.system_prompt);

        setStatus('idle');
      } catch (err) {
        console.error('Initialization failed:', err);
        setBackendError(
          err instanceof Error ? err.message : 'Failed to connect to backend'
        );
        setStatus('offline');
      }
    }

    init();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message in Finance Advisor mode
  const handleAdvisorMessage = useCallback(
    async (content: string) => {
      if (!userContext) return;

      currentMessageRef.current = '';

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };

      setAdvisorMessages(prev => [...prev, userMessage]);
      setIsGenerating(true);

      const assistantId = `assistant-${Date.now()}`;
      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };

      setAdvisorMessages(prev => [...prev, assistantMessage]);
      abortControllerRef.current = new AbortController();

      try {
        const customPrompt = systemPrompt !== defaultPrompt ? systemPrompt : undefined;
        const customOutputFormat = outputFormat !== defaultOutputFormat ? outputFormat : undefined;

        const response = await fetch('/api/recommend/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: content,
            user_context: userContext,
            system_prompt: customPrompt,
            output_format: customOutputFormat,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim() || !line.startsWith('data: ')) continue;

              try {
                const event: StreamEvent = JSON.parse(line.slice(6));

                switch (event.type) {
                  case 'token':
                    if (event.content) {
                      currentMessageRef.current += event.content;
                      setAdvisorMessages(prev =>
                        prev.map(msg =>
                          msg.id === assistantId
                            ? { ...msg, content: currentMessageRef.current }
                            : msg
                        )
                      );
                    }
                    break;

                  case 'done':
                    setAdvisorMessages(prev =>
                      prev.map(msg =>
                        msg.id === assistantId
                          ? {
                              ...msg,
                              content: currentMessageRef.current,
                              response: event.data as PlaygroundResponse,
                            }
                          : msg
                      )
                    );
                    setIsGenerating(false);
                    break;

                  case 'error':
                    setAdvisorMessages(prev =>
                      prev.map(msg =>
                        msg.id === assistantId
                          ? { ...msg, content: `Error: ${event.error || 'An error occurred'}` }
                          : msg
                      )
                    );
                    setIsGenerating(false);
                    break;
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setAdvisorMessages(prev =>
            prev.map(msg =>
              msg.id === assistantId
                ? { ...msg, content: `Error: ${err.message}` }
                : msg
            )
          );
        }
        setIsGenerating(false);
      }
    },
    [userContext, systemPrompt, defaultPrompt, outputFormat, defaultOutputFormat]
  );

  // Handle sending a message in Tool Playground mode
  const handlePlaygroundMessage = useCallback(
    async (content: string) => {
      currentMessageRef.current = '';

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };

      setPlaygroundMessages(prev => [...prev, userMessage]);
      setIsGenerating(true);

      const assistantId = `assistant-${Date.now()}`;
      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };

      setPlaygroundMessages(prev => [...prev, assistantMessage]);
      abortControllerRef.current = new AbortController();

      try {
        const customPrompt = playgroundPrompt !== defaultPlaygroundPrompt ? playgroundPrompt : undefined;

        const response = await fetch('/api/free-chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: content,
            system_prompt: customPrompt,
            context: playgroundContext || undefined,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim() || !line.startsWith('data: ')) continue;

              try {
                const event: StreamEvent = JSON.parse(line.slice(6));

                switch (event.type) {
                  case 'token':
                    if (event.content) {
                      currentMessageRef.current += event.content;
                      setPlaygroundMessages(prev =>
                        prev.map(msg =>
                          msg.id === assistantId
                            ? { ...msg, content: currentMessageRef.current }
                            : msg
                        )
                      );
                    }
                    break;

                  case 'done':
                    setPlaygroundMessages(prev =>
                      prev.map(msg =>
                        msg.id === assistantId
                          ? { ...msg, content: currentMessageRef.current }
                          : msg
                      )
                    );
                    setIsGenerating(false);
                    break;

                  case 'error':
                    setPlaygroundMessages(prev =>
                      prev.map(msg =>
                        msg.id === assistantId
                          ? { ...msg, content: `Error: ${event.error || 'An error occurred'}` }
                          : msg
                      )
                    );
                    setIsGenerating(false);
                    break;
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setPlaygroundMessages(prev =>
            prev.map(msg =>
              msg.id === assistantId
                ? { ...msg, content: `Error: ${err.message}` }
                : msg
            )
          );
        }
        setIsGenerating(false);
      }
    },
    [playgroundPrompt, defaultPlaygroundPrompt, playgroundContext]
  );

  // Handle sending a message - routes to appropriate handler
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (activeTab === 'advisor') {
        await handleAdvisorMessage(content);
      } else {
        await handlePlaygroundMessage(content);
      }
    },
    [activeTab, handleAdvisorMessage, handlePlaygroundMessage]
  );

  // Handle stopping generation
  const handleStopGenerating = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  }, []);

  // Handle new chat for current tab
  const handleNewChat = useCallback(() => {
    if (activeTab === 'advisor') {
      setAdvisorMessages([]);
    } else {
      setPlaygroundMessages([]);
    }
  }, [activeTab]);

  // Handle context change (Finance Advisor)
  const handleContextChange = useCallback((newContext: UserFinanceContext) => {
    setUserContext(newContext);
  }, []);

  // Handle prompt change (Finance Advisor)
  const handlePromptChange = useCallback((newPrompt: string) => {
    setSystemPrompt(newPrompt);
  }, []);

  // Handle output format change (Finance Advisor)
  const handleOutputFormatChange = useCallback((newFormat: string) => {
    setOutputFormat(newFormat);
  }, []);

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark-base">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            Connecting to backend...
          </p>
        </div>
      </div>
    );
  }

  // Offline state
  if (status === 'offline') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark-base p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Backend Offline
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{backendError}</p>
          <div className="bg-gray-100 dark:bg-dark-lighter rounded-lg p-4 text-left text-sm">
            <p className="font-medium mb-2 text-gray-800 dark:text-gray-200">
              To start the backend:
            </p>
            <code className="block bg-gray-200 dark:bg-dark-medium p-2 rounded text-xs text-gray-800 dark:text-gray-200">
              cd agentic-playground/backend
              <br />
              npm install
              <br />
              npm run dev
            </code>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-white dark:bg-dark-base">
      {/* Sidebar - different based on active tab */}
      {activeTab === 'advisor' ? (
        <Sidebar
          userContext={userContext}
          defaultContext={defaultContext}
          onContextChange={handleContextChange}
          systemPrompt={systemPrompt}
          defaultPrompt={defaultPrompt}
          onPromptChange={handlePromptChange}
          outputFormat={outputFormat}
          defaultOutputFormat={defaultOutputFormat}
          onOutputFormatChange={handleOutputFormatChange}
          onNewChat={handleNewChat}
          disabled={isGenerating}
        />
      ) : (
        <PlaygroundSidebar
          systemPrompt={playgroundPrompt}
          defaultPrompt={defaultPlaygroundPrompt}
          onPromptChange={setPlaygroundPrompt}
          context={playgroundContext}
          onContextChange={setPlaygroundContext}
          onNewChat={handleNewChat}
          disabled={isGenerating}
        />
      )}

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Tab Switcher Header */}
        <div className="flex items-center justify-center py-4 border-b border-gray-200 dark:border-gray-800">
          <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Messages Area */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto scrollbar-custom"
        >
          {/* Top gradient fade */}
          <div className="sticky top-0 left-0 right-0 z-10 h-8 bg-gradient-to-b from-white dark:from-dark-base via-white/80 dark:via-dark-base/80 to-transparent pointer-events-none" />

          <div className="mx-auto max-w-4xl px-4">
            {messages.length === 0 ? (
              // Empty state - different for each tab
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-4">
                  {activeTab === 'advisor' ? (
                    <Activity className="w-8 h-8 text-primary-500" />
                  ) : (
                    <Wrench className="w-8 h-8 text-primary-500" />
                  )}
                </div>
                <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-2">
                  {activeTab === 'advisor'
                    ? 'Welcome to the Machine'
                    : 'Tool Playground'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                  {activeTab === 'advisor'
                    ? 'Ask me anything about Indian personal finance. Modify the parameters in the sidebar to experiment with different contexts and AI behavior.'
                    : 'Free-form chat without constraints. Customize the system prompt and context in the sidebar to experiment.'}
                </p>
              </div>
            ) : (
              // Messages list
              <div className="pt-8 pb-32">
                {messages.map((message, idx) => (
                  <ChatMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    isStreaming={
                      isGenerating &&
                      message.role === 'assistant' &&
                      idx === messages.length - 1
                    }
                    response={message.response}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="sticky bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-white dark:from-dark-base via-white/95 dark:via-dark-base/95 to-transparent pt-8 pb-4 px-4">
          <ChatInput
            onSubmit={handleSendMessage}
            disabled={activeTab === 'advisor' ? !userContext : false}
            isGenerating={isGenerating}
            onStopGenerating={handleStopGenerating}
            placeholder={
              activeTab === 'advisor'
                ? undefined
                : 'Ask anything...'
            }
          />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
