import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const file_name = body.file_name
    const summary_type = body.summary_type || "meeting"
    const max_length = body.max_length ?? 300
    const min_length = body.min_length ?? 100

    if (!file_name) {
      return NextResponse.json({ error: "File name is required" }, { status: 400 })
    }

    const payload = {
      file_name,
      summary_type,
      max_length,
      min_length,
    }

    console.log("Sending payload to Flask API:", JSON.stringify(payload, null, 2))

    const response = await fetch("http://localhost:8000/summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Flask API returned ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error summarizing transcript:", error)
    return NextResponse.json({ error: "Failed to summarize transcript" }, { status: 500 })
  }
}
