# Audio Transcription & Notes

A full-stack application for recording, transcribing, and summarizing audio recordings with speaker diarization and AI-powered summaries.

![App Screenshot](https://api.placeholder.com/800/400)

## Features

- **Audio Recording & Uploading**: Record audio directly in the browser or upload existing audio files
- **Advanced Transcription**: Powered by WhisperX for state-of-the-art speech recognition
- **Speaker Diarization**: Identifies different speakers in conversations using Pyannote
- **AI-Powered Summarization**: Abstractive summarization with PEGASUS model
- **Notes Management**: Save, categorize, and revisit your transcriptions and summaries

## Tech Stack

### Frontend
- **Next.js**: React framework with server components 
- **TypeScript**: For type-safe code
- **TailwindCSS & shadcn/ui**: For styling and UI components
- **Firebase**: For authentication and data storage

### Backend
- **Flask API**: Python backend for ML model integration
- **WhisperX**: State-of-the-art speech recognition model
- **Pyannote Audio**: Speaker diarization to identify different speakers
- **PEGASUS**: Abstractive summarization model for meeting notes

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- Python 3.9+
- CUDA-capable GPU (recommended for faster transcription)
- Firebase account

### Installation

#### Frontend Setup

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/audio-transcription-notes.git
   cd audio-transcription-notes
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env.local` file with your environment variables
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
   FLASK_API_URL=http://localhost:5000
   ```

#### Backend Setup

1. Set up a Python virtual environment
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install required Python packages
   ```bash
   pip install torch torchaudio ffmpeg-python whisperx pyannote.audio transformers sentencepiece
   pip install git+https://github.com/m-bain/whisperx.git
   pip install flask flask-cors numpy pandas
   ```

3. Set up environment variables in a `.env` file
   ```
   HF_TOKEN=your_huggingface_token  # For accessing Hugging Face models
   ```

### Running the Application

1. Start the Flask backend
   ```bash
   cd backend
   python app.py
   ```

2. Start the Next.js frontend (in a separate terminal)
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000 in your browser

## How It Works

1. **Audio Capture**: Users can record audio directly in the browser or upload an audio file
2. **Transcription Process**:
   - Audio is sent to the backend Flask API
   - WhisperX processes the audio for accurate speech-to-text
   - Pyannote Audio performs speaker diarization to identify speakers
3. **Summarization**:
   - PEGASUS model generates abstractive summaries of meetings/conversations
4. **Note Management**:
   - Transcripts and summaries are saved to Firebase
   - Users can organize, search, and revisit their notes

## API Routes

### Frontend API Routes (Next.js)

- `POST /api/upload`: Uploads audio files to temporary storage
- `POST /api/transcribe`: Sends audio to Flask API for transcription
- `POST /api/summarize`: Sends transcript to Flask API for PEGASUS-based summarization

### Backend API Routes (Flask)

- `POST /api/whisperx`: Processes audio with WhisperX and Pyannote
- `POST /api/summarize`: Generates abstractive summaries with PEGASUS

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [WhisperX](https://github.com/m-bain/whisperX) for enhanced speech recognition
- [Pyannote Audio](https://github.com/pyannote/pyannote-audio) for speaker diarization
- [PEGASUS](https://huggingface.co/google/pegasus-cnn_dailymail) for abstractive summarization