"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Subtitles, Upload, Search, Plus, MoreHorizontal, Star, Trash2,
  Edit3, Clock, Grid3X3, List, FileVideo, LogOut, Settings, User,
  FolderOpen, Archive, Heart, LayoutDashboard, ChevronDown, Menu, X
} from "lucide-react";
import { formatFileSize, formatDuration, truncate } from "@/lib/utils";

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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState<"all" | "favorite" | "archived">("all");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

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

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 10, 90));
    }, 200);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      clearInterval(interval);
      setUploadProgress(100);
      if (data.project) {
        setTimeout(() => {
          setUploading(false);
          router.push(`/editor/${data.project.id}`);
        }, 500);
      }
    } catch {
      clearInterval(interval);
      setUploading(false);
    }
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

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-[#0a0a1a]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
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
            <input type="file" className="hidden" accept="video/*" onChange={(e) => handleUpload(e.target.files)} />
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

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        {/* Top Bar */}
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

        <div className="p-4 sm:p-6">
          {/* Upload progress */}
          {uploading && (
            <div className="glass rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-indigo-400 animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Uploading video...</div>
                  <div className="text-xs text-[var(--muted)]">{uploadProgress}%</div>
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full gradient-bg rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {/* Empty State */}
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
                <input type="file" className="hidden" accept="video/*" onChange={(e) => handleUpload(e.target.files)} />
              </label>
            </div>
          )}

          {/* Project Grid */}
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

          {/* Project List */}
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
