export interface TranscriptItem {
  speaker: string
  text: string
  timestamp: string
}

export interface Transcript {
  consolidated_text: Record<string, string>
  readable_transcript: string
  status: string
  transcript: TranscriptItem[]
}

export interface Summary {
  key_points: string[]
  status: string
  summary: string
  summary_type: string
}

export interface Note {
  id: string
  transcript: Transcript
  summary: Summary
  createdAt: string
}
