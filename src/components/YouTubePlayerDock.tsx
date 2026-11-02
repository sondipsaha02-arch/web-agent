import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "motion/react";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  ChevronDown,
  GripHorizontal,
  Music
} from "lucide-react";
import { soundEngine } from "../utils/soundEngine";

export interface YouTubePlaybackData {
  videoId: string;
  title: string;
  watchUrl: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  durationSec?: number;
  durationText?: string;
  isPlaying?: boolean;
}

interface YouTubePlayerDockProps {
  initialPlayback?: YouTubePlaybackData | null;
  onClose?: () => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export const YouTubePlayerDock: React.FC<YouTubePlayerDockProps> = ({
  initialPlayback,
  onClose
}) => {
  const [playback, setPlayback] = useState<YouTubePlaybackData | null>(initialPlayback || null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(100);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [ballPosition, setBallPosition] = useState<"top-left" | "bottom-left">("top-left");

  // Draggable card ref & motion values for unrestricted movement and boundary minimization
  const cardRef = useRef<HTMLDivElement>(null);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  
  // Controls overlay state
  const [showControls, setShowControls] = useState<boolean>(false);

  // Live video time & duration state
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(210);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);

  // Double-tap / double-click skip feedback animations
  const [skipFeedback, setSkipFeedback] = useState<{ side: "left" | "right"; text: string } | null>(null);
  const lastTapRef = useRef<{ time: number; side: "left" | "right" }>({ time: 0, side: "left" });
  const singleTapTimerRef = useRef<any>(null);

  const [history, setHistory] = useState<YouTubePlaybackData[]>([]);
  const [queue, setQueue] = useState<YouTubePlaybackData[]>([]);

  const hideTimerRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const ytPlayerRef = useRef<any>(null);

  // Auto-hide controls after 3 seconds of inactivity
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  // PostMessage fallback command sender
  const sendIframeCommand = useCallback((command: string, args: any[] = []) => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: "command",
            func: command,
            args: args
          }),
          "*"
        );
      }
    } catch (err) {
      console.warn("YouTube postMessage error:", err);
    }
  }, []);

  // Initialize official YouTube Iframe Player API
  useEffect(() => {
    if (!playback?.videoId || !iframeRef.current) return;

    let checkInterval: any = null;

    const initYTPlayer = () => {
      const YT = (window as any).YT;
      if (YT && YT.Player && iframeRef.current) {
        try {
          ytPlayerRef.current = new YT.Player(iframeRef.current, {
            events: {
              onReady: (event: any) => {
                event.target.unMute();
                event.target.setVolume(volume);
                event.target.playVideo();
                const d = event.target.getDuration();
                if (typeof d === "number" && d > 0) {
                  setDuration(d);
                }
              },
              onStateChange: (event: any) => {
                if (event.data === 1) setIsPlaying(true);
                else if (event.data === 2) setIsPlaying(false);
                else if (event.data === 0) handlePlayNext();
              }
            }
          });
        } catch (e) {
          console.warn("YT.Player binding error:", e);
        }
      }
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initYTPlayer();
    } else {
      checkInterval = setInterval(() => {
        if ((window as any).YT && (window as any).YT.Player) {
          clearInterval(checkInterval);
          initYTPlayer();
        }
      }, 300);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [playback?.videoId]);

  // Live timer ticker: updates currentTime and duration with sub-second precision
  useEffect(() => {
    if (!isPlaying) return;

    const ticker = setInterval(() => {
      if (isScrubbing) return;

      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === "function") {
        try {
          const t = ytPlayerRef.current.getCurrentTime();
          const d = ytPlayerRef.current.getDuration();
          if (typeof t === "number" && t >= 0) {
            setCurrentTime(t);
          }
          if (typeof d === "number" && d > 0) {
            setDuration(d);
          }
          return;
        } catch {}
      }

      setCurrentTime(prev => {
        if (duration > 0 && prev < duration) {
          return prev + 0.5;
        }
        return prev;
      });
    }, 500);

    return () => clearInterval(ticker);
  }, [duration, isPlaying, isScrubbing]);

  // Listen to postMessages from YouTube iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.event === "infoDelivery" && data.info) {
          if (typeof data.info.currentTime === "number" && !isScrubbing) {
            setCurrentTime(data.info.currentTime);
          }
          if (typeof data.info.duration === "number" && data.info.duration > 0) {
            setDuration(data.info.duration);
          }
          if (typeof data.info.playerState === "number") {
            if (data.info.playerState === 1) setIsPlaying(true);
            else if (data.info.playerState === 2) setIsPlaying(false);
          }
        }
      } catch {}
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isScrubbing]);

  // Fetch related queue songs
  const fetchRelatedQueue = useCallback(async (title: string, currentVideoId: string) => {
    try {
      const res = await fetch(`/api/youtube/related?q=${encodeURIComponent(title)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.songs && Array.isArray(data.songs)) {
          const filtered = data.songs
            .filter((s: any) => s.videoId !== currentVideoId)
            .map((s: any) => ({
              videoId: s.videoId,
              title: s.title,
              watchUrl: s.watchUrl,
              thumbnailUrl: s.thumbnailUrl,
              embedUrl: `https://www.youtube.com/embed/${s.videoId}?autoplay=1&mute=0&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&playsinline=1&enablejsapi=1`,
              isPlaying: true
            }));
          setQueue(filtered);
        }
      }
    } catch (err) {
      console.warn("Could not fetch related tracks:", err);
    }
  }, []);

  // Listen for tune_youtube_playback event
  useEffect(() => {
    const handlePlaybackEvent = (e: any) => {
      const isCardViewEnabled =
        typeof localStorage !== "undefined"
          ? localStorage.getItem("tune_card_view") !== "false"
          : true;

      if (!isCardViewEnabled) {
        if (e.detail?.watchUrl) {
          window.open(e.detail.watchUrl, "_blank");
        }
        return;
      }

      if (e.detail?.videoId) {
        const dur = typeof e.detail.durationSec === "number" && e.detail.durationSec > 0 ? e.detail.durationSec : 210;
        const data: YouTubePlaybackData = {
          videoId: e.detail.videoId,
          title: e.detail.title || "YouTube Video",
          watchUrl: e.detail.watchUrl || `https://www.youtube.com/watch?v=${e.detail.videoId}&autoplay=1`,
          embedUrl:
            e.detail.embedUrl ||
            `https://www.youtube.com/embed/${e.detail.videoId}?autoplay=1&mute=0&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&playsinline=1&enablejsapi=1`,
          thumbnailUrl:
            e.detail.thumbnailUrl ||
            `https://i.ytimg.com/vi/${e.detail.videoId}/hqdefault.jpg`,
          durationSec: dur,
          durationText: e.detail.durationText,
          isPlaying: true
        };

        setPlayback(prev => {
          if (prev && prev.videoId !== data.videoId) {
            setHistory(h => [...h, prev]);
          }
          return data;
        });

        setCurrentTime(0);
        setDuration(dur);
        setIsPlaying(true);
        setIsMuted(false);
        setIsMinimized(false);
        setShowControls(false);
        soundEngine.playWaterDropSound();

        fetchRelatedQueue(data.title, data.videoId);
      }
    };

    const handleCardModeEvent = (e: any) => {
      const isEnabled = e.detail?.cardMode;
      if (isEnabled === false) {
        if (ytPlayerRef.current?.stopVideo) ytPlayerRef.current.stopVideo();
        sendIframeCommand("stopVideo");
        setPlayback(null);
        if (onClose) onClose();
      }
    };

    window.addEventListener("tune_youtube_playback", handlePlaybackEvent);
    window.addEventListener("tune_card_mode_changed", handleCardModeEvent);
    return () => {
      window.removeEventListener("tune_youtube_playback", handlePlaybackEvent);
      window.removeEventListener("tune_card_mode_changed", handleCardModeEvent);
    };
  }, [fetchRelatedQueue, onClose, sendIframeCommand]);

  // Force unmute & auto play
  useEffect(() => {
    if (!playback?.videoId) return;

    const timers = [
      setTimeout(() => {
        sendIframeCommand("unMute");
        sendIframeCommand("setVolume", [volume]);
        sendIframeCommand("playVideo");
      }, 300),
      setTimeout(() => {
        sendIframeCommand("unMute");
        sendIframeCommand("setVolume", [volume]);
        sendIframeCommand("playVideo");
      }, 900),
      setTimeout(() => {
        sendIframeCommand("unMute");
        sendIframeCommand("setVolume", [volume]);
        sendIframeCommand("playVideo");
      }, 1800)
    ];

    return () => {
      timers.forEach(t => clearTimeout(t));
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [playback?.videoId, sendIframeCommand, volume]);

  if (!playback) return null;

  const handleTogglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    resetHideTimer();
    if (isPlaying) {
      if (ytPlayerRef.current?.pauseVideo) ytPlayerRef.current.pauseVideo();
      else sendIframeCommand("pauseVideo");
      setIsPlaying(false);
    } else {
      if (ytPlayerRef.current?.playVideo) {
        ytPlayerRef.current.unMute();
        ytPlayerRef.current.playVideo();
      } else {
        sendIframeCommand("unMute");
        sendIframeCommand("playVideo");
      }
      setIsPlaying(true);
    }
  };

  const handleToggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    resetHideTimer();
    if (isMuted) {
      if (ytPlayerRef.current?.unMute) {
        ytPlayerRef.current.unMute();
        ytPlayerRef.current.setVolume(volume > 0 ? volume : 100);
      }
      sendIframeCommand("unMute");
      sendIframeCommand("setVolume", [volume > 0 ? volume : 100]);
      setIsMuted(false);
      if (volume === 0) setVolume(100);
    } else {
      if (ytPlayerRef.current?.mute) ytPlayerRef.current.mute();
      sendIframeCommand("mute");
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (newVal: number) => {
    resetHideTimer();
    setVolume(newVal);
    if (newVal === 0) {
      setIsMuted(true);
      if (ytPlayerRef.current?.mute) ytPlayerRef.current.mute();
      sendIframeCommand("mute");
    } else {
      if (isMuted) setIsMuted(false);
      if (ytPlayerRef.current?.unMute) {
        ytPlayerRef.current.unMute();
        ytPlayerRef.current.setVolume(newVal);
      }
      sendIframeCommand("unMute");
      sendIframeCommand("setVolume", [newVal]);
    }
  };

  // Skip 10s Forward (Right Zone)
  const handleSkipForward10 = () => {
    const newT = duration > 0 ? Math.min(duration, currentTime + 10) : currentTime + 10;
    setCurrentTime(newT);
    if (ytPlayerRef.current?.seekTo) ytPlayerRef.current.seekTo(newT, true);
    sendIframeCommand("seekTo", [newT, true]);
    setSkipFeedback({ side: "right", text: "10 seconds" });
    soundEngine.playActionBeep();
    setTimeout(() => setSkipFeedback(null), 650);
  };

  // Rewind 10s Backward (Left Zone)
  const handleRewind10 = () => {
    const newT = Math.max(0, currentTime - 10);
    setCurrentTime(newT);
    if (ytPlayerRef.current?.seekTo) ytPlayerRef.current.seekTo(newT, true);
    sendIframeCommand("seekTo", [newT, true]);
    setSkipFeedback({ side: "left", text: "10 seconds" });
    soundEngine.playActionBeep();
    setTimeout(() => setSkipFeedback(null), 650);
  };

  // Universal Zone Click & Double-Click Handler
  // Works both when controls are visible ("oi obosthay thaka obosthay") AND when controls are hidden!
  const handleZoneClick = (side: "left" | "right", e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const prev = lastTapRef.current;

    // Check for double click / double tap within 340ms window
    if (now - prev.time < 340 && prev.side === side) {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      lastTapRef.current = { time: 0, side };

      if (side === "right") {
        handleSkipForward10();
      } else {
        handleRewind10();
      }
    } else {
      // First click: wait to confirm if single click or double click
      lastTapRef.current = { time: now, side };
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = setTimeout(() => {
        // Confirmed Single Click / Tap: toggle controls overlay
        setShowControls(prevVisible => {
          if (prevVisible) {
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
            return false;
          } else {
            resetHideTimer();
            return true;
          }
        });
      }, 300);
    }
  };

  const handlePlayNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    resetHideTimer();
    soundEngine.playActionBeep();

    if (queue.length > 0) {
      const nextSong = queue[0];
      const remainingQueue = queue.slice(1);
      setHistory(h => [...h, playback]);
      setPlayback(nextSong);
      setQueue(remainingQueue);
      setCurrentTime(0);
      setIsPlaying(true);
      setIsMuted(false);
      fetchRelatedQueue(nextSong.title, nextSong.videoId);
    } else {
      fetchRelatedQueue(playback.title, playback.videoId).then(() => {
        if (queue.length > 0) {
          const nextSong = queue[0];
          setHistory(h => [...h, playback]);
          setPlayback(nextSong);
          setQueue(queue.slice(1));
          setCurrentTime(0);
        }
      });
    }
  };

  const handlePlayPrevious = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    resetHideTimer();
    soundEngine.playActionBeep();

    if (history.length > 0) {
      const prevSong = history[history.length - 1];
      const remainingHistory = history.slice(0, -1);
      setQueue(q => [playback, ...q]);
      setHistory(remainingHistory);
      setPlayback(prevSong);
      setCurrentTime(0);
      setIsPlaying(true);
      setIsMuted(false);
    } else {
      if (ytPlayerRef.current?.seekTo) ytPlayerRef.current.seekTo(0, true);
      sendIframeCommand("seekTo", [0, true]);
      sendIframeCommand("playVideo");
      setCurrentTime(0);
      setIsPlaying(true);
    }
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (ytPlayerRef.current?.stopVideo) ytPlayerRef.current.stopVideo();
    sendIframeCommand("stopVideo");
    setPlayback(null);
    if (onClose) onClose();
  };

  const handleOpenExternal = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (playback?.watchUrl) {
      window.open(playback.watchUrl, "_blank");
    }
  };

  const embedSrc = `https://www.youtube.com/embed/${playback.videoId}?autoplay=1&mute=0&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(
    typeof window !== "undefined" ? window.location.origin : ""
  )}`;

  return (
    <>
      {/* 1. MINIMIZED ROUND FLOATING AUDIO BALL (বলের মতো শর্টকাট beside Top-Left ☰ Menu or Bottom-Left corner, Draggable anywhere) */}
      <AnimatePresence>
        {isMinimized && (
          <motion.div
            drag
            dragMomentum={false}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className={`${
              ballPosition === "bottom-left"
                ? "fixed bottom-6 left-5 z-50"
                : "fixed top-3 left-15 sm:left-16 z-50"
            } select-none touch-none group/ball cursor-grab active:cursor-grabbing flex items-center gap-1.5`}
            style={{ touchAction: "none" }}
          >
            {/* Pulsing, Rotating Glowing Audio Ball */}
            <div
              onClick={() => {
                setIsMinimized(false);
                resetHideTimer();
                soundEngine.playWaterDropSound();
                animate(dragX, 0, { duration: 0.25 });
                animate(dragY, 0, { duration: 0.25 });
              }}
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full p-0.5 bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 shadow-[0_0_25px_rgba(239,68,68,0.75)] cursor-pointer flex items-center justify-center ring-2 ring-red-400/50"
              title={`${playback.title} (ট্যাপ করে ভিডিও বড় করুন)`}
            >
              {/* Spinning Vinyl Album Art */}
              <div className="w-full h-full rounded-full overflow-hidden relative bg-black flex items-center justify-center">
                {playback.thumbnailUrl ? (
                  <img
                    src={playback.thumbnailUrl}
                    alt={playback.title}
                    className={`w-full h-full object-cover rounded-full ${isPlaying ? "animate-[spin_7s_linear_infinite]" : ""}`}
                  />
                ) : (
                  <Music className="w-4 h-4 text-red-400" />
                )}
                {/* Center Record Core */}
                <div className="absolute w-2 h-2 rounded-full bg-red-600 border border-white shadow-inner" />
              </div>

              {/* Status Badge */}
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-black/90 border border-red-500 flex items-center justify-center shadow-md">
                {isPlaying ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                ) : (
                  <Play className="w-2 h-2 text-white fill-current ml-0.5" />
                )}
              </div>
            </div>

            {/* Quick Play/Pause and Close on hover */}
            <div className="flex items-center gap-1 opacity-0 group-hover/ball:opacity-100 transition-opacity bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-white/10 shadow-lg">
              <button
                onClick={handleTogglePlay}
                className="p-1 text-zinc-300 hover:text-white transition cursor-pointer"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
              </button>
              <button
                onClick={handleClose}
                className="p-1 text-zinc-400 hover:text-red-400 transition cursor-pointer"
                title="Close"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. FULL FLOATING VIDEO CARD (Draggable anywhere across the screen, minimize to ball on drag off-screen) */}
      <AnimatePresence>
        <motion.div
          ref={cardRef}
          drag={!isMinimized}
          dragMomentum={false}
          dragElastic={0.08}
          style={{ x: dragX, y: dragY, touchAction: "none" }}
          onDragEnd={(_e, info) => {
            if (!cardRef.current) return;
            const rect = cardRef.current.getBoundingClientRect();
            const screenW = window.innerWidth;
            const screenH = window.innerHeight;

            // If dragged outside screen edges or pushed toward viewport boundaries:
            const isPushedOffScreen =
              rect.right < 90 ||
              rect.left > screenW - 90 ||
              rect.bottom < 80 ||
              rect.top > screenH - 80 ||
              info.point.x < 25 ||
              info.point.x > screenW - 25 ||
              info.point.y < 25 ||
              info.point.y > screenH - 25;

            if (isPushedOffScreen) {
              // Decide ball docking: bottom-left if thrown low, top-left if thrown high/beside menu
              if (info.point.y > screenH / 2 || rect.bottom > screenH - 120) {
                setBallPosition("bottom-left");
              } else {
                setBallPosition("top-left");
              }
              setIsMinimized(true);
              soundEngine.playWaterDropSound();
              animate(dragX, 0, { duration: 0.3 });
              animate(dragY, 0, { duration: 0.3 });
            } else {
              // Within screen: keep card safely inside screen margins so it never gets lost
              const margin = 12;
              let shiftX = 0;
              let shiftY = 0;

              if (rect.left < margin) {
                shiftX = margin - rect.left;
              } else if (rect.right > screenW - margin) {
                shiftX = (screenW - margin) - rect.right;
              }

              if (rect.top < margin) {
                shiftY = margin - rect.top;
              } else if (rect.bottom > screenH - margin) {
                shiftY = (screenH - margin) - rect.bottom;
              }

              if (shiftX !== 0 || shiftY !== 0) {
                animate(dragX, dragX.get() + shiftX, { type: "spring", stiffness: 450, damping: 32 });
                animate(dragY, dragY.get() + shiftY, { type: "spring", stiffness: 450, damping: 32 });
              }
            }
          }}
          initial={{ opacity: 0, scale: 0.88, y: 30 }}
          animate={{
            opacity: isMinimized ? 0 : 1,
            scale: isMinimized ? 0.35 : 1,
            pointerEvents: isMinimized ? "none" : "auto"
          }}
          exit={{ opacity: 0, scale: 0.85, y: 30 }}
          transition={{ type: "spring", damping: 28, stiffness: 380 }}
          className={`fixed bottom-24 right-4 sm:right-6 z-50 select-none touch-none ${isMinimized ? "pointer-events-none opacity-0" : ""}`}
        >
          {/* Glowing Red Ambient Shadow Container */}
          <div className="relative rounded-3xl p-1 bg-gradient-to-b from-red-500/25 via-red-950/20 to-black/90 shadow-[0_10px_45px_rgba(239,68,68,0.38)] border border-red-500/40 transition-all duration-300">
            
            {/* Main Video View Container */}
            <div className="relative w-[85vw] max-w-[340px] sm:max-w-[380px] aspect-video rounded-2xl overflow-hidden bg-black shadow-inner cursor-pointer group">
              {/* Embedded YouTube Iframe (kept in DOM so playback is uninterrupted) */}
              <iframe
                id="youtube-player-iframe"
                ref={iframeRef}
                src={embedSrc}
                title={playback.title}
                className="w-full h-full border-0 pointer-events-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />

              {/* Animated Double-Tap Skip Feedback Ripple Overlays */}
              <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-between px-6">
                <AnimatePresence>
                  {skipFeedback?.side === "left" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.18 }}
                      className="flex flex-col items-center justify-center gap-0.5 bg-black/85 text-white px-3.5 py-2.5 rounded-full border border-white/20 shadow-2xl"
                    >
                      <div className="flex items-center text-red-500">
                        <ChevronLeft className="w-5 h-5 -mr-2 animate-pulse" />
                        <ChevronLeft className="w-5 h-5 -mr-2 animate-pulse" />
                        <ChevronLeft className="w-5 h-5 animate-pulse" />
                      </div>
                      <span className="text-[10px] font-bold font-mono tracking-wider">{skipFeedback.text}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex-1" />

                <AnimatePresence>
                  {skipFeedback?.side === "right" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.18 }}
                      className="flex flex-col items-center justify-center gap-0.5 bg-black/85 text-white px-3.5 py-2.5 rounded-full border border-white/20 shadow-2xl"
                    >
                      <div className="flex items-center text-red-500">
                        <ChevronRight className="w-5 h-5 animate-pulse" />
                        <ChevronRight className="w-5 h-5 -ml-2 animate-pulse" />
                        <ChevronRight className="w-5 h-5 -ml-2 animate-pulse" />
                      </div>
                      <span className="text-[10px] font-bold font-mono tracking-wider">{skipFeedback.text}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* GESTURE DETECTION ZONES WHEN CONTROLS ARE HIDDEN */}
              {!showControls && (
                <div className="absolute inset-0 z-10 flex pointer-events-auto">
                  {/* Left Zone: Single-tap opens controls, Double-tap rewinds 10s */}
                  <div
                    className="w-1/2 h-full cursor-pointer"
                    onClick={(e) => handleZoneClick("left", e)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
                      handleRewind10();
                    }}
                  />
                  {/* Right Zone: Single-tap opens controls, Double-tap skips 10s */}
                  <div
                    className="w-1/2 h-full cursor-pointer"
                    onClick={(e) => handleZoneClick("right", e)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
                      handleSkipForward10();
                    }}
                  />
                </div>
              )}

              {/* CONTROLS OVERLAY (When showControls is true - "oi obosthay thaka obosthay") */}
              <AnimatePresence>
                {showControls && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    onMouseEnter={resetHideTimer}
                    onTouchStart={resetHideTimer}
                    className="absolute inset-0 z-20 bg-gradient-to-t from-black/85 via-transparent to-black/75 flex flex-col justify-between p-2.5 pointer-events-auto"
                  >
                    {/* Top Bar: Title & Window Controls */}
                    <div className="flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0"></span>
                        <p className="text-[11px] font-medium text-white truncate font-display drop-shadow">
                          {playback.title}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Drag Handle */}
                        <div
                          className="p-1 opacity-50 hover:opacity-100 text-zinc-300 hover:text-white cursor-grab active:cursor-grabbing transition"
                          title="Drag anywhere"
                        >
                          <GripHorizontal className="w-4 h-4" />
                        </div>

                        {/* Open in YouTube App */}
                        <button
                          onClick={handleOpenExternal}
                          className="p-1 opacity-50 hover:opacity-100 text-zinc-300 hover:text-red-400 hover:bg-white/10 rounded-lg transition cursor-pointer"
                          title="Open in YouTube"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        {/* Minimize to Ball */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMinimized(true);
                            soundEngine.playWaterDropSound();
                          }}
                          className="p-1 opacity-50 hover:opacity-100 text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                          title="Minimize to Ball (বলের মতো ছোট করুন)"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Close */}
                        <button
                          onClick={handleClose}
                          className="p-1 opacity-50 hover:opacity-100 text-zinc-300 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition cursor-pointer"
                          title="Close"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Center Row with Active Left & Right Click/Double-Click Skip Zones! */}
                    <div className="relative flex-1 flex items-center justify-between w-full">
                      {/* Left Side: Double-click rewinds 10s even when controls are showing! */}
                      <div
                        className="flex-1 h-full cursor-pointer flex items-center justify-start pl-2"
                        onClick={(e) => handleZoneClick("left", e)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
                          handleRewind10();
                        }}
                        title="Double-click to rewind 10s"
                      />

                      {/* Center 3 Buttons (Previous | Big Red Play/Pause | Next) */}
                      <div
                        className="flex items-center justify-center gap-5 shrink-0 z-20 px-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Previous Song */}
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          whileHover={{ scale: 1.1 }}
                          onClick={handlePlayPrevious}
                          className="p-2 rounded-full bg-black/60 opacity-60 hover:opacity-100 text-white border border-white/15 transition cursor-pointer"
                          title="Previous Track"
                        >
                          <SkipBack className="w-4 h-4 fill-current" />
                        </motion.button>

                        {/* Big Center Red Play / Pause Button */}
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          whileHover={{ scale: 1.08 }}
                          onClick={handleTogglePlay}
                          className="w-13 h-13 rounded-full bg-red-600/95 hover:bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-600/40 transition cursor-pointer border border-white/30"
                          title={isPlaying ? "Pause" : "Play"}
                        >
                          {isPlaying ? (
                            <Pause className="w-6 h-6 fill-current" />
                          ) : (
                            <Play className="w-6 h-6 fill-current ml-0.5" />
                          )}
                        </motion.button>

                        {/* Next Song */}
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          whileHover={{ scale: 1.1 }}
                          onClick={handlePlayNext}
                          className="p-2 rounded-full bg-black/60 opacity-60 hover:opacity-100 text-white border border-white/15 transition cursor-pointer"
                          title="Next Track"
                        >
                          <SkipForward className="w-4 h-4 fill-current" />
                        </motion.button>
                      </div>

                      {/* Right Side: Double-click skips 10s even when controls are showing! */}
                      <div
                        className="flex-1 h-full cursor-pointer flex items-center justify-end pr-2"
                        onClick={(e) => handleZoneClick("right", e)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
                          handleSkipForward10();
                        }}
                        title="Double-click to skip 10s"
                      />
                    </div>

                    {/* Bottom: YouTube Red Progress Bar (Swipable Slider) & Compact Volume */}
                    <div className="flex flex-col gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                      
                      {/* Swipable Progress Bar Slider */}
                      <div className="relative w-full flex items-center group/progress py-1">
                        <input
                          type="range"
                          min="0"
                          max={duration > 0 ? duration : 100}
                          step="0.5"
                          value={Math.min(duration || 100, Math.max(0, currentTime))}
                          onMouseDown={() => setIsScrubbing(true)}
                          onTouchStart={() => setIsScrubbing(true)}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setCurrentTime(val);
                            resetHideTimer();
                          }}
                          onMouseUp={(e) => {
                            setIsScrubbing(false);
                            const val = Number((e.target as HTMLInputElement).value);
                            if (ytPlayerRef.current?.seekTo) ytPlayerRef.current.seekTo(val, true);
                            sendIframeCommand("seekTo", [val, true]);
                          }}
                          onTouchEnd={(e) => {
                            setIsScrubbing(false);
                            const val = Number((e.target as HTMLInputElement).value);
                            if (ytPlayerRef.current?.seekTo) ytPlayerRef.current.seekTo(val, true);
                            sendIframeCommand("seekTo", [val, true]);
                          }}
                          className="w-full h-1.5 bg-white/25 hover:bg-white/40 rounded-lg appearance-none cursor-pointer accent-red-600 transition-all group-hover/progress:h-2"
                          title="Swipe to seek forward or backward"
                        />
                      </div>

                      {/* Live Time Indicator (m:ss / m:ss) & Compact Volume Slider */}
                      <div className="flex items-center justify-between text-xs px-0.5">
                        <div className="text-[10px] text-zinc-200 font-mono flex items-center gap-1 drop-shadow font-semibold">
                          <span className="text-white">{formatTime(currentTime)}</span>
                          <span className="text-zinc-400">/</span>
                          <span className="text-zinc-300">{formatTime(duration)}</span>
                        </div>

                        {/* Compact Volume Controller */}
                        <div className="flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded-lg border border-white/15 opacity-60 hover:opacity-100 transition-opacity">
                          <button
                            onClick={handleToggleMute}
                            className="text-zinc-300 hover:text-white transition cursor-pointer"
                            title={isMuted ? "Unmute" : "Mute"}
                          >
                            {isMuted || volume === 0 ? (
                              <VolumeX className="w-3.5 h-3.5 text-red-400" />
                            ) : volume < 50 ? (
                              <Volume1 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                          </button>

                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={isMuted ? 0 : volume}
                            onChange={(e) => handleVolumeChange(Number(e.target.value))}
                            className="w-12 sm:w-14 h-1 bg-white/20 hover:bg-white/30 rounded-lg appearance-none cursor-pointer accent-red-600 transition"
                          />

                          <span className="text-[9px] text-zinc-300 font-mono w-5 text-right">
                            {isMuted ? "0" : volume}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};
