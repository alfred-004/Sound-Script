import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join, resolve } from "path"
import { existsSync } from "fs"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Path to folder outside the project directory
    const externalDir = resolve(process.cwd(), "../audio-Uploads")

    if (!existsSync(externalDir)) {
      await mkdir(externalDir, { recursive: true })
    }

    // Use original filename (no unique ID)
    const fileName = file.name
    const filePath = join(externalDir, fileName)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    await writeFile(filePath, buffer)

    return NextResponse.json({
      success: true,
      fileName: fileName,
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}
