"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Home,
  ShoppingBag,
  TrendingUp,
  Shield,
  CreditCard,
  Sparkles,
  Loader2,
  Pencil,
  Lock,
  Info,
  AlertTriangle,
} from "lucide-react"

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
import { BudgetChart } from "@/components/BudgetChart"
import { BudgetCard } from "@/components/dashboard/budget-cards"
import { AIInsights } from "@/components/AIInsights"
import { useCurrency } from "@/lib/hooks/useCurrency"
import { getToken, fetchWithAuth } from "@/lib/auth"
import type { BudgetOutput, SpendingSummary } from "@/lib/types/budget"

interface UserProfile {
  id: string
  monthly_income: number | null
  city: string | null
  neighbourhood: string | null
  housing_status: string | null
  marital_status: string | null
  num_dependents: number | null
  income_type: string | null
}

interface BudgetGenerateOverrides {
  income?: number
  location?: string
  dependents?: number
  housing_status?: string
  marital_status?: "single" | "married"
  occupation?: string
}

const CHART_COLORS = {
  needs: "hsl(142, 71%, 45%)",
  wants: "hsl(217, 91%, 60%)",
  investments: "hsl(262, 83%, 58%)",
  emergency: "hsl(47, 96%, 53%)",
  repayment: "hsl(0, 72%, 51%)",
}

function sumDict(dict: Record<string, number | undefined> | number | undefined): number {
  if (typeof dict === "number") return dict
  if (!dict || typeof dict !== "object") return 0
  return Object.values(dict).reduce((acc: number, v) => acc + (v ?? 0), 0)
}


export default function BudgetPage() {
  const router = useRouter()
  const { formatCurrency } = useCurrency()

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileOverrides, setProfileOverrides] = useState<Partial<UserProfile>>({})
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Edit mode
  const [editing, setEditing] = useState(false)
  const [editIncome, setEditIncome] = useState("")
  const [editCity, setEditCity] = useState("")
  const [editNeighbourhood, setEditNeighbourhood] = useState("")
  const [editHousing, setEditHousing] = useState("")
  const [editMarital, setEditMarital] = useState("")
  const [editDependents, setEditDependents] = useState("")
  const [editIncomeType, setEditIncomeType] = useState("")

  // Budget state
  const [budget, setBudget] = useState<BudgetOutput | null>(null)

  // Spending summary (for hover tooltips)
  const [spendingSummary, setSpendingSummary] = useState<SpendingSummary | null>(null)
  const [generating, setGenerating] = useState(false)
  const [loadingLatest, setLoadingLatest] = useState(true)


  const effectiveProfile: UserProfile | null = profile
    ? {
        ...profile,
        ...profileOverrides,
      }
    : null
  const hasTemporaryOverrides = Object.keys(profileOverrides).length > 0

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    try {
      const token = getToken()
      if (!token) { router.push("/login"); return }
      const res = await fetchWithAuth("/api/profile/me")
      if (res.status === 401) { router.push("/login"); return }
      if (res.status === 404) { router.push("/onboarding"); return }
      if (!res.ok) throw new Error("Failed to fetch profile")
      setProfile(await res.json())
    } catch {
      toast.error("Could not load your profile")
    } finally {
      setLoadingProfile(false)
    }
  }, [router])

  // Fetch spending summary
  const fetchSpendingSummary = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/budget/spending-summary")
      if (!res.ok) return
      const data = await res.json()
      const rawSummary = data.summary ?? null
      if (!rawSummary) {
        setSpendingSummary(null)
        return
      }

      const normalizedSummary: SpendingSummary = {
        needs: Number(rawSummary.needs ?? 0),
        // Wants on donut should include both wants + desires from expenses table.
        wants: Number(rawSummary.wants ?? 0) + Number(rawSummary.desires ?? 0),
        investments: Number(rawSummary.investments ?? rawSummary.investment ?? 0),
        repayment: Number(rawSummary.repayment ?? rawSummary.repayments ?? 0),
        emergency: Number(rawSummary.emergency ?? 0),
      }

      setSpendingSummary(normalizedSummary)
    } catch {
      // silently ignore
    }
  }, [])

  // Fetch latest saved budget
  const fetchLatestBudget = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/budget/latest")
      if (res.status === 404) return
      if (!res.ok) throw new Error("Failed to fetch budget")
      const data: BudgetOutput = await res.json()
      setBudget(data)
    } catch {
      // silently ignore
    } finally {
      setLoadingLatest(false)
    }
  }, [])


  useEffect(() => {
    fetchProfile()
    fetchLatestBudget()
    fetchSpendingSummary()
  }, [fetchProfile, fetchLatestBudget, fetchSpendingSummary])

  // Edit mode handlers
  const enterEditMode = () => {
    if (!effectiveProfile) return
    const marital = (effectiveProfile.marital_status || "").toLowerCase()
    setEditIncome(effectiveProfile.monthly_income?.toString() ?? "")
    setEditCity(effectiveProfile.city ?? "")
    setEditNeighbourhood(effectiveProfile.neighbourhood ?? "")
    setEditHousing(effectiveProfile.housing_status ?? "")
    setEditMarital(marital === "single" || marital === "married" ? marital : "")
    setEditDependents(effectiveProfile.num_dependents?.toString() ?? "0")
    setEditIncomeType(effectiveProfile.income_type ?? "")
    setEditing(true)
  }

  const applyTemporaryOverrides = () => {
    const parsedIncome = editIncome.trim() ? Number(editIncome) : null
    const parsedDependents = editDependents.trim() ? Number(editDependents) : 0

    const normalizedMarital = editMarital.toLowerCase()

    setProfileOverrides({
      monthly_income: Number.isFinite(parsedIncome) && parsedIncome && parsedIncome > 0 ? parsedIncome : null,
      city: editCity.trim() || null,
      neighbourhood: editNeighbourhood.trim() || null,
      housing_status: editHousing.trim() || null,
      marital_status: normalizedMarital === "single" || normalizedMarital === "married" ? normalizedMarital : null,
      num_dependents: Number.isFinite(parsedDependents) && parsedDependents >= 0 ? parsedDependents : 0,
      income_type: editIncomeType.trim() || null,
    })

    setEditing(false)
    toast.info("Profile overrides locked temporarily for this session")
  }

  const buildGenerateOverrides = (): BudgetGenerateOverrides => {
    const source = editing
      ? {
          monthly_income: editIncome.trim() ? Number(editIncome) : null,
          city: editCity.trim() || null,
          neighbourhood: editNeighbourhood.trim() || null,
          housing_status: editHousing.trim() || null,
          marital_status: editMarital.trim() || null,
          num_dependents: editDependents.trim() ? Number(editDependents) : 0,
          income_type: editIncomeType.trim() || null,
        }
      : effectiveProfile

    if (!source) return {}

    const locationParts = [source.neighbourhood, source.city].filter((part) => !!part && part.trim().length > 0)
    const location = locationParts.join(", ")

    const maritalCandidate = (source.marital_status || "").toLowerCase()
    const maritalStatus = maritalCandidate === "single" || maritalCandidate === "married" ? maritalCandidate : undefined

    const income = source.monthly_income
    const dependents = source.num_dependents

    return {
      income: typeof income === "number" && income > 0 ? income : undefined,
      location: location || undefined,
      dependents: typeof dependents === "number" && dependents >= 0 ? dependents : undefined,
      housing_status: source.housing_status || undefined,
      marital_status: maritalStatus,
      occupation: source.income_type || undefined,
    }
  }

  // Generate budget
  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetchWithAuth("/api/budget/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildGenerateOverrides()),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail?.message || "Failed to generate budget")
      }
      const data: BudgetOutput = await res.json()
      setBudget(data)
      toast.success("Budget generated and saved!")
      // Refresh spending summary
      fetchSpendingSummary()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Budget generation failed"
      toast.error(message)
    } finally {
      setGenerating(false)
    }
  }

  // Build 5-section chart data
  const needsTotal = budget ? sumDict(budget.needs) : 0
  const wantsTotal = budget ? sumDict(budget.wants) : 0
  const investmentsTotal = budget ? sumDict(budget.investments) : 0
  const emergencyTotal = budget?.emergency ?? 0
  const repaymentTotal = budget ? sumDict(budget.repayment) : 0

  const chartData = budget
    ? [
        { name: "Needs", value: needsTotal, color: CHART_COLORS.needs, sectionKey: "needs" as const },
        { name: "Wants", value: wantsTotal, color: CHART_COLORS.wants, sectionKey: "wants" as const },
        { name: "Investments", value: investmentsTotal, color: CHART_COLORS.investments, sectionKey: "investments" as const },
        { name: "Emergency", value: emergencyTotal, color: CHART_COLORS.emergency, sectionKey: "emergency" as const },
        { name: "Repayment", value: repaymentTotal, color: CHART_COLORS.repayment, sectionKey: "repayment" as const },
      ]
    : []

  const totalBudget = needsTotal + wantsTotal + investmentsTotal + emergencyTotal + repaymentTotal
  const pct = (value: number) => (totalBudget > 0 ? Math.round((value / totalBudget) * 100) : 0)

  const isLoading = loadingProfile || loadingLatest

  // Section configs for summary cards
  const sectionCards = budget
    ? [
        {
          title: "Needs",
          amount: needsTotal,
          icon: Home,
          color: CHART_COLORS.needs,
          description: "Rent, groceries, commute, bills",
        },
        {
          title: "Wants",
          amount: wantsTotal,
          icon: ShoppingBag,
          color: CHART_COLORS.wants,
          description: "Dining, entertainment, shopping",
        },
        {
          title: "Investments",
          amount: investmentsTotal,
          icon: TrendingUp,
          color: CHART_COLORS.investments,
          description: "Mutual funds, PPF, stocks",
        },
        {
          title: "Emergency",
          amount: emergencyTotal,
          icon: Shield,
          color: CHART_COLORS.emergency,
          description: "Rainy day savings",
        },
        {
          title: "Repayment",
          amount: repaymentTotal,
          icon: CreditCard,
          color: CHART_COLORS.repayment,
          description: "Loan EMIs",
        },
      ].filter((c) => c.amount > 0)
    : []

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Smart Budget Planner</h1>
            <p className="text-muted-foreground text-sm">AI-powered personalized budget based on your profile</p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1">
            <Button onClick={handleGenerate} disabled={generating || isLoading}>
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {generating ? "Generating…" : "Generate Budget"}
            </Button>
            {hasTemporaryOverrides && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                Using temporary profile overrides
              </p>
            )}
          </div>
        </div>

        {/* ── Profile Card — horizontal ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Your Profile</CardTitle>
                <CardDescription className="text-xs">
                  {editing ? "Edit values then re-generate" : "Pre-filled from your account"}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={editing ? applyTemporaryOverrides : enterEditMode}
                disabled={loadingProfile || !effectiveProfile}
                className="gap-1.5 h-8"
              >
                {editing ? <><Lock className="w-3.5 h-3.5" />Lock</> : <><Pencil className="w-3.5 h-3.5" />Edit</>}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingProfile ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : editing ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Monthly Income</Label>
                  <Input type="number" min="1" value={editIncome} onChange={e => setEditIncome(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">City</Label>
                  <Input value={editCity} onChange={e => setEditCity(e.target.value)} placeholder="e.g. Mumbai" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Neighbourhood</Label>
                  <Input value={editNeighbourhood} onChange={e => setEditNeighbourhood(e.target.value)} placeholder="e.g. Kharghar" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Housing Status</Label>
                  <Select value={editHousing} onValueChange={setEditHousing}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rented">Rented</SelectItem>
                      <SelectItem value="owned">Owned</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Marital Status</Label>
                  <Select value={editMarital} onValueChange={setEditMarital}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Dependents</Label>
                  <Input type="number" min="0" value={editDependents} onChange={e => setEditDependents(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Occupation</Label>
                  <Input value={editIncomeType} onChange={e => setEditIncomeType(e.target.value)} placeholder="e.g. Software Engineer" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-6 gap-y-3">
                {[
                  { label: "Monthly Income", value: effectiveProfile?.monthly_income ? formatCurrency(effectiveProfile.monthly_income) : "Not set" },
                  { label: "City", value: effectiveProfile?.city || "Not set" },
                  { label: "Neighbourhood", value: effectiveProfile?.neighbourhood || "Not set" },
                  { label: "Housing", value: effectiveProfile?.housing_status || "Not set" },
                  { label: "Marital Status", value: effectiveProfile?.marital_status || "Not set" },
                  { label: "Dependents", value: String(effectiveProfile?.num_dependents ?? 0) },
                  { label: "Occupation", value: effectiveProfile?.income_type || "Not set" },
                ].map(({ label, value }) => (
                  <div key={label} className="min-w-0">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="text-sm font-medium capitalize truncate">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Budget content ── */}
        {budget ? (
          <div className="space-y-6">
            {/* Debt-heavy warning */}
            {budget.is_debt_heavy && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive text-sm">High Loan Burden Detected</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your EMIs consume 40%+ of your income. Investments and emergency savings have been paused — focus on clearing your loans first.
                  </p>
                </div>
              </div>
            )}

            {/* Donut chart (left) + Category cards (right) */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left — donut chart */}
              <BudgetChart data={chartData} spendingSummary={spendingSummary} />

              {/* Right — category cards in 2×2 grid */}
              <div className="grid grid-cols-2 gap-4 content-start">
                {sectionCards.map((card) => (
                  <BudgetCard
                    key={card.title}
                    title={card.title}
                    amount={card.amount}
                    percentage={pct(card.amount)}
                    icon={card.icon}
                    color={card.color}
                    description={card.description}
                  />
                ))}
              </div>
            </div>

            {/* AI Insights — full width */}
            <AIInsights insights={budget.insights} />
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              {isLoading ? (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Loading your budget…</p>
                </>
              ) : (
                <>
                  <Sparkles className="h-10 w-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Budget Yet</h3>
                  <p className="text-muted-foreground mb-4 max-w-sm text-sm">
                    Click &quot;Generate Budget&quot; to create a personalized AI-powered budget based on your profile, loans, and location.
                  </p>
                  <Button onClick={handleGenerate} disabled={generating}>
                    {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    Generate Budget
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </DashboardLayout>
  )
}
