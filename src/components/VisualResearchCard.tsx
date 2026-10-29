import React from "react";
import { motion } from "motion/react";
import { ExternalLink, X, Globe } from "lucide-react";
import { Transcription, ResearchSource } from "../types";

interface VisualResearchCardProps {
  transcription: Transcription;
  onClose?: () => void;
  isExpandedModal?: boolean;
}

export const VisualResearchCard: React.FC<VisualResearchCardProps> = ({
  transcription,
  onClose,
}) => {
  const text = transcription.text || "";

  // Extract topic title from text or transcription.topic
  let topic = transcription.topic;
  if (!topic) {
    const topicMatch = text.match(/\[(?:Comparative Research|Google Web Research|Research Summary|Fact & Research Summary|Knowledge Summary) for "([^"]+)"\]/i);
    if (topicMatch) {
      topic = topicMatch[1];
    } else {
      topic = "Google Search";
    }
  }

  // Clean raw body text
  const cleanBodyText = text
    .replace(/^🔎\s*\[[^\]]+\]:\s*/i, "")
    .replace(/\[(?:Comparative Research|Google Web Research|Research Summary|Fact & Research Summary|Knowledge Summary)[^\]]*\]/gi, "")
    .trim();

  // Sources handling
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(topic)}`;

  const sources: ResearchSource[] =
    transcription.sources && transcription.sources.length > 0
      ? transcription.sources
      : [
          {
            title: topic,
            url: googleSearchUrl,
            domain: "google.com",
            verified: true,
          }
        ];

  const primarySource = sources[0] || {
    title: topic,
    url: googleSearchUrl,
    domain: "google.com"
  };

  const targetUrl = primarySource.url || googleSearchUrl;
  const siteCount = Math.max(sources.length, 3);

  // Domain favicon helper
  const getDomainFavicon = (domain?: string) => {
    if (!domain) return "https://www.google.com/favicon.ico";
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  };

  // Sample site badges for overlapping icons
  const sampleSites = sources.slice(0, 3);

  // Direct open in new browser tab
  const handleOpenLink = (urlToOpen?: string) => {
    const url = urlToOpen || targetUrl;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="relative select-none max-w-md w-full my-1">
      {/* COMPACT GOOGLE GROUNDING CARD (Matches Google Live Grounding UI) */}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.96 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="w-full bg-[#1c1d22]/95 border border-white/10 hover:border-white/20 rounded-[28px] p-4 shadow-2xl backdrop-blur-xl transition-all select-none"
      >
        {/* TOP HEADER: Overlapping Site Favicons + "X sites" + Direct Link / Dismiss */}
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div
            onClick={() => handleOpenLink(googleSearchUrl)}
            className="flex items-center gap-2.5 cursor-pointer group/sites"
            title="Open all search results on Google"
          >
            {/* Overlapping Site Favicon Badges */}
            <div className="flex items-center -space-x-2">
              {sampleSites.map((src, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-[#2a2c34] border-2 border-[#1c1d22] flex items-center justify-center overflow-hidden shadow-sm"
                >
                  <img
                    src={getDomainFavicon(src.domain)}
                    alt={src.domain || "site"}
                    className="w-3.5 h-3.5 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Site Count Label (Matches screenshot) */}
            <span className="text-sm font-semibold text-white/90 group-hover/sites:text-cyan-300 transition tracking-wide flex items-center gap-1.5">
              {siteCount} sites
              <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover/sites:text-cyan-300 transition" />
            </span>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* MAIN INNER GROUNDING CARD (Clickable preview box - Direct opens link in new tab) */}
        <div
          onClick={() => handleOpenLink(targetUrl)}
          className="bg-[#262830] hover:bg-[#2f323c] border border-white/5 hover:border-cyan-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3.5 transition-all cursor-pointer group shadow-md"
        >
          {/* Left Content: Title + Site Domain Tag */}
          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-sm font-medium text-white/95 group-hover:text-cyan-200 transition-colors line-clamp-2 leading-snug">
              {primarySource.title || topic}
            </h4>

            <div className="mt-2.5 flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-[#1c1d22] flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                <img
                  src={getDomainFavicon(primarySource.domain)}
                  alt="site"
                  className="w-2.5 h-2.5 object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              </div>
              <span className="text-[11px] font-normal text-zinc-400 group-hover:text-zinc-300 truncate">
                {primarySource.domain || "google.com"}
              </span>
            </div>
          </div>

          {/* Right Content: Square Thumbnail Preview (from screenshot) */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#1e2026] border border-white/10 overflow-hidden shrink-0 shadow-inner flex items-center justify-center relative group-hover:border-cyan-500/40 transition-colors">
            {transcription.imageUrl ? (
              <img
                src={transcription.imageUrl}
                alt={topic}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-900/40 via-zinc-800 to-cyan-950/50 flex flex-col items-center justify-center p-2 text-center">
                <Globe className="w-5 h-5 text-cyan-300 mb-0.5" />
                <span className="text-[8px] font-mono uppercase text-zinc-400 line-clamp-1">
                  Google
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Footer with Direct Google Search link & snippets */}
        <div className="mt-2.5 px-1 flex items-center justify-between text-[11px] text-zinc-400">
          <span className="truncate max-w-[240px] text-zinc-300">
            {cleanBodyText ? `💡 ${cleanBodyText.substring(0, 42)}...` : `Search Google for ${topic}`}
          </span>

          <button
            type="button"
            onClick={() => handleOpenLink(targetUrl)}
            className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 shrink-0 ml-2 cursor-pointer transition"
          >
            <span>Open in Tab</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
