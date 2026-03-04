import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { MetricCard } from "@/components/dashboard/metric-card"
import { HealthScore } from "@/components/dashboard/health-score"
import { InsightsCard } from "@/components/dashboard/insights-card"
import {
  NetWorthChart,
  IncomeExpenseChart,
  ExpenseBreakdownChart,
  AssetLiabilityChart,
} from "@/components/dashboard/financial-charts"
import { Wallet, TrendingUp, CreditCard, PiggyBank } from "lucide-react"

const insights = [
  {
    id: "1",
    type: "positive" as const,
    message: "Your savings rate increased by 8% this month. Great progress toward your goals!",
  },
  {
    id: "2",
    type: "negative" as const,
    message: "You spent 15% more on dining this month compared to your average.",
  },
  {
    id: "3",
    type: "info" as const,
    message: "Consider increasing your emergency fund by $500 to reach the recommended 6-month buffer.",
  },
  {
    id: "4",
    type: "warning" as const,
    message: "Your credit card utilization is at 42%. Aim to keep it below 30% for optimal credit health.",
  },
]

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Dashboard</h1>
          <p className="text-muted-foreground">
            {"Welcome back! Here's an overview of your financial health."}
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            title="Net Worth"
            value="$175,000"
            change={12.5}
            icon={Wallet}
            iconColor="bg-primary/10 text-primary"
          />
          <MetricCard
            title="Monthly Income"
            value="$8,500"
            change={5.2}
            icon={TrendingUp}
            iconColor="bg-success/10 text-success"
          />
          <MetricCard
            title="Monthly Expenses"
            value="$4,800"
            change={-3.1}
            icon={CreditCard}
            iconColor="bg-chart-2/10 text-chart-2"
          />
          <MetricCard
            title="Savings Rate"
            value="43.5%"
            change={8.0}
            icon={PiggyBank}
            iconColor="bg-chart-3/10 text-chart-3"
          />
          <HealthScore score={78} className="md:col-span-2 lg:col-span-1" />
        </div>

        {/* Charts Grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          <NetWorthChart />
          <IncomeExpenseChart />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ExpenseBreakdownChart />
          <AssetLiabilityChart />
          <InsightsCard insights={insights} />
        </div>
      </div>
    </DashboardLayout>
  )
}
