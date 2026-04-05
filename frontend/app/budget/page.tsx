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
import { Slider } from "@/components/ui/slider"
import { BudgetProgress } from "@/components/dashboard/budget-progress"
import { BudgetCard } from "@/components/dashboard/budget-cards"
import { AIChatPanel } from "@/components/dashboard/ai-chat-panel"
import {
  Home,
  ShoppingBag,
  TrendingUp,
  Shield,
  Sparkles,
  Calculator,
} from "lucide-react"
import { useCurrency } from "@/lib/hooks/useCurrency"

const budgetCategories = [
  { name: "Needs", allocated: 4250, spent: 3800, color: "var(--chart-1)", percentage: 50 },
  { name: "Wants", allocated: 2550, spent: 2100, color: "var(--chart-2)", percentage: 30 },
  { name: "Investments", allocated: 1275, spent: 1275, color: "var(--primary)", percentage: 15 },
  { name: "Emergency Fund", allocated: 425, spent: 425, color: "var(--chart-3)", percentage: 5 },
]

const budgetSuggestions = [
  "Increase my savings rate",
  "Reduce discretionary spending",
  "I expect a salary raise",
  "Plan for a big purchase",
]

export default function BudgetPage() {
  const { currencySymbol } = useCurrency()

  const [income, setIncome] = useState("8500")
  const [location, setLocation] = useState("")
  const [maritalStatus, setMaritalStatus] = useState("")
  const [dependents, setDependents] = useState("0")
  const [age, setAge] = useState("30")
  const [retirementGoal, setRetirementGoal] = useState("65")
  const [riskTolerance, setRiskTolerance] = useState([50])

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
          <Button className="w-full sm:w-auto">
            <Calculator className="w-4 h-4 mr-2" />
            Recalculate Budget
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Input Form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Your Profile</CardTitle>
              <CardDescription>
                Enter your details for a personalized budget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="income">Monthly Income</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {currencySymbol}
                  </span>
                  <Input
                    id="income"
                    type="number"
                    className="pl-7"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger id="location">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nyc">New York City</SelectItem>
                    <SelectItem value="sf">San Francisco</SelectItem>
                    <SelectItem value="la">Los Angeles</SelectItem>
                    <SelectItem value="chicago">Chicago</SelectItem>
                    <SelectItem value="austin">Austin</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="marital">Marital Status</Label>
                <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                  <SelectTrigger id="marital">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dependents">Dependents</Label>
                  <Input
                    id="dependents"
                    type="number"
                    min="0"
                    value={dependents}
                    onChange={(e) => setDependents(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    min="18"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retirement">Retirement Goal Age</Label>
                <Input
                  id="retirement"
                  type="number"
                  min="50"
                  max="80"
                  value={retirementGoal}
                  onChange={(e) => setRetirementGoal(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label>Risk Tolerance</Label>
                  <span className="text-sm text-muted-foreground">
                    {riskTolerance[0] < 33
                      ? "Conservative"
                      : riskTolerance[0] < 66
                      ? "Moderate"
                      : "Aggressive"}
                  </span>
                </div>
                <Slider
                  value={riskTolerance}
                  onValueChange={setRiskTolerance}
                  max={100}
                  step={1}
                />
              </div>

              <Button className="w-full">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Budget
              </Button>
            </CardContent>
          </Card>

          {/* Budget Output */}
          <div className="lg:col-span-2 space-y-6">
            {/* Budget Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <BudgetCard
                title="Needs"
                amount={4250}
                percentage={50}
                icon={Home}
                color="hsl(var(--chart-1))"
                description="Housing, food, utilities"
              />
              <BudgetCard
                title="Wants"
                amount={2550}
                percentage={30}
                icon={ShoppingBag}
                color="hsl(var(--chart-2))"
                description="Entertainment, dining"
              />
              <BudgetCard
                title="Investments"
                amount={1275}
                percentage={15}
                icon={TrendingUp}
                color="hsl(var(--primary))"
                description="Stocks, bonds, funds"
              />
              <BudgetCard
                title="Emergency"
                amount={425}
                percentage={5}
                icon={Shield}
                color="hsl(var(--chart-3))"
                description="Rainy day savings"
              />
            </div>

            {/* Budget Progress */}
            <BudgetProgress
              categories={budgetCategories}
              totalBudget={8500}
            />

            {/* AI Budget Chat */}
            <AIChatPanel
              title="Budget AI Assistant"
              placeholder="Ask me to adjust your budget..."
              suggestions={budgetSuggestions}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
