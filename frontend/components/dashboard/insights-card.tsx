import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lightbulb, TrendingUp, TrendingDown, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Insight {
  id: string
  type: "positive" | "negative" | "warning" | "info"
  message: string
}

interface InsightsCardProps {
  insights: Insight[]
  title?: string
  className?: string
}

export function InsightsCard({
  insights,
  title = "AI Insights",
  className,
}: InsightsCardProps) {
  const getIcon = (type: Insight["type"]) => {
    switch (type) {
      case "positive":
        return <TrendingUp className="w-4 h-4" />
      case "negative":
        return <TrendingDown className="w-4 h-4" />
      case "warning":
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Lightbulb className="w-4 h-4" />
    }
  }

  const getColors = (type: Insight["type"]) => {
    switch (type) {
      case "positive":
        return "bg-success/10 text-success border-success/20"
      case "negative":
        return "bg-destructive/10 text-destructive border-destructive/20"
      case "warning":
        return "bg-warning/10 text-warning-foreground border-warning/20"
      default:
        return "bg-primary/10 text-primary border-primary/20"
    }
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="w-4 h-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border",
              getColors(insight.type)
            )}
          >
            <div className="flex-shrink-0 mt-0.5">{getIcon(insight.type)}</div>
            <p className="text-sm leading-relaxed">{insight.message}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
