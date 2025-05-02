import { initializeApp } from "firebase/app"
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore"
import type { Transcript, Summary, Note } from "./types"

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase
let app
let db

try {
  app = initializeApp(firebaseConfig)
  db = getFirestore(app)
} catch (error) {
  console.error("Firebase initialization error:", error)
}

export async function saveToFirebase(transcript: Transcript, summary: Summary) {
  try {
    if (!db) throw new Error("Firebase not initialized")

    console.log("Saving to Firebase:", { transcript, summary })

    // Create a clean object structure for Firestore
    const noteData = {
      transcript: {
        consolidated_text: transcript.consolidated_text,
        readable_transcript: transcript.readable_transcript,
        status: transcript.status,
        transcript: transcript.transcript.map((item) => ({
          speaker: item.speaker,
          text: item.text,
          timestamp: item.timestamp,
        })),
      },
      summary: {
        key_points: summary.key_points,
        status: summary.status,
        summary: summary.summary,
        summary_type: summary.summary_type,
      },
      createdAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, "notes"), noteData)

    console.log("Document written with ID:", docRef.id)
    return docRef.id
  } catch (error) {
    console.error("Error adding document:", error)
    throw error
  }
}

export async function getNotes(): Promise<Note[]> {
  try {
    if (!db) throw new Error("Firebase not initialized")

    const q = query(collection(db, "notes"), orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)

    const notes: Note[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      notes.push({
        id: doc.id,
        transcript: data.transcript,
        summary: data.summary,
        createdAt:
          data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      })
    })

    console.log("Retrieved notes:", notes)
    return notes
  } catch (error) {
    console.error("Error getting notes:", error)
    throw error
  }
}
