"use client"

import { FormEvent, useState } from "react"
import { Loader2, RefreshCcw, WandSparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getToken } from "@/lib/auth"
import type { BudgetOutput } from "@/lib/types/budget"

interface UserOverrideFormProps {
  onBudgetUpdate: (budget: BudgetOutput) => void
  onReset: () => void
  isSimulating: boolean
  canReset: boolean
}

export function UserOverrideForm({ onBudgetUpdate, onReset, isSimulating, canReset }: UserOverrideFormProps) {
  const [income, setIncome] = useState("")
  const [location, setLocation] = useState("")
  const [dependents, setDependents] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)

    try {
      const token = getToken()
      if (!token) {
        throw new Error("No authentication token found")
      }

      const payload: { income?: number; location?: string; dependents?: number } = {}
      if (income.trim()) payload.income = Number(income)
      if (location.trim()) payload.location = location.trim()
      if (dependents.trim()) payload.dependents = Number(dependents)

      if (Object.keys(payload).length === 0) {
        toast.info("Add at least one override to simulate")
        return
      }

      const response = await fetch("/api/budget/recalculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("Failed to recalculate budget")
      }

      const data: BudgetOutput = await response.json()
      onBudgetUpdate(data)
      toast.success("Simulation updated. Changes are not saved.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to recalculate"
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setIncome("")
    setLocation("")
    setDependents("")
    onReset()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>What-If Override</CardTitle>
        <CardDescription>Tune assumptions and simulate without saving.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`rounded-md border-l-4 px-3 py-2 text-sm ${
            isSimulating
              ? "border-l-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300"
              : "border-l-sky-500 bg-sky-500/10 text-sky-800 dark:text-sky-300"
          }`}
        >
          Simulating — changes not saved
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="override-income">Income (INR)</Label>
            <Input
              id="override-income"
              type="number"
              min="1"
              value={income}
              onChange={(event) => setIncome(event.target.value)}
              placeholder="e.g. 120000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="override-location">Location</Label>
            <Input
              id="override-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="e.g. Kharghar"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="override-dependents">Dependents</Label>
            <Input
              id="override-dependents"
              type="number"
              min="0"
              value={dependents}
              onChange={(event) => setDependents(event.target.value)}
              placeholder="e.g. 3"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
              {submitting ? "Simulating..." : "Simulate"}
            </Button>

            <Button type="button" variant="outline" disabled={!canReset || submitting} onClick={handleReset}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}