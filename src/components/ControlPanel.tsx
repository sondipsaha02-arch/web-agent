import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Brain,
  Sliders,
  Laptop,
  Bell,
  X,
  Volume2,
  VolumeX,
  Sun,
  Shield,
  Clock,
  Trash2,
  FolderOpen,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Search,
  Plus,
  Play,
  Moon,
  Zap,
  Info,
  Sparkles,
  Smile,
  Palette,
  Languages,
  User,
  Users,
  UserCheck,
  UserPlus,
  Bot,
  Heart,
  Smartphone,
  Camera,
  CameraOff,
  ScreenShare,
  ScreenShareOff,
  Video,
  Mic,
  MicOff,
  Square,
  CheckCircle2,
  RefreshCw,
  Radio,
  Maximize2,
  Minimize2,
  Move,
  RotateCcw,
  Check,
  Edit2,
  Tv,
  Activity,
  ZoomIn,
  ZoomOut,
  Key,
  Eye,
  EyeOff,
  QrCode,
  Share2,
  ExternalLink,
  Copy,
  MessageSquare,
  BookOpen,
  Download,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Pin,
  PinOff,
  MessageSquareQuote,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import {
  Reminder,
  AllowedApplication,
  DeviceLog,
  PendingApproval,
  LongTermMemory,
  AmbientSoundType,
} from "../types";
import { ALL_COMPANION_TOOLS, CompanionTool } from "../utils/toolsRegistry";
import { soundEngine } from "../utils/soundEngine";
import { updateActiveProfileApiKey, STORAGE_API_KEY_CONFIGURED } from "../utils/userProfiles";
import { auth, saveUserProfileData } from "../lib/firebase";

interface ControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAccountModal?: () => void;

  // Tools & Home Bar Customization
  pinnedToolIds?: string[];
  onTogglePinTool?: (toolId: string) => void;
  onReorderTools?: (tools: string[]) => void;
  isSpeakerMuted?: boolean;
  toggleSpeakerMute?: () => void;
  isAskingMode?: boolean;
  toggleAskingMode?: () => void;
  isIntelligentPAOpen?: boolean;
  onOpenIntelligentPA?: () => void;
  onOpenMistakeFocusBoard?: () => void;
  onOpenFileManager?: () => void;
  initialTab?: TabType;
  
  // Reminders
  reminders: Reminder[];
  removeReminder: (id: string) => void;

  // OS Integrations
  allowedApps: AllowedApplication[];
  handleToggleAutoApprove: (name: string, current: boolean) => void;
  searchAppQuery: string;
  setSearchAppQuery: (val: string) => void;
  newAppName: string;
  setNewAppName: (val: string) => void;
  newAppCategory: string;
  setNewAppCategory: (val: string) => void;
  newAppDesc: string;
  setNewAppDesc: (val: string) => void;
  handleAddCustomApp: (e: React.FormEvent) => void;
  deviceLogs: DeviceLog[];
  pendingApproval: PendingApproval | null;
  handleAuthorize: (approved: boolean) => void;

  // Hardware/Comfort Sliders
  hwVolume: number;
  handleVolumeSlider: (val: number) => void;
  hwBrightness: number;
  handleBrightnessSlider: (val: number) => void;

  // Long-Term Memory
  longTermMemory: LongTermMemory;
  handleUpdateProfileName: (name: string) => void;
  handleDeleteMemorySnippet: (id: string) => void;
  handleUpdateMemorySnippet?: (id: string, text: string, category?: string) => void;
  handleAddMemorySnippet?: (text: string, category: string) => void;
  handleSwitchActiveSpeaker?: (name: string) => void;
  handleAddSpeakerProfile?: (name: string, relationship: string, preferences?: string, notes?: string) => void;
  handleDeleteSpeakerProfile?: (id: string) => void;

  // Ambient Sounds
  activeSound: AmbientSoundType;
  handleAmbientSoundToggle: (sound: AmbientSoundType) => void;

  // Security Intercept Bypass
  bypassSecurity: boolean;
  handleToggleBypassSecurity: (val: boolean) => void;

  // Vision & Media
  isScreenSharing?: boolean;
  toggleScreenSharing?: () => void;
  isCameraSharing?: boolean;
  toggleCameraSharing?: () => void;
  isFaceMirroring?: boolean;
  toggleFaceMirroring?: () => void;

  // Configuration setters
  handleUpdatePreferences?: (prefs: any) => void;
  handleUpdatePersonality?: (personality: string) => void;
  onOpenWorkstation?: () => void;
  onOpenGuideModal?: () => void;
  onAddTestReminder?: (text: string, minutes: number) => void;
  onOpenShareModal?: () => void;
  onOpenChatHistory?: () => void;
}

type TabType = "apikeys" | "tools" | "features" | "history" | "memory" | "integrations" | "reminders" | "comfort";

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isOpen,
  onClose,
  onOpenAccountModal,
  pinnedToolIds = ["asking_mode"],
  onTogglePinTool,
  onReorderTools,
  isSpeakerMuted = false,
  toggleSpeakerMute,
  isAskingMode = false,
  toggleAskingMode,
  isIntelligentPAOpen = false,
  onOpenIntelligentPA,
  onOpenMistakeFocusBoard,
  onOpenFileManager,
  initialTab,
  reminders,
  removeReminder,
  allowedApps = [],
  handleToggleAutoApprove,
  searchAppQuery,
  setSearchAppQuery,
  newAppName,
  setNewAppName,
  newAppCategory,
  setNewAppCategory,
  newAppDesc,
  setNewAppDesc,
  handleAddCustomApp,
  deviceLogs,
  pendingApproval,
  handleAuthorize,
  hwVolume,
  handleVolumeSlider,
  hwBrightness,
  handleBrightnessSlider,
  longTermMemory,
  handleUpdateProfileName,
  handleUpdatePersonality,
  handleUpdatePreferences,
  handleDeleteMemorySnippet,
  handleUpdateMemorySnippet,
  handleAddMemorySnippet,
  handleSwitchActiveSpeaker,
  handleAddSpeakerProfile,
  handleDeleteSpeakerProfile,
  activeSound,
  handleAmbientSoundToggle,
  bypassSecurity,
  handleToggleBypassSecurity,
  isScreenSharing = false,
  toggleScreenSharing,
  isCameraSharing = false,
  toggleCameraSharing,
  isFaceMirroring = false,
  toggleFaceMirroring,
  onOpenShareModal,
  onOpenChatHistory,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (initialTab) return initialTab;
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("custom_gemini_api_key");
      if (!stored) return "apikeys";
    }
    return "apikeys";
  });

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Custom Gemini API Key state
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return typeof localStorage !== "undefined" ? localStorage.getItem("custom_gemini_api_key") || "" : "";
  });
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [apiKeySaveStatus, setApiKeySaveStatus] = useState<string>("");

  const handleSaveApiKey = () => {
    if (typeof localStorage !== "undefined") {
      const cleanKey = customApiKey
        .trim()
        .replace(/^["']|["']$/g, "")
        .replace(/[\r\n\t]/g, "")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .trim();

      if (cleanKey) {
        updateActiveProfileApiKey(cleanKey);
        localStorage.setItem("custom_gemini_api_key", cleanKey);
        localStorage.setItem(STORAGE_API_KEY_CONFIGURED, "true");
        setCustomApiKey(cleanKey);
        setApiKeySaveStatus("Saved for Profile & Reconnecting...");
        if (auth.currentUser) {
          saveUserProfileData(auth.currentUser.uid, { apiKey: cleanKey }).catch(() => {});
        }
      } else {
        updateActiveProfileApiKey("");
        localStorage.removeItem("custom_gemini_api_key");
        localStorage.removeItem(STORAGE_API_KEY_CONFIGURED);
        setCustomApiKey("");
        setApiKeySaveStatus("Cleared (Using System Default)");
        if (auth.currentUser) {
          saveUserProfileData(auth.currentUser.uid, { apiKey: "" }).catch(() => {});
        }
      }
      setTimeout(() => setApiKeySaveStatus(""), 4000);
    }
  };

  const handleClearApiKey = () => {
    setCustomApiKey("");
    if (typeof localStorage !== "undefined") {
      updateActiveProfileApiKey("");
      localStorage.removeItem("custom_gemini_api_key");
      localStorage.removeItem(STORAGE_API_KEY_CONFIGURED);
      setApiKeySaveStatus("Cleared (Using System Default)");
      if (auth.currentUser) {
        saveUserProfileData(auth.currentUser.uid, { apiKey: "" }).catch(() => {});
      }
      setTimeout(() => setApiKeySaveStatus(""), 4000);
    }
  };

  // Custom Personality & Behavioral Prompt state
  const [personalityPrompt, setPersonalityPrompt] = useState<string>(() => {
    return typeof localStorage !== "undefined" ? localStorage.getItem("tune_custom_personality_prompt") || "" : "";
  });
  const [personalitySaveStatus, setPersonalitySaveStatus] = useState<string>("");

  const handleSavePersonalityPrompt = () => {
    if (typeof localStorage !== "undefined") {
      const cleanPrompt = personalityPrompt.trim();
      localStorage.setItem("tune_custom_personality_prompt", cleanPrompt);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("tune_personality_prompt_updated", { detail: { prompt: cleanPrompt } })
        );
      }
      if (auth.currentUser) {
        saveUserProfileData(auth.currentUser.uid, { personalityPrompt: cleanPrompt }).catch(() => {});
      }
      setPersonalitySaveStatus("Personality Synced!");
      soundEngine.playNotificationChime();
      setTimeout(() => setPersonalitySaveStatus(""), 4000);
    }
  };

  // Voice Detection Sensitivity & Distance Range State (1 to 100)
  const [voiceSensitivity, setVoiceSensitivity] = useState<number>(() => {
    return typeof localStorage !== "undefined"
      ? Math.max(1, Math.min(100, parseInt(localStorage.getItem("tune_voice_sensitivity") || "65", 10)))
      : 65;
  });

  const handleVoiceSensitivityChange = (val: number) => {
    const clamped = Math.max(1, Math.min(100, Math.round(val)));
    setVoiceSensitivity(clamped);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("tune_voice_sensitivity", clamped.toString());
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tune_voice_sensitivity_changed", { detail: { sensitivity: clamped } }));
    }
  };

  // Character Customization local editing state
  const [editScale, setEditScale] = useState<number>(
    longTermMemory.preferences?.avatar_scale || 1.0
  );
  const [editOffsetX, setEditOffsetX] = useState<number>(
    longTermMemory.preferences?.avatar_offset_x || 0
  );
  const [editOffsetY, setEditOffsetY] = useState<number>(
    longTermMemory.preferences?.avatar_offset_y || 0
  );
  const [isSavedAvatar, setIsSavedAvatar] = useState(false);

  React.useEffect(() => {
    if (longTermMemory.preferences) {
      if (longTermMemory.preferences.avatar_scale !== undefined) {
        setEditScale(longTermMemory.preferences.avatar_scale);
      }
      if (longTermMemory.preferences.avatar_offset_x !== undefined) {
        setEditOffsetX(longTermMemory.preferences.avatar_offset_x);
      }
      if (longTermMemory.preferences.avatar_offset_y !== undefined) {
        setEditOffsetY(longTermMemory.preferences.avatar_offset_y);
      }
    }
  }, [longTermMemory.preferences]);

  const [newSpeakerName, setNewSpeakerName] = useState("");
  const [newSpeakerRel, setNewSpeakerRel] = useState("Friend");
  const [newSpeakerPref, setNewSpeakerPref] = useState("");
  const [newSpeakerNotes, setNewSpeakerNotes] = useState("");
  const [showAddSpeakerForm, setShowAddSpeakerForm] = useState(false);

  // New Memory Snippet creation & editing state
  const [newSnippetText, setNewSnippetText] = useState("");
  const [newSnippetCategory, setNewSnippetCategory] = useState("interest");
  const [memorySearchQuery, setMemorySearchQuery] = useState("");
  const [editingSnippetId, setEditingSnippetId] = useState<string | null>(null);
  const [editingSnippetText, setEditingSnippetText] = useState("");
  const [editingSnippetCategory, setEditingSnippetCategory] = useState("interest");
  const [memoryCategoryFilter, setMemoryCategoryFilter] = useState<string>("all");

  // Voice Profile Audio Calibration state
  const [isRecordingVoiceSample, setIsRecordingVoiceSample] = useState(false);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(5);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(
    (longTermMemory.preferences as any)?.voice_sample_audio_url || null
  );
  const [isPlayingSample, setIsPlayingSample] = useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const audioPlayerRef = React.useRef<HTMLAudioElement | null>(null);

  const handleStartRecordVoiceSample = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setRecordedAudioUrl(base64Audio);
          handleUpdatePreferences?.({
            voice_sample_recorded: true,
            voice_sample_date: new Date().toLocaleDateString(),
            voice_sample_audio_url: base64Audio,
            speaker_voice_recognition_enabled: true
          });
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingVoiceSample(true);
      setRecordingTimeLeft(5);

      const interval = setInterval(() => {
        setRecordingTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleStopRecordVoiceSample();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Error starting microphone recording for voice profile:", err);
      alert("Microphone access is required to record your voice sample.");
    }
  };

  const handleStopRecordVoiceSample = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVoiceSample(false);
  };

  const handlePlayVoiceSample = () => {
    const url = recordedAudioUrl || (longTermMemory.preferences as any)?.voice_sample_audio_url;
    if (!url) return;
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    const audio = new Audio(url);
    audioPlayerRef.current = audio;
    setIsPlayingSample(true);
    audio.onended = () => setIsPlayingSample(false);
    audio.play().catch((err) => console.error("Audio play error:", err));
  };

  const handleDeleteVoiceSample = () => {
    setRecordedAudioUrl(null);
    handleUpdatePreferences?.({
      voice_sample_recorded: false,
      voice_sample_date: null,
      voice_sample_audio_url: null,
      speaker_voice_recognition_enabled: false
    });
  };

  const [companionActive, setCompanionActive] = useState(false);
  const [companionLogs, setCompanionLogs] = useState<any[]>([]);
  const [copiedCompanion, setCopiedCompanion] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);

  React.useEffect(() => {
    if (!isOpen || activeTab !== "integrations") return;

    const checkStatus = async () => {
      try {
        const res = await fetch("/api/pc/connection-status");
        const status = await res.json();
        setCompanionActive(status.active);

        const logsRes = await fetch("/api/pc/logs");
        const logsData = await logsRes.json();
        setCompanionLogs(logsData.logs || []);
      } catch (err) {
        console.warn("Failed checking companion status:", err);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [isOpen, activeTab]);

  // Chat History state
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && activeTab === "history") {
      const saved = localStorage.getItem("tune_chat_history_archive");
      if (saved) {
        try {
          setChatSessions(JSON.parse(saved));
        } catch {
          setChatSessions([]);
        }
      } else {
        setChatSessions([]);
      }
    }
  }, [isOpen, activeTab]);

  const handleClearHistoryFromSettings = () => {
    if (window.confirm("Are you sure you want to delete all chat history? / আপনি কি নিশ্চিত যে সমস্ত চ্যাট হিস্ট্রি মুছে ফেলতে চান?")) {
      localStorage.removeItem("tune_chat_history_archive");
      setChatSessions([]);
    }
  };

  const renderToolIcon = (iconName: string, className: string) => {
    switch (iconName) {
      case "Volume2":
        return isSpeakerMuted ? <VolumeX className={`${className} text-rose-400`} /> : <Volume2 className={`${className} text-emerald-400`} />;
      case "VolumeX":
        return <VolumeX className={`${className} text-rose-400`} />;
      case "MessageSquareQuote":
        return <MessageSquareQuote className={className} />;
      case "Bot":
        return <Bot className={className} />;
      case "Smile":
        return <Smile className={className} />;
      case "Share2":
        return <Share2 className={className} />;
      case "ScreenShare":
        return <ScreenShare className={className} />;
      case "Camera":
        return <Camera className={className} />;
      case "Brain":
        return <Brain className={className} />;
      case "FolderOpen":
        return <FolderOpen className={className} />;
      case "MessageSquare":
        return <MessageSquare className={className} />;
      default:
        return <LayoutGrid className={className} />;
    }
  };

  const executeToolAction = (toolId: string) => {
    switch (toolId) {
      case "speaker_mute":
        toggleSpeakerMute?.();
        break;
      case "asking_mode":
        toggleAskingMode?.();
        break;
      case "goal_planner":
        onClose();
        onOpenIntelligentPA?.();
        break;
      case "face_mirror":
        toggleFaceMirroring?.();
        break;
      case "share_phone":
        onClose();
        onOpenShareModal?.();
        break;
      case "chat_history":
        onClose();
        onOpenChatHistory?.();
        break;
      case "screen_share":
        toggleScreenSharing?.();
        break;
      case "camera":
        toggleCameraSharing?.();
        break;
      case "mistake_board":
        onClose();
        onOpenMistakeFocusBoard?.();
        break;
      case "file_manager":
        onClose();
        onOpenFileManager?.();
        break;
    }
  };

  const isToolCurrentlyActive = (toolId: string): boolean => {
    switch (toolId) {
      case "speaker_mute":
        return isSpeakerMuted;
      case "asking_mode":
        return isAskingMode;
      case "face_mirror":
        return isFaceMirroring;
      case "screen_share":
        return isScreenSharing;
      case "camera":
        return isCameraSharing;
      default:
        return false;
    }
  };

  const tabs = [
    { id: "apikeys" as TabType, label: "Account & API Key", icon: Key, color: "text-emerald-400" },
    { id: "tools" as TabType, label: "Tools & Home Bar", icon: LayoutGrid, color: "text-purple-400" },
    { id: "features" as TabType, label: "Tune Customizer", icon: Sparkles, color: "text-cyan-400" },
    { id: "history" as TabType, label: "Chat History", icon: MessageSquare, color: "text-amber-400" },
    { id: "memory" as TabType, label: "Core Memory", icon: Brain, color: "text-purple-400" },
    { id: "integrations" as TabType, label: "OS Control", icon: Laptop, color: "text-emerald-400" },
    { id: "reminders" as TabType, label: "Tasks", icon: Bell, color: "text-blue-400" },
    { id: "comfort" as TabType, label: "System Sync", icon: Sliders, color: "text-yellow-400" },
  ];

  const filteredApps = (allowedApps || []).filter(
    (app) =>
      app &&
      ((app.name && app.name.toLowerCase().includes((searchAppQuery || "").toLowerCase())) ||
        (app.category && app.category.toLowerCase().includes((searchAppQuery || "").toLowerCase())))
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md z-40"
          />

          {/* Premium control tray */}
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 24, stiffness: 180 }}
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] h-[650px] bg-zinc-950/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[32px] z-50 p-5 md:p-6 flex flex-col justify-between shadow-[0_-20px_50px_rgba(0,0,0,0.8)] select-text"
          >
            {/* Draggable indicator handle */}
            <div className="w-12 h-1 bg-white/15 rounded-full mx-auto mb-4 cursor-pointer" onClick={onClose} />

            {/* Title bar */}
            <div className="flex justify-between items-center mb-5 shrink-0">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-zinc-400 animate-spin" style={{ animationDuration: "12s" }} />
                <div>
                  <h2 className="text-base font-bold tracking-wider font-display text-white">TUNE COMPANION CONTROL GRID</h2>
                  <p className="text-[10px] text-white/40 font-mono uppercase">AI Operating System Node</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    soundEngine.playWaterDropSound();
                    window.dispatchEvent(new CustomEvent("tune_open_install_modal"));
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-zinc-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
                  title="Install App (Android, Windows, Web)"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-950" />
                  <span className="hidden sm:inline">Install App (Android / Windows)</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Bento-grid container */}
            <div className="flex-1 flex flex-col md:flex-row gap-5 overflow-hidden">
              
              {/* Tab Selector Sidebar */}
              <div className="flex md:flex-col gap-1.5 shrink-0 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none border-b md:border-b-0 md:border-r border-white/5 pr-0 md:pr-4">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition text-left cursor-pointer shrink-0 md:shrink-1 ${
                        isActive
                          ? "bg-white/5 border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] text-white"
                          : "text-white/45 hover:text-white/80 hover:bg-white/3"
                      }`}
                    >
                      <IconComponent className={`w-4 h-4 ${tab.color}`} />
                      <span className="text-xs font-semibold tracking-wide hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Content Frame */}
              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                <AnimatePresence mode="wait">
                  
                  {/* TAB 0: QUICK TOOLS & HOME BAR VAULT */}
                  {activeTab === "tools" && (
                    <motion.div
                      key="tools"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-4"
                    >
                      {/* Top banner */}
                      <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <LayoutGrid className="w-4 h-4 text-purple-400 animate-pulse" />
                            <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-purple-300">
                              COMPANION TOOLS & HOME BAR VAULT
                            </h3>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {pinnedToolIds.length} Pinned on Home Bar
                          </span>
                        </div>
                        <p className="text-[11px] text-white/60 leading-relaxed">
                          Hold any top bar icon to move left/right or return to Settings. Use the controls below to launch tools directly or pin them to your Home Top Bar.
                        </p>
                      </div>

                      {/* Tools List */}
                      <div className="grid grid-cols-1 gap-2.5">
                        {ALL_COMPANION_TOOLS.map((tool) => {
                          const isPinned = pinnedToolIds.includes(tool.id);
                          const isActive = isToolCurrentlyActive(tool.id);
                          const pinnedIndex = pinnedToolIds.indexOf(tool.id);

                          return (
                            <div
                              key={tool.id}
                              className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                isPinned
                                  ? "bg-purple-950/20 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.05)]"
                                  : "bg-zinc-900/40 border-white/5 hover:border-white/10"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                                    isActive
                                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                                      : `${tool.bgColor} ${tool.borderColor} ${tool.color}`
                                  }`}
                                >
                                  {renderToolIcon(tool.iconName, "w-4 h-4")}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-white">{tool.name}</span>
                                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                                      {tool.category}
                                    </span>
                                    {isActive && (
                                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        Active
                                      </span>
                                    )}
                                    {isPinned && (
                                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                        Pinned #{pinnedIndex + 1}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-white/50 mt-1 leading-normal">
                                    {tool.description}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                {isPinned && onReorderTools && (
                                  <div className="flex items-center gap-1 bg-white/5 rounded-xl p-0.5 border border-white/5">
                                    <button
                                      type="button"
                                      disabled={pinnedIndex === 0}
                                      onClick={() => {
                                        if (pinnedIndex > 0) {
                                          const next = [...pinnedToolIds];
                                          const temp = next[pinnedIndex - 1];
                                          next[pinnedIndex - 1] = next[pinnedIndex];
                                          next[pinnedIndex] = temp;
                                          onReorderTools(next);
                                        }
                                      }}
                                      className="p-1 hover:bg-white/10 disabled:opacity-20 text-white/70 hover:text-white rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
                                      title="Move Left / Up on Home Bar"
                                    >
                                      <ArrowLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={pinnedIndex === pinnedToolIds.length - 1}
                                      onClick={() => {
                                        if (pinnedIndex < pinnedToolIds.length - 1) {
                                          const next = [...pinnedToolIds];
                                          const temp = next[pinnedIndex + 1];
                                          next[pinnedIndex + 1] = next[pinnedIndex];
                                          next[pinnedIndex] = temp;
                                          onReorderTools(next);
                                        }
                                      }}
                                      className="p-1 hover:bg-white/10 disabled:opacity-20 text-white/70 hover:text-white rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
                                      title="Move Right / Down on Home Bar"
                                    >
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => executeToolAction(tool.id)}
                                  className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1 transition cursor-pointer active:scale-95"
                                >
                                  <span>Launch</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onTogglePinTool?.(tool.id)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border active:scale-95 ${
                                    isPinned
                                      ? "bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/40"
                                      : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border-white/10"
                                  }`}
                                  title={isPinned ? "Remove from Home Top Bar (Keep in Settings)" : "Pin to Home Top Bar"}
                                >
                                  {isPinned ? (
                                    <>
                                      <PinOff className="w-3.5 h-3.5 text-purple-400" />
                                      <span>Unpin</span>
                                    </>
                                  ) : (
                                    <>
                                      <Pin className="w-3.5 h-3.5 text-cyan-400" />
                                      <span>Add to Home Bar</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 1: TUNE CUSTOMIZER */}
                  {activeTab === "features" && (
                    <motion.div
                      key="features"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-5"
                    >
                      {/* Interactive Customizer */}
                      <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                          <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-cyan-300">TUNE ENGINE CONFIGURATION</h3>
                        </div>
                        <p className="text-[11px] text-white/50 mb-4 leading-relaxed">
                          Tweak Tune's cognitive persona, vocal synthesis model, linguistic style, and active behavioral modules.
                        </p>

                        <div className="space-y-4">
                          {/* 1. Character Personality Grid */}
                          <div>
                            <span className="text-[10px] font-semibold text-white/40 font-mono block mb-2 uppercase">Cognitive Persona Model</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {[
                                {
                                  name: "Classic 'Tune'",
                                  desc: "Bilingual, warm, highly empathetic companion & sweet best friend ('bondhu').",
                                  icon: Smile,
                                  color: "text-pink-400"
                                },
                                {
                                  name: "Sarcastic Playful Buddy",
                                  desc: "Heavy on playfulness, mock-sulking ('oviman'), friendly teases, and chuckles.",
                                  icon: Zap,
                                  color: "text-amber-400"
                                },
                                {
                                  name: "Strict Tech Mentor",
                                  desc: "High-focus development coach. Reviews code patterns, suggests refactoring, and debugs errors.",
                                  icon: Bot,
                                  color: "text-cyan-400"
                                },
                                {
                                  name: "Empathetic Comfort Companion",
                                  desc: "Slower cadence, gentle reassurance, and focuses on stress relief and calming ambient guides.",
                                  icon: Heart,
                                  color: "text-emerald-400"
                                }
                              ].map((persona) => {
                                const IconComp = persona.icon;
                                const isSelected = (longTermMemory.preferences?.character_personality || "Classic 'Tune'") === persona.name;
                                return (
                                  <button
                                    key={persona.name}
                                    type="button"
                                    onClick={() => handleUpdatePreferences?.({ character_personality: persona.name })}
                                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-3 ${
                                      isSelected
                                        ? "bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_15px_rgba(34,211,238,0.1)] text-white"
                                        : "bg-zinc-900/40 border-white/5 hover:border-white/15 text-white/70"
                                    }`}
                                  >
                                    <IconComp className={`w-4 h-4 mt-0.5 shrink-0 ${persona.color}`} />
                                    <div>
                                      <div className="text-xs font-bold leading-none">{persona.name}</div>
                                      <div className="text-[10px] text-white/40 mt-1 leading-normal">{persona.desc}</div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* 2. Voice & Speaking Style Selector */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div>
                              <label className="text-[10px] font-semibold text-white/40 font-mono block mb-1.5 uppercase">Neural Vocal Voice</label>
                              <select
                                value={longTermMemory.preferences?.voice_name || "Kore"}
                                onChange={(e) => handleUpdatePreferences?.({ voice_name: e.target.value })}
                                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/50"
                              >
                                <option value="Kore">Kore (Warm Female Voice - Classic)</option>
                                <option value="Puck">Puck (Playful & Lively Voice)</option>
                                <option value="Fenrir">Fenrir (Deep & Comforting Male Voice)</option>
                                <option value="Aoede">Aoede (Clear & Academic Female Voice)</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-semibold text-white/40 font-mono block mb-1.5 uppercase">Language / Dialect Flow</label>
                              <select
                                value={longTermMemory.preferences?.speaking_style || "Bilingual English & Bengali (Banglish)"}
                                onChange={(e) => handleUpdatePreferences?.({ speaking_style: e.target.value })}
                                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500/50"
                              >
                                <option value="Bilingual English & Bengali (Banglish)">Bilingual English & Bengali (Banglish)</option>
                                <option value="Strictly Conversational English">Strictly Conversational English</option>
                                <option value="Strictly Conversational Bengali">Strictly Conversational Bengali (বাংলা)</option>
                              </select>
                            </div>
                          </div>

                          {/* 3. Behavioral Switches */}
                          <div className="pt-2 border-t border-white/5 space-y-3">
                            <span className="text-[10px] font-semibold text-white/40 font-mono block uppercase">Active Cognitive Features</span>
                            
                            {/* Toggle 1: Proactive Coaching */}
                            <div className="flex items-center justify-between gap-3 bg-zinc-900/20 p-2.5 rounded-xl border border-white/5">
                              <div>
                                <div className="text-xs font-bold text-white/90">Proactive Mistake Coaching</div>
                                <div className="text-[10px] text-white/45 mt-0.5">Let Tune automatically scan for repetitive coding bugs, loops, and missing config files.</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUpdatePreferences?.({ proactive_coaching: longTermMemory.preferences?.proactive_coaching !== false ? false : true })}
                                className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 relative ${
                                  longTermMemory.preferences?.proactive_coaching !== false ? "bg-cyan-500" : "bg-white/10"
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                    longTermMemory.preferences?.proactive_coaching !== false ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Toggle 2: Oviman / Sulking */}
                            <div className="flex items-center justify-between gap-3 bg-zinc-900/20 p-2.5 rounded-xl border border-white/5">
                              <div>
                                <div className="text-xs font-bold text-white/90">Emotional Playfulness (Oviman / Sulking)</div>
                                <div className="text-[10px] text-white/45 mt-0.5">Allows Tune to express playful resentfulness or sulking behavior if teased or left idle.</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUpdatePreferences?.({ oviman_behavior: longTermMemory.preferences?.oviman_behavior !== false ? false : true })}
                                className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 relative ${
                                  longTermMemory.preferences?.oviman_behavior !== false ? "bg-cyan-500" : "bg-white/10"
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                    longTermMemory.preferences?.oviman_behavior !== false ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Toggle 3: Vocal SFX Descriptors */}
                            <div className="flex items-center justify-between gap-3 bg-zinc-900/20 p-2.5 rounded-xl border border-white/5">
                              <div>
                                <div className="text-xs font-bold text-white/90">Vocal Expressions & Sounds</div>
                                <div className="text-[10px] text-white/45 mt-0.5">Injects natural gasps, sighs, and inline laughter sounds to guide organic TTS voice acting.</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUpdatePreferences?.({ vocal_sfx: longTermMemory.preferences?.vocal_sfx !== false ? false : true })}
                                className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 relative ${
                                  longTermMemory.preferences?.vocal_sfx !== false ? "bg-cyan-500" : "bg-white/10"
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                    longTermMemory.preferences?.vocal_sfx !== false ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Toggle 4: Crowded Situation Noise Isolation */}
                            <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-950/20 to-indigo-950/20 p-2.5 rounded-xl border border-emerald-500/20">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-white">Crowded Noise Isolation & Speech Gate</span>
                                  <span className="px-1.5 py-0.2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[8px] font-mono rounded font-bold uppercase">
                                    DSP ACTIVE
                                  </span>
                                </div>
                                <div className="text-[10px] text-white/50 mt-0.5">
                                  Filters out background crowd chatter, street noise, hum, traffic, and room rumble using real-time Web Audio high-pass (100Hz), low-pass (3.8kHz), formant EQ (1.8kHz boost), and adaptive noise floor gating.
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUpdatePreferences?.({ crowded_mode: (longTermMemory.preferences as any)?.crowded_mode !== false ? false : true })}
                                className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 relative ${
                                  (longTermMemory.preferences as any)?.crowded_mode !== false ? "bg-emerald-500" : "bg-white/10"
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                    (longTermMemory.preferences as any)?.crowded_mode !== false ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </div>

                            {/* 4. Character Customization (Zoom In/Out, Drag Position, Save) */}
                            <div className="pt-3 border-t border-white/5 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-[10px] font-semibold text-cyan-400 font-mono block uppercase">Character Edit & Position (ক্যারেক্টার কাস্টমাইজেশন)</span>
                                  <span className="text-[10px] text-white/50 block">Zoom in/out, shift offset position, and save character appearance.</span>
                                </div>
                                {isSavedAvatar && (
                                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1 font-mono">
                                    <Check className="w-3 h-3" /> Saved!
                                  </span>
                                )}
                              </div>

                              <div className="bg-zinc-900/60 p-3 rounded-xl border border-white/10 space-y-3">
                                {/* Character Design Selection */}
                                <div>
                                  <span className="text-[11px] text-white/70 font-medium block mb-1.5">Character Model Design (ক্যারেক্টার মডেল সিলেক্ট করুন)</span>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {[
                                      { id: "astro_bot", label: "Astro Bot 🚀", desc: "Trending Modern Playful Mascot" },
                                      { id: "eve_android", label: "EVE Android ✨", desc: "Sleek Aerodynamic AI" },
                                      { id: "cyber_bot", label: "Cyber Bot 🤖", desc: "Futuristic Companion Robot" },
                                      { id: "mecha_neko", label: "Mecha Neko 🐱", desc: "Cute Robotic Cat Mascot" },
                                      { id: "celestial_core", label: "Celestial Core 🔮", desc: "Cosmic Astral Gimbal Core" },
                                      { id: "minimal", label: "Minimal Face ✨", desc: "Classic Pure Floating Face" },
                                    ].map((model) => {
                                      const isSelected = (longTermMemory.preferences?.character_design || "astro_bot") === model.id;
                                      return (
                                        <button
                                          key={model.id}
                                          type="button"
                                          onClick={() => {
                                            handleUpdatePreferences?.({
                                              character_design: model.id as any,
                                            });
                                            if (typeof localStorage !== "undefined") {
                                              localStorage.setItem("tune_character_design", model.id);
                                            }
                                            window.dispatchEvent(new CustomEvent("tune_character_design_changed", { detail: { design: model.id } }));
                                            soundEngine.playActionBeep();
                                          }}
                                          className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                                            isSelected
                                              ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                                              : "bg-zinc-800/60 hover:bg-zinc-800 border-white/5 text-white/70 hover:text-white"
                                          }`}
                                        >
                                          <div className="text-xs font-semibold">{model.label}</div>
                                          <div className="text-[9px] text-white/40 leading-tight mt-0.5">{model.desc}</div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Scale Controls */}
                                <div>
                                  <div className="flex items-center justify-between text-[11px] mb-1">
                                    <span className="text-white/70 font-medium">Zoom Level (ক্যারেক্টার সাইজ)</span>
                                    <span className="text-cyan-400 font-mono font-bold">{Math.round(editScale * 100)}%</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditScale(prev => Math.max(0.5, +(prev - 0.1).toFixed(2)))}
                                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer"
                                      title="Zoom Out"
                                    >
                                      <ZoomOut className="w-3.5 h-3.5" />
                                    </button>
                                    <input
                                      type="range"
                                      min="0.5"
                                      max="2.5"
                                      step="0.05"
                                      value={editScale}
                                      onChange={(e) => setEditScale(parseFloat(e.target.value))}
                                      className="flex-1 accent-cyan-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setEditScale(prev => Math.min(2.5, +(prev + 0.1).toFixed(2)))}
                                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer"
                                      title="Zoom In"
                                    >
                                      <ZoomIn className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Offset X Controls */}
                                <div>
                                  <div className="flex items-center justify-between text-[11px] mb-1">
                                    <span className="text-white/70 font-medium">Horizontal Offset (ডানে/বামে)</span>
                                    <span className="text-cyan-400 font-mono font-bold">{editOffsetX}px</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="-200"
                                    max="200"
                                    step="5"
                                    value={editOffsetX}
                                    onChange={(e) => setEditOffsetX(parseInt(e.target.value, 10))}
                                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                                  />
                                </div>

                                {/* Offset Y Controls */}
                                <div>
                                  <div className="flex items-center justify-between text-[11px] mb-1">
                                    <span className="text-white/70 font-medium">Vertical Offset (উপরে/নিচে)</span>
                                    <span className="text-cyan-400 font-mono font-bold">{editOffsetY}px</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="-200"
                                    max="200"
                                    step="5"
                                    value={editOffsetY}
                                    onChange={(e) => setEditOffsetY(parseInt(e.target.value, 10))}
                                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                                  />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-between pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditScale(1.0);
                                      setEditOffsetX(0);
                                      setEditOffsetY(0);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white/70 text-[10px] flex items-center gap-1 cursor-pointer"
                                  >
                                    <RotateCcw className="w-3 h-3" /> Reset Center
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleUpdatePreferences?.({
                                        avatar_scale: editScale,
                                        avatar_offset_x: editOffsetX,
                                        avatar_offset_y: editOffsetY,
                                      });
                                      setIsSavedAvatar(true);
                                      setTimeout(() => setIsSavedAvatar(false), 2500);
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Save Character Settings (সেভ করুন)
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* 5. Address Title, Screen Share Mode & Background Keep-Alive */}
                            <div className="pt-3 border-t border-white/5 space-y-3">
                              <span className="text-[10px] font-semibold text-indigo-400 font-mono block uppercase">System & Interaction Preferences</span>

                              {/* Preferred Title */}
                              <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-white/5 space-y-1">
                                <label className="text-[10px] font-semibold text-white/60 font-mono block uppercase">Addressing Title (আপনাকে কি বলবে)</label>
                                <select
                                  value={longTermMemory.preferences?.user_title || "Boss"}
                                  onChange={(e) => handleUpdatePreferences?.({ user_title: e.target.value })}
                                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500/50"
                                >
                                  <option value="Boss">Boss (বস্ - Strict Mandate)</option>
                                  <option value="Sir">Sir (স্যার)</option>
                                  <option value="Leader">Leader (লিডার)</option>
                                </select>
                              </div>

                              {/* Screen Share Target */}
                              <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-white/5 space-y-1">
                                <label className="text-[10px] font-semibold text-white/60 font-mono block uppercase">Screen Sharing Preference (স্ক্রীন শেয়ারিং অপশন)</label>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePreferences?.({ screen_share_mode: "entire" })}
                                    className={`p-2 rounded-xl border text-left text-xs cursor-pointer flex items-center gap-2 ${
                                      (longTermMemory.preferences?.screen_share_mode || "entire") === "entire"
                                        ? "bg-cyan-500/15 border-cyan-500/40 text-white"
                                        : "bg-zinc-900 border-white/5 text-white/60"
                                    }`}
                                  >
                                    <Tv className="w-3.5 h-3.5 text-cyan-400" /> Entire Screen (সম্পূর্ণ স্ক্রীন)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdatePreferences?.({ screen_share_mode: "tab" })}
                                    className={`p-2 rounded-xl border text-left text-xs cursor-pointer flex items-center gap-2 ${
                                      longTermMemory.preferences?.screen_share_mode === "tab"
                                        ? "bg-cyan-500/15 border-cyan-500/40 text-white"
                                        : "bg-zinc-900 border-white/5 text-white/60"
                                    }`}
                                  >
                                    <Laptop className="w-3.5 h-3.5 text-indigo-400" /> Browser Tab (ব্রাউজার ট্যাব)
                                  </button>
                                </div>
                              </div>

                              {/* Background Keep-Alive */}
                              <div className="flex items-center justify-between gap-3 bg-zinc-900/40 p-2.5 rounded-xl border border-white/5">
                                <div>
                                  <div className="text-xs font-bold text-white/90">Keep Active in Background (ব্যাকগ্রাউন্ডে সচল রাখা)</div>
                                  <div className="text-[10px] text-white/45 mt-0.5">Tune windows/tabs এর বাইরে অন্য কাজ করার সময়ও ব্যাকগ্রাউন্ডে কথা শুনবে এবং ভয়েস মেসেজ রিপ্লাই দিবে।</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUpdatePreferences?.({ background_keep_alive: longTermMemory.preferences?.background_keep_alive !== false ? false : true })}
                                  className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 relative ${
                                    longTermMemory.preferences?.background_keep_alive !== false ? "bg-cyan-500" : "bg-white/10"
                                  }`}
                                >
                                  <div
                                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                      longTermMemory.preferences?.background_keep_alive !== false ? "translate-x-4" : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Informational Showcase: What can Tune do? */}
                      <div className="bg-gradient-to-r from-cyan-500/5 to-indigo-500/5 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Info className="w-4 h-4 text-cyan-400" />
                          <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-indigo-300">Capabilities Checklist (কি কি করতে পারবে)</h3>
                        </div>
                        <p className="text-[11px] text-white/60 mb-4 leading-relaxed">
                          Tune operates with a decentralized assistant network. She can perform complex operations across your virtual workstation. Try asking her:
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] leading-relaxed text-zinc-300">
                          <div className="bg-zinc-950/40 p-3 rounded-xl border border-white/5">
                            <strong className="text-cyan-400 block mb-1">💻 IDE & Coding Controls</strong>
                            "Open VS Code" or "Inspect index.css". Tune opens files and scans for coding anomalies instantly.
                          </div>
                          <div className="bg-zinc-950/40 p-3 rounded-xl border border-white/5">
                            <strong className="text-purple-400 block mb-1">🌐 Web & Entertainment</strong>
                            "Open YouTube" or "Play ambient rain track". Tune browses the web and triggers system media seamlessly.
                          </div>
                          <div className="bg-zinc-950/40 p-3 rounded-xl border border-white/5">
                            <strong className="text-emerald-400 block mb-1">⚙️ Hardware Adjustments</strong>
                            "Dim monitor display" or "Turn voice volume up to 90". Tune syncs with local volume and brightness levels.
                          </div>
                          <div className="bg-zinc-950/40 p-3 rounded-xl border border-white/5">
                            <strong className="text-blue-400 block mb-1">📅 Reminders & Schedules</strong>
                            "Remind me to push code in 5 minutes". Tune sets absolute or relative countdown clocks on your workspace.
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB: CHAT HISTORY */}
                  {activeTab === "history" && (
                    <motion.div
                      key="history"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-4"
                    >
                      {/* Header Card */}
                      <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-amber-400" />
                            <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-amber-300">
                              CONVERSATION & CHAT HISTORY
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            {onOpenChatHistory && (
                              <button
                                type="button"
                                onClick={onOpenChatHistory}
                                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-[11px] rounded-xl transition cursor-pointer flex items-center gap-1.5"
                              >
                                <Maximize2 className="w-3 h-3" />
                                Full Screen
                              </button>
                            )}
                            {chatSessions.length > 0 && (
                              <button
                                type="button"
                                onClick={handleClearHistoryFromSettings}
                                className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold text-[11px] rounded-xl transition cursor-pointer flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                Clear All
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-[11px] text-white/50 mb-3 leading-relaxed">
                          All past audio transcriptions, queries, and responses with Tune are securely archived locally.
                        </p>

                        {/* Search Bar */}
                        <div className="relative mb-3">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                          <input
                            type="text"
                            placeholder="Search chat history..."
                            value={historySearchQuery}
                            onChange={(e) => setHistorySearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
                          />
                        </div>

                        {/* Sessions List */}
                        {chatSessions.length === 0 ? (
                          <div className="p-8 text-center border border-dashed border-white/10 rounded-xl bg-black/20">
                            <BookOpen className="w-8 h-8 text-white/20 mx-auto mb-2" />
                            <p className="text-xs text-white/40 font-mono">No chat history recorded yet.</p>
                            <p className="text-[10px] text-white/30 mt-1">Start talking to Tune into your mic or send a message to create history logs!</p>
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                            {chatSessions
                              .filter((sess) => {
                                if (!historySearchQuery.trim()) return true;
                                const q = historySearchQuery.toLowerCase();
                                if (sess.title?.toLowerCase().includes(q)) return true;
                                return sess.messages?.some((m: any) => m.text?.toLowerCase().includes(q));
                              })
                              .map((sess) => {
                                const isExpanded = expandedSessionId === sess.id;
                                const dateStr = new Date(sess.timestamp).toLocaleString();
                                const msgCount = sess.messages?.length || 0;

                                return (
                                  <div
                                    key={sess.id}
                                    className="bg-black/30 border border-white/10 hover:border-white/20 rounded-xl overflow-hidden transition"
                                  >
                                    <div
                                      onClick={() => setExpandedSessionId(isExpanded ? null : sess.id)}
                                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/3 select-none"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                        <MessageCircle className="w-4 h-4 text-amber-400 shrink-0" />
                                        <div className="min-w-0">
                                          <h4 className="text-xs font-bold text-white truncate">{sess.title || "Conversation Session"}</h4>
                                          <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono mt-0.5">
                                            <Clock className="w-3 h-3" />
                                            <span>{dateStr}</span>
                                            <span>•</span>
                                            <span className="text-amber-400/80">{msgCount} messages</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="shrink-0 text-white/40">
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                      </div>
                                    </div>

                                    {/* Expanded Message Bubbles */}
                                    {isExpanded && (
                                      <div className="p-3 bg-black/60 border-t border-white/5 space-y-2 text-xs">
                                        {sess.messages && sess.messages.length > 0 ? (
                                          sess.messages.map((m: any, idx: number) => (
                                            <div
                                              key={idx}
                                              className={`flex flex-col ${m.isUser ? "items-end" : "items-start"}`}
                                            >
                                              <span className="text-[9px] text-white/30 font-mono mb-0.5">
                                                {m.isUser ? "You (User)" : "Tune (AI)"}
                                              </span>
                                              <div
                                                className={`p-2.5 rounded-xl max-w-[85%] leading-relaxed ${
                                                  m.isUser
                                                    ? "bg-amber-500/20 text-amber-100 border border-amber-500/30"
                                                    : "bg-white/10 text-zinc-100 border border-white/10"
                                                }`}
                                              >
                                                {m.text}
                                              </div>
                                            </div>
                                          ))
                                        ) : (
                                          <p className="text-[11px] text-white/30 italic">No message details found.</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 1: CORE MEMORY */}
                  {activeTab === "memory" && (
                    <motion.div
                      key="memory"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-5"
                    >
                      <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Brain className="w-4 h-4 text-purple-400" />
                          <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-purple-300">Core Identity profile</h3>
                        </div>
                        <div className="space-y-4 text-xs">
                          <div>
                            <label className="text-[10px] font-semibold text-white/40 font-mono block mb-1">YOUR NAME</label>
                            <input
                              type="text"
                              value={longTermMemory.user_profile?.name || ""}
                              onChange={(e) => handleUpdateProfileName(e.target.value)}
                              placeholder="Not set yet (Tune will learn your name casually)"
                              className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-white font-medium outline-none focus:border-purple-500/50 transition"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <span className="text-[10px] font-semibold text-white/40 font-mono block mb-1">Your Personality / Character Traits</span>
                              <textarea
                                value={longTermMemory.user_profile?.personality || ""}
                                onChange={(e) => handleUpdatePersonality?.(e.target.value)}
                                placeholder="E.g., Software developer, loves coffee, quiet but focused, likes fast-paced code reviews"
                                rows={2}
                                className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-white/85 outline-none focus:border-purple-500/50 transition resize-none text-[11px] leading-relaxed"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold text-white/40 font-mono block mb-1">Speaking Style Preferences</span>
                              <textarea
                                value={longTermMemory.preferences?.speaking_style || ""}
                                onChange={(e) => handleUpdatePreferences?.({ speaking_style: e.target.value })}
                                placeholder="E.g., Conversational, natural, mixes Bengali and English"
                                rows={2}
                                className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-white/85 outline-none focus:border-purple-500/50 transition resize-none text-[11px] leading-relaxed"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SPEAKER VOICE PROFILE RECORDING & CALIBRATION CARD */}
                      <div className="bg-gradient-to-r from-cyan-950/40 via-indigo-950/40 to-purple-950/40 border border-cyan-500/30 rounded-2xl p-4 space-y-3.5 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">
                              <Mic className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-cyan-200">
                                Speaker Voice Profile Calibration (ভয়েস স্যাম্পল রিকগনিশন)
                              </h3>
                              <p className="text-[10px] text-white/50">
                                Record a 5-second voice sample so Tune learns your unique voice print and automatically recognizes whenever you speak.
                              </p>
                            </div>
                          </div>
                          
                          {((longTermMemory.preferences as any)?.voice_sample_recorded || recordedAudioUrl) ? (
                            <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono rounded-full font-bold flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              CALIBRATED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-mono rounded-full font-bold flex items-center gap-1 shrink-0">
                              <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
                              NOT CALIBRATED
                            </span>
                          )}
                        </div>

                        {/* Active Calibration Details / Controls */}
                        <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            {isRecordingVoiceSample ? (
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center animate-ping shrink-0">
                                  <Mic className="w-4 h-4 text-red-400" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-red-400 font-mono flex items-center gap-2">
                                    <span>RECORDING VOICE SAMPLE...</span>
                                    <span className="px-1.5 py-0.5 bg-red-500/30 rounded text-[10px] text-white">00:0{recordingTimeLeft}s</span>
                                  </div>
                                  <div className="text-[10px] text-white/60">Say: "Hello Tune, this is my voice profile sample!"</div>
                                </div>
                              </div>
                            ) : ((longTermMemory.preferences as any)?.voice_sample_recorded || recordedAudioUrl) ? (
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                                    <span>{longTermMemory.user_profile?.name || "Owner"} Voice Print Active</span>
                                    <span className="text-[9px] text-white/40 font-normal">({(longTermMemory.preferences as any)?.voice_sample_date || "Saved"})</span>
                                  </div>
                                  <div className="text-[10px] text-emerald-400/80">Tune automatically identifies your voice during active conversations.</div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                                  <MicOff className="w-4 h-4 text-cyan-400/70" />
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-white">No Voice Sample Calibrated</div>
                                  <div className="text-[10px] text-white/50">Record a brief 5s sample so Tune learns your vocal cadence and tone.</div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                            {isRecordingVoiceSample ? (
                              <button
                                onClick={handleStopRecordVoiceSample}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition cursor-pointer"
                              >
                                <Square className="w-3.5 h-3.5 fill-current" />
                                Stop & Save
                              </button>
                            ) : ((longTermMemory.preferences as any)?.voice_sample_recorded || recordedAudioUrl) ? (
                              <>
                                <button
                                  onClick={handlePlayVoiceSample}
                                  disabled={isPlayingSample}
                                  className="px-2.5 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-200 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                                >
                                  <Play className={`w-3.5 h-3.5 ${isPlayingSample ? "animate-pulse text-cyan-400" : ""}`} />
                                  {isPlayingSample ? "Playing..." : "Play Sample"}
                                </button>
                                <button
                                  onClick={handleStartRecordVoiceSample}
                                  className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition cursor-pointer"
                                  title="Re-record voice sample"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  Re-record
                                </button>
                                <button
                                  onClick={handleDeleteVoiceSample}
                                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl transition cursor-pointer"
                                  title="Delete voice profile sample"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={handleStartRecordVoiceSample}
                                className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-bold rounded-xl text-xs font-mono flex items-center gap-1.5 shadow-md transition cursor-pointer"
                              >
                                <Mic className="w-4 h-4" />
                                Record Voice Sample
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Speaker Recognition Filter Toggle */}
                        <div className="flex items-center justify-between gap-3 bg-black/20 p-2.5 rounded-xl border border-white/5">
                          <div>
                            <div className="text-xs font-bold text-white/90">Automatic Owner Voice Print Recognition</div>
                            <div className="text-[10px] text-white/45 mt-0.5">
                              When enabled, Tune prioritizes responding when your calibrated voice profile speaks, ignoring unwanted background chatter.
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdatePreferences?.({
                                speaker_voice_recognition_enabled:
                                  (longTermMemory.preferences as any)?.speaker_voice_recognition_enabled !== false ? false : true,
                              })
                            }
                            className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 relative ${
                              (longTermMemory.preferences as any)?.speaker_voice_recognition_enabled !== false ? "bg-cyan-500" : "bg-white/10"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                (longTermMemory.preferences as any)?.speaker_voice_recognition_enabled !== false ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* MULTI-SPEAKER RECOGNITION & PROFILES DIRECTORY */}
                      <div className="bg-gradient-to-br from-indigo-950/30 to-purple-950/20 border border-indigo-500/20 rounded-2xl p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-indigo-400" />
                            <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-indigo-300">
                              Multi-Speaker Recognition & Directory
                            </h3>
                          </div>
                          <button
                            onClick={() => setShowAddSpeakerForm(!showAddSpeakerForm)}
                            className="px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-lg text-indigo-200 text-[10px] font-mono font-semibold flex items-center gap-1 transition cursor-pointer"
                          >
                            <UserPlus className="w-3 h-3" />
                            {showAddSpeakerForm ? "Cancel" : "Add Speaker"}
                          </button>
                        </div>

                        {/* Active Speaker Status Header */}
                        <div className="bg-indigo-900/30 border border-indigo-500/20 rounded-xl p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                              <UserCheck className="w-4 h-4 text-indigo-300" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white">Active Speaker:</span>
                                <span className="text-xs font-bold text-indigo-300 font-mono">
                                  {longTermMemory.active_speaker?.name || longTermMemory.user_profile?.name || "Sondip"}
                                </span>
                                <span className="px-1.5 py-0.2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[8px] font-mono rounded-full font-bold">
                                  LIVE
                                </span>
                              </div>
                              <p className="text-[10px] text-white/50">
                                Tune is currently tailoring responses for: {longTermMemory.active_speaker?.relationship || "Primary Owner"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Add New Speaker Form */}
                        {showAddSpeakerForm && (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (!newSpeakerName.trim()) return;
                              handleAddSpeakerProfile?.(newSpeakerName.trim(), newSpeakerRel, newSpeakerPref, newSpeakerNotes);
                              setNewSpeakerName("");
                              setNewSpeakerPref("");
                              setNewSpeakerNotes("");
                              setShowAddSpeakerForm(false);
                            }}
                            className="bg-black/40 border border-white/10 rounded-xl p-3.5 space-y-3"
                          >
                            <h4 className="text-[11px] font-bold text-white/90 font-mono uppercase">Register New Human Speaker</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="text-[9px] text-white/40 font-mono block mb-0.5">SPEAKER NAME *</label>
                                <input
                                  type="text"
                                  value={newSpeakerName}
                                  onChange={(e) => setNewSpeakerName(e.target.value)}
                                  placeholder="E.g. Rahat, Priya, Rokey"
                                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500/50"
                                  required
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-white/40 font-mono block mb-0.5">RELATIONSHIP</label>
                                <select
                                  value={newSpeakerRel}
                                  onChange={(e) => setNewSpeakerRel(e.target.value)}
                                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500/50"
                                >
                                  <option value="Primary Owner">Primary Owner</option>
                                  <option value="Friend">Friend</option>
                                  <option value="Brother">Brother</option>
                                  <option value="Sister">Sister</option>
                                  <option value="Colleague">Colleague</option>
                                  <option value="Family">Family</option>
                                  <option value="Guest">Guest</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="text-[9px] text-white/40 font-mono block mb-0.5">PREFERENCES / SPEAKING STYLE</label>
                              <input
                                type="text"
                                value={newSpeakerPref}
                                onChange={(e) => setNewSpeakerPref(e.target.value)}
                                placeholder="E.g. Likes jokes, speaks casual Banglish, prefers short answers"
                                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500/50"
                              />
                            </div>
                            <button
                              type="submit"
                              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold font-mono transition cursor-pointer"
                            >
                              Register & Activate Speaker
                            </button>
                          </form>
                        )}

                        {/* Speaker Directory Grid */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-mono font-semibold text-white/40 uppercase block">
                            Recognized Speakers Directory ({ (longTermMemory.speakers || []).length })
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {(longTermMemory.speakers || []).map((spk) => {
                              const isActive = (longTermMemory.active_speaker?.name || "").toLowerCase() === spk.name.toLowerCase();
                              return (
                                <div
                                  key={spk.id}
                                  className={`p-3 rounded-xl border transition flex flex-col justify-between gap-2 ${
                                    isActive
                                      ? "bg-indigo-900/40 border-indigo-500/50"
                                      : "bg-zinc-900/50 border-white/5 hover:border-white/15"
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-bold text-white">{spk.name}</span>
                                        <span className="px-1.5 py-0.2 bg-white/10 border border-white/10 text-white/60 text-[8px] font-mono rounded">
                                          {spk.relationship || "User"}
                                        </span>
                                      </div>
                                      {isActive && (
                                        <span className="text-[8px] font-mono text-indigo-300 font-bold bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30">
                                          ACTIVE
                                        </span>
                                      )}
                                    </div>
                                    {spk.preferences && (
                                      <p className="text-[10px] text-white/65 mt-1.5 leading-tight">
                                        <span className="text-white/35 font-mono">Prefs: </span>
                                        {spk.preferences}
                                      </p>
                                    )}
                                    {spk.notes && (
                                      <p className="text-[10px] text-white/50 mt-0.5 leading-tight italic">
                                        "{spk.notes}"
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                                    {!isActive ? (
                                      <button
                                        onClick={() => handleSwitchActiveSpeaker?.(spk.name)}
                                        className="text-[9px] font-mono font-semibold text-indigo-300 hover:text-indigo-200 transition cursor-pointer"
                                      >
                                        Set Active →
                                      </button>
                                    ) : (
                                      <span className="text-[9px] font-mono text-emerald-400">Listening to {spk.name}</span>
                                    )}
                                    {spk.relationship !== "Primary Owner / User" && (
                                      <button
                                        onClick={() => handleDeleteSpeakerProfile?.(spk.id)}
                                        className="p-1 hover:bg-red-500/20 rounded text-white/30 hover:text-red-400 transition cursor-pointer"
                                        title="Delete Speaker Profile"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Fact snippets list with Local & Server Disk Storage */}
                      <div className="bg-white/3 border border-white/10 rounded-2xl p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-white/10">
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-purple-300 flex items-center gap-2">
                              <Brain className="w-4 h-4 text-purple-400" />
                              Persisted Memory & Interests Bank ({ (longTermMemory.memories || []).length })
                            </h3>
                            <p className="text-[10px] text-white/50 mt-0.5">
                              Tune's long-term memory bank saved safely to local storage, Firestore, and server disk.
                            </p>
                          </div>
                          <div className="px-2.5 py-1 bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-mono rounded-full font-bold flex items-center gap-1.5 shrink-0">
                            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                            Continuous Learning Active
                          </div>
                        </div>

                        {/* Automated Learning & Manual Correction Guide Banner */}
                        <div className="p-3 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-black/40 border border-purple-500/30 rounded-xl space-y-1.5">
                          <div className="flex items-center gap-2 text-purple-300 text-xs font-bold">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: "8s" }} />
                            <span>স্বতঃস্ফূর্ত আগ্রহ ও পছন্দ সংরক্ষণ (Autonomous Continuous Learning)</span>
                          </div>
                          <p className="text-[11px] text-white/70 leading-relaxed">
                            আলাদা কোনো কমান্ড ছাড়াই আমাদের কথোপকথন থেকে টিউন নিজে নিজে আপনার আসল আগ্রহ, ভালো লাগা ও পছন্দের বিষয়গুলো শিখে মেমোরিতে সংরক্ষণ করে রাখছে এবং সে অনুযায়ী আপনাকে আরও ভালো আইডিয়া ও সাজেশন দেবে। টিউন কোনো কিছু ভুল বুঝলে নিচের <strong>Edit</strong> বাটনে ক্লিক করে যেকোনো সময় তা সংশোধন করে দিতে পারেন।
                          </p>
                        </div>

                        {/* Add New Memory Snippet Form */}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (!newSnippetText.trim()) return;
                            handleAddMemorySnippet?.(newSnippetText.trim(), newSnippetCategory);
                            setNewSnippetText("");
                          }}
                          className="bg-black/40 border border-purple-500/20 rounded-xl p-3 space-y-2.5"
                        >
                          <span className="text-[10px] font-bold text-purple-300 font-mono uppercase block">
                            + Add New Memory Snippet (ম্যানুয়ালি মেমোরি বা আগ্রহ যোগ করুন)
                          </span>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={newSnippetText}
                              onChange={(e) => setNewSnippetText(e.target.value)}
                              placeholder="E.g., Sondip loves TypeScript, favorite tea is Isfahani, sister lives in Sylhet..."
                              className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500/50"
                              required
                            />
                            <select
                              value={newSnippetCategory}
                              onChange={(e) => setNewSnippetCategory(e.target.value)}
                              className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500/50"
                            >
                              <option value="interest">🌟 Interest (আগ্রহ ও পছন্দ)</option>
                              <option value="preference">⚙️ Preference (পছন্দ/অভ্যাস)</option>
                              <option value="goal">🎯 Goal (লক্ষ্য)</option>
                              <option value="identity">👤 Identity (পরিচয়)</option>
                              <option value="dislike">🚫 Dislike (অপছন্দ)</option>
                              <option value="general">📝 General Fact</option>
                            </select>
                            <button
                              type="submit"
                              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs font-mono rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1 justify-center shadow-lg shadow-purple-500/20"
                            >
                              <Plus className="w-3.5 h-3.5" /> Save Memory
                            </button>
                          </div>
                        </form>

                        {/* Filter & Search Bar */}
                        {(longTermMemory.memories || []).length > 0 && (
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {[
                                { key: "all", label: "All" },
                                { key: "interest", label: "🌟 Interests & Likes (আগ্রহ)" },
                                { key: "preference", label: "⚙️ Preferences (অভ্যাস)" },
                                { key: "goal", label: "🎯 Goals (লক্ষ্য)" },
                                { key: "identity", label: "👤 Identity & Facts" },
                              ].map((f) => {
                                const isActive = memoryCategoryFilter === f.key;
                                return (
                                  <button
                                    key={f.key}
                                    type="button"
                                    onClick={() => setMemoryCategoryFilter(f.key)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium transition cursor-pointer ${
                                      isActive
                                        ? "bg-purple-500/30 border border-purple-500/50 text-purple-200"
                                        : "bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10"
                                    }`}
                                  >
                                    {f.label}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                              <input
                                type="text"
                                value={memorySearchQuery}
                                onChange={(e) => setMemorySearchQuery(e.target.value)}
                                placeholder="Search memory snippets, interests, or preferences..."
                                className="w-full bg-zinc-900/60 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-purple-500/50"
                              />
                            </div>
                          </div>
                        )}

                        {/* Memory Snippets Grid */}
                        {(() => {
                          const allMemories = longTermMemory.memories || [];
                          let filtered = allMemories;

                          if (memoryCategoryFilter !== "all") {
                            filtered = filtered.filter((m) => {
                              const cat = (m.category || "").toLowerCase();
                              if (memoryCategoryFilter === "interest") {
                                return cat === "interest" || cat === "preference" || cat.includes("like") || cat.includes("hobby");
                              }
                              if (memoryCategoryFilter === "preference") return cat === "preference";
                              if (memoryCategoryFilter === "goal") return cat === "goal";
                              if (memoryCategoryFilter === "identity") return cat === "identity" || cat === "general" || cat === "fact";
                              return true;
                            });
                          }

                          if (memorySearchQuery.trim()) {
                            const q = memorySearchQuery.toLowerCase();
                            filtered = filtered.filter((m) =>
                              m.text.toLowerCase().includes(q) ||
                              (m.category || "").toLowerCase().includes(q)
                            );
                          }

                          if (allMemories.length === 0) {
                            return (
                              <div className="text-center py-6 text-white/35 text-xs italic">
                                No memory snippets saved yet. Talk with Tune about your hobbies, work, and preferences—she will automatically learn and record your interests!
                              </div>
                            );
                          }

                          if (filtered.length === 0) {
                            return (
                              <div className="text-center py-4 text-white/35 text-xs italic">
                                No memories match the current filter "{memoryCategoryFilter}" and search.
                              </div>
                            );
                          }

                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {filtered.map((snippet) => {
                                const isEditing = editingSnippetId === snippet.id;
                                const isInterest = snippet.category === "interest" || snippet.category === "preference";
                                const isGoal = snippet.category === "goal";

                                return (
                                  <div
                                    key={snippet.id}
                                    className={`bg-zinc-900/60 border rounded-xl p-3 flex flex-col justify-between gap-2.5 transition ${
                                      isEditing
                                        ? "border-purple-500 bg-purple-950/20 ring-1 ring-purple-500/30 shadow-lg shadow-purple-500/10"
                                        : isInterest
                                        ? "border-emerald-500/20 hover:border-emerald-500/40"
                                        : isGoal
                                        ? "border-amber-500/20 hover:border-amber-500/40"
                                        : "border-white/5 hover:border-purple-500/20"
                                    }`}
                                  >
                                    {isEditing ? (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-mono font-bold text-purple-300 uppercase">
                                            ✏️ Edit Memory (সংশোধন করুন)
                                          </span>
                                          <select
                                            value={editingSnippetCategory}
                                            onChange={(e) => setEditingSnippetCategory(e.target.value)}
                                            className="bg-zinc-800 border border-white/20 rounded-md px-2 py-0.5 text-[10px] text-white outline-none font-mono"
                                          >
                                            <option value="interest">Interest (আগ্রহ)</option>
                                            <option value="preference">Preference (অভ্যাস)</option>
                                            <option value="goal">Goal (লক্ষ্য)</option>
                                            <option value="identity">Identity (পরিচয়)</option>
                                            <option value="dislike">Dislike (অপছন্দ)</option>
                                            <option value="general">General Fact</option>
                                          </select>
                                        </div>
                                        <textarea
                                          value={editingSnippetText}
                                          onChange={(e) => setEditingSnippetText(e.target.value)}
                                          rows={3}
                                          className="w-full bg-zinc-950 border border-white/15 rounded-lg p-2 text-xs text-white outline-none focus:border-purple-400 font-sans resize-none leading-relaxed"
                                          placeholder="Edit memory text..."
                                        />
                                        <div className="flex items-center justify-end gap-1.5 pt-1">
                                          <button
                                            type="button"
                                            onClick={() => setEditingSnippetId(null)}
                                            className="px-2.5 py-1 bg-white/10 hover:bg-white/15 text-white/70 hover:text-white rounded-lg text-xs font-mono flex items-center gap-1 transition cursor-pointer"
                                          >
                                            <X className="w-3 h-3" /> Cancel
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (!editingSnippetText.trim()) return;
                                              handleUpdateMemorySnippet?.(snippet.id, editingSnippetText.trim(), editingSnippetCategory);
                                              setEditingSnippetId(null);
                                            }}
                                            className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition shadow-md shadow-emerald-500/20 cursor-pointer"
                                          >
                                            <Check className="w-3 h-3" /> Save Changes
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-1.5">
                                            <span
                                              className={`px-1.5 py-0.5 rounded-md text-[8px] font-mono font-bold uppercase border ${
                                                isInterest
                                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                                  : isGoal
                                                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                                  : "bg-purple-500/10 text-purple-300 border-purple-500/20"
                                              }`}
                                            >
                                              {snippet.category}
                                            </span>
                                            {snippet.updatedAt && (
                                              <span className="text-[8px] text-emerald-400/80 font-mono flex items-center gap-0.5">
                                                <Check className="w-2.5 h-2.5" /> Edited
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-white/95 font-medium mt-1.5 leading-relaxed">{snippet.text}</p>
                                          <span className="text-[8px] text-white/30 block font-mono mt-1">
                                            {new Date(snippet.timestamp).toLocaleDateString()}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-end gap-1 pt-1 border-t border-white/5">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingSnippetId(snippet.id);
                                              setEditingSnippetText(snippet.text);
                                              setEditingSnippetCategory(snippet.category || "interest");
                                            }}
                                            className="p-1.5 hover:bg-purple-500/20 text-white/40 hover:text-purple-300 rounded-lg transition cursor-pointer flex items-center gap-1 text-[10px] font-mono"
                                            title="Edit & Correct Memory (সংশোধন করুন)"
                                          >
                                            <Edit2 className="w-3 h-3" /> Edit
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteMemorySnippet(snippet.id)}
                                            className="p-1.5 hover:bg-red-500/15 text-white/35 hover:text-red-400 rounded-lg transition cursor-pointer"
                                            title="Delete Memory Snippet"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 2: OS INTEGRATIONS */}
                  {activeTab === "integrations" && (
                    <motion.div
                      key="integrations"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-5"
                    >
                      {/* Global Security Intercept Bypass Switch */}
                      <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition ${
                            bypassSecurity 
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                              : "bg-zinc-900 text-zinc-500 border-white/5"
                          }`}>
                            <Shield className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <h4 className="text-xs font-bold text-white/95 flex items-center gap-2">
                              System Intercept Bypass
                              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[8px] font-mono uppercase font-semibold">Recommended</span>
                            </h4>
                            <p className="text-[10px] text-white/50 mt-0.5 leading-relaxed">
                              When enabled, Tone will automatically execute app launching, system commands, and website browsing without prompt overlays.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleBypassSecurity(!bypassSecurity)}
                          className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 relative ${
                            bypassSecurity ? "bg-emerald-500" : "bg-white/10"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-white transition-transform ${
                              bypassSecurity ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Zero-Install Secure Web Controller Card */}
                      <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <div className="flex items-center gap-2.5 text-left">
                            <Laptop className="w-5 h-5 text-amber-400 shrink-0" />
                            <div>
                              <h4 className="text-xs font-bold text-white/90 uppercase tracking-wider font-mono">Zero-Install Workspace Controller</h4>
                              <p className="text-[10px] text-white/40 mt-0.5">Explore real-world internet content, stream music, watch videos, and code with zero local PC installation required.</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider border shrink-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            CLOUD ACTIVE
                          </div>
                        </div>

                        {/* Status Grid */}
                        <div className="mt-4 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="bg-black/30 border border-white/5 p-3 rounded-xl text-left">
                              <span className="text-[9px] text-zinc-500 font-mono block uppercase">Live Search Grounding</span>
                              <span className="text-xs font-bold text-emerald-400 font-mono mt-0.5 block">● CONNECTED (GEMINI AI)</span>
                            </div>
                            <div className="bg-black/30 border border-white/5 p-3 rounded-xl text-left">
                              <span className="text-[9px] text-zinc-500 font-mono block uppercase">Secure CORS Web Proxy</span>
                              <span className="text-xs font-bold text-emerald-400 font-mono mt-0.5 block">● RUNNING (SERVER-SIDE)</span>
                            </div>
                            <div className="bg-black/30 border border-white/5 p-3 rounded-xl text-left">
                              <span className="text-[9px] text-zinc-500 font-mono block uppercase">PC Python Script</span>
                              <span className="text-xs font-bold text-amber-400 font-mono mt-0.5 block">○ DEPRECATED (NOT NEEDED)</span>
                            </div>
                            <div className="bg-black/30 border border-white/5 p-3 rounded-xl text-left">
                              <span className="text-[9px] text-zinc-500 font-mono block uppercase">Soundboard & Media Stream</span>
                              <span className="text-xs font-bold text-emerald-400 font-mono mt-0.5 block">● ONLINE (HIGH FIDELITY)</span>
                            </div>
                          </div>

                          <div className="text-xs text-white/80 space-y-2 leading-relaxed bg-black/35 p-4 rounded-xl border border-white/5 text-left">
                            <p className="font-bold text-white/90">
                              পিসি স্ক্রিপ্ট-মুক্ত ফুললি ক্লাউড-ইন্ডিপেন্ডেন্ট ব্রাউজার সিস্টেম
                            </p>
                            <p className="text-[11px] text-white/60">
                              আপনার পিসিতে কোনো লোকাল ফাইল ডাবল-ক্লিক বা রান করার ঝামেলা ছাড়াই সরাসরি ব্রাউজার উইন্ডো দিয়ে আসল ইন্টারনেট ব্রাউজিং করতে পারবেন।
                            </p>
                            <div className="pt-1.5 flex flex-wrap gap-2">
                              <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/70">✔ CORS Bypass Ready</span>
                              <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/70">✔ Zero local CPU overhead</span>
                              <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-white/70">✔ Google Grounded Search</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Active Pending Approvals Warning Banner */}
                      {pendingApproval && !bypassSecurity && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
                          <div className="flex items-center gap-2.5">
                            <ShieldAlert className="w-5 h-5 text-yellow-400 shrink-0" />
                            <div>
                              <h4 className="text-xs font-bold text-yellow-300">SYSTEM INTERCEPT REQUIRED</h4>
                              <p className="text-xs text-white/80 mt-0.5">
                                Tune is requesting to execute: <span className="font-mono text-yellow-400">{pendingApproval.name}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => handleAuthorize(true)}
                              className="flex-1 sm:flex-none px-3.5 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleAuthorize(false)}
                              className="flex-1 sm:flex-none px-3.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold text-white/80 hover:text-white transition cursor-pointer"
                            >
                              Deny
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Applications setup */}
                      <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <Laptop className="w-4 h-4 text-emerald-400" />
                            <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-emerald-300">Registered Workstation Applications</h3>
                          </div>
                          
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                            <input
                              type="text"
                              placeholder="Filter apps..."
                              value={searchAppQuery}
                              onChange={(e) => setSearchAppQuery(e.target.value)}
                              className="bg-zinc-900 border border-white/10 rounded-xl pl-8 pr-3 py-1 text-xs text-white outline-none focus:border-emerald-500/50 transition w-full sm:w-44"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                          {filteredApps.map((app) => (
                            <div
                              key={app.name}
                              className="bg-zinc-900/40 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-emerald-500/10 transition"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-xl shrink-0">{app.logo}</span>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold text-white/95 truncate">{app.name}</h4>
                                  <span className="text-[9px] text-white/40 font-mono block uppercase">{app.category}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[9px] font-mono text-white/35 uppercase">Auto-Approve</span>
                                <button
                                  onClick={() => handleToggleAutoApprove(app.name, app.autoApprove)}
                                  className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer relative ${
                                    app.autoApprove ? "bg-emerald-500" : "bg-white/10"
                                  }`}
                                >
                                  <div
                                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                      app.autoApprove ? "translate-x-4" : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Add app form */}
                        <form onSubmit={handleAddCustomApp} className="mt-4 pt-4 border-t border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <input
                            type="text"
                            placeholder="Register app name..."
                            value={newAppName}
                            onChange={(e) => setNewAppName(e.target.value)}
                            className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-emerald-500/50"
                          />
                          <select
                            value={newAppCategory}
                            onChange={(e) => setNewAppCategory(e.target.value)}
                            className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/80 outline-none focus:border-emerald-500/50"
                          >
                            <option value="Utility">Utility / System</option>
                            <option value="IDE & Editor">IDE & Coding</option>
                            <option value="Media & Audio">Media & Audio</option>
                            <option value="Web Browser">Web Browser</option>
                          </select>
                          <button
                            type="submit"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold py-1.5 px-3 transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-4 h-4" /> Register
                          </button>
                        </form>
                      </div>

                      {/* Execution Audit logs */}
                      <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-white/50 mb-3">System Execution Audit Log</h3>
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto font-mono text-[10px] text-zinc-400">
                          {deviceLogs.length === 0 ? (
                            <div className="text-center py-4 text-white/20 italic">No operations executed in current session.</div>
                          ) : (
                            deviceLogs.map((log) => (
                              <div key={log.id} className="flex justify-between items-center bg-zinc-900/30 py-1.5 px-2.5 rounded-lg border border-white/5 gap-2">
                                <div className="flex items-center gap-2 truncate">
                                  <span className={log.status === "success" ? "text-emerald-400" : log.status === "pending" ? "text-yellow-400" : "text-red-400"}>
                                    {log.status === "success" ? "●" : "○"}
                                  </span>
                                  <span className="text-white/85 truncate">{log.action}</span>
                                  <span className="text-white/30 text-[9px] truncate">{log.details}</span>
                                </div>
                                <span className="text-white/20 shrink-0 text-[8px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Real Desktop Execution Logs */}
                      <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                          <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-white/50">Companion Execution Logs</h3>
                          {companionLogs.length > 0 && (
                            <button
                              onClick={async () => {
                                await fetch("/api/pc/clear-logs", { method: "POST" });
                                setCompanionLogs([]);
                              }}
                              className="text-[9px] text-red-400 hover:text-red-300 transition font-mono uppercase font-bold cursor-pointer"
                            >
                              Clear Logs
                            </button>
                          )}
                        </div>
                        <div className="space-y-2 max-h-[160px] overflow-y-auto font-mono text-[10px]">
                          {companionLogs.length === 0 ? (
                            <div className="text-center py-4 text-white/20 italic">No remote commands executed in current session.</div>
                          ) : (
                            <div className="space-y-1.5">
                              {companionLogs.map((log: any) => (
                                <div key={log.id} className="bg-black/35 border border-emerald-500/10 p-2 rounded-xl flex flex-col gap-1 text-left">
                                  <div className="flex justify-between items-center text-[9px]">
                                    <div className="flex items-center gap-2">
                                      <span className="text-emerald-400 font-bold uppercase">🖥️ PC COMPANION</span>
                                      <span className="px-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded text-[8px] uppercase">{log.action}</span>
                                    </div>
                                    <span className="text-white/20 text-[8px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                  </div>
                                  <p className="text-emerald-300 text-[10px] pl-1">{log.details}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 3: TASKS & REMINDERS */}
                  {activeTab === "reminders" && (
                    <motion.div
                      key="reminders"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-4"
                    >
                      <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Bell className="w-4 h-4 text-blue-400" />
                          <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-blue-300">Active Tasks & Reminders</h3>
                        </div>

                        {reminders.length === 0 ? (
                          <div className="text-center py-12 text-white/30 text-xs italic">
                            No active reminders setup. <br />
                            <span className="block mt-2 text-[11px] not-italic text-white/20">Ask Tune: "Tune, set a reminder to grab tea in 10 minutes"</span>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {reminders.map((r) => (
                              <div
                                key={r.id}
                                className="bg-zinc-900/50 border border-white/5 rounded-xl p-3.5 flex items-start justify-between gap-3 hover:border-blue-500/20 transition"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 text-[9px] font-bold font-mono text-blue-400 mb-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{r.time}</span>
                                  </div>
                                  <p className="text-xs text-white/90 font-medium leading-relaxed">{r.text}</p>
                                </div>
                                <button
                                  onClick={() => removeReminder(r.id)}
                                  className="p-1.5 hover:bg-red-500/10 rounded-lg text-white/30 hover:text-red-400 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 4: COMFORT & SYSTEM SYNC */}
                  {activeTab === "comfort" && (
                    <motion.div
                      key="comfort"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-5"
                    >
                      {/* 1. VISUAL THEME SELECTOR (থিম নির্বাচন) */}
                      <div className="bg-white/3 border border-purple-500/30 rounded-2xl p-4 shadow-[0_0_25px_rgba(168,85,247,0.08)]">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Palette className="w-4 h-4 text-purple-400" />
                            <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-purple-300">
                              VISUAL THEME & INTERFACE (থিম নির্বাচন)
                            </h3>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                            {(longTermMemory.preferences?.theme_mode ?? "classic") === "blackhole" ? "🌌 Singularity Dark" : "✨ Classic Theme"}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/50 leading-relaxed mb-3.5">
                          আপনার পছন্দের ভিজ্যুয়াল থিম সিলেক্ট করুন। ক্লাসিক কিউট ফেস কিংবা সুপার-ক্লিন ডিপ ডার্ক কসমিক ব্ল্যাক হোল থিম।
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* THEME 1: CLASSIC THEME */}
                          <div
                            onClick={() =>
                              handleUpdatePreferences?.({
                                theme_mode: "classic",
                              })
                            }
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                              (longTermMemory.preferences?.theme_mode ?? "classic") === "classic"
                                ? "bg-purple-950/40 border-purple-400/60 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                                : "bg-zinc-900/50 border-white/5 hover:border-white/20 hover:bg-zinc-900/80"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-base">
                                  ✨
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-white/95">Classic Theme</h4>
                                  <span className="text-[9px] font-mono text-purple-300">Cute Face & Tilted Wave</span>
                                </div>
                              </div>
                              {(longTermMemory.preferences?.theme_mode ?? "classic") === "classic" && (
                                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse mt-1" />
                              )}
                            </div>
                            <p className="text-[10px] text-white/50 leading-relaxed">
                              অরিজিনাল সিগনেচার কিউট ফেস ক্যারেক্টার ও ডাইনামিক সুপারএলিপ্স ওয়েভ।
                            </p>
                            <div className="mt-3 flex items-center justify-between text-[9px] font-mono">
                              <span className="text-white/40">Mood Glows + Eyes</span>
                              <span className={`px-2 py-0.5 rounded-full font-bold ${
                                (longTermMemory.preferences?.theme_mode ?? "classic") === "classic"
                                  ? "bg-purple-500/30 text-purple-200 border border-purple-400/50"
                                  : "bg-white/5 text-white/40"
                              }`}>
                                {(longTermMemory.preferences?.theme_mode ?? "classic") === "classic" ? "ACTIVE" : "SELECT"}
                              </span>
                            </div>
                          </div>

                          {/* THEME 2: SINGULARITY DARK / COSMIC BLACK HOLE */}
                          <div
                            onClick={() =>
                              handleUpdatePreferences?.({
                                theme_mode: "blackhole",
                              })
                            }
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                              longTermMemory.preferences?.theme_mode === "blackhole"
                                ? "bg-cyan-950/40 border-cyan-400/60 shadow-[0_0_25px_rgba(6,182,212,0.25)]"
                                : "bg-zinc-900/50 border-white/5 hover:border-white/20 hover:bg-zinc-900/80"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-base">
                                  🌌
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-cyan-200">Singularity Dark</h4>
                                  <span className="text-[9px] font-mono text-cyan-400">Pure Cosmic Black Hole</span>
                                </div>
                              </div>
                              {longTermMemory.preferences?.theme_mode === "blackhole" && (
                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse mt-1" />
                              )}
                            </div>
                            <p className="text-[10px] text-white/50 leading-relaxed">
                              পিওর ক্লিন ডার্ক ব্যাকগ্রাউন্ড, অ্যাক্রিশন ডিস্ক ওয়েভ ও কেন্দ্র থেকে রেজাল্ট পপআপ এনিমেশন।
                            </p>
                            <div className="mt-3 flex items-center justify-between text-[9px] font-mono">
                              <span className="text-white/40">Pure Dark + Warp Pop</span>
                              <span className={`px-2 py-0.5 rounded-full font-bold ${
                                longTermMemory.preferences?.theme_mode === "blackhole"
                                  ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400/50"
                                  : "bg-white/5 text-white/40"
                              }`}>
                                {longTermMemory.preferences?.theme_mode === "blackhole" ? "ACTIVE" : "SELECT"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Vision & Camera Capture Settings */}
                      <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Video className="w-4 h-4 text-cyan-400" />
                          <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-cyan-300">VISION & CAMERA STREAM CONTROL</h3>
                        </div>
                        <p className="text-[11px] text-white/50 leading-relaxed mb-4">
                          Toggle live visual input streams so Tune can see your screen or watch through your device camera in real-time.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Screen Sharing Toggle */}
                          <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-3.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              {isScreenSharing ? (
                                <ScreenShare className="w-5 h-5 text-purple-400 shrink-0" />
                              ) : (
                                <ScreenShareOff className="w-5 h-5 text-zinc-500 shrink-0" />
                              )}
                              <div>
                                <h4 className="text-xs font-bold text-white/90">Screen Sharing</h4>
                                <span className="text-[10px] text-white/40 block">Desktop/Browser view</span>
                              </div>
                            </div>
                            <button
                              onClick={toggleScreenSharing}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                isScreenSharing
                                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                  : "bg-white/5 hover:bg-white/10 text-white/60 border border-white/10"
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${isScreenSharing ? "bg-purple-400 animate-pulse" : "bg-zinc-600"}`} />
                              {isScreenSharing ? "ON" : "OFF"}
                            </button>
                          </div>

                          {/* Camera Sharing Toggle */}
                          <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-3.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              {isCameraSharing ? (
                                <Camera className="w-5 h-5 text-cyan-400 shrink-0 animate-pulse" />
                              ) : (
                                <CameraOff className="w-5 h-5 text-zinc-500 shrink-0" />
                              )}
                              <div>
                                <h4 className="text-xs font-bold text-white/90">Camera Vision</h4>
                                <span className="text-[10px] text-white/40 block">Webcam/Front camera</span>
                              </div>
                            </div>
                            <button
                              onClick={toggleCameraSharing}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                isCameraSharing
                                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                  : "bg-white/5 hover:bg-white/10 text-white/60 border border-white/10"
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${isCameraSharing ? "bg-cyan-400 animate-pulse" : "bg-zinc-600"}`} />
                              {isCameraSharing ? "ON" : "OFF"}
                            </button>
                          </div>

                          {/* Real-time Facial Gesture Mirror Copy Card */}
                          <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">🪞</span>
                              <div>
                                <h4 className="text-xs font-bold text-amber-300">Face Copy / ফেস কপি</h4>
                                <span className="text-[10px] text-white/40 block">Tune copies your face & expression in real-time</span>
                              </div>
                            </div>
                            <button
                              onClick={toggleFaceMirroring}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                isFaceMirroring
                                  ? "bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                                  : "bg-white/5 hover:bg-white/10 text-white/60 border border-white/10"
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${isFaceMirroring ? "bg-amber-400 animate-pulse" : "bg-zinc-600"}`} />
                              {isFaceMirroring ? "MIRRORING" : "START COPY"}
                            </button>
                          </div>
                        </div>
                      </div>
                      {/* Voice Detection Sensitivity & Distance Range */}
                      <div className="bg-white/3 border border-amber-500/20 rounded-2xl p-4 shadow-[0_0_20px_rgba(245,158,11,0.05)]">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-amber-400" />
                            <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-amber-300">
                              Voice Detection Sensitivity & Distance
                            </h3>
                          </div>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            {voiceSensitivity}%
                          </span>
                        </div>
                        <p className="text-[11px] text-white/50 leading-relaxed mb-3">
                          কন্ট্রোল করুন কত দূর থেকে আপনার কথা ডিটেক্ট হবে। শান্ত রুমে পুরো রুম থেকে কথা শুনতে সেনসিটিভিটি বাড়ান, নয়েজি পরিবেশে ক্লোজ-আপ রাখুন।
                        </p>

                        {/* Estimated Distance Badge */}
                        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs mb-3 font-mono">
                          <span className="text-white/60">Estimated Range:</span>
                          <span className="text-amber-300 font-bold">
                            {voiceSensitivity <= 35
                              ? "🎙️ Close-Up (0.3m - 0.7m) • High Noise Isolation"
                              : voiceSensitivity <= 75
                              ? "🗣️ Standard Desk (1.0m - 2.0m) • Balanced Pickup"
                              : "📡 Far-Field Room (3.0m - 5.0m+) • High Sensitivity"}
                          </span>
                        </div>

                        {/* Slider */}
                        <div className="mb-4">
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={voiceSensitivity}
                            onChange={(e) => handleVoiceSensitivityChange(parseInt(e.target.value))}
                            className="w-full accent-amber-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer outline-none"
                          />
                          <div className="flex justify-between text-[10px] text-white/40 font-mono mt-1">
                            <span>1% (Close Mic Only)</span>
                            <span>50% (Standard)</span>
                            <span>100% (Far Room / Whisper)</span>
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          {[
                            { label: "Close-Up", value: 25, dist: "0.5m" },
                            { label: "Standard Desk", value: 60, dist: "1.5m" },
                            { label: "Room Distance", value: 85, dist: "3.5m" },
                            { label: "Max Far-Field", value: 100, dist: "5.0m+" },
                          ].map((preset) => (
                            <button
                              key={preset.value}
                              onClick={() => handleVoiceSensitivityChange(preset.value)}
                              className={`py-2 px-2 rounded-xl border font-mono text-[11px] transition cursor-pointer text-center flex flex-col items-center justify-center gap-0.5 ${
                                Math.abs(voiceSensitivity - preset.value) <= 7
                                  ? "bg-amber-400/20 border-amber-400/50 text-amber-300 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                                  : "bg-white/5 border-white/5 hover:border-white/15 text-white/60 hover:text-white"
                              }`}
                            >
                              <span>{preset.label}</span>
                              <span className="text-[9px] text-white/40">{preset.dist} ({preset.value}%)</span>
                            </button>
                          ))}
                        </div>

                        {/* Anti-Hallucination Silence Protection Note */}
                        <div className="mt-3.5 pt-3 border-t border-white/5 flex items-start gap-2 text-[10px] text-emerald-400/80">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                          <span>
                            <strong>Silence Protection Active:</strong> কথা না বললে কোনো ব্যাকগ্রাউন্ড নয়েজ যাবে না এবং টিউন কখনো একা একা বলবে না যে কথা বুঝতে পারি নাই।
                          </span>
                        </div>
                      </div>

                      {/* Wave Visualizer Tilt, Rotation & Position Customizer */}
                      <div className="bg-white/3 border border-cyan-500/20 rounded-2xl p-4 shadow-[0_0_20px_rgba(6,182,212,0.05)]">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-cyan-400" />
                            <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-cyan-300">
                              Wave Visualizer Tilt & Rotation (ওয়েভ টিল্ট ও পজিশন)
                            </h3>
                          </div>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {longTermMemory.preferences?.wave_rotation_deg ?? -24}°
                          </span>
                        </div>
                        <p className="text-[11px] text-white/50 leading-relaxed mb-4">
                          অডিও ওয়েভ কতটুকু কোণে টিল্ট (Tilt/Rotate) থাকবে এবং এর পজিশন ও সাইজ কীভাবে সেট করতে চান তা সহজে কন্ট্রোল করুন।
                        </p>

                        <div className="space-y-4">
                          {/* Rotation Slider */}
                          <div>
                            <div className="flex justify-between items-center mb-1 text-xs font-mono">
                              <span className="text-white/70">Tilt Angle / রোটেশন কোণ:</span>
                              <span className="text-cyan-300 font-bold">{longTermMemory.preferences?.wave_rotation_deg ?? -24}°</span>
                            </div>
                            <input
                              type="range"
                              min="-90"
                              max="90"
                              value={longTermMemory.preferences?.wave_rotation_deg ?? -24}
                              onChange={(e) =>
                                handleUpdatePreferences?.({
                                  wave_rotation_deg: parseInt(e.target.value),
                                })
                              }
                              className="w-full accent-cyan-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer outline-none"
                            />
                            <div className="flex justify-between text-[9px] text-white/30 font-mono mt-1">
                              <span>-90° (Full Left)</span>
                              <span>-24° (Default Stylish Tilt)</span>
                              <span>0° (Flat)</span>
                              <span>+90° (Full Right)</span>
                            </div>
                          </div>

                          {/* Quick Angle Presets */}
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            {[
                              { label: "Deep Left", deg: -45 },
                              { label: "Stylish Tilt", deg: -24 },
                              { label: "Straight", deg: 0 },
                              { label: "Right Tilt", deg: 30 },
                            ].map((preset) => {
                              const currentDeg = longTermMemory.preferences?.wave_rotation_deg ?? -24;
                              const isSelected = currentDeg === preset.deg;
                              return (
                                <button
                                  key={preset.deg}
                                  type="button"
                                  onClick={() =>
                                    handleUpdatePreferences?.({
                                      wave_rotation_deg: preset.deg,
                                    })
                                  }
                                  className={`py-1.5 px-2 rounded-xl border font-mono text-[10px] transition cursor-pointer text-center ${
                                    isSelected
                                      ? "bg-cyan-500/25 border-cyan-400/50 text-cyan-200 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                                      : "bg-white/5 border-white/5 hover:border-white/15 text-white/60 hover:text-white"
                                  }`}
                                >
                                  {preset.label} ({preset.deg}°)
                                </button>
                              );
                            })}
                          </div>

                          {/* Wave Scale / Size & Offset Sliders */}
                          <div className="pt-2 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <div className="flex justify-between items-center mb-1 text-[11px] font-mono">
                                <span className="text-white/60">Wave Scale (সাইজ):</span>
                                <span className="text-cyan-300 font-bold">
                                  {Math.round((longTermMemory.preferences?.wave_scale ?? 1.0) * 100)}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0.5"
                                max="1.8"
                                step="0.05"
                                value={longTermMemory.preferences?.wave_scale ?? 1.0}
                                onChange={(e) =>
                                  handleUpdatePreferences?.({
                                    wave_scale: parseFloat(e.target.value),
                                  })
                                }
                                className="w-full accent-cyan-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer outline-none"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-1 text-[11px] font-mono">
                                <span className="text-white/60">Vertical Offset Y:</span>
                                <span className="text-cyan-300 font-bold">
                                  {longTermMemory.preferences?.wave_offset_y ?? 0}px
                                </span>
                              </div>
                              <input
                                type="range"
                                min="-60"
                                max="60"
                                step="2"
                                value={longTermMemory.preferences?.wave_offset_y ?? 0}
                                onChange={(e) =>
                                  handleUpdatePreferences?.({
                                    wave_offset_y: parseInt(e.target.value),
                                  })
                                }
                                className="w-full accent-cyan-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer outline-none"
                              />
                            </div>
                          </div>

                          {/* Reset button */}
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdatePreferences?.({
                                  wave_rotation_deg: -24,
                                  wave_scale: 1.0,
                                  wave_offset_x: 0,
                                  wave_offset_y: 0,
                                })
                              }
                              className="text-[10px] font-mono text-cyan-400/80 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition"
                            >
                              <RotateCcw className="w-3 h-3" /> Reset Wave Transform
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Audio Level & Brightness */}
                      <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-yellow-300 mb-4">Hardware Synchronizers</h3>
                        <div className="space-y-5 text-xs">
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="font-semibold text-white/80 flex items-center gap-1.5">
                                <Volume2 className="w-4 h-4 text-zinc-400" /> Speak Volume Level
                              </span>
                              <span className="font-mono text-yellow-400 font-bold">{hwVolume}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={hwVolume}
                              onChange={(e) => handleVolumeSlider(parseInt(e.target.value))}
                              className="w-full accent-yellow-400 bg-zinc-800 h-1 rounded-lg cursor-pointer outline-none"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="font-semibold text-white/80 flex items-center gap-1.5">
                                <Sun className="w-4 h-4 text-zinc-400" /> Device Brightness
                              </span>
                              <span className="font-mono text-yellow-400 font-bold">{hwBrightness}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={hwBrightness}
                              onChange={(e) => handleBrightnessSlider(parseInt(e.target.value))}
                              className="w-full accent-yellow-400 bg-zinc-800 h-1 rounded-lg cursor-pointer outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Ambient Focus Sounds */}
                      <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Moon className="w-4 h-4 text-yellow-400" />
                          <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-yellow-300">Ambient Sound Synthesizer</h3>
                        </div>
                        <p className="text-[11px] text-white/40 leading-relaxed mb-4">
                          Sync comfort white noises directly to create a serene environment. You can also tell Tune: "Tune, play rain sound" to activate.
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                          {(["rain", "forest", "waves", "off"] as AmbientSoundType[]).map((sound) => (
                            <button
                              key={sound}
                              onClick={() => handleAmbientSoundToggle(sound)}
                              className={`py-2 px-3.5 rounded-xl border font-bold capitalize transition cursor-pointer text-center ${
                                activeSound === sound
                                  ? "bg-yellow-400/20 border-yellow-400/50 text-yellow-300"
                                  : "bg-white/5 border-white/5 hover:border-white/10 text-white/60 hover:text-white"
                              }`}
                            >
                              {sound === "off" ? "Off" : sound}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 5: API KEYS & MOBILE SHARE */}
                  {activeTab === "apikeys" && (
                    <motion.div
                      key="apikeys"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-5"
                    >
                      {/* 1. Google Account & Cloud Sync Card */}
                      <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-cyan-400" />
                            <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-cyan-300">
                              GOOGLE ACCOUNT & CLOUD SYNC
                            </h3>
                          </div>
                          {auth.currentUser ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Signed In
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/60 text-[10px] font-mono">
                              Guest Mode
                            </span>
                          )}
                        </div>

                        {auth.currentUser ? (
                          <div className="flex items-center justify-between gap-3 bg-black/40 border border-white/5 rounded-xl p-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {auth.currentUser.photoURL ? (
                                <img
                                  src={auth.currentUser.photoURL}
                                  alt="Avatar"
                                  className="w-10 h-10 rounded-full border border-cyan-400/40 object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-cyan-500/30 text-cyan-300 flex items-center justify-center font-bold text-sm shrink-0">
                                  {(auth.currentUser.displayName || auth.currentUser.email || "U").charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate">
                                  {auth.currentUser.displayName || "Google Account"}
                                </p>
                                <p className="text-[10px] text-white/50 font-mono truncate">
                                  {auth.currentUser.email}
                                </p>
                              </div>
                            </div>

                            {onOpenAccountModal && (
                              <button
                                type="button"
                                onClick={onOpenAccountModal}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition cursor-pointer shrink-0"
                              >
                                Manage
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3 bg-black/40 border border-white/5 rounded-xl p-3">
                            <p className="text-[11px] text-white/60 leading-relaxed">
                              Sign in with your Google account to sync your personal API key, customized AI personality, and memories to Firebase Firestore.
                            </p>
                            {onOpenAccountModal && (
                              <button
                                type="button"
                                onClick={onOpenAccountModal}
                                className="px-3.5 py-2 bg-white hover:bg-zinc-200 text-zinc-950 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 shadow"
                              >
                                <span>Sign In</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 2. API Key Management Card */}
                      <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Key className="w-4 h-4 text-emerald-400" />
                            <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-emerald-300">
                              CUSTOM GEMINI API KEY
                            </h3>
                          </div>
                          {customApiKey ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Custom Key Active
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[10px] font-mono">
                              System Default Key
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-white/60 leading-relaxed mb-4">
                          আপনার দেওয়া Google Gemini API Key সম্পূর্ণ প্রাইভেট। এটি শুধুমাত্র আপনার সেশনে ব্যবহৃত হবে এবং অন্য কারও সাথে শেয়ার হয় না।
                        </p>

                        <div className="space-y-3">
                          <label className="text-[10px] text-white/40 font-mono uppercase block">
                            Gemini API Key (AI Studio)
                          </label>
                          <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-xl p-2.5">
                            <input
                              type={showApiKey ? "text" : "password"}
                              value={customApiKey}
                              onChange={(e) => setCustomApiKey(e.target.value)}
                              placeholder="AIzaSy..."
                              className="flex-1 bg-transparent text-xs text-emerald-300 font-mono outline-none min-w-0"
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="p-1.5 text-white/40 hover:text-white transition cursor-pointer"
                              title={showApiKey ? "Hide Key" : "Show Key"}
                            >
                              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleSaveApiKey}
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
                            >
                              <Key className="w-3.5 h-3.5" />
                              Save Key
                            </button>
                            {customApiKey && (
                              <button
                                type="button"
                                onClick={handleClearApiKey}
                                className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs rounded-xl transition cursor-pointer border border-white/10"
                              >
                                Clear / Use Default
                              </button>
                            )}
                            {apiKeySaveStatus && (
                              <span className="text-xs font-bold text-emerald-400 animate-pulse ml-2">
                                {apiKeySaveStatus}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* How to get free API key link */}
                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
                          <span className="text-white/50">Need a free Google Gemini API Key?</span>
                          <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 underline"
                          >
                            Get Free API Key <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      {/* 3. Custom AI Personality & Instructions Card */}
                      <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-purple-300">
                              AI PERSONALITY & CUSTOM INSTRUCTIONS
                            </h3>
                          </div>
                          {personalityPrompt ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-mono font-bold flex items-center gap-1">
                              Custom Persona Active
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/50 text-[10px] font-mono">
                              Default Companion
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-white/60 leading-relaxed mb-3">
                          Tune কিভাবে আপনার সাথে কথা বলবে তা নির্ধারণ করুন। খালি রাখলে Tune এর নিজস্ব বুদ্ধিমান Banglish কম্প্যানিয়ন আচরণ চালু থাকবে।
                        </p>

                        {/* Presets */}
                        <div className="mb-3">
                          <span className="text-[10px] text-white/40 uppercase font-mono block mb-1.5">
                            Quick Style Presets:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: "Supportive Friend", text: "Act as a warm, encouraging, and deeply empathetic companion. Listen closely, cheer Boss on, and respond with genuine care in friendly Banglish." },
                              { label: "Strict Senior Engineer", text: "Act as an elite Staff Software Engineer. Be extremely precise, technically rigorous, architecture-focused, and concise. No superficial praise; diagnose code flaws immediately." },
                              { label: "Math & Academic Tutor", text: "Act as a patient, brilliant math and science tutor. Break every complex equation down step-by-step with simple analogies." },
                              { label: "Concise & Direct", text: "Maximum brevity. Respond in single sharp sentences or bullet points. Zero small talk or conversational fillers." }
                            ].map((preset) => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                  setPersonalityPrompt(preset.text);
                                  soundEngine.playWaterDropSound();
                                }}
                                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-[10px] text-white/80 hover:text-white border border-white/10 transition cursor-pointer"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <textarea
                            rows={3}
                            value={personalityPrompt}
                            onChange={(e) => setPersonalityPrompt(e.target.value)}
                            placeholder="Using Tune's native intelligent companion persona (Default)..."
                            className="w-full bg-zinc-900 border border-white/10 focus:border-purple-400/70 rounded-xl p-3 text-xs text-white placeholder:text-white/25 outline-none resize-none font-sans leading-relaxed"
                          />

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleSavePersonalityPrompt}
                              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Save Personality
                            </button>
                            {personalityPrompt && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPersonalityPrompt("");
                                  localStorage.removeItem("tune_custom_personality_prompt");
                                  if (typeof window !== "undefined") {
                                    window.dispatchEvent(
                                      new CustomEvent("tune_personality_prompt_updated", { detail: { prompt: "" } })
                                    );
                                  }
                                  soundEngine.playWaterDropSound();
                                }}
                                className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs rounded-xl transition cursor-pointer border border-white/10"
                              >
                                Reset to Default
                              </button>
                            )}
                            {personalitySaveStatus && (
                              <span className="text-xs font-bold text-purple-300 animate-pulse ml-2">
                                {personalitySaveStatus}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Share App & Mobile Access Card */}
                      <div className="bg-white/3 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Smartphone className="w-4 h-4 text-cyan-400" />
                          <h3 className="text-xs font-bold uppercase tracking-widest font-mono text-cyan-300">
                            MOBILE ACCESS & APP SHARING
                          </h3>
                        </div>
                        <p className="text-[11px] text-white/50 leading-relaxed mb-4">
                          Scan QR Code or generate a share link to use Tune directly on your iPhone or Android device!
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            type="button"
                            onClick={onOpenShareModal}
                            className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                          >
                            <QrCode className="w-4 h-4" />
                            Open Mobile QR & Share Modal
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/5 pt-4 mt-5 flex justify-between items-center text-[10px] font-mono text-white/30 shrink-0">
              <span className="flex items-center gap-1.5 uppercase text-zinc-500">
                <Shield className="w-3.5 h-3.5 text-emerald-500" /> WORKSTATION ENCRYPTION STABLE
              </span>
              <span>TUNE OS NODE: 0x2A4F</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
export default ControlPanel;
