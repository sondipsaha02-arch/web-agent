import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Timer,
  Bell,
  Play,
  Pause,
  RotateCcw,
  X,
  Plus,
  CheckCircle2,
  Volume2,
  VolumeX,
  Sparkles,
  Minus,
  Maximize2,
  GripVertical
} from "lucide-react";
import { ActiveTimer } from "../types";

interface LiveTimerProgressOverlayProps {
  timers: ActiveTimer[];
  onDismiss: (id: string) => void;
  onUpdateTimer?: (id: string, updates: Partial<ActiveTimer>) => void;
}

export const LiveTimerProgressOverlay: React.FC<LiveTimerProgressOverlayProps> = ({
  timers,
  onDismiss,
  onUpdateTimer,
}) => {
  const [localTimers, setLocalTimers] = useState<ActiveTimer[]>(timers);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    return typeof localStorage !== "undefined" ? localStorage.getItem("tune_timer_minimized") === "true" : false;
  });
  const audioCtxRef = useRef<AudioContext | null>(null);

  const toggleMinimize = () => {
    const next = !isMinimized;
    setIsMinimized(next);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("tune_timer_minimized", String(next));
    }
  };

  // Sync external timers cleanly
  useEffect(() => {
    setLocalTimers(timers);
    if (timers.length > 0) {
      setActiveTabId((prev) => {
        if (prev && timers.some((t) => t.id === prev)) return prev;
        return timers[timers.length - 1].id;
      });
    } else {
      setActiveTabId(null);
    }
  }, [timers]);

  // Audio synthesis chime alarm helper
  const playAlarmSound = () => {
    if (isSoundMuted) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Play a warm melodious 4-tone chime (C5 -> E5 -> G5 -> C6)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.15);

        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.15);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + idx * 0.15 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.15 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.15);
        osc.stop(ctx.currentTime + idx * 0.15 + 0.65);
      });
    } catch (e) {
      console.warn("Chime playback error:", e);
    }
  };

  // Main 1-second countdown ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalTimers((prevTimers) => {
        let hasCompletedTransition = false;
        const updated = prevTimers.map((timer) => {
          if (timer.status !== "running") return timer;

          const newRemaining = Math.max(0, timer.remainingSeconds - 1);
          if (newRemaining === 0 && timer.remainingSeconds > 0) {
            hasCompletedTransition = true;
            return {
              ...timer,
              remainingSeconds: 0,
              status: "completed" as const,
            };
          }

          return {
            ...timer,
            remainingSeconds: newRemaining,
          };
        });

        if (hasCompletedTransition) {
          playAlarmSound();
        }

        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSoundMuted]);

  if (localTimers.length === 0) return null;

  const currentTimer =
    localTimers.find((t) => t.id === activeTabId) || localTimers[0];
  if (!currentTimer) return null;

  const total = Math.max(1, currentTimer.totalSeconds || currentTimer.durationSeconds);
  const remaining = currentTimer.remainingSeconds;
  const progressPercent = Math.min(100, Math.max(0, (remaining / total) * 100));
  const elapsedPercent = 100 - progressPercent;

  // Format time display
  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // User click Controls
  const togglePause = () => {
    const newStatus = currentTimer.status === "running" ? "paused" : "running";
    setLocalTimers((prev) =>
      prev.map((t) => (t.id === currentTimer.id ? { ...t, status: newStatus } : t))
    );
    if (onUpdateTimer) {
      onUpdateTimer(currentTimer.id, { status: newStatus });
    }
  };

  const addOneMinute = () => {
    const newRemaining = currentTimer.remainingSeconds + 60;
    const newTotal = currentTimer.totalSeconds + 60;
    setLocalTimers((prev) =>
      prev.map((t) =>
        t.id === currentTimer.id
          ? {
              ...t,
              remainingSeconds: newRemaining,
              totalSeconds: newTotal,
              status: "running",
            }
          : t
      )
    );
    if (onUpdateTimer) {
      onUpdateTimer(currentTimer.id, {
        remainingSeconds: newRemaining,
        totalSeconds: newTotal,
        status: "running",
      });
    }
  };

  const resetTimer = () => {
    setLocalTimers((prev) =>
      prev.map((t) =>
        t.id === currentTimer.id
          ? {
              ...t,
              remainingSeconds: t.durationSeconds,
              totalSeconds: t.durationSeconds,
              status: "running",
            }
          : t
      )
    );
    if (onUpdateTimer) {
      onUpdateTimer(currentTimer.id, {
        remainingSeconds: currentTimer.durationSeconds,
        totalSeconds: currentTimer.durationSeconds,
        status: "running",
      });
    }
  };

  const isCompleted = currentTimer.status === "completed" || remaining === 0;

  return (
    <div className="fixed z-40 top-20 right-4 sm:top-24 sm:right-8 pointer-events-auto select-none">
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.08}
        initial={{ opacity: 0, scale: 0.92, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: -10 }}
        className="cursor-grab active:cursor-grabbing"
      >
        <AnimatePresence mode="wait">
          {isMinimized ? (
            /* ================= MINIMIZED COMPACT FLOATING CAPSULE ================= */
            <motion.div
              key="minimized-pill"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-full border shadow-2xl backdrop-blur-2xl transition-all ${
                isCompleted
                  ? "bg-gradient-to-r from-amber-950/90 to-amber-900/90 border-amber-400/50 shadow-amber-500/20 animate-pulse"
                  : "bg-[#181922]/95 border-white/15 hover:border-cyan-500/40 shadow-cyan-500/10"
              }`}
            >
              {/* Drag Grip Indicator */}
              <div className="text-zinc-500 hover:text-zinc-300 transition shrink-0" title="Drag to move anywhere">
                <GripVertical className="w-3.5 h-3.5" />
              </div>

              {/* Status Icon */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                  isCompleted
                    ? "bg-amber-500/20 border-amber-400/40 text-amber-300 animate-bounce"
                    : currentTimer.isReminder
                    ? "bg-blue-500/15 border-blue-400/30 text-blue-300"
                    : "bg-cyan-500/15 border-cyan-400/30 text-cyan-300"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : currentTimer.isReminder ? (
                  <Bell className="w-3.5 h-3.5" />
                ) : (
                  <Timer className="w-3.5 h-3.5" />
                )}
              </div>

              {/* Title & Digital Countdown */}
              <div className="flex flex-col min-w-0 pr-1">
                <span className="text-[10px] text-zinc-400 font-medium truncate max-w-[90px]">
                  {currentTimer.label || "Timer"}
                </span>
                <span
                  className={`font-mono text-sm font-bold tracking-tight ${
                    isCompleted ? "text-amber-300" : "text-white"
                  }`}
                >
                  {formatTime(remaining)}
                </span>
              </div>

              {/* Quick Play/Pause Control in Minimized Pill */}
              {!isCompleted && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePause();
                  }}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer shrink-0"
                  title={currentTimer.status === "running" ? "Pause" : "Resume"}
                >
                  {currentTimer.status === "running" ? (
                    <Pause className="w-3 h-3" />
                  ) : (
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                  )}
                </button>
              )}

              {/* Expand to Full View */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMinimize();
                }}
                className="p-1.5 rounded-full bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-400/30 text-cyan-300 transition cursor-pointer shrink-0"
                title="Expand Timer (পূর্ণাঙ্গ ভিউ)"
              >
                <Maximize2 className="w-3 h-3" />
              </button>

              {/* Close / Dismiss */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(currentTimer.id);
                }}
                className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer shrink-0"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ) : (
            /* ================= FULL EXPANDED DRAGGABLE CARD ================= */
            <motion.div
              key="expanded-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`relative w-[340px] sm:w-[380px] overflow-hidden rounded-[26px] p-4.5 border backdrop-blur-2xl shadow-2xl transition-all ${
                isCompleted
                  ? "bg-gradient-to-br from-amber-950/90 via-[#1c1612]/95 to-emerald-950/80 border-amber-400/40 shadow-amber-500/15 animate-pulse"
                  : "bg-[#181920]/95 border-white/15 hover:border-white/25 shadow-cyan-500/10"
              }`}
            >
              {/* Subtle Ambient Glow */}
              <div
                className={`absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl pointer-events-none transition-all ${
                  isCompleted
                    ? "bg-amber-400/20"
                    : currentTimer.status === "running"
                    ? "bg-cyan-500/15"
                    : "bg-zinc-500/10"
                }`}
              />

              {/* TOP ROW: Drag Grip + Header Title + Multiple Timers Tabs + Minimize & Close */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="text-zinc-500 hover:text-zinc-300 transition shrink-0" title="Drag to move anywhere on display">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                      isCompleted
                        ? "bg-amber-500/20 border-amber-400/30 text-amber-300"
                        : currentTimer.isReminder
                        ? "bg-blue-500/15 border-blue-400/30 text-blue-300"
                        : "bg-cyan-500/15 border-cyan-400/30 text-cyan-300"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-amber-300 animate-bounce" />
                    ) : currentTimer.isReminder ? (
                      <Bell className="w-4 h-4" />
                    ) : (
                      <Timer className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-white truncate max-w-[130px] sm:max-w-[160px]">
                        {currentTimer.label || "Timer"}
                      </h3>
                      <span
                        className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full border ${
                          isCompleted
                            ? "bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold"
                            : currentTimer.status === "paused"
                            ? "bg-zinc-500/20 border-zinc-500/40 text-zinc-300"
                            : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                        }`}
                      >
                        {isCompleted ? "Done" : currentTimer.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {currentTimer.isReminder ? "Smart Reminder" : "Live Countdown"}
                    </p>
                  </div>
                </div>

                {/* Right Header Controls: Sound Mute, Minimize, Close */}
                <div className="flex items-center gap-1 shrink-0">
                  {localTimers.length > 1 && (
                    <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-1.5 py-0.5 text-[10px] font-mono text-zinc-300 mr-1">
                      {localTimers.map((t, idx) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTabId(t.id);
                          }}
                          className={`px-1 py-0.2 rounded text-[9px] transition cursor-pointer ${
                            t.id === currentTimer.id
                              ? "bg-cyan-500/30 text-cyan-200 font-bold"
                              : "text-zinc-500 hover:text-white"
                          }`}
                        >
                          #{idx + 1}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSoundMuted(!isSoundMuted);
                    }}
                    className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
                    title={isSoundMuted ? "Unmute Alarm" : "Mute Alarm"}
                  >
                    {isSoundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>

                  {/* MINIMIZE BUTTON */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMinimize();
                    }}
                    className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-cyan-300 transition cursor-pointer"
                    title="Minimize Timer (মিনিমাইজ করুন)"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  {/* CLOSE BUTTON */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss(currentTimer.id);
                    }}
                    className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* CENTER MAIN COUNTDOWN CLOCK & QUICK CONTROLS */}
              <div className="my-2.5 flex items-center justify-between px-1">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`font-mono text-3xl sm:text-4xl font-bold tracking-tight ${
                      isCompleted
                        ? "text-amber-300 animate-pulse"
                        : currentTimer.status === "paused"
                        ? "text-zinc-400"
                        : "text-white drop-shadow-[0_0_12px_rgba(6,182,212,0.35)]"
                    }`}
                  >
                    {formatTime(remaining)}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    / {formatTime(total)}
                  </span>
                </div>

                {/* Quick Action Controls */}
                <div className="flex items-center gap-1.5">
                  {!isCompleted ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePause();
                        }}
                        className={`p-2 rounded-xl border flex items-center justify-center transition cursor-pointer shadow-md ${
                          currentTimer.status === "running"
                            ? "bg-white/10 hover:bg-white/20 border-white/10 text-white"
                            : "bg-cyan-500 hover:bg-cyan-400 border-cyan-400 text-zinc-950 font-bold"
                        }`}
                        title={currentTimer.status === "running" ? "Pause" : "Resume"}
                      >
                        {currentTimer.status === "running" ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addOneMinute();
                        }}
                        className="px-2 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-cyan-300 flex items-center gap-1 transition cursor-pointer"
                        title="Add 1 Minute"
                      >
                        <Plus className="w-3 h-3" />
                        <span>1m</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        resetTimer();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-amber-500/20"
                      title="Restart Timer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restart</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      resetTimer();
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
                    title="Reset"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* PROGRESS BAR (Visual Elapsed Progress Track) */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1 px-0.5">
                  <span>{Math.round(elapsedPercent)}% Elapsed</span>
                  <span>{Math.round(progressPercent)}% Left</span>
                </div>

                <div className="w-full h-2.5 bg-black/40 border border-white/10 rounded-full overflow-hidden relative shadow-inner p-0.5">
                  {/* Animated Progress Bar Fill */}
                  <motion.div
                    className={`h-full rounded-full transition-all duration-300 relative ${
                      isCompleted
                        ? "bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                        : currentTimer.status === "paused"
                        ? "bg-zinc-500"
                        : "bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 shadow-[0_0_12px_rgba(6,182,212,0.5)]"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  >
                    {currentTimer.status === "running" && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full animate-pulse" />
                    )}
                  </motion.div>
                </div>
              </div>

              {/* Completed Alert Notice */}
              {isCompleted && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 py-1.5 px-3 bg-amber-500/20 border border-amber-400/30 rounded-xl flex items-center justify-between text-xs text-amber-200"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    Time is completed for {currentTimer.label}!
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss(currentTimer.id);
                    }}
                    className="text-[11px] underline hover:text-white font-bold cursor-pointer"
                  >
                    Dismiss
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
