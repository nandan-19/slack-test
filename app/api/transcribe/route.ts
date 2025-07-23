
import { NextRequest, NextResponse } from 'next/server';
import { AssemblyAI } from 'assemblyai';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AssemblyAI API key not found' }, 
        { status: 500 }
      );
    }

    const client = new AssemblyAI({ apiKey });
    
    // Get the file from FormData
    const formData = await request.formData();
    const file = formData.get('audio') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No audio file provided' }, 
        { status: 400 }
      );
    }

    // Convert file to buffer for AssemblyAI
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload file to AssemblyAI
    const uploadUrl = await client.files.upload(buffer);

    // Create transcript with meeting-focused features
    const transcript = await client.transcripts.transcribe({
      audio: uploadUrl,
      speaker_labels: true,          // Who spoke what
      auto_highlights: true,         // Key topics
      sentiment_analysis: true,      // Meeting sentiment
      entity_detection: true,        // Names, places, etc
      summarization: true,          // Meeting summary
      summary_model: 'conversational',
      summary_type: 'bullets'
    });
    console.log("transcript", transcript);

    return NextResponse.json({
      id: transcript.id,
      status: transcript.status,
      text: transcript.text,
      confidence: transcript.confidence,
      summary: transcript.summary,
      chapters: transcript.chapters,
      speakers: transcript.utterances,
      highlights: transcript.auto_highlights_result,
      entities: transcript.entities
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Transcription failed' }, 
      { status: 500 }
    );
  }
}

// GET endpoint for polling transcript status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transcriptId = searchParams.get('id');
    
    if (!transcriptId) {
      return NextResponse.json(
        { error: 'Transcript ID required' }, 
        { status: 400 }
      );
    }

    const apiKey = process.env.ASSEMBLYAI_API_KEY!;
    const client = new AssemblyAI({ apiKey });
    
    const transcript = await client.transcripts.get(transcriptId);
    
    return NextResponse.json({
      id: transcript.id,
      status: transcript.status,
      text: transcript.text,
      confidence: transcript.confidence,
      summary: transcript.summary,
      chapters: transcript.chapters,
      speakers: transcript.utterances,
      highlights: transcript.auto_highlights_result,
      entities: transcript.entities
    });

  } catch (error) {
    console.error('Error fetching transcript:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcript' }, 
      { status: 500 }
    );
  }
}
