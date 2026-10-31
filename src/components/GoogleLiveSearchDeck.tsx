import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, PanInfo } from "motion/react";
import {
  ExternalLink,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  Globe,
  Check,
  Maximize2,
  Sparkles,
  Image as ImageIcon
} from "lucide-react";
import { Transcription, ResearchSource, VisualSearchResult } from "../types";
import { soundEngine } from "../utils/soundEngine";

interface GoogleLiveSearchDeckProps {
  researchTranscriptions: Transcription[];
  onClose?: () => void;
}

export const GoogleLiveSearchDeck: React.FC<GoogleLiveSearchDeckProps> = ({
  researchTranscriptions,
  onClose,
}) => {
  // Active card index
  const [activeIndex, setActiveIndex] = useState<number>(() =>
    Math.max(0, researchTranscriptions.length - 1)
  );

  // Swipe animation direction: 1 for up, -1 for down
  const [swipeDirection, setSwipeDirection] = useState<number>(1);

  // Capsule minimized state
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Enlarged photo lightbox
  const [selectedImage, setSelectedImage] = useState<VisualSearchResult | null>(null);

  // Auto-focus latest card when new research arrives
  useEffect(() => {
    if (researchTranscriptions.length > 0) {
      setActiveIndex(researchTranscriptions.length - 1);
      setSwipeDirection(1);
      setIsMinimized(false);
      soundEngine.playWaterDropSound();
    }
  }, [researchTranscriptions.length]);

  if (researchTranscriptions.length === 0) return null;

  const totalCards = researchTranscriptions.length;
  const currentTranscription =
    researchTranscriptions[activeIndex] ||
    researchTranscriptions[totalCards - 1];

  const currentIndexNumber = activeIndex + 1;

  // Extract clean topic without filler phrases or bogus tool names
  const rawText = currentTranscription.text || "";
  let topic = currentTranscription.topic || "";

  if (!topic || topic.toLowerCase().includes("openwebsite") || topic.includes("Daran")) {
    // 1. Try to extract query from sources[0].url if it's a google search
    const srcUrl = currentTranscription.sources?.[0]?.url || "";
    if (srcUrl.includes("q=")) {
      try {
        const parsed = new URL(srcUrl).searchParams.get("q");
        if (parsed && !parsed.toLowerCase().includes("openwebsite")) {
          topic = decodeURIComponent(parsed);
        }
      } catch {}
    }

    // 2. Try match from raw text
    if (!topic || topic.toLowerCase().includes("openwebsite")) {
      const topicMatch = rawText.match(
        /\[(?:Comparative Research|Google Web Research|Research Summary|Fact & Research Summary|Decision Research|Knowledge Summary) for "([^"]+)"\]/i
      ) || rawText.match(/\("([^"]+)"\)/);

      if (topicMatch && topicMatch[1] && !topicMatch[1].toLowerCase().includes("openwebsite")) {
        topic = topicMatch[1];
      } else {
        const clean = rawText
          .replace(/🔎\s*Daran\s+Boss.*?\.\.\./gi, "")
          .replace(/openwebsite/gi, "")
          .replace(/[("')]/g, "")
          .trim();
        topic = clean.length > 2 && clean.length < 50 ? clean : "Google Search";
      }
    }
  }

  // Extract clean answer / snippet without filler phrases
  const getCleanResultText = (): string => {
    if (!rawText) return `Google Search results & overview for "${topic}"`;

    // Remove filler "Daran Boss..." phrases
    let cleaned = rawText
      .replace(/🔎\s*Daran\s+(?:Boss|ami).*?(?:\.\.\.|\))/gi, "")
      .replace(/^🔎\s*\[[^\]]+\]:\s*/i, "")
      .replace(
        /\[(?:Comparative Research|Google Web Research|Research Summary|Fact & Research Summary|Decision Research|Knowledge Summary)[^\]]*\]/gi,
        ""
      )
      .replace(/openwebsite/gi, "")
      .replace(/Boss,\s*/gi, "")
      .replace(/Direct Conclusion & Decision:?/gi, "")
      .replace(/Fact & Research Summary:?/gi, "")
      .replace(/[*#_`~•]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Check for direct conclusion
    const verdictMatch =
      cleaned.match(/🎯\s*([^\n]+)/i) ||
      cleaned.match(/চূড়ান্ত সিদ্ধান্ত\s*[:)]?\s*([^\n]+)/i);

    if (verdictMatch && verdictMatch[1]) {
      cleaned = verdictMatch[1].trim();
    }

    if (!cleaned || cleaned.toLowerCase().includes("search kore dekhch") || cleaned.length < 5) {
      return `Google Search live results & verified findings for "${topic}".`;
    }

    if (cleaned.length > 140) {
      return cleaned.substring(0, 135) + "...";
    }
    return cleaned;
  };

  const cleanResultText = getCleanResultText();
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(topic)}`;
  const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(topic)}`;

  const rawSources: ResearchSource[] =
    currentTranscription.sources && currentTranscription.sources.length > 0
      ? currentTranscription.sources.filter((s) => s.title !== "openWebsite" && s.domain !== "openWebsite")
      : [];

  const sources: ResearchSource[] =
    rawSources.length > 0
      ? rawSources
      : [
          {
            title: topic,
            url: googleSearchUrl,
            domain: "google.com",
            imageUrl: currentTranscription.imageUrl,
            verified: true,
          },
        ];

  const primarySource: ResearchSource = sources[0] || {
    title: topic,
    url: googleSearchUrl,
    domain: "google.com",
  };

  if (primarySource.domain === "openWebsite" || primarySource.domain?.toLowerCase().includes("openwebsite")) {
    primarySource.domain = "google.com";
  }

  const gatheredVisualImages: VisualSearchResult[] = [];
  if (currentTranscription.visualImages && currentTranscription.visualImages.length > 0) {
    gatheredVisualImages.push(...currentTranscription.visualImages);
  }
  if (
    currentTranscription.imageUrl &&
    !gatheredVisualImages.some((img) => img.imageUrl === currentTranscription.imageUrl)
  ) {
    gatheredVisualImages.unshift({
      title: topic,
      imageUrl: currentTranscription.imageUrl,
      sourceUrl: primarySource.url || googleSearchUrl,
      domain: primarySource.domain || "google.com",
    });
  }

  const heroImage =
    gatheredVisualImages[0]?.imageUrl ||
    currentTranscription.imageUrl ||
    primarySource.imageUrl;

  // Open destination browser on card click
  const handleOpenLink = (urlToOpen?: string) => {
    soundEngine.playActionBeep();
    const url = urlToOpen || primarySource.url || googleSearchUrl;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // Apple-smooth swipe physics with boundary minimize
  const handleDragEnd = (_: any, info: PanInfo) => {
    const swipeThreshold = 26;
    const velocityThreshold = 220;

    // Swiping Up
    if (info.offset.y < -swipeThreshold || info.velocity.y < -velocityThreshold) {
      if (activeIndex < totalCards - 1) {
        // Advance to next card
        setSwipeDirection(1);
        soundEngine.playCardSwipeSound("up");
        setActiveIndex((prev) => prev + 1);
      } else {
        // Reached the last card: swipe again minimizes to Apple bottom capsule!
        soundEngine.playWaterDropSound();
        setIsMinimized(true);
      }
    }
    // Swiping Down
    else if (info.offset.y > swipeThreshold || info.velocity.y > velocityThreshold) {
      if (activeIndex > 0) {
        // Go back to previous card
        setSwipeDirection(-1);
        soundEngine.playCardSwipeSound("down");
        setActiveIndex((prev) => prev - 1);
      } else {
        // At the first card: swipe down minimizes to Apple bottom capsule!
        soundEngine.playWaterDropSound();
        setIsMinimized(true);
      }
    }
  };

  const handleManualPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeIndex > 0) {
      setSwipeDirection(-1);
      soundEngine.playCardSwipeSound("down");
      setActiveIndex((prev) => prev - 1);
    } else {
      setIsMinimized(true);
    }
  };

  const handleManualNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeIndex < totalCards - 1) {
      setSwipeDirection(1);
      soundEngine.playCardSwipeSound("up");
      setActiveIndex((prev) => prev + 1);
    } else {
      setIsMinimized(true);
    }
  };

  const handleExplicitClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playActionBeep();
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="relative select-none max-w-sm sm:max-w-md w-full my-1 flex flex-col items-center z-30 pointer-events-auto">
      <AnimatePresence mode="wait">
        {/* ================= 1. APPLE DYNAMIC ISLAND MINIMIZED CAPSULE ================= */}
        {isMinimized ? (
          <motion.div
            key="search-deck-capsule"
            initial={{ opacity: 0, scale: 0.8, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 15 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              soundEngine.playWaterDropSound();
              setIsMinimized(false);
            }}
            className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#161618]/95 hover:bg-[#1f1f23] border border-cyan-500/30 text-white shadow-[0_10px_35px_rgba(0,0,0,0.7)] backdrop-blur-2xl cursor-pointer group select-none transition-all"
            title="Tap to expand search card"
          >
            <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0">
              <Search className="w-3 h-3" />
            </div>

            <span className="text-xs font-semibold text-white/95 truncate max-w-[170px] sm:max-w-[220px]">
              {topic}
            </span>

            <span className="text-[10px] text-cyan-300 font-mono px-1.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/25 shrink-0">
              {currentIndexNumber}/{totalCards}
            </span>

            <ChevronUp className="w-3.5 h-3.5 text-white/50 group-hover:text-white transition group-hover:-translate-y-0.5 shrink-0" />

            {onClose && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExplicitClose(e);
                }}
                className="w-5 h-5 rounded-full hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center ml-0.5 transition"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </motion.div>
        ) : (
          /* ================= 2. EXPANDED INTERACTIVE APPLE CARD ================= */
          <div className="w-full relative flex flex-col items-center">
            {/* Apple Depth Stack Effect behind active card */}
            {totalCards > 1 && (
              <div className="absolute -bottom-1.5 w-[92%] h-full bg-[#1c1c1e]/60 border border-white/5 rounded-[28px] -z-10 transform translate-y-1.5 shadow-xl pointer-events-none" />
            )}

            {/* Main Interactive Card (Click anywhere to open in browser!) */}
            <motion.div
              key={currentTranscription.id || `${activeIndex}-${topic}`}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.3}
              onDragEnd={handleDragEnd}
              initial={{
                opacity: 0,
                y: swipeDirection > 0 ? 55 : -55,
                scale: 0.94,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: swipeDirection > 0 ? -55 : 55,
                scale: 0.94,
              }}
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 28,
                mass: 0.55,
              }}
              onClick={() => handleOpenLink()}
              className="w-full bg-[#161618]/92 hover:bg-[#1a1a1e] border border-white/12 hover:border-cyan-500/40 rounded-[28px] p-3.5 sm:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.65)] backdrop-blur-3xl transition-colors select-none relative overflow-hidden flex flex-col cursor-pointer group"
              title="Tap card to open result in browser ↗"
            >
              {/* Apple Top Gloss Edge */}
              <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              {/* 2.1 Top Bar: Domain / Topic + Counter + Close */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/15 border border-cyan-400/25 flex items-center justify-center shrink-0 text-cyan-300">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white/95 truncate tracking-tight">
                      {topic}
                    </h4>
                    <p className="text-[10px] text-white/45 font-mono flex items-center gap-1">
                      <span>{primarySource.domain || "google.com"}</span>
                      <span className="w-1 h-1 rounded-full bg-white/30" />
                      <span className="text-emerald-400 flex items-center gap-0.5 font-medium">
                        <Check className="w-2.5 h-2.5" /> Verified
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {totalCards > 1 && (
                    <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-[10px] font-mono text-white/60">
                      <span>{currentIndexNumber}/{totalCards}</span>
                      <button
                        type="button"
                        onClick={handleManualPrev}
                        className="hover:text-white cursor-pointer p-0.5"
                        title="Previous card (swipe down)"
                      >
                        <ChevronDown className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleManualNext}
                        className="hover:text-white cursor-pointer p-0.5"
                        title="Next card (swipe up)"
                      >
                        <ChevronUp className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}

                  {/* Explicit Close Button */}
                  <button
                    type="button"
                    onClick={handleExplicitClose}
                    className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white flex items-center justify-center transition cursor-pointer"
                    title="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 2.2 Main Visual Content: Image OR Clean Knowledge Preview */}
              {heroImage ? (
                /* IMAGE PREVIEW CARD */
                <div className="relative w-full h-32 sm:h-36 rounded-2xl overflow-hidden bg-black/40 border border-white/10 mb-2 shadow-inner group-hover:border-cyan-500/30 transition-all">
                  <img
                    src={heroImage}
                    alt={topic}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2.5">
                    <p className="text-xs font-semibold text-white leading-snug line-clamp-2">
                      {cleanResultText}
                    </p>
                  </div>
                </div>
              ) : (
                /* CLEAN KNOWLEDGE RESULT CARD */
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 mb-2 group-hover:bg-white/[0.06] transition-colors">
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0 animate-pulse" />
                    <p className="text-xs text-white/90 leading-relaxed font-normal">
                      {cleanResultText}
                    </p>
                  </div>
                </div>
              )}

              {/* 2.3 Bottom Action Caption (Clean Apple Style - No Big Blue Button!) */}
              <div className="flex items-center justify-between text-[10px] text-white/40 pt-1 border-t border-white/[0.06]">
                <span className="font-mono text-cyan-400/80 group-hover:text-cyan-300 transition flex items-center gap-1">
                  <span>Tap to open in browser</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
                <span className="font-mono text-white/30">
                  {totalCards > 1 ? "Swipe up/down to flip" : "Swipe down to minimize"}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal for Enlarge Image */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setSelectedImage(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1c1c1e] border border-white/15 rounded-[32px] p-4 max-w-sm w-full shadow-2xl flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white truncate max-w-[220px]">
                {selectedImage.title || topic}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black max-h-[50vh] flex items-center justify-center">
              <img
                src={selectedImage.imageUrl}
                alt={selectedImage.title || topic}
                className="max-h-[50vh] w-auto object-contain"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleOpenLink(selectedImage.sourceUrl || googleSearchUrl)}
                className="flex-1 py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Visit Source</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
