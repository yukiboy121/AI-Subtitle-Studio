import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, videos } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { readFile } from "fs/promises";
import path from "path";
import { getUploadsDir } from "@/lib/upload-path";

const UPLOADS_DIR = getUploadsDir();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify project ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, session.userId)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get video record
    const projectVideos = await db
      .select()
      .from(videos)
      .where(eq(videos.projectId, id));

    if (projectVideos.length === 0) {
      return NextResponse.json({ error: "No video found for this project" }, { status: 404 });
    }

    const video = projectVideos[0];

    // Get Hugging Face API key from environment
    const hfApiKey = process.env.HUGGINGFACE_API_KEY;
    if (!hfApiKey) {
      return NextResponse.json(
        { error: "HUGGINGFACE_API_KEY is not set. Add it to your Vercel Environment Variables (it's free from huggingface.co)." },
        { status: 500 }
      );
    }

    // Read the video file from disk
    const videoFilePath = path.join(UPLOADS_DIR, session.userId, video.filename);
    let fileBuffer: Buffer;
    try {
      fileBuffer = await readFile(videoFilePath);
    } catch {
      return NextResponse.json(
        { error: "Video file not found on disk. It may have been cleaned up by the server." },
        { status: 404 }
      );
    }

    // Check file size (Hugging Face free API limit is ~25MB for audio)
    // For larger files, we'll try anyway as HF may handle it
    const fileSizeMB = fileBuffer.length / (1024 * 1024);
    
    // Parse request body for language preference
    let language = "sinhalese";
    try {
      const body = await req.json();
      if (body.language) language = body.language;
    } catch {
      // Default to sinhalese
    }

    // Send to Hugging Face Whisper API
    // Using whisper-large-v3 for best multilingual/Sinhala support
    const hfResponse = await fetch(
      "https://api-inference.huggingface.co/models/openai/whisper-large-v3",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfApiKey}`,
          "Content-Type": "application/octet-stream",
        },
        body: new Blob([fileBuffer]),
      }
    );

    if (!hfResponse.ok) {
      const errText = await hfResponse.text();
      
      // Check if model is loading
      if (hfResponse.status === 503) {
        return NextResponse.json(
          { error: "AI model is loading, please try again in 30 seconds.", loading: true },
          { status: 503 }
        );
      }

      // Check for file size limit
      if (hfResponse.status === 413) {
        return NextResponse.json(
          { error: `Video file is too large (${fileSizeMB.toFixed(1)}MB). The free AI API supports files up to ~25MB.` },
          { status: 413 }
        );
      }

      return NextResponse.json(
        { error: `AI transcription failed: ${errText}` },
        { status: hfResponse.status }
      );
    }

    const result = await hfResponse.json();

    // Hugging Face Whisper returns: { text: "full text" }
    // or with return_timestamps: { chunks: [{ text, timestamp: [start, end] }] }
    // The default response is just { text: "..." }
    
    let subtitleItems: { startTime: number; endTime: number; text: string }[] = [];

    if (result.chunks && Array.isArray(result.chunks)) {
      // If we got timestamped chunks
      subtitleItems = result.chunks
        .filter((chunk: any) => chunk.text && chunk.text.trim())
        .map((chunk: any, i: number) => ({
          startTime: chunk.timestamp?.[0] ?? i * 3,
          endTime: chunk.timestamp?.[1] ?? (i + 1) * 3,
          text: chunk.text.trim(),
        }));
    } else if (result.text) {
      // If we only got full text, split into sentences/segments
      const fullText = result.text.trim();
      if (fullText) {
        // Split by punctuation or every ~60 characters
        const segments = splitTextIntoSegments(fullText);
        const videoDuration = video.duration || 60;
        const segmentDuration = videoDuration / segments.length;

        subtitleItems = segments.map((seg: string, i: number) => ({
          startTime: parseFloat((i * segmentDuration).toFixed(2)),
          endTime: parseFloat(((i + 1) * segmentDuration).toFixed(2)),
          text: seg.trim(),
        }));
      }
    }

    if (subtitleItems.length === 0) {
      return NextResponse.json(
        { error: "AI could not detect any speech in the audio. Make sure the video has clear audio." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      subtitles: subtitleItems,
      language,
      totalSegments: subtitleItems.length,
    });
  } catch (error) {
    console.error("Generate subtitles error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Subtitle generation failed: ${msg}` },
      { status: 500 }
    );
  }
}

/**
 * Split a long text into subtitle-sized segments.
 * Tries to split at sentence boundaries (. ! ? ।) first,
 * then at commas, then by word count.
 */
function splitTextIntoSegments(text: string): string[] {
  // Try splitting by Sinhala/English sentence enders
  const sentences = text.split(/(?<=[.!?។।])\s+/).filter(s => s.trim());
  
  if (sentences.length >= 3) {
    // Merge very short sentences together
    const merged: string[] = [];
    let current = "";
    for (const s of sentences) {
      if (current.length + s.length < 80) {
        current = current ? `${current} ${s}` : s;
      } else {
        if (current) merged.push(current);
        current = s;
      }
    }
    if (current) merged.push(current);
    return merged;
  }

  // Fallback: split by commas or every ~60 chars
  const parts: string[] = [];
  const words = text.split(/\s+/);
  let current = "";
  for (const word of words) {
    if (current.length + word.length > 60) {
      if (current) parts.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) parts.push(current);
  return parts.length > 0 ? parts : [text];
}
