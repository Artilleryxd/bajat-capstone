"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from "recharts"
import {
  Wallet, TrendingUp, TrendingDown, Receipt, PiggyBank,
  Landmark, Scale, Sparkles, ChevronRight, Home, Car,
  CircleDollarSign, Smartphone, Building2, AlertTriangle,
  CheckCircle2, Info, Loader2, ArrowRight, Target,
} from "lucide-react"

import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { getToken, fetchWithAuth } from "@/lib/auth"
import { API_BASE_URL } from "@/lib/config"
import { useCurrency } from "@/lib/hooks/useCurrency"

// ── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  id: string
  full_name?: string | null
  monthly_income?: number | null
}

interface BudgetData {
  needs?: Record<string, number>
  wants?: Record<string, number>
  investments?: Record<string, number>
  emergency?: number
  repayment?: Record<string, number>
  insights?: string[]
  is_debt_heavy?: boolean
}

interface LoanData {
  id: string
  loan_type: string
  lender?: string
  principal_outstanding: number
  interest_rate: number
  emi_amount: number
  emis_remaining: number
}

interface AssetData {
  id: string
  asset_type: string
  name: string
  current_value?: number
  purchase_price?: number
  appreciation_rate?: number
}

interface NetWorthData {
  total_assets: number
  total_liabilities: number
  net_worth: number
  debt_ratio?: number
}

interface AllocationItem {
  name: string
  percentage: number
  color: string
}

interface InvestmentData {
  risk_score: number
  risk_profile: string
  allocations: AllocationItem[]
  investable_surplus?: number
  recommended_sip?: number
  required_sip_for_goal?: number
  goal_amount?: number
  goal_projection?: {
    projected_value_5yr?: number
    projected_value_10yr?: number
    projected_value_20yr?: number
    monthly_sip?: number
    expected_return_pct?: number
  }
  payout_date?: string
  is_debt_heavy?: boolean
}

// ── Static demo chart data (used when API hasn't returned real data yet) ─────

const DEMO_NET_WORTH = [
  { month: "May", value: 3600000 }, { month: "Jun", value: 3720000 },
  { month: "Jul", value: 3810000 }, { month: "Aug", value: 3780000 },
  { month: "Sep", value: 3950000 }, { month: "Oct", value: 3880000 },
  { month: "Nov", value: 4010000 }, { month: "Dec", value: 4120000 },
  { month: "Jan", value: 4190000 }, { month: "Feb", value: 4240000 },
  { month: "Mar", value: 4260000 }, { month: "Apr", value: 4280000 },
]

const DEMO_INCOME_EXPENSE = [
  { month: "Nov", income: 120000, expenses: 71000 },
  { month: "Dec", income: 120000, expenses: 78000 },
  { month: "Jan", income: 120000, expenses: 65000 },
  { month: "Feb", income: 120000, expenses: 69000 },
  { month: "Mar", income: 120000, expenses: 72000 },
  { month: "Apr", income: 120000, expenses: 68400 },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const ASSET_ICONS: Record<string, React.ElementType> = {
  real_estate: Home, vehicle: Car, gold: CircleDollarSign,
  equity: TrendingUp, fd: Wallet, gadget: Smartphone, other: Building2,
}

const ASSET_COLORS: Record<string, string> = {
  real_estate: "#22C55E", vehicle: "#3B82F6", gold: "#F59E0B",
  equity: "#10B981", fd: "#8B5CF6", gadget: "#64748B", other: "#94A3B8",
}

const LOAN_LABELS: Record<string, string> = {
  home_loan: "Home Loan", car_loan: "Car Loan", personal_loan: "Personal Loan",
  education_loan: "Education Loan", credit_card: "Credit Card",
  business_loan: "Business Loan", gold_loan: "Gold Loan", other: "Other",
}

function sumObj(obj?: Record<string, number>): number {
  if (!obj) return 0
  return Object.values(obj).reduce((a, b) => a + (b ?? 0), 0)
}

function safeFmt(val: number | null | undefined, formatter: (n: number) => string): string {
  return val != null ? formatter(val) : "—"
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TrendBadge({ change, invert = false }: { change?: number | null; invert?: boolean }) {
  if (change == null) return null
  const isGood = invert ? change < 0 : change > 0
  const isFlat = change === 0
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-xs font-medium",
      isFlat ? "text-muted-foreground" : isGood ? "text-emerald-600" : "text-red-500"
    )}>
      {isFlat ? <span>→</span> : isGood
        ? <TrendingUp className="w-3 h-3" />
        : <TrendingDown className="w-3 h-3" />}
      {Math.abs(change).toFixed(1)}%
      <span className="text-muted-foreground font-normal">vs last mo</span>
    </span>
  )
}

function StatCard({
  title, value, change, invertTrend, icon: Icon, iconClass, className,
}: {
  title: string; value: string; change?: number | null
  invertTrend?: boolean; icon?: React.ElementType; iconClass?: string; className?: string
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold tracking-tight truncate">{value}</p>
            <TrendBadge change={change} invert={invertTrend} />
          </div>
          {Icon && (
            <div className={cn("p-2.5 rounded-xl shrink-0", iconClass ?? "bg-primary/10 text-primary")}>
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">{children}</h2>
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const { formatCurrency, formatCompactCurrency } = useCurrency()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [budget, setBudget] = useState<BudgetData | null>(null)
  const [loans, setLoans] = useState<LoanData[]>([])
  const [assets, setAssets] = useState<AssetData[]>([])
  const [nw, setNw] = useState<NetWorthData | null>(null)
  const [investment, setInvestment] = useState<InvestmentData | null>(null)
  const [actualExpenses, setActualExpenses] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    const token = getToken()
    if (!token) { setLoading(false); return }

    const headers = { Authorization: `Bearer ${token}` }

    const now = new Date()
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`

    const [profRes, budRes, loansRes, assetsRes, nwRes, invRes, expRes] = await Promise.allSettled([
      fetch(`${API_BASE_URL}/v1/profile/me`, { headers }),
      fetchWithAuth("/api/budget/latest"),
      fetchWithAuth("/api/loans"),
      fetchWithAuth("/api/assets/all"),
      fetchWithAuth("/api/assets/networth"),
      fetchWithAuth("/api/investments/latest"),
      fetchWithAuth(`/api/expenses/${monthYear}`),
    ])

    if (profRes.status === "fulfilled" && profRes.value.ok)
      setProfile(await profRes.value.json())
    if (budRes.status === "fulfilled" && budRes.value.ok)
      setBudget(await budRes.value.json())
    if (loansRes.status === "fulfilled" && loansRes.value.ok) {
      const d = await loansRes.value.json()
      setLoans(d.loans ?? d ?? [])
    }
    if (assetsRes.status === "fulfilled" && assetsRes.value.ok) {
      const d = await assetsRes.value.json()
      setAssets(d.assets ?? [])
    }
    if (nwRes.status === "fulfilled" && nwRes.value.ok)
      setNw(await nwRes.value.json())
    if (invRes.status === "fulfilled" && invRes.value.ok)
      setInvestment(await invRes.value.json())
    if (expRes.status === "fulfilled" && expRes.value.ok) {
      const d = await expRes.value.json()
      const total = d?.summary?.total ?? null
      if (total != null) setActualExpenses(total)
    }

    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Derived values ─────────────────────────────────────────────────────────

  const userName = profile?.full_name?.split(" ")[0] ?? "there"
  const monthlyIncome = profile?.monthly_income ?? null

  const totalLoansOutstanding = loans.length > 0
    ? loans.reduce((s, l) => s + Number(l.principal_outstanding), 0)
    : null
  const totalMonthlyEmi = loans.reduce((s, l) => s + Number(l.emi_amount), 0)

  const needsTotal = sumObj(budget?.needs)
  const wantsTotal = sumObj(budget?.wants)
  const investTotal = sumObj(budget?.investments)
  const emergencyTotal = budget?.emergency ?? 0
  const repayTotal = sumObj(budget?.repayment)
  const budgetGrandTotal = needsTotal + wantsTotal + investTotal + emergencyTotal + repayTotal

  // Monthly expenses: actual tracked spend > budget total fallback
  const monthlyExpenses = actualExpenses ?? (budgetGrandTotal > 0 ? budgetGrandTotal : null)

  // Savings rate: (income - expenses) / income × 100; null if uncalculable or negative
  const savingsRate = (() => {
    if (!monthlyIncome || monthlyIncome <= 0 || monthlyExpenses == null) return null
    const rate = Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100)
    return rate > 0 ? rate : null
  })()

  // Net worth from the dedicated networth endpoint
  const netWorthVal = nw?.net_worth ?? null

  // Health score: computed from available signals (0–100)
  const healthScore = (() => {
    if (!nw && savingsRate == null) return null
    let score = 50
    if (savingsRate != null) {
      if (savingsRate >= 30) score += 25
      else if (savingsRate >= 20) score += 15
      else if (savingsRate >= 10) score += 5
      else score -= 15
    }
    if (nw) {
      const dr = nw.debt_ratio ?? 0
      if (dr < 20) score += 20
      else if (dr < 35) score += 10
      else if (dr < 50) score += 0
      else score -= 15
    }
    if ((investment?.allocations?.length ?? 0) > 0) score += 5
    return Math.min(100, Math.max(0, score))
  })()

  const budgetPieData = budgetGrandTotal > 0 ? [
    { name: "Needs", value: needsTotal, color: "#22C55E" },
    { name: "Wants", value: wantsTotal, color: "#3B82F6" },
    { name: "Investments", value: investTotal, color: "#10B981" },
    { name: "Repayments", value: repayTotal, color: "#EF4444" },
    { name: "Emergency", value: emergencyTotal, color: "#F59E0B" },
  ].filter(d => d.value > 0) : []

  const assetAllocationData = (() => {
    const map: Record<string, { name: string; value: number; color: string }> = {}
    for (const a of assets) {
      const v = Number(a.current_value ?? a.purchase_price ?? 0)
      if (!map[a.asset_type]) map[a.asset_type] = {
        name: a.asset_type.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()),
        value: 0,
        color: ASSET_COLORS[a.asset_type] ?? "#94A3B8",
      }
      map[a.asset_type].value += v
    }
    return Object.values(map).filter(d => d.value > 0)
  })()

  const topAssets = [...assets]
    .sort((a, b) => Number(b.current_value ?? 0) - Number(a.current_value ?? 0))
    .slice(0, 4)

  const netWorthChartData = DEMO_NET_WORTH as Array<{ month: string; value: number }>
  const incomeExpenseData = DEMO_INCOME_EXPENSE as Array<{ month: string; income: number; expenses: number }>

  const getHealthColor = (s: number | null) =>
    s == null ? "#94A3B8" : s >= 80 ? "#10B981" : s >= 60 ? "#F59E0B" : s >= 40 ? "#F97316" : "#EF4444"
  const getHealthLabel = (s: number | null) =>
    s == null ? "No data" : s >= 80 ? "Excellent" : s >= 60 ? "Good" : s >= 40 ? "Fair" : "Needs Work"

  const sipGap = investment?.required_sip_for_goal && investment?.recommended_sip
    ? investment.required_sip_for_goal - investment.recommended_sip
    : null

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading your financial snapshot…</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-8">

        {/* ── 1. Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Good morning,{" "}
              <span className="text-primary">{userName}</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Here&apos;s your financial snapshot for April 2026
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/budget")}>
              Generate Budget
            </Button>
            <Button size="sm" className="gap-2" onClick={() => router.push("/budget/chat")}>
              <Sparkles className="w-4 h-4" />
              AI Assistant
            </Button>
          </div>
        </div>

        {/* ── 2. Financial Health Banner ── */}
        <Card className="border-l-4 overflow-hidden" style={{ borderLeftColor: getHealthColor(healthScore) }}>
          <CardContent className="p-5">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">

              {/* Health score arc */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="relative w-20 h-20">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--secondary))" strokeWidth="7" />
                    <circle
                      cx="40" cy="40" r="34" fill="none" strokeWidth="7" strokeLinecap="round"
                      stroke={getHealthColor(healthScore)}
                      strokeDasharray={2 * Math.PI * 34}
                      strokeDashoffset={2 * Math.PI * 34 * (1 - (healthScore ?? 0) / 100)}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold leading-none" style={{ color: getHealthColor(healthScore) }}>
                      {healthScore ?? "—"}
                    </span>
                    {healthScore != null && (
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wide">/ 100</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Health Score</p>
                  <p className="text-lg font-bold" style={{ color: getHealthColor(healthScore) }}>
                    {getHealthLabel(healthScore)}
                  </p>
                </div>
              </div>

              <div className="h-px lg:h-12 lg:w-px bg-border" />

              {/* 4 mini stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                {[
                  { label: "Net Worth", value: safeFmt(netWorthVal, formatCompactCurrency), color: "text-primary" },
                  { label: "Monthly Income", value: safeFmt(monthlyIncome, formatCompactCurrency), color: "text-emerald-600" },
                  { label: "Monthly Expenses", value: safeFmt(monthlyExpenses, formatCompactCurrency), color: "text-blue-600" },
                  { label: "Savings Rate", value: savingsRate != null ? `${savingsRate}%` : "—", color: "text-amber-600" },
                ].map(item => (
                  <div key={item.label} className="space-y-0.5">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
                    <p className={cn("text-lg font-bold", item.color)}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Insight pill — debt-heavy warning */}
              {budget?.is_debt_heavy && (
                <>
                  <div className="h-px lg:h-12 lg:w-px bg-border hidden lg:block" />
                  <div className="rounded-lg border px-3 py-2 text-xs max-w-xs shrink-0 border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>EMI-to-income ratio is high — budget is in debt-heavy mode.</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── 3. Metrics Grid ── */}
        <div>
          <SectionTitle>Key Metrics</SectionTitle>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
            <StatCard title="Net Worth" value={safeFmt(netWorthVal, formatCompactCurrency)}
              icon={Scale} iconClass="bg-primary/10 text-primary" />
            <StatCard title="Monthly Income" value={safeFmt(monthlyIncome, formatCompactCurrency)}
              icon={TrendingUp} iconClass="bg-emerald-500/10 text-emerald-600" />
            <StatCard title="Monthly Expenses" value={safeFmt(monthlyExpenses, formatCompactCurrency)}
              icon={Receipt} iconClass="bg-blue-500/10 text-blue-600" />
            <StatCard title="Savings Rate" value={savingsRate != null ? `${savingsRate}%` : "—"}
              icon={PiggyBank} iconClass="bg-amber-500/10 text-amber-600" />
            <StatCard title="Loans Outstanding" value={safeFmt(totalLoansOutstanding, formatCompactCurrency)}
              icon={Landmark} iconClass="bg-red-500/10 text-red-600"
              className="col-span-2 lg:col-span-1" />
          </div>
        </div>

        {/* ── 4. Charts Row ── */}
        <div>
          <SectionTitle>Trends</SectionTitle>
          <div className="grid gap-6 lg:grid-cols-5">

            {/* Net Worth Area Chart — 3/5 */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">Net Worth Trend</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Last 12 months</p>
                  </div>
                  <span className="text-lg font-bold text-primary">
                    {safeFmt(netWorthVal, formatCompactCurrency)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={netWorthChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={v => formatCompactCurrency(v)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={52} />
                      <RechartsTooltip
                        formatter={(v: number) => [formatCurrency(v), "Net Worth"]}
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      />
                      <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2}
                        fill="url(#nwGrad)" dot={false}
                        activeDot={{ r: 5, fill: "#10B981", stroke: "hsl(var(--card))", strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Income vs Expenses Bar Chart — 2/5 */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <div>
                  <CardTitle className="text-base">Income vs Expenses</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Last 6 months</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={incomeExpenseData} barGap={2} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={v => formatCompactCurrency(v)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={48} />
                      <RechartsTooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null
                          return (
                            <div className="rounded-lg border border-border bg-card shadow-md px-3 py-2 text-xs">
                              <p className="font-semibold text-foreground mb-1.5">{label}</p>
                              {payload.map((entry) => (
                                <p key={String(entry.name)} className="flex items-center gap-2">
                                  <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: (entry as { fill?: string }).fill }} />
                                  <span className="text-muted-foreground">{entry.name === "income" ? "Income" : "Expenses"}:</span>
                                  <span className="font-medium text-foreground">{formatCurrency(Number(entry.value))}</span>
                                </p>
                              ))}
                            </div>
                          )
                        }}
                      />
                      <Legend iconType="circle" iconSize={8} formatter={v => v === "income" ? "Income" : "Expenses"} wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="income" />
                      <Bar dataKey="expenses" fill="#3B82F6" radius={[4, 4, 0, 0]} name="expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── 5. Budget & Spending ── */}
        {budgetGrandTotal > 0 && (
          <div>
            <SectionTitle>Budget — April 2026</SectionTitle>
            <div className="grid gap-6 lg:grid-cols-2">

              {/* Budget Allocation Donut */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Budget Allocation</CardTitle>
                    <Badge variant="secondary" className="gap-1 text-[11px]">
                      <Sparkles className="w-3 h-3 text-primary" />
                      AI Generated
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="h-[180px] w-[180px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={budgetPieData} cx="50%" cy="50%" innerRadius={52} outerRadius={78}
                            paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
                            {budgetPieData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(v: number) => [formatCurrency(v)]}
                            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Monthly Budget</p>
                      <p className="text-xl font-bold text-primary">{formatCompactCurrency(budgetGrandTotal)}</p>
                      <div className="space-y-1.5 mt-2">
                        {budgetPieData.map(item => (
                          <div key={item.name} className="flex items-center justify-between text-sm gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                              <span className="text-muted-foreground truncate text-xs">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-medium">{formatCompactCurrency(item.value)}</span>
                              <span className="text-[10px] text-muted-foreground w-8 text-right">
                                {((item.value / budgetGrandTotal) * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Budget vs Actual Bars */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Budget vs Actual</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Needs", budget: needsTotal, color: "#22C55E", spent: monthlyExpenses ? monthlyExpenses * 0.60 : needsTotal * 0.9 },
                    { label: "Wants", budget: wantsTotal, color: "#3B82F6", spent: wantsTotal * 0.75 },
                    { label: "Investments", budget: investTotal, color: "#10B981", spent: investTotal },
                    { label: "Repayments", budget: repayTotal, color: "#EF4444", spent: totalMonthlyEmi || repayTotal },
                    { label: "Emergency", budget: emergencyTotal, color: "#F59E0B", spent: 0 },
                  ].filter(r => r.budget > 0).map(row => {
                    const pct = row.budget > 0 ? Math.min((row.spent / row.budget) * 100, 100) : 0
                    const over = row.spent > row.budget
                    return (
                      <div key={row.label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                            <span className="font-medium">{row.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{formatCompactCurrency(row.budget)}</span>
                            <span className={cn("font-semibold tabular-nums", over ? "text-red-500" : "text-foreground")}>
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: over ? "#EF4444" : row.color }} />
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── 6. Assets & Loans ── */}
        <div>
          <SectionTitle>Assets &amp; Loans</SectionTitle>
          <div className="grid gap-6 lg:grid-cols-3">

            {/* Asset Allocation Donut */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Asset Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {assetAllocationData.length > 0 ? (
                  <>
                    <div className="h-[160px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={assetAllocationData} cx="50%" cy="50%" innerRadius={44} outerRadius={68}
                            paddingAngle={2} dataKey="value">
                            {assetAllocationData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(v: number) => [formatCurrency(v)]}
                            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      {assetAllocationData.map(item => (
                        <div key={item.name} className="flex items-center gap-1.5 text-xs">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                          <span className="text-muted-foreground truncate">{item.name}</span>
                        </div>
                      ))}
                    </div>
                    {nw && (
                      <div className="mt-3 pt-3 border-t flex justify-between text-xs">
                        <span className="text-muted-foreground">Total Assets</span>
                        <span className="font-bold text-primary">{formatCompactCurrency(nw.total_assets)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                    No assets yet.{" "}
                    <Link href="/assets" className="ml-1 text-primary underline-offset-4 hover:underline">Add one →</Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Assets List */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Top Assets</CardTitle>
                  <Link href="/assets" className="text-xs text-primary flex items-center gap-0.5 hover:underline underline-offset-2">
                    View all <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {topAssets.length > 0 ? (
                  <div className="space-y-3">
                    {topAssets.map(asset => {
                      const Icon = ASSET_ICONS[asset.asset_type] ?? Building2
                      const cv = Number(asset.current_value ?? asset.purchase_price ?? 0)
                      const pp = Number(asset.purchase_price ?? 0)
                      const gainPct = pp > 0 ? ((cv - pp) / pp) * 100 : 0
                      const isUp = gainPct >= 0
                      return (
                        <div key={asset.id} className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-secondary shrink-0">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{asset.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{asset.asset_type.replace("_", " ")}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold">{formatCompactCurrency(cv)}</p>
                            <p className={cn("text-xs flex items-center justify-end gap-0.5", isUp ? "text-emerald-600" : "text-red-500")}>
                              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {isUp ? "+" : ""}{gainPct.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                    No assets tracked yet.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Loans */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Active Loans</CardTitle>
                  <Link href="/loans" className="text-xs text-primary flex items-center gap-0.5 hover:underline underline-offset-2">
                    View all <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {loans.length > 0 ? (
                  <div className="space-y-3">
                    {loans.slice(0, 3).map(loan => (
                      <div key={loan.id} className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {LOAN_LABELS[loan.loan_type] ?? loan.loan_type}
                            </p>
                            {loan.lender && <p className="text-xs text-muted-foreground">{loan.lender}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-red-500">{formatCompactCurrency(loan.principal_outstanding)}</p>
                            <p className="text-[11px] text-muted-foreground">EMI {formatCompactCurrency(loan.emi_amount)}</p>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{loan.emis_remaining} EMIs · {loan.interest_rate}% p.a.</p>
                      </div>
                    ))}
                    <div className="mt-1 pt-3 border-t rounded-lg bg-primary/5 border border-primary/20 p-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                        <p className="text-xs text-foreground font-medium">Optimization available</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 ml-5">Switch to avalanche strategy to save on interest</p>
                      <Link href="/loans" className="text-[11px] text-primary flex items-center gap-0.5 mt-1.5 ml-5 hover:underline underline-offset-2">
                        View optimization <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                    No active loans.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── 7. Investment Strategy + Net Worth Summary ── */}
        <div>
          <SectionTitle>Investment &amp; Net Worth</SectionTitle>
          <div className="grid gap-6 lg:grid-cols-2">

            {/* Investment Strategy */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">Investment Strategy</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">AI-generated based on your profile</p>
                  </div>
                  <Link href="/investments">
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2 gap-1">
                      View <ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {investment ? (
                  <>
                    {/* Risk profile */}
                    <div className="flex items-center gap-3">
                      <Badge className={cn("capitalize text-xs",
                        investment.risk_profile === "conservative" ? "bg-blue-100 text-blue-700 border-blue-200" :
                        investment.risk_profile === "moderate" ? "bg-amber-100 text-amber-700 border-amber-200" :
                        "bg-red-100 text-red-700 border-red-200"
                      )}>
                        {investment.risk_profile}
                      </Badge>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Risk Score</span><span>{investment.risk_score}/100</span>
                        </div>
                        <Progress value={investment.risk_score} className="h-1.5" />
                      </div>
                    </div>

                    {/* Allocations */}
                    <div className="space-y-2">
                      {(investment.allocations ?? []).slice(0, 5).map(alloc => (
                        <div key={alloc.name} className="space-y-0.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium">{alloc.name}</span>
                            <span className="text-muted-foreground">{alloc.percentage}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${alloc.percentage}%`, background: alloc.color ?? "#10B981" }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Goal projection */}
                    {investment.goal_amount && (
                      <div className="rounded-lg bg-secondary/60 p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <Target className="w-3.5 h-3.5 text-primary" />
                          Goal: {formatCompactCurrency(investment.goal_amount)}
                          {investment.payout_date && ` by ${new Date(investment.payout_date).getFullYear()}`}
                        </div>
                        {investment.goal_projection && (
                          <div className="grid grid-cols-3 gap-2 text-center">
                            {[
                              { label: "5 yr", val: investment.goal_projection.projected_value_5yr },
                              { label: "10 yr", val: investment.goal_projection.projected_value_10yr },
                              { label: "20 yr", val: investment.goal_projection.projected_value_20yr },
                            ].map(p => (
                              <div key={p.label} className="rounded bg-background/60 p-2">
                                <p className="text-[10px] text-muted-foreground">{p.label}</p>
                                <p className="text-xs font-bold text-primary">{p.val ? formatCompactCurrency(p.val) : "—"}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {sipGap != null && sipGap > 0 && (
                          <p className="text-[11px] text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {formatCompactCurrency(sipGap)}/mo short of your goal
                          </p>
                        )}
                        {sipGap != null && sipGap <= 0 && (
                          <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            On track to reach your goal
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 gap-3 text-center">
                    <p className="text-sm text-muted-foreground">No investment strategy yet.</p>
                    <Button size="sm" variant="outline" onClick={() => router.push("/investments")}>
                      Set Up Strategy
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Net Worth Summary */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">Net Worth Summary</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Assets minus liabilities</p>
                  </div>
                  <Link href="/assets">
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2 gap-1">
                      View <ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {nw ? (
                  <>
                    <div className="text-center py-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Net Worth</p>
                      <p className="text-4xl font-bold text-primary">{formatCompactCurrency(nw.net_worth)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 text-center">
                        <p className="text-[11px] text-emerald-600 font-medium uppercase tracking-wide">Total Assets</p>
                        <p className="text-xl font-bold text-emerald-700">{formatCompactCurrency(nw.total_assets)}</p>
                      </div>
                      <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 text-center">
                        <p className="text-[11px] text-red-600 font-medium uppercase tracking-wide">Total Liabilities</p>
                        <p className="text-xl font-bold text-red-700">{formatCompactCurrency(nw.total_liabilities)}</p>
                      </div>
                    </div>
                    {nw.debt_ratio != null && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Debt Ratio</span>
                          <span className={cn("font-semibold", nw.debt_ratio > 50 ? "text-red-500" : nw.debt_ratio > 30 ? "text-amber-600" : "text-emerald-600")}>
                            {nw.debt_ratio.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(nw.debt_ratio, 100)}%`, background: nw.debt_ratio > 50 ? "#EF4444" : nw.debt_ratio > 30 ? "#F59E0B" : "#10B981" }} />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {nw.debt_ratio < 30 ? "Healthy debt ratio — you're in great shape" : nw.debt_ratio < 50 ? "Moderate debt — keep reducing liabilities" : "High debt ratio — focus on repayments"}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
                    <p className="text-sm text-muted-foreground">No asset data yet.</p>
                    <Button size="sm" variant="outline" onClick={() => router.push("/assets")}>
                      Add Assets
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── 8. Budget Insights ── */}
        {budget?.insights && budget.insights.length > 0 && (
          <div>
            <SectionTitle>Budget Insights</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {budget.insights.slice(0, 3).map((msg, i) => (
                <div key={i} className="rounded-lg border border-l-4 border-l-primary bg-primary/5 p-4 flex gap-3">
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                  <p className="text-sm text-foreground/80 leading-snug">{msg}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
