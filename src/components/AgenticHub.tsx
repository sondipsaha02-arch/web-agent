import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Cpu,
  Terminal,
  Zap,
  CheckCircle,
  Eye,
  Activity,
  FileCode,
  Globe,
  Sliders,
  Play,
  TrendingUp,
  RefreshCw,
  FolderOpen
} from "lucide-react";

interface AgenticHubProps {
  isOpen: boolean;
  onClose: () => void;
  activeApp: string | null;
  deviceLogs: any[];
}

export function AgenticHub({ isOpen, onClose, activeApp, deviceLogs }: AgenticHubProps) {
  const [activeWorker, setActiveWorker] = useState<"anvil" | "scope" | "disk" | "beats">("anvil");
  const [isSimulatingTask, setIsSimulatingTask] = useState(false);
  const [currentTaskStep, setCurrentTaskStep] = useState(0);

  const workers = {
    anvil: {
      name: "Anvil (Code Specialist)",
      role: "Code synthesis, syntax auditing, repeated mistake tracking, compiling & hot reloads.",
      status: "Online",
      color: "border-blue-500 text-blue-400 bg-blue-500/5",
      icon: <FileCode className="w-5 h-5" />,
      simulatedView: "Visual Studio Code"
    },
    scope: {
      name: "Scope (Web Finder)",
      role: "Google Search, real-time API integrations, fetching reference documents, route lookup.",
      status: "Idle",
      color: "border-cyan-500 text-cyan-400 bg-cyan-500/5",
      icon: <Globe className="w-5 h-5" />,
      simulatedView: "Google Chrome Simulator"
    },
    disk: {
      name: "Disk (File Navigator)",
      role: "Accessing files, directory tree tracking, file logs, and screenshot display capture.",
      status: "Secured",
      color: "border-purple-500 text-purple-400 bg-purple-500/5",
      icon: <FolderOpen className="w-5 h-5" />,
      simulatedView: "File Finder Navigator"
    },
    beats: {
      name: "Beats (Sound Operator)",
      role: "Hardware sound sync, monitor dimming/brightness, playing ambient loop sounds.",
      status: "Active",
      color: "border-green-500 text-green-400 bg-green-500/5",
      icon: <Sliders className="w-5 h-5" />,
      simulatedView: "Spotify Music Streamer"
    }
  };

  const taskSteps = [
    { label: "Brain Receives Prompt", desc: "User requested: 'Check my code and play some Bangla Lo-Fi'", agent: "Gemini Orchestrator" },
    { label: "Task Decomposition", desc: "Dividing request: (1) Synthesizing server.ts parameters, (2) Fetching Spotify lo-fi stream.", agent: "Gemini Orchestrator" },
    { label: "Anvil Core Activated", desc: "Analyzing server.ts structure & checking for repeated code mistakes.", agent: "Anvil (Code Specialist)" },
    { label: "Scope Agent Search", desc: "Locating 'Mon Changa Bangla Lo-Fi' track on the web player.", agent: "Scope (Web Finder)" },
    { label: "Beats Operator Sync", desc: "Queueing and playing audio stream at optimal companion comfort volume.", agent: "Beats (Sound Operator)" },
    { label: "Task Resolved Successfully", desc: "Co-worker sub-agents completed work with full sync.", agent: "Gemini Orchestrator" }
  ];

  useEffect(() => {
    if (isSimulatingTask) {
      const interval = setInterval(() => {
        setCurrentTaskStep((prev) => {
          if (prev >= taskSteps.length - 1) {
            clearInterval(interval);
            setIsSimulatingTask(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isSimulatingTask]);

  const startSimulation = () => {
    setCurrentTaskStep(0);
    setIsSimulatingTask(true);
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Cpu className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wider text-white">AGENTIC CO-WORKER HUB</h2>
              <p className="text-[10px] text-white/40 font-mono">BRAIN & HANDS-FEET ORCHESTRATION PIPELINE</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition cursor-pointer border border-white/5"
          >
            Close
          </button>
        </div>

        {/* COMPONENT BODY */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#08080c]">
          
          {/* LEFT SIDE: CO-WORKER DETAILS & PIPELINE FLOW */}
          <div className="flex-1 border-r border-white/5 p-5 md:p-6 flex flex-col gap-6 overflow-y-auto">
            {/* BRAIN DETAILS */}
            <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
              <div className="flex items-center gap-2 mb-2 select-none">
                <Zap className="w-5 h-5 text-purple-400" />
                <h3 className="text-xs font-bold font-mono tracking-wider text-purple-300 uppercase">Gemini Orchestrator (The Brain)</h3>
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                Tune's central cognitive processor. It understands human language, sentiment, and emotional context. When you make a request, Gemini breaks down the prompt into modular sub-tasks and delegates them to specialized co-worker sub-agents.
              </p>
            </div>

            {/* SQUAD LIST */}
            <div>
              <h4 className="text-[10px] font-mono font-bold tracking-wider text-white/40 uppercase mb-3 select-none">The Co-worker Squad (Hands, Feet, Eyes)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(workers) as Array<keyof typeof workers>).map((key) => {
                  const w = workers[key];
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveWorker(key)}
                      className={`text-left p-3.5 border rounded-2xl flex flex-col gap-2.5 transition cursor-pointer ${
                        activeWorker === key ? "border-purple-500/50 bg-purple-500/10" : "border-white/5 hover:border-white/10 bg-white/3"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full select-none">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 border rounded-lg ${w.color}`}>{w.icon}</div>
                          <span className="text-xs font-bold text-white/95">{w.name.split(" ")[0]}</span>
                        </div>
                        <span className="text-[8px] font-mono px-2 py-0.5 bg-green-500/10 text-green-400 rounded-full border border-green-500/20 uppercase tracking-wider">{w.status}</span>
                      </div>
                      <p className="text-[11px] text-white/50 leading-relaxed truncate">{w.role}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* INTERACTIVE DEMONSTRATION OF FLOW */}
            <div className="mt-2">
              <div className="flex justify-between items-center mb-3 select-none">
                <h4 className="text-[10px] font-mono font-bold tracking-wider text-white/40 uppercase">Task Decomposition Pipeline</h4>
                <button
                  onClick={startSimulation}
                  disabled={isSimulatingTask}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-zinc-950 font-bold font-mono text-[9px] rounded-lg transition disabled:opacity-20 flex items-center gap-1.5 cursor-pointer shadow-lg"
                >
                  <Activity className="w-3.5 h-3.5 animate-pulse" /> Simulate Task
                </button>
              </div>

              <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-4 space-y-3">
                {taskSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 pl-2 transition-opacity duration-300 ${
                      isSimulatingTask && currentTaskStep === idx ? "opacity-100 scale-[1.01]" : isSimulatingTask ? "opacity-35" : "opacity-75"
                    }`}
                  >
                    <div className="flex flex-col items-center select-none">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center font-mono text-[10px] ${
                        isSimulatingTask && currentTaskStep === idx ? "bg-purple-500 text-zinc-950 border-purple-500 shadow-md font-bold" : "bg-white/5 border-white/10 text-white/40"
                      }`}>
                        {idx + 1}
                      </div>
                      {idx < taskSteps.length - 1 && <div className="w-px h-6 bg-white/10 mt-1" />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-xs font-bold ${isSimulatingTask && currentTaskStep === idx ? "text-purple-300" : "text-white/80"}`}>{step.label}</p>
                      <p className="text-[10px] text-white/40 font-mono mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: LIVE SCREEN SHARING MONITOR EMULATOR */}
          <div className="w-full lg:w-[400px] bg-black p-5 flex flex-col gap-4 overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/5 pb-2.5 select-none">
              <div className="flex items-center gap-2">
                <Eye className="w-4.5 h-4.5 text-cyan-400" />
                <h3 className="text-xs font-bold font-mono tracking-wider text-cyan-400 uppercase">Live Desktop Screen View</h3>
              </div>
              <span className="text-[8px] font-mono px-2 py-0.5 bg-red-500/10 text-red-400 rounded-full border border-red-500/20 uppercase tracking-wider animate-pulse">STREAMING FEED</span>
            </div>

            {/* SCREEN PORT VIEW */}
            <div className="aspect-video w-full rounded-2xl border border-white/10 bg-zinc-900 overflow-hidden shadow-inner flex flex-col relative select-none">
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 to-purple-500/5 pointer-events-none" />
              
              {/* Fake Chrome window display */}
              {activeWorker === "scope" && (
                <div className="flex-1 flex flex-col">
                  <div className="h-5 bg-zinc-800 flex items-center px-2 border-b border-white/5 gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-[7px] text-white/40 font-mono ml-2">Chrome - Web Search Results</span>
                  </div>
                  <div className="flex-1 p-3 bg-[#08080c] flex flex-col gap-2">
                    <div className="w-full h-4 bg-zinc-800 rounded flex items-center px-2">
                      <span className="text-[7px] text-white/50">visitbangladesh.gov.bd</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5 pt-1">
                      <div className="w-32 h-2.5 bg-cyan-500/20 rounded" />
                      <div className="w-full h-1.5 bg-white/5 rounded" />
                      <div className="w-full h-1.5 bg-white/5 rounded" />
                      <div className="w-24 h-1.5 bg-white/5 rounded" />
                    </div>
                  </div>
                </div>
              )}

              {/* Fake VS Code */}
              {activeWorker === "anvil" && (
                <div className="flex-1 flex flex-col">
                  <div className="h-5 bg-zinc-800 flex items-center px-2 border-b border-white/5 gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-[7px] text-white/40 font-mono ml-2">VS Code - server.ts</span>
                  </div>
                  <div className="flex-1 p-3 bg-[#050508] font-mono text-[7px] text-blue-300 flex flex-col gap-1">
                    <p className="text-zinc-500">// Debugging syntax mistakes</p>
                    <p>const app = express();</p>
                    <p className="text-yellow-400">const PORT = process.env.PORT || 3000;</p>
                    <p>app.listen(PORT, () =&gt; &#123;</p>
                    <p className="text-green-400">  console.log("Brain online!");</p>
                    <p>&#125;);</p>
                  </div>
                </div>
              )}

              {/* Fake Finder Navigator */}
              {activeWorker === "disk" && (
                <div className="flex-1 flex flex-col">
                  <div className="h-5 bg-zinc-800 flex items-center px-2 border-b border-white/5 gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-[7px] text-white/40 font-mono ml-2">Finder - File Explorer</span>
                  </div>
                  <div className="flex-1 p-3 bg-[#0a0a0f] flex gap-2">
                    <div className="w-16 h-full border-r border-white/5 flex flex-col gap-1">
                      <span className="text-[6px] text-white/30">Favorites</span>
                      <span className="w-full h-2 bg-white/5 rounded" />
                      <span className="w-full h-2 bg-white/5 rounded" />
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5">
                      <span className="text-[6px] text-white/30">Documents/</span>
                      <span className="w-full h-3 bg-white/5 rounded flex items-center px-1 text-[6px]">server.ts</span>
                      <span className="w-full h-3 bg-white/5 rounded flex items-center px-1 text-[6px]">App.tsx</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Fake Spotify */}
              {activeWorker === "beats" && (
                <div className="flex-1 flex flex-col bg-[#050505]">
                  <div className="h-5 bg-zinc-900 flex items-center px-2 border-b border-white/5 gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-[7px] text-white/40 font-mono ml-2">Spotify Stream Player</span>
                  </div>
                  <div className="flex-1 p-3 flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-zinc-800 flex-shrink-0 animate-pulse" />
                    <div className="flex-1 flex flex-col gap-1">
                      <span className="text-[8px] font-bold text-white leading-none">Mon Changa Tune</span>
                      <span className="text-[6px] text-green-400 leading-none">Tune Companion & Maya</span>
                      <div className="w-full h-1 bg-white/10 rounded-full mt-2 relative">
                        <div className="absolute h-full bg-green-500 rounded-full w-[45%]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AGENT HISTORIC ACTION LOGS */}
            <div className="flex-1 flex flex-col gap-2 min-h-[140px]">
              <span className="text-[9px] font-mono font-bold tracking-wider text-white/40 uppercase select-none">Action Log Stream</span>
              <div className="flex-1 bg-zinc-950/80 border border-white/5 rounded-2xl p-3 font-mono text-[9px] text-zinc-400 overflow-y-auto space-y-2">
                {deviceLogs.length > 0 ? (
                  deviceLogs.slice(0, 5).map((l, idx) => (
                    <div key={idx} className="border-b border-white/3 pb-1.5 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center">
                        <span className="text-cyan-400 font-bold">{l.action}</span>
                        <span className={`text-[7px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          l.status === "success" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
                        }`}>{l.status}</span>
                      </div>
                      <p className="text-white/60 mt-0.5">{l.details}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-white/20 italic">No agent logs recorded in this connection thread.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
