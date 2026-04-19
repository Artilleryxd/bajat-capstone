import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string
  subtitle?: string
  change?: number
  changeLabel?: string
  icon?: LucideIcon
  iconColor?: string
  className?: string
}

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  changeLabel = "vs last month",
  icon: Icon,
  iconColor = "bg-primary/10 text-primary",
  className,
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (change === undefined || change === 0) return <Minus className="w-3 h-3" />
    return change > 0 ? (
      <TrendingUp className="w-3 h-3" />
    ) : (
      <TrendingDown className="w-3 h-3" />
    )
  }

  const getTrendColor = () => {
    if (change === undefined || change === 0) return "text-muted-foreground"
    return change > 0 ? "text-success" : "text-destructive"
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {change !== undefined && (
              <div className={cn("flex items-center gap-1 text-xs", getTrendColor())}>
                {getTrendIcon()}
                <span>{Math.abs(change)}%</span>
                <span className="text-muted-foreground">{changeLabel}</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn("p-2.5 rounded-xl", iconColor)}>
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
