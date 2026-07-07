import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readFile, rm } from "fs/promises";
import path from "path";
import { getUploadsDir } from "@/lib/upload-path";

const UPLOADS_DIR = getUploadsDir();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { uploadId } = await params;
    const uploadDir = path.join(UPLOADS_DIR, session.userId, uploadId);
    const statusPath = path.join(uploadDir, "status.json");

    let statusData;
    try {
      statusData = JSON.parse(await readFile(statusPath, "utf-8"));
    } catch {
      return NextResponse.json({ error: "Upload session not found" }, { status: 404 });
    }

    const metaPath = path.join(uploadDir, "meta.json");
    const meta = JSON.parse(await readFile(metaPath, "utf-8"));

    return NextResponse.json({
      completed: statusData.completed,
      totalChunks: meta.totalChunks,
      chunkSize: meta.chunkSize,
    });
  } catch (error) {
    console.error("Upload status error:", error);
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { uploadId } = await params;
    const uploadDir = path.join(UPLOADS_DIR, session.userId, uploadId);

    await rm(uploadDir, { recursive: true, force: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Upload cancel error:", error);
    return NextResponse.json({ error: "Failed to cancel upload" }, { status: 500 });
  }
}
