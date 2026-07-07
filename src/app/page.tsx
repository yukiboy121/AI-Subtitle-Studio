"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Subtitles, Upload, Sparkles, Globe, Zap, FileVideo,
  ChevronRight, Star, Play, ArrowRight, Menu, X, Moon, Sun,
  Languages, Wand2, Clock, Download, Shield, Users
} from "lucide-react";

const features = [
  { icon: Sparkles, title: "AI-Powered Transcription", desc: "Automatically generate accurate subtitles using open-source Whisper AI technology." },
  { icon: Languages, title: "Multi-Language Translation", desc: "Translate subtitles into 13+ languages using LibreTranslate — completely free." },
  { icon: Wand2, title: "Smart Editor", desc: "Professional timeline editor with waveform visualization and real-time preview." },
  { icon: Clock, title: "Auto-Save & Versioning", desc: "Never lose your work with automatic saving every 5 seconds and version history." },
  { icon: Download, title: "Multi-Format Export", desc: "Export to SRT, VTT, TXT, ASS, or burn subtitles directly into your video." },
  { icon: Shield, title: "100% Self-Hosted", desc: "Your data stays on your server. No third-party APIs, no cloud dependency." },
];

const templates = [
  { name: "Netflix", color: "from-red-500 to-red-700", desc: "Clean white text with subtle shadow" },
  { name: "YouTube", color: "from-red-600 to-orange-500", desc: "Bold yellow text on dark background" },
  { name: "TikTok", color: "from-pink-500 to-purple-600", desc: "Animated pop-in with glow effect" },
  { name: "Cinema", color: "from-amber-500 to-yellow-600", desc: "Classic movie subtitle style" },
  { name: "Gaming", color: "from-green-400 to-cyan-500", desc: "Neon glow with sharp edges" },
  { name: "Minimal", color: "from-gray-400 to-gray-600", desc: "Clean and understated design" },
];

const faqs = [
  { q: "Is AI Subtitle Studio really free?", a: "Yes! Everything is open source and self-hosted. There are no paid APIs or hidden costs." },
  { q: "What AI model is used for transcription?", a: "We use OpenAI's Whisper model (open source) via Faster Whisper for efficient transcription." },
  { q: "How accurate is the transcription?", a: "Whisper provides state-of-the-art accuracy supporting 99 languages with automatic language detection." },
  { q: "Can I translate subtitles?", a: "Yes! We integrate LibreTranslate for free, open-source translation into 13+ languages." },
  { q: "What export formats are supported?", a: "SRT, WebVTT, TXT, ASS, and you can burn subtitles directly into your MP4 video." },
];

export default function LandingPage() {
  const router = useRouter();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.user) setUser(d.user); })
      .catch(() => {});
  }, []);

  return (
    <div className={isDark ? "" : "light-mode"}>
      <div className="min-h-screen relative overflow-hidden">
        {/* Background */}
        <div className="fixed inset-0 -z-10">
          <div className={`absolute inset-0 ${isDark ? "bg-[#0a0a1a]" : "bg-gradient-to-br from-slate-50 to-indigo-50"}`} />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px]" />
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/5 rounded-full blur-[128px]" />
        </div>

        {/* Navbar */}
        <nav className="fixed top-0 left-0 right-0 z-50 glass">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center">
                  <Subtitles className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold">AI Subtitle Studio</span>
              </div>
              <div className="hidden md:flex items-center gap-8">
                <a href="#features" className="text-sm text-[var(--muted)] hover:text-[var(--fg)] transition">Features</a>
                <a href="#templates" className="text-sm text-[var(--muted)] hover:text-[var(--fg)] transition">Templates</a>
                <a href="#faq" className="text-sm text-[var(--muted)] hover:text-[var(--fg)] transition">FAQ</a>
                <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-lg hover:bg-white/10 transition">
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                {user ? (
                  <button onClick={() => router.push("/dashboard")} className="px-4 py-2 rounded-xl gradient-bg text-white text-sm font-medium hover:opacity-90 transition">
                    Dashboard
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <button onClick={() => router.push("/login")} className="text-sm text-[var(--muted)] hover:text-[var(--fg)] transition">Sign In</button>
                    <button onClick={() => router.push("/register")} className="px-4 py-2 rounded-xl gradient-bg text-white text-sm font-medium hover:opacity-90 transition">
                      Get Started
                    </button>
                  </div>
                )}
              </div>
              <button className="md:hidden p-2" onClick={() => setMobileMenu(!mobileMenu)}>
                {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
          {mobileMenu && (
            <div className="md:hidden glass border-t border-white/5 p-4 space-y-3">
              <a href="#features" className="block py-2 text-sm" onClick={() => setMobileMenu(false)}>Features</a>
              <a href="#templates" className="block py-2 text-sm" onClick={() => setMobileMenu(false)}>Templates</a>
              <a href="#faq" className="block py-2 text-sm" onClick={() => setMobileMenu(false)}>FAQ</a>
              {user ? (
                <button onClick={() => router.push("/dashboard")} className="w-full py-2 rounded-xl gradient-bg text-white text-sm font-medium">Dashboard</button>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => router.push("/login")} className="flex-1 py-2 rounded-xl border border-white/10 text-sm">Sign In</button>
                  <button onClick={() => router.push("/register")} className="flex-1 py-2 rounded-xl gradient-bg text-white text-sm font-medium">Sign Up</button>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Hero */}
        <section className="pt-32 pb-20 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-sm mb-8">
              <Sparkles className="w-4 h-4" />
              Open Source AI Subtitle Editor
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              Create Perfect
              <br />
              <span className="gradient-text">Subtitles with AI</span>
            </h1>
            <p className="text-lg sm:text-xl text-[var(--muted)] max-w-2xl mx-auto mb-10">
              Professional subtitle editor powered by open-source AI. Transcribe, translate, style, and export — all self-hosted, all free.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => router.push(user ? "/dashboard" : "/register")}
                className="group px-8 py-4 rounded-2xl gradient-bg text-white font-semibold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Start Creating
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="group px-8 py-4 rounded-2xl border border-white/10 hover:border-white/20 font-semibold text-lg transition-all flex items-center gap-2">
                <Play className="w-5 h-5" />
                Watch Demo
              </button>
            </div>

            {/* Stats */}
            <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Languages", value: "99+" },
                { label: "Export Formats", value: "5+" },
                { label: "Templates", value: "10+" },
                { label: "Open Source", value: "100%" },
              ].map((s) => (
                <div key={s.label} className="glass rounded-2xl p-6">
                  <div className="text-3xl font-bold gradient-text">{s.value}</div>
                  <div className="text-sm text-[var(--muted)] mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-5xl font-bold mb-4">Powerful Features</h2>
              <p className="text-[var(--muted)] text-lg max-w-2xl mx-auto">Everything you need for professional subtitle creation, built with open-source technology.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f) => (
                <div key={f.title} className="group glass rounded-2xl p-8 hover:border-indigo-500/30 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <f.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
                  <p className="text-[var(--muted)] leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Templates */}
        <section id="templates" className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-5xl font-bold mb-4">Subtitle Templates</h2>
              <p className="text-[var(--muted)] text-lg max-w-2xl mx-auto">Choose from professionally designed templates or create your own custom style.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((t) => (
                <div key={t.name} className="group glass rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all duration-300">
                  <div className={`h-32 bg-gradient-to-br ${t.color} flex items-center justify-center relative`}>
                    <div className="absolute inset-0 bg-black/30" />
                    <span className="relative text-white text-xl font-bold drop-shadow-lg">{t.name} Style</span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-2">{t.name}</h3>
                    <p className="text-sm text-[var(--muted)]">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-5xl font-bold mb-4">FAQ</h2>
              <p className="text-[var(--muted)] text-lg">Frequently asked questions about AI Subtitle Studio.</p>
            </div>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div key={i} className="glass rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-6 text-left"
                  >
                    <span className="font-medium">{faq.q}</span>
                    <ChevronRight className={`w-5 h-5 text-[var(--muted)] transition-transform ${openFaq === i ? "rotate-90" : ""}`} />
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-6 text-[var(--muted)]">{faq.a}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center glass rounded-3xl p-12 md:p-16 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10" />
            <div className="relative">
              <h2 className="text-3xl sm:text-5xl font-bold mb-6">Ready to Create?</h2>
              <p className="text-lg text-[var(--muted)] mb-10 max-w-xl mx-auto">
                Join the open-source revolution in subtitle creation. No API keys needed. No monthly fees.
              </p>
              <button
                onClick={() => router.push(user ? "/dashboard" : "/register")}
                className="px-8 py-4 rounded-2xl gradient-bg text-white font-semibold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
              >
                Get Started Free <ArrowRight className="w-5 h-5 inline ml-2" />
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                    <Subtitles className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold">AI Subtitle Studio</span>
                </div>
                <p className="text-sm text-[var(--muted)]">Professional AI-powered subtitle editor. Open source, self-hosted, and free.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Product</h4>
                <div className="space-y-2 text-sm text-[var(--muted)]">
                  <a href="#features" className="block hover:text-[var(--fg)]">Features</a>
                  <a href="#templates" className="block hover:text-[var(--fg)]">Templates</a>
                  <a href="#faq" className="block hover:text-[var(--fg)]">FAQ</a>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Resources</h4>
                <div className="space-y-2 text-sm text-[var(--muted)]">
                  <span className="block">Documentation</span>
                  <span className="block">API Reference</span>
                  <span className="block">Self-Hosting Guide</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Legal</h4>
                <div className="space-y-2 text-sm text-[var(--muted)]">
                  <span className="block">Privacy Policy</span>
                  <span className="block">Terms of Service</span>
                  <span className="block">License (MIT)</span>
                </div>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-[var(--muted)]">© 2025 AI Subtitle Studio. Open Source Software.</p>
              <div className="flex items-center gap-4">
                <Star className="w-4 h-4 text-[var(--muted)]" />
                <span className="text-sm text-[var(--muted)]">Star on GitHub</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
