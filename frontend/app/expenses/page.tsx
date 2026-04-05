"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ExpenseInput } from "@/components/dashboard/expense-input"
import { ExpenseTable } from "@/components/dashboard/expense-table"
import { CategoryDistribution } from "@/components/dashboard/category-distribution"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Save, X, CalendarDays } from "lucide-react"
import { toast } from "sonner"
import { getToken } from "@/lib/auth"
import { CATEGORY_COLORS } from "@/lib/constants"
import type {
  ParsedExpense,
  ExpenseRecord,
  ExpenseSummary,
  ExpenseCategory,
} from "@/lib/types/expense"

/** Format a Date as YYYY-MM-DD using local timezone (avoids UTC shift). */
function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function getMonthOptions(): { value: string; label: string }[] {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = formatLocalDate(d)
    const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    options.push({ value, label })
  }
  return options
}

export default function ExpensesPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    return formatLocalDate(new Date(d.getFullYear(), d.getMonth(), 1))
  })
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [loading, setLoading] = useState(true)

  // Pending parsed expenses (from file upload, not yet saved)
  const [pendingExpenses, setPendingExpenses] = useState<ParsedExpense[]>([])
  const [confirmLoading, setConfirmLoading] = useState(false)

  const fetchExpenses = useCallback(async (monthYear: string) => {
    setLoading(true)
    try {
      const token = getToken()
      const res = await fetch(`/api/expenses/${monthYear}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to fetch expenses")
      const data = await res.json()
      setExpenses(data.expenses || [])
      setSummary(data.summary || null)
    } catch {
      toast.error("Could not load expenses")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchExpenses(selectedMonth)
  }, [selectedMonth, fetchExpenses])

  const handleManualAdded = () => {
    toast.success("Expense added successfully")
    fetchExpenses(selectedMonth)
  }

  const handleParseComplete = (parsed: ParsedExpense[]) => {
    if (parsed.length === 0) {
      toast.error("No transactions found in the file")
      return
    }
    setPendingExpenses((prev) => [...prev, ...parsed])
    toast.success(`${parsed.length} transactions parsed — review below before saving`)
  }

  const handlePendingCategoryChange = (id: string, category: ExpenseCategory) => {
    setPendingExpenses((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, category, user_override: true } : e
      )
    )
  }

  const handleConfirmAll = async () => {
    if (pendingExpenses.length === 0) return
    setConfirmLoading(true)

    try {
      const token = getToken()
      const res = await fetch("/api/expenses/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ expenses: pendingExpenses }),
      })

      if (!res.ok) throw new Error("Failed to save expenses")

      const data = await res.json()
      toast.success(`${data.inserted} expenses saved successfully`)
      setPendingExpenses([])
      fetchExpenses(selectedMonth)
    } catch {
      toast.error("Failed to save expenses")
    } finally {
      setConfirmLoading(false)
    }
  }

  const handleDiscardPending = () => {
    setPendingExpenses([])
    toast.info("Pending expenses discarded")
  }

  // Build category distribution data from summary
  const categoryData = summary
    ? (Object.entries(summary.categories) as [ExpenseCategory, { total: number; count: number }][])
        .map(([key, val]) => {
          const total = summary.total || 1
          return {
            name: key.charAt(0).toUpperCase() + key.slice(1),
            value: val.total,
            percentage: Math.round((val.total / total) * 100),
            color: CATEGORY_COLORS[key],
          }
        })
        .filter((d) => d.value > 0)
    : []

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Expense Tracking</h1>
            <p className="text-muted-foreground">
              Track and categorize your expenses with AI-powered insights
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]" id="month-picker">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getMonthOptions().map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Expense Input */}
        <ExpenseInput
          onManualAdded={handleManualAdded}
          onParseComplete={handleParseComplete}
        />

        {/* Pending Expenses (from file upload — needs confirmation) */}
        {pendingExpenses.length > 0 && (
          <div className="space-y-4">
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-4 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-medium text-amber-600 dark:text-amber-400">
                      {pendingExpenses.length} parsed expenses ready for review
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Review categories below — override any if needed — then save
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleDiscardPending}>
                      <X className="w-4 h-4 mr-1" /> Discard
                    </Button>
                    <Button size="sm" onClick={handleConfirmAll} disabled={confirmLoading}>
                      {confirmLoading ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-1" />
                      )}
                      {confirmLoading ? "Saving..." : "Save All"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ExpenseTable
              transactions={pendingExpenses}
              title="Parsed Expenses (Review)"
              onCategoryChange={handlePendingCategoryChange}
              showConfidence
              showSource
            />
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Saved Content */}
        {!loading && (
          <>
            {/* Category Distribution */}
            {categoryData.length > 0 && (
              <CategoryDistribution data={categoryData} />
            )}

            {/* Transaction History */}
            <ExpenseTable
              transactions={expenses}
              title="Saved Transactions"
              showConfidence
              showSource
            />
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
