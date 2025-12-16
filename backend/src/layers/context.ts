/**
 * LAYER 1 - User Context Manager
 *
 * Purpose: Manage user financial context as the single source of truth.
 * This context is injected into LLM prompts as structured data, NOT merged textually.
 *
 * Design decisions:
 * - Default context uses REAL Indian mutual fund names
 * - Context is validated before use
 * - Derived metrics are computed (surplus, emergency fund status, etc.)
 */

import { UserFinanceContext, UserFinanceContextSchema } from '../types/schemas';
import { logger } from '../utils/logger';

/**
 * Default user context with realistic Indian mutual fund holdings
 * This provides a good starting point for experimentation
 */
export const DEFAULT_USER_CONTEXT: UserFinanceContext = {
  monthly_income: 150000, // 1.5 lakh per month
  monthly_expenses: 80000, // 80k per month
  bank_balance: 500000, // 5 lakh in savings
  mutual_fund_holdings: [
    {
      fund_name: 'Parag Parikh Flexi Cap Fund Direct Growth',
      category: 'equity',
      invested_amount: 200000,
      current_value: 245000,
    },
    {
      fund_name: 'HDFC Index Fund Nifty 50 Plan Direct Growth',
      category: 'index',
      invested_amount: 150000,
      current_value: 172000,
    },
    {
      fund_name: 'ICICI Prudential Liquid Fund Direct Growth',
      category: 'liquid',
      invested_amount: 100000,
      current_value: 103500,
    },
    {
      fund_name: 'Mirae Asset Tax Saver Fund Direct Growth',
      category: 'elss',
      invested_amount: 150000,
      current_value: 168000,
    },
    {
      fund_name: 'SBI Magnum Gilt Fund Direct Growth',
      category: 'debt',
      invested_amount: 100000,
      current_value: 108000,
    },
  ],
  risk_profile: 'moderate',
  investment_horizon_years: 10,
  dependents: 2,
  emergency_fund_months: 6,
};

/**
 * Derived metrics computed from user context
 * These help the LLM make better recommendations
 */
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

/**
 * Compute derived metrics from user context
 */
export function computeDerivedMetrics(context: UserFinanceContext): DerivedMetrics {
  const monthly_surplus = context.monthly_income - context.monthly_expenses;

  const total_invested = context.mutual_fund_holdings.reduce(
    (sum, h) => sum + h.invested_amount,
    0
  );

  const total_current_value = context.mutual_fund_holdings.reduce(
    (sum, h) => sum + h.current_value,
    0
  );

  const total_returns = total_current_value - total_invested;
  const return_percentage =
    total_invested > 0 ? (total_returns / total_invested) * 100 : 0;

  const required_emergency_fund =
    context.monthly_expenses * context.emergency_fund_months;

  // Liquid funds + bank balance = emergency fund coverage
  const liquid_holdings = context.mutual_fund_holdings
    .filter(h => h.category === 'liquid')
    .reduce((sum, h) => sum + h.current_value, 0);

  const current_emergency_fund_coverage = context.bank_balance + liquid_holdings;
  const emergency_fund_gap = required_emergency_fund - current_emergency_fund_coverage;

  // Asset allocation
  const equity_value = context.mutual_fund_holdings
    .filter(h => ['equity', 'elss', 'index'].includes(h.category))
    .reduce((sum, h) => sum + h.current_value, 0);

  const debt_value = context.mutual_fund_holdings
    .filter(h => h.category === 'debt')
    .reduce((sum, h) => sum + h.current_value, 0);

  const liquid_value = context.mutual_fund_holdings
    .filter(h => h.category === 'liquid')
    .reduce((sum, h) => sum + h.current_value, 0);

  const total = equity_value + debt_value + liquid_value;

  return {
    monthly_surplus,
    total_invested,
    total_current_value,
    total_returns,
    return_percentage: Math.round(return_percentage * 100) / 100,
    required_emergency_fund,
    current_emergency_fund_coverage,
    emergency_fund_gap: Math.max(0, emergency_fund_gap),
    asset_allocation: {
      equity_percentage: total > 0 ? Math.round((equity_value / total) * 100) : 0,
      debt_percentage: total > 0 ? Math.round((debt_value / total) * 100) : 0,
      liquid_percentage: total > 0 ? Math.round((liquid_value / total) * 100) : 0,
    },
  };
}

/**
 * Validate and sanitize user context
 */
export function validateUserContext(
  context: unknown
): { valid: true; context: UserFinanceContext } | { valid: false; errors: string[] } {
  logger.context('Validating user context');

  try {
    const validated = UserFinanceContextSchema.parse(context);
    logger.context('Context validation passed');
    return { valid: true, context: validated };
  } catch (error) {
    if (error instanceof Error) {
      const zodError = error as any;
      if (zodError.errors) {
        const errors = zodError.errors.map(
          (e: any) => `${e.path.join('.')}: ${e.message}`
        );
        logger.error('LAYER-1:CONTEXT', 'Validation failed', { errors });
        return { valid: false, errors };
      }
    }
    logger.error('LAYER-1:CONTEXT', 'Validation failed', { error });
    return { valid: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Format context for LLM consumption
 * Returns structured data that can be injected into prompts
 */
export function formatContextForLLM(context: UserFinanceContext): string {
  const metrics = computeDerivedMetrics(context);

  return `<USER_FINANCIAL_CONTEXT>
{
  "income_expenses": {
    "monthly_income": ${context.monthly_income},
    "monthly_expenses": ${context.monthly_expenses},
    "monthly_surplus": ${metrics.monthly_surplus}
  },
  "bank_balance": ${context.bank_balance},
  "portfolio": {
    "total_invested": ${metrics.total_invested},
    "current_value": ${metrics.total_current_value},
    "returns": ${metrics.total_returns},
    "return_percentage": ${metrics.return_percentage}%,
    "holdings": ${JSON.stringify(context.mutual_fund_holdings, null, 2)}
  },
  "asset_allocation": {
    "equity": "${metrics.asset_allocation.equity_percentage}%",
    "debt": "${metrics.asset_allocation.debt_percentage}%",
    "liquid": "${metrics.asset_allocation.liquid_percentage}%"
  },
  "risk_profile": "${context.risk_profile}",
  "investment_horizon_years": ${context.investment_horizon_years},
  "dependents": ${context.dependents},
  "emergency_fund": {
    "target_months": ${context.emergency_fund_months},
    "required_amount": ${metrics.required_emergency_fund},
    "current_coverage": ${metrics.current_emergency_fund_coverage},
    "gap": ${metrics.emergency_fund_gap}
  }
}
</USER_FINANCIAL_CONTEXT>

CONSTRAINTS FOR RECOMMENDATIONS:
- Maximum investable amount per month: ₹${metrics.monthly_surplus}
- Sum of all recommendation amounts MUST NOT exceed monthly surplus
- Only recommend: Mutual funds, Index funds, Debt funds, Liquid funds, ELSS
- NO individual stocks, crypto, or derivatives`;
}
