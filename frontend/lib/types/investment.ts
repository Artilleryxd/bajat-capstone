export interface AllocationItem {
  name: string
  percentage: number
  color: string
  rationale: string
}

export interface GoalProjection {
  years_to_goal: number | null
  projected_value_5yr: number
  projected_value_10yr: number
  projected_value_20yr: number
  monthly_sip: number
  expected_return_pct: number
}

export interface InvestmentStrategyResponse {
  id: string | null
  risk_score: number
  risk_profile: "conservative" | "moderate" | "aggressive"
  risk_explanation: string
  is_debt_heavy: boolean
  debt_warning: string | null
  allocations: AllocationItem[]
  investable_surplus: number
  recommended_sip: number | null       // budget-derived: what the budget allocates to investments
  required_sip_for_goal: number | null  // goal-derived: what is needed to hit the goal on time
  ai_insights: string
  goal_projection: GoalProjection | null
  goal_amount: number | null
  current_portfolio_value: number | null
  sip_date: number | null
  payout_date: string | null
  estimated_annual_return: number | null
  time_horizon: string | null
  is_using_overrides: boolean
  created_at: string | null
}

export interface ProfileOverrides {
  monthly_income?: number | null
  investment_exp?: string | null
  time_horizon?: string | null
}

export interface InvestmentGoal {
  goal_amount: number
  current_portfolio_value: number
  sip_date: number
  payout_date?: string
  portfolio_text?: string
}

export interface GenerateStrategyRequest {
  goal?: InvestmentGoal | null
  overrides?: ProfileOverrides | null
}
