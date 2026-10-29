import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ConnectionState, CharacterDesign } from "../types";
import { Play, Mic, MicOff, Heart, Sparkles, Camera, Bot, RefreshCw } from "lucide-react";
import { FaceMirrorData } from "../utils/faceTracker";
import { soundEngine } from "../utils/soundEngine";

interface AIAvatarProps {
  connectionState: ConnectionState;
  userVolume: number;
  aiVolume: number;
  isMuted: boolean;
  onClick: () => void;
  mood?: "calm" | "excited" | "thinking" | "happy" | "confused" | "supportive" | "surprised" | "concerned" | "curious" | "neutral" | "angry" | "scolded" | "baby_pout" | "laughing";
  avatarScale?: number;
  avatarOffsetX?: number;
  avatarOffsetY?: number;
  faceMirrorData?: FaceMirrorData | null;
  isMirrorMode?: boolean;
  size?: number;
  onCanvasRef?: (canvas: HTMLCanvasElement | null) => void;
  characterDesign?: CharacterDesign;
  onCharacterDesignChange?: (design: CharacterDesign) => void;
}

// Simple 3D point structure
interface Point3D {
  x: number;
  y: number;
  z: number;
}

export const AIAvatar: React.FC<AIAvatarProps> = ({
  connectionState,
  userVolume,
  aiVolume,
  isMuted,
  onClick,
  mood = "calm",
  avatarScale = 1.0,
  avatarOffsetX = 0,
  avatarOffsetY = 0,
  faceMirrorData,
  isMirrorMode = false,
  size = 320,
  onCanvasRef,
  characterDesign,
  onCharacterDesignChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Character Design state (defaults to trending Astro Bot!)
  const [characterStyle, setCharacterStyle] = useState<CharacterDesign>(() => {
    if (characterDesign) return characterDesign;
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("tune_character_design");
      if (
        saved === "astro_bot" ||
        saved === "eve_android" ||
        saved === "cyber_bot" ||
        saved === "mecha_neko" ||
        saved === "celestial_core" ||
        saved === "minimal"
      ) {
        return saved as CharacterDesign;
      }
    }
    return "astro_bot";
  });

  useEffect(() => {
    if (characterDesign && characterDesign !== characterStyle) {
      setCharacterStyle(characterDesign);
    }
  }, [characterDesign]);

  useEffect(() => {
    const handleStyleChange = (e: any) => {
      if (e.detail?.design) {
        setCharacterStyle(e.detail.design);
      }
    };
    window.addEventListener("tune_character_design_changed", handleStyleChange);
    return () => window.removeEventListener("tune_character_design_changed", handleStyleChange);
  }, []);

  const cycleCharacterDesign = () => {
    const list: CharacterDesign[] = [
      "astro_bot",
      "eve_android",
      "cyber_bot",
      "mecha_neko",
      "celestial_core",
      "minimal",
    ];
    const nextIdx = (list.indexOf(characterStyle) + 1) % list.length;
    const nextDesign = list[nextIdx];
    setCharacterStyle(nextDesign);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("tune_character_design", nextDesign);
    }
    if (onCharacterDesignChange) {
      onCharacterDesignChange(nextDesign);
    }
    window.dispatchEvent(new CustomEvent("tune_character_design_changed", { detail: { design: nextDesign } }));
    soundEngine.playActionBeep();
  };

  useEffect(() => {
    if (onCanvasRef && canvasRef.current) {
      onCanvasRef(canvasRef.current);
    }
  }, [onCanvasRef]);
  const [isHovered, setIsHovered] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // Track cursor position for interactive eye/head tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize cursor pos from -1 to 1
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setCursorPos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let t = 0;
    let lastTime = performance.now();
    let blinkTimer = 0;
    let blinkRatio = 1.0; // 1 = fully open, 0 = closed
    let isBlinking = false;

    // Smooth transition values for rotations & offsets to make movements incredibly natural and organic
    let currentYaw = 0;
    let currentPitch = 0;
    let currentTilt = 0;
    let currentMouthHeight = 0;
    let currentSmileRatio = 0; // 0 = flat, 1 = smiling
    let currentEyeScaleY = 1.0;
    let currentEyeBrowY = -3.0;
    let currentBrowAngle = 0;
    let currentBrowArch = 6.0; // Rounded arch depth
    let currentBrowAsymmetry = 0; // Left vs Right brow offset for confusion/emoji expression
    let smoothAiVolume = 0; // Audio envelope follower for ultra-smooth lip sync
    let smoothUserVolume = 0;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // 3D Projection configuration
    const cx = size / 2;
    const cy = size / 2;
    const fov = 350 * (size / 320); // Perspective distance scaled

    const render = (now: number) => {
      const dt = Math.min(0.033, (now - lastTime) / 1000);
      lastTime = now;

      ctx.clearRect(0, 0, size, size);
      t += dt * 1.8;

      // --- BREATHING CYCLE (FACIAL SYSTEM) ---
      let breathingFrequency = 1.1;
      let breathingAmplitude = 1.3;
      if (connectionState === "speaking") {
        breathingFrequency = 1.7;
        breathingAmplitude = 1.6;
      } else if (connectionState === "thinking") {
        breathingFrequency = 0.65; // Distinct slowed, meditative breathing pulse
        breathingAmplitude = 1.5;
      } else if (mood === "excited") {
        breathingFrequency = 2.2;
        breathingAmplitude = 1.8;
      } else if (connectionState === "disconnected") {
        breathingFrequency = 0.5;
        breathingAmplitude = 0.3;
      }

      const breathY = Math.sin(t * breathingFrequency) * breathingAmplitude;

      // --- 1. CORE PHYSICS & NATURAL MOVEMENTS ---
      let targetYaw = Math.sin(t * 0.6) * 0.03 + Math.cos(t * 0.2) * 0.01;
      let targetPitch = Math.cos(t * 0.5) * 0.02 - 0.05; // Slightly looking forward/down
      let targetTilt = Math.sin(t * 0.3) * 0.02;

      // Idle eye saccades and gaze drifts
      let gazeX = cursorPos.x * 0.25;
      let gazeY = cursorPos.y * 0.25;

      // Adjust targets based on moods and system states
      if (connectionState === "disconnected") {
        targetPitch = 0.05 + Math.sin(t * 0.3) * 0.02; // Nodding down, asleep
        targetYaw = Math.sin(t * 0.2) * 0.02;
        gazeX = 0;
        gazeY = 0.1; // Sleeping eyes
      } else if (connectionState === "connecting") {
        targetYaw = Math.sin(t * 1.2) * 0.05; // Scanning left/right smoothly
        targetPitch = Math.cos(t * 0.8) * 0.03;
      } else if (connectionState === "listening") {
        targetPitch = -0.05 + (cursorPos.y * 0.02);
        targetYaw = cursorPos.x * 0.10;
        targetTilt = 0;
        gazeX = cursorPos.x * 0.30;
        gazeY = cursorPos.y * 0.30 - 0.05;
      } else if (connectionState === "speaking") {
        const speakNod = Math.sin(t * 1.2) * 0.03;
        const speakSway = Math.sin(t * 0.8) * 0.04;
        targetPitch = -0.05 + speakNod; 
        targetYaw = speakSway + (cursorPos.x * 0.08); 
        targetTilt = Math.sin(t * 0.9) * 0.02; 
        gazeX = cursorPos.x * 0.30;
        gazeY = cursorPos.y * 0.30 - 0.05;
      } else if (connectionState === "thinking") {
        // Natural, gentle, cute contemplative posture
        targetPitch = -0.05 + Math.cos(t * 0.8) * 0.015;
        targetYaw = Math.sin(t * 0.6) * 0.03 + (cursorPos.x * 0.04);
        targetTilt = 0.03 + Math.sin(t * 0.7) * 0.015;
        gazeX = Math.sin(t * 0.5) * 0.08 + (cursorPos.x * 0.10);
        gazeY = -0.08 + (cursorPos.y * 0.10);
      }

      // Smooth audio envelopes with delta-time spring follower
      if (aiVolume > smoothAiVolume) {
        smoothAiVolume += (aiVolume - smoothAiVolume) * Math.min(1, dt * 18);
      } else {
        smoothAiVolume += (aiVolume - smoothAiVolume) * Math.min(1, dt * 10);
      }

      if (userVolume > smoothUserVolume) {
        smoothUserVolume += (userVolume - smoothUserVolume) * Math.min(1, dt * 14);
      } else {
        smoothUserVolume += (userVolume - smoothUserVolume) * Math.min(1, dt * 8);
      }

      // Handle custom emotional expressions & emoji-style eyebrow morphing
      let smileTarget = 0.2; // Soft neutral smiling curve
      let browTarget = -3.5; // Raised, rounded eyebrow height
      let angleTarget = 0; // Eyebrow tilt angle
      let archTarget = 7.0; // Rounded arch depth
      let asymTarget = 0; // Asymmetry offset for emoji expressions

      const m = String(mood || "calm").toLowerCase();

      // --- 100+ FACIAL REACTION EXPRESSION ENGINE ---
      if (m.includes("happy") || m.includes("excited") || m.includes("joy") || m.includes("ecstatic") || m.includes("giggle") || m.includes("delighted")) {
        smileTarget = 0.88;
        browTarget = -6.5;
        angleTarget = -0.15;
        archTarget = 9.5;
        targetPitch += 0.02;
        if (m.includes("excited") || m.includes("ecstatic")) {
          targetYaw += Math.sin(t * 1.2) * 0.03;
        }
      } else if (m.includes("laugh") || m.includes("lol") || m.includes("rofl") || m.includes("haha")) {
        smileTarget = 1.0;
        browTarget = -8.5;
        angleTarget = -0.22;
        archTarget = 12.0;
        targetPitch += Math.sin(t * 1.8) * 0.04;
        targetYaw += Math.sin(t * 1.2) * 0.04;
        targetTilt += Math.cos(t * 1.0) * 0.03;
      } else if (m.includes("scold") || m.includes("pout") || m.includes("sad") || m.includes("cry") || m.includes("oviman") || m.includes("pleading") || m.includes("sorry") || m.includes("heartbroken")) {
        smileTarget = -0.38;
        browTarget = -6.8;
        angleTarget = -0.58;
        archTarget = 5.0;
        targetPitch = 0.10 + Math.sin(t * 0.8) * 0.02;
        targetTilt = Math.sin(t * 1.0) * 0.03;
        gazeY = 0.15;
      } else if (m.includes("angry") || m.includes("furious") || m.includes("pissed") || m.includes("annoyed") || m.includes("grumpy") || m.includes("outrage")) {
        smileTarget = -0.65;
        browTarget = 3.8;
        angleTarget = 0.50;
        archTarget = -2.5;
        targetPitch = 0.05;
      } else if (m.includes("confused") || m.includes("curious") || m.includes("puzzled") || m.includes("skeptical") || m.includes("suspicious") || m.includes("huh")) {
        targetTilt = 0.12;
        browTarget = -5.0;
        angleTarget = 0.25;
        archTarget = 6.5;
        asymTarget = 9.5;
        smileTarget = 0.05;
      } else if (m.includes("support") || m.includes("concern") || m.includes("empathy") || m.includes("caring") || m.includes("reassur")) {
        smileTarget = 0.15;
        browTarget = -4.5;
        angleTarget = -0.32;
        archTarget = 8.5;
        targetPitch = -0.01;
      } else if (m.includes("surprise") || m.includes("shock") || m.includes("mindblown") || m.includes("wow") || m.includes("gasp") || m.includes("stun")) {
        smileTarget = -0.1;
        browTarget = -10.5;
        angleTarget = -0.1;
        archTarget = 14.0;
        targetPitch = -0.06;
      } else if (m.includes("think") || m.includes("calculate") || m.includes("ponder") || m.includes("concentrat") || m.includes("brainstorm") || m.includes("search") || m.includes("research")) {
        smileTarget = 0.15;
        browTarget = -2.0;
        angleTarget = 0.2;
        archTarget = 4.0;
        targetYaw += Math.sin(t * 1.2) * 0.03;
        gazeX += Math.cos(t * 1.0) * 0.08;
      } else if (m.includes("flirt") || m.includes("wink") || m.includes("charm") || m.includes("smirk") || m.includes("shy") || m.includes("blush")) {
        smileTarget = 0.60;
        browTarget = -5.5;
        angleTarget = -0.1;
        asymTarget = 6.0;
        targetTilt = 0.08;
      } else if (m.includes("sleep") || m.includes("tired") || m.includes("yawn") || m.includes("bored") || m.includes("drowsy")) {
        smileTarget = -0.05;
        browTarget = -1.0;
        angleTarget = 0.0;
        targetPitch = 0.08;
      } else if (m.includes("cool") || m.includes("sunglass") || m.includes("confident") || m.includes("boss") || m.includes("badass")) {
        smileTarget = 0.45;
        browTarget = -4.0;
        angleTarget = -0.1;
        targetPitch = -0.04;
      } else if (m.includes("silly") || m.includes("tongue") || m.includes("goofy") || m.includes("derp") || m.includes("playful")) {
        smileTarget = 0.70;
        browTarget = -7.0;
        asymTarget = 8.0;
        targetTilt = -0.10;
      } else if (m.includes("sing") || m.includes("rock") || m.includes("groov") || m.includes("dance") || m.includes("music")) {
        smileTarget = 0.65;
        browTarget = -6.0;
        targetYaw += Math.sin(t * 1.5) * 0.04;
        targetTilt += Math.cos(t * 1.2) * 0.03;
      } else if (m.includes("peace") || m.includes("zen") || m.includes("meditat") || m.includes("relax")) {
        smileTarget = 0.25;
        browTarget = -3.0;
        angleTarget = -0.1;
        targetPitch = 0.02;
      } else if (m.includes("victor") || m.includes("celebrat") || m.includes("genius") || m.includes("eureka") || m.includes("flex")) {
        smileTarget = 0.90;
        browTarget = -8.0;
        archTarget = 11.0;
        targetPitch = -0.06;
      }

      // Listening & Speaking Reactions: Keep active emotional mood eyebrows and smile curve intact during speech!
      if (connectionState === "listening") {
        const listenVolBoost = Math.min(2.0, smoothUserVolume * 3.0);
        if (mood === "calm" || mood === "neutral") {
          browTarget = -6.0 - listenVolBoost; // Warm raised eyebrows
          angleTarget = -0.15; // Gentle friendly inner lift
          archTarget = 9.5; // High rounded happy arches
          smileTarget = 0.50 + smoothUserVolume * 0.2; // Cute attentive smile when listening!
          targetTilt = 0.05; // Cute curious head tilt
        } else if (mood === "scolded" || mood === "baby_pout") {
          browTarget = -6.8;
          angleTarget = -0.55;
          archTarget = 5.0;
          smileTarget = -0.3;
        } else if (mood === "curious" || mood === "confused") {
          browTarget = -5.5 - listenVolBoost * 0.5;
          angleTarget = 0.25;
          asymTarget = 9.0;
          smileTarget = 0.25;
        } else if (mood === "happy" || mood === "excited" || mood === "laughing") {
          browTarget = -7.0 - listenVolBoost * 0.5;
          angleTarget = -0.2;
          archTarget = 10.5;
          smileTarget = 0.85;
        } else if (mood === "concerned" || mood === "supportive") {
          browTarget = -5.0 - listenVolBoost * 0.5;
          angleTarget = -0.35;
          archTarget = 8.5;
          smileTarget = 0.2;
        }
      } else if (connectionState === "speaking") {
        // Keep active emotional eyebrow posture, only applying fallback for neutral/calm
        if (mood === "calm" || mood === "neutral") {
          browTarget = -6.0;
          angleTarget = -0.10;
          archTarget = 8.5;
          asymTarget = 0;
        }
      } else if (connectionState === "thinking") {
        smileTarget = 0.42; // Warm, sweet subtle smiling curve
        browTarget = -5.5; // Soft high gentle eyebrows
        angleTarget = -0.08; // Gentle friendly lift
        archTarget = 9.0; // Beautiful soft rounded arches
        asymTarget = 1.5; // Subtle natural organic touch, never deformed
      }

      // --- FACE MIRRORING / CAMERA FACIAL GESTURE MIMIC OVERRIDE ---
      let mirrorLerpSpeed = 4.5;
      if (isMirrorMode && faceMirrorData) {
        targetYaw = faceMirrorData.yaw;
        targetPitch = faceMirrorData.pitch;
        targetTilt = faceMirrorData.tilt;
        smileTarget = faceMirrorData.smileRatio;
        browTarget = faceMirrorData.eyebrowY;
        gazeX = faceMirrorData.yaw * 0.5;
        gazeY = faceMirrorData.pitch * 0.5;
        mirrorLerpSpeed = 6.0;
      }

      // Smoothly interpolate current physics values with delta-time spring lerp
      const lerpFactor = Math.min(1, dt * mirrorLerpSpeed);
      currentYaw += (targetYaw - currentYaw) * lerpFactor;
      currentPitch += (targetPitch - currentPitch) * lerpFactor;
      currentTilt += (targetTilt - currentTilt) * lerpFactor;
      currentSmileRatio += (smileTarget - currentSmileRatio) * lerpFactor;

      const browLerpFactor = Math.min(1, dt * 5.0);
      currentEyeBrowY += (browTarget - currentEyeBrowY) * browLerpFactor;
      currentBrowAngle += (angleTarget - currentBrowAngle) * browLerpFactor;
      currentBrowArch += (archTarget - currentBrowArch) * browLerpFactor;
      currentBrowAsymmetry += (asymTarget - currentBrowAsymmetry) * browLerpFactor;

      // Dynamic mouth opening with smooth audio envelope follower or face camera mirror
      let targetMouthHeight = 0;
      if (isMirrorMode && faceMirrorData && faceMirrorData.mouthHeight > 0) {
        targetMouthHeight = faceMirrorData.mouthHeight;
      } else if (connectionState === "speaking") {
        const mouthPulse = Math.sin(t * 10) * 1.8 * Math.min(1, smoothAiVolume * 2);
        targetMouthHeight = Math.min(26, smoothAiVolume * 45 + mouthPulse);
        if (mood !== "scolded" && mood !== "baby_pout" && mood !== "angry") {
          smileTarget = Math.max(smileTarget, 0.35 + smoothAiVolume * 0.30);
        }
      } else if (connectionState === "listening") {
        currentSmileRatio += smoothUserVolume * 0.10;
      }
      currentMouthHeight += (targetMouthHeight - currentMouthHeight) * Math.min(1, dt * (isMirrorMode ? 10 : 16));

      // Organic Blinking controller (Blinks naturally every 2-4 seconds)
      blinkTimer++;
      if (!isBlinking && Math.random() < 0.012 && blinkTimer > 80) {
        isBlinking = true;
        blinkTimer = 0;
      }

      if (isBlinking) {
        blinkRatio -= 0.3;
        if (blinkRatio <= 0) {
          blinkRatio = 0;
          isBlinking = false; // Start reopening
        }
      } else if (blinkRatio < 1.0) {
        blinkRatio += 0.25;
        if (blinkRatio > 1.0) blinkRatio = 1.0;
      }

      // Override blink when disconnected (fully closed eyes)
      let listeningEyeNarrow = 1.0;
      if (connectionState === "listening" && userVolume > 0.02) {
        // Attentive focused eye narrowing ONLY while user speaks ("cokh choto kore monojug diye shuna")
        listeningEyeNarrow = Math.max(0.45, 1.0 - Math.min(0.52, userVolume * 2.2));
      }

      if (connectionState === "disconnected") {
        currentEyeScaleY = 0.05;
      } else {
        currentEyeScaleY = blinkRatio * (mood === "surprised" ? 1.4 : mood === "angry" ? 0.7 : 1.0);
      }

      // Rotation matrix values
      const cosY = Math.cos(currentYaw);
      const sinY = Math.sin(currentYaw);
      const cosP = Math.cos(currentPitch);
      const sinP = Math.sin(currentPitch);
      const cosT = Math.cos(currentTilt);
      const sinT = Math.sin(currentTilt);

      // 3D point transformer
      const project = (pt: Point3D): { x: number; y: number } => {
        const ptY = pt.y + breathY;
        let x1 = pt.x * cosY - pt.z * sinY;
        let z1 = pt.x * sinY + pt.z * cosY;
        let y2 = ptY * cosP - z1 * sinP;
        let z2 = ptY * sinP + z1 * cosP;
        let x3 = x1 * cosT - y2 * sinT;
        let y3 = x1 * sinT + y2 * cosT;
        const distance = 400;
        const scaleFactor = fov / (distance + z2);
        return {
          x: cx + x3 * scaleFactor,
          y: cy + y3 * scaleFactor,
        };
      };

      // Theme Colors & Dynamic Cybernetic Lighting
      let primaryColor = "#ffffff";
      if (connectionState === "disconnected") {
        primaryColor = "rgba(225, 225, 230, 0.45)";
      } else if (connectionState === "thinking") {
        primaryColor = "rgba(255, 255, 255, 0.98)";
      }

      // Dynamic theme accent colors for character lighting
      let accentColor = "#06b6d4"; // luminous cyan
      let glowColor = "rgba(6, 182, 212, 0.45)";
      if (connectionState === "speaking") {
        accentColor = "#c084fc"; // energetic lavender
        glowColor = "rgba(192, 132, 252, 0.55)";
      } else if (connectionState === "thinking") {
        accentColor = "#fbbf24"; // radiant starlight amber
        glowColor = "rgba(251, 191, 36, 0.5)";
      } else if (connectionState === "disconnected") {
        accentColor = "#71717a"; // sleepy zinc
        glowColor = "rgba(113, 113, 122, 0.15)";
      } else if (mood === "happy" || mood === "excited" || mood === "laughing") {
        accentColor = "#f472b6"; // playful sakura pink
        glowColor = "rgba(244, 114, 182, 0.55)";
      } else if (mood === "angry") {
        accentColor = "#f87171"; // crimson alert
        glowColor = "rgba(248, 113, 113, 0.55)";
      } else if (mood === "calm") {
        accentColor = "#38bdf8"; // serene sky cyan
        glowColor = "rgba(56, 189, 248, 0.45)";
      }

      // --- 1. DISTINCT THOUGHT STATE: RADIANT CELESTIAL SOFT BLOOM ---
      if (connectionState === "thinking") {
        const thinkPulse = Math.sin(t * 1.5) * 0.5 + 0.5;
        const auraRadius = 86 + thinkPulse * 14;
        const auraGrad = ctx.createRadialGradient(cx, cy, 15, cx, cy, auraRadius);
        auraGrad.addColorStop(0, `rgba(167, 139, 250, ${0.18 + thinkPulse * 0.10})`);
        auraGrad.addColorStop(0.5, `rgba(56, 189, 248, ${0.10 + thinkPulse * 0.06})`);
        auraGrad.addColorStop(0.85, `rgba(129, 140, 248, ${0.04 + thinkPulse * 0.04})`);
        auraGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- 2. CELESTIAL CORE CHARACTER DESIGN (Rotating 3D Holographic Gimbal Rings) ---
      if (characterStyle === "celestial_core") {
        const pCoreCenter = project({ x: 0, y: 0, z: 0 });
        const corePulse = Math.sin(t * 1.8) * 4;
        const coreGrad = ctx.createRadialGradient(pCoreCenter.x, pCoreCenter.y, 10, pCoreCenter.x, pCoreCenter.y, 82 + corePulse);
        coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        coreGrad.addColorStop(0.25, glowColor);
        coreGrad.addColorStop(0.65, "rgba(147, 51, 234, 0.12)");
        coreGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(pCoreCenter.x, pCoreCenter.y, 82 + corePulse, 0, Math.PI * 2);
        ctx.fill();

        // 3D Gyroscopic Gimbal Rings
        const ringConfigs = [
          { speed: 0.8, rx: 78, ry: 26, color: accentColor, width: 2.2 },
          { speed: -0.6, rx: 86, ry: 30, color: "rgba(255, 255, 255, 0.4)", width: 1.5 },
          { speed: 1.1, rx: 94, ry: 34, color: glowColor, width: 1.8 },
        ];

        ringConfigs.forEach((cfg, idx) => {
          ctx.save();
          ctx.translate(pCoreCenter.x, pCoreCenter.y);
          ctx.rotate(t * cfg.speed + idx * 1.05);
          ctx.strokeStyle = cfg.color;
          ctx.lineWidth = cfg.width;
          ctx.beginPath();
          ctx.ellipse(0, 0, cfg.rx, cfg.ry, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Orbiting satellite star nodes
          const nodeAngle = t * 2.2 + idx * 2.0;
          const nx = Math.cos(nodeAngle) * cfg.rx;
          const ny = Math.sin(nodeAngle) * cfg.ry;
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = accentColor;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(nx, ny, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }

      // --- 3. FLOATING MECHA TORSO & ARC REACTOR (Astro Bot, EVE Android, Cyber Bot & Mecha Neko) ---
      if (characterStyle === "astro_bot") {
        // ASTRO BOT: Glossy White Ceramic Body, Cobalt Blue Chestplate, & Cute Floating Hands
        const neckY = 50;
        const torsoBottomY = 82;
        const pNeckL = project({ x: -28, y: neckY, z: -6 });
        const pNeckR = project({ x: 28, y: neckY, z: -6 });
        const pShoulderL = project({ x: -44, y: neckY + 10, z: -4 });
        const pShoulderR = project({ x: 44, y: neckY + 10, z: -4 });
        const pBottomL = project({ x: -26, y: torsoBottomY, z: -4 });
        const pBottomR = project({ x: 26, y: torsoBottomY, z: -4 });

        // Pearlescent White Ceramic Torso Gradient
        const torsoGrad = ctx.createLinearGradient(pNeckL.x, pNeckL.y, pBottomR.x, pBottomR.y);
        torsoGrad.addColorStop(0, "#ffffff");
        torsoGrad.addColorStop(0.5, "#e2e8f0");
        torsoGrad.addColorStop(1, "#cbd5e1");

        ctx.fillStyle = torsoGrad;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pNeckL.x, pNeckL.y);
        ctx.lineTo(pShoulderL.x, pShoulderL.y);
        ctx.lineTo(pBottomL.x, pBottomL.y);
        ctx.lineTo(pBottomR.x, pBottomR.y);
        ctx.lineTo(pShoulderR.x, pShoulderR.y);
        ctx.lineTo(pNeckR.x, pNeckR.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cobalt Blue Chest Plate Collar
        const pCollarTL = project({ x: -22, y: neckY + 2, z: -2 });
        const pCollarTR = project({ x: 22, y: neckY + 2, z: -2 });
        const pCollarBL = project({ x: -16, y: neckY + 14, z: -2 });
        const pCollarBR = project({ x: 16, y: neckY + 14, z: -2 });
        const collarGrad = ctx.createLinearGradient(pCollarTL.x, pCollarTL.y, pCollarBR.x, pCollarBR.y);
        collarGrad.addColorStop(0, "#2563eb");
        collarGrad.addColorStop(1, "#1d4ed8");
        ctx.fillStyle = collarGrad;
        ctx.beginPath();
        ctx.moveTo(pCollarTL.x, pCollarTL.y);
        ctx.lineTo(pCollarTR.x, pCollarTR.y);
        ctx.lineTo(pCollarBR.x, pCollarBR.y);
        ctx.lineTo(pCollarBL.x, pCollarBL.y);
        ctx.closePath();
        ctx.fill();

        // Astro Bot Pulsing Chest Power Diode
        const pReactor = project({ x: 0, y: neckY + 18, z: 6 });
        const reactorPulse = Math.sin(t * 3.0) * 1.5;
        const coreRadius = 5 + (smoothAiVolume * 4) + reactorPulse;
        const reactorGrad = ctx.createRadialGradient(pReactor.x, pReactor.y, 1, pReactor.x, pReactor.y, coreRadius + 6);
        reactorGrad.addColorStop(0, "#ffffff");
        reactorGrad.addColorStop(0.4, "#00f0ff");
        reactorGrad.addColorStop(1, "rgba(0, 240, 255, 0)");
        ctx.fillStyle = reactorGrad;
        ctx.beginPath();
        ctx.arc(pReactor.x, pReactor.y, coreRadius + 6, 0, Math.PI * 2);
        ctx.fill();

        // Bottom Cyan Plasma Booster Exhaust Flame
        const pExhaust = project({ x: 0, y: torsoBottomY + 4, z: -4 });
        const flameLength = 8 + (smoothAiVolume * 10) + Math.sin(t * 8) * 3;
        const flameGrad = ctx.createLinearGradient(pExhaust.x, pExhaust.y, pExhaust.x, pExhaust.y + flameLength);
        flameGrad.addColorStop(0, "rgba(0, 240, 255, 0.8)");
        flameGrad.addColorStop(0.5, "rgba(59, 130, 246, 0.5)");
        flameGrad.addColorStop(1, "rgba(59, 130, 246, 0)");
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.moveTo(pExhaust.x - 12, pExhaust.y);
        ctx.quadraticCurveTo(pExhaust.x, pExhaust.y + flameLength, pExhaust.x + 12, pExhaust.y);
        ctx.fill();

        // CUTE FLOATING ROBOT HANDS (Left & Right that hover and wave with speech!)
        [-1, 1].forEach((side) => {
          const handBob = Math.sin(t * 2.8 + side * 1.2) * 5;
          const speechLift = connectionState === "speaking" ? smoothAiVolume * 14 : 0;
          const handBaseX = side * 76 + (side * smoothAiVolume * 8);
          const handBaseY = 46 + handBob - speechLift;
          const pHand = project({ x: handBaseX, y: handBaseY, z: 12 });

          // Hand glove body (Glossy white mitt)
          ctx.save();
          ctx.shadowColor = "rgba(0, 240, 255, 0.4)";
          ctx.shadowBlur = 8;
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "rgba(226, 232, 240, 0.9)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(pHand.x, pHand.y, 14, 11, side * 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Cobalt Blue Wrist Cuff
          const pCuff = project({ x: handBaseX - (side * 6), y: handBaseY + 6, z: 10 });
          ctx.fillStyle = "#2563eb";
          ctx.beginPath();
          ctx.ellipse(pCuff.x, pCuff.y, 7, 5, side * 0.2, 0, Math.PI * 2);
          ctx.fill();

          // Glowing Cyan Palm Repulsor Light
          ctx.fillStyle = "#00f0ff";
          ctx.beginPath();
          ctx.arc(pHand.x, pHand.y, 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      } else if (characterStyle === "eve_android") {
        // EVE ANDROID: Ultra-Sleek Aerodynamic Pearlescent White Egg Chassis with Levitating Wings
        const neckY = 52;
        const torsoBottomY = 94;
        const pTorsoTop = project({ x: 0, y: neckY, z: -2 });
        const pTorsoBtm = project({ x: 0, y: torsoBottomY, z: -2 });

        const eveGrad = ctx.createLinearGradient(pTorsoTop.x, pTorsoTop.y, pTorsoBtm.x, pTorsoBtm.y);
        eveGrad.addColorStop(0, "#ffffff");
        eveGrad.addColorStop(0.65, "#f1f5f9");
        eveGrad.addColorStop(1, "#cbd5e1");

        ctx.fillStyle = eveGrad;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(pTorsoTop.x, (pTorsoTop.y + pTorsoBtm.y) / 2, 34, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Aerodynamic Floating Wings / Magnetic Arms
        [-1, 1].forEach((side) => {
          const wingSway = Math.sin(t * 2.2 + side) * 3;
          const pWing = project({ x: side * 64, y: 38 + wingSway, z: 4 });
          ctx.save();
          ctx.translate(pWing.x, pWing.y);
          ctx.rotate(side * (0.28 + Math.sin(t * 2.0) * 0.05));
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "rgba(203, 213, 225, 0.7)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, 9, 28, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Wing neon cyan edge accent
          ctx.strokeStyle = "rgba(0, 240, 255, 0.7)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(side * 4, 0, 16, Math.PI * 0.3, Math.PI * 0.7);
          ctx.stroke();
          ctx.restore();
        });
      } else if (characterStyle === "cyber_bot" || characterStyle === "mecha_neko") {
        const neckY = 50;
        const torsoBottomY = 82;
        const pNeckL = project({ x: -26, y: neckY, z: -6 });
        const pNeckR = project({ x: 26, y: neckY, z: -6 });
        const pShoulderL = project({ x: -46, y: neckY + 12, z: -4 });
        const pShoulderR = project({ x: 46, y: neckY + 12, z: -4 });
        const pBottomL = project({ x: -28, y: torsoBottomY, z: -4 });
        const pBottomR = project({ x: 28, y: torsoBottomY, z: -4 });

        // Torso gradient
        const torsoGrad = ctx.createLinearGradient(pNeckL.x, pNeckL.y, pBottomR.x, pBottomR.y);
        torsoGrad.addColorStop(0, "#161a26");
        torsoGrad.addColorStop(0.6, "#0e111a");
        torsoGrad.addColorStop(1, "#07090e");

        ctx.fillStyle = torsoGrad;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(pNeckL.x, pNeckL.y);
        ctx.lineTo(pShoulderL.x, pShoulderL.y);
        ctx.lineTo(pBottomL.x, pBottomL.y);
        ctx.lineTo(pBottomR.x, pBottomR.y);
        ctx.lineTo(pShoulderR.x, pShoulderR.y);
        ctx.lineTo(pNeckR.x, pNeckR.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Shoulder accent nodes
        const pShoulderAccentL = project({ x: -48, y: neckY + 10, z: 0 });
        const pShoulderAccentR = project({ x: 48, y: neckY + 10, z: 0 });
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(pShoulderAccentL.x, pShoulderAccentL.y, 2.5, 0, Math.PI * 2);
        ctx.arc(pShoulderAccentR.x, pShoulderAccentR.y, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing Arc Reactor Core in center of chest
        const pReactor = project({ x: 0, y: neckY + 16, z: 6 });
        const reactorPulse = Math.sin(t * 2.5) * 1.5;
        const coreRadius = 6 + (smoothAiVolume * 4) + reactorPulse;
        const reactorGrad = ctx.createRadialGradient(pReactor.x, pReactor.y, 1, pReactor.x, pReactor.y, coreRadius + 8);
        reactorGrad.addColorStop(0, "#ffffff");
        reactorGrad.addColorStop(0.35, accentColor);
        reactorGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = reactorGrad;
        ctx.beginPath();
        ctx.arc(pReactor.x, pReactor.y, coreRadius + 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(pReactor.x, pReactor.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- 4. TOP ANTENNA BEACON (For Astro Bot & Cyber Bot) ---
      if (characterStyle === "astro_bot") {
        // ASTRO BOT ANTENNA: Sleek Metallic Stem + Glowing Cyan Orb + Orbiting Energy Ring!
        const pAntennaBase = project({ x: 0, y: -52, z: -8 });
        const pAntennaTip = project({ x: 0, y: -86, z: -8 });

        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(pAntennaBase.x, pAntennaBase.y);
        ctx.lineTo(pAntennaTip.x, pAntennaTip.y);
        ctx.stroke();

        // Pulsing Glowing Cyan Beacon Orb
        const beaconPulse = Math.sin(t * 4.0) * 0.3 + 0.7;
        const beaconRadius = 7 + (connectionState === "speaking" ? smoothAiVolume * 6 : beaconPulse * 2);
        const beaconGrad = ctx.createRadialGradient(pAntennaTip.x, pAntennaTip.y, 1, pAntennaTip.x, pAntennaTip.y, beaconRadius + 10);
        beaconGrad.addColorStop(0, "#ffffff");
        beaconGrad.addColorStop(0.35, "#00f0ff");
        beaconGrad.addColorStop(0.8, "rgba(59, 130, 246, 0.4)");
        beaconGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = beaconGrad;
        ctx.beginPath();
        ctx.arc(pAntennaTip.x, pAntennaTip.y, beaconRadius + 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(pAntennaTip.x, pAntennaTip.y, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Orbiting Cyan Laser Energy Ring around Antenna tip
        ctx.save();
        ctx.translate(pAntennaTip.x, pAntennaTip.y);
        ctx.rotate(t * 2.5);
        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (characterStyle === "cyber_bot") {
        const pAntennaBase = project({ x: 0, y: -52, z: -8 });
        const pAntennaTip = project({ x: 0, y: -82, z: -8 });

        ctx.strokeStyle = "#333d52";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(pAntennaBase.x, pAntennaBase.y);
        ctx.lineTo(pAntennaTip.x, pAntennaTip.y);
        ctx.stroke();

        // Glowing Antenna Beacon Orb
        const beaconPulse = Math.sin(t * 3.5) * 0.3 + 0.7;
        const beaconRadius = 6 + (connectionState === "speaking" ? smoothAiVolume * 5 : beaconPulse * 2);

        const beaconGrad = ctx.createRadialGradient(pAntennaTip.x, pAntennaTip.y, 1, pAntennaTip.x, pAntennaTip.y, beaconRadius + 8);
        beaconGrad.addColorStop(0, "#ffffff");
        beaconGrad.addColorStop(0.35, accentColor);
        beaconGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = beaconGrad;
        ctx.beginPath();
        ctx.arc(pAntennaTip.x, pAntennaTip.y, beaconRadius + 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(pAntennaTip.x, pAntennaTip.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- 5. ROBOTIC CAT EARS (For Mecha Neko) ---
      if (characterStyle === "mecha_neko") {
        [-1, 1].forEach((side) => {
          const pEarBaseIn = project({ x: side * 22, y: -48, z: -8 });
          const pEarTip = project({ x: side * 48, y: -80, z: -8 });
          const pEarBaseOut = project({ x: side * 58, y: -42, z: -8 });

          // Outer ear chassis
          ctx.fillStyle = "#181d2a";
          ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(pEarBaseIn.x, pEarBaseIn.y);
          ctx.lineTo(pEarTip.x, pEarTip.y);
          ctx.lineTo(pEarBaseOut.x, pEarBaseOut.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Inner glowing neon sensor
          const pInnerIn = project({ x: side * 28, y: -50, z: -6 });
          const pInnerTip = project({ x: side * 46, y: -72, z: -6 });
          const pInnerOut = project({ x: side * 50, y: -46, z: -6 });

          ctx.fillStyle = accentColor;
          ctx.shadowColor = accentColor;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(pInnerIn.x, pInnerIn.y);
          ctx.lineTo(pInnerTip.x, pInnerTip.y);
          ctx.lineTo(pInnerOut.x, pInnerOut.y);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      }

      // --- 6. ROBOT HEAD CHASSIS & GLOSSY SCREEN VISOR (Astro Bot, EVE Android, Cyber Bot & Mecha Neko) ---
      if (
        characterStyle === "astro_bot" ||
        characterStyle === "eve_android" ||
        characterStyle === "cyber_bot" ||
        characterStyle === "mecha_neko"
      ) {
        const isWhiteCeramic = characterStyle === "astro_bot" || characterStyle === "eve_android";
        const hw = 66; // half-width
        const topY = -50;
        const btmY = 46;
        const zBack = -12;
        const zFront = 18;

        const pTL = project({ x: -hw + 16, y: topY, z: zBack });
        const pTR = project({ x: hw - 16, y: topY, z: zBack });
        const pTopMid = project({ x: 0, y: topY - 4, z: zBack });
        const pRightTop = project({ x: hw, y: topY + 16, z: zBack });
        const pRightBtm = project({ x: hw - 4, y: btmY - 14, z: zBack });
        const pBtmR = project({ x: hw - 18, y: btmY, z: zBack });
        const pBtmMid = project({ x: 0, y: btmY + 2, z: zBack });
        const pBtmL = project({ x: -hw + 18, y: btmY, z: zBack });
        const pLeftBtm = project({ x: -hw + 4, y: btmY - 14, z: zBack });
        const pLeftTop = project({ x: -hw, y: topY + 16, z: zBack });

        // Helmet Color (Glossy Ceramic White for Astro Bot / EVE, Obsidian Metallic for Cyber Bot / Mecha Neko)
        const helmetGrad = ctx.createLinearGradient(pTL.x, pTL.y, pBtmR.x, pBtmR.y);
        if (isWhiteCeramic) {
          helmetGrad.addColorStop(0, "#ffffff");
          helmetGrad.addColorStop(0.5, "#e2e8f0");
          helmetGrad.addColorStop(1, "#cbd5e1");
        } else {
          helmetGrad.addColorStop(0, "#1d2333");
          helmetGrad.addColorStop(0.5, "#10141f");
          helmetGrad.addColorStop(1, "#090b12");
        }

        ctx.save();
        ctx.shadowColor = isWhiteCeramic ? "rgba(0, 240, 255, 0.35)" : glowColor;
        ctx.shadowBlur = 18;
        ctx.fillStyle = helmetGrad;
        ctx.strokeStyle = isWhiteCeramic ? "rgba(255, 255, 255, 0.6)" : "rgba(255, 255, 255, 0.18)";
        ctx.lineWidth = 2.4;

        ctx.beginPath();
        ctx.moveTo(pTL.x, pTL.y);
        ctx.quadraticCurveTo(pTopMid.x, pTopMid.y, pTR.x, pTR.y);
        ctx.quadraticCurveTo(pRightTop.x, pRightTop.y, pRightBtm.x, pRightBtm.y);
        ctx.quadraticCurveTo(pBtmR.x, pBtmR.y, pBtmMid.x, pBtmMid.y);
        ctx.quadraticCurveTo(pBtmL.x, pBtmL.y, pLeftBtm.x, pLeftBtm.y);
        ctx.quadraticCurveTo(pLeftTop.x, pLeftTop.y, pTL.x, pTL.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Forehead Cobalt Crest Band for Astro Bot!
        if (characterStyle === "astro_bot") {
          const pCrestL = project({ x: -32, y: topY + 4, z: zBack + 3 });
          const pCrestMid = project({ x: 0, y: topY + 2, z: zBack + 3 });
          const pCrestR = project({ x: 32, y: topY + 4, z: zBack + 3 });
          ctx.strokeStyle = "#2563eb";
          ctx.lineWidth = 3.5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(pCrestL.x, pCrestL.y);
          ctx.quadraticCurveTo(pCrestMid.x, pCrestMid.y, pCrestR.x, pCrestR.y);
          ctx.stroke();
        }

        // Chin Trim
        const pChinL = project({ x: -hw + 26, y: btmY - 3, z: zBack + 2 });
        const pChinMid = project({ x: 0, y: btmY - 1, z: zBack + 2 });
        const pChinR = project({ x: hw - 26, y: btmY - 3, z: zBack + 2 });
        ctx.strokeStyle = isWhiteCeramic ? "#00f0ff" : accentColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pChinL.x, pChinL.y);
        ctx.quadraticCurveTo(pChinMid.x, pChinMid.y, pChinR.x, pChinR.y);
        ctx.stroke();

        // Dark Glossy Visor Screen
        const vW = 54;
        const vTopY = -35;
        const vBtmY = 37;
        const pVisorTL = project({ x: -vW + 12, y: vTopY, z: zFront });
        const pVisorTR = project({ x: vW - 12, y: vTopY, z: zFront });
        const pVisorTopMid = project({ x: 0, y: vTopY - 2, z: zFront });
        const pVisorBR = project({ x: vW - 14, y: vBtmY, z: zFront });
        const pVisorBL = project({ x: -vW + 14, y: vBtmY, z: zFront });
        const pVisorBtmMid = project({ x: 0, y: vBtmY + 2, z: zFront });

        const visorGrad = ctx.createLinearGradient(pVisorTL.x, pVisorTL.y, pVisorBR.x, pVisorBR.y);
        visorGrad.addColorStop(0, "#080a10");
        visorGrad.addColorStop(0.5, "#040508");
        visorGrad.addColorStop(1, "#020204");

        ctx.fillStyle = visorGrad;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pVisorTL.x, pVisorTL.y);
        ctx.quadraticCurveTo(pVisorTopMid.x, pVisorTopMid.y, pVisorTR.x, pVisorTR.y);
        ctx.lineTo(pVisorBR.x, pVisorBR.y);
        ctx.quadraticCurveTo(pVisorBtmMid.x, pVisorBtmMid.y, pVisorBL.x, pVisorBL.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Curved Glossy Glass Specular Sheen across upper visor
        const pSheenL = project({ x: -vW + 18, y: vTopY + 5, z: zFront });
        const pSheenR = project({ x: vW - 18, y: vTopY + 7, z: zFront });
        const pSheenMid = project({ x: 0, y: vTopY + 4, z: zFront });
        ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(pSheenL.x, pSheenL.y);
        ctx.quadraticCurveTo(pSheenMid.x, pSheenMid.y, pSheenR.x, pSheenR.y);
        ctx.stroke();

        // Side Pods (Headphones Earcups with Dynamic Audio Equalizer Rings)
        if (characterStyle !== "eve_android") {
          [-1, 1].forEach((side) => {
            const earcupCenter = project({ x: side * 68, y: -2, z: 0 });
            const earcupOuter = project({ x: side * 76, y: -2, z: 0 });
            const radius = 17;

            // Earcup base housing
            ctx.fillStyle = isWhiteCeramic ? "#1e293b" : "#151924";
            ctx.strokeStyle = isWhiteCeramic ? "#2563eb" : "rgba(255, 255, 255, 0.18)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(earcupCenter.x, earcupCenter.y, radius * 0.65, radius, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Audio Equalizer Ring pulsing with speech/voice volume
            const pulseBoost = side === 1 ? smoothAiVolume * 6 : smoothUserVolume * 6;
            ctx.strokeStyle = isWhiteCeramic ? "#00f0ff" : accentColor;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.ellipse(earcupOuter.x, earcupOuter.y, (radius * 0.45) + pulseBoost * 0.5, (radius * 0.72) + pulseBoost, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Center indicator led
            ctx.fillStyle = isWhiteCeramic ? "#00f0ff" : accentColor;
            ctx.beginPath();
            ctx.arc(earcupOuter.x, earcupOuter.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }

      // --- 7. ROUND ("GOL GOL") CUTE EXPRESSIVE EYES WITH BLINKING & EYEBROWS ---
      const drawCuteEye = (isRight: boolean) => {
        const sideMult = isRight ? 1 : -1;
        const eyeCenter3D: Point3D = {
          x: (36 * sideMult) + (gazeX * 4),
          y: -14 + (gazeY * 3),
          z: 28,
        };

        // Round Eye Radius ("gol gol")
        const baseRadius = (mood === "scolded" || mood === "baby_pout") 
          ? 18 
          : 15;
        const radiusX = baseRadius;
        const radiusY = baseRadius * currentEyeScaleY * listeningEyeNarrow;

        ctx.fillStyle = primaryColor;
        ctx.strokeStyle = primaryColor;

        if (mood === "laughing") {
          // Hearty Laughing Arches (◠  ◠)
          const arcStart = project({ x: eyeCenter3D.x - radiusX - 2, y: eyeCenter3D.y + 2, z: eyeCenter3D.z });
          const arcMid = project({ x: eyeCenter3D.x, y: eyeCenter3D.y - 10, z: eyeCenter3D.z });
          const arcEnd = project({ x: eyeCenter3D.x + radiusX + 2, y: eyeCenter3D.y + 2, z: eyeCenter3D.z });

          ctx.lineWidth = 5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(arcStart.x, arcStart.y);
          ctx.quadraticCurveTo(arcMid.x, arcMid.y, arcEnd.x, arcEnd.y);
          ctx.stroke();
        } else if (currentEyeScaleY <= 0.2) {
          // Closed sleeping/blinking eye (Smooth curved line ◡)
          const arcStart = project({ x: eyeCenter3D.x - radiusX, y: eyeCenter3D.y, z: eyeCenter3D.z });
          const arcMid = project({ x: eyeCenter3D.x, y: eyeCenter3D.y + 4, z: eyeCenter3D.z });
          const arcEnd = project({ x: eyeCenter3D.x + radiusX, y: eyeCenter3D.y, z: eyeCenter3D.z });

          ctx.lineWidth = 4.5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(arcStart.x, arcStart.y);
          ctx.quadraticCurveTo(arcMid.x, arcMid.y, arcEnd.x, arcEnd.y);
          ctx.stroke();
        } else {
          // Pure Round Eye ("Gol Gol" Circle)
          const centerPos = project(eyeCenter3D);

          ctx.save();
          if (characterStyle !== "minimal") {
            ctx.shadowColor = accentColor;
            ctx.shadowBlur = 8;
          }
          ctx.beginPath();
          ctx.ellipse(centerPos.x, centerPos.y, radiusX, radiusY, 0, 0, Math.PI * 2);
          ctx.fillStyle = primaryColor;
          ctx.fill();
          ctx.restore();

          // High-tech Specular Glint Reflection on eye pupil
          if (characterStyle !== "minimal") {
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(centerPos.x - radiusX * 0.35, centerPos.y - radiusY * 0.35, Math.max(2, radiusX * 0.26), 0, Math.PI * 2);
            ctx.fill();
          }

          // Cute pleading puppy-dog eye sparkle for baby_pout / scolded mood!
          if (mood === "scolded" || mood === "baby_pout") {
            ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
            ctx.beginPath();
            ctx.arc(centerPos.x + 3, centerPos.y - 3, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // --- EXPRESSIVE EMOJI EYEBROWS POSITIONED HIGH ABOVE EYES ---
        if (connectionState !== "disconnected") {
          const asymOffset = (!isRight ? currentBrowAsymmetry : -currentBrowAsymmetry * 0.3);
          const browY = eyeCenter3D.y - 26 + currentEyeBrowY - asymOffset; // High above eyes ("ektu upor dike thakbe")
          const tiltMult = isRight ? -1 : 1;
          const slantOffset = currentBrowAngle * 14 * tiltMult;

          const browL = project({ x: eyeCenter3D.x - 16, y: browY - slantOffset + 2, z: 28 });
          const browR = project({ x: eyeCenter3D.x + 16, y: browY + slantOffset + 2, z: 28 });
          // Arched middle apex for rounded/curved emoji eyebrows ("ektu round")
          const browMid = project({ x: eyeCenter3D.x, y: browY - currentBrowArch - (slantOffset * 0.15), z: 28 });

          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = 4.5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(browL.x, browL.y);
          ctx.quadraticCurveTo(browMid.x, browMid.y, browR.x, browR.y);
          ctx.stroke();
        }
      };

      drawCuteEye(false); // Left Eye
      drawCuteEye(true);  // Right Eye

      // --- 7. CARTOON EMOJI ROSY CHEEK BLUSH (Cute Anime / Emoji Expressions) ---
      if (connectionState !== "disconnected" && (mood === "happy" || mood === "excited" || mood === "laughing" || mood === "scolded" || mood === "baby_pout" || mood === "supportive")) {
        const blushY = 4 + (gazeY * 2);
        const blushL = project({ x: -42 + (gazeX * 3), y: blushY, z: 28 });
        const blushR = project({ x: 42 + (gazeX * 3), y: blushY, z: 28 });
        
        ctx.fillStyle = "rgba(255, 115, 165, 0.42)";
        ctx.beginPath();
        ctx.ellipse(blushL.x, blushL.y, 11, 6, -0.08, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(blushR.x, blushR.y, 11, 6, 0.08, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- 8. EXPRESSIVE CARTOON MOUTH & DYNAMIC LIP-SYNC VISMES ANIMATION ---
      const mouthY = 22 + (gazeY * 2);

      // Dynamic corner vertical offset (corners raise up for smile, lower for sad/angry/pout)
      let cornerYOffset = -currentSmileRatio * 5.5; // Negative Y moves up in 3D (smile corner lift)
      if (mood === "angry") {
        cornerYOffset = 6.5; // Corners droop down
      } else if (mood === "scolded" || mood === "baby_pout") {
        cornerYOffset = 4.5; // Pouting corners
      }

      // Human speech phoneme & viseme articulation simulation (A, O, E, I, U, M, P)
      // Natural 4-7Hz syllabic rhythm modulation
      const syllableRhythm = Math.sin(t * 16.0) * 0.5 + Math.sin(t * 8.5) * 0.3;
      const phonemeWidthMod = connectionState === "speaking" 
        ? Math.cos(t * 14.0) * 6.5 * Math.min(1, smoothAiVolume * 3.5) 
        : 0;
      
      const baseSmileWidth = 22 + (currentSmileRatio * 8);
      const speechWidthMod = connectionState === "speaking" 
        ? (smoothAiVolume * 22 + phonemeWidthMod)
        : 0;
      
      const smileWidth = Math.max(14, baseSmileWidth + speechWidthMod);

      const mouthL = project({ x: -smileWidth, y: mouthY + cornerYOffset, z: 28 });
      const mouthR = project({ x: smileWidth, y: mouthY + cornerYOffset, z: 28 });
      
      let arcDepth = 8.5 + (currentSmileRatio * 8.5);
      if (mood === "angry") {
        arcDepth = -9.0; // Inverted arc for anger
      } else if (mood === "scolded" || mood === "baby_pout") {
        arcDepth = -4.5; // Cute pouting lip
      }

      if (currentMouthHeight > 0.8) {
        // --- SCULPTED CARTOON OPEN SPEECH MOUTH (Anatomical Cupid's Bow + Dynamic Phonemes) ---
        const topLipRaise = currentMouthHeight * 0.18;
        const bottomLipDrop = Math.max(5.5, arcDepth * 0.3) + (currentMouthHeight * 0.92);

        // Cupid's bow anatomical coordinates for upper lip
        const cupidPeakLX = -smileWidth * 0.36;
        const cupidPeakRX = smileWidth * 0.36;
        const cupidDipY = mouthY + cornerYOffset - topLipRaise * 0.75;
        const cupidPeakY = mouthY + cornerYOffset - topLipRaise * 1.15;

        const pCupidL = project({ x: cupidPeakLX, y: cupidPeakY, z: 28 });
        const pCupidCenter = project({ x: 0, y: cupidDipY, z: 28 });
        const pCupidR = project({ x: cupidPeakRX, y: cupidPeakY, z: 28 });
        const mouthBottomMid = project({ x: 0, y: mouthY + cornerYOffset + bottomLipDrop, z: 28 });

        // Outer lip border & fill with refined anatomical upper lip
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.moveTo(mouthL.x, mouthL.y);
        ctx.quadraticCurveTo((mouthL.x + pCupidL.x) * 0.5, (mouthL.y + pCupidL.y) * 0.5, pCupidL.x, pCupidL.y);
        ctx.quadraticCurveTo((pCupidL.x + pCupidCenter.x) * 0.5, (pCupidL.y + pCupidCenter.y) * 0.5, pCupidCenter.x, pCupidCenter.y);
        ctx.quadraticCurveTo((pCupidCenter.x + pCupidR.x) * 0.5, (pCupidCenter.y + pCupidR.y) * 0.5, pCupidR.x, pCupidR.y);
        ctx.quadraticCurveTo((pCupidR.x + mouthR.x) * 0.5, (pCupidR.y + mouthR.y) * 0.5, mouthR.x, mouthR.y);
        ctx.quadraticCurveTo(mouthBottomMid.x, mouthBottomMid.y, mouthL.x, mouthL.y);
        ctx.closePath();
        ctx.fill();

        // Inner dark cartoon mouth cavity (perfectly nested with soft depth)
        if (currentMouthHeight > 2.2) {
          const cavityTopY = mouthY + cornerYOffset + 1.2;
          const cavityBottomY = mouthY + cornerYOffset + bottomLipDrop - 2.2;

          const innerTop = project({ x: 0, y: cavityTopY, z: 28 });
          const innerBottom = project({ x: 0, y: cavityBottomY, z: 28 });
          const innerL = project({ x: -(smileWidth - 3.5), y: cavityTopY, z: 28 });
          const innerR = project({ x: (smileWidth - 3.5), y: cavityTopY, z: 28 });

          ctx.fillStyle = "rgba(12, 12, 28, 0.72)";
          ctx.beginPath();
          ctx.moveTo(innerL.x, innerL.y);
          ctx.quadraticCurveTo(innerTop.x, innerTop.y, innerR.x, innerR.y);
          ctx.quadraticCurveTo(innerBottom.x, innerBottom.y, innerL.x, innerL.y);
          ctx.closePath();
          ctx.fill();

          // Crisp upper pearlescent teeth band when opening wide
          if (currentMouthHeight > 5.5) {
            const teethTop = project({ x: 0, y: cavityTopY, z: 28 });
            const teethBottom = project({ x: 0, y: cavityTopY + Math.min(5.2, currentMouthHeight * 0.38), z: 28 });
            const teethL = project({ x: -(smileWidth * 0.50), y: cavityTopY + 0.8, z: 28 });
            const teethR = project({ x: (smileWidth * 0.50), y: cavityTopY + 0.8, z: 28 });

            ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
            ctx.beginPath();
            ctx.moveTo(teethL.x, teethL.y);
            ctx.quadraticCurveTo(teethTop.x, teethTop.y, teethR.x, teethR.y);
            ctx.quadraticCurveTo(teethBottom.x, teethBottom.y, teethL.x, teethL.y);
            ctx.closePath();
            ctx.fill();
          }

          // Soft pink organic tongue (Jihoba) with gentle speech elevation
          if (currentMouthHeight > 4.0) {
            const tongueElevation = (syllableRhythm + 0.5) * 1.5;
            const tongueHeight = Math.min(cavityBottomY - cavityTopY - 1.8, 3.2 + currentMouthHeight * 0.40 + tongueElevation);
            const tongueTopY = cavityBottomY - tongueHeight;

            const tongueTop = project({ x: 0, y: tongueTopY, z: 28 });
            const tongueBottom = project({ x: 0, y: cavityBottomY - 0.6, z: 28 });
            const tongueL = project({ x: -(smileWidth * 0.38), y: cavityBottomY - 1.0, z: 28 });
            const tongueR = project({ x: (smileWidth * 0.38), y: cavityBottomY - 1.0, z: 28 });

            ctx.fillStyle = "rgba(255, 115, 155, 0.94)";
            ctx.beginPath();
            ctx.moveTo(tongueL.x, tongueL.y);
            ctx.quadraticCurveTo(tongueTop.x, tongueTop.y, tongueR.x, tongueR.y);
            ctx.quadraticCurveTo(tongueBottom.x, tongueBottom.y, tongueL.x, tongueL.y);
            ctx.closePath();
            ctx.fill();
          }
        }

        // Cute attached lip corner dimple accents (positioned right at mouth corners)
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2.8;
        ctx.lineCap = "round";

        const dimpleL1 = project({ x: -smileWidth - 1.6, y: mouthY + cornerYOffset - 2.5, z: 28 });
        const dimpleL2 = project({ x: -smileWidth + 0.6, y: mouthY + cornerYOffset + 2.5, z: 28 });
        ctx.beginPath();
        ctx.moveTo(dimpleL1.x, dimpleL1.y);
        ctx.lineTo(dimpleL2.x, dimpleL2.y);
        ctx.stroke();

        const dimpleR1 = project({ x: smileWidth + 1.6, y: mouthY + cornerYOffset - 2.5, z: 28 });
        const dimpleR2 = project({ x: smileWidth - 0.6, y: mouthY + cornerYOffset + 2.5, z: 28 });
        ctx.beginPath();
        ctx.moveTo(dimpleR1.x, dimpleR1.y);
        ctx.lineTo(dimpleR2.x, dimpleR2.y);
        ctx.stroke();

      } else {
        // --- CLOSED EXPRESSIVE CARTOON LIP LINE (Soft Cupid's Bow Curve) ---
        const mouthMid = project({ x: 0, y: mouthY + cornerYOffset + arcDepth, z: 28 });

        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 4.5;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(mouthL.x, mouthL.y);
        ctx.quadraticCurveTo(mouthMid.x, mouthMid.y, mouthR.x, mouthR.y);
        ctx.stroke();

        // Cute attached lip corner dimples for closed mouth
        ctx.lineWidth = 2.8;
        const dimpleL1 = project({ x: -smileWidth - 1.6, y: mouthY + cornerYOffset - 2.0, z: 28 });
        const dimpleL2 = project({ x: -smileWidth + 0.6, y: mouthY + cornerYOffset + 2.0, z: 28 });
        ctx.beginPath();
        ctx.moveTo(dimpleL1.x, dimpleL1.y);
        ctx.lineTo(dimpleL2.x, dimpleL2.y);
        ctx.stroke();

        const dimpleR1 = project({ x: smileWidth + 1.6, y: mouthY + cornerYOffset - 2.0, z: 28 });
        const dimpleR2 = project({ x: smileWidth - 0.6, y: mouthY + cornerYOffset + 2.0, z: 28 });
        ctx.beginPath();
        ctx.moveTo(dimpleR1.x, dimpleR1.y);
        ctx.lineTo(dimpleR2.x, dimpleR2.y);
        ctx.stroke();
      }

      // --- 10. CLEAN HOVER EFFECT (NO CIRCLES) ---

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [connectionState, userVolume, aiVolume, mood, isHovered, cursorPos, isMirrorMode, faceMirrorData, characterStyle]);

  // Smooth scaling animations
  const getAvatarStyles = () => {
    switch (connectionState) {
      case "disconnected":
        return {
          scale: isHovered ? 1.03 : 1.0,
        };
      case "connecting":
        return {
          scale: [1.0, 1.02, 1.0],
          transition: { repeat: Infinity, duration: 2.2, ease: "easeInOut" },
        };
      case "listening":
        return {
          scale: 1.02 + userVolume * 0.08,
        };
      case "speaking":
        return {
          scale: 1.03 + aiVolume * 0.1,
        };
      case "thinking":
        return {
          scale: [1.0, 1.035, 1.0],
          transition: { repeat: Infinity, duration: 2.2, ease: "easeInOut" },
        };
    }
  };

  return (
    <div 
      className="relative flex flex-col items-center justify-center select-none pt-4 pb-4 transition-transform duration-200 ease-out"
      style={{
        transform: `translate(${avatarOffsetX}px, ${avatarOffsetY}px) scale(${avatarScale})`,
      }}
    >
       {/* Main interactive avatar container button */}
       <motion.button
         id="tune-ai-avatar-core"
         onClick={onClick}
         onMouseEnter={() => setIsHovered(true)}
         onMouseLeave={() => setIsHovered(false)}
         animate={getAvatarStyles() as any}
         whileTap={{ scale: 0.97 }}
         style={{ width: size, height: size }}
         className="relative rounded-3xl flex flex-col items-center justify-center cursor-pointer outline-none transition-all duration-500 z-10"
       >
         {/* 3D Render Canvas */}
         <div className="absolute inset-0 rounded-3xl overflow-hidden flex items-center justify-center pointer-events-none">
           <canvas ref={canvasRef} style={{ width: size, height: size }} />
         </div>
       </motion.button>

       {/* Quick Interactive Character Design Switcher */}
       <motion.button
         whileHover={{ scale: 1.05 }}
         whileTap={{ scale: 0.95 }}
         onClick={(e) => {
           e.stopPropagation();
           cycleCharacterDesign();
         }}
         className="mt-2.5 px-3 py-1 bg-zinc-950/80 hover:bg-zinc-900/90 border border-white/10 hover:border-cyan-500/40 rounded-full text-[11px] font-mono text-white/70 hover:text-white transition flex items-center gap-1.5 shadow-lg cursor-pointer z-20 backdrop-blur-md"
         title="Click to Switch Character Design (Astro Bot, EVE Android, Cyber Bot, Mecha Neko, Celestial Core, Minimal Face)"
       >
         <Sparkles className="w-3 h-3 text-cyan-400" />
         <span className="text-white/40">Character:</span>
         <span className="font-semibold text-cyan-300">
           {characterStyle === "astro_bot"
             ? "Astro Bot 🚀"
             : characterStyle === "eve_android"
             ? "EVE Android ✨"
             : characterStyle === "cyber_bot"
             ? "Cyber Bot 🤖"
             : characterStyle === "mecha_neko"
             ? "Mecha Neko 🐱"
             : characterStyle === "celestial_core"
             ? "Celestial Core 🔮"
             : "Minimal Face ✨"}
         </span>
         <RefreshCw className="w-2.5 h-2.5 text-white/40 ml-0.5" />
       </motion.button>
    </div>
  );
};
export default AIAvatar;
