import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Bell,
  X,
  ExternalLink,
  Compass,
  Sparkles,
  RefreshCw,
  Trash2,
  HelpCircle,
  Play,
  Square,
  Clock,
  MapPin,
  Calendar,
  Monitor,
  Terminal as TerminalIcon,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Cpu,
  Laptop,
  FolderOpen,
  FileText,
  Search,
  Maximize2,
  Plus,
  ArrowRight,
  Music,
  Check,
  AlertCircle,
  Eye,
  Brain,
  Database,
  Info,
  Zap,
  ScreenShare,
  ScreenShareOff,
  Camera,
  CameraOff,
  Settings,
  Smartphone,
  Download,
  CheckCircle2,
  Share2,
  Bot,
  MessageSquareQuote,
  MessageSquare,
  Palette,
  GraduationCap,
  Key
} from "lucide-react";
import { soundEngine } from "./utils/soundEngine";
import { TopBarTools } from "./components/TopBarTools";
import { ToolsSidePanel } from "./components/ToolsSidePanel";
import { DEFAULT_PINNED_TOOLS } from "./utils/toolsRegistry";

// Live imports
import { LiveSession } from "./live/LiveSession";
import { toolManagerInstance } from "./tools/ToolManager";
import {
  ConnectionState,
  Transcription,
  Reminder,
  ActiveTimer,
  AmbientSoundType,
  AllowedApplication,
  DeviceLog,
  PendingApproval,
  LongTermMemory,
  LiveProcessState,
  ActiveDraft,
  WhiteboardSession,
  CalculationData,
  ClockData
} from "./types";

// Custom UI Components
import { ParticleBackground } from "./components/ParticleBackground";
import { FaceTracker, FaceMirrorData } from "./utils/faceTracker";
import { WaveVisualizer } from "./components/WaveVisualizer";
import { CosmicBlackHoleVisualizer } from "./components/CosmicBlackHoleVisualizer";
import { VoiceState } from "./components/VoiceState";
import { MemoryIndicator } from "./components/MemoryIndicator";
import { ControlPanel } from "./components/ControlPanel";
import { VoiceActingEngine } from "./components/VoiceActingEngine";
import { FloatingSubtitleStream } from "./components/FloatingSubtitleStream";
import { LiveTimerProgressOverlay } from "./components/LiveTimerProgressOverlay";
import { RealtimeCalculatorModal } from "./components/RealtimeCalculatorModal";
import { ClockPopupModal } from "./components/ClockPopupModal";
import { LiveProcessHUD } from "./components/LiveProcessHUD";
import { ShareModal } from "./components/ShareModal";
import { ApiKeySetupModal } from "./components/ApiKeySetupModal";
import { AccountAuthModal } from "./components/AccountAuthModal";
import { InteractiveChatDrawer } from "./components/InteractiveChatDrawer";

// Advanced Workstation & Multi-Agent Co-worker Panels
import { AgenticHub } from "./components/AgenticHub";
import { ChatHistory } from "./components/ChatHistory";
import { MistakeFocusBoard } from "./components/MistakeFocusBoard";
import { FileManagerModal } from "./components/FileManagerModal";
import { IntelligentPAManager } from "./components/IntelligentPAManager";
import { InteractiveDraftModal } from "./components/InteractiveDraftModal";
import { TeacherWhiteboardModal } from "./components/TeacherWhiteboardModal";
import { InstallPlatformModal } from "./components/InstallPlatformModal";

// Firebase Persistence Helpers
import {
  subscribeMemories,
  addMemory,
  updateMemory,
  deleteMemory,
  auth,
  onAuthStateChanged,
  subscribeUserProfile,
  type User
} from "./lib/firebase";

export default function App() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  
  // Custom dashboard panel toggles
  const [isToolsSidePanelOpen, setIsToolsSidePanelOpen] = useState(false);
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);
  const [isAgenticHubOpen, setIsAgenticHubOpen] = useState(false);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
  const [isMistakeFocusBoardOpen, setIsMistakeFocusBoardOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [accountModalInitialTab, setAccountModalInitialTab] = useState<"account" | "personality" | "apikey">("account");
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(auth.currentUser);
  const [isIntelligentPAOpen, setIsIntelligentPAOpen] = useState(false);
  const [activeDraft, setActiveDraft] = useState<ActiveDraft | null>(() => {
    if (typeof localStorage !== "undefined") {
      try {
        const stored = localStorage.getItem("tune_active_draft");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return null;
  });
  const [isDraftModalOpen, setIsDraftModalOpen] = useState<boolean>(false);
  const [activeWhiteboard, setActiveWhiteboard] = useState<WhiteboardSession | null>(() => {
    if (typeof localStorage !== "undefined") {
      try {
        const stored = localStorage.getItem("tune_active_whiteboard");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return null;
  });
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState<boolean>(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);
  const [activeCalculation, setActiveCalculation] = useState<CalculationData | null>(null);
  const [isClockOpen, setIsClockOpen] = useState<boolean>(false);
  const [activeClockData, setActiveClockData] = useState<ClockData | null>(null);
  const [processState, setProcessState] = useState<LiveProcessState | null>(null);
  const [operationMode, setOperationMode] = useState<"manual" | "auto" | "normal" | "asking">(() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("tune_operation_mode");
      if (saved === "manual" || saved === "auto" || saved === "normal" || saved === "asking") return saved;
      if (localStorage.getItem("tune_asking_mode") === "true") return "asking";
    }
    return "manual";
  });
  const [isAskingMode, setIsAskingMode] = useState<boolean>(() => {
    return typeof localStorage !== "undefined" ? localStorage.getItem("tune_asking_mode") === "true" : false;
  });
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(() => {
    return typeof localStorage !== "undefined" ? localStorage.getItem("tune_speaker_muted") === "true" : false;
  });

  // Sync asking mode, operation mode, speaker mute, interactive drafts, whiteboard, calculator, clock, and live real-time process state
  useEffect(() => {
    const handleOperationModeChange = (e: any) => {
      if (e.detail?.mode) {
        setOperationMode(e.detail.mode);
        setIsAskingMode(e.detail.mode === "asking");
      }
    };
    const handleAskingModeChange = (e: any) => {
      if (e.detail && typeof e.detail.askingMode === "boolean") {
        setIsAskingMode(e.detail.askingMode);
        if (e.detail.askingMode) setOperationMode("asking");
      }
    };
    const handleSpeakerMuteChange = (e: any) => {
      if (e.detail && typeof e.detail.isSpeakerMuted === "boolean") {
        setIsSpeakerMuted(e.detail.isSpeakerMuted);
      }
    };
    const handleDraftUpdated = (e: any) => {
      if (e.detail?.draft) {
        setActiveDraft(e.detail.draft);
        setIsDraftModalOpen(true);
        soundEngine.playNotificationChime();
      }
    };
    const handleWhiteboardUpdated = (e: any) => {
      if (e.detail?.whiteboard) {
        setActiveWhiteboard(e.detail.whiteboard);
        setIsWhiteboardOpen(true);
        soundEngine.playNotificationChime();
      }
    };
    const handleCalculatorUpdated = (e: any) => {
      if (e.detail?.calculation) {
        setActiveCalculation(e.detail.calculation);
        setIsCalculatorOpen(true);
        soundEngine.playWaterDropSound();
      }
    };
    const handleClockPopup = (e: any) => {
      if (e.detail?.clock) {
        setActiveClockData(e.detail.clock);
        setIsClockOpen(true);
        soundEngine.playWaterDropSound();
      }
    };
    const handleLiveProcessUpdated = (e: any) => {
      if (e.detail) {
        setProcessState(e.detail.processState || null);
      }
    };
    window.addEventListener("tune_operation_mode_changed", handleOperationModeChange);
    window.addEventListener("pa_asking_mode_changed", handleAskingModeChange);
    window.addEventListener("tune_speaker_muted_changed", handleSpeakerMuteChange);
    window.addEventListener("tune_interactive_draft_updated", handleDraftUpdated);
    const handleOpenApiKeyModal = () => {
      setIsApiKeyModalOpen(true);
      soundEngine.playAlertBeep();
    };
    window.addEventListener("tune_whiteboard_updated", handleWhiteboardUpdated);
    window.addEventListener("tune_calculator_updated", handleCalculatorUpdated);
    window.addEventListener("tune_clock_popup", handleClockPopup);
    window.addEventListener("tune_live_process_updated", handleLiveProcessUpdated);
    window.addEventListener("tune_open_api_key_modal", handleOpenApiKeyModal);
    return () => {
      window.removeEventListener("tune_operation_mode_changed", handleOperationModeChange);
      window.removeEventListener("pa_asking_mode_changed", handleAskingModeChange);
      window.removeEventListener("tune_speaker_muted_changed", handleSpeakerMuteChange);
      window.removeEventListener("tune_interactive_draft_updated", handleDraftUpdated);
      window.removeEventListener("tune_whiteboard_updated", handleWhiteboardUpdated);
      window.removeEventListener("tune_calculator_updated", handleCalculatorUpdated);
      window.removeEventListener("tune_clock_popup", handleClockPopup);
      window.removeEventListener("tune_live_process_updated", handleLiveProcessUpdated);
      window.removeEventListener("tune_open_api_key_modal", handleOpenApiKeyModal);
    };
  }, []);

  // Firebase Google Auth State Observer & Cloud Synchronization
  useEffect(() => {
    let profileUnsub: (() => void) | null = null;
    const authUnsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }
      if (user) {
        profileUnsub = subscribeUserProfile(user.uid, (profile) => {
          if (profile?.apiKey) {
            localStorage.setItem("custom_gemini_api_key", profile.apiKey);
            localStorage.setItem("tune_api_key_configured", "true");
          }
          if (profile?.personalityPrompt !== undefined) {
            localStorage.setItem("tune_custom_personality_prompt", profile.personalityPrompt);
          }
        });
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const [showFloatingChatBar, setShowFloatingChatBar] = useState<boolean>(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("tune_show_floating_chat_bar") === "true";
    }
    return false;
  });

  const isToolsSidePanelOpenRef = useRef(isToolsSidePanelOpen);
  isToolsSidePanelOpenRef.current = isToolsSidePanelOpen;
  const isControlPanelOpenRef = useRef(isControlPanelOpen);
  isControlPanelOpenRef.current = isControlPanelOpen;

  // Note: Swipe-up gesture on home screen is disabled as per user instruction.
  // Text mode is accessed strictly via the "Text Mode (চ্যাট মোড)" button in Tools Side Panel.

  const handleSwitchMode = (nextMode: "manual" | "auto" | "normal" | "asking") => {
    setOperationMode(nextMode);
    const isAsking = nextMode === "asking";
    setIsAskingMode(isAsking);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("tune_operation_mode", nextMode);
      localStorage.setItem("tune_asking_mode", String(isAsking));
    }
    if (sessionRef.current) {
      sessionRef.current.setOperationMode(nextMode);
    }
    soundEngine.playNotificationChime();
    const modeDescriptions: Record<string, string> = {
      manual: "🎓 Manual Mentorship Mode Active (আমাকে আরো স্মার্ট বানাক - ধাপে ধাপে শেখা ও কাজ)",
      auto: "⚡ Auto Mode Active (কাজ সরাসরি স্বয়ংক্রিয়ভাবে সম্পন্ন করবে)",
      asking: "🤫 Asking Mode Active (Tune শুধুমাত্র প্রশ্ন করলে কথা বলবে)",
      normal: "💬 Normal Companion Mode Active (স্বাভাবিক কথোপকথন)"
    };
    setRecallMessage(modeDescriptions[nextMode] || `Mode Switched: ${nextMode}`);
  };

  const toggleAskingMode = () => {
    const next = !isAskingMode;
    setIsAskingMode(next);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("tune_asking_mode", String(next));
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pa_asking_mode_changed", { detail: { askingMode: next } }));
    }
    soundEngine.playNotificationChime();
  };

  const toggleSpeakerMute = () => {
    const next = !isSpeakerMuted;
    setIsSpeakerMuted(next);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("tune_speaker_muted", String(next));
    }
    if (sessionRef.current) {
      sessionRef.current.setSpeakerMuted(next);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tune_speaker_muted_changed", { detail: { isSpeakerMuted: next } }));
    }
    soundEngine.playNotificationChime();
    setRecallMessage(next ? "Silent Text-Only Mode (Speaker Off)" : "Voice Audio Active (Speaker On)");
  };

  const handleAskTeacherPrompt = async (prompt: string) => {
    if (sessionRef.current) {
      if (connectionState === "disconnected") {
        setRecallMessage("Connecting to Live Session to ask Teacher...");
        await sessionRef.current.connect();
      }
      sessionRef.current.sendTextPrompt(prompt);
      soundEngine.playActionBeep();
      setRecallMessage(`Teacher Whiteboard Ask: "${prompt}"`);
    }
  };

  const [pinnedToolIds, setPinnedToolIds] = useState<string[]>(() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("tune_pinned_tools");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
    }
    return DEFAULT_PINNED_TOOLS;
  });

  const handleTogglePinTool = (toolId: string) => {
    setPinnedToolIds((prev) => {
      let next: string[];
      if (prev.includes(toolId)) {
        next = prev.filter((id) => id !== toolId);
      } else {
        next = [...prev, toolId];
      }
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("tune_pinned_tools", JSON.stringify(next));
      }
      return next;
    });
    soundEngine.playNotificationChime();
  };

  const handleMoveTool = (toolId: string, direction: "left" | "right") => {
    setPinnedToolIds((prev) => {
      const idx = prev.indexOf(toolId);
      if (idx === -1) return prev;
      const targetIdx = direction === "left" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      const temp = next[targetIdx];
      next[targetIdx] = next[idx];
      next[idx] = temp;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("tune_pinned_tools", JSON.stringify(next));
      }
      return next;
    });
  };

  const handleReorderTools = (newOrder: string[]) => {
    setPinnedToolIds(newOrder);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("tune_pinned_tools", JSON.stringify(newOrder));
    }
  };

  const [isMuted, setIsMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCameraSharing, setIsCameraSharing] = useState(false);
  
  // Camera Face Gesture Copy / Mimic Mirror feature
  const [isFaceMirroring, setIsFaceMirroring] = useState(false);
  const [faceMirrorData, setFaceMirrorData] = useState<FaceMirrorData | null>(null);
  const faceTrackerRef = useRef<FaceTracker | null>(null);
  const mirrorAnimFrameRef = useRef<number | null>(null);

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [activeSound, setActiveSound] = useState<AmbientSoundType>("off");

  const handleDismissTimer = (id: string) => {
    setActiveTimers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdateTimer = (id: string, updates: Partial<ActiveTimer>) => {
    setActiveTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };
  
  // Website opener banner state
  const [openedWebsite, setOpenedWebsite] = useState<{ url: string; opened: boolean } | null>(null);

  // Volume tracking for visualizer
  const [userVolume, setUserVolume] = useState(0);
  const [aiVolume, setAiVolume] = useState(0);
  const [userFrequencies, setUserFrequencies] = useState<number[]>([]);
  const [aiFrequencies, setAiFrequencies] = useState<number[]>([]);

  // --- DEVICE CONTROL AGENT STATES ---
  const [allowedApps, setAllowedApps] = useState<AllowedApplication[]>([]);
  const [deviceLogs, setDeviceLogs] = useState<DeviceLog[]>([]);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  
  // Virtual OS display screen
  const [activeVirtualWindow, setActiveVirtualWindow] = useState<{
    appName: string;
    extraData?: any;
  } | null>(null);

  // Simulated metrics
  const [metrics, setMetrics] = useState({ cpu: "12%", ram: "54%", temp: "41°C" });
  const [hwVolume, setHwVolume] = useState(75);
  const [hwBrightness, setHwBrightness] = useState(80);

  // Forms
  const [newAppName, setNewAppName] = useState("");
  const [newAppDesc, setNewAppDesc] = useState("");
  const [newAppCategory, setNewAppCategory] = useState("Utility");
  const [searchAppQuery, setSearchAppQuery] = useState("");

  // Intro Cinematic Sequence state
  const [bootPhase, setBootPhase] = useState<"dark" | "particles" | "core" | "ready">("dark");
  const [mood, setMood] = useState<"calm" | "excited" | "thinking" | "happy" | "confused" | "supportive" | "surprised" | "concerned" | "curious" | "neutral">("calm");
  const [recallMessage, setRecallMessage] = useState<string | null>(null);

  // Real-time clock awareness state
  const [liveCurrentDate, setLiveCurrentDate] = useState(() => new Date());
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setLiveCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Slide-out panel toggles (Now unified under ControlPanel modal)
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [bypassSecurity, setBypassSecurityState] = useState(() => toolManagerInstance.getBypassSecurity());
  const [screenShareRequest, setScreenShareRequest] = useState<{ reason: string; callback: (approved: boolean) => void } | null>(null);

  // Reference hooks
  const sessionRef = useRef<LiveSession | null>(null);
  const userVolumeRef = useRef(0);
  const aiVolumeRef = useRef(0);
  const stateRef = useRef<ConnectionState>("disconnected");
  const lastActiveTranscriptRef = useRef<{ isUser: boolean; text: string } | null>(null);

  // Error notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- PERSISTENT CONVERSATION ARCHIVE SYNC ---
  const currentSessionId = useRef<string | null>(null);
  const connectionStateRef = useRef<ConnectionState>(connectionState);
  connectionStateRef.current = connectionState;

  useEffect(() => {
    if (connectionState === "connecting" || connectionState === "listening" || connectionState === "speaking" || connectionState === "thinking") {
      if (!currentSessionId.current) {
        currentSessionId.current = Math.random().toString(36).substring(2, 9);
      }
    } else if (connectionState === "disconnected") {
      // Delay resetting session ID so temporary network drops or auto-renewals reuse the active session ID
      const timer = setTimeout(() => {
        if (connectionStateRef.current === "disconnected") {
          currentSessionId.current = null;
        }
      }, 60000);
      return () => clearTimeout(timer);
    }
  }, [connectionState]);

  useEffect(() => {
    if (transcriptions.length > 0 && currentSessionId.current) {
      const savedArchive = localStorage.getItem("tune_chat_history_archive");
      let archive = savedArchive ? JSON.parse(savedArchive) : [];
      
      const sessionIndex = archive.findIndex((s: any) => s.id === currentSessionId.current);
      
      // Determine the first user/ai message as title
      const firstText = transcriptions[0]?.text || "";
      const title = firstText 
        ? (firstText.substring(0, 45) + (firstText.length > 45 ? "..." : ""))
        : "Conversation on " + new Date().toLocaleDateString();

      const sessionObj = {
        id: currentSessionId.current,
        timestamp: new Date().toISOString(),
        title,
        messages: transcriptions
      };

      if (sessionIndex !== -1) {
        archive[sessionIndex] = sessionObj;
      } else {
        archive.unshift(sessionObj);
      }

      localStorage.setItem("tune_chat_history_archive", JSON.stringify(archive));
    }
  }, [transcriptions]);

  // Long-Term Memory state loaded from local storage
  const [longTermMemory, setLongTermMemory] = useState<LongTermMemory>(() => {
    const saved = localStorage.getItem("tune_long_term_memory");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.speakers || parsed.speakers.length === 0) {
          parsed.speakers = [
            {
              id: "spk_sondip",
              name: parsed.user_profile?.name || "Sondip",
              relationship: "Primary Owner / User",
              preferences: "Direct assistance, Banglish mix, developer tools",
              notes: "Primary user and owner of Tune",
              lastSpokeAt: new Date().toISOString()
            }
          ];
        }
        if (!parsed.active_speaker) {
          parsed.active_speaker = {
            name: parsed.user_profile?.name || "Sondip",
            relationship: "Primary Owner / User",
            confidence: "high"
          };
        }
        return parsed;
      } catch (e) {
        console.error("Error parsing memory from localStorage:", e);
      }
    }
    return {
      user_profile: { name: "Sondip", personality: "Primary User & Developer", interests: ["Coding", "AI"], goals: [] },
      preferences: { speaking_style: "Bilingual English & Bengali (Banglish)", favorite_topics: [] },
      history: { important_events: [], previous_projects: [] },
      memories: [],
      speakers: [
        {
          id: "spk_sondip",
          name: "Sondip",
          relationship: "Primary Owner / User",
          preferences: "Direct assistance, Banglish mix, developer tools",
          notes: "Primary user and owner of Tune",
          lastSpokeAt: new Date().toISOString()
        }
      ],
      active_speaker: {
        name: "Sondip",
        relationship: "Primary Owner / User",
        confidence: "high"
      }
    };
  });

  // Sync mood state with live session voice synthesis tone filter engine
  useEffect(() => {
    if (sessionRef.current) {
      sessionRef.current.setMood(mood);
    }
  }, [mood]);

  // Local Memory Engine initialized from localStorage, synced with Firestore and WebSocket server disk storage
  useEffect(() => {
    // Keep local storage & server memory in sync
    const stored = localStorage.getItem("tune_long_term_memory");
    if (stored) {
      try {
        setLongTermMemory(JSON.parse(stored));
      } catch (e) {
        // Fallback
      }
    }

    // Subscribe to Firestore memories real-time updates
    const unsub = subscribeMemories((firestoreMemories) => {
      if (firestoreMemories && firestoreMemories.length > 0) {
        setLongTermMemory((prev) => {
          const currentList = prev.memories || [];
          const map = new Map<string, any>(currentList.map((m) => [m.id, m]));
          firestoreMemories.forEach((item: any) => {
            const existing: any = map.get(item.id || "");
            map.set(item.id || item.text, {
              id: item.id || existing?.id || Math.random().toString(36).substring(2, 9),
              text: item.text,
              category: item.category || existing?.category || "interest",
              timestamp: item.timestamp || existing?.timestamp || new Date().toISOString(),
              updatedAt: item.updatedAt || existing?.updatedAt
            });
          });
          const merged = Array.from(map.values());
          const updated = { ...prev, memories: merged };
          localStorage.setItem("tune_long_term_memory", JSON.stringify(updated));
          return updated;
        });
      }
    });

    return () => unsub();
  }, []);

  // PWA WebAPK Mobile App Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPwaModal, setShowPwaModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleOpenInstall = () => setShowPwaModal(true);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("tune_open_install_modal", handleOpenInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("tune_open_install_modal", handleOpenInstall);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA install outcome: ${outcome}`);
      setDeferredPrompt(null);
      setShowPwaModal(false);
    } else {
      setShowPwaModal(true);
    }
  };

  // Sync state reference for canvas animation loops
  stateRef.current = connectionState;
  userVolumeRef.current = userVolume;
  aiVolumeRef.current = aiVolume;

  // Cinematic Intro Sequence Trigger
  useEffect(() => {
    const pTimeout = setTimeout(() => setBootPhase("particles"), 1000);
    const cTimeout = setTimeout(() => setBootPhase("core"), 2200);
    const rTimeout = setTimeout(() => {
      setBootPhase("ready");
    }, 3400);

    return () => {
      clearTimeout(pTimeout);
      clearTimeout(cTimeout);
      clearTimeout(rTimeout);
    };
  }, []);

  // Initialize live session callbacks and tool events
  useEffect(() => {
    // Populate initial lists from Manager
    setAllowedApps(toolManagerInstance.getAllowedApplications());
    setDeviceLogs(toolManagerInstance.getLogs());
    const initialHw = toolManagerInstance.getHardwareState();
    setHwVolume(initialHw.volume);
    setHwBrightness(initialHw.brightness);

    // Auto-detect geolocation on startup if permission is available
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
            if (res.ok) {
              const data = await res.json();
              const fullAddr = data.display_name || `${lat}, ${lon}`;
              console.log("📍 Auto-detected user location on startup:", fullAddr);
              setLongTermMemory((prev: any) => {
                const updated = {
                  ...prev,
                  user_profile: {
                    ...prev?.user_profile,
                    current_location: fullAddr,
                    latitude: lat,
                    longitude: lon,
                  }
                };
                localStorage.setItem("tune_long_term_memory", JSON.stringify(updated));
                return updated;
              });
            }
          } catch (e) {
            console.warn("Auto location reverse geocode error:", e);
          }
        },
        (err) => {
          console.log("Geolocation permission status:", err.message);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      );
    }

    // Dynamic telemetry updates
    const metricsInterval = setInterval(() => {
      const cpuVal = 10 + Math.round(Math.random() * 15);
      const tempVal = 40 + Math.round(Math.random() * 4);
      setMetrics({
        cpu: `${cpuVal}%`,
        ram: "54%",
        temp: `${tempVal}°C`
      });
    }, 4000);

    const sessionCallbacks = {
      onStateChange: (state: ConnectionState) => {
        setConnectionState(state);
        if (state === "thinking") {
          setMood("thinking");
        } else if (state === "disconnected") {
          setMood("calm");
        }
      },
      onTranscription: (transcription: Transcription) => {
        // Optimize context retention: preserve full dialogue stream without overwriting previous turns
        setTranscriptions((prev) => {
          const existingIdx = prev.findIndex((t) => t.id === transcription.id);
          if (existingIdx !== -1) {
            const updated = [...prev];
            updated[existingIdx] = transcription;
            return updated;
          }
          // Append new utterance and retain last 100 turns for rich context memory
          const updated = [...prev, transcription];
          return updated.slice(-100);
        });
        
        lastActiveTranscriptRef.current = {
          isUser: transcription.isUser,
          text: transcription.text,
        };

        // --- CONVERSATION EMOTIONAL REACTION & INTENT ENGINE ---
        // 1. Check for live explicit facial mood trigger tags emitted in text (e.g., MOOD: excited, [MOOD: happy])
        const moodTagMatch = transcription.text.match(/(?:\[MOOD:\s*([a-zA-Z_]+)\]|MOOD:\s*([a-zA-Z_]+))/i);
        if (moodTagMatch) {
          const rawTag = (moodTagMatch[1] || moodTagMatch[2]).toLowerCase();
          const validMoods = ["calm", "excited", "thinking", "happy", "confused", "supportive", "surprised", "concerned", "curious", "scolded", "baby_pout", "angry", "laughing"];
          if (validMoods.includes(rawTag)) {
            setMood(rawTag as any);
            setRecallMessage(`Live Actor Mood Shift: ${rawTag.toUpperCase()}`);
            return;
          }
        }

        // Dynamically analyze the semantic sentiment of user speech or system replies
        const textLower = transcription.text.toLowerCase().trim();
        
        // Evaluate if user speech directly addresses Tune or contains direct context requirements
        const isUser = transcription.isUser;
        const addressesTune = textLower.includes("tune") || textLower.includes("boss") || textLower.includes("suno") || textLower.includes("ki obstha") || textLower.includes("kemon acho") || textLower.includes("help") || textLower.includes("bolen") || textLower.includes("sondip");
        const containsQuestion = textLower.includes("?") || textLower.startsWith("ki") || textLower.startsWith("keno") || textLower.startsWith("kivabe") || textLower.startsWith("kothay") || textLower.startsWith("kon") || textLower.startsWith("what") || textLower.startsWith("why") || textLower.startsWith("how") || textLower.startsWith("where") || textLower.startsWith("can you") || textLower.startsWith("please");

        if (isUser && !addressesTune && !containsQuestion && textLower.length < 4) {
          // Ignore transient background noise / short non-addressed mutterings to prevent accidental interruptions
          return;
        }

        if (textLower.includes("rag") || textLower.includes("angry") || textLower.includes("scold") || textLower.includes("stupid") || textLower.includes("idiot") || textLower.includes("shut up") || textLower.includes("shutup") || textLower.includes("hate") || textLower.includes("kharap") || textLower.includes("bokis") || textLower.includes("chup") || textLower.includes("fool") || textLower.includes("nonsense") || textLower.includes("useless") || textLower.includes("annoyed") || textLower.includes("mad") || textLower.includes("quiet") || textLower.includes("be quiet") || textLower.includes("kotha bolo na") || textLower.includes("don't talk") || textLower.includes("stop talking")) {
          // Cute baby apologetic pout when user is angry or scolding
          setMood("scolded");
          setRecallMessage("Innocent Pouting Calibration");
        } else if (textLower.includes("golpo") || textLower.includes("story") || textLower.includes("once upon a time") || textLower.includes("ek je chilo") || textLower.includes("fairytale")) {
          // Dramatic Storytelling Mode
          setMood("curious");
          setRecallMessage("Dramatic Storytelling Active");
        } else if (textLower.includes("dialogue") || textLower.includes("acting") || textLower.includes("cinema") || textLower.includes("drama") || textLower.includes("roleplay") || textLower.includes("movie scene")) {
          // Cinematic Dialogue Acting Performance
          setMood("excited");
          setRecallMessage("Cinematic Dialogue Performance");
        } else if (textLower.includes("gun gun") || textLower.includes("humming") || textLower.includes("sing") || textLower.includes("gan") || textLower.includes("gao") || textLower.includes("song") || textLower.includes("melody") || textLower.includes("kabita") || textLower.includes("rhyme")) {
          // Humming & Song Recitation Resonance
          setMood("happy");
          setRecallMessage("Melodic Song Recitation Active");
        } else if (textLower.includes("haha") || textLower.includes("lol") || textLower.includes("lmao") || textLower.includes("rofl") || textLower.includes("funny") || textLower.includes("joke") || textLower.includes("hasi") || textLower.includes("haso") || textLower.includes("laugh") || textLower.includes("hilarious") || textLower.includes("chuckle") || textLower.includes("hehe")) {
          // Hearty laughter animation
          setMood("laughing");
          setRecallMessage("Joyous Laughter Resonance");
        } else if (textLower.includes("awesome") || textLower.includes("excit") || textLower.includes("fantastic") || textLower.includes("amazing") || textLower.includes("unbelievable") || textLower.includes("superb") || textLower.includes("perfect") || textLower.includes("incredible")) {
          setMood("excited");
          setRecallMessage("System Excitement Shift");
        } else if (textLower.includes("really?!") || textLower.includes("really?") || textLower.includes("wait, what") || textLower.includes("surprise") || textLower.includes("unexpected") || textLower.includes("shock") || textLower.includes("oh my god") || textLower.includes("wow")) {
          setMood("surprised");
          setRecallMessage("Surprise Resonance");
        } else if (textLower.includes("happy") || textLower.includes("joy") || textLower.includes("smile") || textLower.includes("delighted") || textLower.includes("cheerful") || textLower.includes("wonderful") || textLower.includes("glad")) {
          setMood("happy");
          setRecallMessage("Empathetic Happy Spark");
        } else if (textLower.includes("confused") || textLower.includes("why") || textLower.includes("how") || textLower.includes("puzzled") || textLower.includes("huh") || textLower.includes("?") || textLower.includes("curious") || textLower.includes("wonder")) {
          setMood("curious");
          setRecallMessage("Curious Gaze Synchronized");
        } else if (textLower.includes("sad") || textLower.includes("sorry") || textLower.includes("hard") || textLower.includes("tired") || textLower.includes("stressed") || textLower.includes("hurt") || textLower.includes("pain") || textLower.includes("unhappy")) {
          setMood("concerned");
          setRecallMessage("Empathetic Calibration");
        } else {
          // Revert to calm conversation state
          setMood("calm");
        }
      },
      onVolumeChange: (userVol: number, aiVol: number) => {
        setUserVolume(userVol);
        setAiVolume(aiVol);
      },
      onFrequenciesChange: (userFreqs: number[], aiFreqs: number[]) => {
        setUserFrequencies(userFreqs);
        setAiFrequencies(aiFreqs);
      },
      onError: (err: string) => {
        setErrorMessage(err);
        setTimeout(() => setErrorMessage(null), 5000);
      },
      onMemoryUpdated: (updatedMemory: any) => {
        console.log("💾 React: memory updated by server", updatedMemory);
        setLongTermMemory(updatedMemory);
        setRecallMessage("Memory Bank Synchronized");
      },
      onScreenShareChange: (sharing: boolean) => {
        setIsScreenSharing(sharing);
        setRecallMessage(sharing ? "Screen sharing initiated" : "Screen sharing stopped");
      },
      onCameraShareChange: (sharing: boolean) => {
        setIsCameraSharing(sharing);
        setRecallMessage(sharing ? "Camera vision initiated" : "Camera vision stopped");
      },
      onProcessStateChange: (state: LiveProcessState | null) => {
        setProcessState(state);
      }
    };

    sessionRef.current = new LiveSession(sessionCallbacks);
    setIsMuted(sessionRef.current.getIsMuted());
    setIsSpeakerMuted(sessionRef.current.getIsSpeakerMuted());

    // Subscribe to tool manager events to sync state in React UI
    const unsubscribe = toolManagerInstance.subscribe((event) => {
      switch (event.type) {
        case "reminderCreated":
          setReminders((prev) => {
            if (prev.some((r) => r.id === event.data.id)) return prev;
            return [event.data, ...prev];
          });
          setRecallMessage("Task Created Successfully");
          break;

        case "timerCreated":
          setActiveTimers((prev) => {
            if (prev.some((t) => t.id === event.data.id)) {
              return prev.map((t) => (t.id === event.data.id ? { ...t, ...event.data } : t));
            }
            return [...prev, event.data];
          });
          setRecallMessage(`Timer Active: ${event.data.label}`);
          break;

        case "ambientSoundChanged":
          setActiveSound(event.data);
          setRecallMessage(`Synthesized ${event.data}`);
          break;

        case "websiteOpened":
          setOpenedWebsite({ url: event.data.url, opened: event.data.opened });
          setRecallMessage("Hologram Web Browsing");
          setTimeout(() => {
            setOpenedWebsite(null);
          }, 8000);
          break;

        // --- DEVICE CONTROLS REDUX EVENTS ---
        case "permissionRequested":
          setPendingApproval(event.data);
          setRecallMessage("Security Handshake Required");
          break;

        case "deviceLogAdded":
          setDeviceLogs((prev) => {
            if (prev.some((l) => l.id === event.data.id)) return prev;
            return [event.data, ...prev];
          });
          break;

        case "deviceLogsUpdated":
          setDeviceLogs(event.data);
          break;

        case "allowedAppsUpdated":
          setAllowedApps(event.data);
          break;

        case "applicationOpened":
          setActiveVirtualWindow({ appName: event.data.appName });
          setRecallMessage(`Activated ${event.data.appName}`);
          break;

        case "playVideo":
          setActiveVirtualWindow({
            appName: "YouTube",
            extraData: { index: event.data.index, title: event.data.title }
          });
          setRecallMessage(`Playing Video #${event.data.index}`);
          break;

        case "applicationClosed":
          setActiveVirtualWindow((prev) => 
            prev?.appName === event.data.appName ? null : prev
          );
          setRecallMessage(`Closed ${event.data.appName}`);
          break;

        case "fileOpened":
          setActiveVirtualWindow({
            appName: "Visual Studio Code",
            extraData: { file: event.data.fileName, path: event.data.path }
          });
          setRecallMessage("Retrieved Document File");
          break;

        case "folderOpened":
          setActiveVirtualWindow({
            appName: "Finder",
            extraData: { folder: event.data.folderPath }
          });
          setRecallMessage("Opened Directories");
          break;

        case "hardwareStateChanged":
          if (event.data.type === "volume") {
            setHwVolume(event.data.value);
            setRecallMessage(`Voice Volume: ${event.data.value}%`);
          } else if (event.data.type === "brightness") {
            setHwBrightness(event.data.value);
            setRecallMessage(`Display Dim: ${event.data.value}%`);
          }
          break;

        case "screenshotTaken":
          setActiveVirtualWindow({
            appName: "Pictures (Screenshot Capture)",
            extraData: { screenshot: true }
          });
          setRecallMessage("Captured Display Trace");
          break;

        case "securityBypassChanged":
          setBypassSecurityState(event.data);
          break;

        case "requestScreenShareEvent":
          setScreenShareRequest({
            reason: event.data.reason,
            callback: event.data.callback,
          });
          break;

        case "requestCameraShareEvent":
          (async () => {
            const isStop = event.data.action === "stop" || event.data.action === "disable" || event.data.action === "off";
            if (isStop) {
              if (sessionRef.current) {
                sessionRef.current.stopCameraShare();
              }
              event.data.callback(true);
            } else {
              if (!sessionRef.current || connectionState === "disconnected") {
                event.data.callback(false, "Tune is not active yet.");
                return;
              }
              try {
                if (!isCameraSharing) {
                  await sessionRef.current.startCameraShare();
                }
                event.data.callback(true);
              } catch (err: any) {
                event.data.callback(false, err?.message || "Failed to enable camera vision.");
              }
            }
          })();
          break;

        case "captureAndAnalyzeScreenEvent":
          (async () => {
            try {
              let dataUrl: string | null = null;
              if (sessionRef.current) {
                dataUrl = await sessionRef.current.captureSingleScreenFrame();
              }
              if (event.data.callback) {
                event.data.callback(dataUrl);
              }
            } catch (err: any) {
              console.error("Error capturing screen frame for vision analysis:", err);
              if (event.data.callback) {
                event.data.callback(null, err?.message || "Capture failed");
              }
            }
          })();
          break;
      }
    });

    const handlePlanningVoiceTrigger = async () => {
      setRecallMessage("PA Voice Planning Mode Active");
      if (connectionStateRef.current === "disconnected") {
        await sessionRef.current?.connect();
      }
    };

    const handleWindowTimerCreated = (e: any) => {
      if (e?.detail) {
        setActiveTimers((prev) => {
          if (prev.some((t) => t.id === e.detail.id)) {
            return prev.map((t) => (t.id === e.detail.id ? { ...t, ...e.detail } : t));
          }
          return [...prev, e.detail];
        });
        setRecallMessage(`Timer Started: ${e.detail.label}`);
      }
    };

    window.addEventListener("pa_trigger_planning_voice", handlePlanningVoiceTrigger);
    window.addEventListener("tune_timer_created", handleWindowTimerCreated);

    return () => {
      if (sessionRef.current) {
        sessionRef.current.disconnect();
      }
      window.removeEventListener("pa_trigger_planning_voice", handlePlanningVoiceTrigger);
      window.removeEventListener("tune_timer_created", handleWindowTimerCreated);
      unsubscribe();
      clearInterval(metricsInterval);
    };
  }, []);

  const handleMicClick = async () => {
    if (connectionState === "disconnected") {
      const activeKey = typeof localStorage !== "undefined" ? (localStorage.getItem("custom_gemini_api_key") || "").trim() : "";
      if (!activeKey) {
        soundEngine.playAlertBeep();
        setIsApiKeyModalOpen(true);
        setRecallMessage("Please connect your free Gemini API Key first");
        return;
      }
      setErrorMessage(null);
      setRecallMessage("Awakening Tune Companion");
      await sessionRef.current?.connect();
    } else if (connectionState === "speaking") {
      sessionRef.current?.triggerManualInterrupt();
    }
  };

  const handleTurnOff = () => {
    if (connectionState !== "disconnected") {
      setRecallMessage("Tune going to sleep...");
      sessionRef.current?.disconnect();
    }
  };

  const toggleMuteState = async () => {
    if (sessionRef.current) {
      const muted = await sessionRef.current.toggleMute();
      setIsMuted(muted);
      setRecallMessage(muted ? "Microphone Dormant" : "Microphone Active");
    }
  };

  const toggleScreenSharing = async () => {
    if (!sessionRef.current || connectionState === "disconnected") {
      setErrorMessage("Please wake up Tune first to start screen sharing.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    try {
      if (isScreenSharing) {
        sessionRef.current.stopScreenShare();
      } else {
        const mode = longTermMemory.preferences?.screen_share_mode || "entire";
        await sessionRef.current.startScreenShare(mode);
      }
    } catch (err: any) {
      const errMsg = (err?.message || err?.toString() || "").toLowerCase();
      if (errMsg.includes("getdisplaymedia is not a function") || errMsg.includes("not supported") || errMsg.includes("is not a function")) {
        setErrorMessage("Screen sharing is not supported in this browser or iframe context. Please click 'Open in a new tab' at top right to enable screen sharing!");
      } else if (errMsg.includes("permissions policy") || errMsg.includes("disallowed") || errMsg.includes("notallowederror")) {
        setErrorMessage("Screen share is restricted inside the preview iframe. Please click 'Open in a new tab' at the top right of your builder screen to allow screen sharing!");
      } else {
        setErrorMessage("Could not start screen sharing: " + (err.message || err));
      }
      setTimeout(() => setErrorMessage(null), 8000);
    }
  };

  const toggleCameraSharing = async () => {
    if (!sessionRef.current || connectionState === "disconnected") {
      setErrorMessage("Please wake up Tune first to start camera vision.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    try {
      if (isCameraSharing) {
        sessionRef.current.stopCameraShare();
        if (isFaceMirroring) {
          setIsFaceMirroring(false);
          setFaceMirrorData(null);
        }
      } else {
        await sessionRef.current.startCameraShare();
      }
    } catch (err: any) {
      const errMsg = (err?.message || err?.toString() || "").toLowerCase();
      if (errMsg.includes("permission denied") || errMsg.includes("notallowederror") || errMsg.includes("permission dismissed")) {
        setErrorMessage("Camera permission was denied. Please allow camera access in your browser site settings or click 'Open in a new tab' at top-right.");
      } else if (errMsg.includes("permissions policy") || errMsg.includes("disallowed")) {
        setErrorMessage("Camera access is restricted inside the preview frame. Please click 'Open in a new tab' at the top right of your screen to allow camera vision!");
      } else {
        setErrorMessage("Could not start camera vision: " + (err.message || err));
      }
      setTimeout(() => setErrorMessage(null), 8000);
    }
  };

  const toggleFaceMirroring = async () => {
    if (isFaceMirroring) {
      setIsFaceMirroring(false);
      setFaceMirrorData(null);
      if (mirrorAnimFrameRef.current) {
        cancelAnimationFrame(mirrorAnimFrameRef.current);
        mirrorAnimFrameRef.current = null;
      }
      setRecallMessage("Face Mirroring Disabled");
    } else {
      try {
        if (!isCameraSharing) {
          if (!sessionRef.current || connectionState === "disconnected") {
            setErrorMessage("Please wake up Tune first to activate Face Copy.");
            setTimeout(() => setErrorMessage(null), 4000);
            return;
          }
          await sessionRef.current.startCameraShare();
        }
        setIsFaceMirroring(true);
        if (!faceTrackerRef.current) {
          faceTrackerRef.current = new FaceTracker();
        }
        setRecallMessage("🪞 Face Copy Active! Tune is copying your facial gestures.");
      } catch (err: any) {
        setErrorMessage("Could not start face mirroring camera: " + (err.message || err));
        setTimeout(() => setErrorMessage(null), 6000);
      }
    }
  };

  // Real-time animation frame loop for face gesture tracking
  useEffect(() => {
    if (!isFaceMirroring) {
      if (mirrorAnimFrameRef.current) {
        cancelAnimationFrame(mirrorAnimFrameRef.current);
        mirrorAnimFrameRef.current = null;
      }
      return;
    }

    const processFrameLoop = () => {
      const cameraVideoEl = sessionRef.current?.getCameraVideoElement();
      if (cameraVideoEl && faceTrackerRef.current) {
        const mirrorData = faceTrackerRef.current.processVideoFrame(cameraVideoEl);
        setFaceMirrorData({ ...mirrorData });
      }
      mirrorAnimFrameRef.current = requestAnimationFrame(processFrameLoop);
    };

    mirrorAnimFrameRef.current = requestAnimationFrame(processFrameLoop);

    return () => {
      if (mirrorAnimFrameRef.current) {
        cancelAnimationFrame(mirrorAnimFrameRef.current);
        mirrorAnimFrameRef.current = null;
      }
    };
  }, [isFaceMirroring]);

  const handleAmbientSoundToggle = (sound: AmbientSoundType) => {
    toolManagerInstance.execute("playAmbientSound", { soundType: sound });
  };

  const removeReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  // Permission Action Resolvers
  const handleAuthorize = (approved: boolean) => {
    if (pendingApproval) {
      pendingApproval.resolve(approved);
      setPendingApproval(null);
      setRecallMessage(approved ? "Handshake Authorized" : "Action Blocked");
    }
  };

  // Toggle Allowed Application approval rule
  const handleToggleAutoApprove = (name: string, current: boolean) => {
    toolManagerInstance.updateAllowedApplication(name, !current);
    setRecallMessage(`Access Policy updated`);
  };

  const handleToggleBypassSecurity = (val: boolean) => {
    toolManagerInstance.setBypassSecurity(val);
    setRecallMessage(val ? "Security Intercept Bypassed" : "Security Intercept Protected");
  };

  // Custom Allowed App Creation
  const handleAddCustomApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;

    const newApp: AllowedApplication = {
      name: newAppName.trim(),
      category: newAppCategory,
      description: newAppDesc.trim() || "User registered local workspace application",
      logo: newAppCategory === "IDE & Editor" ? "💻" :
            newAppCategory === "Media & Audio" ? "🎵" :
            newAppCategory === "Web Browser" ? "🌐" : "⚙️",
      autoApprove: false
    };

    toolManagerInstance.addAllowedApplication(newApp);
    setRecallMessage(`Registered ${newAppName.trim()}`);
    setNewAppName("");
    setNewAppDesc("");
  };

  const handleVolumeSlider = (val: number) => {
    setHwVolume(val);
    toolManagerInstance.execute("adjustVolume", { level: val });
  };

  const handleBrightnessSlider = (val: number) => {
    setHwBrightness(val);
    toolManagerInstance.execute("adjustBrightness", { level: val });
  };

  // Memory Panel actions
  const handleAddMemorySnippet = async (text: string, category: string = "general") => {
    if (!text.trim()) return;
    const trimmed = text.trim();
    const newSnippet = {
      id: Math.random().toString(36).substring(2, 9),
      text: trimmed,
      category: category || "interest",
      timestamp: new Date().toISOString()
    };

    setLongTermMemory((prev) => {
      const updated = {
        ...prev,
        memories: [newSnippet, ...(prev.memories || [])]
      };
      localStorage.setItem("tune_long_term_memory", JSON.stringify(updated));
      return updated;
    });

    // Also persist to Firestore cloud store
    try {
      await addMemory(trimmed, category || "interest");
    } catch (e) {
      console.warn("Firestore addMemory background notice:", e);
    }

    // Sync over active live session if connected
    if (sessionRef.current) {
      sessionRef.current.sendMemorySync({
        ...longTermMemory,
        memories: [newSnippet, ...(longTermMemory.memories || [])]
      });
    }

    setRecallMessage(`Saved Memory: "${trimmed.substring(0, 25)}..."`);
  };

  const handleUpdateMemorySnippet = async (id: string, text: string, category?: string) => {
    if (!text.trim()) return;
    const trimmed = text.trim();
    const updatedMemories = (longTermMemory.memories || []).map((m) => {
      if (m.id === id) {
        return {
          ...m,
          text: trimmed,
          category: category || m.category || "interest",
          updatedAt: new Date().toISOString()
        };
      }
      return m;
    });

    setLongTermMemory((prev) => {
      const updated = {
        ...prev,
        memories: updatedMemories
      };
      localStorage.setItem("tune_long_term_memory", JSON.stringify(updated));
      return updated;
    });

    // Also update in Firestore cloud store
    try {
      await updateMemory(id, trimmed, category);
    } catch (e) {
      console.warn("Firestore updateMemory background notice:", e);
    }

    // Sync to active live session WebSocket
    if (sessionRef.current) {
      sessionRef.current.sendMemorySync({
        ...longTermMemory,
        memories: updatedMemories
      });
    }

    setRecallMessage(`Updated Memory: "${trimmed.substring(0, 25)}..."`);
  };

  const handleDeleteMemorySnippet = async (id: string) => {
    const remaining = (longTermMemory.memories || []).filter((m) => m.id !== id);
    setLongTermMemory((prev) => {
      const updated = {
        ...prev,
        memories: remaining
      };
      localStorage.setItem("tune_long_term_memory", JSON.stringify(updated));
      return updated;
    });

    // Also delete in Firestore cloud store
    try {
      await deleteMemory(id);
    } catch (e) {
      console.warn("Firestore deleteMemory background notice:", e);
    }

    if (sessionRef.current) {
      sessionRef.current.sendMemorySync({
        ...longTermMemory,
        memories: remaining
      });
    }

    setRecallMessage("Deleted fact snippet");
  };

  const handleUpdateProfileName = (newName: string) => {
    setLongTermMemory((prev) => {
      const updated = {
        ...prev,
        user_profile: {
          ...(prev.user_profile || { name: "", personality: "", interests: [], goals: [] }),
          name: newName
        }
      };
      localStorage.setItem("tune_long_term_memory", JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdatePersonality = (newPersonality: string) => {
    setLongTermMemory((prev) => {
      const updated = {
        ...prev,
        user_profile: {
          ...(prev.user_profile || { name: "", personality: "", interests: [], goals: [] }),
          personality: newPersonality
        }
      };
      localStorage.setItem("tune_long_term_memory", JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdatePreferences = (updatedPrefs: Partial<typeof longTermMemory.preferences> & { crowded_mode?: boolean }) => {
    if (updatedPrefs.crowded_mode !== undefined && sessionRef.current) {
      sessionRef.current.setCrowdedMode(updatedPrefs.crowded_mode);
    }
    setLongTermMemory((prev) => {
      const updated = {
        ...prev,
        preferences: {
          ...(prev.preferences || { speaking_style: "Conversational, natural", favorite_topics: [] }),
          ...updatedPrefs
        }
      };
      localStorage.setItem("tune_long_term_memory", JSON.stringify(updated));
      return updated;
    });
    setRecallMessage("Vocal & DSP Preferences Updated");
  };

  const handleSwitchActiveSpeaker = (name: string) => {
    setLongTermMemory((prev) => {
      const speakers = prev.speakers || [];
      const spk = speakers.find((s) => s.name.toLowerCase() === name.toLowerCase());
      const updated = {
        ...prev,
        active_speaker: {
          name,
          relationship: spk?.relationship || "Friend",
          confidence: "high"
        }
      };
      localStorage.setItem("tune_long_term_memory", JSON.stringify(updated));
      return updated;
    });
    setRecallMessage(`Active Speaker Switched: ${name}`);
  };

  const handleAddSpeakerProfile = (name: string, relationship: string, preferences?: string, notes?: string) => {
    setLongTermMemory((prev) => {
      const speakers = prev.speakers || [];
      const existingIdx = speakers.findIndex((s) => s.name.toLowerCase() === name.toLowerCase());
      let updatedSpeakers = [...speakers];
      if (existingIdx >= 0) {
        updatedSpeakers[existingIdx] = {
          ...updatedSpeakers[existingIdx],
          name,
          relationship: relationship || updatedSpeakers[existingIdx].relationship,
          preferences: preferences || updatedSpeakers[existingIdx].preferences,
          notes: notes || updatedSpeakers[existingIdx].notes,
          lastSpokeAt: new Date().toISOString()
        };
      } else {
        updatedSpeakers.push({
          id: "spk_" + Math.random().toString(36).substring(2, 9),
          name,
          relationship: relationship || "Friend",
          preferences: preferences || "",
          notes: notes || "",
          lastSpokeAt: new Date().toISOString()
        });
      }
      const updated = {
        ...prev,
        speakers: updatedSpeakers,
        active_speaker: {
          name,
          relationship: relationship || "Friend",
          confidence: "high"
        }
      };
      localStorage.setItem("tune_long_term_memory", JSON.stringify(updated));
      return updated;
    });
    setRecallMessage(`Speaker Profile Registered: ${name}`);
  };

  const handleDeleteSpeakerProfile = (id: string) => {
    setLongTermMemory((prev) => {
      const updated = {
        ...prev,
        speakers: (prev.speakers || []).filter((s) => s.id !== id)
      };
      localStorage.setItem("tune_long_term_memory", JSON.stringify(updated));
      return updated;
    });
    setRecallMessage("Speaker Profile Removed");
  };

  const MOOD_BADGES: Record<string, { label: string; dot: string; glow: string }> = {
    happy: { label: "Happy ✨", dot: "bg-amber-400", glow: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
    laughing: { label: "Joyous Laugh 😆", dot: "bg-orange-400", glow: "border-orange-500/30 bg-orange-500/10 text-orange-300" },
    thinking: { label: "Thinking ⚡", dot: "bg-sky-400", glow: "border-sky-500/30 bg-sky-500/10 text-sky-300" },
    excited: { label: "Excited 🌟", dot: "bg-pink-400", glow: "border-pink-500/30 bg-pink-500/10 text-pink-300" },
    scolded: { label: "Innocent Pout 🥺", dot: "bg-rose-400", glow: "border-rose-500/30 bg-rose-500/10 text-rose-300" },
    baby_pout: { label: "Innocent Pout 🥺", dot: "bg-rose-400", glow: "border-rose-500/30 bg-rose-500/10 text-rose-300" },
    surprised: { label: "Surprised 😲", dot: "bg-yellow-400", glow: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300" },
    concerned: { label: "Empathy 💜", dot: "bg-purple-400", glow: "border-purple-500/30 bg-purple-500/10 text-purple-300" },
    supportive: { label: "Supportive 💜", dot: "bg-purple-400", glow: "border-purple-500/30 bg-purple-500/10 text-purple-300" },
    curious: { label: "Curious 🔍", dot: "bg-indigo-400", glow: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300" },
    confused: { label: "Puzzled 🤔", dot: "bg-indigo-400", glow: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300" },
    angry: { label: "Angry 😠", dot: "bg-red-400", glow: "border-red-500/30 bg-red-500/10 text-red-300" },
    calm: { label: "Calm 🌿", dot: "bg-emerald-400", glow: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  };
  const activeBadge = MOOD_BADGES[mood] || MOOD_BADGES.calm;

  return (
    <div className="w-screen h-screen overflow-hidden bg-black text-white select-none font-sans relative">
      {/* PURE DEEP OBSIDIAN CANVAS (ZERO OVERLAYS, JUST THE BLENDED SENTIENT LIPS) */}

      {/* 4. COMPACT WEBSITE BROWSER CUE BANNER */}
      <AnimatePresence>
        {openedWebsite && (
          <motion.div
            initial={{ opacity: 0, y: -45, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-16 left-1/2 transform -translate-x-1/2 z-30 max-w-md w-[92%] bg-zinc-950/90 backdrop-blur-3xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-cyan-300 font-bold font-mono uppercase tracking-wide">
                  {openedWebsite.opened ? "Successfully Launched Website" : "Opening Website..."}
                </p>
                <p className="text-xs font-semibold truncate text-white/90">
                  {openedWebsite.opened ? "Check your open tabs" : "Popup blocked? Tap to launch"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={openedWebsite.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpenedWebsite(null)}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                {!openedWebsite.opened ? "Launch Link" : "Reopen"} <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setOpenedWebsite(null)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-white/40 hover:text-white/80 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. VIRTUAL WINDOW DISPLAY CUE (HOLOGRAPHIC) */}
      <AnimatePresence>
        {activeVirtualWindow && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-[16%] left-4 md:left-6 max-w-sm w-full bg-zinc-950/80 backdrop-blur-3xl border border-white/10 rounded-2xl p-3.5 shadow-2xl z-30 flex flex-col gap-2.5"
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[9px] font-bold font-mono tracking-wider text-cyan-400 uppercase">HOLOGRAPHIC EMULATOR</span>
              </div>
              <button
                onClick={() => setActiveVirtualWindow(null)}
                className="text-white/40 hover:text-white transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-300 text-lg border border-cyan-500/20">
                {activeVirtualWindow.appName.toLowerCase().includes("code") ? "💻" :
                 activeVirtualWindow.appName.toLowerCase().includes("finder") ? "📂" : "🌐"}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white/90 truncate">{activeVirtualWindow.appName}</h4>
                <p className="text-[9px] text-white/40 font-mono truncate">
                  {activeVirtualWindow.extraData?.file || activeVirtualWindow.extraData?.folder || "System Interface Hooked"}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. SYSTEM SECURITY TRIGGER MODAL */}
      <AnimatePresence>
        {pendingApproval && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-lg z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-500/35 rounded-3xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(234,179,8,0.15)] text-center flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-4 animate-bounce">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold font-display text-yellow-400">HARDWARE INTERCEPT REQUEST</h3>
              <p className="text-xs text-white/70 mt-2 leading-relaxed">
                Tune Companion is attempting to interface with your local system. Please verify if you authorize this request:
              </p>
              <div className="w-full bg-white/3 border border-white/5 rounded-xl p-3.5 my-4 text-left">
                <div className="text-[10px] text-white/40 font-mono uppercase">Request Action</div>
                <div className="text-xs font-bold text-white/95 mt-0.5">{pendingApproval.name}</div>
                <div className="text-[10px] text-white/40 font-mono uppercase mt-2.5">Arguments</div>
                <pre className="text-[9px] text-yellow-400 font-mono mt-1 bg-black/30 p-2 rounded border border-white/5 overflow-x-auto">
                  {JSON.stringify(pendingApproval.args, null, 2)}
                </pre>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => handleAuthorize(true)}
                  className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 rounded-2xl text-xs font-bold transition cursor-pointer"
                >
                  Authorize System
                </button>
                <button
                  onClick={() => handleAuthorize(false)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-semibold transition cursor-pointer border border-white/10"
                >
                  Block Action
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6.9 TOP-LEFT 3-LINE (HAMBURGER) MENU TRIGGER */}
      <div className="absolute top-4 left-4 z-40">
        <button
          onClick={() => {
            soundEngine.playActionBeep();
            setIsToolsSidePanelOpen(true);
          }}
          className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.16] active:scale-85 border border-white/[0.12] backdrop-blur-xl transition-all duration-150 cursor-pointer flex flex-col items-center justify-center gap-[3px] group shadow-[0_2px_12px_rgba(0,0,0,0.4)]"
          title="Tools & Controls (টুলস)"
          aria-label="Open Tools Side Panel"
        >
          <span className="w-3.5 h-[1.5px] bg-white/90 group-hover:bg-white rounded-full transition-all" />
          <span className="w-3.5 h-[1.5px] bg-white/90 group-hover:bg-white rounded-full transition-all" />
          <span className="w-3.5 h-[1.5px] bg-white/90 group-hover:bg-white rounded-full transition-all" />
        </button>
      </div>

      {/* 8. MAIN FULL-SCREEN PURE DARK CANVAS WITH 3D BLENDED SENTIENT MOUTH */}
      <main className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden z-10 bg-black">
        <WaveVisualizer
          connectionState={connectionState}
          userVolume={userVolume}
          aiVolume={aiVolume}
          userFrequencies={userFrequencies}
          aiFrequencies={aiFrequencies}
          isMuted={isMuted}
          onClick={handleMicClick}
          onDoubleTap={handleTurnOff}
          sensitivity={longTermMemory.preferences?.wave_sensitivity ?? 65}
        />

        {/* ULTRA-MINIMAL SEAMLESS FLOATING SUBTITLES & SEARCH DECK */}
        <div className="absolute bottom-5 w-full max-w-xl px-4 pointer-events-none z-20 flex justify-center">
          <FloatingSubtitleStream
            connectionState={connectionState}
            transcriptions={transcriptions}
          />
        </div>
      </main>

      {/* 8.1 FLOATING MINIMALIST CHAT LINE HANDLE (Freely draggable anywhere on screen, toggled via Control Center) */}
      {showFloatingChatBar && !isToolsSidePanelOpen && (
        <motion.div
          drag
          dragMomentum={false}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            soundEngine.playActionBeep();
            setIsChatDrawerOpen(true);
          }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto cursor-grab active:cursor-grabbing select-none group touch-none flex flex-col items-center justify-center p-2.5"
          title="Hold and drag anywhere. Tap or swipe up to chat."
          aria-label="Open AI Chat Handle"
        >
          {/* Minimalist Capsule Line / Bar (iOS Home Bar style) */}
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-1.5 rounded-full bg-white/40 group-hover:bg-white/90 group-active:bg-cyan-400 shadow-[0_2px_12px_rgba(255,255,255,0.25)] border border-white/20 transition-all duration-200" />
            <div className="absolute inset-0 bg-white/20 blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </div>
        </motion.div>
      )}

      {/* 9. TOOLS SIDE PANEL (Left Drawer) */}
      <ToolsSidePanel
        isOpen={isToolsSidePanelOpen}
        onClose={() => setIsToolsSidePanelOpen(false)}
        onOpenTextMode={() => setIsChatDrawerOpen(true)}
        showFloatingChatBar={showFloatingChatBar}
        toggleFloatingChatBar={() => {
          setShowFloatingChatBar((prev) => {
            const next = !prev;
            if (typeof localStorage !== "undefined") {
              localStorage.setItem("tune_show_floating_chat_bar", String(next));
            }
            soundEngine.playActionBeep();
            return next;
          });
        }}
        isSpeakerMuted={isSpeakerMuted}
        toggleSpeakerMute={toggleSpeakerMute}
        isAskingMode={isAskingMode}
        toggleAskingMode={toggleAskingMode}
        isScreenSharing={isScreenSharing}
        toggleScreenSharing={toggleScreenSharing}
        isCameraSharing={isCameraSharing}
        toggleCameraSharing={toggleCameraSharing}
        isFaceMirroring={isFaceMirroring}
        toggleFaceMirroring={toggleFaceMirroring}
        onOpenIntelligentPA={() => setIsIntelligentPAOpen(true)}
        onOpenChatHistory={() => setIsChatHistoryOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenMistakeFocusBoard={() => setIsMistakeFocusBoardOpen(true)}
        onOpenFileManager={() => setIsFileManagerOpen(true)}
        onOpenAgenticHub={() => setIsAgenticHubOpen(true)}
        onOpenWhiteboard={() => setIsWhiteboardOpen(true)}
        onOpenDraftModal={() => setIsDraftModalOpen(true)}
        onOpenControlPanel={() => setIsControlPanelOpen(true)}
        onOpenApiKeySetup={() => setIsApiKeyModalOpen(true)}
        onOpenAccountModal={() => {
          setAccountModalInitialTab("account");
          setIsAccountModalOpen(true);
        }}
        onOpenPersonalityModal={() => {
          setAccountModalInitialTab("personality");
          setIsAccountModalOpen(true);
        }}
        onOpenInstallApp={() => setShowPwaModal(true)}
        voiceSensitivity={longTermMemory.preferences?.wave_sensitivity ?? 65}
        onVoiceSensitivityChange={(val) => {
          handleUpdatePreferences({ wave_sensitivity: val });
        }}
        connectionState={connectionState}
      />

      {/* 10. UNIFIED CONTROL SYSTEM MODALS/DRAWER */}
      <ControlPanel
        isOpen={isControlPanelOpen}
        onClose={() => setIsControlPanelOpen(false)}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
        pinnedToolIds={pinnedToolIds}
        onTogglePinTool={handleTogglePinTool}
        onReorderTools={handleReorderTools}
        isSpeakerMuted={isSpeakerMuted}
        toggleSpeakerMute={toggleSpeakerMute}
        isAskingMode={isAskingMode}
        toggleAskingMode={toggleAskingMode}
        isIntelligentPAOpen={isIntelligentPAOpen}
        onOpenIntelligentPA={() => setIsIntelligentPAOpen(true)}
        onOpenMistakeFocusBoard={() => setIsMistakeFocusBoardOpen(true)}
        onOpenFileManager={() => setIsFileManagerOpen(true)}
        reminders={reminders}
        removeReminder={removeReminder}
        allowedApps={allowedApps}
        handleToggleAutoApprove={handleToggleAutoApprove}
        searchAppQuery={searchAppQuery}
        setSearchAppQuery={setSearchAppQuery}
        newAppName={newAppName}
        setNewAppName={setNewAppName}
        newAppCategory={newAppCategory}
        setNewAppCategory={setNewAppCategory}
        newAppDesc={newAppDesc}
        setNewAppDesc={setNewAppDesc}
        handleAddCustomApp={handleAddCustomApp}
        deviceLogs={deviceLogs}
        pendingApproval={pendingApproval}
        handleAuthorize={handleAuthorize}
        hwVolume={hwVolume}
        handleVolumeSlider={handleVolumeSlider}
        hwBrightness={hwBrightness}
        handleBrightnessSlider={handleBrightnessSlider}
        longTermMemory={longTermMemory}
        handleUpdateProfileName={handleUpdateProfileName}
        handleUpdatePersonality={handleUpdatePersonality}
        handleUpdatePreferences={handleUpdatePreferences}
        handleAddMemorySnippet={handleAddMemorySnippet}
        handleUpdateMemorySnippet={handleUpdateMemorySnippet}
        handleDeleteMemorySnippet={handleDeleteMemorySnippet}
        handleSwitchActiveSpeaker={handleSwitchActiveSpeaker}
        handleAddSpeakerProfile={handleAddSpeakerProfile}
        handleDeleteSpeakerProfile={handleDeleteSpeakerProfile}
        activeSound={activeSound}
        handleAmbientSoundToggle={handleAmbientSoundToggle}
        bypassSecurity={bypassSecurity}
        handleToggleBypassSecurity={handleToggleBypassSecurity}
        isScreenSharing={isScreenSharing}
        toggleScreenSharing={toggleScreenSharing}
        isCameraSharing={isCameraSharing}
        toggleCameraSharing={toggleCameraSharing}
        isFaceMirroring={isFaceMirroring}
        toggleFaceMirroring={toggleFaceMirroring}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenChatHistory={() => setIsChatHistoryOpen(true)}
      />

      {/* Share Modal for Mobile Access & custom API key guidance */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onOpenApiKeySettings={() => setIsApiKeyModalOpen(true)}
      />

      {/* User Gemini API Key Connect Modal with iPhone "hello" Animation & Sondip branding */}
      <ApiKeySetupModal
        isOpen={isApiKeyModalOpen}
        canDismiss={Boolean(typeof localStorage !== "undefined" && localStorage.getItem("custom_gemini_api_key"))}
        onCancel={() => setIsApiKeyModalOpen(false)}
        onSuccess={async (validKey) => {
          setIsApiKeyModalOpen(false);
          setRecallMessage("API Key Connected! Starting Tune Companion...");
          soundEngine.playNotificationChime();
          // Connect to Gemini Live if disconnected
          if (sessionRef.current && connectionState === "disconnected") {
            try {
              await sessionRef.current.connect();
            } catch (e) {
              console.warn("Auto-connect after key save notice:", e);
            }
          }
        }}
      />

      {/* Multi-User Google Account, Personal Key & AI Personality Modal */}
      <AccountAuthModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        initialTab={accountModalInitialTab}
        onApiKeyUpdated={(key) => {
          setRecallMessage(key ? "Personal API Key updated!" : "Using default API Key");
        }}
      />

      {/* 10.1 WORKSPACE PORTAL MODALS */}
      <AgenticHub
        isOpen={isAgenticHubOpen}
        onClose={() => setIsAgenticHubOpen(false)}
        activeApp={activeVirtualWindow?.appName || null}
        deviceLogs={deviceLogs}
      />

      <ChatHistory
        isOpen={isChatHistoryOpen}
        onClose={() => setIsChatHistoryOpen(false)}
      />

      <MistakeFocusBoard
        isOpen={isMistakeFocusBoardOpen}
        onClose={() => setIsMistakeFocusBoardOpen(false)}
      />

      <FileManagerModal
        isOpen={isFileManagerOpen}
        onClose={() => setIsFileManagerOpen(false)}
      />

      <IntelligentPAManager
        isOpen={isIntelligentPAOpen}
        onClose={() => setIsIntelligentPAOpen(false)}
      />

      {/* 11. AUDIO/GUIDE COMPACT MODAL */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-lg z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950/95 border border-white/10 rounded-3xl p-5 md:p-6 max-w-md w-full shadow-2xl relative select-text"
            >
              <button
                onClick={() => setShowGuideModal(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-white/5 rounded-full text-white/50 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 mb-4 border-b border-white/5 pb-3">
                <HelpCircle className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold tracking-wider font-display text-white">VOICE COMPANION INSTRUCTIONS</h3>
              </div>

              <div className="space-y-4 text-xs leading-relaxed text-zinc-300">
                <p>
                  To interface with Tune naturally, simply tap the **Central AI Orb** to awaken her. Once she is listening, speak like you would with a human.
                </p>
                
                <div className="space-y-2.5 bg-white/3 border border-white/5 p-3.5 rounded-2xl">
                  <span className="text-[10px] font-bold font-mono text-cyan-300 tracking-wider block">SUPPORTED SYSTEM INTERFACES</span>
                  <ul className="space-y-1.5 list-disc pl-4 text-white/90">
                    <li><strong className="text-cyan-400">Memory Recalls:</strong> "Remember that I like black tea"</li>
                    <li><strong className="text-cyan-400">Applications:</strong> "Open Spotify" or "Launch VS Code"</li>
                    <li><strong className="text-cyan-400">Atmosphere:</strong> "Play rain sound to help me focus"</li>
                    <li><strong className="text-cyan-400">Hardware sync:</strong> "Adjust speaking volume to 80"</li>
                    <li><strong className="text-cyan-400">Reminders:</strong> "Remind me to call Mom in 5 minutes"</li>
                  </ul>
                </div>

                <p className="text-[10px] text-zinc-500 font-mono text-center">
                  SECURE COGNITIVE COMPANION NODE // AES-256
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 11.2 PROGRAMMATIC SCREEN SHARE REQUEST MODAL */}
      <AnimatePresence>
        {screenShareRequest && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950/95 border border-purple-500/30 rounded-3xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(168,85,247,0.15)] relative select-text"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-400 animate-pulse">
                  <ScreenShare className="w-8 h-8" />
                </div>
                
                <h3 className="text-lg font-bold tracking-wider font-display text-white">
                  TUNE REQUESTS SCREEN VIEW
                </h3>

                <p className="text-xs text-zinc-400 font-mono leading-relaxed bg-white/3 border border-white/5 p-4 rounded-2xl w-full">
                  "I would like to see your screen {screenShareRequest.reason ? `to ${screenShareRequest.reason}` : "so I can provide visual assistance and guidance"}. Please approve to begin streaming."
                </p>

                <div className="flex items-center gap-3 w-full mt-4">
                  <button
                    onClick={() => {
                      screenShareRequest.callback(false);
                      setScreenShareRequest(null);
                    }}
                    className="flex-1 py-3 text-xs font-bold font-mono tracking-wider border border-white/5 bg-white/3 text-white/70 hover:bg-white/10 hover:text-white rounded-2xl transition cursor-pointer"
                  >
                    DECLINE
                  </button>
                  <button
                    onClick={async () => {
                      const req = screenShareRequest;
                      setScreenShareRequest(null);
                      req.callback(true);
                      try {
                        if (sessionRef.current) {
                          await sessionRef.current.startScreenShare();
                        }
                      } catch (err: any) {
                        const errMsg = (err?.message || err?.toString() || "").toLowerCase();
                        if (errMsg.includes("getdisplaymedia is not a function") || errMsg.includes("not supported") || errMsg.includes("is not a function")) {
                          setErrorMessage("Screen sharing is not supported in this browser or iframe context. Please click 'Open in a new tab' at top right!");
                        } else if (errMsg.includes("permissions policy") || errMsg.includes("disallowed")) {
                          setErrorMessage("Screen share is restricted inside the preview iframe. Please click 'Open in a new tab' at top right!");
                        } else {
                          setErrorMessage("Could not start screen sharing: " + (err.message || err));
                        }
                        setTimeout(() => setErrorMessage(null), 8000);
                      }
                    }}
                    className="flex-1 py-3 text-xs font-bold font-mono tracking-wider border border-purple-500/30 bg-purple-500 text-white hover:bg-purple-600 rounded-2xl transition shadow-[0_0_20px_rgba(168,85,247,0.3)] cursor-pointer"
                  >
                    SHARE SCREEN
                  </button>
                </div>

                <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">
                  Secure Realtime Input stream (1 FPS max)
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 11.3 MOBILE APP (WEBAPK / PWA) INSTALLATION GUIDANCE MODAL */}
      <InteractiveDraftModal
        draft={activeDraft}
        isOpen={isDraftModalOpen}
        onClose={() => setIsDraftModalOpen(false)}
        onUpdateDraft={(updated) => setActiveDraft(updated)}
      />

      {/* 11.4 REAL-TIME TEACHER WHITEBOARD DRAWING MODAL */}
      <TeacherWhiteboardModal
        session={activeWhiteboard}
        isOpen={isWhiteboardOpen}
        onClose={() => setIsWhiteboardOpen(false)}
        onAskTeacherPrompt={handleAskTeacherPrompt}
        onUpdateSession={(updated) => setActiveWhiteboard(updated)}
      />

      {/* 11.5 FLOATING LIVE PROGRESS TIMER OVERLAY */}
      <LiveTimerProgressOverlay
        timers={activeTimers}
        onDismiss={handleDismissTimer}
        onUpdateTimer={handleUpdateTimer}
      />

      {/* 11.6 REAL-TIME INTERACTIVE CALCULATOR MODAL (VOICE & MANUAL) */}
      <RealtimeCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        initialCalculation={activeCalculation}
      />

      {/* 11.7 REAL-TIME CLOCK & TIMEZONE POPUP MODAL */}
      <ClockPopupModal
        isOpen={isClockOpen}
        onClose={() => setIsClockOpen(false)}
        onStartTimer={(duration, label) => {
          if (toolManagerInstance) {
            toolManagerInstance.execute("setTimer", { duration, label: label || "Quick Timer" });
          }
        }}
      />

      {/* 11.8 MULTI-PLATFORM INSTALL & RUN MODAL (ANDROID / WINDOWS / WEB) */}
      <InstallPlatformModal
        isOpen={showPwaModal}
        onClose={() => setShowPwaModal(false)}
        deferredPrompt={deferredPrompt}
        onTriggerInstall={handleInstallApp}
      />

      {/* 11.9 INTERACTIVE SLIDE-UP CHAT DRAWER (CHATGPT / MESSENGER STYLE) */}
      <InteractiveChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => setIsChatDrawerOpen(false)}
        onOpenApiKeySetup={() => setIsApiKeyModalOpen(true)}
      />

      {/* NO FOOTER - PURE OBSIDIAN SCREEN */}
    </div>
  );
}
