import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Volume2,
  VolumeX,
  MessageSquareQuote,
  Bot,
  Smile,
  Share2,
  ScreenShare,
  ScreenShareOff,
  Camera,
  CameraOff,
  Brain,
  FolderOpen,
  MessageSquare,
  Settings,
  PenTool,
  FileText,
  ChevronDown,
  ChevronRight,
  Layers,
  Mic,
  Sliders,
  Key,
  User,
  UserPlus,
  Users,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Trash2,
  Edit3,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  Loader2,
  Calculator,
  Clock,
  Download,
  Zap,
  Play
} from "lucide-react";
import { soundEngine } from "../utils/soundEngine";
import { ConnectionState } from "../types";
import {
  getStoredProfiles,
  getActiveProfile,
  switchActiveProfile,
  createNewProfile,
  updateActiveProfileApiKey,
  deleteUserProfile,
  UserAccountProfile,
  STORAGE_API_KEY_CONFIGURED,
  AiProvider,
  PROVIDERS,
  detectAiProvider
} from "../utils/userProfiles";
import {
  validateAndTestKeyLive,
  clearInjectedApiKey,
  getInjectedApiKey,
  hasInjectedApiKey
} from "../utils/apiKeyManager";

interface ToolsSidePanelProps {
  isOpen: boolean;
  onClose: () => void;

  // Toggle tool states
  isSpeakerMuted?: boolean;
  toggleSpeakerMute?: () => void;
  isAskingMode?: boolean;
  toggleAskingMode?: () => void;
  isScreenSharing?: boolean;
  toggleScreenSharing?: () => void;
  isCameraSharing?: boolean;
  toggleCameraSharing?: () => void;
  isFaceMirroring?: boolean;
  toggleFaceMirroring?: () => void;

  // Modal launchers
  onOpenIntelligentPA?: () => void;
  onOpenChatHistory?: () => void;
  onOpenShareModal?: () => void;
  onOpenMistakeFocusBoard?: () => void;
  onOpenFileManager?: () => void;
  onOpenAgenticHub?: () => void;
  onOpenWhiteboard?: () => void;
  onOpenDraftModal?: () => void;
  onOpenControlPanel?: () => void;
  onOpenApiKeySetup?: () => void;
  onOpenAccountModal?: () => void;
  onOpenPersonalityModal?: () => void;
  onOpenInstallApp?: () => void;

  // Voice sensitivity
  voiceSensitivity?: number;
  onVoiceSensitivityChange?: (val: number) => void;

  // Floating Chat Line toggle
  showFloatingChatBar?: boolean;
  toggleFloatingChatBar?: () => void;

  // Text Mode trigger
  onOpenTextMode?: () => void;
}

// iOS Switch Component (Apple Settings / Control Center style)
const IOSSwitch: React.FC<{ checked: boolean; onChange: () => void; activeColor?: string }> = ({
  checked,
  onChange,
  activeColor = "bg-emerald-500",
}) => {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`w-11 h-6.5 rounded-full p-0.5 cursor-pointer transition-colors duration-200 ease-in-out flex items-center shrink-0 ${
        checked ? activeColor : "bg-white/20"
      }`}
    >
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform ${
          checked ? "translate-x-4.5" : "translate-x-0"
        }`}
      />
    </div>
  );
};

export const ToolsSidePanel: React.FC<ToolsSidePanelProps> = ({
  isOpen,
  onClose,
  isSpeakerMuted = false,
  toggleSpeakerMute,
  isAskingMode = false,
  toggleAskingMode,
  isScreenSharing = false,
  toggleScreenSharing,
  isCameraSharing = false,
  toggleCameraSharing,
  isFaceMirroring = false,
  toggleFaceMirroring,
  onOpenIntelligentPA,
  onOpenChatHistory,
  onOpenShareModal,
  onOpenMistakeFocusBoard,
  onOpenFileManager,
  onOpenAgenticHub,
  onOpenWhiteboard,
  onOpenDraftModal,
  onOpenControlPanel,
  onOpenApiKeySetup,
  onOpenAccountModal,
  onOpenPersonalityModal,
  onOpenInstallApp,
  voiceSensitivity = 65,
  onVoiceSensitivityChange,
  connectionState = "disconnected",
  showFloatingChatBar = true,
  toggleFloatingChatBar,
  onOpenTextMode,
}) => {
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [localSensitivity, setLocalSensitivity] = useState(voiceSensitivity);

  // User Profiles and Isolated API Key Management
  const [profiles, setProfiles] = useState<UserAccountProfile[]>(() => getStoredProfiles());
  const [activeProfile, setActiveProfile] = useState<UserAccountProfile>(() => getActiveProfile());
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);
  const [showCreateProfileForm, setShowCreateProfileForm] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileRole, setNewProfileRole] = useState("Member");
  const [newProfileApiKey, setNewProfileApiKey] = useState("");

  // Inline API Key Configuration
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => activeProfile.apiKey || "");
  const [selectedProvider, setSelectedProvider] = useState<AiProvider | "auto">("auto");
  const [showApiKeyText, setShowApiKeyText] = useState(false);
  const [isVerifyingApiKey, setIsVerifyingApiKey] = useState(false);
  const [isTestingLiveKey, setIsTestingLiveKey] = useState(false);
  const [liveTestResult, setLiveTestResult] = useState<{ message: string; liveText?: string; isError?: boolean } | null>(null);
  const [apiKeyFeedback, setApiKeyFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  useEffect(() => {
    setLocalSensitivity(voiceSensitivity);
  }, [voiceSensitivity]);

  // Sync state when drawer opens or events fire
  useEffect(() => {
    if (isOpen) {
      const p = getStoredProfiles();
      const a = getActiveProfile();
      setProfiles(p);
      setActiveProfile(a);
      setApiKeyInput(a.apiKey || "");
      setSelectedProvider(a.provider || "auto");
      setApiKeyFeedback(null);
      setIsEditingApiKey(false);
      setShowProfileSwitcher(false);
      setShowCreateProfileForm(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleProfileChanged = (e: any) => {
      const updatedActive = e.detail || getActiveProfile();
      setActiveProfile(updatedActive);
      setProfiles(getStoredProfiles());
      setApiKeyInput(updatedActive.apiKey || "");
      setSelectedProvider(updatedActive.provider || "auto");
    };
    const handleKeyUpdated = (e: any) => {
      const updatedActive = getActiveProfile();
      setActiveProfile(updatedActive);
      setProfiles(getStoredProfiles());
      setApiKeyInput(updatedActive.apiKey || "");
      setSelectedProvider(updatedActive.provider || "auto");
    };
    window.addEventListener("tune-profile-changed", handleProfileChanged);
    window.addEventListener("tune-api-key-updated", handleKeyUpdated);
    return () => {
      window.removeEventListener("tune-profile-changed", handleProfileChanged);
      window.removeEventListener("tune-api-key-updated", handleKeyUpdated);
    };
  }, []);

  // Fast keyboard ESC dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSensitivitySlider = (newVal: number) => {
    setLocalSensitivity(newVal);
    if (onVoiceSensitivityChange) {
      onVoiceSensitivityChange(newVal);
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("tune_voice_sensitivity", newVal.toString());
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("tune_voice_sensitivity_changed", {
          detail: { sensitivity: newVal },
        })
      );
    }
  };
  const [isCardModeActive, setIsCardModeActive] = useState<boolean>(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("tune_card_mode") !== "false";
    }
    return true;
  });

  const handleToggleCardMode = () => {
    soundEngine.playActionBeep();
    const next = !isCardModeActive;
    setIsCardModeActive(next);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("tune_card_mode", String(next));
      localStorage.setItem("tune_card_view", String(next));
      localStorage.setItem("tune_card_search", String(next));
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tune_card_mode_changed", { detail: { cardMode: next } }));
    }
  };

  const handleAction = (cb?: () => void) => {
    if (cb) {
      soundEngine.playActionBeep();
      cb();
    }
  };

  const handleSwitchToProfile = (profileId: string) => {
    soundEngine.playActionBeep();
    const updated = switchActiveProfile(profileId);
    setActiveProfile(updated);
    setProfiles(getStoredProfiles());
    setApiKeyInput(updated.apiKey || "");
    setSelectedProvider(updated.provider || "auto");
    setShowProfileSwitcher(false);
    setApiKeyFeedback({
      message: `Profile switched to ${updated.name}!`,
      isError: false,
    });
    setTimeout(() => setApiKeyFeedback(null), 3500);
  };

  const handleCreateProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    soundEngine.playActionBeep();
    const created = createNewProfile(newProfileName.trim(), newProfileRole.trim() || "Member", newProfileApiKey.trim());
    setActiveProfile(created);
    setProfiles(getStoredProfiles());
    setApiKeyInput(created.apiKey || "");
    setSelectedProvider(created.provider || "auto");
    setNewProfileName("");
    setNewProfileRole("Member");
    setNewProfileApiKey("");
    setShowCreateProfileForm(false);
    setShowProfileSwitcher(false);
    setApiKeyFeedback({
      message: `New Profile for ${created.name} created!`,
      isError: false,
    });
    setTimeout(() => setApiKeyFeedback(null), 3500);
  };

  const handleDeleteProfile = (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    soundEngine.playAlertBeep();
    deleteUserProfile(profileId);
    setProfiles(getStoredProfiles());
    setActiveProfile(getActiveProfile());
  };

  const handleTestActiveKeyLive = async () => {
    const activeKey =
      activeProfile.apiKey ||
      getInjectedApiKey();

    if (!activeKey) {
      setApiKeyFeedback({
        message: "কোনো API Key ইনজেক্ট করা নেই। দয়া করে আগে কী ইনজেক্ট করুন।",
        isError: true,
      });
      return;
    }

    setIsTestingLiveKey(true);
    setLiveTestResult(null);
    soundEngine.playActionBeep();

    try {
      const targetProvider = activeProfile.provider || detectAiProvider(activeKey);
      const res = await validateAndTestKeyLive(activeKey, targetProvider);
      setIsTestingLiveKey(false);

      if (res.valid) {
        soundEngine.playNotificationChime();
        setLiveTestResult({
          message: "API Key ভেরিফাইড এবং লাইভ রেসপন্স সফল!",
          liveText: res.liveTestResponse || "AI Engine is live and responding.",
          isError: false,
        });
        setActiveProfile(getActiveProfile());
      } else {
        soundEngine.playAlertBeep();
        setLiveTestResult({
          message: res.error || "লাইভ টেস্ট ব্যর্থ হয়েছে। কী-টি সঠিক কিনা চেক করুন।",
          isError: true,
        });
      }
    } catch (err: any) {
      setIsTestingLiveKey(false);
      setLiveTestResult({
        message: err?.message || "নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।",
        isError: true,
      });
    }
  };

  const handleSaveInlineApiKey = async () => {
    const cleanKey = apiKeyInput
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/[\r\n\t]/g, "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim();

    if (!cleanKey) {
      clearInjectedApiKey();
      setActiveProfile(getActiveProfile());
      setProfiles(getStoredProfiles());
      setIsEditingApiKey(false);
      setLiveTestResult(null);
      setApiKeyFeedback({
        message: "API Key মুছে ফেলা হয়েছে (LocalStorage cleared)।",
        isError: false,
      });
      setTimeout(() => setApiKeyFeedback(null), 4000);
      return;
    }

    if (cleanKey.length < 10) {
      setApiKeyFeedback({
        message: "API Key খুব ছোট। দয়া করে সম্পূর্ণ কী পেস্ট করুন।",
        isError: true,
      });
      soundEngine.playAlertBeep();
      return;
    }

    const targetProvider = selectedProvider === "auto" ? detectAiProvider(cleanKey) : selectedProvider;

    setIsVerifyingApiKey(true);
    setApiKeyFeedback({
      message: `API Key যাচাই ও লাইভ টেস্ট করা হচ্ছে (${PROVIDERS[targetProvider]?.name || targetProvider})...`,
      isError: false,
    });
    soundEngine.playActionBeep();

    try {
      const res = await validateAndTestKeyLive(cleanKey, targetProvider);
      setIsVerifyingApiKey(false);

      if (res.valid) {
        setActiveProfile(getActiveProfile());
        setProfiles(getStoredProfiles());
        setIsEditingApiKey(false);
        soundEngine.playNotificationChime();
        setLiveTestResult({
          message: "API Key ইনজেক্ট ও LocalStorage-এ স্থায়ীভাবে সংরক্ষিত হয়েছে!",
          liveText: res.liveTestResponse || "API Key active and live.",
          isError: false,
        });
        setApiKeyFeedback({
          message: `${PROVIDERS[res.provider]?.badge || "AI"} Key ইনজেক্ট ও LocalStorage-এ সংরক্ষিত! Vercel বা লাইভ অ্যাপে পরবর্তীতে এই কী দিয়েই সমস্ত লাইভ রেসপন্স তৈরি হবে।`,
          isError: false,
        });
        setTimeout(() => setApiKeyFeedback(null), 6000);
      } else {
        soundEngine.playAlertBeep();
        setApiKeyFeedback({
          message: res.error || "ভুল API Key! দয়া করে সঠিক কী দিন।",
          isError: true,
        });
      }
    } catch (err: any) {
      setIsVerifyingApiKey(false);
      soundEngine.playAlertBeep();
      setApiKeyFeedback({
        message: err?.message || "Key যাচাই ব্যর্থ হয়েছে। দয়া করে ইন্টারনেট সংযোগ চেক করুন।",
        isError: true,
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* iOS Ultra-Thin Blur Backdrop */}
          <motion.div
            key="ios-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 cursor-pointer will-change-[opacity]"
          />

          {/* iOS / Duo Silky Smooth Folding Drawer with 3D Perspective & Left-Swipe Dismiss */}
          <div className="fixed inset-0 pointer-events-none z-50 [perspective:1400px]">
            <motion.aside
              key="ios-sidepanel"
              drag="x"
              dragConstraints={{ left: -340, right: 0 }}
              dragElastic={0.05}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60 || info.velocity.x < -250) {
                  soundEngine.playActionBeep();
                  onClose();
                }
              }}
              initial={{
                x: "-100%",
                rotateY: 28,
                opacity: 0.85,
                scale: 0.96,
                transformOrigin: "left center",
              }}
              animate={{
                x: 0,
                rotateY: 0,
                opacity: 1,
                scale: 1,
                transformOrigin: "left center",
              }}
              exit={{
                x: "-100%",
                rotateY: 24,
                opacity: 0,
                scale: 0.96,
                transformOrigin: "left center",
              }}
              transition={{
                duration: 0.32,
                ease: [0.16, 1, 0.3, 1], // Smooth Apple spring-damp curve
              }}
              style={{ willChange: "transform, opacity" }}
              className="pointer-events-auto fixed top-0 left-0 bottom-0 w-[310px] sm:w-[335px] bg-[#121214]/95 backdrop-blur-2xl border-r border-white/[0.12] rounded-r-[28px] flex flex-col shadow-[25px_0_60px_rgba(0,0,0,0.85)] select-none text-white overflow-hidden transform-gpu touch-pan-y"
            >
            {/* 1. iOS App Navigation Header */}
            <div className="pt-4 pb-3 px-5 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-[7px] bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center shadow-sm">
                  <Sliders className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold tracking-tight text-white leading-none">
                    Control Center
                  </h2>
                  <p className="text-[10px] text-white/40 tracking-tight mt-0.5">
                    টুলস ও সেটিংস হাব
                  </p>
                </div>
              </div>

              {/* iOS Style Round Close Button */}
              <button
                onClick={() => {
                  soundEngine.playActionBeep();
                  onClose();
                }}
                className="w-7 h-7 rounded-full bg-white/[0.1] hover:bg-white/[0.2] active:scale-90 transition-transform duration-100 flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
                title="Close (Esc)"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 2. Scrollable Body (iOS Grouped Layout) */}
            <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-4 no-scrollbar">

              {/* SECTION 0: USER PROFILE & GEMINI API KEY SLOT (Dedicated 3-Line Settings Group) */}
              <div className="rounded-[22px] bg-gradient-to-b from-white/[0.08] to-white/[0.03] border border-white/[0.12] p-3.5 space-y-3 shadow-lg">
                {/* 0.1 ACTIVE PROFILE ROW WITH SWITCHER */}
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${activeProfile.avatarColor || "from-cyan-500 to-blue-600"} flex items-center justify-center font-bold text-sm text-white shadow-md shrink-0 border border-white/20`}>
                      {activeProfile.name ? activeProfile.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-bold text-white truncate">{activeProfile.name}</span>
                        {activeProfile.isOwner && (
                          <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[8px] font-mono uppercase font-semibold">
                            Owner
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-white/45 truncate">
                        {activeProfile.role || "Profile"} • {activeProfile.apiKey ? "Personal Key Active" : "Default Mode"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {onOpenAccountModal && (
                      <button
                        onClick={() => {
                          soundEngine.playWaterDropSound();
                          onOpenAccountModal();
                        }}
                        className="px-2.5 py-1 rounded-full bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-300 text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                        title="Google Account & AI Personality Settings"
                      >
                        <User className="w-3 h-3" />
                        <span>Account</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        soundEngine.playActionBeep();
                        setShowProfileSwitcher(!showProfileSwitcher);
                      }}
                      className="px-2.5 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.1] text-white/80 hover:text-white text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer shrink-0"
                      title="Switch user profile or add new profile"
                    >
                      <Users className="w-3 h-3 text-cyan-400" />
                      <span>{showProfileSwitcher ? "Close" : "Profiles"}</span>
                    </button>
                  </div>
                </div>

                {/* PROFILE SWITCHER / MANAGER DROPDOWN */}
                <AnimatePresence>
                  {showProfileSwitcher && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden pt-1 border-t border-white/[0.06] space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-white/50 uppercase px-1">
                        <span>All Profiles ({profiles.length})</span>
                        <button
                          onClick={() => setShowCreateProfileForm(!showCreateProfileForm)}
                          className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>+ New Profile</span>
                        </button>
                      </div>

                      {/* CREATE NEW PROFILE INLINE FORM */}
                      {showCreateProfileForm && (
                        <form
                          onSubmit={handleCreateProfileSubmit}
                          className="p-2.5 rounded-xl bg-black/40 border border-cyan-500/30 space-y-2"
                        >
                          <div className="text-[11px] font-bold text-cyan-300 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                            <span>Add New User Profile</span>
                          </div>
                          <input
                            type="text"
                            placeholder="User Name (e.g. Rahat, Boss, Friend)"
                            value={newProfileName}
                            onChange={(e) => setNewProfileName(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/30 outline-none focus:border-cyan-500/50"
                            required
                          />
                          <div className="grid grid-cols-2 gap-1.5">
                            <input
                              type="text"
                              placeholder="Role (e.g. Developer, Guest)"
                              value={newProfileRole}
                              onChange={(e) => setNewProfileRole(e.target.value)}
                              className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white placeholder:text-white/30 outline-none"
                            />
                            <input
                              type="password"
                              placeholder="Gemini Key (Optional)"
                              value={newProfileApiKey}
                              onChange={(e) => setNewProfileApiKey(e.target.value)}
                              className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] text-cyan-300 font-mono placeholder:text-white/30 outline-none"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => setShowCreateProfileForm(false)}
                              className="px-2.5 py-1 text-[10px] text-white/50 hover:text-white cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-[10px] rounded-lg cursor-pointer"
                            >
                              Create & Switch
                            </button>
                          </div>
                        </form>
                      )}

                      {/* PROFILES LIST */}
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5 no-scrollbar">
                        {profiles.map((p) => {
                          const isCurrent = p.id === activeProfile.id;
                          return (
                            <div
                              key={p.id}
                              onClick={() => !isCurrent && handleSwitchToProfile(p.id)}
                              className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition cursor-pointer ${
                                isCurrent
                                  ? "bg-cyan-500/15 border-cyan-500/40 text-white"
                                  : "bg-white/[0.03] border-white/5 hover:bg-white/[0.07] text-white/70 hover:text-white"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${p.avatarColor || "from-cyan-500 to-blue-600"} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                                  {p.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold truncate flex items-center gap-1">
                                    <span>{p.name}</span>
                                    {isCurrent && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    )}
                                  </div>
                                  <div className="text-[9px] text-white/40 truncate">
                                    {p.apiKey ? "Personal Key Active" : "Default Key"}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {isCurrent ? (
                                  <span className="text-[9px] font-bold text-cyan-300 font-mono px-1.5 py-0.5 rounded bg-cyan-500/20">
                                    Active
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleSwitchToProfile(p.id)}
                                    className="px-2 py-0.5 text-[9px] rounded bg-white/10 hover:bg-white/20 text-white/80 font-medium"
                                  >
                                    Switch
                                  </button>
                                )}
                                {!p.isOwner && profiles.length > 1 && (
                                  <button
                                    onClick={(e) => handleDeleteProfile(e, p.id)}
                                    className="p-1 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded transition cursor-pointer"
                                    title="Delete Profile"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 0.2 USER API KEY INJECTOR & LOCAL STORAGE ENGINE */}
                <div className="pt-2.5 border-t border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center text-emerald-400 shrink-0">
                        <Key className="w-3 h-3" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold tracking-tight text-white block">
                          API Key Injector
                        </span>
                        <span className="text-[8.5px] text-white/45">Browser LocalStorage</span>
                      </div>
                    </div>

                    {activeProfile.apiKey ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[9px] font-mono font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9px] font-mono font-medium">
                        Default Key
                      </span>
                    )}
                  </div>

                  {/* Masked Key Display or Edit Slot */}
                  {!isEditingApiKey ? (
                    <div className="bg-black/40 border border-white/10 rounded-xl p-2.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[11px] font-mono text-emerald-300 font-semibold truncate flex items-center gap-1.5">
                            <span>
                              {activeProfile.apiKey
                                ? `${activeProfile.apiKey.slice(0, 8)}••••••••${activeProfile.apiKey.slice(-4)}`
                                : "No personal API key injected"}
                            </span>
                            {activeProfile.apiKey && (
                              <span className="px-1.5 py-0.2 rounded bg-white/10 text-[8px] font-mono text-white/70">
                                {PROVIDERS[activeProfile.provider || "gemini"]?.badge || "AI"}
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] text-white/40 mt-0.5">
                            {activeProfile.apiKey
                              ? "LocalStorage-এ সংরক্ষিত। পরবর্তীতে অ্যাপ এই কী দিয়ে লাইভ রেসপন্স জেনারেট করবে।"
                              : "নিজের Gemini বা AI API key ইনজেক্ট করতে নিচের বাটনে চাপুন।"}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons: Live Test, Change, Clear */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                        {activeProfile.apiKey && (
                          <button
                            onClick={handleTestActiveKeyLive}
                            disabled={isTestingLiveKey}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-95 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                            title="Test live response generation with this key"
                          >
                            {isTestingLiveKey ? (
                              <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                            ) : (
                              <Zap className="w-3 h-3 text-emerald-400" />
                            )}
                            <span>{isTestingLiveKey ? "Testing..." : "Live Test"}</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            soundEngine.playActionBeep();
                            setIsEditingApiKey(true);
                            setApiKeyInput(activeProfile.apiKey || "");
                            setSelectedProvider(activeProfile.provider || "auto");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 text-[10px] font-semibold transition cursor-pointer flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3 text-cyan-400" />
                          <span>{activeProfile.apiKey ? "Change" : "Inject Key"}</span>
                        </button>

                        {activeProfile.apiKey && (
                          <button
                            onClick={() => {
                              soundEngine.playAlertBeep();
                              setApiKeyInput("");
                              handleSaveInlineApiKey();
                            }}
                            className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 text-[10px] font-semibold transition cursor-pointer flex items-center gap-1"
                            title="Clear key from local storage"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                            <span>Clear</span>
                          </button>
                        )}

                        {onOpenApiKeySetup && (
                          <button
                            onClick={() => {
                              soundEngine.playActionBeep();
                              onOpenApiKeySetup();
                              onClose();
                            }}
                            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-white/75 hover:text-white text-[10px] font-medium transition cursor-pointer flex items-center gap-1 ml-auto"
                            title="সম্পূর্ণ সেটআপ মডাল ও গাইড ওপেন করুন"
                          >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>গাইড / মডাল</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Inline API Key Injector Editor */
                    <div className="bg-black/50 border border-emerald-500/40 rounded-xl p-2.5 space-y-2 shadow-lg">
                      {/* Provider Selector Pills */}
                      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                        {(["auto", "gemini", "openrouter", "openai"] as const).map((prov) => {
                          const isSelected = selectedProvider === prov;
                          return (
                            <button
                              key={prov}
                              type="button"
                              onClick={() => setSelectedProvider(prov)}
                              className={`px-2 py-0.5 rounded text-[9px] font-medium transition cursor-pointer whitespace-nowrap ${
                                isSelected
                                  ? "bg-emerald-500 text-zinc-950 font-bold"
                                  : "bg-white/5 hover:bg-white/10 text-white/60"
                              }`}
                            >
                              {prov === "auto" ? "Auto Detect" : prov.toUpperCase()}
                            </button>
                          );
                        })}
                      </div>

                      <div className="relative flex items-center">
                        <input
                          type={showApiKeyText ? "text" : "password"}
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          placeholder="Paste API Key (AIzaSy... / OpenRouter / etc.)"
                          autoComplete="off"
                          spellCheck="false"
                          disabled={isVerifyingApiKey}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 pr-8 text-xs text-emerald-300 font-mono placeholder:text-white/25 outline-none focus:border-emerald-500/60"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKeyText(!showApiKeyText)}
                          className="absolute right-2 text-white/40 hover:text-white"
                        >
                          {showApiKeyText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 pt-0.5">
                        <span className="text-[9.5px] text-white/40">
                          💾 Stored in Browser LocalStorage
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingApiKey(false);
                              setApiKeyFeedback(null);
                            }}
                            className="px-2 py-1 text-[10px] text-white/50 hover:text-white cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveInlineApiKey}
                            disabled={isVerifyingApiKey}
                            className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-[10px] rounded-lg transition cursor-pointer flex items-center gap-1 shadow-sm active:scale-95 disabled:opacity-50"
                          >
                            {isVerifyingApiKey ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Verifying...</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3 h-3" />
                                <span>Inject & Test Live</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Live Response Result Preview Box */}
                  {liveTestResult && (
                    <div className={`p-2 rounded-xl text-[10px] space-y-1 ${
                      liveTestResult.isError
                        ? "bg-red-500/15 border border-red-500/30 text-red-300"
                        : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-200"
                    }`}>
                      <div className="flex items-center gap-1.5 font-semibold">
                        {liveTestResult.isError ? <AlertCircle className="w-3 h-3 shrink-0" /> : <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-400" />}
                        <span>{liveTestResult.message}</span>
                      </div>
                      {liveTestResult.liveText && (
                        <div className="bg-black/40 rounded-lg p-1.5 text-[9px] font-mono text-white/90 border border-white/5">
                          <span className="text-emerald-400 font-bold block mb-0.5">Live Output:</span>
                          "{liveTestResult.liveText}"
                        </div>
                      )}
                    </div>
                  )}

                  {/* Feedback toast */}
                  {apiKeyFeedback && !liveTestResult && (
                    <div className={`px-2.5 py-1.5 rounded-lg text-[10px] flex items-center gap-1.5 ${
                      apiKeyFeedback.isError
                        ? "bg-red-500/15 border border-red-500/30 text-red-300"
                        : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                    }`}>
                      {apiKeyFeedback.isError ? <AlertCircle className="w-3 h-3 shrink-0" /> : <CheckCircle2 className="w-3 h-3 shrink-0" />}
                      <span className="leading-snug">{apiKeyFeedback.message}</span>
                    </div>
                  )}

                  {/* 0.25 FLOATING CHAT LINE TOGGLE (Requested by user) */}
                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-cyan-300">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-white">Floating Chat Line</div>
                        <div className="text-[9px] text-white/45">Draggable bar on screen to open chat</div>
                      </div>
                    </div>
                    <IOSSwitch
                      checked={showFloatingChatBar}
                      onChange={toggleFloatingChatBar || (() => {})}
                      activeColor="bg-cyan-500"
                    />
                  </div>

                  {/* Feedback toast */}
                  {apiKeyFeedback && (
                    <div className={`px-2.5 py-1.5 rounded-lg text-[10px] flex items-center gap-1.5 ${
                      apiKeyFeedback.isError
                        ? "bg-red-500/15 border border-red-500/30 text-red-300"
                        : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                    }`}>
                      {apiKeyFeedback.isError ? <AlertCircle className="w-3 h-3 shrink-0" /> : <CheckCircle2 className="w-3 h-3 shrink-0" />}
                      <span className="leading-snug">{apiKeyFeedback.message}</span>
                    </div>
                  )}
                </div>

                {/* 0.3 AI PERSONALITY & BEHAVIOR (USER CUSTOMIZABLE) */}
                <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                  <button
                    onClick={() => {
                      soundEngine.playActionBeep();
                      if (onOpenPersonalityModal) {
                        onOpenPersonalityModal();
                      } else if (onOpenAccountModal) {
                        onOpenAccountModal();
                      }
                      onClose();
                    }}
                    className="w-full py-1.5 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 active:scale-[0.98] border border-purple-500/25 flex items-center justify-between text-[11px] font-semibold text-purple-300 hover:text-purple-200 transition cursor-pointer"
                    title="Describe and customize AI personality & behavior"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>AI Personality (ব্যক্তিত্ব ও আচরণ)</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-purple-400/50" />
                  </button>

                  <button
                    onClick={() => {
                      soundEngine.playActionBeep();
                      if (onOpenControlPanel) onOpenControlPanel();
                      onClose();
                    }}
                    className="w-full py-1.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] border border-white/[0.06] flex items-center justify-between text-[11px] font-medium text-white/80 hover:text-white transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Settings className="w-3.5 h-3.5 text-white/60" />
                      <span>Advanced Settings & AI Config</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-white/30" />
                  </button>
                </div>
              </div>

              {/* SECTION A: iOS Control Center Quick Controls */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                    Quick Controls
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        connectionState === "connected" || connectionState === "speaking"
                          ? "bg-emerald-400 animate-pulse"
                          : "bg-white/20"
                      }`}
                    />
                    <span className="text-[10px] text-white/40 font-medium">
                      {connectionState === "connected" || connectionState === "speaking"
                        ? "Active"
                        : "Ready"}
                    </span>
                  </div>
                </div>

                {/* DEDICATED TEXT MODE TILE (USER REQUIREMENT: ONLY OPEN FROM SIDE PANEL) */}
                <div
                  onClick={() => {
                    soundEngine.playActionBeep();
                    if (onOpenTextMode) onOpenTextMode();
                    onClose();
                  }}
                  className="mb-2.5 p-3 rounded-[20px] border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-blue-950/25 to-zinc-900/40 hover:border-cyan-400/60 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-between shadow-[0_4px_16px_rgba(6,182,212,0.12)] group"
                  title="Open Text Mode (চ্যাট মোড)"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[12px] bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-white tracking-tight flex items-center gap-1.5">
                        <span>Text Mode</span>
                        <span className="text-[10px] text-cyan-300 font-normal">চ্যাট মোড</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[8px] font-semibold">Active AI</span>
                      </div>
                      <div className="text-[9px] text-white/50">ক্লিক করে চ্যাট বক্স ওপেন করুন</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-cyan-400/70 group-hover:translate-x-0.5 group-hover:text-cyan-300 transition-all" />
                </div>

                {/* DEDICATED CARD MODE TILE (USER REQUIREMENT: DIRECT DEDICATED BUTTON IN SIDE PANEL) */}
                <div
                  onClick={handleToggleCardMode}
                  className={`mb-2.5 p-3 rounded-[20px] border transition-all cursor-pointer flex items-center justify-between shadow-lg active:scale-[0.98] ${
                    isCardModeActive
                      ? "border-red-500/40 bg-gradient-to-r from-red-950/40 via-rose-950/30 to-zinc-900/60 shadow-[0_4px_20px_rgba(239,68,68,0.18)]"
                      : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                  }`}
                  title="Toggle Card Mode: গান ও সার্চ সরাসরি ফ্লোটিং কার্ডে দেখাবে"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-[12px] flex items-center justify-center shadow-md transition-transform ${
                        isCardModeActive
                          ? "bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 text-white"
                          : "bg-white/10 text-white/40"
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-white tracking-tight flex items-center gap-1.5">
                        <span>Card Mode</span>
                        <span className="text-[10px] text-red-300 font-normal">কার্ড ভিউ ও সার্চ</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[8px] font-semibold ${
                            isCardModeActive
                              ? "bg-red-500/20 text-red-300 border border-red-500/30"
                              : "bg-white/10 text-white/40"
                          }`}
                        >
                          {isCardModeActive ? "ACTIVE" : "OFF"}
                        </span>
                      </div>
                      <div className="text-[9px] text-white/50">
                        {isCardModeActive
                          ? "অন: গান ও সার্চ সরাসরি প্ল্যাটফর্মের ভেতরে কার্ডে খুলবে"
                          : "অফ: সাধারণ স্বাভাবিক নিয়মে চলবে"}
                      </div>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 relative ${
                      isCardModeActive ? "bg-red-600" : "bg-white/15"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        isCardModeActive ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Tile 1: Voice Output */}
                  <div
                    onClick={() => handleAction(toggleSpeakerMute)}
                    className={`p-3 rounded-[20px] border transition-all duration-150 active:scale-[0.96] cursor-pointer flex flex-col justify-between h-[86px] ${
                      !isSpeakerMuted
                        ? "bg-white/[0.12] border-emerald-500/30 shadow-[0_4px_16px_rgba(16,185,129,0.12)]"
                        : "bg-white/[0.05] border-white/[0.06] hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-8 h-8 rounded-[10px] flex items-center justify-center shadow-sm ${
                          !isSpeakerMuted
                            ? "bg-gradient-to-tr from-emerald-500 to-green-600 text-white"
                            : "bg-white/10 text-white/40"
                        }`}
                      >
                        {!isSpeakerMuted ? (
                          <Volume2 className="w-4 h-4" />
                        ) : (
                          <VolumeX className="w-4 h-4" />
                        )}
                      </div>
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                          !isSpeakerMuted
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-white/10 text-white/40"
                        }`}
                      >
                        {!isSpeakerMuted ? "ON" : "OFF"}
                      </span>
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-white tracking-tight leading-none">
                        Voice
                      </div>
                      <div className="text-[10px] text-white/40 mt-0.5">ভয়েস সাউন্ড</div>
                    </div>
                  </div>

                  {/* Tile 2: Asking Mode */}
                  <div
                    onClick={() => handleAction(toggleAskingMode)}
                    className={`p-3 rounded-[20px] border transition-all duration-150 active:scale-[0.96] cursor-pointer flex flex-col justify-between h-[86px] ${
                      isAskingMode
                        ? "bg-white/[0.12] border-purple-500/30 shadow-[0_4px_16px_rgba(168,85,247,0.12)]"
                        : "bg-white/[0.05] border-white/[0.06] hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-8 h-8 rounded-[10px] flex items-center justify-center shadow-sm ${
                          isAskingMode
                            ? "bg-gradient-to-tr from-purple-500 to-indigo-600 text-white"
                            : "bg-white/10 text-white/40"
                        }`}
                      >
                        <MessageSquareQuote className="w-4 h-4" />
                      </div>
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                          isAskingMode
                            ? "bg-purple-500/20 text-purple-300"
                            : "bg-white/10 text-white/40"
                        }`}
                      >
                        {isAskingMode ? "ON" : "OFF"}
                      </span>
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-white tracking-tight leading-none">
                        Asking Mode
                      </div>
                      <div className="text-[10px] text-white/40 mt-0.5">প্রশ্নোত্তর মোড</div>
                    </div>
                  </div>

                  {/* Tile 3: Screen Share */}
                  <div
                    onClick={() => handleAction(toggleScreenSharing)}
                    className={`p-3 rounded-[20px] border transition-all duration-150 active:scale-[0.96] cursor-pointer flex flex-col justify-between h-[86px] ${
                      isScreenSharing
                        ? "bg-white/[0.12] border-cyan-500/30 shadow-[0_4px_16px_rgba(6,182,212,0.12)]"
                        : "bg-white/[0.05] border-white/[0.06] hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-8 h-8 rounded-[10px] flex items-center justify-center shadow-sm ${
                          isScreenSharing
                            ? "bg-gradient-to-tr from-cyan-500 to-blue-600 text-white"
                            : "bg-white/10 text-white/40"
                        }`}
                      >
                        {isScreenSharing ? (
                          <ScreenShare className="w-4 h-4" />
                        ) : (
                          <ScreenShareOff className="w-4 h-4" />
                        )}
                      </div>
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                          isScreenSharing
                            ? "bg-cyan-500/20 text-cyan-300"
                            : "bg-white/10 text-white/40"
                        }`}
                      >
                        {isScreenSharing ? "LIVE" : "OFF"}
                      </span>
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-white tracking-tight leading-none">
                        Screen
                      </div>
                      <div className="text-[10px] text-white/40 mt-0.5">স্ক্রিন শেয়ার</div>
                    </div>
                  </div>

                  {/* Tile 4: Camera */}
                  <div
                    onClick={() => handleAction(toggleCameraSharing)}
                    className={`p-3 rounded-[20px] border transition-all duration-150 active:scale-[0.96] cursor-pointer flex flex-col justify-between h-[86px] ${
                      isCameraSharing
                        ? "bg-white/[0.12] border-amber-500/30 shadow-[0_4px_16px_rgba(245,158,11,0.12)]"
                        : "bg-white/[0.05] border-white/[0.06] hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-8 h-8 rounded-[10px] flex items-center justify-center shadow-sm ${
                          isCameraSharing
                            ? "bg-gradient-to-tr from-amber-500 to-orange-600 text-white"
                            : "bg-white/10 text-white/40"
                        }`}
                      >
                        {isCameraSharing ? (
                          <Camera className="w-4 h-4" />
                        ) : (
                          <CameraOff className="w-4 h-4" />
                        )}
                      </div>
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                          isCameraSharing
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-white/10 text-white/40"
                        }`}
                      >
                        {isCameraSharing ? "LIVE" : "OFF"}
                      </span>
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-white tracking-tight leading-none">
                        Camera
                      </div>
                      <div className="text-[10px] text-white/40 mt-0.5">ক্যামেরা ভিউ</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION B: iOS Grouped Inset Menu - Daily Tools */}
              <div>
                <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block mb-2 px-1">
                  Daily Workspace
                </span>

                <div className="rounded-[20px] bg-white/[0.05] border border-white/[0.08] overflow-hidden divide-y divide-white/[0.06]">
                  {/* PA Goal Planner */}
                  <div
                    onClick={() => {
                      handleAction(onOpenIntelligentPA);
                      onClose();
                    }}
                    className="p-3 flex items-center justify-between hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors duration-100 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-[9px] bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-white tracking-tight truncate">
                          PA Goal Planner
                        </div>
                        <div className="text-[10px] text-white/40">রুটিন ও স্টাডি গোল</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>

                  {/* Teacher Whiteboard */}
                  <div
                    onClick={() => {
                      handleAction(onOpenWhiteboard);
                      onClose();
                    }}
                    className="p-3 flex items-center justify-between hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors duration-100 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-[9px] bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shrink-0">
                        <PenTool className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-white tracking-tight truncate">
                          Whiteboard & Canvas
                        </div>
                        <div className="text-[10px] text-white/40">টিচার হোয়াইটবোর্ড</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>

                  {/* Chat History */}
                  <div
                    onClick={() => {
                      handleAction(onOpenChatHistory);
                      onClose();
                    }}
                    className="p-3 flex items-center justify-between hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors duration-100 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-[9px] bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-sm shrink-0">
                        <MessageSquare className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-white tracking-tight truncate">
                          Chat & Research
                        </div>
                        <div className="text-[10px] text-white/40">হিস্ট্রি ও নোটস</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>

                  {/* Real-time Calculator */}
                  <div
                    onClick={() => {
                      soundEngine.playWaterDropSound();
                      window.dispatchEvent(new CustomEvent("tune_calculator_updated", {
                        detail: { calculation: { expression: "0", result: "0", operationType: "init" } }
                      }));
                      onClose();
                    }}
                    className="p-3 flex items-center justify-between hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors duration-100 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-[9px] bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm shrink-0">
                        <Calculator className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-white tracking-tight truncate">
                          Calculator (ভয়েস ও টাইপ)
                        </div>
                        <div className="text-[10px] text-white/40">যোগ, বিয়োগ, গুণ ও ভাগ</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>

                  {/* Live Clock & Time */}
                  <div
                    onClick={() => {
                      soundEngine.playWaterDropSound();
                      window.dispatchEvent(new CustomEvent("tune_clock_popup", {
                        detail: { clock: { timestamp: Date.now() } }
                      }));
                      onClose();
                    }}
                    className="p-3 flex items-center justify-between hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors duration-100 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-[9px] bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm shrink-0">
                        <Clock className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-white tracking-tight truncate">
                          Live Clock & Timers
                        </div>
                        <div className="text-[10px] text-white/40">সময় ও ফ্লোটিং টাইমার</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>

                  {/* Install App on Android / Windows / Web */}
                  <div
                    onClick={() => {
                      soundEngine.playWaterDropSound();
                      if (onOpenInstallApp) {
                        onOpenInstallApp();
                      } else {
                        window.dispatchEvent(new CustomEvent("tune_open_install_modal"));
                      }
                      onClose();
                    }}
                    className="p-3 flex items-center justify-between hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors duration-100 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-[9px] bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shrink-0">
                        <Download className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-white tracking-tight truncate">
                          Install & Run App
                        </div>
                        <div className="text-[10px] text-emerald-400/90 font-medium">Android • Windows • Web</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </div>
              </div>

              {/* SECTION C: Collapsible "More Tools" (Hidden clean by default) */}
              <div>
                <button
                  onClick={() => setShowMoreTools(!showMoreTools)}
                  className="w-full py-2 px-3 rounded-[16px] bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] flex items-center justify-between text-[11px] font-medium text-white/70 hover:text-white transition duration-150 cursor-pointer active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>{showMoreTools ? "Less Options" : "More Tools & Settings"}</span>
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 ${
                      showMoreTools ? "rotate-180 text-white" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {showMoreTools && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden pt-2.5 space-y-2.5"
                    >
                      {/* Secondary Grouped Table */}
                      <div className="rounded-[20px] bg-white/[0.05] border border-white/[0.08] overflow-hidden divide-y divide-white/[0.06]">
                        {/* Face Mirroring Row with Real iOS Switch */}
                        <div className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-[9px] bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center shadow-sm">
                              <Smile className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="text-[13px] font-medium text-white">Face Mirror</div>
                              <div className="text-[10px] text-white/40">অভিব্যক্তি অনুকরণ</div>
                            </div>
                          </div>
                          <IOSSwitch
                            checked={isFaceMirroring}
                            onChange={() => handleAction(toggleFaceMirroring)}
                            activeColor="bg-pink-500"
                          />
                        </div>

                        {/* Mistake Board */}
                        <div
                          onClick={() => {
                            handleAction(onOpenMistakeFocusBoard);
                            onClose();
                          }}
                          className="p-3 flex items-center justify-between hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors duration-100 cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-[9px] bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center shadow-sm">
                              <Brain className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="text-[13px] font-medium text-white">
                                Mistake Focus Board
                              </div>
                              <div className="text-[10px] text-white/40">ভুল সংশোধন বোর্ড</div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                        </div>

                        {/* Interactive Draft */}
                        <div
                          onClick={() => {
                            handleAction(onOpenDraftModal);
                            onClose();
                          }}
                          className="p-3 flex items-center justify-between hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors duration-100 cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-[9px] bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                              <FileText className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="text-[13px] font-medium text-white">
                                Interactive Notes
                              </div>
                              <div className="text-[10px] text-white/40">ড্রাফট এডিটর</div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                        </div>

                        {/* File Manager */}
                        <div
                          onClick={() => {
                            handleAction(onOpenFileManager);
                            onClose();
                          }}
                          className="p-3 flex items-center justify-between hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors duration-100 cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-[9px] bg-gradient-to-tr from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
                              <FolderOpen className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="text-[13px] font-medium text-white">File Manager</div>
                              <div className="text-[10px] text-white/40">ফাইল ও প্রজেক্ট</div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                        </div>

                        {/* Autonomous Agentic Hub */}
                        <div
                          onClick={() => {
                            handleAction(onOpenAgenticHub);
                            onClose();
                          }}
                          className="p-3 flex items-center justify-between hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors duration-100 cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-[9px] bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm">
                              <Layers className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="text-[13px] font-medium text-white">Agentic Hub</div>
                              <div className="text-[10px] text-white/40">অটোনোমাস সাব-এজেন্ট</div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                        </div>

                        {/* Gemini API Key Configuration */}
                        <div
                          onClick={() => {
                            if (onOpenApiKeySetup) {
                              handleAction(onOpenApiKeySetup);
                            } else if (onOpenControlPanel) {
                              handleAction(onOpenControlPanel);
                            }
                            onClose();
                          }}
                          className="p-3 flex items-center justify-between hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors duration-100 cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-[9px] bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                              <Key className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="text-[13px] font-medium text-white flex items-center gap-1.5">
                                Gemini API Key
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono">Personal</span>
                              </div>
                              <div className="text-[10px] text-white/40">নিজের API কী দিয়ে আনলিমিটেড ব্যবহার</div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                        </div>

                        {/* Share & Mobile Access */}
                        <div
                          onClick={() => {
                            handleAction(onOpenShareModal);
                            onClose();
                          }}
                          className="p-3 flex items-center justify-between hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors duration-100 cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-[9px] bg-gradient-to-tr from-lime-500 to-green-600 flex items-center justify-center shadow-sm">
                              <Share2 className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="text-[13px] font-medium text-white">
                                Mobile Connect & QR
                              </div>
                              <div className="text-[10px] text-white/40">মোবাইল ইনস্টল ও শেয়ার</div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                        </div>
                      </div>

                      {/* iOS Control Center Slider - Voice Sensitivity */}
                      <div className="p-3 rounded-[20px] bg-white/[0.05] border border-white/[0.08]">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Mic className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[12px] font-medium text-white">
                              Mic Sensitivity
                            </span>
                          </div>
                          <span className="text-[11px] font-mono font-semibold text-amber-400">
                            {localSensitivity}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={localSensitivity}
                          onChange={(e) =>
                            handleSensitivitySlider(parseInt(e.target.value, 10))
                          }
                          className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-amber-400"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* 3. iOS Bottom Action Bar */}
            <div className="p-3.5 border-t border-white/[0.08] bg-white/[0.02] shrink-0 flex items-center justify-between">
              <button
                onClick={() => {
                  handleAction(onOpenControlPanel);
                  onClose();
                }}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] active:scale-95 text-white/80 hover:text-white transition duration-150 text-[12px] font-medium cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-white/60" />
                <span>All Settings</span>
              </button>

              <span className="text-[11px] text-white/30 font-medium">ESC to close</span>
            </div>
          </motion.aside>
        </div>
      </>
    )}
  </AnimatePresence>
  );
};

export default ToolsSidePanel;
