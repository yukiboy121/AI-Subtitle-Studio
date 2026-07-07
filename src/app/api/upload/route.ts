import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, videos, subtitleTracks, subtitleStyles } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getUploadsDir } from "@/lib/upload-path";

const UPLOADS_DIR = getUploadsDir();
const ALLOWED_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/webm",
  "video/mpeg",
];
const MAX_SIZE = 500 * 1024 * 1024; // 500MB

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(mp4|mov|avi|mkv|webm|mpeg)$/i)) {
      return NextResponse.json({ error: "Unsupported file format" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 500MB)" }, { status: 400 });
    }

    // Create uploads directory
    const projectDir = path.join(UPLOADS_DIR, session.userId);
    await mkdir(projectDir, { recursive: true });

    // Save file
    const ext = path.extname(file.name) || ".mp4";
    const filename = `${uuidv4()}${ext}`;
    const filePath = path.join(projectDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Create project
    const projectName = file.name.replace(/\.[^.]+$/, "");
    const [project] = await db
      .insert(projects)
      .values({
        userId: session.userId,
        name: projectName,
        status: "uploaded",
      })
      .returning();

    // Create video record
    await db.insert(videos).values({
      projectId: project.id,
      filename,
      originalName: file.name,
      mimeType: file.type || "video/mp4",
      size: file.size,
      path: `/api/uploads/${session.userId}/${filename}`,
    });

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

    return NextResponse.json({ project, message: "Upload successful" });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
