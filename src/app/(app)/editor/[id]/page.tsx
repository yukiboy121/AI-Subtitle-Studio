"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize,
  Plus, Trash2, Copy, Scissors, Merge, Type, ArrowLeft,
  Download, Save, Undo2, Redo2, Search, Replace,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline,
  ChevronDown, Star, Clock, Settings, Palette, Move,
  ZoomIn, ZoomOut, FileText, Subtitles, Eye, EyeOff,
  Languages, Sparkles
} from "lucide-react";
import { formatTime, formatDuration, generateSRT, generateVTT } from "@/lib/utils";

interface SubtitleItem {
  id: string;
  trackId: string;
  index: number;
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string | null;
}

interface ProjectData {
  id: string;
  name: string;
  status: string;
}

interface VideoData {
  id: string;
  path: string;
  originalName: string;
  duration?: number | null;
}

interface StyleSettings {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  textColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  outlineColor: string;
  outlineWidth: number;
  positionY: number;
  alignment: string;
  animation: string;
  textTransform: string;
}

const TEMPLATES: Record<string, Partial<StyleSettings>> = {
  Netflix: { fontFamily: "Arial", fontSize: 28, fontWeight: "bold", textColor: "#FFFFFF", backgroundColor: "transparent", outlineColor: "#000000", outlineWidth: 3 },
  YouTube: { fontFamily: "Arial", fontSize: 24, fontWeight: "bold", textColor: "#FFFF00", backgroundColor: "#000000", backgroundOpacity: 0.7, outlineWidth: 0 },
  TikTok: { fontFamily: "Arial", fontSize: 32, fontWeight: "bold", textColor: "#FFFFFF", backgroundColor: "transparent", outlineColor: "#000000", outlineWidth: 4, animation: "pop" },
  Cinema: { fontFamily: "Georgia", fontSize: 26, fontWeight: "normal", textColor: "#FFFFFF", backgroundColor: "transparent", outlineColor: "#000000", outlineWidth: 2 },
  Gaming: { fontFamily: "Arial", fontSize: 30, fontWeight: "bold", textColor: "#00FF00", backgroundColor: "transparent", outlineColor: "#000000", outlineWidth: 3 },
  Minimal: { fontFamily: "Arial", fontSize: 22, fontWeight: "normal", textColor: "#FFFFFF", backgroundColor: "#000000", backgroundOpacity: 0.5, outlineWidth: 0 },
  Modern: { fontFamily: "Arial", fontSize: 26, fontWeight: "bold", textColor: "#FFFFFF", backgroundColor: "#6366f1", backgroundOpacity: 0.8, outlineWidth: 0 },
  Podcast: { fontFamily: "Georgia", fontSize: 24, fontWeight: "normal", textColor: "#F1F5F9", backgroundColor: "#1e293b", backgroundOpacity: 0.9, outlineWidth: 0 },
  Instagram: { fontFamily: "Arial", fontSize: 28, fontWeight: "bold", textColor: "#FFFFFF", backgroundColor: "transparent", outlineColor: "#000000", outlineWidth: 4, animation: "fade" },
  Movie: { fontFamily: "Georgia", fontSize: 24, fontWeight: "normal", textColor: "#FFFFCC", backgroundColor: "transparent", outlineColor: "#000000", outlineWidth: 2 },
};

export default function EditorPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [project, setProject] = useState<ProjectData | null>(null);
  const [video, setVideo] = useState<VideoData | null>(null);
  const [subtitlesList, setSubtitlesList] = useState<SubtitleItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [activeTab, setActiveTab] = useState<"subtitles" | "style" | "templates" | "export">("subtitles");
  const [searchText, setSearchText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);

  const [undoStack, setUndoStack] = useState<SubtitleItem[][]>([]);
  const [redoStack, setRedoStack] = useState<SubtitleItem[][]>([]);

  const [style, setStyle] = useState<StyleSettings>({
    fontFamily: "Arial",
    fontSize: 24,
    fontWeight: "bold",
    textColor: "#FFFFFF",
    backgroundColor: "#000000",
    backgroundOpacity: 0.6,
    outlineColor: "#000000",
    outlineWidth: 2,
    positionY: 88,
    alignment: "center",
    animation: "none",
    textTransform: "none",
  });

  // Load project data
  useEffect(() => {
    if (!id) return;
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.project) setProject(data.project);
        if (data.videos?.[0]) setVideo(data.videos[0]);
        if (data.subtitles) {
          const sorted = data.subtitles.sort((a: SubtitleItem, b: SubtitleItem) => a.startTime - b.startTime);
          setSubtitlesList(sorted);
        }
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, [id]);

  // Video time update
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onTimeUpdate = () => setCurrentTime(vid.currentTime);
    const onDurationChange = () => setDuration(vid.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    vid.addEventListener("timeupdate", onTimeUpdate);
    vid.addEventListener("durationchange", onDurationChange);
    vid.addEventListener("play", onPlay);
    vid.addEventListener("pause", onPause);
    return () => {
      vid.removeEventListener("timeupdate", onTimeUpdate);
      vid.removeEventListener("durationchange", onDurationChange);
      vid.removeEventListener("play", onPlay);
      vid.removeEventListener("pause", onPause);
    };
  }, [video]);

  const pushUndo = () => {
    setUndoStack((prev) => [...prev.slice(-20), [...subtitlesList]]);
    setRedoStack([]);
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    setRedoStack((prev) => [...prev, [...subtitlesList]]);
    const prev = undoStack[undoStack.length - 1];
    setSubtitlesList(prev);
    setUndoStack((stack) => stack.slice(0, -1));
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    setUndoStack((prev) => [...prev, [...subtitlesList]]);
    const next = redoStack[redoStack.length - 1];
    setSubtitlesList(next);
    setRedoStack((stack) => stack.slice(0, -1));
  };

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) vid.play(); else vid.pause();
  };

  const seek = (offset: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = Math.max(0, Math.min(vid.currentTime + offset, duration));
  };

  const seekTo = (time: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = time;
  };

  const getCurrentSubtitle = () => {
    return subtitlesList.find((s) => currentTime >= s.startTime && currentTime <= s.endTime);
  };

  const saveSubtitles = useCallback(async () => {
    if (!id) return;
    try {
      await fetch(`/api/projects/${id}/subtitles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtitles: subtitlesList }),
      });
    } catch { }
  }, [id, subtitlesList]);

  const addSubtitle = () => {
    pushUndo();
    const newSub: SubtitleItem = {
      id: crypto.randomUUID(),
      trackId: "",
      index: subtitlesList.length,
      startTime: currentTime,
      endTime: Math.min(currentTime + 3, duration || currentTime + 3),
      text: "New subtitle",
    };
    setSubtitlesList((prev) => [...prev, newSub].sort((a, b) => a.startTime - b.startTime));
    setSelectedId(newSub.id);
  };

  const updateSubtitleText = (subId: string, text: string) => {
    setSubtitlesList((prev) => prev.map((s) => (s.id === subId ? { ...s, text } : s)));
  };

  const updateSubtitleTime = (subId: string, field: "startTime" | "endTime", value: number) => {
    pushUndo();
    setSubtitlesList((prev) => prev.map((s) => (s.id === subId ? { ...s, [field]: value } : s)));
  };

  const deleteSubtitle = (subId: string) => {
    pushUndo();
    setSubtitlesList((prev) => prev.filter((s) => s.id !== subId));
    if (selectedId === subId) setSelectedId(null);
  };

  const splitSubtitle = (subId: string) => {
    pushUndo();
    const sub = subtitlesList.find((s) => s.id === subId);
    if (!sub) return;
    const midTime = (sub.startTime + sub.endTime) / 2;
    const words = sub.text.split(" ");
    const mid = Math.ceil(words.length / 2);
    const first: SubtitleItem = { ...sub, endTime: midTime, text: words.slice(0, mid).join(" ") };
    const second: SubtitleItem = {
      ...sub,
      id: crypto.randomUUID(),
      startTime: midTime,
      text: words.slice(mid).join(" "),
    };
    setSubtitlesList((prev) =>
      prev.flatMap((s) => (s.id === subId ? [first, second] : [s]))
    );
  };

  const duplicateSubtitle = (subId: string) => {
    pushUndo();
    const sub = subtitlesList.find((s) => s.id === subId);
    if (!sub) return;
    const newSub: SubtitleItem = {
      ...sub,
      id: crypto.randomUUID(),
      startTime: sub.endTime + 0.1,
      endTime: sub.endTime + (sub.endTime - sub.startTime) + 0.1,
    };
    setSubtitlesList((prev) => [...prev, newSub].sort((a, b) => a.startTime - b.startTime));
  };

  const mergeWithNext = (subId: string) => {
    pushUndo();
    const idx = subtitlesList.findIndex((s) => s.id === subId);
    if (idx < 0 || idx >= subtitlesList.length - 1) return;
    const current = subtitlesList[idx];
    const next = subtitlesList[idx + 1];
    const merged: SubtitleItem = {
      ...current,
      endTime: next.endTime,
      text: `${current.text} ${next.text}`,
    };
    setSubtitlesList((prev) => prev.filter((s) => s.id !== next.id).map((s) => (s.id === subId ? merged : s)));
  };

  const searchAndReplace = () => {
    if (!searchText) return;
    pushUndo();
    setSubtitlesList((prev) =>
      prev.map((s) => ({
        ...s,
        text: s.text.replace(new RegExp(searchText, "gi"), replaceText),
      }))
    );
  };

  const handleExport = async (format: string) => {
    await saveSubtitles();
    if (format === "srt" || format === "vtt" || format === "txt") {
      window.open(`/api/projects/${id}/export?format=${format}`, "_blank");
    }
  };

  const applyTemplate = (templateName: string) => {
    const template = TEMPLATES[templateName];
    if (template) {
      setStyle((prev) => ({ ...prev, ...template }));
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      if (e.ctrlKey && e.key === "z") { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === "y") { e.preventDefault(); redo(); }
      if (e.ctrlKey && e.key === "s") { e.preventDefault(); saveSubtitles(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); seek(-5); }
      if (e.key === "ArrowRight") { e.preventDefault(); seek(5); }
      if (e.key === "Delete" && selectedId) { e.preventDefault(); deleteSubtitle(selectedId); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  // Auto-save
  useEffect(() => {
    if (subtitlesList.length === 0) return;
    const timer = setTimeout(() => { saveSubtitles(); }, 5000);
    return () => clearTimeout(timer);
  }, [subtitlesList, saveSubtitles]);

  const currentSub = getCurrentSubtitle();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Subtitles className="w-6 h-6 text-white" />
          </div>
          <p className="text-[var(--muted)]">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a1a] overflow-hidden">
      {/* Top Bar */}
      <header className="h-12 glass border-b border-white/5 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="p-1.5 rounded-lg hover:bg-white/5 transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md gradient-bg flex items-center justify-center">
              <Subtitles className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-medium truncate max-w-[200px]">{project?.name || "Untitled"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={undo} className="p-1.5 rounded-lg hover:bg-white/5 transition" title="Undo (Ctrl+Z)">
            <Undo2 className="w-4 h-4 text-[var(--muted)]" />
          </button>
          <button onClick={redo} className="p-1.5 rounded-lg hover:bg-white/5 transition" title="Redo (Ctrl+Y)">
            <Redo2 className="w-4 h-4 text-[var(--muted)]" />
          </button>
          <div className="w-px h-5 bg-white/10" />
          <button onClick={saveSubtitles} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm flex items-center gap-1.5 transition">
            <Save className="w-3.5 h-3.5" /> Save
          </button>
          <button onClick={() => setActiveTab("export")} className="px-3 py-1.5 rounded-lg gradient-bg text-white text-sm flex items-center gap-1.5 hover:opacity-90 transition">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Preview */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative bg-black flex items-center justify-center p-4">
            {video ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={video.path}
                  className="max-w-full max-h-full rounded-lg"
                  onClick={togglePlay}
                />
                {/* Subtitle overlay */}
                {showSubtitles && currentSub && (
                  <div
                    className="absolute left-0 right-0 flex px-4 pointer-events-none"
                    style={{ bottom: `${100 - style.positionY}%`, justifyContent: style.alignment === "left" ? "flex-start" : style.alignment === "right" ? "flex-end" : "center" }}
                  >
                    <div
                      className="px-4 py-2 rounded-lg max-w-[80%] text-center"
                      style={{
                        fontFamily: style.fontFamily,
                        fontSize: `${style.fontSize}px`,
                        fontWeight: style.fontWeight,
                        color: style.textColor,
                        backgroundColor: style.backgroundColor !== "transparent" ? `${style.backgroundColor}${Math.round(style.backgroundOpacity * 255).toString(16).padStart(2, "0")}` : "transparent",
                        textShadow: style.outlineWidth > 0 ? `0 0 ${style.outlineWidth}px ${style.outlineColor}, 0 0 ${style.outlineWidth * 2}px ${style.outlineColor}` : "none",
                        textTransform: style.textTransform as React.CSSProperties["textTransform"],
                      }}
                    >
                      {currentSub.text}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-[var(--muted)]">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No video loaded</p>
              </div>
            )}
          </div>

          {/* Playback Controls */}
          <div className="h-16 glass border-t border-white/5 flex items-center px-4 gap-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={() => seek(-5)} className="p-1.5 rounded-lg hover:bg-white/5 transition">
                <SkipBack className="w-4 h-4" />
              </button>
              <button onClick={togglePlay} className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center hover:opacity-90 transition">
                {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
              </button>
              <button onClick={() => seek(5)} className="p-1.5 rounded-lg hover:bg-white/5 transition">
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            <span className="text-xs font-mono text-[var(--muted)] min-w-[110px]">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>

            {/* Timeline scrubber */}
            <div className="flex-1 h-2 rounded-full bg-white/10 cursor-pointer relative group" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              seekTo(ratio * duration);
            }}>
              <div className="h-full gradient-bg rounded-full relative" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition" />
              </div>
              {/* Subtitle markers */}
              {subtitlesList.map((sub) => (
                <div
                  key={sub.id}
                  className="absolute top-0 h-full bg-indigo-500/30 rounded-sm"
                  style={{
                    left: `${duration ? (sub.startTime / duration) * 100 : 0}%`,
                    width: `${duration ? ((sub.endTime - sub.startTime) / duration) * 100 : 0}%`,
                  }}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => { setIsMuted(!isMuted); if (videoRef.current) videoRef.current.muted = !isMuted; }} className="p-1.5 rounded-lg hover:bg-white/5 transition">
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button onClick={() => setShowSubtitles(!showSubtitles)} className="p-1.5 rounded-lg hover:bg-white/5 transition" title="Toggle subtitles">
                {showSubtitles ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="h-32 glass border-t border-white/5 flex-shrink-0 overflow-x-auto" ref={timelineRef}>
            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
              <button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} className="p-1 rounded hover:bg-white/5">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-[var(--muted)]">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(Math.min(4, zoom + 0.25))} className="p-1 rounded hover:bg-white/5">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="relative h-20 p-2" style={{ width: `${Math.max(100, duration * 10 * zoom)}px` }}>
              {/* Time rulers */}
              {Array.from({ length: Math.ceil(duration / 5) + 1 }).map((_, i) => (
                <div key={i} className="absolute top-0 h-full border-l border-white/5" style={{ left: `${(i * 5 / (duration || 1)) * 100}%` }}>
                  <span className="text-[10px] text-[var(--muted)] ml-1">{formatDuration(i * 5)}</span>
                </div>
              ))}
              {/* Subtitle blocks */}
              {subtitlesList.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => { setSelectedId(sub.id); seekTo(sub.startTime); }}
                  className={`absolute top-6 h-10 rounded-md cursor-pointer flex items-center px-2 text-xs truncate transition ${
                    selectedId === sub.id ? "bg-indigo-500 text-white" : "bg-indigo-500/30 text-indigo-200 hover:bg-indigo-500/50"
                  }`}
                  style={{
                    left: `${duration ? (sub.startTime / duration) * 100 : 0}%`,
                    width: `${duration ? ((sub.endTime - sub.startTime) / duration) * 100 : 0}%`,
                    minWidth: "4px",
                  }}
                >
                  {sub.text}
                </div>
              ))}
              {/* Playhead */}
              <div
                className="absolute top-0 h-full w-0.5 bg-red-500 z-10"
                style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              >
                <div className="w-3 h-3 bg-red-500 rounded-full -translate-x-[5px] -translate-y-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <aside className="w-80 lg:w-96 glass border-l border-white/5 flex flex-col flex-shrink-0 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/5 flex-shrink-0">
            {[
              { key: "subtitles", label: "Subtitles", icon: Type },
              { key: "style", label: "Style", icon: Palette },
              { key: "templates", label: "Templates", icon: Sparkles },
              { key: "export", label: "Export", icon: Download },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex-1 py-3 text-xs flex flex-col items-center gap-1 transition border-b-2 ${
                  activeTab === tab.key ? "border-indigo-500 text-indigo-400" : "border-transparent text-[var(--muted)] hover:text-white"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Subtitles Tab */}
          {activeTab === "subtitles" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-white/5 flex items-center gap-2 flex-shrink-0">
                <button onClick={addSubtitle} className="flex-1 py-2 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-medium flex items-center justify-center gap-1 hover:bg-indigo-500/30 transition">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
                <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-lg hover:bg-white/5 transition">
                  <Search className="w-3.5 h-3.5 text-[var(--muted)]" />
                </button>
              </div>
              {showSearch && (
                <div className="p-3 border-b border-white/5 space-y-2 flex-shrink-0">
                  <input
                    value={searchText} onChange={(e) => setSearchText(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="Find..."
                  />
                  <div className="flex gap-2">
                    <input
                      value={replaceText} onChange={(e) => setReplaceText(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs focus:outline-none focus:border-indigo-500"
                      placeholder="Replace with..."
                    />
                    <button onClick={searchAndReplace} className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs hover:bg-indigo-500/30">
                      Replace All
                    </button>
                  </div>
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {subtitlesList.filter(s => !searchText || s.text.toLowerCase().includes(searchText.toLowerCase())).map((sub, i) => (
                  <div
                    key={sub.id}
                    onClick={() => { setSelectedId(sub.id); seekTo(sub.startTime); }}
                    className={`rounded-xl p-3 cursor-pointer transition ${
                      selectedId === sub.id ? "bg-indigo-500/20 border border-indigo-500/30" : "hover:bg-white/5 border border-transparent"
                    } ${currentTime >= sub.startTime && currentTime <= sub.endTime ? "ring-1 ring-green-500/30" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-[var(--muted)] font-mono">#{i + 1}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); splitSubtitle(sub.id); }} className="p-1 rounded hover:bg-white/10 transition" title="Split">
                          <Scissors className="w-3 h-3 text-[var(--muted)]" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); duplicateSubtitle(sub.id); }} className="p-1 rounded hover:bg-white/10 transition" title="Duplicate">
                          <Copy className="w-3 h-3 text-[var(--muted)]" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); mergeWithNext(sub.id); }} className="p-1 rounded hover:bg-white/10 transition" title="Merge with next">
                          <Merge className="w-3 h-3 text-[var(--muted)]" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteSubtitle(sub.id); }} className="p-1 rounded hover:bg-white/10 transition" title="Delete">
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={sub.text}
                      onChange={(e) => updateSubtitleText(sub.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-transparent text-sm resize-none focus:outline-none min-h-[40px]"
                      rows={2}
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-[var(--muted)]">Start</label>
                        <input
                          type="number" step="0.1" value={sub.startTime.toFixed(1)}
                          onChange={(e) => updateSubtitleTime(sub.id, "startTime", parseFloat(e.target.value) || 0)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-[var(--muted)]">End</label>
                        <input
                          type="number" step="0.1" value={sub.endTime.toFixed(1)}
                          onChange={(e) => updateSubtitleTime(sub.id, "endTime", parseFloat(e.target.value) || 0)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {subtitlesList.length === 0 && (
                  <div className="text-center py-10 text-[var(--muted)]">
                    <Type className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No subtitles yet</p>
                    <p className="text-xs mt-1">Click &quot;Add&quot; to create one</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Style Tab */}
          {activeTab === "style" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div>
                <label className="text-xs text-[var(--muted)] mb-1.5 block">Font Family</label>
                <select
                  value={style.fontFamily} onChange={(e) => setStyle({ ...style, fontFamily: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-indigo-500"
                >
                  {["Arial", "Georgia", "Courier New", "Times New Roman", "Verdana", "Impact", "Comic Sans MS"].map((f) => (
                    <option key={f} value={f} className="bg-[#1e1e2e]">{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-[var(--muted)] mb-1.5 block">Font Size: {style.fontSize}px</label>
                <input
                  type="range" min="12" max="72" value={style.fontSize}
                  onChange={(e) => setStyle({ ...style, fontSize: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStyle({ ...style, fontWeight: style.fontWeight === "bold" ? "normal" : "bold" })}
                  className={`p-2 rounded-lg border transition ${style.fontWeight === "bold" ? "border-indigo-500 bg-indigo-500/20" : "border-white/10 hover:bg-white/5"}`}>
                  <Bold className="w-4 h-4" />
                </button>
                <button onClick={() => setStyle({ ...style, textTransform: style.textTransform === "uppercase" ? "none" : "uppercase" })}
                  className={`p-2 rounded-lg border transition text-xs font-bold ${style.textTransform === "uppercase" ? "border-indigo-500 bg-indigo-500/20" : "border-white/10 hover:bg-white/5"}`}>
                  AA
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1.5 block">Text Color</label>
                  <input type="color" value={style.textColor} onChange={(e) => setStyle({ ...style, textColor: e.target.value })}
                    className="w-full h-10 rounded-lg cursor-pointer border border-white/10" />
                </div>
                <div>
                  <label className="text-xs text-[var(--muted)] mb-1.5 block">Outline Color</label>
                  <input type="color" value={style.outlineColor} onChange={(e) => setStyle({ ...style, outlineColor: e.target.value })}
                    className="w-full h-10 rounded-lg cursor-pointer border border-white/10" />
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--muted)] mb-1.5 block">Background Color</label>
                <input type="color" value={style.backgroundColor === "transparent" ? "#000000" : style.backgroundColor}
                  onChange={(e) => setStyle({ ...style, backgroundColor: e.target.value })}
                  className="w-full h-10 rounded-lg cursor-pointer border border-white/10" />
              </div>

              <div>
                <label className="text-xs text-[var(--muted)] mb-1.5 block">Background Opacity: {Math.round(style.backgroundOpacity * 100)}%</label>
                <input type="range" min="0" max="100" value={style.backgroundOpacity * 100}
                  onChange={(e) => setStyle({ ...style, backgroundOpacity: parseInt(e.target.value) / 100 })}
                  className="w-full accent-indigo-500" />
              </div>

              <div>
                <label className="text-xs text-[var(--muted)] mb-1.5 block">Outline Width: {style.outlineWidth}px</label>
                <input type="range" min="0" max="8" value={style.outlineWidth}
                  onChange={(e) => setStyle({ ...style, outlineWidth: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500" />
              </div>

              <div>
                <label className="text-xs text-[var(--muted)] mb-1.5 block">Vertical Position: {style.positionY}%</label>
                <input type="range" min="5" max="95" value={style.positionY}
                  onChange={(e) => setStyle({ ...style, positionY: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500" />
              </div>

              <div>
                <label className="text-xs text-[var(--muted)] mb-1.5 block">Alignment</label>
                <div className="flex gap-2">
                  {[{ v: "left", i: AlignLeft }, { v: "center", i: AlignCenter }, { v: "right", i: AlignRight }].map(({ v, i: Icon }) => (
                    <button key={v} onClick={() => setStyle({ ...style, alignment: v })}
                      className={`flex-1 p-2 rounded-lg border transition ${style.alignment === v ? "border-indigo-500 bg-indigo-500/20" : "border-white/10 hover:bg-white/5"}`}>
                      <Icon className="w-4 h-4 mx-auto" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--muted)] mb-1.5 block">Animation</label>
                <select value={style.animation} onChange={(e) => setStyle({ ...style, animation: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-indigo-500">
                  {["none", "fade", "zoom", "slideUp", "slideDown", "slideLeft", "slideRight", "bounce", "pop", "typewriter"].map((a) => (
                    <option key={a} value={a} className="bg-[#1e1e2e]">{a}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === "templates" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-xs text-[var(--muted)] mb-2">Choose a preset subtitle style</p>
              {Object.entries(TEMPLATES).map(([name, tmpl]) => (
                <button
                  key={name}
                  onClick={() => applyTemplate(name)}
                  className="w-full glass rounded-xl p-4 text-left hover:border-indigo-500/30 transition group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{name}</span>
                    <span className="text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition">Apply</span>
                  </div>
                  <div className="bg-black/40 rounded-lg p-3 flex items-center justify-center min-h-[50px]">
                    <span style={{
                      fontFamily: tmpl.fontFamily || "Arial",
                      fontSize: `${Math.min(tmpl.fontSize || 24, 20)}px`,
                      fontWeight: tmpl.fontWeight || "normal",
                      color: tmpl.textColor || "#FFFFFF",
                      textShadow: (tmpl.outlineWidth || 0) > 0 ? `0 0 ${tmpl.outlineWidth}px ${tmpl.outlineColor || "#000"}` : "none",
                    }}>
                      Sample Subtitle
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Export Tab */}
          {activeTab === "export" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <h3 className="text-sm font-medium">Export Subtitles</h3>
              <p className="text-xs text-[var(--muted)]">Download your subtitles in various formats</p>
              <div className="space-y-2">
                {[
                  { format: "srt", label: "SRT (SubRip)", desc: "Most commonly used format" },
                  { format: "vtt", label: "WebVTT", desc: "Web-native subtitle format" },
                  { format: "txt", label: "Plain Text", desc: "Text only, no timing" },
                ].map((exp) => (
                  <button
                    key={exp.format}
                    onClick={() => handleExport(exp.format)}
                    className="w-full glass rounded-xl p-4 text-left hover:border-indigo-500/30 transition group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{exp.label}</div>
                        <div className="text-xs text-[var(--muted)] mt-0.5">{exp.desc}</div>
                      </div>
                      <Download className="w-4 h-4 text-[var(--muted)] group-hover:text-indigo-400 transition" />
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-white/5">
                <h4 className="text-sm font-medium mb-3">Quick Stats</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-indigo-400">{subtitlesList.length}</div>
                    <div className="text-xs text-[var(--muted)]">Subtitles</div>
                  </div>
                  <div className="glass rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-indigo-400">{subtitlesList.reduce((a, s) => a + s.text.split(" ").length, 0)}</div>
                    <div className="text-xs text-[var(--muted)]">Words</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
