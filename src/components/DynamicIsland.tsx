import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  ScreenShare,
  ScreenShareOff,
  Send,
  MessageSquare,
  Settings,
  X,
  Sparkles,
  Volume2,
  ChevronDown,
  Bell
} from "lucide-react";

interface DynamicIslandProps {
  connectionState: "disconnected" | "connecting" | "connected";
  isMuted: boolean;
  onToggleMute: () => void;
  isCameraSharing: boolean;
  onToggleCameraSharing: () => void;
  isScreenSharing: boolean;
  onToggleScreenSharing: () => void;
  onOpenSettings: () => void;
  onSendTextMessage: (text: string) => void;
  recallMessage: string | null;
  activeSound: string;
  speakerName?: string;
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({
  connectionState,
  isMuted,
  onToggleMute,
  isCameraSharing,
  onToggleCameraSharing,
  isScreenSharing,
  onToggleScreenSharing,
  onOpenSettings,
  onSendTextMessage,
  recallMessage,
  activeSound,
  speakerName = "User"
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    onSendTextMessage(textInput.trim());
    setTextInput("");
    setShowTextInput(false);
  };

  const isConnected = connectionState === "connected";

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center pointer-events-auto">
      {/* Floating Dynamic Island Pill */}
      <motion.div
        layout
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`bg-zinc-950/90 backdrop-blur-2xl border border-white/15 shadow-[0_10px_35px_rgba(0,0,0,0.6)] text-white rounded-full transition-all duration-300 overflow-hidden ${
          isExpanded
            ? "w-[92vw] max-w-lg rounded-3xl p-3.5 border-cyan-500/30"
            : "px-4 py-2 flex items-center gap-3 cursor-pointer hover:border-cyan-500/40"
        }`}
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        {!isExpanded ? (
          /* Compact View */
          <div className="flex items-center gap-3 w-full justify-between select-none">
            {/* Left: Orb & AI Status */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center">
                <span
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    !isConnected
                      ? "bg-zinc-600"
                      : isMuted
                      ? "bg-amber-400"
                      : "bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                  }`}
                />
                {isConnected && !isMuted && (
                  <span className="absolute w-5 h-5 rounded-full bg-cyan-400/30 animate-ping" />
                )}
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] font-bold font-mono tracking-wider text-cyan-300 flex items-center gap-1.5">
                  TUNE
                  {isConnected && (
                    <span className="text-[8px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded font-normal uppercase">
                      LIVE
                    </span>
                  )}
                </span>
                <span className="text-[9px] text-white/50 font-mono truncate max-w-[120px] sm:max-w-[180px]">
                  {recallMessage
                    ? recallMessage
                    : !isConnected
                    ? "Tap to Wake AI"
                    : isMuted
                    ? "Muted"
                    : "Listening & Ready"}
                </span>
              </div>
            </div>

            {/* Center / Right: Vision & Share Badges */}
            <div className="flex items-center gap-1.5">
              {isScreenSharing && (
                <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[9px] font-mono font-bold rounded-full flex items-center gap-1 animate-pulse">
                  <ScreenShare className="w-2.5 h-2.5" />
                  <span className="hidden sm:inline">SCREEN</span>
                </span>
              )}

              {isCameraSharing && (
                <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[9px] font-mono font-bold rounded-full flex items-center gap-1 animate-pulse">
                  <Camera className="w-2.5 h-2.5" />
                  <span className="hidden sm:inline">CAM</span>
                </span>
              )}

              <div className="w-px h-4 bg-white/10 mx-0.5" />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTextInput((prev) => !prev);
                  setIsExpanded(true);
                }}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition"
                title="Send Text Message"
              >
                <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(true);
                }}
                className="p-1 rounded-full text-white/40 hover:text-white"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Expanded Siri / Dynamic Island Controls */
          <div className="flex flex-col gap-3 w-full">
            {/* Header row */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-mono text-xs font-bold">
                  T
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                    TUNE DYNAMIC ISLAND
                    <span className="text-[9px] text-cyan-400 font-normal">
                      [{isConnected ? "ONLINE" : "SLEEPING"}]
                    </span>
                  </h4>
                  <p className="text-[9px] text-white/40 font-mono">
                    {speakerName ? `Active User: ${speakerName}` : "AI Companion Active"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Active Status Badges */}
            <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
              <div
                className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                  isConnected
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isConnected ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                  }`}
                />
                Voice Stream: {isConnected ? "Active" : "Disconnected"}
              </div>

              <button
                onClick={onToggleScreenSharing}
                className={`px-2.5 py-1 rounded-full border transition flex items-center gap-1.5 ${
                  isScreenSharing
                    ? "bg-purple-500/20 border-purple-500/40 text-purple-300 animate-pulse"
                    : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"
                }`}
              >
                {isScreenSharing ? (
                  <ScreenShareOff className="w-3 h-3 text-purple-400" />
                ) : (
                  <ScreenShare className="w-3 h-3" />
                )}
                Screen Vision: {isScreenSharing ? "LIVE" : "Off"}
              </button>

              <button
                onClick={onToggleCameraSharing}
                className={`px-2.5 py-1 rounded-full border transition flex items-center gap-1.5 ${
                  isCameraSharing
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 animate-pulse"
                    : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"
                }`}
              >
                {isCameraSharing ? (
                  <CameraOff className="w-3 h-3 text-cyan-400" />
                ) : (
                  <Camera className="w-3 h-3" />
                )}
                Camera Vision: {isCameraSharing ? "LIVE" : "Off"}
              </button>
            </div>

            {/* Quick Action Buttons Row */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button
                onClick={onToggleMute}
                disabled={!isConnected}
                className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 text-[10px] font-mono transition ${
                  isMuted
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                } disabled:opacity-30`}
              >
                {isMuted ? <MicOff className="w-4 h-4 text-amber-400" /> : <Mic className="w-4 h-4 text-cyan-400" />}
                <span>{isMuted ? "Unmute" : "Mute"}</span>
              </button>

              <button
                onClick={() => setShowTextInput((prev) => !prev)}
                className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 text-[10px] font-mono transition ${
                  showTextInput
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <span>Text Chat</span>
              </button>

              <button
                onClick={onToggleCameraSharing}
                disabled={!isConnected}
                className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 text-[10px] font-mono transition ${
                  isCameraSharing
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                } disabled:opacity-30`}
              >
                {isCameraSharing ? <CameraOff className="w-4 h-4 text-cyan-400" /> : <Camera className="w-4 h-4" />}
                <span>Camera</span>
              </button>

              <button
                onClick={() => {
                  setIsExpanded(false);
                  onOpenSettings();
                }}
                className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white flex flex-col items-center gap-1 text-[10px] font-mono transition"
              >
                <Settings className="w-4 h-4 text-zinc-300" />
                <span>Settings</span>
              </button>
            </div>

            {/* Quick Text Input */}
            <AnimatePresence>
              {showTextInput && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleSendText}
                  className="flex items-center gap-2 pt-1"
                >
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type a message or instruction to Tune..."
                    className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 font-mono"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!textInput.trim()}
                    className="p-2 rounded-xl bg-cyan-500 text-zinc-950 hover:bg-cyan-400 transition font-bold disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
};
