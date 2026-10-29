import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock as ClockIcon,
  X,
  Minimize2,
  Maximize2,
  Calendar,
  Globe,
  Timer,
  Play,
  Sparkles,
  GripHorizontal
} from "lucide-react";
import { soundEngine } from "../utils/soundEngine";

interface ClockPopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTimer?: (duration: string, label?: string) => void;
}

export const ClockPopupModal: React.FC<ClockPopupModalProps> = ({
  isOpen,
  onClose,
  onStartTimer,
}) => {
  const [now, setNow] = useState<Date>(new Date());
  const [is24Hour, setIs24Hour] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const autoMinimizeTimerRef = useRef<any>(null);

  // Keep live time ticking every 200ms for ultra-smooth analog and digital accuracy
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setNow(new Date());
    }, 250);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Auto-minimize after 15 seconds of inactivity
  useEffect(() => {
    if (isOpen) {
      soundEngine.playWaterDropSound();
      setIsMinimized(false);
      if (autoMinimizeTimerRef.current) clearTimeout(autoMinimizeTimerRef.current);
      autoMinimizeTimerRef.current = setTimeout(() => {
        setIsMinimized(true);
      }, 15000);
    }
    return () => {
      if (autoMinimizeTimerRef.current) clearTimeout(autoMinimizeTimerRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Time calculations
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const milliseconds = now.getMilliseconds();

  // Analog clock hands angle in degrees
  const secondAngle = (seconds + milliseconds / 1000) * 6; // 360 / 60
  const minuteAngle = (minutes + seconds / 60) * 6;
  const hourAngle = ((hours % 12) + minutes / 60) * 30; // 360 / 12

  // 12-hour vs 24-hour formatting
  const hour12 = hours % 12 || 12;
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHours = is24Hour ? String(hours).padStart(2, "0") : String(hour12).padStart(2, "0");
  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(seconds).padStart(2, "0");

  // Bengali Time Period detection
  let timePeriodBn = "সকাল";
  let timePeriodColor = "bg-amber-500/20 text-amber-300 border-amber-500/30";
  if (hours >= 4 && hours < 6) {
    timePeriodBn = "ভোর";
    timePeriodColor = "bg-orange-500/20 text-orange-300 border-orange-500/30";
  } else if (hours >= 6 && hours < 12) {
    timePeriodBn = "সকাল";
    timePeriodColor = "bg-amber-500/20 text-amber-300 border-amber-500/30";
  } else if (hours >= 12 && hours < 15) {
    timePeriodBn = "দুপুর";
    timePeriodColor = "bg-sky-500/20 text-sky-300 border-sky-500/30";
  } else if (hours >= 15 && hours < 18) {
    timePeriodBn = "বিকেল";
    timePeriodColor = "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
  } else if (hours >= 18 && hours < 20) {
    timePeriodBn = "সন্ধ্যা";
    timePeriodColor = "bg-purple-500/20 text-purple-300 border-purple-500/30";
  } else {
    timePeriodBn = hours >= 23 || hours < 4 ? "গভীর রাত" : "রাত";
    timePeriodColor = "bg-blue-900/40 text-blue-300 border-blue-500/30";
  }

  // Bengali Date & Day
  const dayNamesBn = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
  const monthNamesBn = [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
  ];
  const dayOfWeekBn = dayNamesBn[now.getDay()];
  const monthBn = monthNamesBn[now.getMonth()];
  const dateBn = `${now.getDate()} ${monthBn}, ${now.getFullYear()}`;

  // English Date & Day
  const dayOfWeekEn = now.toLocaleDateString("en-US", { weekday: "long" });
  const dateEn = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local Timezone";

  const handleQuickTimer = (duration: string, label: string) => {
    soundEngine.playWaterDropSound();
    if (onStartTimer) {
      onStartTimer(duration, label);
    }
    // Also dispatch event directly so ToolManager handles it
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tune_request_timer", { detail: { duration, label } }));
    }
  };

  return (
    <div className="fixed z-50 pointer-events-auto select-none">
      <AnimatePresence mode="wait">
        {isMinimized ? (
          /* ================= MINIMIZED FLOATING CLOCK PILL ================= */
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.08}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="fixed top-24 left-4 sm:left-8 bg-[#18181b]/95 hover:bg-[#202024] border border-cyan-500/30 rounded-full px-4 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex items-center gap-3 cursor-grab active:cursor-grabbing text-white"
          >
            <div
              onClick={() => {
                soundEngine.playWaterDropSound();
                setIsMinimized(false);
              }}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <ClockIcon className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                  {timePeriodBn}
                </span>
                <span className="text-xs font-bold text-white font-mono tracking-tight">
                  {formattedHours}:{formattedMinutes} {!is24Hour && ampm}
                </span>
              </div>
              <Maximize2 className="w-3.5 h-3.5 text-zinc-400 hover:text-white transition ml-1" />
            </div>

            <button
              onClick={() => {
                soundEngine.playActionBeep();
                onClose();
              }}
              className="w-5 h-5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        ) : (
          /* ================= FULL EXPANDED CLOCK POPUP MODAL ================= */
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.08}
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            className="fixed top-24 left-4 sm:left-10 w-[310px] sm:w-[340px] bg-[#121214]/95 border border-white/15 rounded-[32px] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur-3xl text-white flex flex-col gap-3.5 overflow-hidden select-none"
          >
            {/* Top Header with Drag Handle */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10 cursor-grab active:cursor-grabbing">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <ClockIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
                    Live Clock
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${timePeriodColor}`}>
                      {timePeriodBn}
                    </span>
                  </h3>
                  <p className="text-[9px] font-mono text-zinc-400 truncate max-w-[150px]">
                    {timezone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* 12h / 24h Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playKeypadClickSound();
                    setIs24Hour(!is24Hour);
                  }}
                  className="px-2 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-[10px] font-mono text-white/80 font-bold transition cursor-pointer"
                  title="Toggle 12h / 24h format"
                >
                  {is24Hour ? "24H" : "12H"}
                </button>

                {/* Minimize Button */}
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playActionBeep();
                    setIsMinimized(true);
                  }}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/80 flex items-center justify-center transition cursor-pointer"
                  title="Minimize (ফ্লোটিং করুন)"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playActionBeep();
                    onClose();
                  }}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-rose-500 hover:text-white text-white/80 flex items-center justify-center transition cursor-pointer"
                  title="Close Clock"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Central Dual Display: Analog Clock Face + Huge Digital Time */}
            <div className="flex items-center gap-4 bg-black/40 border border-white/5 rounded-2xl p-3.5">
              {/* SVG Analog Clock Face */}
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                  {/* Outer Ring */}
                  <circle cx="50" cy="50" r="47" fill="#18181b" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
                  
                  {/* 12 Hour Marker Ticks */}
                  {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => (
                    <line
                      key={i}
                      x1="50"
                      y1="9"
                      x2="50"
                      y2={i % 3 === 0 ? "14" : "11"}
                      stroke={i % 3 === 0 ? "#38bdf8" : "rgba(255,255,255,0.3)"}
                      strokeWidth={i % 3 === 0 ? "2" : "1"}
                      transform={`rotate(${deg} 50 50)`}
                    />
                  ))}

                  {/* Hour Hand */}
                  <line
                    x1="50"
                    y1="50"
                    x2="50"
                    y2="28"
                    stroke="#ffffff"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    transform={`rotate(${hourAngle} 50 50)`}
                  />

                  {/* Minute Hand */}
                  <line
                    x1="50"
                    y1="50"
                    x2="50"
                    y2="18"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    transform={`rotate(${minuteAngle} 50 50)`}
                  />

                  {/* Second Hand (Smooth Cyan Needle) */}
                  <line
                    x1="50"
                    y1="56"
                    x2="50"
                    y2="14"
                    stroke="#f43f5e"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    transform={`rotate(${secondAngle} 50 50)`}
                  />

                  {/* Center Pivot Pin */}
                  <circle cx="50" cy="50" r="3" fill="#f43f5e" />
                  <circle cx="50" cy="50" r="1.5" fill="#ffffff" />
                </svg>
              </div>

              {/* Digital Time & Seconds */}
              <div className="flex flex-col justify-center min-w-0 flex-1">
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-3xl font-extrabold text-white tracking-tight">
                    {formattedHours}:{formattedMinutes}
                  </span>
                  <span className="text-sm font-bold text-rose-400">
                    :{formattedSeconds}
                  </span>
                  {!is24Hour && (
                    <span className="text-xs font-bold text-cyan-300 ml-0.5">
                      {ampm}
                    </span>
                  )}
                </div>

                <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-zinc-300 truncate">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{dayOfWeekBn}, {dateBn}</span>
                </div>
              </div>
            </div>

            {/* English Calendar Date Bar */}
            <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-white/5 border border-white/5 text-[11px] font-mono text-zinc-300">
              <span className="text-zinc-400">{dayOfWeekEn}</span>
              <span className="text-white font-medium">{dateEn}</span>
            </div>

            {/* Quick Timer Launcher Buttons */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 px-1">
                <span className="flex items-center gap-1">
                  <Timer className="w-3 h-3 text-cyan-400" /> Quick Timers (দ্রুত টাইমার)
                </span>
                <span className="text-zinc-500">1-Tap Start</span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickTimer("1 minute", "1 Min Timer")}
                  className="py-1.5 bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-500/30 border border-white/5 rounded-xl text-[11px] font-mono text-zinc-200 hover:text-cyan-300 transition cursor-pointer"
                >
                  1 min
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTimer("5 minutes", "5 Min Tea Break")}
                  className="py-1.5 bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-500/30 border border-white/5 rounded-xl text-[11px] font-mono text-zinc-200 hover:text-cyan-300 transition cursor-pointer"
                >
                  5 min
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTimer("10 minutes", "10 Min Quick Break")}
                  className="py-1.5 bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-500/30 border border-white/5 rounded-xl text-[11px] font-mono text-zinc-200 hover:text-cyan-300 transition cursor-pointer"
                >
                  10 min
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTimer("25 minutes", "25 Min Pomodoro Focus")}
                  className="py-1.5 bg-white/5 hover:bg-emerald-500/20 hover:border-emerald-500/30 border border-white/5 rounded-xl text-[11px] font-mono text-zinc-200 hover:text-emerald-300 transition cursor-pointer"
                >
                  25 min
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
