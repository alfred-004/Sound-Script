import { Card, CardContent } from "@/components/ui/card"
import type { Transcript } from "@/lib/types"

interface TranscriptDisplayProps {
  transcript: Transcript
}

export default function TranscriptDisplay({ transcript }: TranscriptDisplayProps) {
  return (
    <Card className="border-purple-800/30 bg-black/40">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="text-sm">
            {transcript.transcript.map((item, index) => (
              <div key={index} className="mb-3 pb-3 border-b border-purple-800/20 last:border-0">
                <div className="font-semibold text-purple-400">{item.speaker}</div>
                <div className="text-xs text-gray-500 mb-1">{item.timestamp}</div>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
