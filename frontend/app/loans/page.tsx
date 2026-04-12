"use client"

import { useState, useEffect, useCallback } from "react"
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
import { MetricCard } from "@/components/dashboard/metric-card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import {
  Plus,
  Zap,
  Snowflake,
  Calendar,
  DollarSign,
  TrendingDown,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { useCurrency } from "@/lib/hooks/useCurrency"
import { getToken } from "@/lib/auth"
import type { LoanResponse, LoanCreate, OptimizeResult } from "@/lib/types/loan"

const LOAN_TYPE_OPTIONS = [
  "Home Loan",
  "Car Loan",
  "Personal Loan",
  "Education Loan",
  "Credit Card",
  "Business Loan",
  "Gold Loan",
  "Other",
]

function loanToCardFormat(loan: LoanResponse) {
  const iconMap: Record<string, "home" | "car" | "credit-card" | "education" | "personal"> = {
    "Home Loan": "home",
    "Car Loan": "car",
    "Credit Card": "credit-card",
    "Education Loan": "education",
  }
  return {
    id: loan.id,
    type: loan.loan_type,
    icon: (iconMap[loan.loan_type] ?? "personal") as
      | "home"
      | "car"
      | "credit-card"
      | "education"
      | "personal",
    balance: loan.principal_outstanding,
    originalAmount: loan.principal_outstanding,
    interestRate: loan.interest_rate,
    emi: loan.emi_amount,
    remainingMonths: loan.emis_remaining,
  }
}

export default function LoansPage() {
  const { formatCurrency, currencySymbol } = useCurrency()

  const [loans, setLoans] = useState<LoanResponse[]>([])
  const [loadingLoans, setLoadingLoans] = useState(true)
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isAddingLoan, setIsAddingLoan] = useState(false)

  // Add loan form state
  const [loanType, setLoanType] = useState("")
  const [lender, setLender] = useState("")
  const [balance, setBalance] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [emi, setEmi] = useState("")
  const [emisRemaining, setEmisRemaining] = useState("")

  const fetchLoans = useCallback(async () => {
    setLoadingLoans(true)
    try {
      const token = getToken()
      const res = await fetch("/api/loans", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to fetch loans")
      const data = await res.json()
      setLoans(data.loans ?? [])
    } catch {
      toast.error("Could not load loans")
    } finally {
      setLoadingLoans(false)
    }
  }, [])

  useEffect(() => {
    fetchLoans()
  }, [fetchLoans])

  const handleAddLoan = async () => {
    if (!loanType || !balance || !interestRate || !emi || !emisRemaining) {
      toast.error("Please fill in all required fields")
      return
    }

    const payload: LoanCreate = {
      loan_type: loanType,
      lender: lender || undefined,
      principal_outstanding: parseFloat(balance),
      interest_rate: parseFloat(interestRate),
      emi_amount: parseFloat(emi),
      emis_remaining: parseInt(emisRemaining, 10),
    }

    setIsAddingLoan(true)
    try {
      const token = getToken()
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to add loan")
      toast.success("Loan added successfully")
      setLoanType("")
      setLender("")
      setBalance("")
      setInterestRate("")
      setEmi("")
      setEmisRemaining("")
      setShowAddForm(false)
      fetchLoans()
    } catch {
      toast.error("Failed to add loan")
    } finally {
      setIsAddingLoan(false)
    }
  }

  const handleOptimize = async () => {
    setIsOptimizing(true)
    try {
      const token = getToken()
      const res = await fetch("/api/loans/optimize", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(
          (err?.detail?.message as string | undefined) ?? "Optimization failed"
        )
      }
      const data = (await res.json()) as OptimizeResult
      setOptimizeResult(data)
      toast.success("Optimization complete")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Optimization failed")
    } finally {
      setIsOptimizing(false)
    }
  }

  // Derived metrics
  const totalDebt = loans.reduce((s, l) => s + l.principal_outstanding, 0)
  const totalEmi = loans.reduce((s, l) => s + l.emi_amount, 0)

  // Timeline data for LoanTimeline component
  const timelineData =
    optimizeResult
      ? optimizeResult.comparison[optimizeResult.best_strategy].timeline.map((t) => ({
          month: t.label,
          balance: t.total_balance,
          paid: Math.max(0, totalDebt - t.total_balance),
        }))
      : loans.length > 0
      ? [{ month: "Now", balance: totalDebt, paid: 0 }]
      : []

  // Comparison chart data for Recharts
  const comparisonChartData =
    optimizeResult
      ? (() => {
          const avTimeline = optimizeResult.comparison.avalanche.timeline
          const snTimeline = optimizeResult.comparison.snowball.timeline
          const maxLen = Math.max(avTimeline.length, snTimeline.length)
          return Array.from({ length: maxLen }, (_, i) => ({
            label: avTimeline[i]?.label ?? snTimeline[i]?.label ?? `Y${i}`,
            avalanche: avTimeline[i]?.total_balance ?? 0,
            snowball: snTimeline[i]?.total_balance ?? 0,
          }))
        })()
      : []

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Loan Optimization</h1>
            <p className="text-muted-foreground">
              Optimize your debt repayment strategy with AI-powered recommendations
            </p>
          </div>
          <Button
            onClick={handleOptimize}
            disabled={loans.length === 0 || isOptimizing}
            className="gap-2"
          >
            {isOptimizing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isOptimizing ? "Analyzing..." : "Optimize"}
          </Button>
        </div>

        {/* Summary Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Debt"
            value={formatCurrency(totalDebt)}
            icon={DollarSign}
            iconColor="bg-chart-2/10 text-chart-2"
          />
          <MetricCard
            title="Monthly Payments"
            value={formatCurrency(totalEmi)}
            icon={Calendar}
            iconColor="bg-primary/10 text-primary"
          />
          <MetricCard
            title="Interest Saved"
            value={optimizeResult ? formatCurrency(optimizeResult.total_saved) : "—"}
            changeLabel={optimizeResult ? "with optimization" : "run optimize to see"}
            icon={TrendingDown}
            iconColor="bg-success/10 text-success"
          />
          <MetricCard
            title="Months Saved"
            value={optimizeResult ? `${optimizeResult.months_saved} mo` : "—"}
            icon={Zap}
            iconColor="bg-chart-3/10 text-chart-3"
          />
        </div>

        {/* Optimization Results */}
        {optimizeResult && (
          <div className="space-y-4">
            {/* Best strategy banner */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="capitalize bg-primary text-primary-foreground">
                    {optimizeResult.best_strategy} — Recommended
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Saves {formatCurrency(optimizeResult.total_saved)} in interest ·{" "}
                    {optimizeResult.months_saved} months faster
                  </span>
                </div>
              </CardHeader>
              {optimizeResult.ai_explanation && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {optimizeResult.ai_explanation}
                  </p>
                </CardContent>
              )}
            </Card>

            {/* Strategy comparison cards */}
            <div className="grid gap-4 lg:grid-cols-2">
              {(["avalanche", "snowball"] as const).map((key) => {
                const strat = optimizeResult.comparison[key]
                const isBest = optimizeResult.best_strategy === key
                return (
                  <Card key={key} className={isBest ? "border-primary/30" : ""}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        {key === "avalanche" ? (
                          <Zap className="w-4 h-4 text-chart-3" />
                        ) : (
                          <Snowflake className="w-4 h-4 text-chart-2" />
                        )}
                        {key.charAt(0).toUpperCase() + key.slice(1)} Method
                        {isBest && (
                          <Badge variant="outline" className="ml-auto text-xs">
                            Best
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {key === "avalanche"
                          ? "Pay highest-rate loans first — minimises total interest"
                          : "Pay smallest loans first — builds momentum"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between p-3 rounded-lg bg-muted text-sm">
                        <span className="text-muted-foreground">Total Interest</span>
                        <span className="font-semibold">
                          {formatCurrency(strat.total_interest_paid)}
                        </span>
                      </div>
                      <div className="flex justify-between p-3 rounded-lg bg-muted text-sm">
                        <span className="text-muted-foreground">Months to Close</span>
                        <span className="font-semibold">{strat.months_to_close}</span>
                      </div>
                      <div className="flex justify-between p-3 rounded-lg bg-muted text-sm">
                        <span className="text-muted-foreground">Total Payment</span>
                        <span className="font-semibold">
                          {formatCurrency(strat.total_payment)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Comparison line chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Strategy Comparison</CardTitle>
                <CardDescription>
                  Total outstanding balance over time — Avalanche vs Snowball
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={comparisonChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v: number) =>
                          `${currencySymbol}${(v / 1000).toFixed(0)}k`
                        }
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
                      <Line
                        type="monotone"
                        dataKey="avalanche"
                        name="Avalanche"
                        stroke="var(--chart-3)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="snowball"
                        name="Snowball"
                        stroke="var(--chart-2)"
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray="4 4"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Your Loans */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Loans</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm((v) => !v)}
            >
              {showAddForm ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" /> Hide Form
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" /> Add Loan
                </>
              )}
            </Button>
          </div>

          {/* Add Loan Form */}
          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add New Loan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="loan-type">Loan Type *</Label>
                    <Select value={loanType} onValueChange={setLoanType}>
                      <SelectTrigger id="loan-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOAN_TYPE_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lender">Lender</Label>
                    <Input
                      id="lender"
                      placeholder="e.g. HDFC Bank"
                      value={lender}
                      onChange={(e) => setLender(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="balance">Outstanding Balance *</Label>
                    <Input
                      id="balance"
                      type="number"
                      min="0"
                      placeholder="e.g. 500000"
                      value={balance}
                      onChange={(e) => setBalance(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="interest-rate">Interest Rate (%) *</Label>
                    <Input
                      id="interest-rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="e.g. 8.5"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="emi">Monthly EMI *</Label>
                    <Input
                      id="emi"
                      type="number"
                      min="0"
                      placeholder="e.g. 12000"
                      value={emi}
                      onChange={(e) => setEmi(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="emis-remaining">EMIs Remaining *</Label>
                    <Input
                      id="emis-remaining"
                      type="number"
                      min="1"
                      placeholder="e.g. 48"
                      value={emisRemaining}
                      onChange={(e) => setEmisRemaining(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-4 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAddLoan} disabled={isAddingLoan}>
                    {isAddingLoan ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {isAddingLoan ? "Adding..." : "Add Loan"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loan list */}
          {loadingLoans ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : loans.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <DollarSign className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="font-medium">No loans added yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add your loans above to get personalized repayment recommendations
                </p>
              </CardContent>
            </Card>
          ) : (
            <LoanCards loans={loans.map(loanToCardFormat)} />
          )}
        </div>

        {/* Payoff Timeline */}
        {timelineData.length > 1 && <LoanTimeline data={timelineData} />}
      </div>
    </DashboardLayout>
  )
}
