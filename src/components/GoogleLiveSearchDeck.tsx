import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, PanInfo } from "motion/react";
import {
  ExternalLink,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  Compass,
  Check,
  Maximize2,
  Sparkles
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
  // Active index for multi-card deck
  const [activeIndex, setActiveIndex] = useState<number>(() =>
    Math.max(0, researchTranscriptions.length - 1)
  );

  // Swipe animation direction: 1 for next (upward swipe -> comes from bottom), -1 for prev (downward swipe -> comes from top)
  const [swipeDirection, setSwipeDirection] = useState<number>(1);

  // Auto-minimize state: after 6 seconds, minimizes to side floating pill
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Enlarged visual photo modal
  const [selectedImage, setSelectedImage] = useState<VisualSearchResult | null>(null);

  // Sync to latest card when new research arrives
  useEffect(() => {
    if (researchTranscriptions.length > 0) {
      setActiveIndex(researchTranscriptions.length - 1);
      setSwipeDirection(1);
      setIsMinimized(false);
      // Soft water drop sound on popup emergence
      soundEngine.playWaterDropSound();
    }
  }, [researchTranscriptions.length]);

  if (researchTranscriptions.length === 0) return null;

  const currentTranscription =
    researchTranscriptions[activeIndex] ||
    researchTranscriptions[researchTranscriptions.length - 1];

  const totalCards = researchTranscriptions.length;
  const currentIndexNumber = activeIndex + 1;

  // Extract topic
  const text = currentTranscription.text || "";
  let topic = currentTranscription.topic;
  if (!topic) {
    const topicMatch = text.match(
      /\[(?:Comparative Research|Google Web Research|Research Summary|Fact & Research Summary|Knowledge Summary) for "([^"]+)"\]/i
    );
    if (topicMatch) {
      topic = topicMatch[1];
    } else {
      topic = "Google Search";
    }
  }

  // Generate clean 1-LINE summary
  const getSingleLineSummary = (): string => {
    if (!text) return topic;

    // Check for direct Bangla conclusion if present
    const verdictMatch =
      text.match(/🎯\s*\*\*[^:]*[:)]?\s*([^\n]+)/i) ||
      text.match(/চূড়ান্ত সিদ্ধান্ত[^:]*[:)]?\s*([^\n]+)/i);
    let raw = "";
    if (verdictMatch && verdictMatch[1]) {
      raw = verdictMatch[1];
    } else {
      const clean = text
        .replace(/^🔎\s*\[[^\]]+\]:\s*/i, "")
        .replace(
          /\[(?:Comparative Research|Google Web Research|Research Summary|Fact & Research Summary|Knowledge Summary)[^\]]*\]/gi,
          ""
        )
        .trim();

      const sentences = clean.split(/(?<=[.?!।])\s+/);
      const firstUseful =
        sentences.find((s) => s.trim().length > 15 && !s.includes("🎯") && !s.includes("Boss")) || clean;
      raw = firstUseful;
    }

    let cleaned = raw
      .replace(/[*#_`~•-]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/Boss,\s*/gi, "")
      .replace(/Direct Conclusion & Decision/gi, "")
      .replace(/Fact & Research Summary/gi, "")
      .trim();

    if (cleaned.length > 95) {
      return cleaned.substring(0, 92) + "...";
    }
    return cleaned || topic;
  };

  const singleLineSummary = getSingleLineSummary();
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(topic)}`;
  const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(topic)}`;

  const sources: ResearchSource[] =
    currentTranscription.sources && currentTranscription.sources.length > 0
      ? currentTranscription.sources
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

  const handleOpenLink = (urlToOpen?: string) => {
    soundEngine.playActionBeep();
    const url = urlToOpen || primarySource.url || googleSearchUrl;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // Swipe physics handler:
  // "upore swap korle next card ta niche theke asbe" -> Drag up (offset.y < -30) advances to next card (coming from below)
  // "r ulta swap korle previous ta abar asbe smoothly" -> Drag down (offset.y > 30) goes to previous card (coming from top)
  const handleDragEnd = (_: any, info: PanInfo) => {
    const swipeThreshold = 28;

    if (info.offset.y < -swipeThreshold && activeIndex < totalCards - 1) {
      // Swiping up -> next card enters from below
      setSwipeDirection(1);
      soundEngine.playCardSwipeSound("up");
      setActiveIndex((prev) => Math.min(totalCards - 1, prev + 1));
    } else if (info.offset.y > swipeThreshold && activeIndex > 0) {
      // Swiping down -> previous card enters from above
      setSwipeDirection(-1);
      soundEngine.playCardSwipeSound("down");
      setActiveIndex((prev) => Math.max(0, prev - 1));
    }
  };

  const handleManualPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeIndex > 0) {
      setSwipeDirection(-1);
      soundEngine.playCardSwipeSound("down");
      setActiveIndex((prev) => Math.max(0, prev - 1));
    }
  };

  const handleManualNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeIndex < totalCards - 1) {
      setSwipeDirection(1);
      soundEngine.playCardSwipeSound("up");
      setActiveIndex((prev) => Math.min(totalCards - 1, prev + 1));
    }
  };

  const handleExpandFromMinimized = () => {
    soundEngine.playWaterDropSound();
    setIsMinimized(false);
  };

  const handleExplicitClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playActionBeep();
    if (onClose) {
      onClose();
    }
  };

  const heroImage =
    gatheredVisualImages[0]?.imageUrl ||
    currentTranscription.imageUrl ||
    primarySource.imageUrl;

  return (
    <div className="relative select-none max-w-sm sm:max-w-md w-full my-1 flex flex-col items-center z-30 pointer-events-auto">
      <AnimatePresence mode="wait">
        {isMinimized ? (
          /* ================= MINIMIZED FLOATING SIDE PILL (6s AUTO-MINIMIZE) ================= */
          <motion.div
            key="search-deck-minimized"
            initial={{ opacity: 0, scale: 0.85, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: 20 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleExpandFromMinimized}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[#161618]/90 hover:bg-[#1f1f23] border border-blue-500/30 text-white shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl cursor-pointer group select-none"
            title="Click to view full search results"
          >
            <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "12s" }} />
            </div>

            <div className="flex flex-col text-left max-w-[160px] sm:max-w-[200px]">
              <span className="text-[11px] font-semibold text-white/95 truncate">
                {topic}
              </span>
              <span className="text-[9px] text-blue-300 font-mono">
                {totalCards > 1 ? `${currentIndexNumber}/${totalCards} cards • Tap to expand` : "Tap to expand"}
              </span>
            </div>

            <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white/70 group-hover:text-white transition">
              <Maximize2 className="w-3 h-3" />
            </div>

            {onClose && (
              <button
                type="button"
                onClick={handleExplicitClose}
                className="w-5 h-5 rounded-full hover:bg-white/10 text-white/40 hover:text-white/90 flex items-center justify-center ml-1 transition"
                title="Close"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </motion.div>
        ) : (
          /* ================= EXPANDED FULL INTERACTIVE CARD DECK ================= */
          <div
            className="w-full relative flex flex-col items-center"
          >
            {/* Background card stack layer for tactile Apple depth */}
            {totalCards > 1 && (
              <div className="absolute -bottom-1.5 w-[92%] h-full bg-[#1c1c1e]/60 border border-white/5 rounded-[28px] -z-10 transform translate-y-1.5 shadow-xl pointer-events-none" />
            )}

            {/* Main Apple iOS Card with Directional Up/Down Smooth Animation */}
            <motion.div
              key={currentTranscription.id || `${activeIndex}-${topic}`}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.28}
              onDragEnd={handleDragEnd}
              initial={{
                opacity: 0,
                y: swipeDirection > 0 ? 65 : -65,
                scale: 0.94,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: swipeDirection > 0 ? -65 : 65,
                scale: 0.94,
              }}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 26,
                mass: 0.65,
              }}
              className="w-full bg-[#161618]/90 hover:bg-[#1c1c1e]/95 border border-white/10 rounded-[28px] p-3.5 sm:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur-3xl transition-all select-none relative overflow-hidden flex flex-col cursor-grab active:cursor-grabbing"
            >
              {/* Subtle iOS top gloss edge */}
              <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              {/* 1. iOS Header: Clean Topic + Source domain + Apple Stack counter + Close */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                    <Compass className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-white/90 truncate tracking-tight">
                      {topic}
                    </h4>
                    <p className="text-[10px] text-white/40 font-mono flex items-center gap-1">
                      <span>{primarySource.domain || "google.com"}</span>
                      <span className="inline-block w-1 h-1 rounded-full bg-white/30" />
                      <span className="text-emerald-400 flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" /> Verified
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {totalCards > 1 && (
                    <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-[10px] font-mono text-white/60">
                      <span>{currentIndexNumber}/{totalCards}</span>
                      <button
                        type="button"
                        onClick={handleManualPrev}
                        disabled={activeIndex === 0}
                        className="hover:text-white disabled:opacity-20 cursor-pointer p-0.5"
                        title="Previous card"
                      >
                        <ChevronDown className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleManualNext}
                        disabled={activeIndex === totalCards - 1}
                        className="hover:text-white disabled:opacity-20 cursor-pointer p-0.5"
                        title="Next card"
                      >
                        <ChevronUp className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}

                  {/* Explicit Close Button (Immediate Close) */}
                  <button
                    type="button"
                    onClick={handleExplicitClose}
                    className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white flex items-center justify-center transition cursor-pointer"
                    title="Close Search Card"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 2. Apple iOS 1-Line Summary Capsule */}
              <div className="mb-3 px-3 py-2 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 animate-pulse" />
                <p className="text-xs text-white/95 font-medium leading-normal truncate flex-1 tracking-tight">
                  {singleLineSummary}
                </p>
              </div>

              {/* 3. Visual Search Thumbnail Grid */}
              {gatheredVisualImages.length > 0 ? (
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {gatheredVisualImages.slice(0, 3).map((img, idx) => (
                    <motion.div
                      key={idx}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSelectedImage(img)}
                      className="relative aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/10 cursor-pointer group shadow-sm"
                    >
                      <img
                        src={img.imageUrl}
                        alt={img.title || topic}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                    </motion.div>
                  ))}
                </div>
              ) : heroImage ? (
                <div
                  onClick={() => handleOpenLink(primarySource.url)}
                  className="w-full h-24 rounded-2xl overflow-hidden bg-white/5 border border-white/10 mb-3 relative cursor-pointer group shadow-sm"
                >
                  <img
                    src={heroImage}
                    alt={topic}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2.5">
                    <span className="text-[11px] text-white/90 font-medium truncate">
                      {primarySource.title || topic}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* 4. Action Buttons */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleOpenLink(googleSearchUrl)}
                  className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search on Google</span>
                  <ExternalLink className="w-3 h-3 opacity-70 ml-0.5" />
                </button>

                {gatheredVisualImages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleOpenLink(googleImagesUrl)}
                    className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-white/90 text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer border border-white/10"
                    title="Open Google Images in new tab"
                  >
                    <span>Images</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </button>
                )}
              </div>

              {/* Tactile Swipe Cue on Multi-Cards */}
              {totalCards > 1 && (
                <div className="flex items-center justify-center gap-1 text-[9px] text-white/30 font-mono pt-2">
                  <span>Swipe up/down to flip cards ({currentIndexNumber}/{totalCards})</span>
                </div>
              )}
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
                className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Visit Source</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenLink(googleImagesUrl)}
                className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center justify-center gap-1 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>More</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
