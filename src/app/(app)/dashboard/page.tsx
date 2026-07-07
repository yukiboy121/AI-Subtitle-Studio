"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Subtitles, Upload, Search, Plus, MoreHorizontal, Star, Trash2,
  Edit3, Clock, Grid3X3, List, FileVideo, LogOut,
  Archive, Heart, LayoutDashboard, Menu, X,
  Pause, Play, AlertCircle, CheckCircle2, RotateCcw, Film,
  Replace, Maximize2
} from "lucide-react";
import { formatFileSize, formatDuration } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  status: string;
  thumbnail?: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  language?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrate: number;
  thumbnail: string;
}

interface UploadEntry {
  id: string;
  file: File;
  progress: number;
  uploadedBytes: number;
  speed: number;
  avgSpeed: number;
  eta: number;
  status: 'queued' | 'uploading' | 'paused' | 'completed' | 'error';
  error?: string;
  validationError?: string;
  metadata?: VideoMetadata;
  uploadId?: string;
  chunkSize: number;
  totalChunks: number;
  completedChunks: number;
  currentChunkIndex: number;
  activeChunkXhr?: XMLHttpRequest;
}

const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".mpeg"];
const CHUNK_SIZE = 5 * 1024 * 1024;

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState<"all" | "favorite" | "archived">("all");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const completedChunksRef = useRef<Map<string, Set<number>>>(new Map());
  const uploadActiveRef = useRef<Map<string, boolean>>(new Map());
  const uploadStartTimeRef = useRef<Map<string, number>>(new Map());

  const fetchProjects = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filter === "favorite") params.set("favorite", "true");
      if (filter === "archived") params.set("archived", "true");
      const res = await fetch(`/api/projects?${params}`);
      const data = await res.json();
      if (data.projects) setProjects(data.projects);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.user) setUser(d.user); else router.push("/login"); })
      .catch(() => router.push("/login"));
  }, [router]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const extractVideoMetadata = (file: File): Promise<VideoMetadata> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      const url = URL.createObjectURL(file);
      video.src = url;

      video.onloadedmetadata = () => {
        const duration = video.duration;
        const width = video.videoWidth;
        const height = video.videoHeight;

        video.currentTime = Math.min(duration * 0.25, 5);

        video.onseeked = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 160;
          canvas.height = 90;
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.drawImage(video, 0, 0, 160, 90);
          const thumbnail = canvas.toDataURL("image/jpeg", 0.5);

          const bitrate = duration > 0 ? Math.round((file.size * 8) / duration) : 0;
          const codec = file.type || "video/mp4";

          URL.revokeObjectURL(url);
          resolve({ duration, width, height, fps: 0, codec, bitrate, thumbnail });
        };

        video.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({ duration: 0, width: 0, height: 0, fps: 0, codec: file.type, bitrate: 0, thumbnail: "" });
        };
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ duration: 0, width: 0, height: 0, fps: 0, codec: file.type, bitrate: 0, thumbnail: "" });
      };
    });
  };

  const validateFile = (file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    const isTypeValid = ALLOWED_EXTENSIONS.includes(ext);
    if (!isTypeValid) return "Unsupported format. Use MP4, MOV, MKV, AVI, or WebM.";
    if (file.size === 0) return "File is empty.";
    return null;
  };

  const computeChecksum = async (blob: Blob): Promise<string> => {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const updateProgress = (entryId: string) => {
    const entry = uploads.find(u => u.id === entryId);
    if (!entry) return;

    const completed = completedChunksRef.current.get(entryId)?.size || 0;
    const uploadedBytes = completed * entry.chunkSize;
    const percent = Math.round((uploadedBytes / entry.file.size) * 100);
    const elapsed = (Date.now() - (uploadStartTimeRef.current.get(entryId) || Date.now())) / 1000;
    const avgSpeed = elapsed > 0 ? uploadedBytes / elapsed : 0;
    const remaining = entry.file.size - uploadedBytes;
    const eta = avgSpeed > 0 ? remaining / avgSpeed : 0;

    setUploads(prev => prev.map(u =>
      u.id === entryId ? {
        ...u,
        progress: Math.min(percent, 99),
        uploadedBytes,
        avgSpeed,
        eta,
        completedChunks: completed,
      } : u
    ));
  };

  const uploadSingleChunk = (
    entryId: string,
    uploadId: string,
    chunkIndex: number,
    checksum: string,
    chunk: Blob,
    totalBytes: number
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const chunkStart = Date.now();
      let lastLoaded = 0;

      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const entry = uploads.find(u => u.id === entryId);
        if (!entry) return;
        const completed = completedChunksRef.current.get(entryId)?.size || 0;
        const uploadedBytes = completed * entry.chunkSize + e.loaded;
        const percent = Math.round((uploadedBytes / totalBytes) * 100);
        const now = Date.now();
        const elapsed = (now - (uploadStartTimeRef.current.get(entryId) || now)) / 1000;
        const timeDiff = (now - chunkStart) / 1000;
        const currentSpeed = timeDiff > 0 ? (completed * entry.chunkSize + e.loaded - lastLoaded) / timeDiff : 0;
        const avgSpeed = elapsed > 0 ? uploadedBytes / elapsed : 0;
        const remaining = totalBytes - uploadedBytes;
        const eta = avgSpeed > 0 ? remaining / avgSpeed : 0;
        lastLoaded = completed * entry.chunkSize + e.loaded;

        setUploads(prev => prev.map(u =>
          u.id === entryId ? {
            ...u,
            progress: Math.min(percent, 99),
            uploadedBytes,
            speed: currentSpeed,
            avgSpeed,
            eta,
          } : u
        ));
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error("Chunk upload failed"));
        }
      };

      xhr.onerror = () => reject(new Error("Network error"));
      xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));

      const formData = new FormData();
      formData.append("uploadId", uploadId);
      formData.append("chunkIndex", chunkIndex.toString());
      formData.append("checksum", checksum);
      formData.append("chunk", chunk);

      xhr.open("POST", "/api/upload/chunk");
      xhr.send(formData);

      setUploads(prev => prev.map(u =>
        u.id === entryId ? { ...u, activeChunkXhr: xhr, currentChunkIndex: chunkIndex } : u
      ));
    });
  };

  const uploadAllChunks = async (entryId: string) => {
    const entry = uploads.find(u => u.id === entryId);
    if (!entry || !entry.uploadId) return;

    uploadActiveRef.current.set(entryId, true);
    const { uploadId, file, chunkSize, totalChunks } = entry;

    if (!completedChunksRef.current.has(entryId)) {
      completedChunksRef.current.set(entryId, new Set());
    }
    const completedSet = completedChunksRef.current.get(entryId)!;

    for (let i = 0; i < totalChunks; i++) {
      if (!uploadActiveRef.current.get(entryId)) break;
      if (completedSet.has(i)) continue;

      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      let checksum: string;
      try {
        checksum = await computeChecksum(chunk);
      } catch {
        setUploads(prev => prev.map(u =>
          u.id === entryId ? { ...u, status: "error", error: "Failed to process chunk" } : u
        ));
        return;
      }

      const currentEntry = uploads.find(u => u.id === entryId);
      if (!currentEntry || currentEntry.status === "paused" || !uploadActiveRef.current.get(entryId)) break;

      let success = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (!uploadActiveRef.current.get(entryId)) break;
        try {
          await uploadSingleChunk(entryId, uploadId, i, checksum, chunk, file.size);
          success = true;
          break;
        } catch (err: any) {
          if (err.name === "AbortError") {
            uploadActiveRef.current.set(entryId, false);
            return;
          }
          if (attempt === 2) {
            setUploads(prev => prev.map(u =>
              u.id === entryId ? { ...u, status: "error", error: `Chunk ${i + 1}/${totalChunks} failed after 3 attempts` } : u
            ));
            uploadActiveRef.current.set(entryId, false);
            return;
          }
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (success) {
        completedSet.add(i);
        updateProgress(entryId);
      }
    }

    if (!uploadActiveRef.current.get(entryId)) return;

    try {
      const res = await fetch(`/api/upload/${uploadId}/complete`, { method: "POST" });
      const data = await res.json();

      if (data.project) {
        completedChunksRef.current.delete(entryId);
        uploadStartTimeRef.current.delete(entryId);
        setUploads(prev => prev.filter(u => u.id !== entryId));
        router.push(`/editor/${data.project.id}`);
      } else {
        setUploads(prev => prev.map(u =>
          u.id === entryId ? { ...u, status: "error", error: data.error || "Failed to finalize" } : u
        ));
      }
    } catch {
      setUploads(prev => prev.map(u =>
        u.id === entryId ? { ...u, status: "error", error: "Failed to finalize upload" } : u
      ));
    }

    uploadActiveRef.current.delete(entryId);
  };

  const startUpload = async (entry: UploadEntry) => {
    uploadStartTimeRef.current.set(entry.id, Date.now());

    if (!completedChunksRef.current.has(entry.id)) {
      completedChunksRef.current.set(entry.id, new Set());
    }

    setUploads(prev => prev.map(u =>
      u.id === entry.id ? { ...u, status: "queued" } : u
    ));

    let uploadId = entry.uploadId;
    let chunkSize = entry.chunkSize;
    let totalChunks = entry.totalChunks;

    if (!uploadId) {
      try {
        const initRes = await fetch("/api/upload/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: entry.file.name,
            fileSize: entry.file.size,
            fileType: entry.file.type,
          }),
        });
        let initData: any;
        try {
          initData = await initRes.json();
        } catch {
          setUploads(prev => prev.map(u =>
            u.id === entry.id ? { ...u, status: "error", error: `Server returned ${initRes.status}: not valid JSON` } : u
          ));
          return;
        }
        if (!initData.uploadId) {
          setUploads(prev => prev.map(u =>
            u.id === entry.id ? { ...u, status: "error", error: initData.error || `Server error (${initRes.status})` } : u
          ));
          return;
        }
        uploadId = initData.uploadId;
        chunkSize = initData.chunkSize;
        totalChunks = initData.totalChunks;
      } catch (err: any) {
        setUploads(prev => prev.map(u =>
          u.id === entry.id ? { ...u, status: "error", error: `Init failed: ${err?.message || "Network error"}` } : u
        ));
        return;
      }
    } else {
      try {
        const statusRes = await fetch(`/api/upload/${uploadId}`);
        const statusData = await statusRes.json();
        if (statusData.completed) {
          const set = new Set<number>(statusData.completed);
          completedChunksRef.current.set(entry.id, set);
        }
        chunkSize = statusData.chunkSize || entry.chunkSize;
        totalChunks = statusData.totalChunks || entry.totalChunks;
      } catch {
        // proceed without restore
      }
    }

    const completed = completedChunksRef.current.get(entry.id)?.size || 0;
    const uploadedBytes = completed * chunkSize;

    setUploads(prev => prev.map(u =>
      u.id === entry.id ? {
        ...u,
        status: "uploading",
        uploadId,
        chunkSize,
        totalChunks,
        completedChunks: completed,
        currentChunkIndex: completed,
        uploadedBytes,
        progress: Math.round((uploadedBytes / entry.file.size) * 100),
        error: undefined,
      } : u
    ));

    uploadAllChunks(entry.id);
  };

  const addFileToQueue = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      const entryId = crypto.randomUUID();
      setUploads(prev => [...prev, {
        id: entryId,
        file,
        progress: 0,
        uploadedBytes: 0,
        speed: 0,
        avgSpeed: 0,
        eta: 0,
        chunkSize: CHUNK_SIZE,
        totalChunks: Math.ceil(file.size / CHUNK_SIZE),
        completedChunks: 0,
        currentChunkIndex: 0,
        status: "error" as const,
        validationError,
      }]);
      setTimeout(() => {
        setUploads(prev => prev.filter(u => u.id === entryId));
      }, 5000);
      return;
    }

    const entryId = crypto.randomUUID();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    const hasDuplicate = uploads.some(
      u => u.file.name === file.name && u.file.size === file.size && u.status !== "error"
    );
    if (hasDuplicate) return;

    setUploads(prev => [...prev, {
      id: entryId,
      file,
      progress: 0,
      uploadedBytes: 0,
      speed: 0,
      avgSpeed: 0,
      eta: 0,
      chunkSize: CHUNK_SIZE,
      totalChunks,
      completedChunks: 0,
      currentChunkIndex: 0,
      status: "queued" as const,
    }]);

    const metadata = await extractVideoMetadata(file);
    setUploads(prev => prev.map(u =>
      u.id === entryId ? { ...u, metadata } : u
    ));

    startUpload({
      id: entryId,
      file,
      progress: 0,
      uploadedBytes: 0,
      speed: 0,
      avgSpeed: 0,
      eta: 0,
      chunkSize: CHUNK_SIZE,
      totalChunks,
      completedChunks: 0,
      currentChunkIndex: 0,
      status: "queued" as const,
      metadata,
    });
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      addFileToQueue(files[i]);
    }
  };

  const replaceFile = async (id: string, file: File) => {
    const entry = uploads.find(u => u.id === id);
    if (!entry) return;

    uploadActiveRef.current.set(id, false);

    if (entry.activeChunkXhr) {
      entry.activeChunkXhr.abort();
    }

    if (entry.uploadId) {
      try {
        await fetch(`/api/upload/${entry.uploadId}`, { method: "DELETE" });
      } catch {}
    }

    completedChunksRef.current.delete(id);
    uploadStartTimeRef.current.delete(id);
    setUploads(prev => prev.filter(u => u.id !== id));
    addFileToQueue(file);
  };

  const pauseUpload = (id: string) => {
    const entry = uploads.find(u => u.id === id);
    if (!entry) return;

    uploadActiveRef.current.set(id, false);

    if (entry.activeChunkXhr) {
      entry.activeChunkXhr.abort();
    }

    setUploads(prev => prev.map(u =>
      u.id === id ? { ...u, status: "paused" } : u
    ));
  };

  const resumeUpload = (id: string) => {
    const entry = uploads.find(u => u.id === id);
    if (!entry) return;

    const completed = completedChunksRef.current.get(id)?.size || 0;
    setUploads(prev => prev.map(u =>
      u.id === id ? { ...u, status: "queued", activeChunkXhr: undefined } : u
    ));

    startUpload(entry);
  };

  const cancelUpload = async (id: string) => {
    const entry = uploads.find(u => u.id === id);
    if (!entry) return;

    uploadActiveRef.current.set(id, false);

    if (entry.activeChunkXhr) {
      entry.activeChunkXhr.abort();
    }

    if (entry.uploadId) {
      try {
        await fetch(`/api/upload/${entry.uploadId}`, { method: "DELETE" });
      } catch {}
    }

    completedChunksRef.current.delete(id);
    uploadStartTimeRef.current.delete(id);
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  const retryUpload = (id: string) => {
    const entry = uploads.find(u => u.id === id);
    if (!entry) return;

    const completed = completedChunksRef.current.get(id)?.size || 0;
    const retried = {
      ...entry,
      status: "queued" as const,
      activeChunkXhr: undefined,
      progress: 0,
      uploadedBytes: 0,
      speed: 0,
      avgSpeed: 0,
      eta: 0,
      error: undefined,
    };
    setUploads(prev => prev.map(u => u.id === id ? retried : u));
    startUpload(retried);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileSelect(files);
  };

  const formatBitrate = (bps: number): string => {
    if (bps === 0) return "N/A";
    if (bps > 1e6) return (bps / 1e6).toFixed(1) + " Mbps";
    return Math.round(bps / 1000) + " Kbps";
  };

  const formatResolution = (w: number, h: number): string => {
    if (w === 0 || h === 0) return "N/A";
    return `${w}x${h}`;
  };

  const codecLabel = (mime: string): string => {
    if (mime.includes("mp4") || mime.includes("h264") || mime.includes("avc")) return "H.264";
    if (mime.includes("x-matroska") || mime.includes("mkv")) return "Matroska";
    if (mime.includes("quicktime") || mime.includes("mov")) return "MOV";
    if (mime.includes("webm") || mime.includes("vp9") || mime.includes("vp8")) return "VP9";
    if (mime.includes("msvideo") || mime.includes("avi")) return "AVI";
    if (mime.includes("mpeg")) return "MPEG";
    const ext = mime.split("/").pop() || "";
    return ext.toUpperCase() || "Unknown";
  };

  const formatSpeed = (bps: number): string => {
    if (bps <= 0) return "--";
    if (bps > 1e6) return (bps / 1e6).toFixed(1) + " MB/s";
    if (bps > 1e3) return Math.round(bps / 1e3) + " KB/s";
    return Math.round(bps) + " B/s";
  };

  const formatETA = (seconds: number): string => {
    if (!isFinite(seconds) || seconds <= 0) return "--";
    if (seconds < 60) return Math.round(seconds) + "s";
    if (seconds < 3600) return Math.floor(seconds / 60) + "m " + Math.round(seconds % 60) + "s";
    return Math.floor(seconds / 3600) + "h " + Math.floor((seconds % 3600) / 60) + "m";
  };

  const toggleFavorite = async (id: string, current: boolean) => {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: !current }),
    });
    fetchProjects();
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    fetchProjects();
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const sidebarItems = [
    { label: "All Projects", icon: LayoutDashboard, filter: "all" as const },
    { label: "Favorites", icon: Heart, filter: "favorite" as const },
    { label: "Archived", icon: Archive, filter: "archived" as const },
  ];

  const statusColors: Record<string, string> = {
    created: "bg-blue-500/20 text-blue-400",
    uploaded: "bg-yellow-500/20 text-yellow-400",
    processing: "bg-orange-500/20 text-orange-400",
    subtitled: "bg-green-500/20 text-green-400",
    exported: "bg-purple-500/20 text-purple-400",
  };

  const chunkInfo = (entry: UploadEntry): string => {
    if (entry.totalChunks <= 1) return "";
    const done = completedChunksRef.current.get(entry.id)?.size || entry.completedChunks;
    return `${done}/${entry.totalChunks} chunks`;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-[#0a0a1a]">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 glass border-r border-white/5 flex flex-col transform transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center">
              <Subtitles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-sm">AI Subtitle Studio</span>
          </div>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <label className="w-full py-3 rounded-xl gradient-bg text-white text-sm font-medium flex items-center justify-center gap-2 cursor-pointer hover:opacity-90 transition">
            <Plus className="w-4 h-4" />
            New Project
            <input type="file" className="hidden" accept="video/*" multiple onChange={(e) => { handleFileSelect(e.target.files); if (e.target) e.target.value = ""; }} />
          </label>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.filter}
              onClick={() => { setFilter(item.filter); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition ${
                filter === item.filter ? "bg-indigo-500/20 text-indigo-400" : "text-[var(--muted)] hover:bg-white/5"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-white text-sm font-bold">
              {user.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user.name}</div>
              <div className="text-xs text-[var(--muted)] truncate">{user.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      <main
        className="flex-1 min-h-screen relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <header className="sticky top-0 z-30 glass border-b border-white/5 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-indigo-500 focus:outline-none text-sm"
                placeholder="Search projects..."
              />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition ${viewMode === "grid" ? "bg-indigo-500/20 text-indigo-400" : "text-[var(--muted)] hover:bg-white/5"}`}>
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition ${viewMode === "list" ? "bg-indigo-500/20 text-indigo-400" : "text-[var(--muted)] hover:bg-white/5"}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {isDragOver && (
          <div className="absolute inset-0 z-50 m-4 rounded-2xl border-2 border-dashed border-indigo-400 bg-indigo-500/10 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <Upload className="w-16 h-16 text-indigo-400 mx-auto mb-4 animate-bounce" />
              <p className="text-xl font-semibold text-indigo-300">Drop videos here</p>
              <p className="text-sm text-[var(--muted)] mt-2">MP4, MOV, AVI, MKV, WebM</p>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6">
          {uploads.length > 0 && (
            <div className="space-y-3 mb-6">
              {uploads.map((entry) => (
                <div key={entry.id} className="glass rounded-2xl p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-28 h-16 rounded-lg flex-shrink-0 overflow-hidden bg-white/5 ${entry.metadata?.thumbnail ? "" : "flex items-center justify-center"}`}>
                      {entry.metadata?.thumbnail ? (
                        <img src={entry.metadata.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : entry.validationError ? (
                        <AlertCircle className="w-6 h-6 text-red-400" />
                      ) : (
                        <Film className="w-6 h-6 text-white/30" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate max-w-[260px]">{entry.file.name}</div>

                          {entry.validationError ? (
                            <div className="text-xs text-red-400 mt-1">{entry.validationError}</div>
                          ) : entry.error ? (
                            <div className="text-xs text-red-400 mt-1">{entry.error}</div>
                          ) : entry.status === "uploading" ? (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-[var(--muted)]">
                              <span className="text-indigo-400 font-medium">{entry.progress}%</span>
                              <span>{formatFileSize(entry.uploadedBytes)} / {formatFileSize(entry.file.size)}</span>
                              <span className="text-green-400/80">{formatSpeed(entry.speed)}</span>
                              <span className="text-green-400/80">avg {formatSpeed(entry.avgSpeed)}</span>
                              <span>ETA {formatETA(entry.eta)}</span>
                              {entry.totalChunks > 1 && (
                                <>
                                  <span>·</span>
                                  <span>{chunkInfo(entry)}</span>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-[var(--muted)]">
                              <span>{formatFileSize(entry.file.size)}</span>
                              {entry.metadata && entry.metadata.duration > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDuration(entry.metadata.duration)}
                                  </span>
                                </>
                              )}
                              {entry.metadata && entry.metadata.width > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="flex items-center gap-1">
                                    <Maximize2 className="w-3 h-3" />
                                    {formatResolution(entry.metadata.width, entry.metadata.height)}
                                  </span>
                                </>
                              )}
                              {entry.metadata && entry.metadata.codec !== "video/mp4" && (
                                <>
                                  <span>·</span>
                                  <span>{codecLabel(entry.metadata.codec)}</span>
                                </>
                              )}
                              {entry.metadata && entry.metadata.bitrate > 0 && (
                                <>
                                  <span>·</span>
                                  <span>{formatBitrate(entry.metadata.bitrate)}</span>
                                </>
                              )}
                              {entry.totalChunks > 1 && (
                                <>
                                  <span>·</span>
                                  <span>{entry.totalChunks} chunks</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-md whitespace-nowrap ${
                            entry.status === "completed" ? "bg-green-500/20 text-green-400" :
                            entry.status === "error" ? "bg-red-500/20 text-red-400" :
                            entry.status === "paused" ? "bg-yellow-500/20 text-yellow-400" :
                            entry.status === "uploading" ? "bg-indigo-500/20 text-indigo-400" :
                            "bg-white/5 text-[var(--muted)]"
                          }`}>
                            {entry.status === "queued" ? "Queued" :
                             entry.status === "uploading" ? `${entry.progress}%` :
                             entry.status === "paused" ? "Paused" :
                             entry.status === "completed" ? "Done" :
                             entry.status === "error" ? (entry.validationError ? "Invalid" : "Failed") :
                             ""}
                          </span>
                        </div>
                      </div>

                      {(entry.status === "uploading" || entry.status === "paused") && (
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mt-2">
                          <div className={`h-full rounded-full transition-all duration-200 ${
                            entry.status === "paused" ? "bg-yellow-500/50" : "gradient-bg"
                          }`} style={{ width: `${entry.progress}%` }} />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {entry.status === "uploading" && (
                        <button onClick={() => pauseUpload(entry.id)} className="p-2 rounded-lg hover:bg-white/10 text-[var(--muted)] hover:text-yellow-400 transition" title="Pause">
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      {entry.status === "paused" && (
                        <button onClick={() => resumeUpload(entry.id)} className="p-2 rounded-lg hover:bg-white/10 text-[var(--muted)] hover:text-green-400 transition" title="Resume">
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {entry.status === "error" && !entry.validationError && (
                        <button onClick={() => retryUpload(entry.id)} className="p-2 rounded-lg hover:bg-white/10 text-[var(--muted)] hover:text-indigo-400 transition" title="Retry">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                      {(entry.status === "queued" || entry.status === "error") && (
                        <label className="p-2 rounded-lg hover:bg-white/10 text-[var(--muted)] hover:text-blue-400 transition cursor-pointer" title="Replace">
                          <Replace className="w-4 h-4" />
                          <input
                            type="file"
                            className="hidden"
                            accept="video/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) replaceFile(entry.id, file);
                              if (e.target) e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                      {entry.status !== "completed" && (
                        <button onClick={() => cancelUpload(entry.id)} className="p-2 rounded-lg hover:bg-white/10 text-[var(--muted)] hover:text-red-400 transition" title="Cancel">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && projects.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6">
                <FileVideo className="w-10 h-10 text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
              <p className="text-[var(--muted)] mb-6 text-center max-w-sm">Upload a video to get started with AI-powered subtitle generation.</p>
              <label className="px-6 py-3 rounded-xl gradient-bg text-white font-medium cursor-pointer hover:opacity-90 transition flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Video
                <input type="file" className="hidden" accept="video/*" multiple onChange={(e) => { handleFileSelect(e.target.files); if (e.target) e.target.value = ""; }} />
              </label>
            </div>
          )}

          {projects.length > 0 && viewMode === "grid" && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projects.map((p) => (
                <div key={p.id} className="group glass rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all cursor-pointer" onClick={() => router.push(`/editor/${p.id}`)}>
                  <div className="aspect-video bg-gradient-to-br from-indigo-500/20 to-purple-500/20 relative flex items-center justify-center">
                    <FileVideo className="w-12 h-12 text-white/20" />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id, p.isFavorite); }}
                        className={`p-1.5 rounded-lg backdrop-blur-sm transition ${p.isFavorite ? "bg-yellow-500/20 text-yellow-400" : "bg-black/30 text-white/50 hover:text-white"}`}
                      >
                        <Star className="w-4 h-4" fill={p.isFavorite ? "currentColor" : "none"} />
                      </button>
                    </div>
                    <span className={`absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-xs ${statusColors[p.status] || "bg-gray-500/20 text-gray-400"}`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-sm truncate mb-1">{p.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--muted)] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(p.updatedAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDropdownOpen(dropdownOpen === p.id ? null : p.id); }}
                        className="p-1 rounded-md hover:bg-white/10 transition"
                      >
                        <MoreHorizontal className="w-4 h-4 text-[var(--muted)]" />
                      </button>
                    </div>
                    {dropdownOpen === p.id && (
                      <div className="absolute right-4 mt-1 w-40 glass rounded-xl border border-white/10 overflow-hidden z-10 shadow-xl">
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/editor/${p.id}`); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-white/5 transition">
                          <Edit3 className="w-4 h-4" /> Edit
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition">
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {projects.length > 0 && viewMode === "list" && (
            <div className="space-y-2">
              {projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => router.push(`/editor/${p.id}`)}
                  className="glass rounded-xl p-4 flex items-center gap-4 hover:border-indigo-500/30 transition cursor-pointer"
                >
                  <div className="w-16 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <FileVideo className="w-5 h-5 text-white/20" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{p.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`px-2 py-0.5 rounded-md text-xs ${statusColors[p.status] || "bg-gray-500/20 text-gray-400"}`}>{p.status}</span>
                      <span className="text-xs text-[var(--muted)]">{new Date(p.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id, p.isFavorite); }} className={`p-2 rounded-lg transition ${p.isFavorite ? "text-yellow-400" : "text-[var(--muted)] hover:text-white"}`}>
                      <Star className="w-4 h-4" fill={p.isFavorite ? "currentColor" : "none"} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }} className="p-2 rounded-lg text-[var(--muted)] hover:text-red-400 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
