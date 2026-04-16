/**
 * Asset & Net Worth module type definitions.
 */

export type AssetType =
  | "real_estate"
  | "vehicle"
  | "gold"
  | "equity"
  | "fd"
  | "gadget"
  | "other";

export type LoanType =
  | "home_loan"
  | "car_loan"
  | "personal_loan"
  | "education_loan"
  | "credit_card"
  | "bnpl";

export interface Asset {
  id: string;
  user_id: string;
  asset_type: AssetType;
  name: string;
  purchase_price: number | null;
  purchase_date: string | null;
  current_value: number | null;
  value_source: "scraped" | "manual" | "estimated" | null;
  appreciation_rate: number | null;
  last_valued_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Loan {
  id: string;
  user_id: string;
  loan_type: LoanType;
  lender: string | null;
  principal_outstanding: number;
  interest_rate: number;
  emi_amount: number;
  emis_remaining: number;
  tenure_months: number | null;
  down_payment: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface ClassificationResult {
  type: "asset" | "liability";
  asset_type: AssetType | null;
  liability_type: string | null;
  confidence: number;
}

export interface AssetProjection {
  asset_id: string;
  name: string;
  asset_type: AssetType;
  current_value: number;
  appreciation_rate: number;
  projections: Record<string, number>;
}

export interface NetWorthSummary {
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
  approx_net_worth: number | null;
  approx_confidence: number | null;
  approx_range: { min: number; max: number } | null;
  approx_reasoning: string | null;
  debt_ratio: number;
  asset_count: number;
  liability_count: number;
}

export interface TimelineEntry {
  year: number;
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
}

export interface NetWorthTimeline {
  current: NetWorthSummary;
  timeline: TimelineEntry[];
}

export interface AiProjection {
  current_value: number;
  current_reasoning: string;
  projections: Record<string, number>;
  projection_reasoning: string;
  annual_rate: number;
}

export interface DrilldownData {
  asset: Asset;
  current_value: number;
  purchase_price: number;
  appreciation_pct: number;
  appreciation_rate: number;
  projections: Record<string, number>;
  ai_projection: AiProjection | null;
}

// ── API Response wrappers ──

export interface AssetsListResponse {
  status: string;
  assets: Asset[];
  total_value: number;
  count: number;
}

export interface LiabilitiesListResponse {
  status: string;
  liabilities: Loan[];
  total_outstanding: number;
  count: number;
}

// ── Asset type display helpers ──

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  real_estate: "Real Estate",
  vehicle: "Vehicle",
  gold: "Gold",
  equity: "Equity",
  fd: "Fixed Deposit",
  gadget: "Gadget",
  other: "Other",
};

export const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  real_estate: "#8B5CF6",
  vehicle: "#3B82F6",
  gold: "#F59E0B",
  equity: "#10B981",
  fd: "#06B6D4",
  gadget: "#EC4899",
  other: "#64748B",
};

export const LOAN_TYPE_LABELS: Record<string, string> = {
  home_loan: "Home Loan",
  car_loan: "Car Loan",
  personal_loan: "Personal Loan",
  education_loan: "Education Loan",
  credit_card: "Credit Card",
  bnpl: "Buy Now Pay Later",
};
