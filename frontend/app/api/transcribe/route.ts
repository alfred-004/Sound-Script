import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { file_name } = await request.json()

    if (!file_name) {
      return NextResponse.json({ error: "No file name provided" }, { status: 400 })
    }

    // Call the Flask API to transcribe the audio
    const response = await fetch("http://localhost:8000/transcribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file_name }),
    })

    if (!response.ok) {
      throw new Error(`Flask API returned ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error transcribing audio:", error)
    return NextResponse.json({ error: "Failed to transcribe audio" }, { status: 500 })
  }
}
