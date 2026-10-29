import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  MessageSquare,
  Trash2,
  X,
  ChevronRight,
  BookOpen,
  ArrowLeft,
  Sparkles,
  Heart
} from "lucide-react";
import { Transcription } from "../types";

interface ChatSession {
  id: string;
  timestamp: string;
  title: string;
  messages: Transcription[];
}

interface ChatHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatHistory({ isOpen, onClose }: ChatHistoryProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);

  // Load chat history from localStorage
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem("tune_chat_history_archive");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSessions(Array.isArray(parsed) ? parsed : []);
        } catch {
          setSessions([]);
        }
      } else {
        setSessions([]);
      }
    }
  }, [isOpen]);

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = (sessions || []).filter((s) => s && s.id !== id);
    setSessions(updated);
    localStorage.setItem("tune_chat_history_archive", JSON.stringify(updated));
    if (selectedSession?.id === id) {
      setSelectedSession(null);
    }
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to delete all chat history?")) {
      setSessions([]);
      localStorage.removeItem("tune_chat_history_archive");
      setSelectedSession(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-45 flex items-center justify-center p-3 md:p-6 select-text">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-4xl h-[80vh] bg-[#0c0c12]/95 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col font-sans"
      >
        {/* HEADER */}
        <div className="px-5 py-4 bg-[#14141e] border-b border-white/5 flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-500 flex items-center justify-center text-zinc-950 shadow-lg">
              <BookOpen className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wider text-white">CONVERSATION ARCHIVE</h2>
              <p className="text-[10px] text-white/40 font-mono">SECURE TRANSCRIPTS & CHAT HISTORY</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {sessions.length > 0 && !selectedSession && (
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 border border-red-500/30 hover:border-red-500/50 bg-red-500/5 hover:bg-red-500/10 text-red-400 font-mono text-[9px] rounded-lg transition cursor-pointer"
              >
                Clear History
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition cursor-pointer border border-white/5"
            >
              Close
            </button>
          </div>
        </div>

        {/* CONTAINER */}
        <div className="flex-1 overflow-hidden flex bg-[#08080c]">
          
          {/* VIEW SESSION DETAILS */}
          {selectedSession ? (
            <div className="flex-1 flex flex-col h-full">
              {/* Session reading controls */}
              <div className="px-4 py-2 bg-[#12121c] border-b border-white/5 flex items-center gap-3 select-none">
                <button
                  onClick={() => setSelectedSession(null)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to List
                </button>
                <div className="h-4 w-px bg-white/10" />
                <span className="text-[10px] text-white/40 font-mono">
                  {new Date(selectedSession.timestamp).toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </span>
              </div>

              {/* Chat reading area */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-zinc-950">
                {selectedSession.messages.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    className={`flex flex-col max-w-xl ${m.isUser ? "ml-auto items-end" : "mr-auto items-start"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.2 rounded ${
                        m.isUser ? "bg-cyan-500/10 text-cyan-400" : "bg-purple-500/10 text-purple-400"
                      }`}>
                        {m.isUser ? "You" : "Tune"}
                      </span>
                      <span className="text-[8px] text-white/20 font-mono">
                        {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                    <div className={`px-4 py-3 rounded-2xl text-xs leading-relaxed ${
                      m.isUser 
                        ? "bg-cyan-500/10 text-cyan-100 border border-cyan-500/20 rounded-tr-none" 
                        : "bg-[#12121c] text-white/90 border border-white/5 rounded-tl-none"
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* SESSIONS LIST */
            <div className="flex-1 flex flex-col p-5 md:p-6 overflow-y-auto">
              {sessions.length > 0 ? (
                <div className="space-y-2.5 max-w-2xl w-full mx-auto">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-white/30 uppercase block mb-2 select-none">
                    SAVED CHAT CONVERSATIONS
                  </span>
                  
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => setSelectedSession(session)}
                      className="w-full text-left p-4 bg-[#11111a] border border-white/5 hover:border-white/10 rounded-2xl flex items-center justify-between transition cursor-pointer select-none group"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/10 group-hover:text-cyan-300 transition">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-white/90 group-hover:text-cyan-300 transition truncate">
                            {session.title || "Untitled Conversation"}
                          </h4>
                          <p className="text-[10px] text-white/40 font-mono mt-1 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-cyan-500/40" />
                            {new Date(session.timestamp).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            <span>•</span>
                            <span>{session.messages.length} messages</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="p-2 hover:bg-red-500/10 text-white/20 hover:text-red-400 rounded-lg transition border border-transparent hover:border-red-500/20 cursor-pointer"
                          title="Delete Session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="m-auto text-center max-w-xs py-12 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4 select-none">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h3 className="text-xs font-bold text-white/80">No transcripts recorded yet</h3>
                  <p className="text-[11px] text-white/40 mt-1.5 leading-relaxed">
                    Once you start talking to Tune, we will securely save session snapshots here so you can review them at any time!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
