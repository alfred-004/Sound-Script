"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square } from "lucide-react"
import { Card } from "@/components/ui/card"

interface AudioRecorderProps {
  onAudioRecorded: (file: File) => void
  isRecording: boolean
  setIsRecording: (isRecording: boolean) => void
}

export default function AudioRecorder({ onAudioRecorded, isRecording, setIsRecording }: AudioRecorderProps) {
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioURL) {
        URL.revokeObjectURL(audioURL)
      }
    }
  }, [audioURL])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/mpeg" })
        const url = URL.createObjectURL(audioBlob)
        setAudioURL(url)

        // Create a File object from the Blob
        const fileName = `recording-${new Date().toISOString()}.mp3`
        const audioFile = new File([audioBlob], fileName, { type: "audio/mpeg" })

        onAudioRecorded(audioFile)

        // Stop all tracks of the stream
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("Error starting recording:", error)
      alert("Could not access microphone. Please check your permissions.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-4">
      <Card className="p-6 flex flex-col items-center justify-center border-purple-800/30 bg-black/40">
        {isRecording ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-purple-900/50 flex items-center justify-center animate-pulse">
              <Mic className="h-8 w-8 text-purple-400" />
            </div>
            <div className="text-xl font-mono text-purple-300">{formatTime(recordingTime)}</div>
            <p className="text-sm text-gray-400">Recording in progress...</p>
          </div>
        ) : audioURL ? (
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
              <Mic className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-400">Click record to start</p>
          </div>
        )}
      </Card>

      <div className="flex justify-center">
        {isRecording ? (
          <Button variant="destructive" onClick={stopRecording} className="bg-red-900 hover:bg-red-800">
            <Square className="h-4 w-4 mr-2" />
            Stop Recording
          </Button>
        ) : (
          <Button onClick={startRecording} disabled={isRecording} className="bg-purple-600 hover:bg-purple-700">
            <Mic className="h-4 w-4 mr-2" />
            Start Recording
          </Button>
        )}
      </div>
    </div>
  )
}
