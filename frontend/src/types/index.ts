// Type definitions matching backend schemas

export interface MutualFundHolding {
  fund_name: string;
  category: 'equity' | 'debt' | 'hybrid' | 'liquid' | 'index' | 'elss';
  invested_amount: number;
  current_value: number;
}

export interface UserFinanceContext {
  monthly_income: number;
  monthly_expenses: number;
  bank_balance: number;
  mutual_fund_holdings: MutualFundHolding[];
  risk_profile: 'low' | 'moderate' | 'high';
  investment_horizon_years: number;
  dependents: number;
  emergency_fund_months: number;
}

export interface ClassificationResult {
  is_indian_finance: boolean;
  confidence: number;
  reason: string;
}

export interface FundData {
  fund_name: string;
  category: string;
  expense_ratio: string;
  '1Y_return': string;
  '3Y_return': string;
  aum_crores: number;
  fund_house: string;
}

export interface WebSearchResult {
  query: string;
  funds: FundData[];
  search_timestamp: string;
  source_urls: string[];
}

export interface Instrument {
  name: string;
  category: 'mutual_fund' | 'index_fund' | 'debt_fund' | 'liquid_fund' | 'elss';
}

export interface RecommendationItem {
  instrument: Instrument;
  action: 'BUY' | 'SELL' | 'HOLD';
  rationale: string;
  amount: number;
  execution: {
    enabled: false;
    label: 'Execute (Coming Soon)';
  };
}

export interface ContextSummary {
  user_intent_summary: string;
  query_type: string;
}

export interface Situation {
  description: string;
  data_basis: 'user_data' | 'hypothetical' | 'mixed';
  scenario_type: 'data-backed' | 'hypothetical' | 'mixed';
}

export interface RecommendationAnalysis {
  risk_assessment: string;
  expected_returns: string;
  allocation_reasoning: string;
  amount_calculation: string;
}

export interface RecommendationOutput {
  conversational_response: string;
  context: ContextSummary;
  situation: Situation;
  analysis: RecommendationAnalysis;
  recommendations: RecommendationItem[];
}

export interface RejectionResponse {
  type: 'rejection';
  classification: ClassificationResult;
  message: string;
}

export interface SuccessResponse {
  type: 'success';
  classification: ClassificationResult;
  web_search: WebSearchResult; // Now always required
  recommendation: RecommendationOutput;
  validation_attempts: number;
}

export interface ErrorResponse {
  type: 'error';
  error: string;
  layer: string;
  details?: unknown;
}

export type PlaygroundResponse = RejectionResponse | SuccessResponse | ErrorResponse;

export interface DerivedMetrics {
  monthly_surplus: number;
  total_invested: number;
  total_current_value: number;
  total_returns: number;
  return_percentage: number;
  required_emergency_fund: number;
  current_emergency_fund_coverage: number;
  emergency_fund_gap: number;
  asset_allocation: {
    equity_percentage: number;
    debt_percentage: number;
    liquid_percentage: number;
  };
}
