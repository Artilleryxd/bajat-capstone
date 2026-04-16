import { NextRequest, NextResponse } from "next/server"
import { API_BASE_URL } from "@/lib/config"

function getAuthHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")?.trim()
  if (
    !authHeader ||
    authHeader === "Bearer" ||
    authHeader === "Bearer null" ||
    authHeader === "Bearer undefined"
  ) {
    return null
  }
  return authHeader
}

export async function GET(request: NextRequest) {
  const authHeader = getAuthHeader(request)
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const res = await fetch(`${API_BASE_URL}/budget/latest`, {
      headers: { Authorization: authHeader },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch latest budget"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
