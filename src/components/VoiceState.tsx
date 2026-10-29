import React from "react";
import { ConnectionState } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface VoiceStateProps {
  connectionState: ConnectionState;
}

export const VoiceState: React.FC<VoiceStateProps> = ({ connectionState }) => {
  const getStatusText = () => {
    switch (connectionState) {
      case "disconnected":
        return "Offline";
      case "connecting":
        return "Connecting to Tune...";
      case "listening":
        return "Listening...";
      case "speaking":
        return "Speaking...";
      case "thinking":
        return "Thinking...";
      default:
        return "Offline";
    }
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case "disconnected":
        return "text-white/30";
      case "connecting":
        return "text-yellow-400/80";
      case "listening":
        return "text-cyan-400/80";
      case "speaking":
        return "text-violet-400/90";
      case "thinking":
        return "text-violet-300 font-semibold drop-shadow-[0_0_8px_rgba(167,139,250,0.6)]";
      default:
        return "text-white/30";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-1 min-h-[30px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={connectionState}
          initial={{ opacity: 0, y: 5, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -5, filter: "blur(2px)" }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] font-mono text-center ${getStatusColor()}`}
        >
          {connectionState === "thinking" && (
            <motion.span
              animate={{ opacity: [0.35, 1, 0.35], scale: [0.85, 1.2, 0.85] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
              className="inline-block w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_#a78bfa]"
            />
          )}
          {getStatusText()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
export default VoiceState;
