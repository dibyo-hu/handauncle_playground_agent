/**
 * Result Display Component
 *
 * Renders the recommendation response including:
 * - Conversational response (chat-style) with markdown rendering
 * - Analysis breakdown
 * - Recommendations table with disabled execute buttons
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  MessageSquare,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Calculator,
  Shield,
  Target,
} from 'lucide-react';
import type { PlaygroundResponse, RecommendationItem } from '../types';

interface ResultDisplayProps {
  response: PlaygroundResponse;
  query: string;
}

function ClassificationBadge({ response }: { response: PlaygroundResponse }) {
  if (response.type === 'error') return null;

  const { classification } = response;

  return (
    <div
      className={`
        flex items-center gap-2 p-3 rounded-lg text-sm
        ${classification.is_indian_finance ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}
      `}
    >
      {classification.is_indian_finance ? (
        <CheckCircle size={16} />
      ) : (
        <XCircle size={16} />
      )}
      <span>
        <strong>Classification:</strong> {classification.is_indian_finance ? 'Indian Finance' : 'Not Indian Finance'}
        {' '}({Math.round(classification.confidence * 100)}% confidence)
      </span>
    </div>
  );
}

function WebSearchInfo({ response }: { response: PlaygroundResponse }) {
  if (response.type !== 'success') return null;

  const { web_search } = response;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center gap-2 text-blue-800 mb-2">
        <Search size={16} />
        <strong>Web Search Performed</strong>
      </div>
      <p className="text-sm text-blue-700 mb-2">
        Query: "{web_search.query}"
      </p>
      <p className="text-sm text-blue-700">
        Found {web_search.funds.length} verified funds from {web_search.source_urls.length} sources
      </p>
    </div>
  );
}

function ConversationalResponse({ response }: { response: PlaygroundResponse }) {
  if (response.type !== 'success') return null;

  const { conversational_response } = response.recommendation;

  return (
    <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-lg p-5">
      <div className="flex items-center gap-2 text-primary-800 mb-3">
        <MessageSquare size={20} />
        <strong className="text-lg">Handa Uncle Says...</strong>
      </div>
      <div className="prose prose-sm max-w-none text-surface-700 leading-relaxed markdown-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Style headings
            h1: ({ children }) => <h1 className="text-xl font-bold text-surface-800 mt-4 mb-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-semibold text-surface-800 mt-3 mb-2">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-semibold text-surface-700 mt-2 mb-1">{children}</h3>,
            // Style paragraphs
            p: ({ children }) => <p className="mb-3 text-surface-700">{children}</p>,
            // Style lists
            ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="text-surface-700">{children}</li>,
            // Style emphasis
            strong: ({ children }) => <strong className="font-semibold text-surface-800">{children}</strong>,
            em: ({ children }) => <em className="italic text-surface-600">{children}</em>,
            // Style blockquotes (for disclaimer)
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-primary-300 pl-4 py-1 my-3 bg-primary-50/50 rounded-r text-surface-600 italic">
                {children}
              </blockquote>
            ),
            // Style code
            code: ({ children }) => (
              <code className="bg-surface-100 px-1 py-0.5 rounded text-sm font-mono text-surface-700">
                {children}
              </code>
            ),
            // Style horizontal rules
            hr: () => <hr className="my-4 border-surface-200" />,
          }}
        >
          {conversational_response}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function AnalysisCard({ response }: { response: PlaygroundResponse }) {
  if (response.type !== 'success') return null;

  const { analysis } = response.recommendation;

  return (
    <div className="bg-surface-50 border border-surface-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 text-surface-700 mb-2">
        <BarChart3 size={18} />
        <strong>Detailed Analysis</strong>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-surface-700">
            <Shield size={14} className="text-amber-600" />
            Risk Assessment
          </div>
          <p className="text-sm text-surface-600 bg-white p-3 rounded border border-surface-100">
            {analysis.risk_assessment}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-surface-700">
            <TrendingUp size={14} className="text-green-600" />
            Expected Returns
          </div>
          <p className="text-sm text-surface-600 bg-white p-3 rounded border border-surface-100">
            {analysis.expected_returns}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-surface-700">
            <Target size={14} className="text-blue-600" />
            Allocation Reasoning
          </div>
          <p className="text-sm text-surface-600 bg-white p-3 rounded border border-surface-100">
            {analysis.allocation_reasoning}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-surface-700">
            <Calculator size={14} className="text-purple-600" />
            Amount Calculation
          </div>
          <p className="text-sm text-surface-600 bg-white p-3 rounded border border-surface-100 font-mono text-xs">
            {analysis.amount_calculation}
          </p>
        </div>
      </div>
    </div>
  );
}

function ActionBadge({ action }: { action: 'BUY' | 'SELL' | 'HOLD' }) {
  const config = {
    BUY: { bg: 'bg-green-100', text: 'text-green-800', icon: TrendingUp },
    SELL: { bg: 'bg-red-100', text: 'text-red-800', icon: TrendingDown },
    HOLD: { bg: 'bg-amber-100', text: 'text-amber-800', icon: Minus },
  };

  const { bg, text, icon: Icon } = config[action];

  return (
    <span className={`badge ${bg} ${text} flex items-center gap-1`}>
      <Icon size={12} />
      {action}
    </span>
  );
}

function RecommendationsTable({ recommendations }: { recommendations: RecommendationItem[] }) {
  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8 text-surface-500">
        No specific recommendations at this time.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="recommendations-table">
        <thead>
          <tr>
            <th>Instrument</th>
            <th>Category</th>
            <th>Action</th>
            <th>Amount</th>
            <th>Rationale</th>
            <th>Execute</th>
          </tr>
        </thead>
        <tbody>
          {recommendations.map((rec, index) => (
            <tr key={index}>
              <td className="font-medium">{rec.instrument.name}</td>
              <td className="capitalize">{rec.instrument.category.replace(/_/g, ' ')}</td>
              <td>
                <ActionBadge action={rec.action} />
              </td>
              <td className="font-mono">
                {new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                }).format(rec.amount)}
              </td>
              <td className="text-sm text-surface-600 max-w-xs">{rec.rationale}</td>
              <td>
                <button
                  disabled
                  className="px-3 py-1 bg-surface-100 text-surface-400 rounded cursor-not-allowed text-sm"
                >
                  {rec.execution.label}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RejectionDisplay({ response }: { response: PlaygroundResponse }) {
  if (response.type !== 'rejection') return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-center gap-2 text-red-800 mb-3">
        <XCircle size={20} />
        <strong className="text-lg">Query Rejected</strong>
      </div>
      <pre className="whitespace-pre-wrap text-surface-700 text-sm">
        {response.message}
      </pre>
    </div>
  );
}

function ErrorDisplay({ response }: { response: PlaygroundResponse }) {
  if (response.type !== 'error') return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-center gap-2 text-red-800 mb-3">
        <AlertTriangle size={20} />
        <strong className="text-lg">Error</strong>
      </div>
      <p className="text-red-700 mb-2">{response.error}</p>
      <p className="text-sm text-red-600">Layer: {response.layer}</p>
      {response.details !== undefined && response.details !== null && (
        <pre className="mt-3 p-2 bg-red-100 rounded text-xs overflow-auto max-h-40">
          {JSON.stringify(response.details as object, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function ResultDisplay({ response, query }: ResultDisplayProps) {
  return (
    <div className="space-y-4">
      <div className="bg-surface-100 rounded-lg p-3">
        <span className="text-sm text-surface-500">Query:</span>
        <p className="text-surface-800 font-medium">"{query}"</p>
      </div>

      <ClassificationBadge response={response} />

      {response.type === 'rejection' && <RejectionDisplay response={response} />}

      {response.type === 'error' && <ErrorDisplay response={response} />}

      {response.type === 'success' && (
        <>
          <WebSearchInfo response={response} />

          {/* Conversational response - the main chat output */}
          <ConversationalResponse response={response} />

          {/* Detailed analysis */}
          <AnalysisCard response={response} />

          {/* Recommendations table */}
          <div>
            <h3 className="text-lg font-semibold text-surface-800 mb-3">
              Recommendations
            </h3>
            <RecommendationsTable recommendations={response.recommendation.recommendations} />
          </div>

          <div className="text-sm text-surface-500 flex items-center gap-4 pt-2 border-t border-surface-200">
            <span>Validation attempts: {response.validation_attempts}</span>
            <span>Web sources: {response.web_search.source_urls.length}</span>
            <span>Funds found: {response.web_search.funds.length}</span>
          </div>
        </>
      )}
    </div>
  );
}
