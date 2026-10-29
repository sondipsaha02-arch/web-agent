import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Target,
  Clock,
  Plus,
  ExternalLink,
  Bell,
  BellOff,
  VolumeX,
  X,
  BookOpen,
  RefreshCw,
  Check,
  Trash2,
  Bot
} from "lucide-react";
import { soundEngine } from "../utils/soundEngine";

export interface PAMaterial {
  title: string;
  type: string;
  url: string;
  description: string;
  estHours: string;
}

export interface PASyllabusDay {
  dayNumber: number;
  dayTitle: string;
  topics: string[];
}

export interface PATodo {
  id: string;
  dayNumber: number;
  time: string; // e.g. "09:00 AM" or "30 sec" or "21:30"
  title: string;
  topic: string;
  materialUrl?: string;
  alarmEnabled: boolean;
  completed: boolean;
  isMissed?: boolean;
  triggerAtTimestamp?: number; // epoch timestamp in ms for exact alarms
}

export interface PAPlanData {
  goalTitle: string;
  durationDays: number;
  hoursPerDay: number;
  level: string;
  summary: string;
  materials: PAMaterial[];
  syllabus: PASyllabusDay[];
  dailyTodos: PATodo[];
  createdAt: string;
}

interface IntelligentPAManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntelligentPAManager: React.FC<IntelligentPAManagerProps> = ({ isOpen, onClose }) => {
  // Wizard intake state
  const [goalInput, setGoalInput] = useState("");
  const [daysInput, setDaysInput] = useState(14);
  const [hoursInput, setHoursInput] = useState(2);
  const [levelInput, setLevelInput] = useState("Beginner to Intermediate");
  const [morningTime, setMorningTime] = useState("09:00 AM");

  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"todos" | "materials" | "syllabus" | "settings">("todos");
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [isPlanningModeActive, setIsPlanningModeActive] = useState(false);

  // Asking Mode (Silent Listener) state synced with localStorage and event bus
  const [isAskingMode, setIsAskingMode] = useState<boolean>(() => {
    return typeof localStorage !== "undefined" ? localStorage.getItem("tune_asking_mode") === "true" : false;
  });

  // Active Plan State
  const [plan, setPlan] = useState<PAPlanData | null>(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem("intelligent_pa_plan") : null;
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading PA plan:", e);
      }
    }
    return null;
  });

  // Active Ringing Alarm state
  const [activeAlarmTodo, setActiveAlarmTodo] = useState<PATodo | null>(null);
  const [triggeredAlarmIds, setTriggeredAlarmIds] = useState<Set<string>>(new Set());

  // Manual Todo Add Modal
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoTopic, setNewTodoTopic] = useState("");
  const [newTodoTime, setNewTodoTime] = useState("10:00 AM");
  const [newTodoUrl, setNewTodoUrl] = useState("");

  // Save plan to localStorage on update
  useEffect(() => {
    if (plan) {
      localStorage.setItem("intelligent_pa_plan", JSON.stringify(plan));
    }
  }, [plan]);

  // Keyboard shortcut: ESC to close PA Panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle Asking Mode Toggle
  const handleToggleAskingMode = () => {
    const next = !isAskingMode;
    setIsAskingMode(next);
    localStorage.setItem("tune_asking_mode", String(next));
    window.dispatchEvent(new CustomEvent("pa_asking_mode_changed", { detail: { askingMode: next } }));
    soundEngine.playNotificationChime();
  };

  // Handle Planning Mode Toggle
  const handleTogglePlanningMode = () => {
    const next = !isPlanningModeActive;
    setIsPlanningModeActive(next);
    soundEngine.playNotificationChime();
    if (next && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pa_trigger_planning_voice"));
    }
  };

  // Listen for global custom alarm trigger events and live WebSocket plan updates
  useEffect(() => {
    const handleGlobalAlarm = (e: any) => {
      if (e.detail) {
        const todoDetail: PATodo = {
          id: e.detail.id || `alarm_${Date.now()}`,
          dayNumber: e.detail.dayNumber || 1,
          time: e.detail.time || "Now",
          title: e.detail.title || "⏰ Scheduled Alarm",
          topic: e.detail.topic || "Time for your scheduled task!",
          alarmEnabled: true,
          completed: false
        };
        triggerAlarm(todoDetail);
      }
    };

    const handlePlanUpdated = (e: any) => {
      if (e.detail) {
        setPlan(e.detail);
        soundEngine.playNotificationChime();
      }
    };

    window.addEventListener("pa_trigger_alarm", handleGlobalAlarm);
    window.addEventListener("pa_plan_updated", handlePlanUpdated);

    return () => {
      window.removeEventListener("pa_trigger_alarm", handleGlobalAlarm);
      window.removeEventListener("pa_plan_updated", handlePlanUpdated);
    };
  }, []);

  // Real-time Alarm Ticker: Checks every 1 second (1000ms) for exact alarms
  useEffect(() => {
    const interval = setInterval(() => {
      if (!plan || !plan.dailyTodos) return;

      const now = new Date();
      const currentMs = now.getTime();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      
      const ampm = currentHours >= 12 ? "PM" : "AM";
      const h12 = currentHours % 12 || 12;
      const formattedHours = h12 < 10 ? `0${h12}` : `${h12}`;
      const formattedMinutes = currentMinutes < 10 ? `0${currentMinutes}` : `${currentMinutes}`;
      const currentTimeStr = `${formattedHours}:${formattedMinutes} ${ampm}`;

      plan.dailyTodos.forEach((todo) => {
        if (
          todo.alarmEnabled &&
          !todo.completed &&
          !triggeredAlarmIds.has(todo.id)
        ) {
          if (todo.triggerAtTimestamp && currentMs >= todo.triggerAtTimestamp) {
            triggerAlarm(todo);
            return;
          }

          const normalizedTodoTime = todo.time.trim().toUpperCase();
          if (normalizedTodoTime === currentTimeStr) {
            triggerAlarm(todo);
          }
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [plan, triggeredAlarmIds]);

  const triggerAlarm = (todo: PATodo) => {
    setTriggeredAlarmIds((prev) => new Set(prev).add(todo.id));
    setActiveAlarmTodo(todo);

    soundEngine.playAlarmRingtone();

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(`⏰ PA Reminder: ${todo.title}`, {
        body: `${todo.topic} (Scheduled for ${todo.time})`,
        icon: "/favicon.ico"
      });
    }
  };

  const handleSnoozeAlarm = (minutes: number) => {
    soundEngine.stopAlarmRingtone();
    setActiveAlarmTodo(null);

    if (activeAlarmTodo && plan) {
      const now = new Date();
      const snoozeMs = minutes * 60 * 1000;
      const futureDate = new Date(now.getTime() + snoozeMs);
      const hours = futureDate.getHours();
      const mins = futureDate.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      const h12 = hours % 12 || 12;
      const newTimeStr = `${h12 < 10 ? "0" + h12 : h12}:${mins < 10 ? "0" + mins : mins} ${ampm}`;

      const updatedTodos = plan.dailyTodos.map((t) => {
        if (t.id === activeAlarmTodo.id) {
          return {
            ...t,
            time: newTimeStr,
            triggerAtTimestamp: now.getTime() + snoozeMs,
            alarmEnabled: true,
            completed: false
          };
        }
        return t;
      });

      setPlan({ ...plan, dailyTodos: updatedTodos });
      soundEngine.playNotificationChime();
    }
  };

  const handleDismissAlarm = () => {
    soundEngine.stopAlarmRingtone();
    if (activeAlarmTodo && plan) {
      const updatedTodos = plan.dailyTodos.map((t) => {
        if (t.id === activeAlarmTodo.id) {
          return { ...t, completed: true };
        }
        return t;
      });
      setPlan({ ...plan, dailyTodos: updatedTodos });
    }
    setActiveAlarmTodo(null);
  };

  // Generate Plan
  const handleGeneratePlan = async () => {
    if (!goalInput.trim()) return;
    setIsGenerating(true);
    soundEngine.playNotificationChime();

    try {
      const materials: PAMaterial[] = [
        {
          title: `Official Documentation & Roadmap for ${goalInput}`,
          type: "Official Docs",
          url: `https://roadmap.sh/search?q=${encodeURIComponent(goalInput)}`,
          description: "Step-by-step developer roadmap, cheat sheets, and best practice guides.",
          estHours: `${Math.round(daysInput * 0.5)} hrs`
        },
        {
          title: `Masterclass Video Tutorials: ${goalInput}`,
          type: "Video Course",
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(goalInput + " tutorial course")}`,
          description: "Comprehensive video course and step-by-step practical implementation.",
          estHours: `${Math.round(daysInput * 1.5)} hrs`
        }
      ];

      const syllabus: PASyllabusDay[] = Array.from({ length: Math.min(daysInput, 30) }, (_, i) => ({
        dayNumber: i + 1,
        dayTitle: `Day ${i + 1}: ${goalInput} Fundamentals & Core Practices`,
        topics: [
          `Key concepts and structural mechanics for Day ${i + 1}`,
          `Practical hands-on exercises and project building`
        ]
      }));

      const dailyTodos: PATodo[] = Array.from({ length: Math.min(daysInput, 30) }, (_, i) => ({
        id: `todo_gen_${Date.now()}_${i + 1}`,
        dayNumber: i + 1,
        time: morningTime || "09:00 AM",
        title: `Day ${i + 1} Session: ${goalInput}`,
        topic: `Study core concepts for Day ${i + 1} and complete exercises.`,
        materialUrl: materials[0].url,
        alarmEnabled: true,
        completed: false
      }));

      const newPlan: PAPlanData = {
        goalTitle: goalInput,
        durationDays: daysInput,
        hoursPerDay: hoursInput,
        level: levelInput,
        summary: `Strategic PA learning syllabus and daily todo schedule for Boss on ${goalInput}.`,
        materials,
        syllabus,
        dailyTodos,
        createdAt: new Date().toISOString()
      };

      setPlan(newPlan);
      setSelectedDay(1);
      setActiveTab("todos");
    } catch (e) {
      console.error("Error generating PA plan:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle Todo completion
  const handleToggleTodo = (id: string) => {
    if (!plan) return;
    const updated = plan.dailyTodos.map((t) => {
      if (t.id === id) {
        return { ...t, completed: !t.completed };
      }
      return t;
    });
    setPlan({ ...plan, dailyTodos: updated });
    soundEngine.playNotificationChime();
  };

  // Toggle Alarm for Todo
  const handleToggleAlarm = (id: string) => {
    if (!plan) return;
    const updated = plan.dailyTodos.map((t) => {
      if (t.id === id) {
        return { ...t, alarmEnabled: !t.alarmEnabled };
      }
      return t;
    });
    setPlan({ ...plan, dailyTodos: updated });
    soundEngine.playNotificationChime();
  };

  // Add Manual Todo
  const handleAddManualTodo = () => {
    if (!newTodoTitle.trim() || !plan) return;

    const newTodo: PATodo = {
      id: `manual_${Date.now()}`,
      dayNumber: selectedDay,
      time: newTodoTime || "10:00 AM",
      title: newTodoTitle,
      topic: newTodoTopic || "Custom task added by Boss",
      materialUrl: newTodoUrl || undefined,
      alarmEnabled: true,
      completed: false
    };

    setPlan({
      ...plan,
      dailyTodos: [newTodo, ...plan.dailyTodos]
    });

    setNewTodoTitle("");
    setNewTodoTopic("");
    setNewTodoUrl("");
    setShowAddTodo(false);
    soundEngine.playNotificationChime();
  };

  // Delete Todo
  const handleDeleteTodo = (id: string) => {
    if (!plan || !Array.isArray(plan.dailyTodos)) return;
    setPlan({
      ...plan,
      dailyTodos: plan.dailyTodos.filter((t) => t.id !== id)
    });
  };

  if (!isOpen) return null;

  const safeDailyTodos = plan && Array.isArray(plan.dailyTodos) ? plan.dailyTodos : [];
  const filteredTodos = safeDailyTodos.filter((t) => t.dayNumber === selectedDay);
  const completedCount = safeDailyTodos.filter((t) => t.completed).length;
  const totalCount = safeDailyTodos.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="relative w-full max-w-3xl max-h-[90vh] sm:max-h-[85vh] bg-zinc-950 border border-zinc-800/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 font-sans"
      >
        {/* --- TOP COMPACT HEADER --- */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-zinc-900/80 border-b border-zinc-800/80">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide truncate">
                  {plan ? plan.goalTitle : "Intelligent PA & Goal Coach"}
                </h2>
                <span className="shrink-0 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                  PA Coach
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {plan && (
              <button
                type="button"
                onClick={() => setPlan(null)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/50 transition flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Goal</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 hover:text-rose-100 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-sm"
              title="Close PA Panel (ESC)"
            >
              <X className="w-4 h-4" />
              <span>Close Panel</span>
            </button>
          </div>
        </div>

        {/* --- MODE CONTROLS STRIP (Planning Mode & Asking Mode) --- */}
        <div className="px-4 sm:px-6 py-2.5 bg-zinc-900/40 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            {/* Planning Mode Toggle */}
            <button
              type="button"
              onClick={handleTogglePlanningMode}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                isPlanningModeActive
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm shadow-emerald-500/20 animate-pulse"
                  : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20"
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isPlanningModeActive ? "🎙️ Voice Planning Mode Active" : "🎙️ Planning Mode"}</span>
            </button>

            {/* Asking Mode (Voice Answers On Demand) Toggle */}
            <button
              type="button"
              onClick={handleToggleAskingMode}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                isAskingMode
                  ? "bg-purple-500/20 border-purple-400 text-purple-300 shadow-sm shadow-purple-500/20 animate-pulse"
                  : "bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              <VolumeX className="w-3.5 h-3.5 text-purple-400" />
              <span>{isAskingMode ? "💬 Asking Mode (ON)" : "💬 Asking Mode"}</span>
            </button>
          </div>

          {isAskingMode && (
            <div className="text-[11px] text-purple-300/80 font-mono flex items-center gap-1 bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-500/20">
              <span>💡 Tune answers your questions out loud with voice, and stays silent during idle time</span>
            </div>
          )}
        </div>

        {/* --- GOAL PROGRESS TRACKER --- */}
        {plan && (
          <div className="px-4 sm:px-6 py-3 bg-zinc-950 border-b border-zinc-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-zinc-200">
                  Goal Progress: <span className="text-cyan-400 font-bold">{progressPct}%</span>
                </span>
              </div>
              <div className="flex items-center space-x-2 text-zinc-400 text-[11px]">
                <span>{completedCount} / {totalCount} Tasks Done</span>
                <span>• {plan.durationDays} Days Goal</span>
              </div>
            </div>
            <div className="w-full bg-zinc-800/80 h-2.5 rounded-full overflow-hidden p-0.5 border border-zinc-700/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 rounded-full shadow-sm shadow-cyan-500/50"
              />
            </div>
          </div>
        )}

        {/* --- CONTENT BODY --- */}
        {!plan ? (
          /* INTAKE FORM / WIZARD */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center max-w-lg mx-auto w-full custom-scrollbar">
            <div className="w-full space-y-5 text-left">
              <div className="text-center space-y-1.5">
                <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-1">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white">Tell Your PA Your Goal, Boss!</h3>
                <p className="text-xs text-zinc-400">
                  Enter your goal and Tune will generate a daily syllabus, research materials, and alarm tasks.
                </p>
              </div>

              {/* Goal Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Target Goal / Skill Name</label>
                <input
                  type="text"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="e.g. Master Full Stack Web Dev, Learn Python AI, IELTS Band 8..."
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              {/* Duration & Commitment */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Duration (Days)</label>
                  <select
                    value={daysInput}
                    onChange={(e) => setDaysInput(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value={7}>7 Days (1 Wk Sprint)</option>
                    <option value={14}>14 Days (2 Wks Bootcamp)</option>
                    <option value={30}>30 Days (1 Month Mastery)</option>
                    <option value={60}>60 Days (2 Months Deep)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Daily Hours</label>
                  <select
                    value={hoursInput}
                    onChange={(e) => setHoursInput(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value={1}>1 Hour / Day</option>
                    <option value={2}>2 Hours / Day</option>
                    <option value={3}>3 Hours / Day</option>
                    <option value={4}>4+ Hours / Day</option>
                  </select>
                </div>
              </div>

              {/* Level & Alarm Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Skill Level</label>
                  <select
                    value={levelInput}
                    onChange={(e) => setLevelInput(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Complete Beginner">Beginner</option>
                    <option value="Beginner to Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Alarm Time</label>
                  <input
                    type="text"
                    value={morningTime}
                    onChange={(e) => setMorningTime(e.target.value)}
                    placeholder="09:00 AM"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleGeneratePlan}
                disabled={isGenerating || !goalInput.trim()}
                className="w-full py-3 px-4 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition flex items-center justify-center space-x-2 text-xs cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating Plan & Alarms...</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4" />
                    <span>Create Goal Plan & Alarms</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ACTIVE DASHBOARD */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* TABS HEADER */}
            <div className="flex items-center space-x-2 border-b border-zinc-800/80 px-4 sm:px-6 bg-zinc-900/40 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("todos")}
                className={`py-3 font-semibold border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === "todos"
                    ? "border-cyan-400 text-cyan-300"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>📋 Daily Tasks</span>
                <span className="px-1.5 py-0.5 rounded-full bg-zinc-800 text-[10px]">
                  {completedCount}/{totalCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("syllabus")}
                className={`py-3 font-semibold border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === "syllabus"
                    ? "border-cyan-400 text-cyan-300"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>🗺️ Roadmap Syllabus</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("materials")}
                className={`py-3 font-semibold border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === "materials"
                    ? "border-cyan-400 text-cyan-300"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>📚 Resources</span>
              </button>
            </div>

            {/* TAB CONTENT AREA (ALWAYS SCROLLABLE) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-left custom-scrollbar">
              {/* --- TAB 1: DAILY TASKS --- */}
              {activeTab === "todos" && (
                <div className="space-y-4">
                  {/* Day Pills Bar */}
                  <div className="flex items-center space-x-2 overflow-x-auto pb-2 custom-scrollbar">
                    {Array.from({ length: plan.durationDays }, (_, i) => i + 1).map((d) => (
                      <button
                        type="button"
                        key={`day_pill_${d}`}
                        onClick={() => setSelectedDay(d)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                          selectedDay === d
                            ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                            : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        Day {d}
                      </button>
                    ))}
                  </div>

                  {/* Add Manual Task Button */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Day {selectedDay} Scheduled Tasks ({filteredTodos.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddTodo(!showAddTodo)}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-zinc-700 transition flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Task</span>
                    </button>
                  </div>

                  {/* Add Task Form */}
                  {showAddTodo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          placeholder="Task Title"
                          value={newTodoTitle}
                          onChange={(e) => setNewTodoTitle(e.target.value)}
                          className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                        />
                        <input
                          type="text"
                          placeholder="Time (e.g. 09:00 AM or 30 sec)"
                          value={newTodoTime}
                          onChange={(e) => setNewTodoTime(e.target.value)}
                          className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Topic / Description"
                        value={newTodoTopic}
                        onChange={(e) => setNewTodoTopic(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setShowAddTodo(false)}
                          className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleAddManualTodo}
                          className="px-3 py-1.5 text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg"
                        >
                          Save Task
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Task List */}
                  {filteredTodos.length === 0 ? (
                    <div className="p-6 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800/80 text-zinc-400 text-xs">
                      No tasks scheduled for Day {selectedDay} yet. Click "+ Add Task" to create one!
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredTodos.map((todo, idx) => (
                        <div
                          key={todo.id ? `${todo.id}_${idx}` : `todo_${idx}`}
                          className={`p-3.5 rounded-2xl border transition flex items-start justify-between gap-3 ${
                            todo.completed
                              ? "bg-zinc-900/40 border-zinc-800/60 opacity-60"
                              : "bg-zinc-900/90 border-zinc-800 hover:border-zinc-700"
                          }`}
                        >
                          <div className="flex items-start space-x-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleTodo(todo.id)}
                              className={`mt-0.5 p-1 rounded-lg border transition shrink-0 cursor-pointer ${
                                todo.completed
                                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                                  : "border-zinc-700 hover:border-zinc-500 text-transparent"
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>

                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`text-xs font-semibold ${
                                    todo.completed ? "line-through text-zinc-500" : "text-white"
                                  }`}
                                >
                                  {todo.title}
                                </span>
                                <span className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-zinc-800 text-cyan-300">
                                  {todo.time}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{todo.topic}</p>

                              {todo.materialUrl && (
                                <a
                                  href={todo.materialUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center space-x-1 text-[11px] text-cyan-400 hover:underline mt-1.5"
                                >
                                  <span>Study Resource</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleAlarm(todo.id)}
                              title={todo.alarmEnabled ? "Alarm Active" : "Alarm Muted"}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                todo.alarmEnabled
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                  : "border-zinc-800 text-zinc-600 hover:text-zinc-400"
                              }`}
                            >
                              {todo.alarmEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteTodo(todo.id)}
                              className="p-1.5 rounded-lg border border-transparent text-zinc-500 hover:text-red-400 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* --- TAB 2: ROADMAP SYLLABUS --- */}
              {activeTab === "syllabus" && (
                <div className="space-y-3">
                  {plan.syllabus.map((syl, sIdx) => (
                    <div key={`syl_day_${syl.dayNumber || sIdx}`} className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-500/20 text-cyan-300">
                          Day {syl.dayNumber}
                        </span>
                        <h4 className="text-xs font-bold text-white">{syl.dayTitle}</h4>
                      </div>

                      <ul className="mt-2 space-y-1 pl-4 list-disc text-xs text-zinc-300">
                        {syl.topics.map((top, tidx) => (
                          <li key={`top_${syl.dayNumber || sIdx}_${tidx}`}>{top}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {/* --- TAB 3: CURATED RESOURCES --- */}
              {activeTab === "materials" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {plan.materials.map((mat, idx) => (
                    <div
                      key={mat.url ? `${mat.url}_${idx}` : `mat_${idx}`}
                      className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-purple-500/20 text-purple-300">
                            {mat.type}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">{mat.estHours}</span>
                        </div>
                        <h4 className="text-xs font-bold text-white">{mat.title}</h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">{mat.description}</p>
                      </div>

                      <a
                        href={mat.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-cyan-300 text-xs font-semibold transition"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Open Resource</span>
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- RINGING ALARM MODAL OVERLAY --- */}
        <AnimatePresence>
          {activeAlarmTodo && (
            <div className="absolute inset-0 z-[150] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-zinc-950 border border-amber-500/40 rounded-3xl p-6 max-w-sm w-full shadow-[0_0_50px_rgba(245,158,11,0.2)] text-center space-y-4"
              >
                <div className="p-4 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 inline-block animate-bounce">
                  <Bell className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">⏰ PA Reminder Alarm!</h3>
                  <p className="text-xs font-semibold text-amber-300 mt-1">{activeAlarmTodo.title}</p>
                  <p className="text-xs text-zinc-400 mt-1">{activeAlarmTodo.topic}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSnoozeAlarm(5)}
                    className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition cursor-pointer"
                  >
                    Snooze 5 Min
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissAlarm}
                    className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    Dismiss & Complete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
