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
  Download
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
  STORAGE_API_KEY_CONFIGURED
} from "../utils/userProfiles";

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
  onOpenInstallApp?: () => void;

  // Voice sensitivity
  voiceSensitivity?: number;
  onVoiceSensitivityChange?: (val: number) => void;

  connectionState?: ConnectionState;
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
  onOpenInstallApp,
  voiceSensitivity = 65,
  onVoiceSensitivityChange,
  connectionState = "disconnected",
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
  const [showApiKeyText, setShowApiKeyText] = useState(false);
  const [isVerifyingApiKey, setIsVerifyingApiKey] = useState(false);
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
    };
    const handleKeyUpdated = (e: any) => {
      const updatedActive = getActiveProfile();
      setActiveProfile(updatedActive);
      setProfiles(getStoredProfiles());
      setApiKeyInput(updatedActive.apiKey || "");
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

  const handleSaveInlineApiKey = async () => {
    const cleanKey = apiKeyInput
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/[\r\n\t]/g, "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim();

    if (!cleanKey) {
      updateActiveProfileApiKey("");
      setActiveProfile(getActiveProfile());
      setProfiles(getStoredProfiles());
      setIsEditingApiKey(false);
      setApiKeyFeedback({
        message: "API Key cleared. Using free default.",
        isError: false,
      });
      setTimeout(() => setApiKeyFeedback(null), 4000);
      return;
    }

    if (cleanKey.length < 15) {
      setApiKeyFeedback({
        message: "API Key-টি অসম্পূর্ণ বা ভুল ফরম্যাট। Gemini Key সাধারণত 'AIzaSy' দিয়ে শুরু হয়।",
        isError: true,
      });
      soundEngine.playAlertBeep();
      return;
    }

    setIsVerifyingApiKey(true);
    setApiKeyFeedback({ message: "Verifying API Key with Gemini...", isError: false });
    soundEngine.playActionBeep();

    try {
      const res = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: cleanKey }),
      });
      const data = await res.json();
      setIsVerifyingApiKey(false);

      if (res.ok && data.valid) {
        updateActiveProfileApiKey(cleanKey);
        setActiveProfile(getActiveProfile());
        setProfiles(getStoredProfiles());
        setIsEditingApiKey(false);
        soundEngine.playNotificationChime();
        setApiKeyFeedback({
          message: "API Key saved! Tune will never ask again.",
          isError: false,
        });
        setTimeout(() => setApiKeyFeedback(null), 5000);
      } else {
        let errorMsg = data.error || "ভুল API Key! দয়া করে সঠিক কী দিন।";
        try {
          const parsed = typeof errorMsg === "string" ? JSON.parse(errorMsg) : errorMsg;
          if (parsed?.error?.message) errorMsg = parsed.error.message;
        } catch {}
        setApiKeyFeedback({
          message: errorMsg,
          isError: true,
        });
        soundEngine.playAlertBeep();
      }
    } catch (err: any) {
      setIsVerifyingApiKey(false);
      if (cleanKey.length >= 20) {
        updateActiveProfileApiKey(cleanKey);
        setActiveProfile(getActiveProfile());
        setProfiles(getStoredProfiles());
        setIsEditingApiKey(false);
        soundEngine.playNotificationChime();
        setApiKeyFeedback({
          message: "API Key saved locally for this profile! Won't ask again.",
          isError: false,
        });
        setTimeout(() => setApiKeyFeedback(null), 5000);
      } else {
        setApiKeyFeedback({
          message: "Key verification failed. Check internet or key length.",
          isError: true,
        });
        soundEngine.playAlertBeep();
      }
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

                {/* 0.2 GEMINI API KEY DEDICATED SLOT */}
                <div className="pt-2.5 border-t border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[11px] font-bold tracking-tight text-white">Gemini API Key</span>
                    </div>

                    {activeProfile.apiKey ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[9px] font-mono font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                        Configured
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[9px] font-mono font-semibold">
                        Free / Default
                      </span>
                    )}
                  </div>

                  {/* Masked Key Display or Edit Slot */}
                  {!isEditingApiKey ? (
                    <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] font-mono text-white/80 truncate">
                          {activeProfile.apiKey
                            ? `${activeProfile.apiKey.slice(0, 8)}••••••••${activeProfile.apiKey.slice(-4)}`
                            : "No personal API key set"}
                        </div>
                        <div className="text-[9px] text-white/40 mt-0.5">
                          {activeProfile.apiKey
                            ? "Save permanent: Tune will never prompt again."
                            : "Set your free key for unlimited continuous sessions."}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            soundEngine.playActionBeep();
                            setIsEditingApiKey(true);
                            setApiKeyInput(activeProfile.apiKey || "");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 text-[10px] font-semibold transition cursor-pointer flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3 text-cyan-400" />
                          <span>{activeProfile.apiKey ? "Change" : "Set Key"}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Inline Key Editor */
                    <div className="bg-black/50 border border-emerald-500/30 rounded-xl p-2.5 space-y-2">
                      <div className="relative flex items-center">
                        <input
                          type={showApiKeyText ? "text" : "password"}
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          placeholder="Paste Gemini API Key (AIzaSy...)"
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
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5"
                        >
                          Free Key নিন
                        </a>

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
                                <span>Checking...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Save & Lock</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

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

                {/* 0.3 QUICK SETTINGS & CONTROL SHORTCUT */}
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
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

              {/* SECTION A: iOS Control Center 2x2 Quick Tiles */}
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
