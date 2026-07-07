import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { writeFile, readFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getUploadsDir } from "@/lib/upload-path";

const UPLOADS_DIR = getUploadsDir();

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const uploadId = formData.get("uploadId") as string;
    const chunkIndexStr = formData.get("chunkIndex") as string;
    const checksum = formData.get("checksum") as string;
    const chunk = formData.get("chunk");

    if (!uploadId || chunkIndexStr == null || !checksum || !chunk) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    
    if (typeof chunk === "string") {
      return NextResponse.json({ error: "Chunk was parsed as a string, expected a File/Blob" }, { status: 400 });
    }

    const chunkIndex = parseInt(chunkIndexStr);

    const uploadDir = path.join(UPLOADS_DIR, session.userId, uploadId);
    const metaPath = path.join(uploadDir, "meta.json");
    let meta;
    try {
      meta = JSON.parse(await readFile(metaPath, "utf-8"));
    } catch {
      return NextResponse.json({ error: "Upload session not found (meta.json missing)" }, { status: 404 });
    }

    if (meta.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const buffer = Buffer.from(await chunk.arrayBuffer());
    const actualChecksum = crypto.createHash("sha256").update(buffer).digest("hex");

    if (actualChecksum !== checksum) {
      return NextResponse.json({ error: "Checksum mismatch" }, { status: 400 });
    }

    const chunkPath = path.join(uploadDir, "chunks", `chunk_${chunkIndex}`);
    await writeFile(chunkPath, buffer);

    const statusPath = path.join(uploadDir, "status.json");
    let statusData: { completed: number[] };
    try {
      statusData = JSON.parse(await readFile(statusPath, "utf-8"));
    } catch {
      statusData = { completed: [] };
    }

    if (!statusData.completed.includes(chunkIndex)) {
      statusData.completed.push(chunkIndex);
    }
    await writeFile(statusPath, JSON.stringify(statusData));

    return NextResponse.json({ success: true, chunkIndex });
  } catch (error) {
    console.error("Chunk upload error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Chunk upload failed: ${msg}` }, { status: 500 });
  }
}
