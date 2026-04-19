"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface AllocationItem {
  name: string
  percentage: number
  color: string
  description?: string
}

interface InvestmentAllocationChartProps {
  data: AllocationItem[]
  title?: string
  className?: string
}

export function InvestmentAllocationChart({
  data,
  title = "Recommended Portfolio",
  className,
}: InvestmentAllocationChartProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pie Chart */}
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="percentage"
                  stroke="none"
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `${value}%`}
                  contentStyle={{
                    backgroundColor: "#0f0f18",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    color: "#f2f2f8",
                  }}
                  itemStyle={{ color: "#f2f2f8" }}
                  labelStyle={{ color: "#f2f2f8" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Allocation List */}
          <div className="space-y-4">
            {data.map((item) => (
              <div key={item.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                  <span className="font-bold">{item.percentage}%</span>
                </div>
                <Progress
                  value={item.percentage}
                  className="h-2"
                  style={{
                    // @ts-ignore
                    "--progress-background": item.color,
                  }}
                />
                {item.description && (
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
