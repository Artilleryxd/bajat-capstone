"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface HealthScoreProps {
  score: number
  maxScore?: number
  label?: string
  className?: string
}

export function HealthScore({
  score,
  maxScore = 100,
  label = "Financial Health Score",
  className,
}: HealthScoreProps) {
  const percentage = (score / maxScore) * 100
  const circumference = 2 * Math.PI * 45

  const getScoreColor = () => {
    if (percentage >= 80) return "text-success"
    if (percentage >= 60) return "text-chart-3"
    if (percentage >= 40) return "text-warning"
    return "text-destructive"
  }

  const getScoreLabel = () => {
    if (percentage >= 80) return "Excellent"
    if (percentage >= 60) return "Good"
    if (percentage >= 40) return "Fair"
    return "Needs Work"
  }

  const getStrokeColor = () => {
    if (percentage >= 80) return "stroke-success"
    if (percentage >= 60) return "stroke-chart-3"
    if (percentage >= 40) return "stroke-warning"
    return "stroke-destructive"
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center pt-2">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-secondary"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (percentage / 100) * circumference}
              className={cn("transition-all duration-1000 ease-out", getStrokeColor())}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-3xl font-bold", getScoreColor())}>
              {score}
            </span>
            <span className="text-xs text-muted-foreground">/ {maxScore}</span>
          </div>
        </div>
        <p className={cn("mt-2 text-sm font-medium", getScoreColor())}>
          {getScoreLabel()}
        </p>
      </CardContent>
    </Card>
  )
}
