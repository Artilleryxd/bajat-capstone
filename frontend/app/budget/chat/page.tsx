"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Bot, Loader2, SendHorizonal, User } from "lucide-react"
import { toast } from "sonner"

import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { getToken } from "@/lib/auth"

type ThreadMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

type ChatMessageResponse = {
  session_id: string
  reply: string
}

const bootstrapPrompt =
  "Please introduce yourself briefly and summarize my current budget context in 2-3 actionable points before we begin."

export default function BudgetChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [input, setInput] = useState("")
  const [loadingSession, setLoadingSession] = useState(true)
  const [sending, setSending] = useState(false)
  const [typing, setTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endOfThreadRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endOfThreadRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, typing])

  useEffect(() => {
    async function bootstrapSession() {
      setLoadingSession(true)
      setTyping(true)
      setError(null)

      try {
        const token = getToken()
        if (!token) {
          throw new Error("No authentication token found")
        }

        const response = await fetch("/api/chat/message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: bootstrapPrompt }),
        })

        if (!response.ok) {
          throw new Error("Failed to start chat session")
        }

        const data: ChatMessageResponse = await response.json()
        setSessionId(data.session_id)
        setMessages([
          { id: `u-${Date.now()}`, role: "user", content: bootstrapPrompt },
          { id: `a-${Date.now() + 1}`, role: "assistant", content: data.reply },
        ])
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to initialize chat"
        setError(message)
        toast.error(message)
      } finally {
        setTyping(false)
        setLoadingSession(false)
      }
    }

    bootstrapSession()
  }, [])

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || sending || !sessionId) return

    const userMessage: ThreadMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setSending(true)
    setTyping(true)

    try {
      const token = getToken()
      if (!token) {
        throw new Error("No authentication token found")
      }

      const response = await fetch("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: trimmed, session_id: sessionId }),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      const data: ChatMessageResponse = await response.json()
      setSessionId(data.session_id)

      const aiMessage: ThreadMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.reply,
      }
      setMessages((prev) => [...prev, aiMessage])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Message failed"
      toast.error(message)
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: "I could not respond right now. Please try again in a moment.",
        },
      ])
    } finally {
      setTyping(false)
      setSending(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Budget AI Chat</h1>
            <p className="text-muted-foreground">Discuss your budget strategy with context-aware AI guidance.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/budget">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Budget
            </Link>
          </Button>
        </div>

        <Card className="h-[calc(100vh-14rem)] min-h-140">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Conversation</CardTitle>
            <CardDescription>
              {sessionId ? `Session: ${sessionId.slice(0, 8)}...` : "Preparing your chat session..."}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex h-[calc(100%-5rem)] flex-col gap-4">
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <ScrollArea className="flex-1 rounded-md border p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/15 text-primary">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div
                      className={`max-w-[80%] rounded-xl border px-4 py-2 text-sm leading-relaxed ${
                        message.role === "user"
                          ? "border-primary/40 bg-primary text-primary-foreground"
                          : "border-border bg-muted/40 text-foreground"
                      }`}
                    >
                      {message.content}
                    </div>

                    {message.role === "user" && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-secondary text-secondary-foreground">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {typing && (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/15 text-primary">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AI is typing...
                    </div>
                  </div>
                )}

                <div ref={endOfThreadRef} />
              </div>
            </ScrollArea>

            <form className="space-y-2" onSubmit={sendMessage}>
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about spending cuts, loan strategy, or allocation changes..."
                className="min-h-22"
                disabled={loadingSession || sending || !sessionId}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={!input.trim() || loadingSession || sending || !sessionId}>
                  {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SendHorizonal className="mr-2 h-4 w-4" />}
                  Send
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}