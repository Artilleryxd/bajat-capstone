/**
 * Shared constants — category colors and labels.
 * Always import from here; never hardcode hex values inline.
 */

export const CATEGORY_COLORS = {
  needs: "#22C55E",
  wants: "#3B82F6",
  desires: "#F59E0B",
  investments: "#10B981",
} as const;

export const CATEGORY_LABELS = {
  needs: "Needs",
  wants: "Wants",
  desires: "Desires",
  investments: "Investments",
} as const;

export type ExpenseCategory = keyof typeof CATEGORY_COLORS;
