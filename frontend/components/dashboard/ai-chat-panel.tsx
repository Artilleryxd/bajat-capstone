"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Sparkles, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/lib/hooks/useCurrency"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface AIChatPanelProps {
  title?: string
  placeholder?: string
  initialMessages?: Message[]
  suggestions?: string[]
  className?: string
}

export function AIChatPanel({
  title = "AI Assistant",
  placeholder = "Ask me anything about your finances...",
  initialMessages = [],
  suggestions = [],
  className,
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const { formatCurrency } = useCurrency()

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    }

    // Simulate AI response
    const aiResponse: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: getSimulatedResponse(input),
    }

    setMessages((prev) => [...prev, userMessage, aiResponse])
    setInput("")
  }

  const getSimulatedResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase()
    if (lowerInput.includes("save") || lowerInput.includes("saving")) {
      return "Based on your spending patterns, I recommend increasing your savings rate by 5%. You could achieve this by reducing discretionary spending on subscriptions and dining out. Would you like me to create a detailed plan?"
    }
    if (lowerInput.includes("invest") || lowerInput.includes("investment")) {
      return "Given your risk tolerance and investment horizon, I suggest a diversified portfolio with 60% equities and 40% fixed income. This balances growth potential with stability. Shall I break down the specific allocation?"
    }
    if (lowerInput.includes("budget")) {
      return "I've analyzed your income and expenses. A 50/30/20 budget would work well for your situation: 50% needs, 30% wants, and 20% savings/investments. Want me to customize this based on your goals?"
    }
    if (lowerInput.includes("loan") || lowerInput.includes("debt")) {
      return `Looking at your loans, the avalanche method would save you ${formatCurrency(2340)} in interest over the next 3 years. Focus on the high-interest credit card first, then move to the car loan. I can create a detailed payoff schedule for you.`
    }
    return "I can help you optimize your finances. You could ask me about saving strategies, investment allocation, budget planning, or debt management. What would you like to explore?"
  }

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion)
  }

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-4 h-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-4">
        {/* Messages */}
        <div className="flex-1 space-y-4 min-h-[200px] max-h-[300px] overflow-y-auto pr-2">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Sparkles className="w-8 h-8 mb-2 text-primary/50" />
              <p className="text-sm">{"Ask me anything about your finances"}</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" && "flex-row-reverse"
                )}
              >
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarFallback
                    className={cn(
                      "text-xs",
                      message.role === "assistant"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {message.role === "assistant" ? (
                      <Sparkles className="w-3.5 h-3.5" />
                    ) : (
                      <User className="w-3.5 h-3.5" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm max-w-[80%]",
                    message.role === "assistant"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => handleSuggestion(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <Input
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1"
          />
          <Button size="icon" onClick={handleSend} disabled={!input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
