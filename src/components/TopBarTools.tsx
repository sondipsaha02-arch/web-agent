import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquareQuote,
  Bot,
  Smile,
  Share2,
  ScreenShare,
  Camera,
  Brain,
  FolderOpen,
  MessageSquare,
  Volume2,
  VolumeX,
  ArrowLeft,
  ArrowRight,
  PinOff,
  Settings,
  Plus,
  Move,
  Sliders,
  Mic
} from "lucide-react";
import { CompanionTool, ALL_COMPANION_TOOLS } from "../utils/toolsRegistry";
import { soundEngine } from "../utils/soundEngine";

interface TopBarToolsProps {
  pinnedToolIds: string[];
  onTogglePinTool: (toolId: string) => void;
  onMoveTool: (toolId: string, direction: "left" | "right") => void;
  onOpenSettingsToolsTab: () => void;

  // Tool states & actions
  isSpeakerMuted?: boolean;
  toggleSpeakerMute?: () => void;
  isAskingMode: boolean;
  toggleAskingMode: () => void;
  isFaceMirroring: boolean;
  toggleFaceMirroring: () => void;
  isScreenSharing: boolean;
  toggleScreenSharing: () => void;
  isCameraSharing: boolean;
  toggleCameraSharing: () => void;
  onOpenGoalPlanner: () => void;
  onOpenShareModal: () => void;
  onOpenChatHistory: () => void;
  onOpenMistakeBoard: () => void;
  onOpenFileManager: () => void;
}

export const TopBarTools: React.FC<TopBarToolsProps> = ({
  pinnedToolIds,
  onTogglePinTool,
  onMoveTool,
  onOpenSettingsToolsTab,
  isSpeakerMuted = false,
  toggleSpeakerMute = () => {},
  isAskingMode,
  toggleAskingMode,
  isFaceMirroring,
  toggleFaceMirroring,
  isScreenSharing,
  toggleScreenSharing,
  isCameraSharing,
  toggleCameraSharing,
  onOpenGoalPlanner,
  onOpenShareModal,
  onOpenChatHistory,
  onOpenMistakeBoard,
  onOpenFileManager,
}) => {
  const [activeMenuToolId, setActiveMenuToolId] = useState<string | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  // Close popup menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenuToolId(null);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const getToolAction = (id: string) => {
    switch (id) {
      case "speaker_mute":
        return toggleSpeakerMute;
      case "asking_mode":
        return toggleAskingMode;
      case "goal_planner":
        return onOpenGoalPlanner;
      case "face_mirror":
        return toggleFaceMirroring;
      case "share_phone":
        return onOpenShareModal;
      case "chat_history":
        return onOpenChatHistory;
      case "screen_share":
        return toggleScreenSharing;
      case "camera":
        return toggleCameraSharing;
      case "mistake_board":
        return onOpenMistakeBoard;
      case "file_manager":
        return onOpenFileManager;
      case "voice_sensitivity":
        return onOpenSettingsToolsTab;
      default:
        return () => {};
    }
  };

  const getToolIsActive = (id: string): boolean => {
    switch (id) {
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

  const renderIcon = (iconName: string, className: string, toolId?: string) => {
    if (toolId === "speaker_mute" || iconName === "Volume2" || iconName === "VolumeX") {
      return isSpeakerMuted ? (
        <VolumeX className={`${className} text-rose-400`} />
      ) : (
        <Volume2 className={`${className} text-emerald-400`} />
      );
    }

    switch (iconName) {
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
      case "Sliders":
        return <Sliders className={className} />;
      case "Mic":
        return <Mic className={className} />;
      default:
        return <Settings className={className} />;
    }
  };

  const handlePointerDown = (toolId: string, e: React.PointerEvent) => {
    isLongPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setActiveMenuToolId(toolId);
      soundEngine.playActionBeep();
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 450); // 450ms hold triggers Move / Reorder / Vault action
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleButtonClick = (toolId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLongPressTriggeredRef.current) {
      // Long press already triggered menu, prevent click action
      return;
    }
    const action = getToolAction(toolId);
    action();
  };

  const pinnedTools = pinnedToolIds
    .map((id) => ALL_COMPANION_TOOLS.find((t) => t.id === id))
    .filter((t): t is CompanionTool => Boolean(t));

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
      {pinnedTools.map((tool, index) => {
        const isActive = getToolIsActive(tool.id);
        const isMenuOpen = activeMenuToolId === tool.id;

        return (
          <div key={tool.id} className="relative">
            <button
              onPointerDown={(e) => handlePointerDown(tool.id, e)}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveMenuToolId(tool.id);
              }}
              onClick={(e) => handleButtonClick(tool.id, e)}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer select-none border relative group active:scale-95 ${
                isActive
                  ? tool.activeColor
                  : "bg-white/5 hover:bg-white/10 text-white/80 border-white/10"
              } ${isMenuOpen ? "ring-2 ring-cyan-400/80 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]" : ""}`}
              title={`${tool.name} (Press & hold to move or move to settings)`}
            >
              {renderIcon(
                tool.iconName,
                `w-3.5 h-3.5 shrink-0 ${isActive ? "" : tool.color}`,
                tool.id
              )}
              <span className="hidden sm:inline">
                {tool.id === "asking_mode"
                  ? isAskingMode
                    ? "Asking Mode (ON)"
                    : "Asking Mode"
                  : tool.id === "speaker_mute"
                  ? isSpeakerMuted
                    ? "Muted (Silent)"
                    : "Voice Sound (ON)"
                  : tool.shortName}
              </span>
              <span className="inline sm:hidden">
                {tool.id === "speaker_mute"
                  ? isSpeakerMuted
                    ? "Muted"
                    : "Voice"
                  : tool.shortName.length > 8
                  ? tool.shortName.slice(0, 7) + ".."
                  : tool.shortName}
              </span>

              {/* Hold Indicator dot */}
              <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-cyan-400 transition" />
            </button>

            {/* Quick Long-Press / Move Menu Popover */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-full left-0 mt-2 z-50 bg-zinc-950/95 border border-cyan-500/40 backdrop-blur-2xl rounded-2xl p-2 shadow-[0_10px_30px_rgba(0,0,0,0.8)] min-w-[200px] text-xs"
                >
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 text-[10px] text-white/50 font-mono">
                    <span className="font-bold text-cyan-300 uppercase tracking-wider">
                      {tool.shortName}
                    </span>
                    <span className="flex items-center gap-1 text-white/40">
                      <Move className="w-3 h-3" /> Position
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 mb-1.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => {
                        onMoveTool(tool.id, "left");
                        soundEngine.playActionBeep();
                      }}
                      className={`p-1.5 rounded-xl border flex items-center justify-center gap-1 text-[11px] font-medium transition ${
                        index === 0
                          ? "opacity-30 border-white/5 bg-transparent cursor-not-allowed text-white/30"
                          : "border-white/10 bg-white/5 hover:bg-white/10 text-white cursor-pointer"
                      }`}
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Move Left</span>
                    </button>

                    <button
                      type="button"
                      disabled={index === pinnedTools.length - 1}
                      onClick={() => {
                        onMoveTool(tool.id, "right");
                        soundEngine.playActionBeep();
                      }}
                      className={`p-1.5 rounded-xl border flex items-center justify-center gap-1 text-[11px] font-medium transition ${
                        index === pinnedTools.length - 1
                          ? "opacity-30 border-white/5 bg-transparent cursor-not-allowed text-white/30"
                          : "border-white/10 bg-white/5 hover:bg-white/10 text-white cursor-pointer"
                      }`}
                    >
                      <span>Move Right</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onTogglePinTool(tool.id);
                      setActiveMenuToolId(null);
                      soundEngine.playNotificationChime();
                    }}
                    className="w-full p-1.5 mb-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 flex items-center justify-center gap-1.5 text-[11px] font-medium transition cursor-pointer"
                  >
                    <PinOff className="w-3 h-3 text-rose-400" />
                    <span>Keep in Settings Vault</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuToolId(null);
                      onOpenSettingsToolsTab();
                    }}
                    className="w-full p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white flex items-center justify-center gap-1.5 text-[10px] font-mono transition cursor-pointer"
                  >
                    <Settings className="w-3 h-3 text-cyan-400" />
                    <span>Customize All Tools in Settings</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Add / Manage Tools from Settings button */}
      <button
        type="button"
        onClick={onOpenSettingsToolsTab}
        className="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 rounded-xl transition cursor-pointer flex items-center justify-center active:scale-95"
        title="Open Tools & Settings Customizer"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
