import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subtitles, subtitleTracks } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { generateSRT, generateVTT } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "srt";

    const tracks = await db.select().from(subtitleTracks).where(eq(subtitleTracks.projectId, id));
    if (tracks.length === 0) return NextResponse.json({ error: "No subtitles" }, { status: 404 });

    const subs = await db.select().from(subtitles).where(eq(subtitles.trackId, tracks[0].id));
    const sortedSubs = subs.sort((a, b) => a.startTime - b.startTime);

    let content: string;
    let contentType: string;
    let extension: string;

    switch (format) {
      case "vtt":
        content = generateVTT(sortedSubs);
        contentType = "text/vtt";
        extension = "vtt";
        break;
      case "txt":
        content = sortedSubs.map((s) => s.text).join("\n");
        contentType = "text/plain";
        extension = "txt";
        break;
      case "srt":
      default:
        content = generateSRT(sortedSubs);
        contentType = "application/x-subrip";
        extension = "srt";
        break;
    }

    return new NextResponse(content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="subtitles.${extension}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
