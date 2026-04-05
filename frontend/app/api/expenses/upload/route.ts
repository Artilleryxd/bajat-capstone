import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/config";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();

    const backendForm = new FormData();
    const file = formData.get("file");
    const fileType = formData.get("file_type");

    if (file) backendForm.append("file", file);
    if (fileType) backendForm.append("file_type", fileType as string);

    const res = await fetch(`${API_BASE_URL}/v1/expenses/upload`, {
      method: "POST",
      headers: { Authorization: authHeader },
      body: backendForm,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
