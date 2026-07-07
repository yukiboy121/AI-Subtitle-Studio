import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const CHUNK_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileName, fileSize, fileType } = await req.json();

    if (!fileName || fileSize == null) {
      return NextResponse.json({ error: "fileName and fileSize required" }, { status: 400 });
    }

    const ext = path.extname(fileName) || ".mp4";
    const allowedExts = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".mpeg"];
    if (!allowedExts.includes(ext.toLowerCase())) {
      return NextResponse.json({ error: "Unsupported file format" }, { status: 400 });
    }

    const uploadId = uuidv4();
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
    const uploadDir = path.join(UPLOADS_DIR, session.userId, uploadId);

    await mkdir(path.join(uploadDir, "chunks"), { recursive: true });

    const meta = {
      uploadId,
      userId: session.userId,
      fileName,
      fileSize,
      fileType: fileType || "video/mp4",
      chunkSize: CHUNK_SIZE,
      totalChunks,
      createdAt: Date.now(),
    };

    await writeFile(path.join(uploadDir, "meta.json"), JSON.stringify(meta));
    await writeFile(path.join(uploadDir, "status.json"), JSON.stringify({ completed: [] }));

    return NextResponse.json({
      uploadId,
      chunkSize: CHUNK_SIZE,
      totalChunks,
    });
  } catch (error) {
    console.error("Upload init error:", error);
    return NextResponse.json({ error: "Init failed" }, { status: 500 });
  }
}
