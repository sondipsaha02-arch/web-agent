import React from "react";
import { motion } from "motion/react";
import { ConnectionState } from "../types";
import { Brain, Heart, Target, Sliders, AudioLines, Volume2, ArrowRight } from "lucide-react";

interface VoiceActingEngineProps {
  connectionState: ConnectionState;
  userVolume: number;
  aiVolume: number;
  lastText: string;
  isUser: boolean;
  mood: "calm" | "excited" | "thinking" | "happy" | "confused" | "supportive";
}

export const VoiceActingEngine: React.FC<VoiceActingEngineProps> = ({
  connectionState,
  userVolume,
  aiVolume,
  lastText,
  isUser,
  mood,
}) => {
  // 1. Determine active Voice Mode
  const getVoiceModeAndCadence = () => {
    if (connectionState === "disconnected") {
      return { mode: "System Standby", cadence: "No Active Output", intent: "Idle" };
    }
    if (connectionState === "connecting") {
      return { mode: "Calibration", cadence: "Initializing Synapses", intent: "Connecting" };
    }
    if (connectionState === "thinking") {
      return { mode: "Cognitive Focus", cadence: "Synthesizing Thought", intent: "Analyzing Intent" };
    }

    const textLower = lastText.toLowerCase();

    if (mood === "excited" || textLower.includes("awesome") || textLower.includes("excit") || textLower.includes("amazing") || textLower.includes("wow")) {
      return {
        mode: "Excited Partner",
        cadence: "Dynamic Pitch, Fast Rhythm",
        intent: "Expressing Enthusiasm",
      };
    }
    if (mood === "happy" || textLower.includes("happy") || textLower.includes("joy") || textLower.includes("wonderful")) {
      return {
        mode: "Casual Friend",
        cadence: "Warm Cadence, High-Pitch Variation",
        intent: "Friendly Banter",
      };
    }
    if (mood === "supportive" || textLower.includes("sorry") || textLower.includes("sad") || textLower.includes("hard") || textLower.includes("tired")) {
      return {
        mode: "Supportive Companion",
        cadence: "Slower Tempo, Soft Volume",
        intent: "Empathetic Comfort",
      };
    }
    if (textLower.includes("why") || textLower.includes("how") || textLower.includes("teach") || textLower.includes("explain") || textLower.includes("step")) {
      return {
        mode: "Teacher",
        cadence: "Structured Pacing, Clear Inflection",
        intent: "Knowledge Guidance",
      };
    }
    if (textLower.includes("remember") || textLower.includes("profile") || textLower.includes("goal") || textLower.includes("task") || textLower.includes("open") || textLower.includes("launch")) {
      return {
        mode: "Professional Assistant",
        cadence: "Steady Cadence, Confident Tone",
        intent: "Task Orchestration",
      };
    }

    return {
      mode: "Casual Friend",
      cadence: "Natural Rhythm, Human Cadence",
      intent: "Spontaneous Banter",
    };
  };

  const { mode, cadence, intent } = getVoiceModeAndCadence();

  // 2. Identify active Speech/Vocal Cues in the current text
  const getVocalCues = () => {
    if (connectionState !== "speaking" && connectionState !== "listening") {
      return "Flow Calibrated";
    }
    
    if (connectionState === "listening") {
      return "VAD (Voice Activity Detection) Active";
    }

    const textLower = lastText.toLowerCase();
    const cues: string[] = [];

    if (lastText.includes("...")) {
      cues.push("Micro-Pause (...)");
    }
    if (lastText.includes("!") || /[A-Z]{3,}/.test(lastText)) {
      cues.push("Stress Emphasis");
    }
    if (textLower.includes("chuckle") || textLower.includes("haha") || textLower.includes("laugh")) {
      cues.push("Vocal Laughter Cues");
    }
    if (textLower.includes("sigh") || textLower.includes("[sigh]") || textLower.includes("*sigh*")) {
      cues.push("Breathing Gap [sigh]");
    }
    if (textLower.includes("well") || textLower.includes("wait") || textLower.includes("hmm")) {
      cues.push("Conversational Filler");
    }

    return cues.length > 0 ? cues.join(" | ") : "Steady Cadence Model";
  };

  const vocalCues = getVocalCues();

  // Define status colors
  const isActive = connectionState !== "disconnected";
  const isSpeaking = connectionState === "speaking";

  return (
    <div
      id="tune-voice-acting-pipeline"
      className="w-full max-w-lg bg-zinc-950/80 backdrop-blur-3xl border border-white/5 rounded-3xl p-5 shadow-2xl relative overflow-hidden"
    >
      {/* Visual cybernetic accent lines */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-cyan-500/0 via-purple-500/20 to-cyan-500/0" />
      <div className="absolute -right-24 -top-24 w-48 h-48 rounded-full bg-cyan-500/5 filter blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <AudioLines className={`w-4 h-4 ${isSpeaking ? "text-purple-400 animate-pulse" : "text-cyan-400"}`} />
          <h3 className="text-[10px] font-bold font-mono uppercase tracking-[0.2em] text-white/90">
            Advanced Voice Acting Pipeline
          </h3>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[8px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-white/40 uppercase">Mode: </span>
          <span className="text-cyan-400 font-bold uppercase">{connectionState}</span>
        </div>
      </div>

      {/* Pipeline Stages Grid / Horizontal Flow */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2.5 relative">
        
        {/* Stage 1: Gemini Brain */}
        <div className={`p-2.5 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
          isActive ? "bg-white/3 border-white/10" : "bg-black/10 border-white/5 opacity-40"
        }`}>
          <div className="flex items-center gap-1.5 mb-1">
            <Brain className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-white/20"}`} />
            <span className="text-[8px] font-bold font-mono tracking-wider text-white/50 uppercase">01 Brain</span>
          </div>
          <div>
            <div className="text-[10px] font-bold text-white/90 font-sans truncate">Gemini 3.8 Live</div>
            <div className="text-[7px] text-white/40 font-mono">Live 3.8 Audio API</div>
          </div>
        </div>

        {/* Stage 2: Emotion Analysis */}
        <div className={`p-2.5 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
          isActive ? "bg-white/3 border-white/10" : "bg-black/10 border-white/5 opacity-40"
        }`}>
          <div className="flex items-center gap-1.5 mb-1">
            <Heart className={`w-3.5 h-3.5 ${isActive ? "text-purple-400" : "text-white/20"}`} />
            <span className="text-[8px] font-bold font-mono tracking-wider text-white/50 uppercase">02 Emotion</span>
          </div>
          <div>
            <div className="text-[10px] font-bold text-white/90 capitalize font-sans">{isActive ? mood : "None"}</div>
            <div className="text-[7px] text-white/40 font-mono">Real-time VAD</div>
          </div>
        </div>

        {/* Stage 3: Conversation Intent */}
        <div className={`p-2.5 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
          isActive ? "bg-white/3 border-white/10" : "bg-black/10 border-white/5 opacity-40"
        }`}>
          <div className="flex items-center gap-1.5 mb-1">
            <Target className={`w-3.5 h-3.5 ${isActive ? "text-pink-400" : "text-white/20"}`} />
            <span className="text-[8px] font-bold font-mono tracking-wider text-white/50 uppercase">03 Intent</span>
          </div>
          <div>
            <div className="text-[10px] font-bold text-white/90 font-sans truncate">{intent}</div>
            <div className="text-[7px] text-white/40 font-mono">Semantic Goal</div>
          </div>
        </div>

        {/* Stage 4: Voice Acting Controller */}
        <div className={`p-2.5 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
          isActive ? "bg-white/3 border-white/10" : "bg-black/10 border-white/5 opacity-40"
        }`}>
          <div className="flex items-center gap-1.5 mb-1">
            <Sliders className={`w-3.5 h-3.5 ${isActive ? "text-yellow-400" : "text-white/20"}`} />
            <span className="text-[8px] font-bold font-mono tracking-wider text-white/50 uppercase">04 Actor</span>
          </div>
          <div>
            <div className="text-[10px] font-bold text-white/90 font-sans truncate">{mode}</div>
            <div className="text-[7px] text-white/40 font-mono">Vocal Styling</div>
          </div>
        </div>

        {/* Stage 5: Neural Voice */}
        <div className={`p-2.5 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
          isActive ? "bg-white/3 border-white/10" : "bg-black/10 border-white/5 opacity-40"
        }`}>
          <div className="flex items-center gap-1.5 mb-1">
            <AudioLines className={`w-3.5 h-3.5 ${isActive ? "text-indigo-400" : "text-white/20"}`} />
            <span className="text-[8px] font-bold font-mono tracking-wider text-white/50 uppercase">05 Synthesis</span>
          </div>
          <div>
            <div className="text-[10px] font-bold text-white/90 font-sans truncate">Kore Engine</div>
            <div className="text-[7px] text-white/40 font-mono">Speech Modeling</div>
          </div>
        </div>

        {/* Stage 6: Audio Output */}
        <div className={`p-2.5 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
          isSpeaking ? "bg-purple-500/10 border-purple-500/25 shadow-[0_0_12px_rgba(139,92,246,0.15)] animate-pulse" : isActive ? "bg-white/3 border-white/10" : "bg-black/10 border-white/5 opacity-40"
        }`}>
          <div className="flex items-center gap-1.5 mb-1">
            <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? "text-violet-400 animate-bounce" : isActive ? "text-teal-400" : "text-white/20"}`} />
            <span className="text-[8px] font-bold font-mono tracking-wider text-white/50 uppercase">06 Out</span>
          </div>
          <div>
            <div className="text-[10px] font-bold text-white/90 font-sans">24kHz PCM</div>
            <div className="text-[7px] text-white/40 font-mono">Gapless Sync</div>
          </div>
        </div>

      </div>

      {/* Real-time Prosody & CADENCE METRICS FOOTER */}
      <div className="mt-4 bg-white/[0.02] border border-white/5 rounded-2xl p-3 flex flex-col md:flex-row gap-3 justify-between items-center font-mono">
        <div className="flex flex-col gap-0.5 text-center md:text-left">
          <div className="text-[8px] text-white/30 uppercase tracking-wider">Dynamic Prosody & Pacing</div>
          <div className="text-[10px] text-white/80 font-semibold">{cadence}</div>
        </div>

        <div className="h-px md:h-6 w-full md:w-[1px] bg-white/10" />

        <div className="flex flex-col gap-0.5 text-center">
          <div className="text-[8px] text-white/30 uppercase tracking-wider">Acting Cues Detected</div>
          <div className="text-[10px] text-cyan-300 font-semibold">{vocalCues}</div>
        </div>

        <div className="h-px md:h-6 w-full md:w-[1px] bg-white/10" />

        <div className="flex items-center gap-3.5">
          <div className="text-center">
            <span className="text-[8px] text-white/20 block uppercase">PITCH VAR</span>
            <span className="text-[10px] text-white/70 font-semibold">
              {isSpeaking ? `${Math.round(15 + aiVolume * 35)}Hz` : "0Hz"}
            </span>
          </div>
          <div className="text-center">
            <span className="text-[8px] text-white/20 block uppercase">BREATH GAP</span>
            <span className="text-[10px] text-white/70 font-semibold">
              {isSpeaking && lastText.includes("...") ? "120ms" : "0ms"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default VoiceActingEngine;
