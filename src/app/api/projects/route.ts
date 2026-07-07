import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, videos, subtitleTracks, subtitles, subtitleStyles } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { eq, desc, and, ilike } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const favoriteOnly = url.searchParams.get("favorite") === "true";
    const archived = url.searchParams.get("archived") === "true";

    const conditions = [eq(projects.userId, session.userId), eq(projects.isArchived, archived)];
    if (favoriteOnly) conditions.push(eq(projects.isFavorite, true));
    if (search) conditions.push(ilike(projects.name, `%${search}%`));

    const result = await db
      .select()
      .from(projects)
      .where(and(...conditions))
      .orderBy(desc(projects.updatedAt))
      .limit(50);

    return NextResponse.json({ projects: result });
  } catch (error) {
    console.error("Get projects error:", error);
    return NextResponse.json({ error: "Failed to get projects" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, description } = await req.json();

    const [project] = await db
      .insert(projects)
      .values({
        userId: session.userId,
        name: name || "Untitled Project",
        description: description || "",
        status: "created",
      })
      .returning();

    // Create default subtitle track
    await db.insert(subtitleTracks).values({
      projectId: project.id,
      name: "Default",
      language: "en",
      isDefault: true,
    });

    // Create default style
    await db.insert(subtitleStyles).values({
      projectId: project.id,
      name: "Default",
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
