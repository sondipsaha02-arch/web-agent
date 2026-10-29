import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Brain, Sparkles, Check } from "lucide-react";

interface MemoryIndicatorProps {
  recallMessage: string | null;
  onClear: () => void;
}

export const MemoryIndicator: React.FC<MemoryIndicatorProps> = ({
  recallMessage,
  onClear,
}) => {
  useEffect(() => {
    if (recallMessage) {
      const timer = setTimeout(() => {
        onClear();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [recallMessage, onClear]);

  return (
    <div className="absolute top-[18%] left-1/2 transform -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center">
      <AnimatePresence>
        {recallMessage && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.9, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, scale: 0.92, filter: "blur(6px)" }}
            transition={{ type: "spring", damping: 18, stiffness: 120 }}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-950/85 backdrop-blur-3xl border border-purple-500/35 rounded-full shadow-[0_0_20px_rgba(139,92,246,0.18)]"
          >
            <div className="w-5 h-5 rounded-full bg-purple-500/15 flex items-center justify-center text-purple-400">
              {recallMessage.toLowerCase().includes("remembered") || 
               recallMessage.toLowerCase().includes("previous") ? (
                <Brain className="w-3 h-3 animate-pulse" />
              ) : recallMessage.toLowerCase().includes("saved") ? (
                <Check className="w-3 h-3 text-cyan-400" />
              ) : (
                <Sparkles className="w-3 h-3 text-yellow-400" />
              )}
            </div>
            <span className="text-[10px] font-bold font-mono tracking-wider text-purple-200 uppercase">
              {recallMessage}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default MemoryIndicator;
