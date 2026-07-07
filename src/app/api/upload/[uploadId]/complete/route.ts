import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { projects, videos, subtitleTracks, subtitleStyles } from "@/db/schema";
import { readFile, readdir, unlink, rm, appendFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { uploadId } = await params;
    const uploadDir = path.join(UPLOADS_DIR, session.userId, uploadId);
    const chunkDir = path.join(uploadDir, "chunks");
    const metaPath = path.join(uploadDir, "meta.json");
    const statusPath = path.join(uploadDir, "status.json");

    let meta, statusData;
    try {
      meta = JSON.parse(await readFile(metaPath, "utf-8"));
      statusData = JSON.parse(await readFile(statusPath, "utf-8"));
    } catch {
      return NextResponse.json({ error: "Upload session not found" }, { status: 404 });
    }

    if (meta.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (statusData.completed.length !== meta.totalChunks) {
      return NextResponse.json(
        { error: `Only ${statusData.completed.length}/${meta.totalChunks} chunks uploaded` },
        { status: 400 }
      );
    }

    const ext = path.extname(meta.fileName) || ".mp4";
    const filename = `${uuidv4()}${ext}`;
    const filePath = path.join(UPLOADS_DIR, session.userId, filename);

    const chunks = await readdir(chunkDir);
    const chunkIndices = chunks
      .map((c) => parseInt(c.replace("chunk_", "")))
      .sort((a, b) => a - b);

    for (const idx of chunkIndices) {
      const chunkPath = path.join(chunkDir, `chunk_${idx}`);
      const chunkBuffer = await readFile(chunkPath);
      await appendFile(filePath, chunkBuffer);
      await unlink(chunkPath);
    }

    await rm(chunkDir, { recursive: true, force: true });
    await unlink(metaPath);
    await unlink(statusPath);
    await rm(uploadDir, { recursive: true, force: true });

    const projectName = meta.fileName.replace(/\.[^.]+$/, "");
    const [project] = await db
      .insert(projects)
      .values({
        userId: session.userId,
        name: projectName,
        status: "uploaded",
      })
      .returning();

    await db.insert(videos).values({
      projectId: project.id,
      filename,
      originalName: meta.fileName,
      mimeType: meta.fileType || "video/mp4",
      size: meta.fileSize,
      path: `/api/uploads/${session.userId}/${filename}`,
    });

    await db.insert(subtitleTracks).values({
      projectId: project.id,
      name: "Default",
      language: "en",
      isDefault: true,
    });

    await db.insert(subtitleStyles).values({
      projectId: project.id,
      name: "Default",
    });

    return NextResponse.json({ project, message: "Upload complete" });
  } catch (error) {
    console.error("Complete upload error:", error);
    return NextResponse.json({ error: "Failed to complete upload" }, { status: 500 });
  }
}
