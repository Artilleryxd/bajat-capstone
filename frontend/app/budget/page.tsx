"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
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
  MessageCircle,
  Info,
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

/** Normalize any section from old (number) or new (dict) format */
function normalizeDict(
  val: Record<string, number | undefined> | number | undefined
): Record<string, number> {
  if (typeof val === "number") return val > 0 ? { total: val } : {}
  if (!val || typeof val !== "object") return {}
  const result: Record<string, number> = {}
  for (const [k, v] of Object.entries(val)) {
    if (v !== undefined && v > 0) result[k] = v
  }
  return result
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Smart Budget Planner</h1>
            <p className="text-muted-foreground">
              AI-powered personalized budget based on your profile
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1">
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/budget/chat">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Budget Chat
                </Link>
              </Button>
              <Button onClick={handleGenerate} disabled={generating || isLoading}>
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {generating ? "Generating..." : "Generate Budget"}
              </Button>
            </div>
            {hasTemporaryOverrides && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                Using temporary profile overrides for this generation
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Inputs */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Your Profile</CardTitle>
                  <CardDescription>
                    {editing ? "Edit values and re-generate" : "Pre-filled from your account"}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={editing ? applyTemporaryOverrides : enterEditMode}
                  disabled={loadingProfile || !effectiveProfile}
                >
                  {editing ? (
                    <>
                      <Lock className="w-4 h-4 mr-1" />
                      Lock
                    </>
                  ) : (
                    <>
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingProfile ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Monthly Income */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Monthly Income</Label>
                    {editing ? (
                      <Input
                        type="number"
                        min="1"
                        value={editIncome}
                        onChange={(e) => setEditIncome(e.target.value)}
                      />
                    ) : (
                      <p className="text-sm font-medium">
                        {effectiveProfile?.monthly_income ? formatCurrency(effectiveProfile.monthly_income) : "Not set"}
                      </p>
                    )}
                  </div>

                  {/* City */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">City</Label>
                    {editing ? (
                      <Input
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        placeholder="e.g. Mumbai"
                      />
                    ) : (
                      <p className="text-sm font-medium">{effectiveProfile?.city || "Not set"}</p>
                    )}
                  </div>

                  {/* Neighbourhood */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Neighbourhood</Label>
                    {editing ? (
                      <Input
                        value={editNeighbourhood}
                        onChange={(e) => setEditNeighbourhood(e.target.value)}
                        placeholder="e.g. Kharghar"
                      />
                    ) : (
                      <p className="text-sm font-medium">{effectiveProfile?.neighbourhood || "Not set"}</p>
                    )}
                  </div>

                  {/* Housing Status */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Housing Status</Label>
                    {editing ? (
                      <Select value={editHousing} onValueChange={setEditHousing}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rented">Rented</SelectItem>
                          <SelectItem value="owned">Owned</SelectItem>
                          <SelectItem value="family">Family</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm font-medium capitalize">{effectiveProfile?.housing_status || "Not set"}</p>
                    )}
                  </div>

                  {/* Marital Status */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Marital Status</Label>
                    {editing ? (
                      <Select value={editMarital} onValueChange={setEditMarital}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="married">Married</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm font-medium capitalize">{effectiveProfile?.marital_status || "Not set"}</p>
                    )}
                  </div>

                  {/* Dependents */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Dependents</Label>
                    {editing ? (
                      <Input
                        type="number"
                        min="0"
                        value={editDependents}
                        onChange={(e) => setEditDependents(e.target.value)}
                      />
                    ) : (
                      <p className="text-sm font-medium">{effectiveProfile?.num_dependents ?? 0}</p>
                    )}
                  </div>

                  {/* Occupation */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Occupation</Label>
                    {editing ? (
                      <Input
                        value={editIncomeType}
                        onChange={(e) => setEditIncomeType(e.target.value)}
                        placeholder="e.g. Software Engineer"
                      />
                    ) : (
                      <p className="text-sm font-medium">{effectiveProfile?.income_type || "Not set"}</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Budget Output */}
          <div className="lg:col-span-2 space-y-6">
            {budget ? (
              <>
                {/* Summary Cards — only show sections with amount > 0 */}
                <div className={`grid gap-4 sm:grid-cols-2 ${sectionCards.length >= 5 ? "lg:grid-cols-5" : sectionCards.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
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

                {/* Donut Chart with hover tooltips */}
                <BudgetChart data={chartData} spendingSummary={spendingSummary} />

                {/* Needs Breakdown */}
                {(() => {
                  const entries = Object.entries(normalizeDict(budget.needs))
                  if (entries.length === 0) return null
                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Needs Breakdown</CardTitle>
                        <CardDescription>Detailed allocation within essential spending</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {entries.map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                              <span className="text-sm font-medium capitalize">{key.replace(/_/g, " ")}</span>
                              <span className="text-sm font-semibold">{formatCurrency(value)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })()}

                {/* Wants Breakdown */}
                {(() => {
                  const entries = Object.entries(normalizeDict(budget.wants))
                  if (entries.length === 0) return null
                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Wants Breakdown</CardTitle>
                        <CardDescription>Detailed allocation within lifestyle spending</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {entries.map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                              <span className="text-sm font-medium capitalize">{key.replace(/_/g, " ")}</span>
                              <span className="text-sm font-semibold">{formatCurrency(value)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })()}

                {/* Investments Breakdown */}
                {(() => {
                  const entries = Object.entries(normalizeDict(budget.investments))
                  if (entries.length === 0) return null
                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Investments Breakdown</CardTitle>
                        <CardDescription>How your investment allocation is distributed</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {entries.map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                              <span className="text-sm font-medium capitalize">{key.replace(/_/g, " ")}</span>
                              <span className="text-sm font-semibold">{formatCurrency(value)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })()}

                {/* Repayment Breakdown — only if loans exist */}
                {(() => {
                  const entries = Object.entries(normalizeDict(budget.repayment))
                  if (entries.length === 0) return null
                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Loan Repayment</CardTitle>
                        <CardDescription>Fixed monthly EMI obligations</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {entries.map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                              <span className="text-sm font-medium capitalize">{key.replace(/_/g, " ")}</span>
                              <span className="text-sm font-semibold">{formatCurrency(value)}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })()}

                {/* AI Insights */}
                <AIInsights insights={budget.insights} />
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Loading your budget...</p>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-10 w-10 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Budget Yet</h3>
                      <p className="text-muted-foreground mb-4 max-w-sm">
                        Click &quot;Generate Budget&quot; to create a personalized AI-powered budget based on your profile, loans, and location.
                      </p>
                      <Button onClick={handleGenerate} disabled={generating}>
                        {generating ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        Generate Budget
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
