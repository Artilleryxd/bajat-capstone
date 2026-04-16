/**
 * Expense module type definitions.
 */

export type ExpenseCategory = "needs" | "wants" | "desires" | "investments" | "repayments";

export type ExpenseSource = "manual" | "csv" | "pdf" | "receipt" | "ai";

export interface ParsedExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: ExpenseCategory | null;
  subcategory: string | null;
  confidence: number | null;
  merchant: string | null;
  source: ExpenseSource;
  user_override: boolean;
}

export interface ExpenseRecord {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category: ExpenseCategory | null;
  subcategory: string | null;
  merchant: string | null;
  source: ExpenseSource;
  ai_confidence: number | null;
  user_override: boolean;
  expense_date: string | null;
  month_year: string;
  created_at: string | null;
}

export interface CategorySummary {
  total: number;
  count: number;
}

export interface ExpenseSummary {
  total: number;
  categories: Record<ExpenseCategory, CategorySummary>;
}

export interface MonthlyExpensesResponse {
  month_year: string;
  expenses: ExpenseRecord[];
  summary: ExpenseSummary;
}

export interface UploadResponse {
  status: string;
  message: string;
  expenses: ParsedExpense[];
}
