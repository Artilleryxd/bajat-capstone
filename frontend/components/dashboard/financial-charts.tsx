"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { useCurrency } from "@/lib/hooks/useCurrency"

// Net Worth Trend Chart
const netWorthData = [
  { month: "Jan", value: 125000 },
  { month: "Feb", value: 128500 },
  { month: "Mar", value: 132000 },
  { month: "Apr", value: 129000 },
  { month: "May", value: 136000 },
  { month: "Jun", value: 142000 },
  { month: "Jul", value: 148000 },
  { month: "Aug", value: 153000 },
  { month: "Sep", value: 159000 },
  { month: "Oct", value: 162000 },
  { month: "Nov", value: 168000 },
  { month: "Dec", value: 175000 },
]

export function NetWorthChart() {
  const { formatCurrency, formatCompactCurrency } = useCurrency()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Net Worth Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={netWorthData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCompactCurrency(value)}
                className="text-muted-foreground"
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Net Worth"]}
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ fill: "var(--primary)", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// Income vs Expenses Chart
const incomeExpenseData = [
  { month: "Jan", income: 8500, expenses: 5200 },
  { month: "Feb", income: 8500, expenses: 4800 },
  { month: "Mar", income: 9200, expenses: 5500 },
  { month: "Apr", income: 8500, expenses: 6100 },
  { month: "May", income: 8500, expenses: 4900 },
  { month: "Jun", income: 10000, expenses: 5300 },
]

export function IncomeExpenseChart() {
  const { formatCurrency, formatCompactCurrency } = useCurrency()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Income vs Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incomeExpenseData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCompactCurrency(value)}
                className="text-muted-foreground"
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar
                dataKey="income"
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
                name="Income"
              />
              <Bar
                dataKey="expenses"
                fill="var(--chart-2)"
                radius={[4, 4, 0, 0]}
                name="Expenses"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// Expense Breakdown Pie Chart
const expenseBreakdownData = [
  { name: "Needs", value: 2200, color: "var(--chart-1)" },
  { name: "Wants", value: 800, color: "var(--chart-2)" },
  { name: "Desires", value: 600, color: "var(--chart-3)" },
  { name: "Investments", value: 1200, color: "var(--chart-4)" },
]

export function ExpenseBreakdownChart() {
  const { formatCurrency } = useCurrency()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Expense Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={expenseBreakdownData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {expenseBreakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// Asset vs Liability Distribution
const assetLiabilityData = [
  { name: "Assets", value: 285000, color: "var(--chart-4)" },
  { name: "Liabilities", value: 110000, color: "var(--chart-2)" },
]

export function AssetLiabilityChart() {
  const { formatCurrency } = useCurrency()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Assets vs Liabilities</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={assetLiabilityData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {assetLiabilityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
