import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Maximize2,
  Minimize2,
  Download,
  Trash2,
  Sparkles,
  PenTool,
  Highlighter,
  Eraser,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  Lightbulb,
  Layers,
  ArrowRight,
  Check,
  Smartphone,
  LayoutGrid
} from "lucide-react";
import { WhiteboardSession, WhiteboardLessonStep, WhiteboardElement } from "../types";

interface TeacherWhiteboardModalProps {
  session: WhiteboardSession | null;
  isOpen: boolean;
  onClose: () => void;
  onAskTeacherPrompt?: (prompt: string) => void;
  onUpdateSession?: (session: WhiteboardSession) => void;
}

const COLOR_PALETTE = [
  { name: "Whiteboard Black", value: "#0f172a" },
  { name: "Electric Blue", value: "#2563eb" },
  { name: "Crimson Red", value: "#dc2626" },
  { name: "Forest Green", value: "#16a34a" },
  { name: "Vivid Purple", value: "#9333ea" },
  { name: "Sun Amber", value: "#d97706" },
];

/**
 * Beautifully formats mathematical and scientific equations horizontally
 * Converts fractions like (a)/(b), exponents like x^2 or mc^2, square roots \sqrt{x},
 * plus/minus +-, integrals \int, limits, etc. into pristine typography instead of stacked plain text.
 */
const MathEquationRenderer: React.FC<{ formula: string; sublabel?: string }> = ({ formula, sublabel }) => {
  // Clean string
  let eq = (formula || "").trim();

  // Replace common symbols with elegant unicode
  eq = eq
    .replace(/\+-/g, "±")
    .replace(/\*|\u00D7/g, " · ")
    .replace(/<=/g, "≤")
    .replace(/>=/g, "≥")
    .replace(/!=/g, "≠")
    .replace(/->/g, " → ")
    .replace(/\^2/g, "²")
    .replace(/\^3/g, "³")
    .replace(/\^0/g, "⁰")
    .replace(/\^1/g, "¹")
    .replace(/\^4/g, "⁴")
    .replace(/\^n/g, "ⁿ")
    .replace(/sqrt\(([^)]+)\)/gi, "√($1)")
    .replace(/\\sqrt\{([^}]+)\}/gi, "√($1)")
    .replace(/pi\b/gi, "π")
    .replace(/theta\b/gi, "θ")
    .replace(/alpha\b/gi, "α")
    .replace(/beta\b/gi, "β")
    .replace(/delta\b/gi, "Δ")
    .replace(/infinity\b|inf\b/gi, "∞");

  // Check if equation contains a fraction pattern like (num)/(den)
  const fracMatch = eq.match(/^(.*?)(?:\(?([^()]+)\)?\s*\/\s*\(?([^()]+)\)?)(.*)$/);

  return (
    <div className="flex flex-col items-center justify-center font-mono">
      <div className="flex items-center gap-2 text-sm sm:text-base md:text-lg font-bold text-amber-300 tracking-wide whitespace-nowrap">
        {fracMatch ? (
          <div className="flex items-center gap-1.5">
            {fracMatch[1] && <span>{fracMatch[1]}</span>}
            <span className="inline-flex flex-col items-center text-center px-1">
              <span className="border-b-2 border-amber-300/80 px-1.5 pb-0.5 text-xs sm:text-sm text-amber-200">
                {fracMatch[2].trim()}
              </span>
              <span className="pt-0.5 text-xs sm:text-sm text-amber-200">
                {fracMatch[3].trim()}
              </span>
            </span>
            {fracMatch[4] && <span>{fracMatch[4]}</span>}
          </div>
        ) : (
          <span>{eq}</span>
        )}
      </div>

      {sublabel && (
        <span className="text-[10px] sm:text-xs text-slate-400 font-sans mt-1 tracking-normal font-normal">
          {sublabel}
        </span>
      )}
    </div>
  );
};

export const TeacherWhiteboardModal: React.FC<TeacherWhiteboardModalProps> = ({
  session,
  isOpen,
  onClose,
  onAskTeacherPrompt,
  onUpdateSession,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [currentTool, setCurrentTool] = useState<"pen" | "highlighter" | "eraser">("pen");
  const [brushColor, setBrushColor] = useState("#2563eb");
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isTeacherAnimating, setIsTeacherAnimating] = useState(true);
  const [animationProgress, setAnimationProgress] = useState(0); // 0 to 1

  // Mobile detection & layout view mode
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<"canvas" | "flow">("canvas");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const drawingContextRef = useRef<CanvasRenderingContext2D | null>(null);

  // Detect mobile width
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      if (mobile && viewMode === "canvas") {
        // Automatically default mobile users to the clean responsive flow view so nothing clips
        setViewMode("flow");
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Sync active step when session changes
  useEffect(() => {
    if (session) {
      setActiveStepIdx(session.activeStepIndex || 0);
      setIsTeacherAnimating(true);
      setAnimationProgress(0);
    }
  }, [session?.id, session?.activeStepIndex]);

  const currentStep: WhiteboardLessonStep | undefined = session?.steps?.[activeStepIdx] || session?.steps?.[0];

  // Teacher animated drawing effect
  useEffect(() => {
    if (!isOpen) return;
    setIsTeacherAnimating(true);
    setAnimationProgress(0);

    const startTime = performance.now();
    const duration = 1500; // 1.5s drawing animation

    let animFrame: number;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const prog = Math.min(1, elapsed / duration);
      setAnimationProgress(prog);

      if (prog < 1) {
        animFrame = requestAnimationFrame(tick);
      } else {
        setIsTeacherAnimating(false);
      }
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [activeStepIdx, isOpen, currentStep?.title]);

  // Setup canvas resolution & resize
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = boardContainerRef.current;
    if (!canvas || !container || !isOpen) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        drawingContextRef.current = ctx;
      }
    };

    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(container);

    return () => ro.disconnect();
  }, [isOpen, isFullscreen, viewMode]);

  // Freehand drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !drawingContextRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const ctx = drawingContextRef.current;
    ctx.beginPath();
    ctx.moveTo(x, y);

    if (currentTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = brushSize * 4;
    } else if (currentTool === "highlighter") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = `${brushColor}55`;
      ctx.lineWidth = brushSize * 3;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
    }

    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawingContextRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const ctx = drawingContextRef.current;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing || !drawingContextRef.current) return;
    drawingContextRef.current.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = drawingContextRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleExportPNG = () => {
    const container = boardContainerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const exportCanvas = document.createElement("canvas");
    const dpr = 2;
    const w = container.clientWidth;
    const h = container.clientHeight;
    exportCanvas.width = w * dpr;
    exportCanvas.height = h * dpr;
    const expCtx = exportCanvas.getContext("2d");
    if (!expCtx) return;

    expCtx.scale(dpr, dpr);
    expCtx.fillStyle = "#ffffff";
    expCtx.fillRect(0, 0, w, h);

    expCtx.fillStyle = "#f8fafc";
    expCtx.fillRect(0, 0, w, 40);
    expCtx.fillStyle = "#0f172a";
    expCtx.font = "bold 14px sans-serif";
    expCtx.fillText(`Tune AI Whiteboard: ${session?.topic || "Lesson Notes"}`, 16, 25);

    expCtx.drawImage(canvas, 0, 0, w, h);

    const dataUrl = exportCanvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `tune_whiteboard_${(session?.topic || "lesson").replace(/\s+/g, "_").toLowerCase()}.png`;
    a.click();
  };

  if (!isOpen) return null;

  const totalSteps = session?.steps?.length || 1;

  // Render individual element according to its type
  const renderElementCard = (el: WhiteboardElement, idx: number, isFlowView = false) => {
    if (el.type === "formula") {
      return (
        <div
          key={el.id || idx}
          className="px-4 py-3 rounded-2xl bg-slate-950 text-white border-2 border-amber-500/50 shadow-xl flex items-center justify-center gap-3 backdrop-blur-md max-w-full"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-mono font-bold text-xs shrink-0">
            ƒ(x)
          </div>
          <div className="flex-1 min-w-0 overflow-x-auto py-0.5">
            <MathEquationRenderer formula={el.label} sublabel={el.sublabel} />
          </div>
        </div>
      );
    }

    if (el.type === "box") {
      return (
        <div
          key={el.id || idx}
          className="px-4 py-3 rounded-2xl border-2 shadow-lg backdrop-blur-md flex flex-col items-center justify-center text-center transition hover:scale-102"
          style={{
            borderColor: el.color || "#2563eb",
            backgroundColor: el.bgColor || "#eff6ff",
            color: el.color || "#1e40af",
            minWidth: isFlowView ? "100%" : "130px",
            maxWidth: isFlowView ? "100%" : "220px",
          }}
        >
          <span className="text-xs sm:text-sm font-extrabold tracking-tight">{el.label}</span>
          {el.sublabel && (
            <span className="text-[10px] sm:text-xs opacity-85 font-mono font-semibold mt-0.5">{el.sublabel}</span>
          )}
          {el.details && (
            <span className="text-[10px] opacity-90 mt-1 leading-snug font-sans bg-white/70 px-2 py-0.5 rounded-lg border border-black/5">
              {el.details}
            </span>
          )}
        </div>
      );
    }

    if (el.type === "circle") {
      return (
        <div
          key={el.id || idx}
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 shadow-lg flex flex-col items-center justify-center text-center p-2 transition hover:scale-102 backdrop-blur-md mx-auto"
          style={{
            borderColor: el.color || "#059669",
            backgroundColor: el.bgColor || "#ecfdf5",
            color: el.color || "#065f46",
          }}
        >
          <span className="text-xs font-extrabold leading-tight">{el.label}</span>
          {el.sublabel && (
            <span className="text-[9px] opacity-85 font-mono font-semibold mt-0.5">{el.sublabel}</span>
          )}
        </div>
      );
    }

    if (el.type === "arrow") {
      return (
        <div
          key={el.id || idx}
          className="flex items-center justify-center gap-1 font-mono text-xs font-bold text-slate-800 bg-white/95 px-2.5 py-1 rounded-xl shadow-md border border-slate-200 shrink-0"
        >
          <span className="text-[11px] font-semibold text-slate-700">{el.label || "Flow"}</span>
          <ArrowRight className="w-4 h-4 text-indigo-600 animate-pulse stroke-[2.5]" />
        </div>
      );
    }

    if (el.type === "code") {
      return (
        <div
          key={el.id || idx}
          className="bg-slate-950 text-emerald-300 font-mono text-xs p-3 rounded-2xl border border-slate-800 shadow-xl max-w-full overflow-x-auto"
        >
          <div className="text-[9px] text-slate-400 pb-1 border-b border-slate-800 mb-1 font-bold uppercase tracking-wider">
            {el.sublabel || "CODE SNIPPET"}
          </div>
          <code>{el.label}</code>
        </div>
      );
    }

    if (el.type === "badge") {
      return (
        <div
          key={el.id || idx}
          className="px-3.5 py-1.5 rounded-full text-xs font-extrabold font-mono shadow-md border-2 flex items-center justify-center gap-1.5 mx-auto"
          style={{
            borderColor: el.color || "#d97706",
            backgroundColor: el.bgColor || "#fef3c7",
            color: el.color || "#b45309",
          }}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>{el.label}</span>
        </div>
      );
    }

    // Default text card
    return (
      <div
        key={el.id || idx}
        className="bg-white/95 border-2 border-slate-200 rounded-2xl p-3 shadow-lg max-w-full"
      >
        <h4 className="text-xs font-extrabold text-slate-900">{el.label}</h4>
        {el.sublabel && (
          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{el.sublabel}</p>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div
        id="tune-teacher-whiteboard-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 md:p-4 bg-black/90 backdrop-blur-xl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className={`flex flex-col bg-[#12141a] border border-white/15 rounded-[32px] shadow-[0_20px_70px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-300 ${
            isFullscreen ? "w-full h-full rounded-none" : "w-full max-w-[96vw] lg:max-w-6xl xl:max-w-7xl h-[94vh] max-h-[960px]"
          }`}
        >
          {/* ========================================================= */}
          {/* 1. TOP HEADER & TEACHER STATUS BAR                        */}
          {/* ========================================================= */}
          <div className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 bg-[#181a22] border-b border-white/10 text-white shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shrink-0">
                <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
                    {session?.topic || "AI Teacher Interactive Whiteboard"}
                  </h2>
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono rounded-full font-bold flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-white/60 truncate max-w-[240px] sm:max-w-md">
                  {session?.conceptSummary || "Tune রিয়েল-টাইমে চিত্র ও ডায়াগ্রাম ড্র করে বুঝিয়ে দিচ্ছে"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Responsive Flow / Canvas Toggle for Phone vs Desktop */}
              <button
                type="button"
                onClick={() => setViewMode(prev => prev === "flow" ? "canvas" : "flow")}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-1 transition cursor-pointer border ${
                  viewMode === "flow"
                    ? "bg-purple-600 text-white border-purple-500 shadow-sm"
                    : "bg-white/5 hover:bg-white/10 text-white/70 border-white/10"
                }`}
                title={viewMode === "flow" ? "Switch to Freeform Canvas" : "Switch to Mobile Safe Flow View"}
              >
                {viewMode === "flow" ? <LayoutGrid className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{viewMode === "flow" ? "Flow View" : "Canvas"}</span>
              </button>

              <button
                id="whiteboard-replay-anim-btn"
                type="button"
                onClick={() => {
                  setIsTeacherAnimating(true);
                  setAnimationProgress(0);
                }}
                className="p-1.5 sm:px-2.5 sm:py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-xl text-xs font-mono flex items-center gap-1 transition cursor-pointer"
                title="Redraw"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Redraw</span>
              </button>

              <button
                id="whiteboard-export-btn"
                type="button"
                onClick={handleExportPNG}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-xl text-xs font-mono transition cursor-pointer"
                title="Export PNG"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>

              <button
                id="whiteboard-fullscreen-btn"
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 sm:p-2 hover:bg-white/10 text-white/60 hover:text-white rounded-xl transition cursor-pointer"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                id="whiteboard-close-btn"
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 hover:bg-red-500/20 text-white/60 hover:text-red-400 rounded-xl transition cursor-pointer"
                title="Close Whiteboard"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. LESSON STEP NAVIGATOR PILLS                            */}
          {/* ========================================================= */}
          {totalSteps > 1 && (
            <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-[#14161e] border-b border-white/5 overflow-x-auto scrollbar-thin shrink-0">
              <span className="text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Layers className="w-3 h-3 text-purple-400" /> Steps:
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                {(session?.steps || []).map((step, idx) => {
                  const isActive = idx === activeStepIdx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActiveStepIdx(idx);
                        if (session && onUpdateSession) {
                          onUpdateSession({ ...session, activeStepIndex: idx });
                        }
                      }}
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1 transition shrink-0 cursor-pointer ${
                        isActive
                          ? "bg-purple-600 text-white shadow-sm"
                          : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5"
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-black/30 flex items-center justify-center text-[9px] font-bold">
                        {idx + 1}
                      </span>
                      <span className="truncate max-w-[100px]">{step.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. MAIN WHITEBOARD SURFACE                                */}
          {/* ========================================================= */}
          {viewMode === "flow" ? (
            /* MOBILE-SAFE RESPONSIVE FLOW VIEW: 100% visible on any phone */
            <div className="flex-1 bg-white overflow-y-auto p-4 sm:p-6 select-none relative">
              <div className="max-w-2xl mx-auto flex flex-col gap-4">
                {/* Step Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-[11px] font-mono font-bold">
                      Step {currentStep?.stepNumber || activeStepIdx + 1}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-800">
                      {currentStep?.title}
                    </h3>
                  </div>
                </div>

                {/* Elements Flow Container */}
                <div className="flex flex-col gap-3 py-1">
                  {(currentStep?.elements || []).map((el, i) => (
                    <motion.div
                      key={el.id || i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.08 }}
                    >
                      {renderElementCard(el, i, true)}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* 2D CANVAS VIEW (With Responsive Scaling Safe-Zones) */
            <div
              ref={boardContainerRef}
              className="flex-1 relative bg-white overflow-hidden select-none cursor-crosshair"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #cbd5e1 1.2px, transparent 1.2px)",
                backgroundSize: "24px 24px",
              }}
            >
              {/* Visual Diagram Overlay Layer */}
              <div className="absolute inset-0 pointer-events-none p-4 sm:p-6 md:p-8">
                {currentStep ? (
                  <div className="w-full h-full relative">
                    {/* Step Title */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-[11px] font-mono font-bold">
                          Step {currentStep.stepNumber || activeStepIdx + 1}
                        </span>
                        <h3 className="text-xs sm:text-base font-bold text-slate-800 tracking-tight">
                          {currentStep.title}
                        </h3>
                      </div>
                      {isTeacherAnimating && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-mono rounded-full animate-pulse">
                          <PenTool className="w-3 h-3 text-indigo-600" />
                          <span>Teacher Drawing...</span>
                        </div>
                      )}
                    </div>

                    {/* Render Whiteboard Visual Elements */}
                    {(currentStep.elements || []).map((el, i) => {
                      const elProgressThreshold = (i + 1) / ((currentStep.elements?.length || 1) + 1);
                      const isVisible = animationProgress >= elProgressThreshold * 0.7;

                      // Clamp coordinates strictly within 12% to 88% so nothing overflows screen
                      const safeX = Math.max(12, Math.min(88, el.x));
                      const safeY = Math.max(15, Math.min(85, el.y));

                      return (
                        <motion.div
                          key={el.id || i}
                          initial={{ opacity: 0, scale: 0.88, y: 10 }}
                          animate={{
                            opacity: isVisible ? 1 : 0,
                            scale: isVisible ? 1 : 0.88,
                            y: isVisible ? 0 : 10,
                          }}
                          transition={{ duration: 0.35, ease: "easeOut" }}
                          style={{
                            left: `${safeX}%`,
                            top: `${safeY}%`,
                            transform: "translate(-50%, -50%)",
                          }}
                          className="absolute pointer-events-auto max-w-[85vw] sm:max-w-md"
                        >
                          {renderElementCard(el, i, false)}
                        </motion.div>
                      );
                    })}

                    {/* Moving Marker Cursor while Teacher is drawing */}
                    {isTeacherAnimating && (
                      <motion.div
                        animate={{
                          x: [40, 160, 280, 180, 360],
                          y: [80, 140, 110, 220, 170],
                        }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        className="absolute z-20 pointer-events-none flex items-center gap-1"
                      >
                        <div className="p-1 bg-indigo-600 text-white rounded-full shadow-md">
                          <PenTool className="w-3 h-3" />
                        </div>
                        <span className="px-1.5 py-0.2 bg-indigo-900/90 text-white text-[8px] font-mono rounded shadow font-bold">
                          Tune Drawing
                        </span>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <GraduationCap className="w-10 h-10 mb-2 opacity-40 text-purple-500" />
                    <p className="text-xs font-medium">হোয়াইটবোর্ড তৈরি হচ্ছে...</p>
                  </div>
                )}
              </div>

              {/* Freehand Canvas Layer */}
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="absolute inset-0 w-full h-full z-10 touch-none"
              />
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. TEACHER SPOKEN EXPLANATION BANNER                      */}
          {/* ========================================================= */}
          <div className="bg-[#14161e] px-3.5 sm:px-4 py-2.5 border-t border-white/10 shrink-0 space-y-2">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0 mt-0.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-mono font-bold text-purple-300 uppercase tracking-wider block">
                    Teacher Tune Explanation:
                  </span>
                  <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-sans mt-0.5 line-clamp-2 sm:line-clamp-none">
                    {currentStep?.explanation ||
                      "হোয়াইটবোর্ডে স্টেপগুলো দেখুন। যেকোনো প্রশ্ন থাকলে বলুন, আমি আরও সহজভাবে এঁকে বুঝিয়ে দেব।"}
                  </p>
                </div>
              </div>

              {/* Step Prev / Next Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={activeStepIdx <= 0}
                  onClick={() => {
                    const prev = Math.max(0, activeStepIdx - 1);
                    setActiveStepIdx(prev);
                    if (session && onUpdateSession) onUpdateSession({ ...session, activeStepIndex: prev });
                  }}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-white transition cursor-pointer border border-white/10"
                  title="Previous Step"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono text-white/60 px-1">
                  {activeStepIdx + 1}/{totalSteps}
                </span>
                <button
                  type="button"
                  disabled={activeStepIdx >= totalSteps - 1}
                  onClick={() => {
                    const next = Math.min(totalSteps - 1, activeStepIdx + 1);
                    setActiveStepIdx(next);
                    if (session && onUpdateSession) onUpdateSession({ ...session, activeStepIndex: next });
                  }}
                  className="p-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:pointer-events-none text-white transition cursor-pointer shadow-sm"
                  title="Next Step"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Clarification Prompts */}
            <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-white/5">
              <span className="text-[9px] font-mono text-white/40 uppercase">Ask Tune:</span>
              {[
                { label: "💡 বুঝি নাই, সহজ করো", prompt: "Ami bujhi nai, arektu shohoj bhabe diagram draw kore bujhiye dao" },
                { label: "📐 পরবর্তী স্টেপ আঁকো", prompt: "Next step e ki hobe whiteboard e draw kore bujhao" },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onAskTeacherPrompt?.(chip.prompt)}
                  className="px-2 py-0.5 bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/40 rounded-lg text-[10px] text-white/80 hover:text-white transition cursor-pointer font-sans"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* ========================================================= */}
          {/* 5. USER DRAWING TOOLBAR AT BOTTOM                        */}
          {/* ========================================================= */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 sm:px-4 py-2 bg-[#12141a] border-t border-white/10 text-white shrink-0">
            {/* Tool Selection */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentTool("pen")}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-medium flex items-center gap-1 transition cursor-pointer ${
                  currentTool === "pen"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "hover:bg-white/10 text-white/70"
                }`}
              >
                <PenTool className="w-3 h-3" />
                <span>Pen</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentTool("highlighter")}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-medium flex items-center gap-1 transition cursor-pointer ${
                  currentTool === "highlighter"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "hover:bg-white/10 text-white/70"
                }`}
              >
                <Highlighter className="w-3 h-3" />
                <span className="hidden sm:inline">Highlighter</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentTool("eraser")}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-medium flex items-center gap-1 transition cursor-pointer ${
                  currentTool === "eraser"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "hover:bg-white/10 text-white/70"
                }`}
              >
                <Eraser className="w-3 h-3" />
                <span className="hidden sm:inline">Eraser</span>
              </button>

              <button
                type="button"
                onClick={clearCanvas}
                className="p-1.5 hover:bg-red-500/20 text-white/50 hover:text-red-400 rounded-xl transition cursor-pointer ml-1"
                title="Clear Freehand Drawing"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Colors */}
            <div className="flex items-center gap-1.5">
              {COLOR_PALETTE.slice(0, 5).map((c) => {
                const isSelected = brushColor === c.value && currentTool !== "eraser";
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => {
                      setBrushColor(c.value);
                      if (currentTool === "eraser") setCurrentTool("pen");
                    }}
                    className={`w-5 h-5 rounded-full border-2 transition cursor-pointer ${
                      isSelected ? "scale-115 border-white shadow-sm ring-1 ring-purple-500" : "border-transparent opacity-80"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TeacherWhiteboardModal;
