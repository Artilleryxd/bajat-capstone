import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/lib/hooks/useCurrency"
import type { LucideIcon } from "lucide-react"

interface BudgetCardProps {
  title: string
  amount: number
  percentage: number
  icon: LucideIcon
  color: string
  description?: string
  className?: string
}

export function BudgetCard({
  title,
  amount,
  percentage,
  icon: Icon,
  color,
  description,
  className,
}: BudgetCardProps) {
  const { formatCurrency } = useCurrency()

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div
            className="p-2.5 rounded-xl"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <span
            className="text-2xl font-bold"
            style={{ color }}
          >
            {percentage}%
          </span>
        </div>
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-2xl font-bold mb-2">{formatCurrency(amount)}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
