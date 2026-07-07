"use client";
import { create } from "zustand";

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string | null;
}

export interface Subtitle {
  id: string;
  trackId: string;
  index: number;
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string | null;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  thumbnail?: string | null;
  status: string;
  language?: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubtitleStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  textColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  outlineColor: string;
  outlineWidth: number;
  positionX: number;
  positionY: number;
  alignment: string;
  animation: string;
  textTransform: string;
  letterSpacing: number;
  lineHeight: number;
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;

  theme: "dark" | "light";
  toggleTheme: () => void;

  currentProject: Project | null;
  setCurrentProject: (p: Project | null) => void;

  subtitles: Subtitle[];
  setSubtitles: (s: Subtitle[]) => void;
  addSubtitle: (s: Subtitle) => void;
  updateSubtitle: (id: string, updates: Partial<Subtitle>) => void;
  deleteSubtitle: (id: string) => void;

  selectedSubtitleId: string | null;
  setSelectedSubtitleId: (id: string | null) => void;

  currentTime: number;
  setCurrentTime: (t: number) => void;

  isPlaying: boolean;
  setIsPlaying: (p: boolean) => void;

  duration: number;
  setDuration: (d: number) => void;

  style: SubtitleStyle;
  updateStyle: (updates: Partial<SubtitleStyle>) => void;

  undoStack: Subtitle[][];
  redoStack: Subtitle[][];
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;

  sidebarOpen: boolean;
  toggleSidebar: () => void;

  toast: { message: string; type: "success" | "error" | "warning" | "info" } | null;
  showToast: (message: string, type: "success" | "error" | "warning" | "info") => void;
  clearToast: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),

  theme: "dark",
  toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),

  currentProject: null,
  setCurrentProject: (p) => set({ currentProject: p }),

  subtitles: [],
  setSubtitles: (s) => set({ subtitles: s }),
  addSubtitle: (s) => set((state) => ({ subtitles: [...state.subtitles, s].sort((a, b) => a.startTime - b.startTime) })),
  updateSubtitle: (id, updates) =>
    set((state) => ({
      subtitles: state.subtitles.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),
  deleteSubtitle: (id) => set((state) => ({ subtitles: state.subtitles.filter((s) => s.id !== id) })),

  selectedSubtitleId: null,
  setSelectedSubtitleId: (id) => set({ selectedSubtitleId: id }),

  currentTime: 0,
  setCurrentTime: (t) => set({ currentTime: t }),

  isPlaying: false,
  setIsPlaying: (p) => set({ isPlaying: p }),

  duration: 0,
  setDuration: (d) => set({ duration: d }),

  style: {
    fontFamily: "Arial",
    fontSize: 24,
    fontWeight: "bold",
    fontStyle: "normal",
    textColor: "#FFFFFF",
    backgroundColor: "#000000",
    backgroundOpacity: 0.6,
    outlineColor: "#000000",
    outlineWidth: 2,
    positionX: 50,
    positionY: 88,
    alignment: "center",
    animation: "none",
    textTransform: "none",
    letterSpacing: 0,
    lineHeight: 1.4,
  },
  updateStyle: (updates) => set((state) => ({ style: { ...state.style, ...updates } })),

  undoStack: [],
  redoStack: [],
  pushUndo: () =>
    set((state) => ({
      undoStack: [...state.undoStack.slice(-20), [...state.subtitles]],
      redoStack: [],
    })),
  undo: () => {
    const { undoStack, subtitles } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    set({
      subtitles: prev,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, [...subtitles]],
    });
  },
  redo: () => {
    const { redoStack, subtitles } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    set({
      subtitles: next,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, [...subtitles]],
    });
  },

  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  toast: null,
  showToast: (message, type) => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),
}));
