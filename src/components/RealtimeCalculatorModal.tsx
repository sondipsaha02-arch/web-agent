import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calculator as CalculatorIcon,
  X,
  Minimize2,
  Maximize2,
  Delete,
  Mic,
  MicOff,
  History,
  RotateCcw,
  Sparkles,
  ChevronRight,
  GripHorizontal
} from "lucide-react";
import { soundEngine } from "../utils/soundEngine";

export interface CalculationEntry {
  id: string;
  expression: string;
  result: string;
  operationType?: string;
  steps?: string;
  timestamp: number;
}

interface RealtimeCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCalculation?: {
    expression?: string;
    result?: string;
    operationType?: string;
    steps?: string;
  } | null;
}

export const RealtimeCalculatorModal: React.FC<RealtimeCalculatorModalProps> = ({
  isOpen,
  onClose,
  initialCalculation,
}) => {
  const [expression, setExpression] = useState<string>("");
  const [displayResult, setDisplayResult] = useState<string>("0");
  const [stepDescription, setStepDescription] = useState<string>("");
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [speechFeedback, setSpeechFeedback] = useState<string>("");
  const [history, setHistory] = useState<CalculationEntry[]>(() => {
    if (typeof localStorage !== "undefined") {
      try {
        const saved = localStorage.getItem("tune_calc_history");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Sync initial calculation if provided via Gemini Live Tool or props
  useEffect(() => {
    if (initialCalculation) {
      if (initialCalculation.expression) {
        setExpression(initialCalculation.expression);
      }
      if (initialCalculation.result) {
        setDisplayResult(initialCalculation.result);
      }
      if (initialCalculation.steps) {
        setStepDescription(initialCalculation.steps);
      }
      setIsMinimized(false);
      soundEngine.playWaterDropSound();

      if (initialCalculation.expression && initialCalculation.result) {
        saveHistoryEntry(initialCalculation.expression, initialCalculation.result, initialCalculation.steps, initialCalculation.operationType);
      }
    }
  }, [initialCalculation]);

  // Listen to window event "tune_calculator_updated" dispatched from Gemini live WebSocket session
  useEffect(() => {
    const handleCalculatorEvent = (e: any) => {
      const calc = e.detail?.calculation;
      if (calc) {
        if (calc.expression) setExpression(calc.expression);
        if (calc.result) setDisplayResult(calc.result);
        if (calc.steps) setStepDescription(calc.steps);
        setIsMinimized(false);
        soundEngine.playWaterDropSound();

        if (calc.expression && calc.result) {
          saveHistoryEntry(calc.expression, calc.result, calc.steps, calc.operationType);
        }
      }
    };

    window.addEventListener("tune_calculator_updated", handleCalculatorEvent);
    return () => window.removeEventListener("tune_calculator_updated", handleCalculatorEvent);
  }, []);

  const saveHistoryEntry = (expr: string, res: string, steps?: string, opType?: string) => {
    const newEntry: CalculationEntry = {
      id: "calc_" + Date.now(),
      expression: expr,
      result: res,
      steps: steps,
      operationType: opType,
      timestamp: Date.now(),
    };
    setHistory((prev) => {
      const updated = [newEntry, ...prev.filter((h) => h.expression !== expr)].slice(0, 25);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("tune_calc_history", JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Safe Math evaluator supporting basic arithmetic, percentages, brackets
  const evaluateExpression = (expr: string): string | null => {
    try {
      if (!expr || !expr.trim()) return "0";

      // Normalize operators
      let clean = expr
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/−/g, "-")
        .replace(/,/g, "")
        .trim();

      // Handle percentages e.g. 5000 * 15% -> 5000 * 0.15
      clean = clean.replace(/(\d+(\.\d+)?)%/g, "($1/100)");

      // Security check: only allow digits, mathematical operators, and parentheses
      if (!/^[\d+\-*/().\s^%]+$/.test(clean)) {
        return null;
      }

      // Handle exponents
      clean = clean.replace(/\^/g, "**");

      // Safely evaluate using Function constructor with restricted scope
      const compute = new Function(`'use strict'; return (${clean})`);
      const val = compute();

      if (typeof val === "number" && !isNaN(val) && isFinite(val)) {
        // Format nicely with maximum 8 decimal places
        const rounded = Number(Math.round(Number(val + "e+8")) + "e-8");
        return rounded.toLocaleString("en-US", { maximumFractionDigits: 8 });
      }
      return null;
    } catch {
      return null;
    }
  };

  // Real-time calculation as expression changes
  useEffect(() => {
    if (!expression.trim()) {
      setDisplayResult("0");
      return;
    }
    const evaluated = evaluateExpression(expression);
    if (evaluated !== null) {
      setDisplayResult(evaluated);
    }
  }, [expression]);

  // Voice Math Dictation Engine (Bengali + English voice support)
  const toggleVoiceRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechFeedback("Voice recognition is not supported on this browser.");
      setTimeout(() => setSpeechFeedback(""), 3000);
      return;
    }

    if (isVoiceListening) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsVoiceListening(false);
      setSpeechFeedback("");
      soundEngine.playActionBeep();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      speechRecognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      // Bengali or English recognition
      recognition.lang = "bn-BD";

      recognition.onstart = () => {
        setIsVoiceListening(true);
        setSpeechFeedback("বলুন: যেমন '২৫ যোগ ৫০' বা '১২ গুণ ৫'...");
        soundEngine.playWaterDropSound();
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }

        const cleanTranscript = transcript.trim().toLowerCase();
        setSpeechFeedback(`শুনছি: "${cleanTranscript}"`);

        // Parse voice words into numbers and math operators
        parseVoiceMath(cleanTranscript);
      };

      recognition.onerror = (e: any) => {
        console.warn("Calculator speech error:", e);
        // Fallback to en-US if bn-BD fails
        if (recognition.lang === "bn-BD") {
          recognition.lang = "en-US";
        }
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
        setSpeechFeedback("");
      };

      recognition.start();
    } catch (e: any) {
      console.error("Speech Recognition start error:", e);
      setIsVoiceListening(false);
    }
  };

  // Convert Bengali & English spoken math words to arithmetic formula
  const parseVoiceMath = (spoken: string) => {
    let text = spoken
      // Bengali numbers to digits
      .replace(/০/g, "0")
      .replace(/১/g, "1")
      .replace(/২/g, "2")
      .replace(/৩/g, "3")
      .replace(/৪/g, "4")
      .replace(/৫/g, "5")
      .replace(/৬/g, "6")
      .replace(/৭/g, "7")
      .replace(/৮/g, "8")
      .replace(/৯/g, "9")
      // Operators
      .replace(/(?:যোগ|jog|plus|and|\+)/gi, " + ")
      .replace(/(?:বিয়োগ|biyog|minus|theke baad|sub|\-)/gi, " - ")
      .replace(/(?:গুণ|gun|into|times|multiplied by|\*|x)/gi, " × ")
      .replace(/(?:ভাগ|bhag|divided by|\/)/gi, " ÷ ")
      .replace(/(?:শতাংশ|shangsho|percent|percentage|%)/gi, " % ")
      .replace(/(?:পয়েন্ট|দশমিক|point|dot)/gi, ".");

    // Check for clear command
    if (spoken.includes("clear") || spoken.includes("মুছে ফেলো") || spoken.includes("kete dao")) {
      handleClear();
      return;
    }

    // Extract numbers and operators
    const matched = text.match(/[\d+\-×÷%.()]+/g);
    if (matched && matched.length > 0) {
      const parsedExpression = matched.join(" ").replace(/\s+/g, " ").trim();
      setExpression(parsedExpression);
      soundEngine.playKeypadClickSound();
    }
  };

  // Keypad Handlers
  const handleKeyClick = (val: string) => {
    soundEngine.playKeypadClickSound();
    if (val === "=") {
      handleEquals();
      return;
    }
    if (val === "C") {
      handleClear();
      return;
    }
    if (val === "DEL") {
      handleBackspace();
      return;
    }
    if (val === "+/-") {
      toggleSign();
      return;
    }
    if (val === "sqrt") {
      handleSqrt();
      return;
    }
    if (val === "sq") {
      handleSquare();
      return;
    }

    setExpression((prev) => prev + val);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    soundEngine.playKeypadClickSound();
    setExpression("");
    setDisplayResult("0");
    setStepDescription("");
  };

  const handleBackspace = () => {
    soundEngine.playKeypadClickSound();
    setExpression((prev) => prev.slice(0, -1));
  };

  const handleEquals = () => {
    soundEngine.playWaterDropSound();
    const evaluated = evaluateExpression(expression);
    if (evaluated !== null) {
      setDisplayResult(evaluated);
      const stepText = `${expression} = ${evaluated}`;
      setStepDescription(stepText);
      saveHistoryEntry(expression, evaluated, stepText);
    }
  };

  const toggleSign = () => {
    soundEngine.playKeypadClickSound();
    if (!expression) return;
    if (expression.startsWith("-")) {
      setExpression(expression.substring(1));
    } else {
      setExpression("-" + expression);
    }
  };

  const handleSqrt = () => {
    soundEngine.playKeypadClickSound();
    const evaluated = evaluateExpression(expression);
    if (evaluated !== null) {
      const num = parseFloat(evaluated.replace(/,/g, ""));
      if (num >= 0) {
        const res = Math.sqrt(num);
        const resStr = Number(res.toFixed(6)).toString();
        setDisplayResult(resStr);
        setStepDescription(`√(${expression}) = ${resStr}`);
        setExpression(resStr);
      }
    }
  };

  const handleSquare = () => {
    soundEngine.playKeypadClickSound();
    const evaluated = evaluateExpression(expression);
    if (evaluated !== null) {
      const num = parseFloat(evaluated.replace(/,/g, ""));
      const res = num * num;
      const resStr = Number(res.toFixed(6)).toString();
      setDisplayResult(resStr);
      setStepDescription(`(${expression})² = ${resStr}`);
      setExpression(resStr);
    }
  };

  // Keyboard navigation & typing listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      if ((e.key >= "0" && e.key <= "9") || [".", "+", "-", "*", "/", "%", "(", ")"].includes(e.key)) {
        e.preventDefault();
        const mapped = e.key === "*" ? "×" : e.key === "/" ? "÷" : e.key;
        handleKeyClick(mapped);
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        handleEquals();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, expression]);

  if (!isOpen) return null;

  return (
    <div className="fixed z-50 pointer-events-auto select-none">
      <AnimatePresence mode="wait">
        {isMinimized ? (
          /* ================= MINIMIZED FLOATING CALCULATOR CAPSULE ================= */
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.08}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="fixed bottom-24 right-4 sm:right-8 bg-[#18181b]/95 hover:bg-[#202024] border border-emerald-500/30 rounded-full px-4 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex items-center gap-3 cursor-grab active:cursor-grabbing text-white"
          >
            <div
              onClick={() => {
                soundEngine.playWaterDropSound();
                setIsMinimized(false);
              }}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CalculatorIcon className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                  Calculator
                </span>
                <span className="text-xs font-bold text-white font-mono truncate max-w-[120px]">
                  {displayResult}
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
          /* ================= FULL INTERACTIVE FLOATING CALCULATOR ================= */
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.08}
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            className="fixed top-24 right-4 sm:right-10 w-[320px] sm:w-[350px] bg-[#121214]/95 border border-white/15 rounded-[32px] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur-3xl text-white flex flex-col gap-3 overflow-hidden select-none"
          >
            {/* Top iOS Header with Draggable Handle */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10 cursor-grab active:cursor-grabbing">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <CalculatorIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
                    Real-time Calculator
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                      Live
                    </span>
                  </h3>
                  <p className="text-[9px] font-mono text-zinc-400">
                    Voice & Manual Math
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Voice Dictate Button */}
                <button
                  type="button"
                  onClick={toggleVoiceRecognition}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                    isVoiceListening
                      ? "bg-rose-500 text-white animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]"
                      : "bg-white/10 hover:bg-white/20 text-white/80"
                  }`}
                  title={isVoiceListening ? "Stop Voice Input" : "Speak Math (মুখে বলুন)"}
                >
                  {isVoiceListening ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                </button>

                {/* History Toggle */}
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                    showHistory ? "bg-emerald-500 text-zinc-950 font-bold" : "bg-white/10 hover:bg-white/20 text-white/80"
                  }`}
                  title="Calculation History"
                >
                  <History className="w-3.5 h-3.5" />
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
                  title="Close Calculator"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Voice Dictate Status Banner */}
            {isVoiceListening && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-rose-500/15 border border-rose-500/30 rounded-2xl px-3 py-1.5 flex items-center gap-2 text-[10px] text-rose-300 font-mono"
              >
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                <span className="truncate">{speechFeedback || "Listening for speech..."}</span>
              </motion.div>
            )}

            {/* Display Screen */}
            <div className="bg-black/60 border border-white/10 rounded-2xl p-3.5 flex flex-col justify-end min-h-[95px] relative">
              {/* Step / Formula Breakdown */}
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1">
                <span className="truncate max-w-[200px]">{stepDescription || "Realtime Expression"}</span>
                {expression && (
                  <button
                    onClick={handleClear}
                    className="text-[10px] text-rose-400 hover:text-rose-300 transition"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Expression Input Field (Editable by typing or clicking) */}
              <input
                ref={inputRef}
                type="text"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="0"
                className="w-full bg-transparent text-right text-sm font-mono text-zinc-300 focus:outline-none placeholder:text-zinc-600 mb-1"
              />

              {/* Huge Computed Result Display */}
              <div className="text-right text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight truncate drop-shadow-md">
                {displayResult}
              </div>
            </div>

            {/* History Overlay Drawer */}
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 180 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-black/80 border border-white/10 rounded-2xl p-3 overflow-y-auto space-y-2 text-xs font-mono"
                >
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase pb-1 border-b border-white/5">
                    <span>Recent Calculations</span>
                    <button
                      onClick={() => {
                        setHistory([]);
                        localStorage.removeItem("tune_calc_history");
                      }}
                      className="text-rose-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  {history.length === 0 ? (
                    <p className="text-[11px] text-zinc-500 text-center py-4">No recent calculations</p>
                  ) : (
                    history.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setExpression(item.expression);
                          setDisplayResult(item.result);
                          setShowHistory(false);
                          soundEngine.playKeypadClickSound();
                        }}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-between cursor-pointer transition"
                      >
                        <span className="text-zinc-300 truncate max-w-[170px]">{item.expression}</span>
                        <span className="text-emerald-400 font-bold">{item.result}</span>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Keypad Grid (Apple-style tactile circular buttons) */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {/* Row 1 */}
              <button
                type="button"
                onClick={() => handleKeyClick("C")}
                className="py-3 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700/80 active:scale-95 text-rose-400 font-bold text-sm transition"
              >
                C
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick("DEL")}
                className="py-3 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700/80 active:scale-95 text-amber-400 font-semibold text-sm transition flex items-center justify-center"
                title="Backspace"
              >
                <Delete className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick("%")}
                className="py-3 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700/80 active:scale-95 text-cyan-300 font-semibold text-sm transition"
              >
                %
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick("÷")}
                className="py-3 rounded-2xl bg-amber-500/90 hover:bg-amber-400 active:scale-95 text-zinc-950 font-bold text-base transition"
              >
                ÷
              </button>

              {/* Row 2 */}
              <button
                type="button"
                onClick={() => handleKeyClick("7")}
                className="py-3 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 text-white font-bold text-base transition"
              >
                7
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick("8")}
                className="py-3 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 text-white font-bold text-base transition"
              >
                8
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick("9")}
                className="py-3 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 text-white font-bold text-base transition"
              >
                9
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick("×")}
                className="py-3 rounded-2xl bg-amber-500/90 hover:bg-amber-400 active:scale-95 text-zinc-950 font-bold text-base transition"
              >
                ×
              </button>

              {/* Row 3 */}
              <button
                type="button"
                onClick={() => handleKeyClick("4")}
                className="py-3 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 text-white font-bold text-base transition"
              >
                4
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick("5")}
                className="py-3 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 text-white font-bold text-base transition"
              >
                5
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick("6")}
                className="py-3 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 text-white font-bold text-base transition"
              >
                6
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick("−")}
                className="py-3 rounded-2xl bg-amber-500/90 hover:bg-amber-400 active:scale-95 text-zinc-950 font-bold text-base transition"
              >
                −
              </button>

              {/* Row 4 */}
              <button
                type="button"
                onClick={() => handleKeyClick("1")}
                className="py-3 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 text-white font-bold text-base transition"
              >
                1
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick("2")}
                className="py-3 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 text-white font-bold text-base transition"
              >
                2
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick("3")}
                className="py-3 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 text-white font-bold text-base transition"
              >
                3
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick("+")}
                className="py-3 rounded-2xl bg-amber-500/90 hover:bg-amber-400 active:scale-95 text-zinc-950 font-bold text-base transition"
              >
                +
              </button>

              {/* Row 5 */}
              <button
                type="button"
                onClick={() => handleKeyClick("0")}
                className="py-3 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 text-white font-bold text-base transition"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick(".")}
                className="py-3 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 text-white font-bold text-base transition"
              >
                .
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick("+/-")}
                className="py-3 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700/80 active:scale-95 text-zinc-300 font-bold text-sm transition"
              >
                ±
              </button>
              <button
                type="button"
                onClick={handleEquals}
                className="py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-bold text-lg transition shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                =
              </button>
            </div>

            {/* Quick Scientific Helpers Bar */}
            <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-white/5">
              <button
                type="button"
                onClick={() => handleKeyClick("(")}
                className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[11px] font-mono text-zinc-300 transition"
              >
                (
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick(")")}
                className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[11px] font-mono text-zinc-300 transition"
              >
                )
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick("sqrt")}
                className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[11px] font-mono text-zinc-300 transition"
              >
                √
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick("sq")}
                className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[11px] font-mono text-zinc-300 transition"
              >
                x²
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
