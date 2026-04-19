// frontend/lib/types/loan.ts

export interface LoanResponse {
  id: string
  loan_type: string
  lender: string | null
  principal_outstanding: number
  interest_rate: number
  emi_amount: number
  emis_remaining: number
  tenure_months: number | null
  is_active: boolean
}

export interface LoanCreate {
  loan_type: string
  lender?: string
  principal_outstanding: number
  interest_rate: number
  emi_amount: number
  emis_remaining: number
  tenure_months?: number
}

export interface ScheduleEntry {
  month: number
  loan_id: string
  payment: number
  interest: number
  principal: number
  remaining_balance: number
}

export interface TimelineEntry {
  year: number
  total_balance: number
  label: string
}

export interface StrategyResult {
  strategy_type: "avalanche" | "snowball"
  total_interest_paid: number
  months_to_close: number
  total_payment: number
  schedule: ScheduleEntry[]
  timeline: TimelineEntry[]
}

export interface LoanPayoffEntry {
  loan_id: string
  loan_type: string
  lender: string | null
  interest_rate: number
  balance: number
  emi_amount: number
  closes_at_month: number
  total_interest_paid: number
  total_payment: number
}

export interface OptimizeResult {
  best_strategy: "avalanche" | "snowball"
  comparison: {
    avalanche: StrategyResult
    snowball: StrategyResult
  }
  total_saved: number
  months_saved: number
  interest_diff: number
  months_diff: number
  monthly_surplus: number
  optimization_basis: {
    mode: string
    weights: {
      interest: number
      months: number
    }
  }
  strategy_scores: {
    avalanche: number
    snowball: number
  }
  loan_payoff_order: LoanPayoffEntry[]
  ai_explanation: string
}
