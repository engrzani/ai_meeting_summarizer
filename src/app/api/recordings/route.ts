import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import prisma from "@/lib/prisma";
import openai from "@/lib/openai";
import { generateShareToken } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const title = (formData.get("title") as string) || "Untitled Recording";
    const language = (formData.get("language") as string) || "en";

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Upload audio to Vercel Blob
    const blob = await put(`recordings/${session.user.id}/${Date.now()}.webm`, audioFile, {
      access: "public",
      contentType: audioFile.type || "audio/webm",
    });

    // Create recording entry in database
    const recording = await prisma.recording.create({
      data: {
        title,
        audioUrl: blob.url,
        status: "processing",
        shareToken: generateShareToken(),
        userId: session.user.id,
      },
    });

    // Process in background - transcribe and summarize
    processRecording(recording.id, blob.url, language).catch(console.error);

    return NextResponse.json({ recording }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload recording" },
      { status: 500 }
    );
  }
}

async function processRecording(recordingId: string, audioUrl: string, language: string = "en") {
  try {
    // Fetch audio file for transcription (parallel with status update)
    const [audioResponse] = await Promise.all([
      fetch(audioUrl),
      prisma.recording.update({
        where: { id: recordingId },
        data: { status: "transcribing" },
      })
    ]);
    
    const audioBuffer = await audioResponse.arrayBuffer();
    const audioFile = new File([audioBuffer], "audio.webm", {
      type: "audio/webm",
    });

    // Transcribe using OpenAI Whisper (always auto-detect for accuracy)
    const transcriptionPromise = openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "text",
      // Don't specify language - let Whisper auto-detect for best accuracy
    });

    // Update status to summarizing and get transcription in parallel
    const [transcription] = await Promise.all([
      transcriptionPromise,
      prisma.recording.update({
        where: { id: recordingId },
        data: { status: "summarizing" },
      })
    ]);
    
    // Save transcript
    await prisma.recording.update({
      where: { id: recordingId },
      data: { transcript: transcription },
    });

    // Language names mapping
    const languageNames: { [key: string]: string } = {
      en: "English",
      ur: "Urdu",
      hi: "Hindi",
      ar: "Arabic",
      es: "Spanish",
      fr: "French",
      de: "German",
      zh: "Chinese",
      ja: "Japanese",
      ko: "Korean",
      pt: "Portuguese",
      ru: "Russian",
      it: "Italian",
      tr: "Turkish",
      auto: "the original language"
    };
    const targetLanguage = languageNames[language] || "English";

    // Generate summary using GPT
    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert meeting intelligence assistant. Your task is to analyze transcripts and create professional, structured summaries in ${targetLanguage}.

YOU MUST follow this EXACT format - do not skip any section:

## Overview
[Write 2-3 sentences summarizing the main purpose and outcome of this meeting/discussion]

## Key Topics Discussed
[List each major topic with details]
- **[Topic 1]**: [What was discussed about this topic]
- **[Topic 2]**: [What was discussed about this topic]
- **[Topic 3]**: [What was discussed about this topic]

## Action Items
[List specific tasks, to-dos, or follow-ups mentioned. If none exist, write "No specific action items identified"]
- [ ] [Action item 1]
- [ ] [Action item 2]

## Key Decisions
[List important decisions made. If none exist, write "No specific decisions recorded"]
- [Decision 1]
- [Decision 2]

## Important Details & Notes
[Extract key facts, numbers, dates, names, and other important information]
- [Detail 1]
- [Detail 2]
- [Detail 3]

---

CRITICAL RULES:
1. MUST include ALL sections above (Overview, Key Topics, Action Items, Key Decisions, Important Details)
2. Use proper markdown with ## headers, - bullets, and **bold** for emphasis
3. Write in ${targetLanguage} language
4. Be professional but concise
5. Extract real information from the transcript - never fabricate
6. If a section has no content, still include the header with "No [section name] identified"`,
        },
        {
          role: "user",
          content: `Please analyze this transcript and create a structured summary following the EXACT format specified:\n\n${transcription}`,
        },
      ],
      max_tokens: 3000, // Reduced from 4000 for faster response
      temperature: 0.3, // Lower for faster, more consistent output
    });

    let summary = summaryResponse.choices[0]?.message?.content || "No summary generated.";
    
    // Add footer to summary
    if (summary && summary !== "No summary generated.") {
      summary += "\n\n---\n*Summary generated by VoiceScribe AI*";
    }

    // Update recording with results
    await prisma.recording.update({
      where: { id: recordingId },
      data: {
        summary,
        status: "completed",
      },
    });
  } catch (error) {
    console.error("Processing error:", error);
    await prisma.recording.update({
      where: { id: recordingId },
      data: { status: "error" },
    });
  }
}
