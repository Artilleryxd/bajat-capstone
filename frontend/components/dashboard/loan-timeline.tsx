"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/lib/hooks/useCurrency"

interface TimelineData {
  month: string
  balance: number
  paid: number
}

interface LoanTimelineProps {
  data: TimelineData[]
  className?: string
}

export function LoanTimeline({ data, className }: LoanTimelineProps) {
  const { formatCurrency, formatCompactCurrency } = useCurrency()

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Loan Payoff Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCompactCurrency(value)}
                className="text-muted-foreground"
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "#0f0f18",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "8px",
                  color: "#f2f2f8",
                }}
                itemStyle={{ color: "#f2f2f8" }}
                labelStyle={{ color: "#f2f2f8" }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stackId="1"
                stroke="var(--chart-2)"
                fill="var(--chart-2)"
                fillOpacity={0.3}
                name="Remaining Balance"
              />
              <Area
                type="monotone"
                dataKey="paid"
                stackId="2"
                stroke="var(--primary)"
                fill="var(--primary)"
                fillOpacity={0.3}
                name="Total Paid"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
