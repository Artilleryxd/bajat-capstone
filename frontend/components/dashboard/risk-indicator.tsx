"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface RiskIndicatorProps {
  level: "conservative" | "moderate" | "aggressive"
  expectedReturn: { min: number; max: number }
  className?: string
}

const riskColors = {
  conservative: {
    bg: "bg-success/20",
    text: "text-success",
    indicator: "left-[15%]",
    label: "Conservative",
  },
  moderate: {
    bg: "bg-chart-3/20",
    text: "text-chart-3",
    indicator: "left-[50%]",
    label: "Moderate",
  },
  aggressive: {
    bg: "bg-destructive/20",
    text: "text-destructive",
    indicator: "left-[85%]",
    label: "Aggressive",
  },
}

export function RiskIndicator({
  level,
  expectedReturn,
  className,
}: RiskIndicatorProps) {
  const config = riskColors[level]

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Risk Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Risk Level Indicator */}
        <div className="space-y-3">
          <div className="relative h-3 rounded-full bg-gradient-to-r from-success via-chart-3 to-destructive">
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-4 border-background bg-foreground transition-all",
                config.indicator
              )}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Conservative</span>
            <span>Moderate</span>
            <span>Aggressive</span>
          </div>
        </div>

        {/* Risk Level Badge */}
        <div
          className={cn(
            "flex items-center justify-center p-4 rounded-lg",
            config.bg
          )}
        >
          <span className={cn("text-lg font-bold", config.text)}>
            {config.label} Investor
          </span>
        </div>

        {/* Expected Returns */}
        <div className="p-4 rounded-lg bg-secondary">
          <p className="text-sm text-muted-foreground mb-2">Expected Annual Returns</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">
              {expectedReturn.min}% - {expectedReturn.max}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Based on historical performance and market conditions
          </p>
        </div>

        {/* Risk Characteristics */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Characteristics:</p>
          {level === "conservative" && (
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>- Lower volatility, stable returns</li>
              <li>- Focus on capital preservation</li>
              <li>- Higher allocation to bonds and fixed income</li>
            </ul>
          )}
          {level === "moderate" && (
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>- Balanced risk and return</li>
              <li>- Mix of growth and income</li>
              <li>- Diversified across asset classes</li>
            </ul>
          )}
          {level === "aggressive" && (
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>- Higher volatility, potential for greater returns</li>
              <li>- Focus on capital growth</li>
              <li>- Higher allocation to equities</li>
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
