"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, User, Mail, Lock, Trash2, Moon, Sun, Monitor,
  Save, Subtitles, Keyboard, Eye, EyeOff
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");
  const [autoSave, setAutoSave] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user);
          setName(d.user.name);
        } else {
          router.push("/login");
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setMessage("Settings saved");
      setTimeout(() => setMessage(""), 3000);
    }, 500);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      <header className="sticky top-0 z-30 glass border-b border-white/5 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="p-1.5 rounded-lg hover:bg-white/5 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center">
              <Subtitles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold">Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        {message && (
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">{message}</div>
        )}

        {/* Profile */}
        <section className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><User className="w-5 h-5 text-indigo-400" /> Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[var(--muted)] mb-1.5 block">Display Name</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-indigo-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-[var(--muted)] mb-1.5 block">Email</label>
              <input
                type="email" value={user.email} readOnly
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-[var(--muted)]"
              />
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Lock className="w-5 h-5 text-indigo-400" /> Security</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[var(--muted)] mb-1.5 block">Current Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-indigo-500 focus:outline-none text-sm pr-10"
                />
                <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showPw ? <EyeOff className="w-4 h-4 text-[var(--muted)]" /> : <Eye className="w-4 h-4 text-[var(--muted)]" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm text-[var(--muted)] mb-1.5 block">New Password</label>
              <input
                type={showPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-indigo-500 focus:outline-none text-sm"
              />
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Moon className="w-5 h-5 text-indigo-400" /> Appearance</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "dark" as const, icon: Moon, label: "Dark" },
              { value: "light" as const, icon: Sun, label: "Light" },
              { value: "system" as const, icon: Monitor, label: "System" },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`p-4 rounded-xl border text-center transition ${theme === t.value ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 hover:bg-white/5"}`}
              >
                <t.icon className="w-5 h-5 mx-auto mb-2" />
                <span className="text-sm">{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Editor */}
        <section className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Keyboard className="w-5 h-5 text-indigo-400" /> Editor</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Auto-save every 5 seconds</span>
              <button
                onClick={() => setAutoSave(!autoSave)}
                className={`w-12 h-6 rounded-full transition-colors relative ${autoSave ? "bg-indigo-500" : "bg-white/10"}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${autoSave ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </label>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5">
            <h3 className="text-sm font-medium mb-3">Keyboard Shortcuts</h3>
            <div className="space-y-2 text-sm">
              {[
                { key: "Ctrl + S", action: "Save" },
                { key: "Ctrl + Z", action: "Undo" },
                { key: "Ctrl + Y", action: "Redo" },
                { key: "Space", action: "Play/Pause" },
                { key: "← →", action: "Seek ±5s" },
                { key: "Delete", action: "Remove subtitle" },
              ].map((s) => (
                <div key={s.key} className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">{s.action}</span>
                  <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs font-mono">{s.key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="glass rounded-2xl p-6 border-red-500/20">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-400"><Trash2 className="w-5 h-5" /> Danger Zone</h2>
          <p className="text-sm text-[var(--muted)] mb-4">Once you delete your account, there is no going back.</p>
          <button className="px-4 py-2 rounded-xl border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition">
            Delete Account
          </button>
        </section>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 rounded-xl gradient-bg text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Settings"}
        </button>
      </main>
    </div>
  );
}
