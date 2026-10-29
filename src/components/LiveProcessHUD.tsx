import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  CircleDot,
  Clock,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Zap,
  Globe,
  FileEdit,
  Search,
  ScanEye,
  X
} from "lucide-react";
import { LiveProcessState, LiveProcessStep } from "../types";

interface LiveProcessHUDProps {
  processState: LiveProcessState | null;
  onDismiss?: () => void;
}

export const LiveProcessHUD: React.FC<LiveProcessHUDProps> = ({
  processState,
  onDismiss
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!processState?.isProcessing) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - (processState.startTime || Date.now())) / 1000));
      setElapsedSeconds(elapsed);
    }, 500);

    return () => clearInterval(interval);
  }, [processState?.isProcessing, processState?.startTime]);

  if (!processState || (!processState.isProcessing && processState.progressPercent < 100)) {
    return null;
  }

  const getTaskIcon = (title: string) => {
    const lower = (title || "").toLowerCase();
    if (lower.includes("research") || lower.includes("search") || lower.includes("google")) {
      return <Search className="w-4 h-4 text-cyan-400 animate-pulse" />;
    }
    if (lower.includes("draft") || lower.includes("script") || lower.includes("write") || lower.includes("article")) {
      return <FileEdit className="w-4 h-4 text-purple-400 animate-pulse" />;
    }
    if (lower.includes("screen") || lower.includes("vision") || lower.includes("see")) {
      return <ScanEye className="w-4 h-4 text-amber-400 animate-pulse" />;
    }
    if (lower.includes("plan") || lower.includes("goal") || lower.includes("pa")) {
      return <Layers className="w-4 h-4 text-emerald-400 animate-pulse" />;
    }
    return <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -15, scale: 0.95 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-xl mx-auto px-4 z-40 my-2 pointer-events-auto"
      >
        <div className="relative overflow-hidden rounded-2xl bg-zinc-950/90 border border-cyan-500/30 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.7)] text-white p-3.5 sm:p-4">
          {/* Glowing background ambient gradient */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Bar: Icon + Task Title + Elapsed Timer + Collapse Button */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                {getTaskIcon(processState.taskTitle)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300">
                    {processState.taskTitle || "Processing Request"}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    LIVE
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 font-medium truncate">
                  {processState.currentStepLabel || "Executing task..."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded-md border border-white/10">
                <Clock className="w-2.5 h-2.5 text-cyan-400" />
                {elapsedSeconds}s
              </span>
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title={isCollapsed ? "Expand steps" : "Collapse"}
              >
                {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="p-1 rounded-lg hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 transition-colors cursor-pointer"
                  title="Dismiss HUD"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Real-time Progress Bar */}
          <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden mb-2.5 border border-white/5 relative">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(5, processState.progressPercent))}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>

          {/* Verbal notice reminder chip ("Amar ei kaj er jonno ektu somoy lagbe...") */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-cyan-200 text-[11px] mb-2 font-sans">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">
              {processState.voiceNotice || "Amar ei kaj er jonno ektu somoy lagbe, realtime process hocche..."}
            </span>
          </div>

          {/* Stepper Breakdown (Expandable) */}
          {!isCollapsed && processState.steps && processState.steps.length > 0 && (
            <div className="mt-2 space-y-1.5 pt-2 border-t border-white/10">
              {processState.steps.map((step, idx) => {
                const isCompleted = step.status === "completed";
                const isActive = step.status === "active";
                return (
                  <div
                    key={step.id || idx}
                    className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] transition-colors ${
                      isActive
                        ? "bg-cyan-500/10 text-cyan-200 border border-cyan-500/30"
                        : isCompleted
                        ? "text-zinc-400"
                        : "text-zinc-600"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : isActive ? (
                      <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
                    ) : (
                      <CircleDot className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    )}
                    <span className={`truncate ${isActive ? "font-semibold text-white" : ""}`}>
                      {step.label}
                    </span>
                    {step.details && (
                      <span className="text-[10px] text-zinc-500 font-mono ml-auto truncate max-w-[140px]">
                        {step.details}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
