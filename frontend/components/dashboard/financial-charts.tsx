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
                tickFormatter={(value) => `$${value / 1000}k`}
                className="text-muted-foreground"
              />
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Net Worth"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
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
                tickFormatter={(value) => `$${value / 1000}k`}
                className="text-muted-foreground"
              />
              <Tooltip
                formatter={(value: number) => `$${value.toLocaleString()}`}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar
                dataKey="income"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                name="Income"
              />
              <Bar
                dataKey="expenses"
                fill="hsl(var(--chart-2))"
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
  { name: "Housing", value: 2200, color: "hsl(var(--chart-1))" },
  { name: "Transportation", value: 800, color: "hsl(var(--chart-2))" },
  { name: "Food", value: 600, color: "hsl(var(--chart-3))" },
  { name: "Utilities", value: 400, color: "hsl(var(--chart-4))" },
  { name: "Entertainment", value: 350, color: "hsl(var(--chart-5))" },
  { name: "Other", value: 450, color: "hsl(var(--muted))" },
]

export function ExpenseBreakdownChart() {
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
                formatter={(value: number) => `$${value.toLocaleString()}`}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
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
  { name: "Assets", value: 285000, color: "hsl(var(--primary))" },
  { name: "Liabilities", value: 110000, color: "hsl(var(--chart-2))" },
]

export function AssetLiabilityChart() {
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
                formatter={(value: number) => `$${value.toLocaleString()}`}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
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
