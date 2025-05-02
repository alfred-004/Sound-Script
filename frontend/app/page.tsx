"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileAudio, Save, Loader2, FileText } from "lucide-react"
import { useRouter } from "next/navigation"
import AudioRecorder from "@/components/audio-recorder"
import AudioUploader from "@/components/audio-uploader"
import TranscriptDisplay from "@/components/transcript-display"
import { saveToFirebase } from "@/lib/firebase"
import type { Transcript } from "@/lib/types"

export default function Home() {
  const router = useRouter()
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState<Transcript | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [activeTab, setActiveTab] = useState("record")

  const handleAudioRecorded = (file: File) => {
    setAudioFile(file)
    setIsRecording(false)
  }

  const handleAudioUploaded = (file: File) => {
    setAudioFile(file)
  }

  const processAudio = async () => {
    if (!audioFile) return

    setIsProcessing(true)

    try {
      // Save the file to the audio-Uploads folder
      const formData = new FormData()
      formData.append("file", audioFile)

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload audio file")
      }

      const { fileName } = await uploadResponse.json()

      // Get transcription from the Flask API
      const transcriptResponse = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file_name: fileName }),
      })

      if (!transcriptResponse.ok) {
        throw new Error("Failed to get transcript")
      }

      const transcriptData = await transcriptResponse.json()
      setTranscript(transcriptData)
    } catch (error) {
      console.error("Error processing audio:", error)
      alert("Error processing audio. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const saveAsNotes = async () => {
    if (!transcript) return

    setIsSaving(true)
    setIsGeneratingSummary(true)

    try {
      // Get summary from the Flask API
      const speakerTranscript = transcript.transcript.map((item: any) => ({
        speaker: item.speaker,
        content: item.text,
      }))

      const summaryResponse = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: speakerTranscript,
          summary_type: "meeting",
          max_length: 300,
          min_length: 100,
        }),
      })

      if (!summaryResponse.ok) {
        throw new Error("Failed to get summary")
      }

      const summaryData = await summaryResponse.json()
      setIsGeneratingSummary(false)

      // Save to Firebase
      await saveToFirebase(transcript, summaryData)
      alert("Notes saved successfully!")

      // Navigate to notes page
      router.push("/notes")
    } catch (error) {
      console.error("Error saving notes:", error)
      alert("Error saving notes. Please try again.")
    } finally {
      setIsSaving(false)
      setIsGeneratingSummary(false)
    }
  }

  return (
    <main className="container mx-auto py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-purple-600 text-transparent bg-clip-text">
            SoundScript
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Record or upload your meetings and get instant transcriptions and summaries
          </p>
        </div>

        <div className="flex justify-end mb-6">
          <Button
            variant="outline"
            onClick={() => router.push("/notes")}
            className="border-purple-500 hover:bg-purple-500/10"
          >
            <FileText className="h-4 w-4 mr-2" />
            View Saved Notes
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="col-span-1 border-purple-800/30 shadow-lg shadow-purple-900/10">
            <CardHeader className="border-b border-purple-800/20">
              <CardTitle className="text-xl">Audio Input</CardTitle>
              <CardDescription>Record or upload an audio file to transcribe</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-secondary">
                  <TabsTrigger value="record" className="data-[state=active]:bg-purple-600">
                    Record Audio
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="data-[state=active]:bg-purple-600">
                    Upload Audio
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="record" className="mt-4">
                  <AudioRecorder
                    onAudioRecorded={handleAudioRecorded}
                    isRecording={isRecording}
                    setIsRecording={setIsRecording}
                  />
                </TabsContent>
                <TabsContent value="upload" className="mt-4">
                  <AudioUploader onAudioUploaded={handleAudioUploaded} />
                </TabsContent>
              </Tabs>

              {audioFile && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 p-3 bg-purple-900/20 rounded-md border border-purple-800/30">
                    <FileAudio className="h-5 w-5 text-purple-400" />
                    <span className="text-sm font-medium truncate">{audioFile.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t border-purple-800/20 pt-4">
              <Button
                onClick={processAudio}
                disabled={!audioFile || isProcessing}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Generate Transcript"
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card className="col-span-1 border-purple-800/30 shadow-lg shadow-purple-900/10">
            <CardHeader className="border-b border-purple-800/20">
              <CardTitle className="text-xl">Transcript</CardTitle>
              <CardDescription>View the transcript of your audio</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto pt-6">
              {transcript ? (
                <TranscriptDisplay transcript={transcript} />
              ) : (
                <div className="text-center py-16 text-gray-400">
                  <p>Process an audio file to see the transcript</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t border-purple-800/20 pt-4">
              <Button
                onClick={saveAsNotes}
                disabled={!transcript || isSaving}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isGeneratingSummary ? "Generating Summary..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save as Notes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  )
}
