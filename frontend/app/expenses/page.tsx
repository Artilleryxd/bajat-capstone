import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ExpenseInput } from "@/components/dashboard/expense-input"
import { ExpenseTable } from "@/components/dashboard/expense-table"
import { CategoryDistribution } from "@/components/dashboard/category-distribution"

const transactions = [
  {
    id: "1",
    date: "Mar 4, 2026",
    description: "Grocery Shopping",
    amount: 156.32,
    category: "needs" as const,
    merchant: "Whole Foods",
  },
  {
    id: "2",
    date: "Mar 3, 2026",
    description: "Monthly Rent",
    amount: 2200,
    category: "needs" as const,
    merchant: "Apartment Complex",
  },
  {
    id: "3",
    date: "Mar 3, 2026",
    description: "Dinner with Friends",
    amount: 85.5,
    category: "wants" as const,
    merchant: "Italian Restaurant",
  },
  {
    id: "4",
    date: "Mar 2, 2026",
    description: "New Headphones",
    amount: 299,
    category: "desires" as const,
    merchant: "Electronics Store",
  },
  {
    id: "5",
    date: "Mar 2, 2026",
    description: "Index Fund Contribution",
    amount: 500,
    category: "investments" as const,
    merchant: "Vanguard",
  },
  {
    id: "6",
    date: "Mar 1, 2026",
    description: "Gas Station",
    amount: 52.4,
    category: "needs" as const,
    merchant: "Shell",
  },
  {
    id: "7",
    date: "Feb 28, 2026",
    description: "Streaming Subscription",
    amount: 15.99,
    category: "wants" as const,
    merchant: "Netflix",
  },
  {
    id: "8",
    date: "Feb 27, 2026",
    description: "Coffee",
    amount: 6.5,
    category: "wants" as const,
    merchant: "Starbucks",
  },
]

const categoryData = [
  { name: "Needs", value: 2408.72, percentage: 58, color: "hsl(var(--chart-1))" },
  { name: "Wants", value: 108, percentage: 16, color: "hsl(var(--chart-2))" },
  { name: "Desires", value: 299, percentage: 8, color: "hsl(var(--chart-3))" },
  { name: "Investments", value: 500, percentage: 18, color: "hsl(var(--primary))" },
]

export default function ExpensesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expense Tracking</h1>
          <p className="text-muted-foreground">
            Track and categorize your expenses with AI-powered insights
          </p>
        </div>

        {/* Expense Input */}
        <ExpenseInput />

        {/* Category Distribution */}
        <CategoryDistribution data={categoryData} />

        {/* Transaction History */}
        <ExpenseTable transactions={transactions} />
      </div>
    </DashboardLayout>
  )
}
