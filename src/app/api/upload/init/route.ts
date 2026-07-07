import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { getUploadsDir } from "@/lib/upload-path";

const UPLOADS_DIR = getUploadsDir();
const CHUNK_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "video/mp4", "video/quicktime", "video/x-msvideo",
  "video/x-matroska", "video/webm", "video/mpeg",
];

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { fileName, fileSize, fileType } = body;

    if (!fileName || fileSize == null) {
      return NextResponse.json({ error: "fileName and fileSize required" }, { status: 400 });
    }

    const ext = path.extname(fileName) || ".mp4";
    const allowedExts = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".mpeg"];
    const isTypeValid = ALLOWED_TYPES.includes(fileType || "") || allowedExts.includes(ext.toLowerCase());
    if (!isTypeValid) {
      return NextResponse.json({ error: "Unsupported file format" }, { status: 400 });
    }

    const uploadId = uuidv4();
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
    const uploadDir = path.join(UPLOADS_DIR, session.userId, uploadId);

    try {
      await mkdir(UPLOADS_DIR, { recursive: true });
      await mkdir(path.join(uploadDir, "chunks"), { recursive: true });
    } catch (err: any) {
      return NextResponse.json({ error: `Failed to create upload directory: ${err.message}` }, { status: 500 });
    }

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

    try {
      await writeFile(path.join(uploadDir, "meta.json"), JSON.stringify(meta));
      await writeFile(path.join(uploadDir, "status.json"), JSON.stringify({ completed: [] }));
    } catch (err: any) {
      return NextResponse.json({ error: `Failed to save upload state: ${err.message}` }, { status: 500 });
    }

    return NextResponse.json({
      uploadId,
      chunkSize: CHUNK_SIZE,
      totalChunks,
    });
  } catch (error) {
    console.error("Upload init error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Init failed: ${message}` }, { status: 500 });
  }
}
