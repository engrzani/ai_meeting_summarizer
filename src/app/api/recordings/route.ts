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
    processRecording(recording.id, blob.url).catch(console.error);

    return NextResponse.json({ recording }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload recording" },
      { status: 500 }
    );
  }
}

async function processRecording(recordingId: string, audioUrl: string) {
  try {
    // Update status to transcribing
    await prisma.recording.update({
      where: { id: recordingId },
      data: { status: "transcribing" },
    });

    // Fetch audio file for transcription
    const audioResponse = await fetch(audioUrl);
    const audioBuffer = await audioResponse.arrayBuffer();
    const audioFile = new File([audioBuffer], "audio.webm", {
      type: "audio/webm",
    });

    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "text",
    });

    // Update status to summarizing
    await prisma.recording.update({
      where: { id: recordingId },
      data: {
        transcript: transcription,
        status: "summarizing",
      },
    });

    // Generate summary using GPT
    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert summarizer. Create a clear, well-structured summary of the following transcript. Include key points as bullet points, and provide a brief overall summary at the top. Format using markdown.",
        },
        {
          role: "user",
          content: `Please summarize the following transcript:\n\n${transcription}`,
        },
      ],
      max_tokens: 1500,
    });

    const summary = summaryResponse.choices[0]?.message?.content || "No summary generated.";

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
