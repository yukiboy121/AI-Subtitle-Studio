import path from "path";
import { tmpdir } from "os";

export function getUploadsDir(): string {
  if (process.env.VERCEL) {
    return path.join(tmpdir(), "uploads");
  }
  return path.join(process.cwd(), "uploads");
}
