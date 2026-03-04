"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { LoanCards } from "@/components/dashboard/loan-cards"
import { LoanTimeline } from "@/components/dashboard/loan-timeline"
import { AIChatPanel } from "@/components/dashboard/ai-chat-panel"
import { MetricCard } from "@/components/dashboard/metric-card"
import {
  Plus,
  Zap,
  Snowflake,
  Calendar,
  DollarSign,
  TrendingDown,
} from "lucide-react"

const loans = [
  {
    id: "1",
    type: "Credit Card",
    icon: "credit-card" as const,
    balance: 8500,
    originalAmount: 12000,
    interestRate: 19.99,
    emi: 450,
    remainingMonths: 24,
    priority: 1,
  },
  {
    id: "2",
    type: "Car Loan",
    icon: "car" as const,
    balance: 18000,
    originalAmount: 32000,
    interestRate: 6.5,
    emi: 520,
    remainingMonths: 36,
    priority: 2,
  },
  {
    id: "3",
    type: "Student Loan",
    icon: "education" as const,
    balance: 35000,
    originalAmount: 50000,
    interestRate: 4.5,
    emi: 380,
    remainingMonths: 96,
    priority: 3,
  },
  {
    id: "4",
    type: "Mortgage",
    icon: "home" as const,
    balance: 285000,
    originalAmount: 350000,
    interestRate: 3.25,
    emi: 1520,
    remainingMonths: 264,
  },
]

const timelineData = [
  { month: "Now", balance: 346500, paid: 0 },
  { month: "Y1", balance: 310000, paid: 36500 },
  { month: "Y2", balance: 270000, paid: 76500 },
  { month: "Y3", balance: 225000, paid: 121500 },
  { month: "Y5", balance: 130000, paid: 216500 },
  { month: "Y7", balance: 50000, paid: 296500 },
  { month: "Y10", balance: 0, paid: 346500 },
]

const loanSuggestions = [
  "Which loan should I pay first?",
  "How much interest can I save?",
  "Should I refinance?",
  "What if I pay extra monthly?",
]

export default function LoansPage() {
  const [loanType, setLoanType] = useState("")
  const [balance, setBalance] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [emi, setEmi] = useState("")
  const [tenure, setTenure] = useState("")

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loan Optimization</h1>
          <p className="text-muted-foreground">
            Optimize your debt repayment strategy with AI-powered recommendations
          </p>
        </div>

        {/* Summary Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Debt"
            value="$346,500"
            icon={DollarSign}
            iconColor="bg-chart-2/10 text-chart-2"
          />
          <MetricCard
            title="Monthly Payments"
            value="$2,870"
            icon={Calendar}
            iconColor="bg-primary/10 text-primary"
          />
          <MetricCard
            title="Interest Saved"
            value="$12,340"
            change={15.2}
            changeLabel="with optimization"
            icon={TrendingDown}
            iconColor="bg-success/10 text-success"
          />
          <MetricCard
            title="Debt-Free In"
            value="7.2 Years"
            icon={Zap}
            iconColor="bg-chart-3/10 text-chart-3"
          />
        </div>

        {/* Strategy Recommendation */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="w-4 h-4 text-chart-3" />
                Recommended: Avalanche Method
              </CardTitle>
              <CardDescription>
                Pay off highest interest rate loans first to minimize total interest paid
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
                <span className="text-sm">Total Interest Saved</span>
                <span className="font-bold text-success">$12,340</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                <span className="text-sm">Time to Debt Freedom</span>
                <span className="font-bold text-primary">7 years 2 months</span>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Repayment Order:</p>
                <ol className="space-y-2">
                  {loans
                    .filter((l) => l.priority)
                    .sort((a, b) => (a.priority || 0) - (b.priority || 0))
                    .map((loan, index) => (
                      <li
                        key={loan.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-secondary"
                      >
                        <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <span className="flex-1">{loan.type}</span>
                        <span className="text-sm text-destructive font-medium">
                          {loan.interestRate}% APR
                        </span>
                      </li>
                    ))}
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Snowflake className="w-4 h-4 text-chart-2" />
                Alternative: Snowball Method
              </CardTitle>
              <CardDescription>
                Pay off smallest balances first for psychological wins
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
                <span className="text-sm">Total Interest Saved</span>
                <span className="font-bold">$8,450</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
                <span className="text-sm">Time to Debt Freedom</span>
                <span className="font-bold">7 years 8 months</span>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Repayment Order:</p>
                <ol className="space-y-2">
                  {[...loans]
                    .sort((a, b) => a.balance - b.balance)
                    .slice(0, 3)
                    .map((loan, index) => (
                      <li
                        key={loan.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-secondary"
                      >
                        <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <span className="flex-1">{loan.type}</span>
                        <span className="text-sm text-muted-foreground font-medium">
                          ${loan.balance.toLocaleString()}
                        </span>
                      </li>
                    ))}
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loan Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Loans</h2>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Loan
            </Button>
          </div>
          <LoanCards loans={loans} />
        </div>

        {/* Timeline and Chat */}
        <div className="grid gap-6 lg:grid-cols-2">
          <LoanTimeline data={timelineData} />
          <AIChatPanel
            title="Loan Strategy Assistant"
            placeholder="Ask about your debt repayment strategy..."
            suggestions={loanSuggestions}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
