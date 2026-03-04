"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import {
  CreditCard,
  Home,
  Car,
  GraduationCap,
  Briefcase,
  type LucideIcon,
} from "lucide-react"

interface Loan {
  id: string
  type: string
  icon: "credit-card" | "home" | "car" | "education" | "personal"
  balance: number
  originalAmount: number
  interestRate: number
  emi: number
  remainingMonths: number
  priority?: number
}

interface LoanCardsProps {
  loans: Loan[]
  className?: string
}

const iconMap: Record<string, LucideIcon> = {
  "credit-card": CreditCard,
  home: Home,
  car: Car,
  education: GraduationCap,
  personal: Briefcase,
}

export function LoanCards({ loans, className }: LoanCardsProps) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {loans.map((loan) => {
        const Icon = iconMap[loan.icon]
        const paidPercentage = ((loan.originalAmount - loan.balance) / loan.originalAmount) * 100

        return (
          <Card key={loan.id} className="relative overflow-hidden">
            {loan.priority && (
              <div className="absolute top-0 right-0">
                <Badge className="rounded-none rounded-bl-lg bg-primary text-primary-foreground">
                  Priority #{loan.priority}
                </Badge>
              </div>
            )}
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <CardTitle className="text-base">{loan.type}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Outstanding Balance</span>
                  <span className="font-bold text-lg">${loan.balance.toLocaleString()}</span>
                </div>
                <Progress value={paidPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">
                  {paidPercentage.toFixed(0)}% paid off
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Interest Rate</p>
                  <p className="font-semibold text-chart-2">{loan.interestRate}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Monthly EMI</p>
                  <p className="font-semibold">${loan.emi.toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Remaining Tenure</p>
                  <p className="font-semibold">{loan.remainingMonths} months</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
