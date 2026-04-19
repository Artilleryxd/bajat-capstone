"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
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
  MessageSquare,
  ArrowDown,
  Trophy,
  AlertTriangle,
  ChevronRight,
  Target,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/lib/hooks/useCurrency"
import { fetchWithAuth, logout } from "@/lib/auth"
import type { LoanResponse, LoanCreate, OptimizeResult, LoanPayoffEntry } from "@/lib/types/loan"

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

function getRateTier(rate: number): "high" | "mid" | "low" {
  if (rate > 12) return "high"
  if (rate > 8) return "mid"
  return "low"
}

function getRateColor(rate: number): string {
  const tier = getRateTier(rate)
  return tier === "high" ? "#EF4444" : tier === "mid" ? "#F59E0B" : "#10B981"
}

function getRateLabel(rate: number): string {
  const tier = getRateTier(rate)
  return tier === "high" ? "High cost" : tier === "mid" ? "Medium cost" : "Low cost"
}

function getPayoffDate(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" })
}

// ── Roadmap Step Card ─────────────────────────────────────────────────────────

function RoadmapStep({
  entry,
  step,
  total,
  nextEntry,
  formatCompactCurrency,
}: {
  entry: LoanPayoffEntry
  step: number
  total: number
  nextEntry: LoanPayoffEntry | null
  formatCompactCurrency: (n: number) => string
}) {
  const isLast = step === total
  const rateColor = getRateColor(entry.interest_rate)
  const rateLabel = getRateLabel(entry.interest_rate)

  return (
    <div>
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Step circle — sits on top of the connector line */}
        <div className="flex flex-col items-center shrink-0">
          <div
            className="w-10 h-10 rounded-full border-2 bg-background flex flex-col items-center justify-center z-10 relative"
            style={{ borderColor: rateColor }}
          >
            <span className="text-[8px] text-muted-foreground uppercase tracking-wider leading-none">
              Step
            </span>
            <span className="text-sm font-bold leading-none mt-0.5" style={{ color: rateColor }}>
              {step}
            </span>
          </div>
          {/* Connector line segment below circle */}
          {!isLast && (
            <div className="w-px flex-1 min-h-[12px]" style={{ background: `${rateColor}33` }} />
          )}
        </div>

        {/* Card */}
        <div className="flex-1 min-w-0 pb-2">
          <Card
            className="overflow-hidden"
            style={{ borderLeft: `3px solid ${rateColor}` }}
          >
            <CardContent className="p-4">
              {/* Row 1: Loan name + outstanding */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm leading-tight">
                      {entry.loan_type}
                      {entry.lender && (
                        <span className="text-muted-foreground font-normal"> · {entry.lender}</span>
                      )}
                    </h3>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                      style={{ borderColor: rateColor, color: rateColor }}
                    >
                      {entry.interest_rate}% · {rateLabel}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Projected payoff:{" "}
                    <span className="font-medium text-foreground">
                      {getPayoffDate(entry.closes_at_month)}
                    </span>
                    <span className="text-muted-foreground"> ({entry.closes_at_month} mo)</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-bold tabular-nums text-sm">
                    {formatCompactCurrency(entry.balance)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">outstanding</p>
                </div>
              </div>

              {/* Row 2: 3 stats */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                    Monthly EMI
                  </p>
                  <p className="font-mono text-sm font-semibold tabular-nums">
                    {formatCompactCurrency(entry.emi_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                    Total Interest
                  </p>
                  <p className="font-mono text-sm font-semibold tabular-nums text-red-500">
                    {formatCompactCurrency(entry.total_interest_paid)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                    Total Payment
                  </p>
                  <p className="font-mono text-sm font-semibold tabular-nums">
                    {formatCompactCurrency(entry.total_payment)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cascade connector pill */}
          {!isLast && nextEntry && (
            <div className="mt-2 mb-1">
              <div className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-medium">
                <ArrowDown className="w-3 h-3 shrink-0" />
                <span>
                  When cleared,{" "}
                  <strong className="tabular-nums">
                    {formatCompactCurrency(entry.emi_amount)}/mo
                  </strong>{" "}
                  redirects → <strong>{nextEntry.loan_type}</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LoansPage() {
  const router = useRouter()
  const { formatCurrency, formatCompactCurrency } = useCurrency()

  const [loans, setLoans] = useState<LoanResponse[]>([])
  const [loadingLoans, setLoadingLoans] = useState(true)
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isAddingLoan, setIsAddingLoan] = useState(false)
  const [showComparison, setShowComparison] = useState(false)

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
      const res = await fetchWithAuth("/api/loans")
      if (res.status === 401) {
        toast.error("Session expired. Please log in again.")
        logout()
        router.replace("/login")
        return
      }
      if (!res.ok) throw new Error("Failed to fetch loans")
      const data = await res.json()
      setLoans(data.loans ?? [])
    } catch {
      toast.error("Could not load loans")
    } finally {
      setLoadingLoans(false)
    }
  }, [router])

  useEffect(() => {
    fetchLoans()
  }, [fetchLoans])

  const handleAddLoan = async () => {
    if (!loanType || !balance || !interestRate || !emi || !emisRemaining) {
      toast.error("Please fill in all required fields")
      return
    }

    const parsedBalance = Number.parseFloat(balance)
    const parsedInterestRate = Number.parseFloat(interestRate)
    const parsedEmi = Number.parseFloat(emi)
    const parsedEmisRemaining = Number.parseInt(emisRemaining, 10)

    if (
      Number.isNaN(parsedBalance) ||
      Number.isNaN(parsedInterestRate) ||
      Number.isNaN(parsedEmi) ||
      Number.isNaN(parsedEmisRemaining) ||
      parsedBalance <= 0 ||
      parsedInterestRate <= 0 ||
      parsedInterestRate > 100 ||
      parsedEmi <= 0 ||
      parsedEmisRemaining <= 0
    ) {
      toast.error("Please enter valid positive loan values")
      return
    }

    const payload: LoanCreate = {
      loan_type: loanType,
      lender: lender || undefined,
      principal_outstanding: parsedBalance,
      interest_rate: parsedInterestRate,
      emi_amount: parsedEmi,
      emis_remaining: parsedEmisRemaining,
    }

    setIsAddingLoan(true)
    try {
      const res = await fetchWithAuth("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.status === 401) {
        toast.error("Session expired. Please log in again.")
        logout()
        router.replace("/login")
        return
      }
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(
          (err?.detail?.message as string | undefined) ??
            (err?.error as string | undefined) ??
            "Failed to add loan"
        )
      }
      toast.success("Loan added successfully")
      setLoanType("")
      setLender("")
      setBalance("")
      setInterestRate("")
      setEmi("")
      setEmisRemaining("")
      setShowAddForm(false)
      fetchLoans()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add loan")
    } finally {
      setIsAddingLoan(false)
    }
  }

  const handleOptimize = async () => {
    setIsOptimizing(true)
    setShowComparison(false)
    try {
      const res = await fetchWithAuth("/api/loans/optimize", { method: "POST" })
      if (res.status === 401) {
        toast.error("Session expired. Please log in again.")
        logout()
        router.replace("/login")
        return
      }
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

  // Comparison chart data
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

  const payoffOrder = optimizeResult?.loan_payoff_order ?? []
  const bestMonthsToClose = optimizeResult
    ? optimizeResult.comparison[optimizeResult.best_strategy].months_to_close
    : null

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Loan Optimisation</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              AI-powered step-by-step debt clearance plan
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
            {isOptimizing ? "Analysing…" : optimizeResult ? "Re-Optimise" : "Optimise"}
          </Button>
        </div>

        {/* ── Summary Metrics ── */}
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
            changeLabel={optimizeResult ? "vs minimum payments" : "run optimise to see"}
            icon={TrendingDown}
            iconColor="bg-success/10 text-success"
          />
          <MetricCard
            title="Debt-Free In"
            value={bestMonthsToClose ? `${bestMonthsToClose} mo` : "—"}
            changeLabel={
              optimizeResult && optimizeResult.months_saved > 0
                ? `${optimizeResult.months_saved} months faster`
                : optimizeResult
                ? "vs minimum payments"
                : "run optimise to see"
            }
            icon={Target}
            iconColor="bg-chart-3/10 text-chart-3"
          />
        </div>

        {/* ── Your Loans ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Your Loans</h2>
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
                          <SelectItem key={t} value={t}>{t}</SelectItem>
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
                  <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAddLoan} disabled={isAddingLoan}>
                    {isAddingLoan ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {isAddingLoan ? "Adding…" : "Add Loan"}
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
                  Add your loans above to get a personalised repayment roadmap
                </p>
              </CardContent>
            </Card>
          ) : (
            <LoanCards loans={loans.map(loanToCardFormat)} />
          )}
        </div>

        {/* ── Payoff Roadmap (only after optimise) ── */}
        {optimizeResult && payoffOrder.length > 0 && (
          <div className="space-y-4">

            {/* Section header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Payoff Roadmap</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Follow these {payoffOrder.length} step{payoffOrder.length > 1 ? "s" : ""} to clear
                  all debt{bestMonthsToClose ? ` by ${getPayoffDate(bestMonthsToClose)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="capitalize gap-1 text-xs">
                  {optimizeResult.best_strategy === "avalanche" ? (
                    <Zap className="w-3 h-3" />
                  ) : (
                    <Snowflake className="w-3 h-3" />
                  )}
                  {optimizeResult.best_strategy} strategy
                </Badge>
                {optimizeResult.total_saved > 0 && (
                  <Badge className="bg-emerald-600 text-white text-xs gap-1">
                    <TrendingDown className="w-3 h-3" />
                    Saves {formatCompactCurrency(optimizeResult.total_saved)} in interest
                  </Badge>
                )}
              </div>
            </div>

            {/* Rate legend */}
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                High cost (&gt;12%)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Medium (8–12%)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Low (&lt;8%)
              </div>
            </div>

            {/* Steps */}
            <div>
              {payoffOrder.map((entry, i) => (
                <RoadmapStep
                  key={entry.loan_id}
                  entry={entry}
                  step={i + 1}
                  total={payoffOrder.length}
                  nextEntry={payoffOrder[i + 1] ?? null}
                  formatCompactCurrency={formatCompactCurrency}
                />
              ))}
            </div>

            {/* Finish line callout */}
            <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Trophy className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm">
                      Debt-free by {bestMonthsToClose ? getPayoffDate(bestMonthsToClose) : "—"}
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Following this plan saves{" "}
                      <strong className="tabular-nums">
                        {formatCompactCurrency(optimizeResult.total_saved)}
                      </strong>{" "}
                      in interest vs paying only minimums
                      {optimizeResult.months_saved > 0 &&
                        ` and clears debt ${optimizeResult.months_saved} months sooner`}
                      .
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Strategy Comparison (collapsible, secondary) ── */}
        {optimizeResult && (
          <div className="space-y-3">
            <button
              onClick={() => setShowComparison((v) => !v)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {showComparison ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              {showComparison ? "Hide" : "Show"} strategy comparison
            </button>

            {showComparison && (
              <div className="space-y-4">
                {/* Strategy cards */}
                <div className="grid gap-4 lg:grid-cols-2">
                  {(["avalanche", "snowball"] as const).map((key) => {
                    const strat = optimizeResult.comparison[key]
                    const isBest = optimizeResult.best_strategy === key
                    return (
                      <Card key={key} className={isBest ? "border-primary/40" : ""}>
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
                                Recommended
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription>
                            {key === "avalanche"
                              ? "Pay highest-rate loans first — minimises total interest"
                              : "Pay smallest loans first — builds momentum"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between p-3 rounded-lg bg-muted text-sm">
                            <span className="text-muted-foreground">Total Interest</span>
                            <span className="font-semibold tabular-nums">
                              {formatCurrency(strat.total_interest_paid)}
                            </span>
                          </div>
                          <div className="flex justify-between p-3 rounded-lg bg-muted text-sm">
                            <span className="text-muted-foreground">Months to Close</span>
                            <span className="font-semibold">{strat.months_to_close}</span>
                          </div>
                          <div className="flex justify-between p-3 rounded-lg bg-muted text-sm">
                            <span className="text-muted-foreground">Total Payment</span>
                            <span className="font-semibold tabular-nums">
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
                    <CardTitle className="text-base">Balance Over Time</CardTitle>
                    <CardDescription>
                      Total outstanding balance — Avalanche vs Snowball
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={comparisonChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                          <YAxis
                            tick={{ fontSize: 12 }}
                            tickFormatter={(v: number) => formatCompactCurrency(v)}
                          />
                          <Tooltip
                            formatter={(value: number) => formatCurrency(value)}
                            contentStyle={{
                              backgroundColor: "#0f0f18",
                              border: "1px solid rgba(255,255,255,0.12)",
                              borderRadius: "8px",
                              color: "#f2f2f8",
                            }}
                            itemStyle={{ color: "#f2f2f8" }}
                            labelStyle={{ color: "#f2f2f8" }}
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
          </div>
        )}

        {/* ── AI Analysis ── */}
        {optimizeResult?.ai_explanation && (() => {
          const paragraphs = optimizeResult.ai_explanation.split("\n\n").filter(Boolean)
          const sections = [
            {
              label: "Why This Order",
              icon: <Zap className="w-3.5 h-3.5" />,
              iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
              border: "border-l-amber-400 dark:border-l-amber-500",
            },
            {
              label: "The Cascade",
              icon: <ArrowDown className="w-3.5 h-3.5" />,
              iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
              border: "border-l-blue-400 dark:border-l-blue-500",
            },
            {
              label: "The Finish Line",
              icon: <Trophy className="w-3.5 h-3.5" />,
              iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              border: "border-l-emerald-400 dark:border-l-emerald-500",
            },
          ]
          return (
            <Card className="border-primary/20">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    AI Analysis
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="capitalize bg-primary text-primary-foreground text-xs">
                      {optimizeResult.best_strategy} — Recommended
                    </Badge>
                    {optimizeResult.total_saved > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Saves {formatCurrency(optimizeResult.total_saved)} in interest
                        {optimizeResult.months_saved > 0 &&
                          ` · ${optimizeResult.months_saved} mo faster`}
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {paragraphs.slice(0, 3).map((text, i) => {
                  const s = sections[i]
                  if (!s) return null
                  return (
                    <div
                      key={i}
                      className={cn("border-l-2 pl-4 py-0.5", s.border)}
                    >
                      <div className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-1.5 px-2 py-0.5 rounded-full", s.iconBg)}>
                        {s.icon}
                        {s.label}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                    </div>
                  )
                })}
                {paragraphs.length > 3 && (
                  <p className="text-sm text-muted-foreground leading-relaxed pt-1 border-t">
                    {paragraphs.slice(3).join("\n\n")}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })()}

        {/* ── Payoff Timeline chart ── */}
        {timelineData.length > 1 && <LoanTimeline data={timelineData} />}

      </div>
    </DashboardLayout>
  )
}
