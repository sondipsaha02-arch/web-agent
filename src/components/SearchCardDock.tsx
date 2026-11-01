import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  ExternalLink,
  X,
  ChevronDown,
  ChevronUp,
  GripHorizontal,
  Copy,
  Check,
  Globe,
  Sparkles,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { soundEngine } from "../utils/soundEngine";

export interface SearchCardSource {
  title?: string;
  url: string;
  domain?: string;
  imageUrl?: string;
  verified?: boolean;
}

export interface SearchCardData {
  query: string;
  title?: string;
  summary?: string;
  sources?: SearchCardSource[];
  timestamp?: number;
  isLoading?: boolean;
}

interface SearchCardDockProps {
  initialData?: SearchCardData | null;
  onClose?: () => void;
}

export const SearchCardDock: React.FC<SearchCardDockProps> = ({
  initialData,
  onClose
}) => {
  const [searchData, setSearchData] = useState<SearchCardData | null>(initialData || null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Listen to window custom event for real-time card search triggers
  useEffect(() => {
    const handleCardSearchEvent = (e: any) => {
      // Check if Card Search is enabled in settings
      const isCardSearchEnabled =
        typeof localStorage !== "undefined"
          ? localStorage.getItem("tune_card_search") !== "false"
          : true;

      if (!isCardSearchEnabled) return;

      if (e.detail?.query || e.detail?.summary) {
        setSearchData({
          query: e.detail.query || e.detail.topic || "Search",
          title: e.detail.title || e.detail.query || "Google Search Result",
          summary: e.detail.summary || e.detail.text || "",
          sources: e.detail.sources || [],
          timestamp: Date.now(),
          isLoading: !!e.detail.isLoading
        });
        setSearchQuery(e.detail.query || "");
        setIsMinimized(false);
        soundEngine.playWaterDropSound();
      }
    };

    window.addEventListener("tune_card_search", handleCardSearchEvent);
    return () => {
      window.removeEventListener("tune_card_search", handleCardSearchEvent);
    };
  }, []);

  const handleManualSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearching(true);
    soundEngine.playActionBeep();

    setSearchData(prev => ({
      query: q,
      title: q,
      summary: "গুগল থেকে সর্বশেষ তথ্য সংগ্রহ ও বিশ্লেষণ করা হচ্ছে...",
      sources: [],
      timestamp: Date.now(),
      isLoading: true
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Please research and give a concise, decisive answer with key facts and bullet points in Bengali/Banglish for: "${q}"`
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSearchData({
          query: q,
          title: q,
          summary: data.text || "তথ্য পাওয়া গেছে।",
          sources: [
            {
              title: `Google Search for "${q}"`,
              url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
              domain: "google.com",
              verified: true
            }
          ],
          timestamp: Date.now(),
          isLoading: false
        });
        soundEngine.playNotificationChime();
      } else {
        throw new Error("Search request failed");
      }
    } catch {
      setSearchData({
        query: q,
        title: q,
        summary: `গুগলে সরাসরি "${q}" অনুসন্ধান করতে নিচের লিঙ্কে ট্যাপ করুন।`,
        sources: [
          {
            title: `Google Search: ${q}`,
            url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
            domain: "google.com",
            verified: true
          }
        ],
        timestamp: Date.now(),
        isLoading: false
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleCopySummary = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!searchData?.summary) return;
    navigator.clipboard.writeText(searchData.summary);
    setCopied(true);
    soundEngine.playActionBeep();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenGoogle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (searchData?.query) {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(searchData.query)}`, "_blank");
    }
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSearchData(null);
    if (onClose) onClose();
  };

  if (!searchData) return null;

  return (
    <AnimatePresence>
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.08}
        initial={{ opacity: 0, scale: 0.88, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 30 }}
        transition={{ type: "spring", damping: 28, stiffness: 380 }}
        className="fixed bottom-24 left-4 sm:left-6 z-50 select-none touch-none max-w-[90vw]"
        style={{ touchAction: "none" }}
      >
        {/* Ambient Cyan / Emerald Glow Border */}
        <div className="relative rounded-3xl p-1 bg-gradient-to-b from-cyan-500/25 via-cyan-950/20 to-black/95 shadow-[0_10px_45px_rgba(6,182,212,0.35)] border border-cyan-500/40 backdrop-blur-xl transition-all duration-300">
          
          {/* Main Card View */}
          {!isMinimized ? (
            <div className="w-[88vw] max-w-[340px] sm:max-w-[380px] rounded-2xl bg-zinc-950/95 overflow-hidden flex flex-col p-3.5 space-y-3">
              {/* Top Header Bar */}
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0 border border-cyan-500/40">
                    <Search className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] uppercase tracking-wider font-mono text-cyan-400 font-bold block">
                      Card Search
                    </span>
                    <p className="text-xs font-semibold text-white truncate">
                      {searchData.query}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Drag Handle */}
                  <div
                    className="p-1 opacity-50 hover:opacity-100 text-zinc-300 hover:text-white cursor-grab active:cursor-grabbing transition"
                    title="Drag anywhere"
                  >
                    <GripHorizontal className="w-4 h-4" />
                  </div>

                  {/* Open in Google */}
                  <button
                    onClick={handleOpenGoogle}
                    className="p-1 opacity-50 hover:opacity-100 text-zinc-300 hover:text-cyan-400 hover:bg-white/10 rounded-lg transition cursor-pointer"
                    title="Open in Google"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  {/* Minimize to Pill */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMinimized(true);
                    }}
                    className="p-1 opacity-50 hover:opacity-100 text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                    title="Minimize"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Close */}
                  <button
                    onClick={handleClose}
                    className="p-1 opacity-50 hover:opacity-100 text-zinc-300 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition cursor-pointer"
                    title="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Fast In-Card Search Bar */}
              <form onSubmit={handleManualSearch} className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="কার্ডে সরাসরি সার্চ করুন..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-3 pr-8 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 transition"
                />
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="absolute right-1.5 p-1 text-cyan-400 hover:text-white transition disabled:opacity-30 cursor-pointer"
                >
                  {isSearching ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                </button>
              </form>

              {/* Summary / Result Content */}
              <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 select-text scrollbar-thin scrollbar-thumb-white/10">
                {searchData.isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-xs text-cyan-300 font-mono">
                    <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>গুগল সার্চ ও তথ্য যাচাই হচ্ছে...</span>
                  </div>
                ) : (
                  <div className="text-xs text-zinc-200 leading-relaxed whitespace-pre-line font-sans">
                    {searchData.summary}
                  </div>
                )}

                {/* Sources & Verified Links */}
                {searchData.sources && searchData.sources.length > 0 && (
                  <div className="pt-2 border-t border-white/10 space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 block font-semibold">
                      Verified Sources & Links
                    </span>
                    <div className="space-y-1">
                      {searchData.sources.map((src, idx) => (
                        <a
                          key={idx}
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between gap-2 p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan-500/30 rounded-xl transition text-[11px] text-zinc-300 hover:text-cyan-300"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate">{src.title || src.domain || "Source"}</span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-zinc-400 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs">
                <button
                  onClick={handleCopySummary}
                  className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-300 hover:text-white transition cursor-pointer text-[10px]"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-300 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Result</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleOpenGoogle}
                  className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
                >
                  <span>Google এ বিস্তারিত</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            /* Minimized Pill Mode */
            <div
              onClick={() => setIsMinimized(false)}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950/95 rounded-2xl cursor-pointer hover:bg-zinc-900/90 transition max-w-[310px] border border-cyan-500/30 shadow-md"
            >
              <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0 border border-cyan-500/40">
                <Search className="w-3.5 h-3.5 text-cyan-400" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{searchData.query}</p>
                <span className="text-[9px] text-cyan-400 font-mono block">Card Search Result</span>
              </div>

              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setIsMinimized(false)}
                  className="p-1 opacity-60 hover:opacity-100 text-zinc-300 hover:text-white rounded-lg transition cursor-pointer"
                  title="Expand"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleClose}
                  className="p-1 opacity-60 hover:opacity-100 text-zinc-400 hover:text-red-400 rounded-lg transition cursor-pointer"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
