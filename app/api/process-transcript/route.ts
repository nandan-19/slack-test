
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface ActionableItem {
  id: string;
  type: 'jira_create' | 'calendar_create' ;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  metadata: any;
  confidence: number;
}

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json();

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
    }

    // Use Gemini 1.5 Pro for complex reasoning tasks
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `You are an AI assistant that analyzes meeting transcripts and extracts actionable items. 

Your task is to:
1. Identify action items, tasks, issues, and follow-ups
2. Detect scheduling requests for future meetings
3. Classify each item as one of: jira_create, calendar_create
4. Extract relevant metadata for each action

For JIRA items, extract:
- Issue type (Bug, Task, Story, etc.)
- Priority (High, Medium, Low)
- Assignee (if mentioned)
- Due date (if mentioned)
- Labels/components( give a single word, no spaces)

For Calendar items, extract:
- Meeting title
- Participants (if mentioned)
- Proposed date/time
- Duration
- Meeting type (follow-up, review, etc.)

Return a JSON array of actionable items with this structure:
{
  "id": "unique_id",
  "type": "jira_create|calendar_create",
  "title": "Brief title",
  "description": "Detailed description",
  "priority": "high|medium|low",
  "confidence": 0.85,
  "metadata": {
    // Type-specific fields
  }
}

Only extract items that have clear actionable intent. Be conservative with confidence scores.`;

    const prompt = `${systemPrompt}\n\nAnalyze this meeting transcript and extract actionable items:\n\n${transcript}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (!text) {
      throw new Error('No response from Gemini');
    }

    // Parse the JSON response
    let actionableItems: ActionableItem[];
    try {
      actionableItems = JSON.parse(text);
    } catch (e) {
      // If JSON parsing fails, try to extract JSON from the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        actionableItems = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response from Gemini');
      }
    }

    return NextResponse.json({
      success: true,
      actionableItems,
      summary: await generateSummary(transcript)
    });

  } catch (error) {
    console.error('Gemini processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process transcript' },
      { status: 500 }
    );
  }
}

async function generateSummary(transcript: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = "Create a concise, professional meeting summary. Include key decisions, discussion points, and outcomes. Keep it under 200 words.\n\n" + transcript;

  const result = await model.generateContent(prompt);
  const response = result.response;
  
  return response.text() || 'Summary unavailable';
}
