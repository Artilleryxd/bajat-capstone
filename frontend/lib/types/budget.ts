export interface BudgetNeeds {
  rent?: number
  groceries: number
  commute: number
  bills_and_utilities: number
  healthcare: number
  insurance: number
  family_expenses?: number
  remittances?: number
  [key: string]: number | undefined
}

export interface BudgetWants {
  dining_out: number
  entertainment: number
  shopping: number
  subscriptions: number
  personal_care: number
  travel: number
  family_activities?: number
  [key: string]: number | undefined
}

export interface BudgetInvestments {
  mutual_funds?: number
  ppf_epf?: number
  stocks?: number
  fixed_deposits?: number
  gold_savings?: number
  [key: string]: number | undefined
}

export interface BudgetRepayment {
  [key: string]: number
}

export interface BudgetOutput {
  needs: BudgetNeeds
  wants: BudgetWants
  investments: BudgetInvestments
  emergency: number
  repayment: BudgetRepayment
  insights: string[]
}

export interface SpendingSummary {
  needs: number
  desires?: number
  wants: number
  investment?: number
  investments: number
  repayments?: number
  repayment: number
  emergency: number
}
