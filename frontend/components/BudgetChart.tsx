"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useCurrency } from "@/lib/hooks/useCurrency"
import type { SpendingSummary } from "@/lib/types/budget"

export type BudgetChartDatum = {
  name: string
  value: number
  color: string
  sectionKey: "needs" | "wants" | "investments" | "emergency" | "repayment"
}

interface BudgetChartProps {
  data: BudgetChartDatum[]
  spendingSummary?: SpendingSummary | null
}

function getSpentForSection(
  sectionKey: BudgetChartDatum["sectionKey"],
  spendingSummary?: SpendingSummary | null
): number {
  if (!spendingSummary) return 0
  return spendingSummary[sectionKey] ?? 0
}

function SpentTooltipContent({
  active,
  payload,
  spendingSummary,
  formatCurrency,
}: {
  active?: boolean
  payload?: Array<{ payload: BudgetChartDatum }>
  spendingSummary?: SpendingSummary | null
  formatCurrency: (n: number) => string
}) {
  if (!active || !payload?.length) return null

  const item = payload[0].payload
  const budgeted = item.value
  const spent = getSpentForSection(item.sectionKey, spendingSummary)
  const pctSpent = budgeted > 0 ? Math.min(Math.round((spent / budgeted) * 100), 100) : 0
  const isOver = spent > budgeted

  return (
    <div
      className="rounded-lg border bg-card px-4 py-3 shadow-lg"
      style={{ minWidth: 200 }}
    >
      <p className="text-sm font-semibold mb-2" style={{ color: item.color }}>
        {item.name}
      </p>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Budgeted</span>
          <span className="font-medium">{formatCurrency(budgeted)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Spent</span>
          <span className={`font-medium ${isOver ? "text-red-500" : ""}`}>
            {formatCurrency(spent)}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mt-1">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(pctSpent, 100)}%`,
              backgroundColor: isOver ? "hsl(0,72%,51%)" : item.color,
            }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground text-right">
          {pctSpent}% used
          {isOver && " — over budget!"}
        </p>
      </div>
    </div>
  )
}

export function BudgetChart({ data, spendingSummary }: BudgetChartProps) {
  const { formatCurrency } = useCurrency()

  const visibleData = data.filter((d) => d.value > 0)
  const total = visibleData.reduce((sum, item) => sum + item.value, 0)

  if (visibleData.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Allocation</CardTitle>
        <CardDescription>
          Hover on chart sections to see spending progress
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-65">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={visibleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={98}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {visibleData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={
                    <SpentTooltipContent
                      spendingSummary={spendingSummary}
                      formatCurrency={formatCurrency}
                    />
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Planned</p>
              <p className="text-2xl font-semibold">{formatCurrency(total)}</p>
            </div>

            {visibleData.map((item) => {
              const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
              const spent = getSpentForSection(item.sectionKey, spendingSummary)
              const spentPct = item.value > 0 ? Math.min(Math.round((spent / item.value) * 100), 999) : 0

              return (
                <div key={item.name} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatCurrency(item.value)}</p>
                      <p className="text-xs text-muted-foreground">{pct}%</p>
                    </div>
                  </div>
                  {spendingSummary && (
                    <div className="space-y-0.5">
                      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(spentPct, 100)}%`,
                            backgroundColor: spentPct > 100 ? "hsl(0,72%,51%)" : item.color,
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {formatCurrency(spent)} spent ({spentPct}%)
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
