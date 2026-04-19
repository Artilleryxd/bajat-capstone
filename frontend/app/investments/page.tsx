"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { InvestmentAllocationChart } from "@/components/dashboard/investment-allocation-chart"
import { RiskIndicator } from "@/components/dashboard/risk-indicator"
import { MetricCard } from "@/components/dashboard/metric-card"
import {
  Sparkles,
  TrendingUp,
  PiggyBank,
  Target,
  Clock,
  AlertTriangle,
  RefreshCw,
  Edit2,
  X,
  Info,
  RotateCcw,
  Loader2,
} from "lucide-react"
import { useCurrency } from "@/lib/hooks/useCurrency"
import { fetchWithAuth, getToken } from "@/lib/auth"
import type {
  InvestmentStrategyResponse,
  GenerateStrategyRequest,
  ProfileOverrides,
} from "@/lib/types/investment"

// ── helpers ──────────────────────────────────────────────────────────────────

const TIME_HORIZON_LABELS: Record<string, string> = {
  short: "Short-term (1–3 yrs)",
  medium: "Medium-term (3–7 yrs)",
  long: "Long-term (7–15 yrs)",
  retirement: "Retirement (15+ yrs)",
}

const EXP_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
}

function getExpectedReturn(score: number): { min: number; max: number } {
  if (score < 35) return { min: 5, max: 8 }
  if (score < 65) return { min: 8, max: 12 }
  return { min: 10, max: 16 }
}

// ── sub-components ────────────────────────────────────────────────────────────

function OverrideBanner({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
      <div className="flex items-center gap-2 text-warning-foreground">
        <Info className="h-4 w-4 shrink-0" />
        <span>
          You are viewing a <strong>simulated strategy</strong> based on modified profile values.
          These changes are <strong>not saved</strong> to your profile.
        </span>
      </div>
      <Button variant="outline" size="sm" onClick={onReset} className="shrink-0">
        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
        Reset
      </Button>
    </div>
  )
}

function DebtWarningCard({ message }: { message: string }) {
  const router = useRouter()
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="py-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-semibold text-destructive">Prioritise Loan Closure First</p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{message}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-1 border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => router.push("/loans")}
            >
              Review My Loan Strategy
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

type PageState = "loading" | "first_time" | "loaded"

export default function InvestmentsPage() {
  const { formatCurrency, currencySymbol } = useCurrency()
  const router = useRouter()

  const [pageState, setPageState] = useState<PageState>("loading")
  const [strategy, setStrategy] = useState<InvestmentStrategyResponse | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Profile overrides (temporary state)
  const [overrides, setOverrides] = useState<ProfileOverrides | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editIncome, setEditIncome] = useState("")
  const [editExp, setEditExp] = useState("")
  const [editHorizon, setEditHorizon] = useState("")

  // Goal / first-time setup form
  const [goalAmount, setGoalAmount] = useState("")
  const [portfolioValue, setPortfolioValue] = useState("")
  const [sipDate, setSipDate] = useState("1")
  const [payoutDate, setPayoutDate] = useState("")

  // ── fetch on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    fetchLatest()
  }, [])

  async function fetchLatest() {
    setPageState("loading")
    setError(null)
    try {
      const res = await fetchWithAuth("/api/investments/latest")
      if (res.status === 404) {
        setPageState("first_time")
        return
      }
      if (!res.ok) {
        setPageState("first_time")
        return
      }
      const data: InvestmentStrategyResponse = await res.json()
      setStrategy(data)
      setPageState("loaded")
      // Seed edit fields from loaded strategy
      setEditHorizon(data.time_horizon || "medium")
    } catch {
      setPageState("first_time")
    }
  }

  // ── generate strategy ───────────────────────────────────────────────────
  async function generate(opts: { withGoal?: boolean; withOverrides?: boolean } = {}) {
    setIsGenerating(true)
    setError(null)
    try {
      const token = getToken()
      const body: GenerateStrategyRequest = {}

      if (opts.withGoal) {
        if (!goalAmount || parseFloat(goalAmount) <= 0) {
          setError("Please enter a valid investment goal amount.")
          return
        }
        body.goal = {
          goal_amount: parseFloat(goalAmount),
          current_portfolio_value: parseFloat(portfolioValue) || 0,
          sip_date: parseInt(sipDate) || 1,
          payout_date: payoutDate || undefined,
        }
      } else if (strategy?.goal_amount) {
        // Keep existing goal data when regenerating
        body.goal = {
          goal_amount: strategy.goal_amount,
          current_portfolio_value: strategy.current_portfolio_value ?? 0,
          sip_date: strategy.sip_date ?? 1,
          payout_date: strategy.payout_date ?? undefined,
        }
      }

      if (opts.withOverrides && (editIncome || editExp || editHorizon)) {
        body.overrides = {
          monthly_income: editIncome ? parseFloat(editIncome) : undefined,
          investment_exp: editExp || undefined,
          time_horizon: editHorizon || undefined,
        }
        setOverrides(body.overrides)
      } else if (!opts.withOverrides) {
        setOverrides(null)
      }

      const res = await fetchWithAuth("/api/investments/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail?.message || "Failed to generate strategy")
      }

      const data: InvestmentStrategyResponse = await res.json()
      setStrategy(data)
      setPageState("loaded")
      setIsEditingProfile(false)
      if (!opts.withOverrides) setOverrides(null)
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  // ── reset overrides ─────────────────────────────────────────────────────
  async function resetOverrides() {
    setOverrides(null)
    setIsEditingProfile(false)
    await fetchLatest()
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────

  // ── Loading ─────────────────────────────────────────────────────────────
  if (pageState === "loading") {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  // ── First-time setup ────────────────────────────────────────────────────
  if (pageState === "first_time") {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Investment Strategy</h1>
            <p style={{ color: "rgba(255,255,255,0.7)" }} className="mt-1">
              Let's build a personalised strategy based on your financial profile.
            </p>
          </div>

          {error && (
            <div className="rounded-md border-l-4 border-l-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Set Your Investment Goal
              </CardTitle>
              <CardDescription>
                Your profile and loans are fetched automatically. Just tell us your goal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="goalAmount">Investment Goal Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {currencySymbol}
                    </span>
                    <Input
                      id="goalAmount"
                      type="number"
                      className="pl-7"
                      placeholder="5000000"
                      value={goalAmount}
                      onChange={(e) => setGoalAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portfolioValue">Current Portfolio Value</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {currencySymbol}
                    </span>
                    <Input
                      id="portfolioValue"
                      type="number"
                      className="pl-7"
                      placeholder="0"
                      value={portfolioValue}
                      onChange={(e) => setPortfolioValue(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sipDate">SIP Date (day of month)</Label>
                  <Input
                    id="sipDate"
                    type="number"
                    min={1}
                    max={28}
                    placeholder="1"
                    value={sipDate}
                    onChange={(e) => setSipDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payoutDate">Goal Target Date</Label>
                  <Input
                    id="payoutDate"
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={payoutDate}
                    onChange={(e) => setPayoutDate(e.target.value)}
                  />
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>When do you want to reach your investment goal?</p>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => generate({ withGoal: true })}
                disabled={isGenerating || !goalAmount}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {isGenerating ? "Generating Strategy…" : "Generate My Investment Strategy"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  // ── Loaded ──────────────────────────────────────────────────────────────
  const s = strategy!
  const riskLabel = s.risk_profile
  const expectedReturn = getExpectedReturn(s.risk_score)
  const isUsingOverrides = s.is_using_overrides

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Investment Strategy</h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
              AI-generated · based on your financial profile
              {s.created_at && (
                <span className="ml-2 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                  · Last updated {new Date(s.created_at).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
          <Button
            onClick={() => generate({})}
            disabled={isGenerating}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Regenerate
          </Button>
        </div>

        {/* Override banner */}
        {isUsingOverrides && <OverrideBanner onReset={resetOverrides} />}

        {/* Error */}
        {error && (
          <div className="rounded-md border-l-4 border-l-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Metric cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Monthly SIP"
            value={formatCurrency(s.recommended_sip ?? s.investable_surplus)}
            subtitle={s.recommended_sip != null ? "From your budget" : "Estimated surplus"}
            icon={PiggyBank}
            iconColor="bg-primary/10 text-primary"
          />
          <MetricCard
            title="Current Portfolio"
            value={formatCurrency(s.current_portfolio_value ?? 0)}
            icon={TrendingUp}
            iconColor="bg-success/10 text-success"
          />
          <MetricCard
            title="Investment Goal"
            value={formatCurrency(s.goal_amount ?? 0)}
            icon={Target}
            iconColor="bg-chart-3/10 text-chart-3"
          />
          <MetricCard
            title="Years to Goal"
            value={
              s.goal_projection?.years_to_goal
                ? `${s.goal_projection.years_to_goal} yrs`
                : "—"
            }
            icon={Clock}
            iconColor="bg-chart-2/10 text-chart-2"
          />
        </div>

        {/* SIP gap callout */}
        {(() => {
          const budgetSip = s.recommended_sip
          const requiredSip = s.required_sip_for_goal
          if (!budgetSip || !requiredSip || !s.goal_amount) return null
          const gap = requiredSip - budgetSip
          if (gap <= 0) {
            return (
              <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm">
                <TrendingUp className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <p className="text-success">
                  Your budget SIP of <strong>{formatCurrency(budgetSip)}/month</strong> is on track to reach your goal. Keep it up.
                </p>
              </div>
            )
          }
          return (
            <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
              <Info className="h-4 w-4 text-warning-foreground shrink-0 mt-0.5" />
              <p className="text-yellow-500">
                Your budget allocates <strong>{formatCurrency(budgetSip)}/month</strong> to investments, but you need{" "}
                <strong>{formatCurrency(requiredSip)}/month</strong> to reach your goal on time.{" "}
                You're <strong>{formatCurrency(gap)}/month short</strong> — see AI Insights below for suggestions.
              </p>
            </div>
          )
        })()}

        {/* Profile card + Risk card */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Investment Profile Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  Investment Profile
                  {isUsingOverrides && (
                    <Badge variant="outline" className="text-warning-foreground border-warning/40 bg-warning/10 text-xs">
                      Modified
                    </Badge>
                  )}
                </CardTitle>
                {!isEditingProfile ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditingProfile(true)
                      setEditHorizon(s.time_horizon || "medium")
                    }}
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingProfile(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {isEditingProfile && (
                <p className="text-xs pt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Changes are simulated only — not saved to your profile.
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditingProfile ? (
                /* Edit mode */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Monthly Income Override</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                        {currencySymbol}
                      </span>
                      <Input
                        type="number"
                        className="pl-7"
                        placeholder="Leave blank to use actual"
                        value={editIncome}
                        onChange={(e) => setEditIncome(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Investment Experience</Label>
                    <Select value={editExp} onValueChange={setEditExp}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Investment Time Horizon</Label>
                    <Select value={editHorizon} onValueChange={setEditHorizon}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time horizon" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short-term (1–3 yrs)</SelectItem>
                        <SelectItem value="medium">Medium-term (3–7 yrs)</SelectItem>
                        <SelectItem value="long">Long-term (7–15 yrs)</SelectItem>
                        <SelectItem value="retirement">Retirement (15+ yrs)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => generate({ withOverrides: true })}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Simulate with These Values
                  </Button>
                </div>
              ) : (
                /* View mode */
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt style={{ color: "rgba(255,255,255,0.65)" }}>Budget SIP</dt>
                    <dd className="font-semibold">{formatCurrency(s.recommended_sip ?? s.investable_surplus)}</dd>
                  </div>
                  {s.required_sip_for_goal != null && s.recommended_sip != null && s.required_sip_for_goal > s.recommended_sip && (
                    <div className="flex justify-between">
                      <dt style={{ color: "rgba(255,255,255,0.65)" }}>Required SIP</dt>
                      <dd className="font-semibold text-yellow-500">{formatCurrency(s.required_sip_for_goal)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt style={{ color: "rgba(255,255,255,0.65)" }}>Time Horizon</dt>
                    <dd className="font-semibold">
                      {TIME_HORIZON_LABELS[s.time_horizon || "medium"] || s.time_horizon || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt style={{ color: "rgba(255,255,255,0.65)" }}>SIP Date</dt>
                    <dd className="font-semibold">
                      {s.sip_date ? `${s.sip_date}${s.sip_date === 1 ? "st" : s.sip_date === 2 ? "nd" : s.sip_date === 3 ? "rd" : "th"} of month` : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt style={{ color: "rgba(255,255,255,0.65)" }}>Goal Target Date</dt>
                    <dd className="font-semibold">
                      {s.payout_date ? new Date(s.payout_date).toLocaleDateString("en-IN", { year: "numeric", month: "short" }) : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt style={{ color: "rgba(255,255,255,0.65)" }}>Expected Return</dt>
                    <dd className="font-semibold">
                      {s.estimated_annual_return ? `~${s.estimated_annual_return}% p.a.` : "—"}
                    </dd>
                  </div>
                  {s.is_debt_heavy && (
                    <div className="flex justify-between">
                      <dt style={{ color: "rgba(255,255,255,0.65)" }}>Debt Burden</dt>
                      <dd className="font-semibold text-destructive">High — pay loans first</dd>
                    </div>
                  )}
                </dl>
              )}
            </CardContent>
          </Card>

          {/* Risk Profile Card */}
          <RiskIndicator
            level={riskLabel}
            expectedReturn={expectedReturn}
            score={s.risk_score}
          />
        </div>

        {/* Debt warning */}
        {s.is_debt_heavy && s.debt_warning && (
          <DebtWarningCard message={s.debt_warning} />
        )}

        {/* Allocation Chart */}
        {s.allocations.length > 0 && (
          <InvestmentAllocationChart
            data={s.allocations}
            title="Recommended Portfolio Allocation"
          />
        )}

        {/* Goal Projection */}
        {s.goal_projection && s.goal_amount && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Goal Projection
              </CardTitle>
              <CardDescription>
                Based on {formatCurrency(s.recommended_sip ?? s.investable_surplus)}/month SIP at ~{s.estimated_annual_return ?? s.goal_projection.expected_return_pct}% p.a.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "5-Year Value", value: s.goal_projection.projected_value_5yr },
                  { label: "10-Year Value", value: s.goal_projection.projected_value_10yr },
                  { label: "20-Year Value", value: s.goal_projection.projected_value_20yr },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg bg-secondary p-4">
                    <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.65)" }}>{label}</p>
                    <p className="text-xl font-bold">{formatCurrency(value)}</p>
                  </div>
                ))}
              </div>

              {s.goal_projection.years_to_goal ? (
                <div className="mt-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm">
                  <span className="font-medium text-success">
                    At this pace, you can reach your goal of {formatCurrency(s.goal_amount)} in{" "}
                    <strong>{s.goal_projection.years_to_goal} years</strong>.
                  </span>
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
                  Goal may not be reachable within 40 years at the current SIP and return rate.
                  Consider increasing your monthly investment or adjusting your goal.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* AI Insights */}
        {s.ai_insights && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm leading-relaxed space-y-3" style={{ color: "rgba(255,255,255,0.75)" }}>
                {s.ai_insights
                  .split(/\n\n+/)
                  .filter(Boolean)
                  .map((paragraph, i) => (
                    <p key={i}>{paragraph.trim()}</p>
                  ))}
              </div>
              <p className="mt-4 text-xs border-t pt-3" style={{ color: "rgba(255,255,255,0.5)" }}>
                This is for educational purposes only and does not constitute financial advice.
                Consult a SEBI-registered financial advisor before making investment decisions.
              </p>
            </CardContent>
          </Card>
        )}

      </div>
    </DashboardLayout>
  )
}
