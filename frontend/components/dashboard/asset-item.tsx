"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/lib/hooks/useCurrency"
import {
  Home,
  Car,
  Watch,
  TrendingUp,
  Wallet,
  Building,
  Smartphone,
  ChevronRight,
  TrendingDown,
  type LucideIcon,
} from "lucide-react"

interface AssetItemData {
  id: string
  name: string
  type: "property" | "vehicle" | "luxury" | "investment" | "cash" | "other"
  value: number
  purchasePrice: number
  purchaseDate: string
  category: "asset" | "liability"
  appreciation: number // annual percentage
  futureValue?: number
  roi?: number
}

interface AssetItemProps {
  item: AssetItemData
  className?: string
}

const iconMap: Record<string, LucideIcon> = {
  property: Home,
  vehicle: Car,
  luxury: Watch,
  investment: TrendingUp,
  cash: Wallet,
  other: Smartphone,
}

export function AssetItem({ item, className }: AssetItemProps) {
  const [showDetails, setShowDetails] = useState(false)
  const { formatCurrency } = useCurrency()
  const Icon = iconMap[item.type] || Building

  const gainLoss = item.value - item.purchasePrice
  const gainLossPercent = ((gainLoss / item.purchasePrice) * 100).toFixed(1)
  const isPositive = gainLoss >= 0

  // Calculate 5-year projection
  const futureValue = item.value * Math.pow(1 + item.appreciation / 100, 5)
  const projectedGain = futureValue - item.value

  return (
    <>
      <Card
        className={cn(
          "cursor-pointer transition-colors hover:bg-secondary/50",
          className
        )}
        onClick={() => setShowDetails(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "p-2.5 rounded-xl",
                item.category === "asset"
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{item.name}</h3>
              <p className="text-sm text-muted-foreground capitalize">
                {item.type}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{formatCurrency(item.value)}</p>
              <div
                className={cn(
                  "flex items-center justify-end gap-1 text-xs",
                  isPositive ? "text-success" : "text-destructive"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{isPositive ? "+" : ""}{gainLossPercent}%</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div
                className={cn(
                  "p-2 rounded-lg",
                  item.category === "asset"
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive"
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              {item.name}
            </DialogTitle>
            <DialogDescription>
              {item.category === "asset" ? "Asset" : "Liability"} Details & Projections
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-secondary">
                <p className="text-sm text-muted-foreground">Current Value</p>
                <p className="text-lg font-bold">{formatCurrency(item.value)}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary">
                <p className="text-sm text-muted-foreground">Purchase Price</p>
                <p className="text-lg font-bold">{formatCurrency(item.purchasePrice)}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-2">Gain/Loss</p>
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-lg font-bold",
                    isPositive ? "text-success" : "text-destructive"
                  )}
                >
                  {isPositive ? "+" : ""}{formatCurrency(Math.abs(gainLoss))}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    isPositive
                      ? "bg-success/10 text-success border-success/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  )}
                >
                  {isPositive ? "+" : ""}{gainLossPercent}%
                </Badge>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-2">5-Year Projection</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Estimated Value</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(futureValue)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Projected Gain</span>
                  <span className="font-medium text-success">
                    +{formatCurrency(projectedGain)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Annual Appreciation</span>
                  <span className="font-medium">{item.appreciation}%</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Purchased on {item.purchaseDate}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
