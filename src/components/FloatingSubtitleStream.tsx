import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, User, FileText, ChevronUp, ChevronDown, Search, Sparkles, Loader2, Cpu, Zap } from "lucide-react";
import { ConnectionState, Transcription } from "../types";
import { GoogleLiveSearchDeck } from "./GoogleLiveSearchDeck";
import { MentorDecisionCard } from "./MentorDecisionCard";

interface FloatingSubtitleStreamProps {
  connectionState: ConnectionState;
  transcriptions?: Transcription[];
}

export const FloatingSubtitleStream: React.FC<FloatingSubtitleStreamProps> = ({
  connectionState,
  transcriptions = [],
}) => {
  const safeTranscriptions = Array.isArray(transcriptions) ? transcriptions : [];
  const [activeTranscription, setActiveTranscription] = useState<Transcription | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);

  // Filter all research transcriptions to create the Google Live Search Card Stack
  const researchTranscriptions = safeTranscriptions.filter(
    (t) =>
      t &&
      (t.isResearch ||
        (t.text &&
          (t.text.includes("[Comparative Research") ||
            t.text.includes("[Google Web Research") ||
            t.text.includes("🔎"))))
  );

  const isCurrentDecision = Boolean(
    activeTranscription?.isDecisionCard ||
    activeTranscription?.text?.includes("Wise Mentor Decision Counsel")
  );

  const hasRecentResearch = researchTranscriptions.length > 0;
  const isLatestItemResearch = Boolean(
    activeTranscription &&
    (activeTranscription.isResearch ||
      (activeTranscription.text &&
        (activeTranscription.text.includes("[Comparative Research") ||
          activeTranscription.text.includes("[Google Web Research") ||
          activeTranscription.text.includes("🔎"))))
  );

  // Whether user explicitly dismissed the active research deck
  const [isResearchManuallyClosed, setIsResearchManuallyClosed] = useState(false);

  // Keep track of how many research items we have seen so new research re-opens the deck
  const researchCount = researchTranscriptions.length;
  const lastResearchCountRef = React.useRef(researchCount);

  useEffect(() => {
    if (researchCount > lastResearchCountRef.current) {
      // New Google grounded research arrived: show popup and reset manual close
      setIsResearchManuallyClosed(false);
      lastResearchCountRef.current = researchCount;
    }
  }, [researchCount]);

  useEffect(() => {
    if (safeTranscriptions.length > 0) {
      const latest = safeTranscriptions[safeTranscriptions.length - 1];
      setActiveTranscription(latest);
      setIsVisible(true);

      const isDecision =
        latest?.isDecisionCard ||
        (latest?.text && latest.text.includes("Wise Mentor Decision Counsel"));

      const isResearch =
        !isDecision &&
        latest &&
        (latest.isResearch ||
          (latest.text &&
            (latest.text.includes("[Comparative Research") ||
              latest.text.includes("[Google Web Research") ||
              latest.text.includes("🔎"))));

      // Auto fade out ONLY for regular speech subtitles (12s).
      // Grounded Google Search popups NEVER auto-close unless the user manually clicks the Close button.
      if (!isResearch) {
        const timeoutMs = isDecision ? 60000 : 12000;
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
    return <div className="min-h-[60px]" />;
  }

  const recentTranscriptions = safeTranscriptions.slice(-10);

  // Helper to parse markdown formatted decision counsel if structured data isn't directly present
  const getDecisionDetails = () => {
    if (!activeTranscription) return null;
    if (activeTranscription.decisionData) {
      return activeTranscription.decisionData;
    }
    const text = activeTranscription.text || "";
    const dilemmaMatch = text.match(/\*\*Dilemma\*\*:\s*([^\n]+)/i);
    const dilemma = dilemmaMatch ? dilemmaMatch[1].trim() : "Key Decision Under Review";

    // Extract options
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

    return { dilemma, options: options.length > 0 ? options : [{ optionTitle: "Primary Pathway", pros: [], cons: [] }], recommendation };
  };

  const decisionDetails = isCurrentDecision ? getDecisionDetails() : null;

  return (
    <div className="w-full max-w-2xl px-6 mx-auto flex flex-col items-center justify-center relative select-none my-2 z-20 pointer-events-none">
      
      {/* Primary Active Subtitle / Google Live Search Card Viewer */}
      <AnimatePresence mode="wait">
        {connectionState === "thinking" && (!hasRecentResearch || isResearchManuallyClosed) && (
          <motion.div
            key="thinking-active-banner"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-xl shadow-lg"
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

        {/* Grounded Google Research Card: Stays open until user manually clicks Close button */}
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

        {/* Regular Subtitles or Decision Card (when research deck is not occupying or after closing) */}
        {connectionState !== "thinking" && isVisible && activeTranscription && !showFullHistory && (!hasRecentResearch || isResearchManuallyClosed) && (
          <motion.div
            key={
              isCurrentDecision
                ? "mentor-decision-card"
                : activeTranscription.id || activeTranscription.text
            }
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex justify-center pointer-events-auto"
          >
            {isCurrentDecision && decisionDetails ? (
              <MentorDecisionCard
                dilemma={decisionDetails.dilemma}
                options={decisionDetails.options}
                recommendation={decisionDetails.recommendation}
                onClose={() => setIsVisible(false)}
              />
            ) : (
              <div className="px-6 py-2.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)] max-w-xl text-center">
                <p className="text-sm sm:text-base font-normal leading-relaxed text-white/90 drop-shadow-sm">
                  {activeTranscription.text}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


