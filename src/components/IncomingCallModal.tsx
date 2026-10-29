import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Phone, PhoneOff, Bell, Sparkles, Clock, Volume2 } from "lucide-react";

interface IncomingCallModalProps {
  isOpen: boolean;
  reminderTitle: string;
  reminderTime: string;
  onAnswer: () => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  isOpen,
  reminderTitle,
  reminderTime,
  onAnswer,
  onDecline
}) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<any>(null);

  // Play synthetic incoming call ringtone
  useEffect(() => {
    if (isOpen) {
      // Trigger Web Notification
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("Incoming Call from Tune 🔔", {
            body: `Scheduled Reminder: ${reminderTitle} (${reminderTime})`,
            icon: "/icon.png",
            requireInteraction: true
          });
        } catch (e) {
          console.log("Notification trigger error:", e);
        }
      }

      // Start synthesized phone ringtone
      const playRingtoneBeep = () => {
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContext) return;
          if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioContext();
          }
          const ctx = audioCtxRef.current;
          if (ctx.state === "suspended") {
            ctx.resume();
          }

          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = "sine";
          osc2.type = "sine";
          osc1.frequency.setValueAtTime(440, ctx.currentTime); // A4
          osc2.frequency.setValueAtTime(480, ctx.currentTime); // Standard ringback tone

          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start();
          osc2.start();
          osc1.stop(ctx.currentTime + 1.2);
          osc2.stop(ctx.currentTime + 1.2);
        } catch (err) {
          console.error("Ringtone error:", err);
        }
      };

      playRingtoneBeep();
      ringIntervalRef.current = setInterval(playRingtoneBeep, 2500);
    } else {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
    }

    return () => {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [isOpen, reminderTitle, reminderTime]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          className="relative w-full max-w-sm bg-gradient-to-b from-zinc-900 to-black border border-cyan-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(34,211,238,0.25)] flex flex-col items-center text-center overflow-hidden"
        >
          {/* Animated Background Pulse */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" />

          {/* Caller Avatar */}
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500/30 to-purple-600/30 border-2 border-cyan-400/50 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.4)] animate-bounce">
              <span className="font-mono text-3xl font-bold text-cyan-300">TUNE</span>
            </div>
            <span className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-ping" />
          </div>

          <span className="px-3 py-1 bg-cyan-500/15 border border-cyan-500/30 rounded-full text-[10px] font-mono text-cyan-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Bell className="w-3 h-3 text-cyan-400 animate-spin" />
            INCOMING REMINDER CALL
          </span>

          <h3 className="text-xl font-bold text-white mb-1 font-display">
            Tune AI Assistant
          </h3>
          <p className="text-xs text-cyan-200/80 font-mono mb-4">
            Calling you for scheduled task reminder
          </p>

          {/* Task Card */}
          <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 text-left">
            <div className="flex items-center gap-2 text-white/50 text-[10px] font-mono mb-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>SCHEDULED TIME: {reminderTime}</span>
            </div>
            <p className="text-sm font-semibold text-white font-mono">
              "{reminderTitle}"
            </p>
          </div>

          {/* Call Controls */}
          <div className="flex items-center gap-6 w-full justify-center">
            {/* Decline */}
            <button
              onClick={onDecline}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 flex items-center justify-center text-rose-400 transition transform group-hover:scale-105">
                <PhoneOff className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono text-rose-300">Decline</span>
            </button>

            {/* Answer */}
            <button
              onClick={onAnswer}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500 border border-emerald-400 hover:bg-emerald-400 flex items-center justify-center text-zinc-950 shadow-[0_0_25px_rgba(52,211,153,0.6)] transition transform group-hover:scale-110 animate-pulse">
                <Phone className="w-7 h-7" />
              </div>
              <span className="text-[10px] font-mono text-emerald-300 font-bold">
                Answer Call
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
