"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/lib/constants"
import { useCurrency } from "@/lib/hooks/useCurrency"
import type { ExpenseCategory } from "@/lib/types/expense"

interface Transaction {
  id: string
  date?: string
  expense_date?: string | null
  description: string
  amount: number
  category: ExpenseCategory | null
  merchant?: string | null
  subcategory?: string | null
  ai_confidence?: number | null
  confidence?: number | null
  source?: string
  user_override?: boolean
}

interface ExpenseTableProps {
  transactions: Transaction[]
  className?: string
  title?: string
  onCategoryChange?: (id: string, category: ExpenseCategory) => void
  showConfidence?: boolean
  showSource?: boolean
}

const categoryBadgeStyles: Record<string, string> = {
  needs: "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20",
  wants: "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20",
  desires: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20",
  investments: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20",
}

const sourceBadgeStyles: Record<string, string> = {
  manual: "bg-muted text-muted-foreground",
  csv: "bg-blue-500/10 text-blue-500",
  pdf: "bg-orange-500/10 text-orange-500",
  receipt: "bg-purple-500/10 text-purple-500",
  image: "bg-purple-500/10 text-purple-500",
  ai: "bg-amber-500/10 text-amber-500",
}

export function ExpenseTable({
  transactions,
  className,
  title = "Recent Transactions",
  onCategoryChange,
  showConfidence = false,
  showSource = false,
}: ExpenseTableProps) {
  const { formatCurrency } = useCurrency()

  if (!transactions.length) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No expenses yet. Add one manually or upload a file.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Category</TableHead>
                {showConfidence && <TableHead>Confidence</TableHead>}
                {showSource && <TableHead>Source</TableHead>}
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => {
                const displayDate = t.date || t.expense_date || ""
                const confidence = t.confidence ?? t.ai_confidence ?? null
                const cat = t.category

                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium text-muted-foreground whitespace-nowrap">
                      {displayDate}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{t.description}</p>
                        {t.subcategory && (
                          <p className="text-xs text-muted-foreground">{t.subcategory}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.merchant || "—"}
                    </TableCell>
                    <TableCell>
                      {onCategoryChange ? (
                        <Select
                          value={cat || ""}
                          onValueChange={(v) =>
                            onCategoryChange(t.id, v as ExpenseCategory)
                          }
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue placeholder="Assign" />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map(
                              (c) => (
                                <SelectItem key={c} value={c}>
                                  <span className="flex items-center gap-2">
                                    <span
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: CATEGORY_COLORS[c] }}
                                    />
                                    {CATEGORY_LABELS[c]}
                                  </span>
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      ) : cat ? (
                        <Badge
                          variant="outline"
                          className={cn("font-medium", categoryBadgeStyles[cat])}
                        >
                          {t.user_override && "✏️ "}
                          {CATEGORY_LABELS[cat] || cat}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {showConfidence && (
                      <TableCell>
                        {confidence !== null ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-mono text-xs",
                              confidence >= 0.8
                                ? "text-green-500 border-green-500/20"
                                : confidence >= 0.5
                                  ? "text-amber-500 border-amber-500/20"
                                  : "text-red-500 border-red-500/20"
                            )}
                          >
                            {Math.round(confidence * 100)}%
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    {showSource && (
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs capitalize",
                            sourceBadgeStyles[t.source || "manual"]
                          )}
                        >
                          {t.source || "manual"}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-right font-medium whitespace-nowrap">
                      {formatCurrency(t.amount)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
