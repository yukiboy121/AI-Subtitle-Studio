import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, videos, subtitleTracks, subtitles, subtitleStyles } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, session.userId)))
      .limit(1);

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const projectVideos = await db.select().from(videos).where(eq(videos.projectId, id));
    const tracks = await db.select().from(subtitleTracks).where(eq(subtitleTracks.projectId, id));
    const styles = await db.select().from(subtitleStyles).where(eq(subtitleStyles.projectId, id));

    let projectSubtitles: typeof subtitles.$inferSelect[] = [];
    if (tracks.length > 0) {
      projectSubtitles = await db.select().from(subtitles).where(eq(subtitles.trackId, tracks[0].id));
    }

    return NextResponse.json({
      project,
      videos: projectVideos,
      tracks,
      subtitles: projectSubtitles,
      styles,
    });
  } catch (error) {
    console.error("Get project error:", error);
    return NextResponse.json({ error: "Failed to get project" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const body = await req.json();
    const allowedFields: Record<string, unknown> = {};
    if (body.name !== undefined) allowedFields.name = body.name;
    if (body.description !== undefined) allowedFields.description = body.description;
    if (body.isFavorite !== undefined) allowedFields.isFavorite = body.isFavorite;
    if (body.isArchived !== undefined) allowedFields.isArchived = body.isArchived;
    if (body.status !== undefined) allowedFields.status = body.status;
    if (body.language !== undefined) allowedFields.language = body.language;
    if (body.editorSettings !== undefined) allowedFields.editorSettings = body.editorSettings;
    allowedFields.updatedAt = new Date();

    const [updated] = await db
      .update(projects)
      .set(allowedFields)
      .where(and(eq(projects.id, id), eq(projects.userId, session.userId)))
      .returning();

    return NextResponse.json({ project: updated });
  } catch (error) {
    console.error("Update project error:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    await db.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, session.userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
