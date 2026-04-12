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

export interface OptimizeResult {
  best_strategy: "avalanche" | "snowball"
  comparison: {
    avalanche: StrategyResult
    snowball: StrategyResult
  }
  total_saved: number
  months_saved: number
  ai_explanation: string
}
