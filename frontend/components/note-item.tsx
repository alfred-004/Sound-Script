"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Clock } from "lucide-react"
import type { Note } from "@/lib/types"
import TranscriptDisplay from "@/components/transcript-display"
import SummaryDisplay from "@/components/summary-display"

interface NoteItemProps {
  note: Note
}

export default function NoteItem({ note }: NoteItemProps) {
  const [expanded, setExpanded] = useState(false)

  // Format date
  const formattedDate = note.createdAt ? new Date(note.createdAt).toLocaleString() : "Unknown date"

  // Get a preview of the transcript
  const previewText = note.transcript.transcript[0]?.text || "No transcript available"
  const truncatedPreview = previewText.length > 100 ? `${previewText.substring(0, 100)}...` : previewText

  return (
    <Card className="transition-all duration-200 border-purple-800/30 shadow-lg shadow-purple-900/10 hover:shadow-purple-900/20 hover:shadow-xl">
      <CardHeader className="pb-2 border-b border-purple-800/20">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              <span className="bg-gradient-to-r from-purple-400 to-purple-600 text-transparent bg-clip-text">
                Meeting Note - {note.id.substring(0, 6)}
              </span>
            </CardTitle>
            <CardDescription className="flex items-center mt-1 text-gray-400">
              <Clock className="h-3 w-3 mr-1" />
              {formattedDate}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Collapse note" : "Expand note"}
            className="hover:bg-purple-500/10"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className={expanded ? "pt-6" : "py-4"}>
        {!expanded ? (
          <div>
            <p className="text-sm text-purple-400 mb-2">Summary:</p>
            <p className="text-sm">{note.summary.summary.substring(0, 150)}...</p>
            <p className="text-xs text-gray-500 mt-3 italic">Click to expand for full details</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-md font-medium mb-3 text-purple-400">Transcript</h3>
                <TranscriptDisplay transcript={note.transcript} />
              </div>
              <div>
                <h3 className="text-md font-medium mb-3 text-purple-400">Summary</h3>
                <SummaryDisplay summary={note.summary} />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
