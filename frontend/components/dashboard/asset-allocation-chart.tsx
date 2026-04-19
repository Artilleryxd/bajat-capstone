"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/lib/hooks/useCurrency"

interface AllocationData {
  name: string
  value: number
  color: string
}

interface AssetAllocationChartProps {
  data: AllocationData[]
  title?: string
  className?: string
}

export function AssetAllocationChart({
  data,
  title = "Asset Allocation",
  className,
}: AssetAllocationChartProps) {
  const { formatCurrency } = useCurrency()
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [
                  `${formatCurrency(value)} (${((value / total) * 100).toFixed(1)}%)`,
                  "",
                ]}
                contentStyle={{
                  backgroundColor: "#0f0f18",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "8px",
                  color: "#f2f2f8",
                }}
                itemStyle={{ color: "#f2f2f8" }}
                labelStyle={{ color: "#f2f2f8" }}
              />
              <Legend
                layout="horizontal"
                align="center"
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                formatter={(value, entry: any) => (
                  <span className="text-sm text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">Total Assets</p>
          <p className="text-2xl font-bold">{formatCurrency(total)}</p>
        </div>
      </CardContent>
    </Card>
  )
}
