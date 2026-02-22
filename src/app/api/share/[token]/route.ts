import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const recording = await prisma.recording.findUnique({
      where: { shareToken: token },
      include: {
        user: {
          select: { name: true },
        },
      },
    });

    if (!recording) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      recording: {
        id: recording.id,
        title: recording.title,
        transcript: recording.transcript,
        summary: recording.summary,
        status: recording.status,
        createdAt: recording.createdAt,
        author: recording.user.name || "Anonymous",
      },
    });
  } catch (error) {
    console.error("Share error:", error);
    return NextResponse.json(
      { error: "Failed to fetch shared recording" },
      { status: 500 }
    );
  }
}
