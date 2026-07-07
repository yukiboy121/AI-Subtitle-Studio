import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import nodepath from "path";
import { getUploadsDir } from "@/lib/upload-path";

const UPLOADS_DIR = getUploadsDir();

export async function GET(req: NextRequest, { params }: { params: Promise<{ filepath: string[] }> }) {
  try {
    const { filepath } = await params;
    const filePath = nodepath.join(UPLOADS_DIR, ...filepath);

    const resolved = nodepath.resolve(filePath);
    if (!resolved.startsWith(nodepath.resolve(UPLOADS_DIR))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const fileStat = await stat(resolved);
    const fileBuffer = await readFile(resolved);

    const ext = nodepath.extname(resolved).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".avi": "video/x-msvideo",
      ".mkv": "video/x-matroska",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
    };

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
        "Content-Length": fileStat.size.toString(),
        "Accept-Ranges": "bytes",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
