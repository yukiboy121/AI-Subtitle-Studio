import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subtitles, subtitleTracks, projects } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const tracks = await db.select().from(subtitleTracks).where(eq(subtitleTracks.projectId, id));
    if (tracks.length === 0) return NextResponse.json({ subtitles: [] });

    const subs = await db.select().from(subtitles).where(eq(subtitles.trackId, tracks[0].id));
    return NextResponse.json({ subtitles: subs.sort((a, b) => a.startTime - b.startTime) });
  } catch (error) {
    console.error("Get subtitles error:", error);
    return NextResponse.json({ error: "Failed to get subtitles" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const body = await req.json();

    const tracks = await db.select().from(subtitleTracks).where(eq(subtitleTracks.projectId, id));
    let trackId: string;
    if (tracks.length === 0) {
      const [newTrack] = await db
        .insert(subtitleTracks)
        .values({ projectId: id, name: "Default", language: "en" })
        .returning();
      trackId = newTrack.id;
    } else {
      trackId = tracks[0].id;
    }

    if (Array.isArray(body.subtitles)) {
      // Bulk insert
      await db.delete(subtitles).where(eq(subtitles.trackId, trackId));
      if (body.subtitles.length > 0) {
        const rows = body.subtitles.map((s: { startTime: number; endTime: number; text: string; speaker?: string }, i: number) => ({
          trackId,
          index: i,
          startTime: s.startTime,
          endTime: s.endTime,
          text: s.text,
          speaker: s.speaker || null,
        }));
        await db.insert(subtitles).values(rows);
      }
      await db.update(projects).set({ updatedAt: new Date(), status: "subtitled" }).where(eq(projects.id, id));
      return NextResponse.json({ success: true });
    }

    // Single insert
    const [sub] = await db
      .insert(subtitles)
      .values({
        trackId,
        index: body.index || 0,
        startTime: body.startTime,
        endTime: body.endTime,
        text: body.text,
        speaker: body.speaker || null,
      })
      .returning();

    return NextResponse.json({ subtitle: sub });
  } catch (error) {
    console.error("Create subtitle error:", error);
    return NextResponse.json({ error: "Failed to create subtitle" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { subtitleId, text: newText, startTime, endTime } = body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (newText !== undefined) updates.text = newText;
    if (startTime !== undefined) updates.startTime = startTime;
    if (endTime !== undefined) updates.endTime = endTime;

    const [updated] = await db
      .update(subtitles)
      .set(updates)
      .where(eq(subtitles.id, subtitleId))
      .returning();

    return NextResponse.json({ subtitle: updated });
  } catch (error) {
    console.error("Update subtitle error:", error);
    return NextResponse.json({ error: "Failed to update subtitle" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const subtitleId = url.searchParams.get("subtitleId");
    if (!subtitleId) return NextResponse.json({ error: "subtitleId required" }, { status: 400 });

    await db.delete(subtitles).where(eq(subtitles.id, subtitleId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete subtitle error:", error);
    return NextResponse.json({ error: "Failed to delete subtitle" }, { status: 500 });
  }
}
