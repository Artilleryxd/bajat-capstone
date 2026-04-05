"use client"

import { useEffect, useState } from "react"
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
import { Wallet, TrendingUp, CreditCard, PiggyBank, Loader2 } from "lucide-react"
import { getToken } from "@/lib/auth"
import { API_BASE_URL } from "@/lib/config"
import { useCurrency } from "@/lib/hooks/useCurrency"

interface UserProfile {
  id: string
  full_name?: string | null
  monthly_income?: number | null
  currency?: string | null
  metrics?: {
    net_worth?: number | null
    monthly_expenses?: number | null
    savings_rate?: number | null
    health_score?: number | null
    net_worth_change?: number | null
    monthly_income_change?: number | null
    monthly_expenses_change?: number | null
    savings_rate_change?: number | null
  }
  charts?: {
    net_worth?: Record<string, unknown>[]
    income_expense?: Record<string, unknown>[]
    expense_breakdown?: Record<string, unknown>[]
    asset_liability?: Record<string, unknown>[]
  }
  insights?: Array<{
    id: string
    type: "positive" | "negative" | "info" | "warning"
    message: string
  }>
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const token = getToken()
        if (!token) {
          setError("No authentication token found.")
          setLoading(false)
          return
        }

        const res = await fetch(`${API_BASE_URL}/v1/profile/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) {
          throw new Error("Failed to fetch profile")
        }

        const data = await res.json()
        setProfile(data)
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setError("An unknown error occurred")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !profile) {
    return (
      <DashboardLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <p className="text-destructive font-medium">{error || "Could not load data"}</p>
        </div>
      </DashboardLayout>
    )
  }

  const { formatCurrency } = useCurrency()

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome! <span className="text-primary">{profile.full_name || "User"}</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Here is an overview of your financial health.
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {profile.metrics?.net_worth != null && (
            <MetricCard
              title="Net Worth"
              value={formatCurrency(profile.metrics.net_worth)}
              change={profile.metrics.net_worth_change ?? undefined}
              icon={Wallet}
              iconColor="bg-primary/10 text-primary"
            />
          )}
          
          {profile.monthly_income != null && (
             <MetricCard
               title="Monthly Income"
               value={formatCurrency(profile.monthly_income)}
               change={profile.metrics?.monthly_income_change ?? undefined}
               icon={TrendingUp}
               iconColor="bg-green-500/10 text-green-500"
             />
          )}

          {profile.metrics?.monthly_expenses != null && (
            <MetricCard
              title="Monthly Expenses"
              value={formatCurrency(profile.metrics.monthly_expenses)}
              change={profile.metrics.monthly_expenses_change ?? undefined}
              icon={CreditCard}
              iconColor="bg-blue-500/10 text-blue-500"
            />
          )}

          {profile.metrics?.savings_rate != null && (
            <MetricCard
              title="Savings Rate"
              value={`${profile.metrics.savings_rate}%`}
              change={profile.metrics.savings_rate_change ?? undefined}
              icon={PiggyBank}
              iconColor="bg-amber-500/10 text-amber-500"
            />
          )}

          {profile.metrics?.health_score != null && (
            <HealthScore 
              score={profile.metrics.health_score} 
              className="md:col-span-2 lg:col-span-1 shadow-sm" 
            />
          )}
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {profile.charts?.net_worth && <NetWorthChart />}
          {profile.charts?.income_expense && <IncomeExpenseChart />}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {profile.charts?.expense_breakdown && <ExpenseBreakdownChart />}
          {profile.charts?.asset_liability && <AssetLiabilityChart />}
          {profile.insights && profile.insights.length > 0 && (
            <InsightsCard insights={profile.insights} />
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
