import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, X, GripHorizontal } from "lucide-react";
import { ConnectionState, Transcription } from "../types";
import { GoogleLiveSearchDeck } from "./GoogleLiveSearchDeck";
import { MentorDecisionCard } from "./MentorDecisionCard";

interface FloatingSubtitleStreamProps {
  connectionState: ConnectionState;
  transcriptions?: Transcription[];
}

/**
 * Clean spoken text helper for YouTube-style CC:
 * Strips markdown asterisks, hashes, brackets, links, and trims long text.
 */
function formatYouTubeCaption(rawText: string): string {
  if (!rawText) return "";
  let clean = rawText
    .replace(/\[.*?\]/g, "") // Remove bracketed tags like [Comparative Research...]
    .replace(/[#*`_~]/g, "") // Remove markdown asterisks, hashes, backticks
    .replace(/https?:\/\/\S+/g, "") // Remove raw URLs
    .replace(/\n+/g, " ") // Collapse newlines
    .trim();

  // If text is very long, keep the latest sentence or up to 180 characters for natural subtitle readability
  if (clean.length > 200) {
    const sentences = clean.split(/(?<=[.?!।])/);
    if (sentences.length > 1) {
      clean = sentences.slice(-2).join(" ").trim();
    }
    if (clean.length > 200) {
      clean = clean.slice(-200).trim();
    }
  }
  return clean;
}

export const FloatingSubtitleStream: React.FC<FloatingSubtitleStreamProps> = ({
  connectionState,
  transcriptions = [],
}) => {
  const safeTranscriptions = Array.isArray(transcriptions) ? transcriptions : [];
  const [activeTranscription, setActiveTranscription] = useState<Transcription | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Filter authentic research transcriptions for the Google Live Search Card Stack (exclude bogus openWebsite or loading cards)
  const researchTranscriptions = safeTranscriptions.filter(
    (t) =>
      t &&
      (t.isResearch ||
        (t.text &&
          (t.text.includes("[Comparative Research") ||
            t.text.includes("[Google Web Research") ||
            t.text.includes("🔎")))) &&
      t.topic !== "openWebsite" &&
      t.text !== "openWebsite" &&
      !t.topic?.toLowerCase().includes("openwebsite") &&
      !t.isSearching
  );

  const isCurrentDecision = Boolean(
    activeTranscription?.isDecisionCard ||
    activeTranscription?.text?.includes("Wise Mentor Decision Counsel")
  );

  const hasRecentResearch = researchTranscriptions.length > 0;

  // Whether user explicitly dismissed the active research deck
  const [isResearchManuallyClosed, setIsResearchManuallyClosed] = useState(false);

  // Keep track of research count so NEW search re-opens the deck
  const researchCount = researchTranscriptions.length;
  const lastResearchCountRef = React.useRef(researchCount);

  useEffect(() => {
    if (researchCount > lastResearchCountRef.current) {
      setIsResearchManuallyClosed(false);
      lastResearchCountRef.current = researchCount;
    }
  }, [researchCount]);

  useEffect(() => {
    if (safeTranscriptions.length > 0) {
      const latest = safeTranscriptions[safeTranscriptions.length - 1];

      // Check if latest item is a research document
      const isResearch = Boolean(
        latest &&
        (latest.isResearch ||
          (latest.text &&
            (latest.text.includes("[Comparative Research") ||
              latest.text.includes("[Google Web Research") ||
              latest.text.includes("🔎"))))
      );

      // CRITICAL FIX: If it's research, let the Search Card Stack handle it; do NOT dump it as subtitle!
      if (!isResearch) {
        setActiveTranscription(latest);
        setIsVisible(true);

        const isDecision =
          latest?.isDecisionCard ||
          (latest?.text && latest.text.includes("Wise Mentor Decision Counsel"));

        // Auto fade out for regular speech subtitles (8s)
        const timeoutMs = isDecision ? 60000 : 8000;
        const timer = setTimeout(() => {
          setIsVisible(false);
        }, timeoutMs);

        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [safeTranscriptions]);

  if (connectionState === "disconnected") {
    return <div className="min-h-[40px]" />;
  }

  // Decision details helper
  const getDecisionDetails = () => {
    if (!activeTranscription) return null;
    if (activeTranscription.decisionData) {
      return activeTranscription.decisionData;
    }
    const text = activeTranscription.text || "";
    const dilemmaMatch = text.match(/\*\*Dilemma\*\*:\s*([^\n]+)/i);
    const dilemma = dilemmaMatch ? dilemmaMatch[1].trim() : "Key Decision Under Review";

    const optionMatches = text.split(/### Option\s*[A-Z]:\s*/i).slice(1);
    const options = optionMatches.map((block) => {
      const lines = block.split("\n").filter((l) => l.trim().length > 0);
      const title = lines[0]?.trim() || "Option";
      const pros: string[] = [];
      const cons: string[] = [];
      let tradeOffs = "";

      let currentSection = "";
      for (const line of lines.slice(1)) {
        if (line.toLowerCase().includes("advantages") || line.toLowerCase().includes("pros")) {
          currentSection = "pros";
        } else if (line.toLowerCase().includes("risks") || line.toLowerCase().includes("cons")) {
          currentSection = "cons";
        } else if (line.toLowerCase().includes("trade-off")) {
          tradeOffs = line.replace(/^[*\s-]+/g, "").trim();
        } else if (line.startsWith("-") || line.startsWith("*")) {
          const item = line.replace(/^[*\s-]+/g, "").trim();
          if (currentSection === "pros") pros.push(item);
          else if (currentSection === "cons") cons.push(item);
        }
      }
      return { optionTitle: title, pros, cons, tradeOffs };
    });

    const recMatch = text.match(/### 💡 Wise Mentor's Recommendation:\s*([\s\S]*?)(?:$)/i);
    const recommendation = recMatch ? recMatch[1].trim() : undefined;

    return {
      dilemma,
      options: options.length > 0 ? options : [{ optionTitle: "Primary Pathway", pros: [], cons: [] }],
      recommendation,
    };
  };

  const decisionDetails = isCurrentDecision ? getDecisionDetails() : null;
  const isResearchText = Boolean(
    activeTranscription &&
    (activeTranscription.isResearch ||
      (activeTranscription.text &&
        (activeTranscription.text.includes("[Comparative Research") ||
          activeTranscription.text.includes("[Google Web Research") ||
          activeTranscription.text.includes("🔎"))))
  );

  const captionText = activeTranscription?.text ? formatYouTubeCaption(activeTranscription.text) : "";

  return (
    <div className="w-full max-w-2xl px-4 mx-auto flex flex-col items-center justify-center relative select-none z-30 pointer-events-none">
      <AnimatePresence mode="wait">
        {/* Thinking Indicator */}
        {connectionState === "thinking" && (!hasRecentResearch || isResearchManuallyClosed) && (
          <motion.div
            key="thinking-active-banner"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-xl shadow-lg"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            >
              <Loader2 className="w-3.5 h-3.5 text-cyan-300" />
            </motion.div>
            <span className="text-xs font-medium text-white/80 tracking-wide">
              Thinking...
            </span>
          </motion.div>
        )}

        {/* Grounded Google Research Card: Stays open until user manually clicks Close */}
        {hasRecentResearch && !isResearchManuallyClosed && (
          <motion.div
            key="google-live-search-deck"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex justify-center pointer-events-auto"
          >
            <GoogleLiveSearchDeck
              researchTranscriptions={researchTranscriptions}
              onClose={() => setIsResearchManuallyClosed(true)}
            />
          </motion.div>
        )}

        {/* Regular Subtitles: YouTube-Style Closed Captions (DRAGGABLE ANYWHERE ON SCREEN) */}
        {connectionState !== "thinking" &&
          isVisible &&
          activeTranscription &&
          !isResearchText &&
          (!hasRecentResearch || isResearchManuallyClosed) && (
            <motion.div
              key={
                isCurrentDecision
                  ? "mentor-decision-card"
                  : activeTranscription.id || captionText
              }
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full flex justify-center pointer-events-auto"
            >
              {isCurrentDecision && decisionDetails ? (
                <MentorDecisionCard
                  dilemma={decisionDetails.dilemma}
                  options={decisionDetails.options}
                  recommendation={decisionDetails.recommendation}
                  onClose={() => setIsVisible(false)}
                />
              ) : captionText ? (
                /* YOUTUBE-STYLE DRAGGABLE CC SUBTITLE BOX */
                <motion.div
                  drag
                  dragMomentum={false}
                  whileDrag={{ scale: 1.04, cursor: "grabbing" }}
                  className="group relative max-w-lg px-4 py-2 rounded-xl bg-black/85 backdrop-blur-md border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.7)] cursor-grab active:cursor-grabbing touch-none flex items-center gap-2 select-none"
                  title="YouTube-style caption: Click & hold to drag anywhere on screen"
                >
                  {/* Subtle drag handle indicator */}
                  <div className="text-white/30 group-hover:text-white/60 transition-colors shrink-0">
                    <GripHorizontal className="w-3.5 h-3.5" />
                  </div>

                  {/* Clean spoken caption */}
                  <p className="text-xs sm:text-sm font-medium leading-relaxed text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] text-center flex-1">
                    {captionText}
                  </p>

                  {/* Dismiss close button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsVisible(false);
                    }}
                    className="p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                    title="Dismiss caption"
                    aria-label="Dismiss caption"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ) : null}
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default FloatingSubtitleStream;
