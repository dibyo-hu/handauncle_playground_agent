import { z } from 'zod';

// ============================================
// Layer 0 - Query Classification Schema
// ============================================
export const ClassificationResultSchema = z.object({
  is_indian_finance: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

// ============================================
// Layer 1 - User Finance Context Schema
// ============================================
export const MutualFundHoldingSchema = z.object({
  fund_name: z.string(),
  category: z.enum(['equity', 'debt', 'hybrid', 'liquid', 'index', 'elss']),
  invested_amount: z.number().positive(),
  current_value: z.number().positive(),
});

export type MutualFundHolding = z.infer<typeof MutualFundHoldingSchema>;

export const UserFinanceContextSchema = z.object({
  monthly_income: z.number().positive(),
  monthly_expenses: z.number().positive(),
  bank_balance: z.number().min(0),
  mutual_fund_holdings: z.array(MutualFundHoldingSchema),
  risk_profile: z.enum(['low', 'moderate', 'high']),
  investment_horizon_years: z.number().int().positive(),
  dependents: z.number().int().min(0),
  emergency_fund_months: z.number().min(0),
});

export type UserFinanceContext = z.infer<typeof UserFinanceContextSchema>;

// ============================================
// Layer 2 - Web Search Results Schema
// ============================================
export const FundDataSchema = z.object({
  fund_name: z.string(),
  category: z.string(),
  expense_ratio: z.string(),
  '1Y_return': z.string(),
  '3Y_return': z.string(),
  aum_crores: z.number(),
  fund_house: z.string(),
});

export type FundData = z.infer<typeof FundDataSchema>;

export const WebSearchResultSchema = z.object({
  query: z.string(),
  funds: z.array(FundDataSchema),
  search_timestamp: z.string(),
  source_urls: z.array(z.string()),
});

export type WebSearchResult = z.infer<typeof WebSearchResultSchema>;

// ============================================
// Layer 3 - Recommendation Engine Schema
// ============================================
export const InstrumentSchema = z.object({
  name: z.string(),
  category: z.enum(['mutual_fund', 'index_fund', 'debt_fund', 'liquid_fund', 'elss']),
});

export const ExecutionSchema = z.object({
  enabled: z.literal(false),
  label: z.literal('Execute (Coming Soon)'),
});

export const RecommendationItemSchema = z.object({
  instrument: InstrumentSchema,
  action: z.enum(['BUY', 'SELL', 'HOLD']),
  rationale: z.string(),
  amount: z.number().positive(),
  execution: ExecutionSchema,
});

export type RecommendationItem = z.infer<typeof RecommendationItemSchema>;

export const ContextSummarySchema = z.object({
  user_intent_summary: z.string(),
  query_type: z.enum([
    'portfolio_review',
    'new_investment',
    'rebalancing',
    'redemption',
    'tax_planning',
    'emergency_fund',
    'goal_based',
    'general_advice',
  ]),
});

export const SituationSchema = z.object({
  description: z.string(),
  data_basis: z.enum(['user_data', 'hypothetical', 'mixed']),
  scenario_type: z.enum(['data-backed', 'hypothetical', 'mixed']),
});

// Analysis for each recommendation
export const RecommendationAnalysisSchema = z.object({
  risk_assessment: z.string(),
  expected_returns: z.string(),
  allocation_reasoning: z.string(),
  amount_calculation: z.string(),
});

export const RecommendationOutputSchema = z.object({
  // Conversational response - friendly chat before the data
  conversational_response: z.string(),
  context: ContextSummarySchema,
  situation: SituationSchema,
  analysis: RecommendationAnalysisSchema,
  recommendations: z.array(RecommendationItemSchema),
});

export type RecommendationOutput = z.infer<typeof RecommendationOutputSchema>;

// ============================================
// API Request/Response Schemas
// ============================================
export const PlaygroundRequestSchema = z.object({
  query: z.string().min(1).max(1000),
  user_context: UserFinanceContextSchema,
  system_prompt: z.string().optional(), // Custom system prompt for experimentation
});

export type PlaygroundRequest = z.infer<typeof PlaygroundRequestSchema>;

// Rejection response when query is not Indian finance related
export const RejectionResponseSchema = z.object({
  type: z.literal('rejection'),
  classification: ClassificationResultSchema,
  message: z.string(),
});

export type RejectionResponse = z.infer<typeof RejectionResponseSchema>;

// Success response with recommendations
export const SuccessResponseSchema = z.object({
  type: z.literal('success'),
  classification: ClassificationResultSchema,
  web_search: WebSearchResultSchema, // Always required - recommendations must be grounded
  recommendation: RecommendationOutputSchema,
  validation_attempts: z.number(),
});

export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;

// Error response
export const ErrorResponseSchema = z.object({
  type: z.literal('error'),
  error: z.string(),
  layer: z.string(),
  details: z.any().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export type PlaygroundResponse = RejectionResponse | SuccessResponse | ErrorResponse;

// ============================================
// Validation Error Schema (for repair loop)
// ============================================
export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  value: z.any().optional(),
});

export type ValidationError = z.infer<typeof ValidationErrorSchema>;
