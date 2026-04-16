"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface AIInsightsProps {
  insights: string[]
}

export function AIInsights({ insights }: AIInsightsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Insights</CardTitle>
        <CardDescription>
          Personalized financial advice based on your budget
        </CardDescription>
      </CardHeader>
      <CardContent>
        {insights.length > 0 ? (
          <ul className="space-y-3">
            {insights.map((insight, index) => (
              <li
                key={`${insight}-${index}`}
                className="rounded-md border border-l-4 border-l-blue-500/60 bg-muted/30 px-4 py-3 text-sm leading-relaxed text-foreground"
              >
                {insight}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No insights available yet.</p>
        )}
      </CardContent>
    </Card>
  )
}