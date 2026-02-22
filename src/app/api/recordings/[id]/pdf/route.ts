import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import PDFDocument from "pdfkit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recording = await prisma.recording.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    if (!recording) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    if (!recording.transcript) {
      return NextResponse.json(
        { error: "Transcript not yet available" },
        { status: 400 }
      );
    }

    // Generate PDF
    const pdfBuffer = await generatePDF(recording);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${recording.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

interface RecordingWithUser {
  title: string;
  transcript: string | null;
  summary: string | null;
  createdAt: Date;
  user: {
    name: string | null;
    email: string;
  };
}

async function generatePDF(recording: RecordingWithUser): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 50,
      size: "A4",
      info: {
        Title: recording.title,
        Author: recording.user.name || recording.user.email,
      },
    });

    const chunks: Uint8Array[] = [];
    doc.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .fillColor("#1a1a2e")
      .text("VoiceScribe", { align: "center" });

    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#666666")
      .text("Audio Recording Transcript & Summary", { align: "center" });

    // Divider
    doc.moveDown(0.5);
    doc
      .strokeColor("#e0e0e0")
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown(0.5);

    // Recording Info
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .fillColor("#1a1a2e")
      .text(recording.title);

    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#888888")
      .text(
        `Created: ${new Date(recording.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`
      );

    doc.text(`By: ${recording.user.name || recording.user.email}`);

    doc.moveDown(1);

    // Summary Section
    if (recording.summary) {
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("#16213e")
        .text("Summary");

      doc.moveDown(0.3);
      doc
        .strokeColor("#4361ee")
        .lineWidth(2)
        .moveTo(50, doc.y)
        .lineTo(120, doc.y)
        .stroke();

      doc.moveDown(0.5);

      // Parse and render summary (handle markdown-like formatting)
      const summaryLines = recording.summary.split("\n");
      for (const line of summaryLines) {
        const trimmed = line.trim();
        if (!trimmed) {
          doc.moveDown(0.3);
          continue;
        }

        if (trimmed.startsWith("# ") || trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
          const headerText = trimmed.replace(/^#{1,3}\s/, "");
          doc
            .fontSize(12)
            .font("Helvetica-Bold")
            .fillColor("#1a1a2e")
            .text(headerText);
          doc.moveDown(0.2);
        } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ")) {
          const bulletText = trimmed.replace(/^[-•*]\s/, "");
          doc
            .fontSize(10)
            .font("Helvetica")
            .fillColor("#333333")
            .text(`  •  ${bulletText.replace(/\*\*/g, "")}`, { indent: 10 });
        } else {
          doc
            .fontSize(10)
            .font("Helvetica")
            .fillColor("#333333")
            .text(trimmed.replace(/\*\*/g, ""));
        }
      }
    }

    doc.moveDown(1);

    // Transcript Section
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#16213e")
      .text("Full Transcript");

    doc.moveDown(0.3);
    doc
      .strokeColor("#4361ee")
      .lineWidth(2)
      .moveTo(50, doc.y)
      .lineTo(150, doc.y)
      .stroke();

    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#333333")
      .text(recording.transcript || "No transcript available.", {
        align: "justify",
        lineGap: 4,
      });

    // Footer
    doc.moveDown(2);
    doc
      .strokeColor("#e0e0e0")
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown(0.5);
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#999999")
      .text("Generated by VoiceScribe • AI-Powered Audio Transcription", {
        align: "center",
      });

    doc.end();
  });
}
