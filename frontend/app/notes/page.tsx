"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { getNotes } from "@/lib/firebase"
import type { Note } from "@/lib/types"
import NoteItem from "@/components/note-item"

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const fetchedNotes = await getNotes()
        setNotes(fetchedNotes)
      } catch (error) {
        console.error("Error fetching notes:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotes()
  }, [])

  return (
    <main className="container mx-auto py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 text-transparent bg-clip-text">
            Saved Notes
          </h1>
          <Link href="/">
            <Button variant="outline" className="border-purple-500 hover:bg-purple-500/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Recorder
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 animate-spin text-purple-500 mb-4" />
              <p className="text-gray-400">Loading your notes...</p>
            </div>
          </div>
        ) : notes.length === 0 ? (
          <Card className="border-purple-800/30 shadow-lg shadow-purple-900/10">
            <CardContent className="py-20">
              <div className="text-center">
                <p className="text-gray-400 mb-6">No notes found</p>
                <Link href="/">
                  <Button className="bg-purple-600 hover:bg-purple-700">Record Your First Note</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {notes.map((note) => (
              <NoteItem key={note.id} note={note} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
