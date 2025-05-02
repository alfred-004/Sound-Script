import { Card, CardContent } from "@/components/ui/card"
import type { Summary } from "@/lib/types"

interface SummaryDisplayProps {
  summary: Summary
}

export default function SummaryDisplay({ summary }: SummaryDisplayProps) {
  return (
    <Card className="border-purple-800/30 bg-black/40">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="text-sm">
            <p>{summary.summary}</p>
          </div>

          {summary.key_points && summary.key_points.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2 text-purple-400">Key Points:</h4>
              <ul className="list-disc pl-5 space-y-2">
                {summary.key_points.map((point, index) => (
                  <li key={index} className="text-sm">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
