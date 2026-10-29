import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  Brain,
  CheckCircle,
  Plus,
  Trash2,
  Sliders,
  Check,
  TrendingUp,
  Target
} from "lucide-react";

interface MistakeSnippet {
  id: string;
  mistake: string;
  timesDetected: number;
  advice: string;
  status: "active" | "improved";
}

interface FocusSnippet {
  id: string;
  title: string;
  details: string;
  completed: boolean;
}

interface MistakeFocusBoardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MistakeFocusBoard({ isOpen, onClose }: MistakeFocusBoardProps) {
  const [mistakes, setMistakes] = useState<MistakeSnippet[]>([]);
  const [focusList, setFocusList] = useState<FocusSnippet[]>([]);
  
  const [newMistake, setNewMistake] = useState("");
  const [newMistakeAdvice, setNewMistakeAdvice] = useState("");
  const [newFocusTitle, setNewFocusTitle] = useState("");

  // Seed default data if none exists in localStorage
  useEffect(() => {
    if (isOpen) {
      const savedMistakes = localStorage.getItem("tune_repeated_mistakes");
      const savedFocus = localStorage.getItem("tune_focus_areas");

      if (savedMistakes) {
        try {
          const parsed = JSON.parse(savedMistakes);
          setMistakes(Array.isArray(parsed) ? parsed : []);
        } catch {
          setMistakes([]);
        }
      } else {
        const initialMistakes: MistakeSnippet[] = [
          { id: "m1", mistake: "Forgetting API Key checks", timesDetected: 3, advice: "Always lazy-load API keys server-side and throw clear warnings instead of crashing on module load.", status: "active" },
          { id: "m2", mistake: "Direct state mutation inside React render", timesDetected: 2, advice: "Utilize set state callbacks or useEffect primitive triggers rather than direct body execution.", status: "active" },
          { id: "m3", mistake: "Using absolute paths in workspace command execution", timesDetected: 1, advice: "Prefer using relative paths from workspace root or setting correct Cwd workspace parameter.", status: "improved" }
        ];
        setMistakes(initialMistakes);
        localStorage.setItem("tune_repeated_mistakes", JSON.stringify(initialMistakes));
      }

      if (savedFocus) {
        try {
          const parsed = JSON.parse(savedFocus);
          setFocusList(Array.isArray(parsed) ? parsed : []);
        } catch {
          setFocusList([]);
        }
      } else {
        const initialFocus: FocusSnippet[] = [
          { id: "f1", title: "Master React useEffect primitive dependency arrays", details: "Deep-dive into reducing array objects or functions that trigger infinite loops.", completed: false },
          { id: "f2", title: "Refining full-stack client-server websocket relays", details: "Inspecting payload types, chunk sizes and live transcripts subtitling.", completed: true },
          { id: "f3", title: "Strict human voice-acting performance parsing", details: "Integrating natural ellipses, breathing, and Bengali endearment context.", completed: false }
        ];
        setFocusList(initialFocus);
        localStorage.setItem("tune_focus_areas", JSON.stringify(initialFocus));
      }
    }
  }, [isOpen]);

  const handleAddMistake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMistake.trim()) return;

    const added: MistakeSnippet = {
      id: Math.random().toString(36).substring(2, 9),
      mistake: newMistake.trim(),
      timesDetected: 1,
      advice: newMistakeAdvice.trim() || "Stay calm, review syntax step-by-step, and request Tune to diagnose.",
      status: "active"
    };

    const updated = [added, ...mistakes];
    setMistakes(updated);
    localStorage.setItem("tune_repeated_mistakes", JSON.stringify(updated));
    setNewMistake("");
    setNewMistakeAdvice("");
  };

  const handleAddFocus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFocusTitle.trim()) return;

    const added: FocusSnippet = {
      id: Math.random().toString(36).substring(2, 9),
      title: newFocusTitle.trim(),
      details: "Focus target set by user companion. Track progress with Tune.",
      completed: false
    };

    const updated = [added, ...focusList];
    setFocusList(updated);
    localStorage.setItem("tune_focus_areas", JSON.stringify(updated));
    setNewFocusTitle("");
  };

  const incrementMistakeCount = (id: string) => {
    const updated = mistakes.map((m) => {
      if (m.id === id) {
        return { ...m, timesDetected: m.timesDetected + 1 };
      }
      return m;
    });
    setMistakes(updated);
    localStorage.setItem("tune_repeated_mistakes", JSON.stringify(updated));
  };

  const toggleMistakeStatus = (id: string) => {
    const updated = mistakes.map((m) => {
      if (m.id === id) {
        return { ...m, status: m.status === "active" ? ("improved" as const) : ("active" as const) };
      }
      return m;
    });
    setMistakes(updated);
    localStorage.setItem("tune_repeated_mistakes", JSON.stringify(updated));
  };

  const toggleFocusCompleted = (id: string) => {
    const updated = focusList.map((f) => {
      if (f.id === id) {
        return { ...f, completed: !f.completed };
      }
      return f;
    });
    setFocusList(updated);
    localStorage.setItem("tune_focus_areas", JSON.stringify(updated));
  };

  const handleDeleteMistake = (id: string) => {
    const updated = (mistakes || []).filter((m) => m && m.id !== id);
    setMistakes(updated);
    localStorage.setItem("tune_repeated_mistakes", JSON.stringify(updated));
  };

  const handleDeleteFocus = (id: string) => {
    const updated = (focusList || []).filter((f) => f && f.id !== id);
    setFocusList(updated);
    localStorage.setItem("tune_focus_areas", JSON.stringify(updated));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-45 flex items-center justify-center p-3 md:p-6 select-text">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-5xl h-[85vh] bg-[#0c0c12]/95 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col font-sans"
      >
        {/* HEADER */}
        <div className="px-5 py-4 bg-[#14141e] border-b border-white/5 flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-600 flex items-center justify-center text-zinc-950 shadow-lg">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wider text-white">REPEATED MISTAKES & CRITICAL FOCUS BOARD</h2>
              <p className="text-[10px] text-white/40 font-mono">TUNE COMPANION COGNITIVE HABIT TRACKER</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition cursor-pointer border border-white/5"
          >
            Close
          </button>
        </div>

        {/* CONTAINER */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-[#08080c]">
          
          {/* LEFT SIDE: COGNITIVE HABITS / REPEATED MISTAKES */}
          <div className="flex-1 border-r border-white/5 p-5 md:p-6 flex flex-col gap-6 overflow-y-auto">
            <div className="flex justify-between items-center select-none">
              <h3 className="text-xs font-bold font-mono tracking-wider text-yellow-400 uppercase flex items-center gap-1.5">
                <AlertTriangle className="w-4.5 h-4.5" /> Habit Tracker: Checked Repeated Errors
              </h3>
              <span className="text-[8px] font-mono px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded-full border border-yellow-500/20 uppercase tracking-wider">ACTIVE COACHING</span>
            </div>

            {/* List of Repeated Mistakes */}
            <div className="space-y-3">
              {mistakes.map((m) => (
                <div
                  key={m.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    m.status === "improved" ? "border-green-500/15 bg-green-500/2" : "border-yellow-500/15 bg-yellow-500/2"
                  }`}
                >
                  <div className="flex justify-between items-start select-none">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${m.status === "improved" ? "bg-green-400" : "bg-yellow-500 animate-pulse"}`} />
                      <h4 className="text-xs font-bold text-white/95">{m.mistake}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-mono px-2 py-0.5 bg-white/5 text-white/60 rounded-full">
                        Detected: {m.timesDetected}x
                      </span>
                      <button
                        onClick={() => incrementMistakeCount(m.id)}
                        className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded text-[8px] font-mono transition cursor-pointer"
                        title="Increment count"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => toggleMistakeStatus(m.id)}
                        className={`px-2 py-0.5 text-[8px] font-mono rounded cursor-pointer transition ${
                          m.status === "improved" ? "bg-green-500 text-zinc-950 font-bold" : "bg-white/5 text-white/60 hover:text-white"
                        }`}
                      >
                        {m.status === "improved" ? "Improved" : "Mark Improved"}
                      </button>
                      <button
                        onClick={() => handleDeleteMistake(m.id)}
                        className="p-1 hover:bg-red-500/10 text-white/20 hover:text-red-400 rounded transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-white/60 leading-relaxed mt-2.5 bg-black/40 p-2.5 rounded-xl border border-white/5 font-mono select-text">
                    <strong className="text-yellow-400">Tune's Advice:</strong> {m.advice}
                  </p>
                </div>
              ))}
            </div>

            {/* Form to add custom mistake */}
            <form onSubmit={handleAddMistake} className="bg-white/3 border border-white/5 p-4 rounded-2xl select-none">
              <span className="text-[10px] font-mono font-bold tracking-wider text-white/40 uppercase block mb-3">Add Custom Mistake to Track</span>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="E.g., Missing dependency array in React useEffect"
                  value={newMistake}
                  onChange={(e) => setNewMistake(e.target.value)}
                  className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white/90 outline-none focus:border-yellow-500/40"
                />
                <input
                  type="text"
                  placeholder="E.g., Advice: Add primitive trigger variables or move functions outside..."
                  value={newMistakeAdvice}
                  onChange={(e) => setNewMistakeAdvice(e.target.value)}
                  className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white/90 outline-none focus:border-yellow-500/40"
                />
                <button
                  type="submit"
                  className="py-2 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Register Habit
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT SIDE: CRITICAL FOCUS AREAS */}
          <div className="w-full lg:w-[380px] bg-[#0a0a0f] p-5 md:p-6 flex flex-col gap-5 overflow-y-auto">
            <div className="flex justify-between items-center select-none border-b border-white/5 pb-2.5">
              <h3 className="text-xs font-bold font-mono tracking-wider text-cyan-400 uppercase flex items-center gap-1.5">
                <Target className="w-4.5 h-4.5" /> Critical Focus Targets
              </h3>
              <Target className="w-4 h-4 text-cyan-400" />
            </div>

            {/* List of Focus Areas */}
            <div className="space-y-3">
              {focusList.map((f) => (
                <div
                  key={f.id}
                  className={`p-3.5 rounded-2xl border transition ${
                    f.completed ? "border-green-500/15 bg-green-500/2 opacity-60" : "border-cyan-500/15 bg-cyan-500/2"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2.5 select-none">
                    <button
                      onClick={() => toggleFocusCompleted(f.id)}
                      className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition cursor-pointer ${
                        f.completed ? "bg-green-500 border-green-500 text-zinc-950" : "border-white/20 hover:border-cyan-400/50"
                      }`}
                    >
                      {f.completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <h4 className={`text-xs font-bold leading-tight ${f.completed ? "line-through text-white/30" : "text-white/90"}`}>
                        {f.title}
                      </h4>
                      <p className="text-[10px] text-white/40 mt-1">{f.details}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteFocus(f.id)}
                      className="text-white/20 hover:text-red-400 p-0.5 rounded transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Form to add custom focus target */}
            <form onSubmit={handleAddFocus} className="bg-white/3 border border-white/5 p-3.5 rounded-2xl select-none">
              <span className="text-[10px] font-mono font-bold tracking-wider text-white/40 uppercase block mb-2.5">Define New Focus Target</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="E.g., Complete room local db setup"
                  value={newFocusTitle}
                  onChange={(e) => setNewFocusTitle(e.target.value)}
                  className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white/95 outline-none focus:border-cyan-500/40"
                />
                <button
                  type="submit"
                  className="px-3 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold rounded-xl transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="p-4 bg-white/2 border border-white/5 rounded-2xl font-mono text-[9px] text-zinc-500 leading-normal select-all">
              <Brain className="w-4.5 h-4.5 text-purple-400 mb-2" />
              <p className="font-bold text-white/40">COMPANION COGNITIVE ARCHITECT</p>
              <p className="mt-1">
                Tune Companion leverages these metrics to understand what features and frameworks you use the most. By analyzing these habits, she provides contextual proactive guidance during your voice orbit.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
