"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/lib/hooks/useCurrency"

interface BudgetCategory {
  name: string
  allocated: number
  spent: number
  color: string
  percentage: number
}

interface BudgetProgressProps {
  categories: BudgetCategory[]
  totalBudget: number
  className?: string
}

export function BudgetProgress({ categories, totalBudget, className }: BudgetProgressProps) {
  const { formatCurrency } = useCurrency()

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Budget Allocation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {categories.map((category) => {
          const usagePercentage = (category.spent / category.allocated) * 100
          const isOverBudget = usagePercentage > 100

          return (
            <div key={category.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="font-medium">{category.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({category.percentage}%)
                  </span>
                </div>
                <div className="text-sm text-right">
                  <span className={cn(isOverBudget && "text-destructive font-medium")}>
                    {formatCurrency(category.spent)}
                  </span>
                  <span className="text-muted-foreground"> / {formatCurrency(category.allocated)}</span>
                </div>
              </div>
              <div className="relative">
                <Progress
                  value={Math.min(usagePercentage, 100)}
                  className="h-2"
                  style={{
                    // @ts-ignore - custom CSS property
                    "--progress-background": category.color,
                  }}
                />
                {isOverBudget && (
                  <div
                    className="absolute top-0 left-0 h-full bg-destructive rounded-full opacity-50"
                    style={{ width: "100%" }}
                  />
                )}
              </div>
            </div>
          )
        })}

        {/* Total Summary */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Monthly Budget</span>
            <span className="font-bold text-lg">{formatCurrency(totalBudget)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
