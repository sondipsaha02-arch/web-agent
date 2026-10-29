export interface CompanionTool {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: "ai" | "vision" | "productivity" | "system";
  iconName: "MessageSquareQuote" | "Bot" | "Smile" | "Share2" | "ScreenShare" | "Camera" | "Brain" | "FolderOpen" | "MessageSquare" | "Volume2" | "VolumeX" | "Sliders" | "Mic";
  color: string;
  bgColor: string;
  borderColor: string;
  activeColor: string;
}

export const ALL_COMPANION_TOOLS: CompanionTool[] = [
  {
    id: "voice_sensitivity",
    name: "Voice Sensitivity & Distance",
    shortName: "Voice Detect",
    description: "Adjust voice detection range and sensitivity (Close-Up 0.5m to Far-Field 3m+) with real-time meter.",
    category: "system",
    iconName: "Sliders",
    color: "text-amber-400",
    bgColor: "bg-amber-500/15",
    borderColor: "border-amber-500/30",
    activeColor: "bg-amber-500/25 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
  },
  {
    id: "speaker_mute",
    name: "Speaker Voice Sound (Mute/Unmute)",
    shortName: "Speaker Voice",
    description: "Toggle Tune's audio speaker voice output. When muted, Tune works silently and displays all answers in text.",
    category: "system",
    iconName: "Volume2",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/15",
    borderColor: "border-emerald-500/30",
    activeColor: "bg-rose-500/25 text-rose-300 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
  },
  {
    id: "asking_mode",
    name: "Asking Mode",
    shortName: "Asking Mode",
    description: "Tune focuses heavily on attentive listening, stays quiet during idle, and answers questions clearly with voice when asked.",
    category: "ai",
    iconName: "MessageSquareQuote",
    color: "text-purple-400",
    bgColor: "bg-purple-500/15",
    borderColor: "border-purple-500/30",
    activeColor: "bg-purple-500/25 text-purple-300 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
  },
  {
    id: "goal_planner",
    name: "PA Goal Planner",
    shortName: "PA Planner",
    description: "Interactive goal breakdown, daily syllabus checklist, milestones, and voice planning mode.",
    category: "productivity",
    iconName: "Bot",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/15",
    borderColor: "border-cyan-500/30",
    activeColor: "bg-cyan-500/25 text-cyan-300 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
  },
  {
    id: "face_mirror",
    name: "Face Copy & Mirroring",
    shortName: "Face Copy",
    description: "Camera gesture tracking that mimics your head tilt, smiles, eye blinks, and brow movements in real time.",
    category: "vision",
    iconName: "Smile",
    color: "text-amber-400",
    bgColor: "bg-amber-500/15",
    borderColor: "border-amber-500/30",
    activeColor: "bg-amber-500/25 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
  },
  {
    id: "share_phone",
    name: "Share / Mobile Phone",
    shortName: "Share/Phone",
    description: "QR code scanner, local IP hotspot, and WebAPK installation guide for mobile Android/iOS.",
    category: "system",
    iconName: "Share2",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/15",
    borderColor: "border-emerald-500/30",
    activeColor: "bg-emerald-500/25 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
  },
  {
    id: "chat_history",
    name: "Chat & Research History",
    shortName: "History",
    description: "Search and inspect past conversations, questions, voice transcriptions, and Google research findings.",
    category: "productivity",
    iconName: "MessageSquare",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/15",
    borderColor: "border-yellow-500/30",
    activeColor: "bg-yellow-500/25 text-yellow-300 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]"
  },
  {
    id: "screen_share",
    name: "Screen Sharing",
    shortName: "Screen Share",
    description: "Stream your display or active IDE window live for real-time coding debugging and document analysis.",
    category: "vision",
    iconName: "ScreenShare",
    color: "text-purple-400",
    bgColor: "bg-purple-500/15",
    borderColor: "border-purple-500/30",
    activeColor: "bg-purple-500/25 text-purple-300 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
  },
  {
    id: "camera",
    name: "Vision Camera Input",
    shortName: "Camera Feed",
    description: "Real-time webcam visual feed enabling visual perception, handwritten note reading, and scene awareness.",
    category: "vision",
    iconName: "Camera",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/15",
    borderColor: "border-cyan-500/30",
    activeColor: "bg-cyan-500/25 text-cyan-300 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
  }
];

export const DEFAULT_PINNED_TOOLS = ["asking_mode"];
