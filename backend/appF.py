import os
import numpy as np
import ffmpeg
import whisperx
from pyannote.audio import Pipeline
import torch
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from dotenv import load_dotenv
from pyannote.core import Annotation
from transformers import PegasusForConditionalGeneration, PegasusTokenizer

# Load environment variables from .env
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Force CPU usage
device = "cpu"
torch.set_num_threads(4)

# Load WhisperX model
try:
    whisper_model = whisperx.load_model(
        "small.en",
        device,
        compute_type="int8",
        language="en"
    )
except Exception as e:
    logger.error(f"Failed to load WhisperX model: {str(e)}")
    raise RuntimeError(f"WhisperX initialization failed: {str(e)}")

# Load diarization pipeline
try:
    diarization_pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-3.1",
        use_auth_token=os.getenv("HUGGINGFACE_TOKEN")
    )
except Exception as e:
    logger.warning(f"Could not load PyAnnote diarization: {str(e)}. Proceeding without diarization.")
    diarization_pipeline = None

# Load Pegasus summarization model
try:
    # Use the Pegasus model fine-tuned on the AMI corpus for meeting summarization
    summarization_model_name = "google/pegasus-ami" 
    
    # If the specific AMI-tuned model isn't available, fall back to a standard model
    try:
        summarization_tokenizer = PegasusTokenizer.from_pretrained(summarization_model_name)
        summarization_model = PegasusForConditionalGeneration.from_pretrained(summarization_model_name).to(device)
    except Exception:
        logger.warning("AMI-specific model not found, falling back to standard Pegasus model")
        summarization_model_name = "google/pegasus-xsum"
        summarization_tokenizer = PegasusTokenizer.from_pretrained(summarization_model_name)
        summarization_model = PegasusForConditionalGeneration.from_pretrained(summarization_model_name).to(device)
    
    logger.info(f"Loaded summarization model: {summarization_model_name}")
except Exception as e:
    logger.warning(f"Could not load summarization model: {str(e)}. Summarization will be unavailable.")
    summarization_model = None
    summarization_tokenizer = None

# Upload directory
UPLOAD_DIR = "../audio-Uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
logger.info(f"Upload directory set to: {UPLOAD_DIR}")

def convert_to_wav(input_path: str, output_path: str, sampling_rate: int = 16000):
    try:
        (
            ffmpeg.input(input_path)
            .output(output_path, format="wav", acodec="pcm_s16le", ac=1, ar=sampling_rate)
            .overwrite_output()
            .run(quiet=True)
        )
    except ffmpeg.Error as e:
        logger.error(f"FFmpeg conversion error: {e}")
        raise Exception("Failed to convert input file to WAV.")

def load_audio(file_path: str, sampling_rate: int = 16000) -> np.ndarray:
    try:
        out, _ = (
            ffmpeg.input(file_path)
            .output("pipe:", format="wav", acodec="pcm_s16le", ac=1, ar=sampling_rate)
            .run(capture_stdout=True, capture_stderr=True)
        )
        audio = np.frombuffer(out, np.int16).astype(np.float32) / 32768.0
        return audio
    except ffmpeg.Error as e:
        logger.error(f"FFmpeg audio loading error: {e}")
        raise Exception("Failed to load audio.")

def format_diarization_for_whisperx(diarization):
    """Convert the PyAnnote diarization output to a format compatible with WhisperX"""
    segments = []
    for segment, track, label in diarization.itertracks(yield_label=True):
        segments.append({
            "speaker": label,
            "start": segment.start,
            "end": segment.end
        })
    return segments

def transcribe_and_diarize(file_path: str) -> list:
    try:
        # Convert input audio to .wav for PyAnnote
        wav_path = os.path.splitext(file_path)[0] + ".wav"
        convert_to_wav(file_path, wav_path)

        audio = load_audio(wav_path)
        result = whisper_model.transcribe(audio, batch_size=8)

        model_a, metadata = whisperx.load_align_model(language_code="en", device=device)
        aligned_result = whisperx.align(
            result["segments"], model_a, metadata, audio, device, return_char_alignments=False
        )

        good_segments = [
            seg for seg in aligned_result["segments"]
            if isinstance(seg, dict) and "start" in seg and "end" in seg
        ]
        aligned_result["segments"] = good_segments

        if diarization_pipeline:
            try:
                # Process the diarization
                diarization = diarization_pipeline(wav_path)

                if not isinstance(diarization, Annotation):
                    raise ValueError("Invalid diarization result.")

                # Convert diarization to the format expected by WhisperX
                diarization_segments = format_diarization_for_whisperx(diarization)
                
                # Make sure we have the expected structure for WhisperX
                if not diarization_segments:
                    raise ValueError("No diarization segments found")
                    
                # Try the assign_word_speakers function with proper error handling
                try:
                    final_result = whisperx.assign_word_speakers(diarization, aligned_result)
                    return final_result["segments"]
                except KeyError as e:
                    logger.warning(f"KeyError in assign_word_speakers: {e}. Using manual assignment.")
                    
                    # Manual fallback for speaker assignment
                    for seg in good_segments:
                        # Find the speaker who talks the most during this segment
                        max_overlap = 0
                        speaker = "Unknown"
                        
                        for d_seg in diarization_segments:
                            # Calculate overlap duration
                            overlap_start = max(seg["start"], d_seg["start"])
                            overlap_end = min(seg["end"], d_seg["end"])
                            overlap = max(0, overlap_end - overlap_start)
                            
                            if overlap > max_overlap:
                                max_overlap = overlap
                                speaker = d_seg["speaker"]
                        
                        seg["speaker"] = speaker
                    
                    return good_segments
                    
            except Exception as e:
                logger.warning(f"Diarization processing error: {str(e)}. Proceeding without diarization.")
                for seg in good_segments:
                    seg["speaker"] = "Unknown"
                return good_segments
        else:
            for seg in good_segments:
                seg["speaker"] = "Unknown"
            return good_segments

    except Exception as err:
        logger.exception("Transcription/diarization error occurred")
        raise Exception(f"Transcription error: {str(err)}")

def format_timestamp(seconds):
    """Convert seconds to a formatted timestamp (MM:SS.ms)"""
    minutes = int(seconds // 60)
    seconds_remainder = seconds % 60
    return f"{minutes:02d}:{seconds_remainder:06.3f}"

def format_transcript_output(segments):
    """Format the transcript segments into a simplified format with only timestamps and speakers"""
    formatted_transcript = []
    consolidated_by_speaker = {}
    
    for segment in segments:
        speaker = segment.get("speaker", "Unknown")
        # Format speaker name to just speaker number
        formatted_speaker = f"Speaker {int(speaker.replace('SPEAKER_', ''))}" if speaker.startswith("SPEAKER_") else speaker
        start_time = format_timestamp(segment.get("start", 0))
        end_time = format_timestamp(segment.get("end", 0))
        text = segment.get("text", "").strip()
        
        # Format the timestamp as [MM:SS.ms - MM:SS.ms]
        timestamp = f"{start_time} - {end_time}"
        
        # Add the simplified segment
        formatted_transcript.append({
            "speaker": formatted_speaker,
            "text": text,
            "timestamp": timestamp
        })
        
        # Also collect text for the consolidated view
        if speaker not in consolidated_by_speaker:
            consolidated_by_speaker[speaker] = []
        consolidated_by_speaker[speaker].append(text)
    
    # Create simplified consolidated output
    simplified_consolidated = {}
    for speaker, texts in consolidated_by_speaker.items():
        formatted_speaker = f"Speaker {int(speaker.replace('SPEAKER_', ''))}" if speaker.startswith("SPEAKER_") else speaker
        simplified_consolidated[formatted_speaker] = " ".join(texts)
    
    # Return both the formatted transcript and the consolidated dictionary
    return formatted_transcript, simplified_consolidated


def generate_summary(transcript_segments, max_length=1024, min_length=56, summary_type="meeting"):
    """Generate a summary using the Pegasus model"""
    if summarization_model is None or summarization_tokenizer is None:
        raise Exception("Summarization model is not available")
    
    # Format the transcript for summarization
    if summary_type == "meeting":
        # For meeting summaries, we want to preserve speaker information
        formatted_text = ""
        current_speaker = None
        
        for segment in transcript_segments:
            speaker = segment.get("speaker", "Unknown")
            text = segment.get("text", "").strip()
            
            if not text:
                continue
                
            if speaker != current_speaker:
                formatted_text += f"\n{speaker}: "
                current_speaker = speaker
                
            formatted_text += f"{text} "
    else:
        # For general summaries, we can just concatenate the text
        formatted_text = " ".join([seg.get("text", "").strip() for seg in transcript_segments if seg.get("text")])
    
    # Truncate to prevent exceeding token limits
    if len(formatted_text) > 8000:
        formatted_text = formatted_text[:8000] + "..."
    
    # Generate the summary
    inputs = summarization_tokenizer(formatted_text, return_tensors="pt", truncation=True, max_length=1024).to(device)
    summary_ids = summarization_model.generate(
        inputs["input_ids"], 
        num_beams=4,
        max_length=max_length,
        min_length=min_length,
        length_penalty=2.0,
        early_stopping=True
    )
    
    summary = summarization_tokenizer.decode(summary_ids[0], skip_special_tokens=True)
    return summary

@app.route('/transcribe', methods=['POST'])
def transcribe():
    data = request.get_json()
    file_name = data.get('file_name')

    if not file_name:
        return jsonify({"error": "No file name provided"}), 400

    file_path = os.path.join(UPLOAD_DIR, file_name)

    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404

    try:
        segments = transcribe_and_diarize(file_path)
        
        # Get simplified formatted output
        formatted_output, consolidated_text = format_transcript_output(segments)
        
        # Create a clean readable transcript string
        readable_transcript = ""
        last_speaker = None
        
        for item in formatted_output:
            speaker = item["speaker"]
            
            # Only print the speaker name when it changes
            if speaker != last_speaker:
                readable_transcript += f"\n{speaker}\n"
                last_speaker = speaker
                
            readable_transcript += f"  {item['timestamp']} {item['text']}\n"
        
        # Remove the raw segments and word-level details
        simplified_segments = []
        for segment in segments:
            simplified_segments.append({
                "speaker": f"Speaker {int(segment['speaker'].replace('SPEAKER_', ''))}" if segment['speaker'].startswith("SPEAKER_") else segment['speaker'],
                "text": segment.get("text", ""),
                "timestamp": f"{format_timestamp(segment.get('start', 0))} - {format_timestamp(segment.get('end', 0))}"
            })
        
        return jsonify({
            "status": "success",
            "transcript": formatted_output,
            "readable_transcript": readable_transcript.strip(),
            "consolidated_text": consolidated_text
        })
    except Exception as e:
        logger.error(f"Error during transcription: {str(e)}")
        return jsonify({"error": str(e)}), 500



@app.route('/summarize', methods=['POST'])
def summarize():
    """Generate a summary from a transcript"""
    data = request.get_json()
    print("Received payload:", data)
    
    # Option 1: Summarize from an audio file
    file_name = data.get('file_name')
    # Option 2: Summarize from provided transcript segments
    segments = data.get('segments')
    # Option 3: Accept the 'transcript' field that's actually being sent
    transcript = data.get('transcript')
    
    summary_type = data.get('summary_type', 'meeting')  # Default to meeting summary
    max_length = data.get('max_length', 300)  # Default max summary length
    min_length = data.get('min_length', 56)   # Default min summary length
    
    try:
        if summarization_model is None:
            return jsonify({"error": "Summarization model not available"}), 503
            
        transcript_segments = None
        
        # If file name is provided, transcribe first
        if file_name:
            file_path = os.path.join(UPLOAD_DIR, file_name)
            if not os.path.exists(file_path):
                return jsonify({"error": "Audio file not found"}), 404
                
            transcript_segments = transcribe_and_diarize(file_path)
        
        # If segments are provided directly, use those instead
        elif segments:
            transcript_segments = segments
        
        # If transcript is provided, use it (this is the format in your payload)
        elif transcript:
            transcript_segments = transcript
        
        else:
            return jsonify({"error": "Either file_name, segments, or transcript must be provided"}), 400
            
        # Generate the summary
        summary = generate_summary(
            transcript_segments, 
            max_length=max_length,
            min_length=min_length,
            summary_type=summary_type
        )
        
        # Extract key points from the summary
        key_points = []
        for sentence in summary.split(". "):
            if len(sentence) > 10:  # Ignore very short sentences
                key_points.append(sentence.strip() + ".")
        
        return jsonify({
            "status": "success",
            "summary": summary,
            "key_points": key_points,
            "summary_type": summary_type
        })
        
    except Exception as e:
        logger.error(f"Error during summarization: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=8000)
