import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

export function formatTimeVTT(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function parseTimeToSeconds(time: string): number {
  const parts = time.split(/[:,\.]/);
  if (parts.length < 4) return 0;
  const h = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  const s = parseInt(parts[2]);
  const ms = parseInt(parts[3]);
  return h * 3600 + m * 60 + s + ms / 1000;
}

export function generateSRT(subtitles: { index: number; startTime: number; endTime: number; text: string }[]): string {
  return subtitles
    .sort((a, b) => a.startTime - b.startTime)
    .map((sub, i) => `${i + 1}\n${formatTime(sub.startTime)} --> ${formatTime(sub.endTime)}\n${sub.text}`)
    .join("\n\n");
}

export function generateVTT(subtitles: { index: number; startTime: number; endTime: number; text: string }[]): string {
  const cues = subtitles
    .sort((a, b) => a.startTime - b.startTime)
    .map((sub, i) => `${i + 1}\n${formatTimeVTT(sub.startTime)} --> ${formatTimeVTT(sub.endTime)}\n${sub.text}`)
    .join("\n\n");
  return `WEBVTT\n\n${cues}`;
}

export function parseSRT(content: string): { index: number; startTime: number; endTime: number; text: string }[] {
  const blocks = content.trim().split(/\n\n+/);
  return blocks.map((block) => {
    const lines = block.split("\n");
    const index = parseInt(lines[0]) || 0;
    const timeLine = lines[1] || "";
    const times = timeLine.split(" --> ");
    const startTime = parseTimeToSeconds(times[0] || "00:00:00,000");
    const endTime = parseTimeToSeconds(times[1] || "00:00:00,000");
    const text = lines.slice(2).join("\n");
    return { index, startTime, endTime, text };
  });
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
