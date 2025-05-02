"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileAudio } from "lucide-react"
import { Card } from "@/components/ui/card"

interface AudioUploaderProps {
  onAudioUploaded: (file: File) => void
}

export default function AudioUploader({ onAudioUploaded }: AudioUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      handleFile(file)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      handleFile(file)
    }
  }

  const handleFile = (file: File) => {
    // Check if file is an audio file
    if (!file.type.startsWith("audio/")) {
      alert("Please upload an audio file.")
      return
    }

    // Create URL for audio preview
    if (audioURL) {
      URL.revokeObjectURL(audioURL)
    }

    const url = URL.createObjectURL(file)
    setAudioURL(url)
    onAudioUploaded(file)
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      <Card
        className={`p-6 flex flex-col items-center justify-center border-2 border-dashed border-purple-800/30 bg-black/40 ${
          dragActive ? "border-purple-500 bg-purple-900/20" : ""
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        {audioURL ? (
          <div className="w-full">
            <audio
              src={audioURL}
              controls
              className="w-full [&::-webkit-media-controls-panel]:bg-purple-900/30 [&::-webkit-media-controls-play-button]:text-purple-400"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-purple-900/20 flex items-center justify-center">
              <Upload className="h-8 w-8 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-300">Drag and drop your audio file</p>
              <p className="text-xs text-gray-500 mt-1">or click to browse</p>
            </div>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleChange} className="hidden" />
      </Card>

      <div className="flex justify-center">
        <Button variant="outline" onClick={handleButtonClick} className="border-purple-500 hover:bg-purple-500/10">
          <FileAudio className="h-4 w-4 mr-2" />
          Select Audio File
        </Button>
      </div>
    </div>
  )
}
