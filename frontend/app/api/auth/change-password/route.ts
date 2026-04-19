import { NextRequest, NextResponse } from "next/server"
import { API_BASE_URL } from "@/lib/config"

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")?.trim()
  if (!authHeader || authHeader === "Bearer" || authHeader === "Bearer null") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const res = await fetch(`${API_BASE_URL}/v1/auth/change-password`, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to change password"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
