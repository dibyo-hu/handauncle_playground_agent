/**
 * Main App Component
 *
 * Agentic Finance Playground - Dual mode chat interface
 * - Finance Advisor: Constrained Indian finance advisor with structured output
 * - Tool Playground: Free-form chat with Chat API v1
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, AlertCircle, Activity, Wrench } from 'lucide-react';
import { ThemeProvider } from './lib/theme-context';
import { Sidebar } from './components/Sidebar';
import { PlaygroundSidebar } from './components/PlaygroundSidebar';
import { TabSwitcher, TabMode } from './components/TabSwitcher';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { NewConversationModal } from './components/NewConversationModal';
import {
  sendChatMessage,
  listConversations,
  getConversation,
  deleteConversation,
  readChatStream,
  type ConversationItem,
} from './lib/chat-api';
import type { UserFinanceContext, PlaygroundResponse } from './types';

// Content blocks for rich message rendering
interface TextBlock {
  type: 'text';
  blockId: string;
  text: string;
}

interface ReasoningBlock {
  type: 'reasoning';
  blockId: string;
  text: string;
}

interface ToolCallBlock {
  type: 'tool';
  blockId: string;
  toolName: string;
  arguments: string;
  status: 'executing' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

interface VisualBlock {
  type: 'visual';
  blockId: string;
  visualType?: string;
  intent?: string;
  state?: unknown;
  status: 'creating' | 'updating' | 'completed';
}

type ContentBlock = TextBlock | ReasoningBlock | ToolCallBlock | VisualBlock;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string; // Main text content for display
  timestamp: string;
  response?: PlaygroundResponse;
  blocks?: ContentBlock[]; // Rich content blocks for Tool Playground
}

// Finance Advisor stream event
interface AdvisorStreamEvent {
  type: 'progress' | 'token' | 'classification' | 'web_search' | 'done' | 'error';
  content?: string;
  data?: unknown;
  error?: string;
}

type Status = 'idle' | 'loading' | 'error' | 'offline';

function AppContent() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabMode>('advisor');

  // Common state
  const [status, setStatus] = useState<Status>('loading');
  const [backendError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentMessageRef = useRef<string>('');

  // Finance Advisor state
  const [advisorMessages, setAdvisorMessages] = useState<Message[]>([]);
  const [userContext, setUserContext] = useState<UserFinanceContext | null>(null);
  const [defaultContext] = useState<UserFinanceContext | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [defaultPrompt] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<string>('');
  const [defaultOutputFormat] = useState<string | null>(null);

  // Tool Playground state (Chat API v1)
  const [playgroundMessages, setPlaygroundMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [playgroundModel, setPlaygroundModel] = useState<string>('gpt-4o');
  const [playgroundTemperature, setPlaygroundTemperature] = useState<number>(1);
  const [playgroundSystemPrompt, setPlaygroundSystemPrompt] = useState<string>('');
  const [playgroundUserContext, setPlaygroundUserContext] = useState<string>('');
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);

  // Get current messages based on active tab
  const messages = activeTab === 'advisor' ? advisorMessages : playgroundMessages;

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      const conversations = await listConversations();
      setConversations(conversations);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  }, []);

  // Load conversation messages
  const loadConversation = useCallback(async (id: string) => {
    console.log('Loading conversation:', id);
    try {
      const data = await getConversation(id);
      console.log('Conversation loaded:', data);
      if (data) {
        // Convert conversation messages to our Message format
        const loadedMessages: Message[] = data.messages.map((msg) => {
          // Handle user messages (content is a string)
          if (msg.role === 'user') {
            return {
              id: msg.messageId,
              role: msg.role,
              content: typeof msg.content === 'string' ? msg.content : '',
              timestamp: msg.createdAt,
            };
          }
          
          // Handle assistant messages (content has blocks)
          const contentObj = typeof msg.content === 'object' ? msg.content : { blocks: [] };
          const blocks = Array.isArray(contentObj.blocks) ? contentObj.blocks : [];
          
          return {
            id: msg.messageId,
            role: msg.role,
            content: blocks.map((b) => b.text || '').join('\n'),
            timestamp: msg.createdAt,
            blocks: blocks.map((block): ContentBlock => {
            // Map API blocks to our ContentBlock types
            if (block.type === 'text') {
              return {
                type: 'text',
                blockId: block.blockId,
                text: block.text || '',
              } as TextBlock;
            } else if (block.type === 'reasoning') {
              return {
                type: 'reasoning',
                blockId: block.blockId,
                text: block.text || '',
              } as ReasoningBlock;
            } else if (block.type === 'tool') {
              return {
                type: 'tool',
                blockId: block.blockId,
                toolName: (block as any).toolName || 'unknown',
                arguments: (block as any).arguments || '',
                status: (block as any).status || 'completed',
                result: (block as any).result,
                error: (block as any).error,
              } as ToolCallBlock;
            } else if (block.type === 'visual') {
              return {
                type: 'visual',
                blockId: block.blockId,
                visualType: (block as any).visualType,
                intent: (block as any).intent,
                state: (block as any).state,
                status: (block as any).status || 'completed',
              } as VisualBlock;
            }
            // Default to text block
            return {
              type: 'text',
              blockId: block.blockId,
              text: block.text || '',
            } as TextBlock;
          }),
          };
        });
        
        console.log('Loaded messages:', loadedMessages);
        setPlaygroundMessages(loadedMessages);
        console.log('[loadConversation] Setting conversationId to:', id);
        setConversationId(id);
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  }, []);

  // Delete conversation
  const deleteConversationHandler = useCallback(async (id: string) => {
    try {
      await deleteConversation(id);
      setConversations(prev => prev.filter(c => c.conversationId !== id));
      if (conversationId === id) {
        setConversationId(null);
        setPlaygroundMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  }, [conversationId]);

  // Initialize - fetch defaults for Finance Advisor (only if needed)
  useEffect(() => {
    async function init() {
      // Skip Finance Advisor initialization - only using Tool Playground
      // If you need Finance Advisor, uncomment the code below
      /*
      try {
        await checkHealth();

        const [contextData, promptData, formatData] = await Promise.all([
          fetchDefaultContext(),
          fetchDefaultPrompt(),
          fetchDefaultOutputFormat(),
        ]);

        // Finance Advisor defaults
        setDefaultContext(contextData.context);
        setUserContext(contextData.context);
        setDefaultPrompt(promptData.system_prompt);
        setSystemPrompt(promptData.system_prompt);
        setDefaultOutputFormat(formatData.output_format);
        setOutputFormat(formatData.output_format);
      } catch (err) {
        console.warn('Finance Advisor backend unavailable:', err);
        setBackendError(
          'Finance Advisor backend is offline. Tool Playground is still available.'
        );
      }
      */
      
      setStatus('idle');
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
                const event: AdvisorStreamEvent = JSON.parse(line.slice(6));

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

  // Handle sending a message in Tool Playground mode (Chat API v1)
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
        blocks: [],
      };

      setPlaygroundMessages(prev => [...prev, assistantMessage]);
      abortControllerRef.current = new AbortController();

      // Track active blocks by blockId
      const activeBlocks = new Map<string, ContentBlock>();

      try {
        console.log('[sendMessage] Sending with conversationId:', conversationId);
        const response = await sendChatMessage(
          {
            message: content,
            model: playgroundModel,
            temperature: playgroundTemperature,
            systemPrompt: playgroundSystemPrompt || undefined,
            userContext: playgroundUserContext || undefined,
          },
          conversationId || undefined,
          abortControllerRef.current.signal
        );

        // Process the stream using the generator function
        for await (const event of readChatStream(response)) {
          switch (event.type) {
            // Text content events
            case 'text.block.started':
              if (event.payload.blockId) {
                // Only create a new block if it doesn't exist yet
                if (!activeBlocks.has(event.payload.blockId)) {
                  console.log('[text.block.started] Creating new text block:', event.payload.blockId);
                  const textBlock: TextBlock = {
                    type: 'text',
                    blockId: event.payload.blockId,
                    text: '',
                  };
                  activeBlocks.set(event.payload.blockId, textBlock);
                } else {
                  console.log('[text.block.started] Block already exists, skipping:', event.payload.blockId);
                }
              }
              break;

            case 'text.delta':
              // API sends 'text' field in text.delta events (not 'delta' as documented)
              const deltaText = event.payload.delta || event.payload.text;
              if (deltaText && event.payload.blockId) {
                console.log('[text.delta]', {
                  blockId: event.payload.blockId,
                  delta: deltaText,
                  existingBlock: activeBlocks.get(event.payload.blockId),
                });
                
                let block = activeBlocks.get(event.payload.blockId);
                
                // Create text block if it doesn't exist (for text after tool calls)
                if (!block) {
                  console.log('[text.delta] Creating new text block:', event.payload.blockId);
                  block = {
                    type: 'text',
                    blockId: event.payload.blockId,
                    text: '',
                  } as TextBlock;
                  activeBlocks.set(event.payload.blockId, block);
                }
                
                if (block.type === 'text') {
                  block.text += deltaText;
                  currentMessageRef.current += deltaText;
                  
                  console.log('[text.delta] Updated text block:', {
                    blockId: event.payload.blockId,
                    text: block.text,
                    totalBlocks: activeBlocks.size,
                  });
                  
                  setPlaygroundMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantId
                        ? {
                            ...msg,
                            content: currentMessageRef.current,
                            blocks: Array.from(activeBlocks.values()),
                          }
                        : msg
                    )
                  );
                }
              }
              break;

            case 'text.block.completed':
              // Text block is complete - no action needed
              break;

            // Reasoning events
            case 'reasoning.started':
              if (event.payload.blockId) {
                const reasoningBlock: ReasoningBlock = {
                  type: 'reasoning',
                  blockId: event.payload.blockId,
                  text: '',
                };
                activeBlocks.set(event.payload.blockId, reasoningBlock);
                
                setPlaygroundMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantId
                      ? { ...msg, blocks: Array.from(activeBlocks.values()) }
                      : msg
                  )
                );
              }
              break;

            case 'reasoning.delta':
              if (event.payload.text && event.payload.blockId) {
                const block = activeBlocks.get(event.payload.blockId);
                if (block && block.type === 'reasoning') {
                  block.text += event.payload.text;
                  
                  setPlaygroundMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantId
                        ? { ...msg, blocks: Array.from(activeBlocks.values()) }
                        : msg
                    )
                  );
                }
              }
              break;

            case 'reasoning.completed':
              // Reasoning block is complete
              break;

            // Tool call events
            case 'tool.call.started':
            case 'agent.tool.call.started':
              if (event.payload.toolCallId && event.payload.toolName) {
                const toolBlock: ToolCallBlock = {
                  type: 'tool',
                  blockId: event.payload.toolCallId,
                  toolName: event.payload.toolName,
                  arguments: '',
                  status: 'executing',
                };
                activeBlocks.set(event.payload.toolCallId, toolBlock);
                
                setPlaygroundMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantId
                      ? { ...msg, blocks: Array.from(activeBlocks.values()) }
                      : msg
                  )
                );
              }
              break;

            case 'tool.call.arguments':
            case 'agent.tool.call.arguments':
              if (event.payload.arguments && event.payload.toolCallId) {
                const block = activeBlocks.get(event.payload.toolCallId);
                if (block && block.type === 'tool') {
                  block.arguments = event.payload.arguments;
                  
                  setPlaygroundMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantId
                        ? { ...msg, blocks: Array.from(activeBlocks.values()) }
                        : msg
                    )
                  );
                }
              }
              break;

            case 'tool.call.executing':
            case 'agent.tool.call.executing':
              if (event.payload.toolCallId) {
                const block = activeBlocks.get(event.payload.toolCallId);
                if (block && block.type === 'tool') {
                  block.status = 'executing';
                  
                  setPlaygroundMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantId
                        ? { ...msg, blocks: Array.from(activeBlocks.values()) }
                        : msg
                    )
                  );
                }
              }
              break;

            case 'tool.call.completed':
            case 'agent.tool.call.completed':
              if (event.payload.toolCallId) {
                const block = activeBlocks.get(event.payload.toolCallId);
                if (block && block.type === 'tool') {
                  block.status = 'completed';
                  block.result = event.payload.result;
                  
                  setPlaygroundMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantId
                        ? { ...msg, blocks: Array.from(activeBlocks.values()) }
                        : msg
                    )
                  );
                }
              }
              break;

            case 'tool.call.failed':
            case 'agent.tool.call.failed':
              if (event.payload.toolCallId) {
                const block = activeBlocks.get(event.payload.toolCallId);
                if (block && block.type === 'tool') {
                  block.status = 'failed';
                  block.error = event.payload.error;
                  
                  setPlaygroundMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantId
                        ? { ...msg, blocks: Array.from(activeBlocks.values()) }
                        : msg
                    )
                  );
                }
              }
              break;

            // Visual events
            case 'visual.intent':
              if (event.payload.visualId) {
                const visualBlock: VisualBlock = {
                  type: 'visual',
                  blockId: event.payload.visualId,
                  visualType: event.payload.visualType,
                  intent: event.payload.intent,
                  status: 'creating',
                };
                activeBlocks.set(event.payload.visualId, visualBlock);
                
                setPlaygroundMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantId
                      ? { ...msg, blocks: Array.from(activeBlocks.values()) }
                        : msg
                  )
                );
              }
              break;

            case 'visual.block.created':
              if (event.payload.visualId) {
                const block = activeBlocks.get(event.payload.visualId);
                if (block && block.type === 'visual') {
                  block.status = 'updating';
                  
                  setPlaygroundMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantId
                        ? { ...msg, blocks: Array.from(activeBlocks.values()) }
                        : msg
                    )
                  );
                }
              }
              break;

            case 'visual.patch':
              if (event.payload.visualId && event.payload.patch) {
                const block = activeBlocks.get(event.payload.visualId);
                if (block && block.type === 'visual') {
                  block.state = event.payload.patch;
                  
                  setPlaygroundMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantId
                        ? { ...msg, blocks: Array.from(activeBlocks.values()) }
                        : msg
                    )
                  );
                }
              }
              break;

            case 'visual.completed':
              if (event.payload.visualId) {
                const block = activeBlocks.get(event.payload.visualId);
                if (block && block.type === 'visual') {
                  block.status = 'completed';
                  
                  setPlaygroundMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantId
                        ? { ...msg, blocks: Array.from(activeBlocks.values()) }
                        : msg
                    )
                  );
                }
              }
              break;

            // Conversation and control events
            case 'message.started':
              // Message started - assistant is ready to respond
              break;

            case 'conversation.info':
              if (event.payload.conversationId) {
                setConversationId(event.payload.conversationId);
                // Refresh conversations list
                fetchConversations();
              }
              break;

            case 'message.completed':
              setPlaygroundMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantId
                    ? {
                        ...msg,
                        content: currentMessageRef.current,
                        blocks: Array.from(activeBlocks.values()),
                      }
                    : msg
                )
              );
              break;

            case 'stream.end':
              setPlaygroundMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantId
                    ? {
                        ...msg,
                        content: currentMessageRef.current,
                        blocks: Array.from(activeBlocks.values()),
                      }
                    : msg
                )
              );
              setIsGenerating(false);
              break;

            case 'message.failed':
              setPlaygroundMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantId
                    ? { ...msg, content: `Error: ${event.payload.error || 'An error occurred'}` }
                    : msg
                )
              );
              setIsGenerating(false);
              break;

            // Ignore keepalive events
            case 'stream.keepalive':
              break;

            default:
              // Log unknown event types for debugging
              console.log('Unknown event type:', event.type, event);
          }
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
      } finally {
        setIsGenerating(false);
      }
    },
    [conversationId, playgroundModel, playgroundTemperature, playgroundSystemPrompt, playgroundUserContext, fetchConversations]
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
      // Show modal for Tool Playground
      setShowNewConversationModal(true);
    }
  }, [activeTab]);

  // Handle saving new conversation with system prompt and user context
  const handleSaveNewConversation = useCallback((systemPrompt: string, userContext: string) => {
    setPlaygroundSystemPrompt(systemPrompt);
    setPlaygroundUserContext(userContext);
    setPlaygroundMessages([]);
    setConversationId(null);
    setShowNewConversationModal(false);
  }, []);

  // Handle skipping new conversation setup
  const handleSkipNewConversation = useCallback(() => {
    setPlaygroundSystemPrompt('');
    setPlaygroundUserContext('');
    setPlaygroundMessages([]);
    setConversationId(null);
    setShowNewConversationModal(false);
  }, []);

  // Handle conversation selection
  const handleConversationSelect = useCallback((id: string | null) => {
    if (id) {
      loadConversation(id);
    } else {
      setPlaygroundMessages([]);
      setConversationId(null);
    }
  }, [loadConversation]);

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
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Show offline state only for Finance Advisor tab when backend is down
  const showOfflineWarning = activeTab === 'advisor' && backendError && !userContext;

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
          conversationId={conversationId}
          onConversationSelect={handleConversationSelect}
          conversations={conversations}
          onRefreshConversations={fetchConversations}
          onDeleteConversation={deleteConversationHandler}
          model={playgroundModel}
          onModelChange={setPlaygroundModel}
          temperature={playgroundTemperature}
          onTemperatureChange={setPlaygroundTemperature}
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

          {/* Finance Advisor Backend Offline Warning */}
          {showOfflineWarning && (
            <div className="mx-auto max-w-4xl px-4 pt-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      Finance Advisor Backend Offline
                    </h3>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                      {backendError}
                    </p>
                    <div className="bg-amber-100 dark:bg-amber-900/40 rounded p-2 text-xs">
                      <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                        To start the Finance Advisor backend:
                      </p>
                      <code className="block bg-white dark:bg-dark-medium p-2 rounded text-amber-900 dark:text-amber-100 font-mono">
                        cd handauncle_playground_agent/backend
                        <br />
                        npm install
                        <br />
                        npm run dev
                      </code>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => window.location.reload()}
                        className="text-xs px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors"
                      >
                        Retry Connection
                      </button>
                      <button
                        onClick={() => setActiveTab('playground')}
                        className="text-xs px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                      >
                        Use Tool Playground Instead
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                    : 'Chat with AI freely. Select a model, adjust temperature, and manage conversations in the sidebar.'}
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
                    blocks={message.blocks}
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

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={showNewConversationModal}
        onClose={() => setShowNewConversationModal(false)}
        onSave={handleSaveNewConversation}
        onSkip={handleSkipNewConversation}
      />
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
