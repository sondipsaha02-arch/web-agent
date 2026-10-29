import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Copy,
  Check,
  Download,
  Edit3,
  Eye,
  X,
  Minus,
  Maximize2,
  Minimize2,
  Sparkles,
  RefreshCw,
  Share2,
  Code2,
  Mail,
  Video,
  BookOpen,
  Save,
  Trash2,
  Terminal,
  ExternalLink,
  Layers
} from "lucide-react";
import { ActiveDraft } from "../types";

interface InteractiveDraftModalProps {
  draft: ActiveDraft | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateDraft?: (updated: ActiveDraft) => void;
}

export const InteractiveDraftModal: React.FC<InteractiveDraftModalProps> = ({
  draft,
  isOpen,
  onClose,
  onUpdateDraft,
}) => {
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");
  const [copied, setCopied] = useState(false);
  const [editableContent, setEditableContent] = useState("");
  const [editableTitle, setEditableTitle] = useState("");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Sync draft changes
  useEffect(() => {
    if (draft) {
      setEditableContent(draft.content || "");
      setEditableTitle(draft.title || "Untitled Draft");
    }
  }, [draft]);

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !draft) return null;

  // Stats calculation
  const words = editableContent.trim().split(/\s+/).filter(Boolean).length;
  const chars = editableContent.length;
  const readingTimeMin = Math.max(1, Math.ceil(words / 150));

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editableContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {
      console.warn("Failed to copy:", e);
    }
  };

  // Save manual edits
  const handleSave = () => {
    if (onUpdateDraft && draft) {
      const updated: ActiveDraft = {
        ...draft,
        title: editableTitle,
        content: editableContent,
        updatedAt: Date.now(),
      };
      onUpdateDraft(updated);
      try {
        localStorage.setItem("tune_active_draft", JSON.stringify(updated));
      } catch {}
      setSaveStatus("Saved!");
      setTimeout(() => setSaveStatus(null), 2000);
    }
  };

  // Download draft file
  const handleDownload = () => {
    const filename = `${editableTitle.replace(/[^a-zA-Z0-9_-]/g, "_") || "Tune_Draft"}.md`;
    const blob = new Blob([editableContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Icon by Content Type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "script":
        return <Video className="w-4 h-4 text-rose-400" />;
      case "email":
        return <Mail className="w-4 h-4 text-blue-400" />;
      case "code":
        return <Code2 className="w-4 h-4 text-emerald-400" />;
      case "article":
      case "notes":
        return <BookOpen className="w-4 h-4 text-amber-400" />;
      default:
        return <FileText className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed z-50 pointer-events-none inset-0 flex items-center justify-center p-2 sm:p-5 select-none">
      <AnimatePresence mode="wait">
        {isMinimized ? (
          /* ================= MINIMIZED FLOATING CAPSULE ================= */
          <motion.div
            key="minimized-draft"
            initial={{ opacity: 0, scale: 0.85, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 25 }}
            className="fixed bottom-20 right-4 sm:bottom-24 sm:right-8 pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#0c0d14]/95 border border-cyan-500/40 shadow-[0_15px_35px_rgba(0,0,0,0.8)] backdrop-blur-2xl cursor-pointer hover:border-cyan-400 transition-all select-none group"
            onClick={() => setIsMinimized(false)}
          >
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              {getTypeIcon(draft.contentType)}
            </div>

            <div className="flex flex-col min-w-0 pr-1 text-left">
              <span className="text-[9px] uppercase font-mono tracking-wider text-cyan-400 font-bold">
                {draft.contentType.toUpperCase()} DRAFT
              </span>
              <span className="text-xs font-semibold text-white truncate max-w-[130px] sm:max-w-[180px]">
                {editableTitle}
              </span>
            </div>

            {/* Quick Copy in Minimized Pill */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition cursor-pointer"
              title="Copy text"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {/* Expand Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(false);
              }}
              className="p-1.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 transition cursor-pointer"
              title="Expand Draft Editor"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Close / Dismiss Pill Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 hover:text-rose-100 transition cursor-pointer"
              title="Close Draft"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ) : (
          /* ================= FULL EXPANDED DRAFT MODAL / ULTRA-PREMIUM CANVAS ================= */
          <div
            className="fixed inset-0 pointer-events-auto flex items-center justify-center bg-black/75 backdrop-blur-xl p-2 sm:p-4 overflow-hidden"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <motion.div
              key="expanded-draft-modal"
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={`w-full flex flex-col bg-[#0c0d14]/98 border border-cyan-500/30 rounded-[28px] shadow-[0_25px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl overflow-hidden transition-all select-none ${
                isFullscreen
                  ? "h-[96vh] max-w-[96vw]"
                  : "h-[86vh] max-h-[780px] max-w-3xl"
              }`}
            >
              {/* TOP HEADER: Luxurious Obsidian Bar */}
              <div className="px-4 sm:px-6 py-3.5 border-b border-white/10 bg-white/[0.03] flex items-center justify-between gap-3 shrink-0">
                {/* Left Header Title & Badge */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                    {getTypeIcon(draft.contentType)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editableTitle}
                        onChange={(e) => setEditableTitle(e.target.value)}
                        onBlur={handleSave}
                        className="text-base font-bold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-cyan-400 focus:outline-none truncate max-w-[180px] sm:max-w-[300px] transition"
                        placeholder="Draft Title..."
                      />
                      <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 shrink-0 font-bold tracking-wide">
                        {draft.contentType}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-[11px] text-zinc-400 font-mono mt-0.5">
                      <span className="text-zinc-300 font-semibold">{words} words</span>
                      <span>•</span>
                      <span>{chars} chars</span>
                      <span>•</span>
                      <span>~{readingTimeMin} min read</span>
                      {saveStatus && (
                        <span className="text-emerald-400 font-semibold animate-pulse ml-1">
                          ✓ {saveStatus}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Header Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* View / Edit Mode Switcher */}
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5 mr-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab("preview")}
                      className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                        activeTab === "preview"
                          ? "bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/30"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("edit")}
                      className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                        activeTab === "edit"
                          ? "bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/30"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>

                  {/* Main Copy Button */}
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md ${
                      copied
                        ? "bg-emerald-500 border-emerald-400 text-zinc-950 font-bold"
                        : "bg-cyan-500 hover:bg-cyan-400 border-cyan-400 text-zinc-950 font-bold shadow-cyan-500/20"
                    }`}
                    title="Copy full draft to clipboard"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Copy Draft</span>
                      </>
                    )}
                  </button>

                  {/* Download Button */}
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
                    title="Download as .md file"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* Fullscreen Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>

                  {/* Minimize Button */}
                  <button
                    type="button"
                    onClick={() => setIsMinimized(true)}
                    className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
                    title="Minimize Draft"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  {/* PROMINENT CLOSE BUTTON */}
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-300 hover:text-rose-100 transition cursor-pointer flex items-center gap-1 font-semibold text-xs"
                    title="Close Canvas (ESC)"
                  >
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline">Close</span>
                  </button>
                </div>
              </div>

              {/* MAIN CONTENT CANVAS (Formatted Preview or Live Markdown Editor) */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-8 select-text bg-[#090a10]/60">
                {activeTab === "preview" ? (
                  /* ================= FORMATTED PREVIEW CANVAS ================= */
                  <div className="w-full h-full text-zinc-200 leading-relaxed font-sans text-sm sm:text-base space-y-4 max-w-none">
                    {editableContent.split("\n").map((line, idx) => {
                      const trimmed = line.trim();
                      if (!trimmed) {
                        return <div key={idx} className="h-2" />;
                      }

                      // Headings
                      if (trimmed.startsWith("### ")) {
                        return (
                          <h3 key={idx} className="text-base font-bold text-cyan-300 pt-3 pb-1 border-b border-cyan-500/20 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            {trimmed.replace(/^###\s*/, "")}
                          </h3>
                        );
                      }
                      if (trimmed.startsWith("## ")) {
                        return (
                          <h2 key={idx} className="text-lg font-bold text-white pt-4 pb-1.5 border-b border-white/10">
                            {trimmed.replace(/^##\s*/, "")}
                          </h2>
                        );
                      }
                      if (trimmed.startsWith("# ")) {
                        return (
                          <h1 key={idx} className="text-xl font-extrabold text-cyan-400 pt-3 pb-1">
                            {trimmed.replace(/^#\s*/, "")}
                          </h1>
                        );
                      }

                      // Script Scene / Dialogue cues (e.g. [SCENE 1: ...], [Voiceover]:, [Camera]:)
                      if (trimmed.startsWith("[") && trimmed.includes("]")) {
                        return (
                          <div key={idx} className="my-2.5 p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 font-mono text-xs font-semibold shadow-sm">
                            {trimmed}
                          </div>
                        );
                      }

                      // Bullet Points
                      if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ")) {
                        return (
                          <div key={idx} className="flex items-start gap-2.5 text-zinc-300 pl-2">
                            <span className="text-cyan-400 font-bold mt-1">•</span>
                            <span>{trimmed.replace(/^[-•*]\s*/, "")}</span>
                          </div>
                        );
                      }

                      // Numbered List
                      if (/^\d+\.\s/.test(trimmed)) {
                        const match = trimmed.match(/^(\d+\.)\s*(.*)/);
                        return (
                          <div key={idx} className="flex items-start gap-2.5 text-zinc-300 pl-2">
                            <span className="font-mono text-cyan-400 font-bold">{match?.[1]}</span>
                            <span>{match?.[2]}</span>
                          </div>
                        );
                      }

                      // Standard Paragraph / Dialogue
                      return (
                        <p key={idx} className="text-zinc-200 whitespace-pre-wrap leading-relaxed">
                          {line}
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  /* ================= LIVE EDITABLE TEXTAREA ================= */
                  <textarea
                    value={editableContent}
                    onChange={(e) => setEditableContent(e.target.value)}
                    onBlur={handleSave}
                    placeholder="Write or edit your draft here..."
                    className="w-full h-full min-h-[380px] bg-transparent text-zinc-100 font-mono text-sm sm:text-base leading-relaxed resize-none focus:outline-none border-none selection:bg-cyan-500/30"
                    autoFocus
                  />
                )}
              </div>

              {/* FOOTER BAR: Clear Close & Save Controls */}
              <div className="px-5 py-3 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-zinc-400 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    Interactive Studio Canvas
                  </span>
                  <span>•</span>
                  <span>Press <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-zinc-300 font-mono text-[10px]">ESC</kbd> to exit</span>
                </div>

                <div className="flex items-center gap-2">
                  {activeTab === "edit" && (
                    <button
                      type="button"
                      onClick={handleSave}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-semibold border border-cyan-400/30 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied!" : "Copy All"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition cursor-pointer"
                  >
                    Close Canvas
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InteractiveDraftModal;
