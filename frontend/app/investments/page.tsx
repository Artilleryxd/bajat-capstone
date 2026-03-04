"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { InvestmentAllocationChart } from "@/components/dashboard/investment-allocation-chart"
import { RiskIndicator } from "@/components/dashboard/risk-indicator"
import { AIChatPanel } from "@/components/dashboard/ai-chat-panel"
import { MetricCard } from "@/components/dashboard/metric-card"
import {
  Sparkles,
  TrendingUp,
  PiggyBank,
  Target,
  Clock,
  AlertTriangle,
} from "lucide-react"

const portfolioAllocation = [
  {
    name: "Large Cap Funds",
    percentage: 40,
    color: "hsl(var(--primary))",
    description: "Blue-chip stocks for stability and consistent growth",
  },
  {
    name: "Mid Cap Funds",
    percentage: 25,
    color: "hsl(var(--chart-2))",
    description: "Growth potential with moderate risk",
  },
  {
    name: "Small Cap Funds",
    percentage: 10,
    color: "hsl(var(--chart-3))",
    description: "High growth potential, higher volatility",
  },
  {
    name: "Bonds & Fixed Income",
    percentage: 15,
    color: "hsl(var(--chart-4))",
    description: "Stable income and portfolio protection",
  },
  {
    name: "Emergency Fund",
    percentage: 10,
    color: "hsl(var(--chart-5))",
    description: "Liquid assets for unexpected expenses",
  },
]

const investmentSuggestions = [
  "How should I rebalance?",
  "Am I taking enough risk?",
  "When should I start investing more?",
  "What about international exposure?",
]

export default function InvestmentsPage() {
  const [income, setIncome] = useState("8500")
  const [savingsRate, setSavingsRate] = useState("20")
  const [investmentHorizon, setInvestmentHorizon] = useState("")
  const [riskTolerance, setRiskTolerance] = useState([50])

  const getRiskLevel = () => {
    if (riskTolerance[0] < 33) return "conservative"
    if (riskTolerance[0] < 66) return "moderate"
    return "aggressive"
  }

  const getExpectedReturn = () => {
    const level = getRiskLevel()
    if (level === "conservative") return { min: 4, max: 6 }
    if (level === "moderate") return { min: 6, max: 10 }
    return { min: 8, max: 15 }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Investment Strategy</h1>
            <p className="text-muted-foreground">
              AI-powered portfolio allocation based on your goals
            </p>
          </div>
          <Button className="w-full sm:w-auto">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Strategy
          </Button>
        </div>

        {/* Important Disclaimer */}
        <Card className="bg-warning/10 border-warning/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-warning-foreground">Important Disclaimer</p>
                <p className="text-muted-foreground">
                  This is for educational purposes only. We recommend asset categories, not specific stocks or funds. 
                  Please consult with a licensed financial advisor before making investment decisions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Monthly Investment"
            value="$1,700"
            icon={PiggyBank}
            iconColor="bg-primary/10 text-primary"
          />
          <MetricCard
            title="Current Portfolio"
            value="$125,000"
            change={8.5}
            icon={TrendingUp}
            iconColor="bg-success/10 text-success"
          />
          <MetricCard
            title="Investment Goal"
            value="$1,000,000"
            icon={Target}
            iconColor="bg-chart-3/10 text-chart-3"
          />
          <MetricCard
            title="Years to Goal"
            value="18 years"
            icon={Clock}
            iconColor="bg-chart-2/10 text-chart-2"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Investment Profile</CardTitle>
              <CardDescription>
                Customize your strategy based on your situation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="income">Monthly Income</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="income"
                    type="number"
                    className="pl-7"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="savings">Savings Rate (%)</Label>
                <Input
                  id="savings"
                  type="number"
                  min="0"
                  max="100"
                  value={savingsRate}
                  onChange={(e) => setSavingsRate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="horizon">Investment Horizon</Label>
                <Select value={investmentHorizon} onValueChange={setInvestmentHorizon}>
                  <SelectTrigger id="horizon">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short-term (1-3 years)</SelectItem>
                    <SelectItem value="medium">Medium-term (3-7 years)</SelectItem>
                    <SelectItem value="long">Long-term (7-15 years)</SelectItem>
                    <SelectItem value="retirement">Retirement (15+ years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Risk Tolerance</Label>
                  <span className="text-sm text-muted-foreground capitalize">
                    {getRiskLevel()}
                  </span>
                </div>
                <Slider
                  value={riskTolerance}
                  onValueChange={setRiskTolerance}
                  max={100}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Conservative</span>
                  <span>Aggressive</span>
                </div>
              </div>

              <Button className="w-full">
                <Sparkles className="w-4 h-4 mr-2" />
                Update Strategy
              </Button>
            </CardContent>
          </Card>

          {/* Portfolio Allocation */}
          <InvestmentAllocationChart
            data={portfolioAllocation}
            className="lg:col-span-2"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Risk Indicator */}
          <RiskIndicator
            level={getRiskLevel()}
            expectedReturn={getExpectedReturn()}
          />

          {/* AI Chat */}
          <AIChatPanel
            title="Investment AI Advisor"
            placeholder="Ask about your investment strategy..."
            suggestions={investmentSuggestions}
          />
        </div>

        {/* Category Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommended Asset Categories</CardTitle>
            <CardDescription>
              Click each category to learn more about its role in your portfolio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {portfolioAllocation.map((item) => (
                <div
                  key={item.name}
                  className="p-4 rounded-lg border hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold">{item.percentage}%</span>
                    <span className="text-sm text-muted-foreground">
                      ${((parseInt(income) * parseInt(savingsRate) / 100) * item.percentage / 100).toFixed(0)}/mo
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
