import React, { useEffect, useRef } from "react";
import { ConnectionState } from "../types";

interface WaveVisualizerProps {
  connectionState: ConnectionState;
  userVolume: number;
  aiVolume: number;
  userFrequencies?: number[];
  aiFrequencies?: number[];
  isMuted?: boolean;
  onClick?: () => void;
  onDoubleTap?: () => void;
  sensitivity?: number;
  onSensitivityChange?: (newVal: number) => void;
  rotationDeg?: number;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}

interface WaterRipple {
  id: number;
  x: number;
  y: number;
  startTime: number;
  duration: number;
  speed: number;
  wavelength: number;
  strength: number;
}

/**
 * Quintic Smoothstep (Hermite-5 interpolation)
 * Provides C2 continuity (zero velocity and zero acceleration at endpoints).
 * Eliminates all jerky transitions, visual pops, and sudden speed changes.
 */
function smoothstep5(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return c * c * c * (c * (c * 6 - 15) + 10);
}

/**
 * Pure Web Audio synthesized sci-fi boot / wake chime
 */
function playWakeSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const now = ctx.currentTime;

    // Tone 1: Warm fundamental (D5 -> A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.16);

    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.linearRampToValueAtTime(0.24, now + 0.035);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.65);

    // Tone 2: Shimmering overtone (A5 -> D6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880.0, now + 0.07);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.22);

    gain2.gain.setValueAtTime(0.0001, now + 0.07);
    gain2.gain.linearRampToValueAtTime(0.18, now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.07);
    osc2.stop(now + 0.75);

    // Tone 3: Deep tactile resonant pulse
    const oscSub = ctx.createOscillator();
    const gainSub = ctx.createGain();
    oscSub.type = "sine";
    oscSub.frequency.setValueAtTime(140, now);
    oscSub.frequency.exponentialRampToValueAtTime(68, now + 0.15);

    gainSub.gain.setValueAtTime(0.0001, now);
    gainSub.gain.linearRampToValueAtTime(0.2, now + 0.02);
    gainSub.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    oscSub.connect(gainSub);
    gainSub.connect(ctx.destination);
    oscSub.start(now);
    oscSub.stop(now + 0.3);
  } catch (e) {
    console.warn("Wake sound synth warning:", e);
  }
}

/**
 * Gentle power-off / sleep tone
 */
function playSleepSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.26);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  } catch (e) {
    console.warn("Sleep sound synth warning:", e);
  }
}

export const WaveVisualizer: React.FC<WaveVisualizerProps> = ({
  connectionState,
  userVolume,
  aiVolume,
  userFrequencies,
  aiFrequencies,
  isMuted = false,
  onClick,
  onDoubleTap,
  sensitivity = 65,
  rotationDeg = 0,
  scale = 1,
  offsetX = 0,
  offsetY = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Exponential audio smoothing
  const smoothedAiVol = useRef<number>(0);
  const smoothedUserVol = useRef<number>(0);

  // Lifecycle states
  const wakeState = useRef<"dormant" | "waking" | "awake" | "sleeping">(
    connectionState === "disconnected" ? "dormant" : "awake"
  );
  const wakeProgress = useRef<number>(connectionState === "disconnected" ? 0 : 1);
  const sleepProgress = useRef<number>(0);

  // Double-tap tracking
  const lastTapTimeRef = useRef<number>(0);

  // Morphing between line/wave and mouth/lips
  const aiLipMorph = useRef<number>(0);
  const speechClock = useRef<number>(0);
  const currentOpenness = useRef<number>(0);
  const currentSpread = useRef<number>(1.0);
  const currentSmile = useRef<number>(0);

  // Smooth wave phases for user speech & idle
  const primaryWavePhase = useRef<number>(0);
  const secondaryWavePhase = useRef<number>(0);
  const waveAmpSmoothed = useRef<number>(0);
  const idleBreathPhase = useRef<number>(0);
  const thinkingPulse = useRef<number>(0);

  const animFrameId = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());

  // Water ripples
  const waterRipples = useRef<WaterRipple[]>([]);

  // Tap handler with Double-Tap to Sleep / Turn Off
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const tapX = (e.clientX - rect.left) * dpr;
      const tapY = (e.clientY - rect.top) * dpr;

      // Always spawn soft water ripples on surface touch
      waterRipples.current.push({
        id: Math.random(),
        x: tapX,
        y: tapY,
        startTime: performance.now(),
        duration: 2.2,
        speed: 280 * dpr,
        wavelength: 40 * dpr,
        strength: 0.9,
      });

      if (waterRipples.current.length > 6) {
        waterRipples.current.shift();
      }
    }

    const now = performance.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;

    // DETECT DOUBLE-TAP (within 400ms)
    if (timeSinceLastTap > 30 && timeSinceLastTap < 400) {
      lastTapTimeRef.current = 0; // Reset
      
      // If currently awake or active: DOUBLE TAP TURNS TUNE OFF
      if (connectionState !== "disconnected" || wakeState.current === "awake" || wakeState.current === "waking") {
        playSleepSound();
        wakeState.current = "sleeping";
        sleepProgress.current = 0.0;
        if (onDoubleTap) {
          onDoubleTap();
        } else if (onClick) {
          onClick();
        }
        return;
      }
    }

    // First tap of a sequence
    lastTapTimeRef.current = now;

    if (wakeState.current === "dormant" || wakeState.current === "sleeping" || connectionState === "disconnected") {
      // Single tap while dormant/disconnected: wake up
      playWakeSound();
      wakeState.current = "waking";
      wakeProgress.current = 0.0;
      if (onClick) onClick();
    } else if (connectionState === "speaking") {
      // Single tap while AI is speaking: triggers quick speech interrupt
      if (onClick) onClick();
    }
  };

  // Sync connectionState transitions
  useEffect(() => {
    if (connectionState === "disconnected") {
      if (wakeState.current === "awake" || wakeState.current === "waking") {
        playSleepSound();
        wakeState.current = "sleeping";
        sleepProgress.current = 0.0;
      }
    } else {
      if (wakeState.current === "dormant" || wakeState.current === "sleeping") {
        playWakeSound();
        wakeState.current = "waking";
        wakeProgress.current = 0.0;
      }
    }
  }, [connectionState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isRunning = true;

    const handleResize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    /**
     * Compute Hann-windowed physical water wave vertical displacement.
     */
    const computeWaterDisplacement = (
      px: number,
      py: number,
      currentTime: number,
      dpr: number
    ): number => {
      let totalDisp = 0;
      for (const ripple of waterRipples.current) {
        const age = (currentTime - ripple.startTime) / 1000;
        if (age < 0 || age >= ripple.duration) continue;

        const progress = age / ripple.duration;
        const waveRadius = age * ripple.speed;
        const decay = Math.pow(1 - progress, 2.2);

        const dx = px - ripple.x;
        const dy = py - ripple.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const packetWidth = ripple.wavelength * 3.2;
        const distFromFront = waveRadius - dist;

        if (distFromFront >= 0 && distFromFront <= packetWidth) {
          const normDist = distFromFront / packetWidth;
          const hann = 0.5 * (1 - Math.cos(2 * Math.PI * normDist));
          const wavePhase = (distFromFront / ripple.wavelength) * Math.PI * 2;
          const amp = 8.0 * dpr * decay * ripple.strength * hann;
          totalDisp += Math.sin(wavePhase) * amp;
        }
      }
      return totalDisp;
    };

    const render = (now: number) => {
      if (!isRunning) return;

      const dt = Math.min(0.033, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.width;
      const height = canvas.height;
      const cx = width * 0.5 + offsetX * dpr;
      const cy = height * 0.5 + offsetY * dpr;

      // 1. PURE OLED PITCH BLACK BACKGROUND
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // Clean up expired ripples
      waterRipples.current = waterRipples.current.filter(
        (r) => (now - r.startTime) / 1000 < r.duration
      );

      // =========================================================================
      // SOFT WATER RIPPLE RENDERING (DEEP VELVETY BLACK LIQUID RINGS)
      // =========================================================================
      for (const ripple of waterRipples.current) {
        const age = (now - ripple.startTime) / 1000;
        if (age >= ripple.duration) continue;
        const progress = age / ripple.duration;
        const waveRadius = age * ripple.speed;
        const decay = Math.pow(1 - progress, 2.4);

        for (let crestIdx = 0; crestIdx < 2; crestIdx++) {
          const r = waveRadius - crestIdx * ripple.wavelength;
          if (r <= 3 * dpr) continue;

          const ringWeight = Math.max(0, 1 - crestIdx * 0.35);
          const highlightAlpha = 0.09 * decay * ringWeight;

          ctx.save();
          ctx.beginPath();
          ctx.arc(ripple.x, ripple.y, r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${highlightAlpha})`;
          ctx.lineWidth = 1.4 * dpr;
          ctx.shadowColor = `rgba(255, 255, 255, ${highlightAlpha * 0.7})`;
          ctx.shadowBlur = 6 * dpr;
          ctx.stroke();
          ctx.restore();
        }
      }

      // =========================================================================
      // STATE 1: DORMANT (PURO SCREEN BLACK)
      // =========================================================================
      if (wakeState.current === "dormant") {
        animFrameId.current = requestAnimationFrame(render);
        return;
      }

      // Base dimensions
      const baseHalfWidth = Math.min(width * 0.42, 170 * dpr) * scale * currentSpread.current;
      const numPoints = 160;

      // =========================================================================
      // STATE 2: WAKING (DOT POP ➔ HORIZONTAL LINE)
      // =========================================================================
      if (wakeState.current === "waking") {
        wakeProgress.current += dt / 0.82;
        const wp = Math.min(1.0, wakeProgress.current);

        const dotProgress = Math.min(1.0, wp / 0.28);
        const dotScale = smoothstep5(dotProgress);

        const stretchProgress = Math.max(0, Math.min(1.0, (wp - 0.20) / 0.80));
        const stretchEase = smoothstep5(stretchProgress);

        const currentHalfSpan = baseHalfWidth * stretchEase;
        const startX = cx - currentHalfSpan;
        const endX = cx + currentHalfSpan;
        const currentThickness = (6.0 * (1 - stretchEase) + 2.2 * stretchEase) * dpr * dotScale;

        if (stretchEase < 0.95) {
          const glowAlpha = 0.85 * (1 - stretchEase * 0.7) * dotScale;
          const glowRadius = (15 * dotScale + 10 * (1 - stretchEase)) * dpr;
          const dotWaterDisp = computeWaterDisplacement(cx, cy, now, dpr);

          ctx.save();
          const radialGrad = ctx.createRadialGradient(
            cx,
            cy + dotWaterDisp,
            0,
            cx,
            cy + dotWaterDisp,
            glowRadius
          );
          radialGrad.addColorStop(0, `rgba(255, 255, 255, ${glowAlpha})`);
          radialGrad.addColorStop(0.4, `rgba(255, 255, 255, ${glowAlpha * 0.5})`);
          radialGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx.fillStyle = radialGrad;
          ctx.beginPath();
          ctx.arc(cx, cy + dotWaterDisp, glowRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.save();
        const lineGrad = ctx.createLinearGradient(startX, 0, endX, 0);
        lineGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
        lineGrad.addColorStop(0.15, `rgba(255, 255, 255, ${0.85 * dotScale})`);
        lineGrad.addColorStop(0.5, `rgba(255, 255, 255, ${1.0 * dotScale})`);
        lineGrad.addColorStop(0.85, `rgba(255, 255, 255, ${0.85 * dotScale})`);
        lineGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.beginPath();
        const stepX = (currentHalfSpan * 2) / (numPoints - 1);
        for (let i = 0; i < numPoints; i++) {
          const px = startX + i * stepX;
          const waterDisp = computeWaterDisplacement(px, cy, now, dpr);
          const py = cy + waterDisp;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }

        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = Math.max(0.5, currentThickness);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = "rgba(255, 255, 255, 0.95)";
        ctx.shadowBlur = (8 + (1 - stretchEase) * 12) * dpr * dotScale;
        ctx.stroke();
        ctx.restore();

        if (wp >= 1.0) {
          wakeState.current = "awake";
        }

        animFrameId.current = requestAnimationFrame(render);
        return;
      }

      // =========================================================================
      // STATE 3: SLEEPING (LINE ➔ DOT ➔ FADE)
      // =========================================================================
      if (wakeState.current === "sleeping") {
        sleepProgress.current += dt / 0.80;
        const sp = Math.min(1.0, sleepProgress.current);

        const contractProgress = Math.min(1.0, sp / 0.75);
        const contractEase = 1 - smoothstep5(contractProgress);

        const fadeProgress = Math.max(0, Math.min(1.0, (sp - 0.65) / 0.35));
        const dotScale = 1 - smoothstep5(fadeProgress);

        const currentHalfSpan = baseHalfWidth * contractEase;
        const startX = cx - currentHalfSpan;
        const endX = cx + currentHalfSpan;
        const currentThickness = (6.0 * (1 - contractEase) + 2.2 * contractEase) * dpr * dotScale;

        if (contractEase < 0.95 && dotScale > 0.01) {
          const glowAlpha = 0.85 * (1 - contractEase * 0.7) * dotScale;
          const glowRadius = (15 * dotScale + 8 * (1 - contractEase)) * dpr;
          const dotWaterDisp = computeWaterDisplacement(cx, cy, now, dpr);

          ctx.save();
          const radialGrad = ctx.createRadialGradient(
            cx,
            cy + dotWaterDisp,
            0,
            cx,
            cy + dotWaterDisp,
            glowRadius
          );
          radialGrad.addColorStop(0, `rgba(255, 255, 255, ${glowAlpha})`);
          radialGrad.addColorStop(0.4, `rgba(255, 255, 255, ${glowAlpha * 0.5})`);
          radialGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx.fillStyle = radialGrad;
          ctx.beginPath();
          ctx.arc(cx, cy + dotWaterDisp, glowRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        if (dotScale > 0.005) {
          ctx.save();
          const lineGrad = ctx.createLinearGradient(startX, 0, endX, 0);
          lineGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
          lineGrad.addColorStop(0.15, `rgba(255, 255, 255, ${0.85 * dotScale})`);
          lineGrad.addColorStop(0.5, `rgba(255, 255, 255, ${1.0 * dotScale})`);
          lineGrad.addColorStop(0.85, `rgba(255, 255, 255, ${0.85 * dotScale})`);
          lineGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

          ctx.beginPath();
          const stepX = (currentHalfSpan * 2) / (numPoints - 1);
          for (let i = 0; i < numPoints; i++) {
            const px = startX + i * stepX;
            const waterDisp = computeWaterDisplacement(px, cy, now, dpr);
            const py = cy + waterDisp;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }

          ctx.strokeStyle = lineGrad;
          ctx.lineWidth = Math.max(0.5, currentThickness);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
          ctx.shadowBlur = (6 + (1 - contractEase) * 10) * dpr * dotScale;
          ctx.stroke();
          ctx.restore();
        }

        if (sp >= 1.0) {
          wakeState.current = "dormant";
        }

        animFrameId.current = requestAnimationFrame(render);
        return;
      }

      // =========================================================================
      // STATE 4: ACTIVE & AWAKE
      // =========================================================================
      const targetAi = Math.max(0, Math.min(1, aiVolume));
      const targetUser = isMuted ? 0 : Math.max(0, Math.min(1, userVolume));

      // Damped exponential audio smoothing
      smoothedAiVol.current += (targetAi - smoothedAiVol.current) * (1 - Math.exp(-18 * dt));
      smoothedUserVol.current += (targetUser - smoothedUserVol.current) * (1 - Math.exp(-14 * dt));

      const aiV = smoothedAiVol.current;
      const userV = smoothedUserVol.current;

      const isAiSpeaking = aiV > 0.012 || connectionState === "speaking";
      const isUserSpeaking = !isAiSpeaking && userV > 0.015;
      const isThinking = connectionState === "thinking";

      // -------------------------------------------------------------------------
      // MORPH CONTROLLER: LINE/WAVE <--> SENTIENT MOUTH
      // When AI speaks, targetMorph = 1.0; when user speaks or idle, targetMorph = 0.0
      // -------------------------------------------------------------------------
      const targetMorph = isAiSpeaking ? 1.0 : 0.0;
      aiLipMorph.current += (targetMorph - aiLipMorph.current) * (1 - Math.exp(-15 * dt));
      const morph = aiLipMorph.current;

      // Syllable clock and mouth kinematics
      if (isAiSpeaking) {
        speechClock.current += dt * (3.8 + aiV * 22);
      }
      const clock = speechClock.current;
      const cadence =
        Math.sin(clock * 1.5) * 0.40 +
        Math.cos(clock * 3.2) * 0.24 +
        Math.sin(clock * 5.6) * 0.12 +
        1.15;

      const targetOpen = isAiSpeaking ? Math.max(0.1, aiV * (0.35 + cadence * 0.8)) : 0;
      currentOpenness.current += (targetOpen - currentOpenness.current) * (1 - Math.exp(-22 * dt));

      const targetSpreadVal = isAiSpeaking ? 1.0 + Math.sin(clock * 1.2) * 0.10 * aiV : 1.0;
      currentSpread.current += (targetSpreadVal - currentSpread.current) * (1 - Math.exp(-14 * dt));

      const targetSmileVal = isAiSpeaking ? 0.16 * aiV : 0;
      currentSmile.current += (targetSmileVal - currentSmile.current) * (1 - Math.exp(-10 * dt));

      const openness = currentOpenness.current;
      const apertureH = openness * (68 * dpr) * morph;

      const smileOffset = currentSmile.current * (12 * dpr) * morph;
      const cornerL = { x: cx - baseHalfWidth, y: cy - smileOffset * 0.25 };
      const cornerR = { x: cx + baseHalfWidth, y: cy - smileOffset * 0.25 };

      // Optional user rotation transform
      ctx.save();
      if (rotationDeg !== 0) {
        ctx.translate(cx, cy);
        ctx.rotate((rotationDeg * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      // =========================================================================
      // 4A: AI REPLIES ➔ GLOWING WHITE 2D SENTIENT MOUTH / LIPS ANIMATION
      // =========================================================================
      if (morph >= 0.02) {
        const upperH = apertureH * 0.52;
        const lowerH = apertureH * 0.58;

        const peakX = baseHalfWidth * 0.22;
        const upperDipY = cy - upperH * 0.85;
        const upperPeakY = cy - upperH * 1.05;

        // Clean solid white mouth interior when aperture opens
        if (apertureH > 1.2 * dpr) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(cornerL.x, cornerL.y);
          ctx.bezierCurveTo(
            cx - baseHalfWidth * 0.58,
            upperDipY,
            cx - peakX * 1.2,
            upperPeakY,
            cx - peakX,
            upperPeakY
          );
          ctx.bezierCurveTo(
            cx - peakX * 0.35,
            upperPeakY,
            cx - peakX * 0.15,
            upperDipY,
            cx,
            upperDipY
          );
          ctx.bezierCurveTo(
            cx + peakX * 0.15,
            upperDipY,
            cx + peakX * 0.35,
            upperPeakY,
            cx + peakX,
            upperPeakY
          );
          ctx.bezierCurveTo(
            cx + peakX * 1.2,
            upperPeakY,
            cx + baseHalfWidth * 0.58,
            upperDipY,
            cornerR.x,
            cornerR.y
          );

          const lowerCenterY = cy + lowerH;
          ctx.bezierCurveTo(
            cx + baseHalfWidth * 0.55,
            lowerCenterY,
            cx - baseHalfWidth * 0.55,
            lowerCenterY,
            cornerL.x,
            cornerL.y
          );
          ctx.closePath();

          ctx.fillStyle = `rgba(255, 255, 255, ${0.96 * morph})`;
          ctx.shadowColor = `rgba(255, 255, 255, ${0.6 * morph})`;
          ctx.shadowBlur = 12 * dpr;
          ctx.fill();
          ctx.restore();
        }

        // Clean white lip contours (Cupid's bow upper lip & soft curved lower lip)
        const lipLineWidth = (2.2 + aiV * 1.0) * dpr;
        const lipGlowBlur = (10 + aiV * 16) * dpr;

        const lipLineGrad = ctx.createLinearGradient(cornerL.x, 0, cornerR.x, 0);
        lipLineGrad.addColorStop(0, "rgba(255, 255, 255, 0.0)");
        lipLineGrad.addColorStop(0.12, `rgba(255, 255, 255, ${0.85 * morph})`);
        lipLineGrad.addColorStop(0.5, `rgba(255, 255, 255, ${1.0 * morph})`);
        lipLineGrad.addColorStop(0.88, `rgba(255, 255, 255, ${0.85 * morph})`);
        lipLineGrad.addColorStop(1, "rgba(255, 255, 255, 0.0)");

        // Upper Lip Contour
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cornerL.x, cornerL.y);
        ctx.bezierCurveTo(
          cx - baseHalfWidth * 0.58,
          upperDipY,
          cx - peakX * 1.2,
          upperPeakY,
          cx - peakX,
          upperPeakY
        );
        ctx.bezierCurveTo(
          cx - peakX * 0.35,
          upperPeakY,
          cx - peakX * 0.15,
          upperDipY,
          cx,
          upperDipY
        );
        ctx.bezierCurveTo(
          cx + peakX * 0.15,
          upperDipY,
          cx + peakX * 0.35,
          upperPeakY,
          cx + peakX,
          upperPeakY
        );
        ctx.bezierCurveTo(
          cx + peakX * 1.2,
          upperPeakY,
          cx + baseHalfWidth * 0.58,
          upperDipY,
          cornerR.x,
          cornerR.y
        );
        ctx.strokeStyle = lipLineGrad;
        ctx.lineWidth = lipLineWidth;
        ctx.lineCap = "round";
        ctx.shadowColor = `rgba(255, 255, 255, ${0.95 * morph})`;
        ctx.shadowBlur = lipGlowBlur;
        ctx.stroke();
        ctx.restore();

        // Lower Lip Contour
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cornerL.x, cornerL.y);
        const lowerCenterY = cy + lowerH;
        ctx.bezierCurveTo(
          cx - baseHalfWidth * 0.55,
          lowerCenterY,
          cx + baseHalfWidth * 0.55,
          lowerCenterY,
          cornerR.x,
          cornerR.y
        );
        ctx.strokeStyle = lipLineGrad;
        ctx.lineWidth = lipLineWidth * 1.05;
        ctx.lineCap = "round";
        ctx.shadowColor = `rgba(255, 255, 255, ${0.95 * morph})`;
        ctx.shadowBlur = lipGlowBlur;
        ctx.stroke();
        ctx.restore();
      }

      // =========================================================================
      // 4B: USER SPEAKING / IDLE / LISTENING ➔ ULTRA-SOFT & SMOOTH HARMONIC WAVE
      // (NO JAGGED SPIKES, NO MESSY OVERLAYS, VELVETY ORGANIC WAVES)
      // =========================================================================
      if (morph < 0.98) {
        const waveWeight = 1 - morph;

        // Wave phase progression
        idleBreathPhase.current += dt * 1.6;
        thinkingPulse.current += dt * 3.5;

        const waveSpeed = isUserSpeaking ? (3.2 + userV * 6.5) : 1.2;
        primaryWavePhase.current += dt * waveSpeed;
        secondaryWavePhase.current += dt * (waveSpeed * 0.85);

        const p1 = primaryWavePhase.current;
        const p2 = secondaryWavePhase.current;

        // Target amplitude: soft and organic (capped so it never blows up)
        let targetAmp = 0;
        if (isUserSpeaking) {
          // Soft harmonic wave amplitude proportional to user volume
          targetAmp = Math.min(38 * dpr, (8 + userV * 48) * dpr);
        } else if (isThinking) {
          targetAmp = (4.0 + Math.sin(thinkingPulse.current) * 2.2) * dpr;
        } else {
          // Idle calm line with very subtle living respiration
          targetAmp = 1.6 * dpr;
        }

        waveAmpSmoothed.current += (targetAmp - waveAmpSmoothed.current) * (1 - Math.exp(-14 * dt));
        const amp = waveAmpSmoothed.current;

        const startX = cx - baseHalfWidth;
        const stepX = (baseHalfWidth * 2) / (numPoints - 1);

        // LAYER 1: Soft Harmonic Companion Wave (when user speaks)
        if (isUserSpeaking && amp > 4.0 * dpr) {
          ctx.save();
          ctx.beginPath();
          for (let i = 0; i < numPoints; i++) {
            const px = startX + i * stepX;
            const u = i / (numPoints - 1);

            // Smooth Hann bell envelope (zero at endpoints, C1 continuous)
            const env = 0.5 * (1 - Math.cos(2 * Math.PI * u));
            const envPow = Math.pow(env, 1.3);

            // Soft secondary harmonic
            const h1 = Math.sin(u * Math.PI * 2.2 - p2) * 0.65;
            const h2 = Math.sin(u * Math.PI * 4.2 + p2 * 0.7) * 0.35;
            const waveDisp = (h1 + h2) * (amp * 0.6) * envPow;

            const waterDisp = computeWaterDisplacement(px, cy, now, dpr);
            const py = cy + waveDisp + waterDisp;

            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }

          const secGrad = ctx.createLinearGradient(startX, 0, startX + baseHalfWidth * 2, 0);
          secGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
          secGrad.addColorStop(0.2, `rgba(255, 255, 255, ${0.25 * waveWeight})`);
          secGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.30 * waveWeight})`);
          secGrad.addColorStop(0.8, `rgba(255, 255, 255, ${0.25 * waveWeight})`);
          secGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

          ctx.strokeStyle = secGrad;
          ctx.lineWidth = 1.3 * dpr;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.shadowColor = `rgba(255, 255, 255, ${0.25 * waveWeight})`;
          ctx.shadowBlur = 6 * dpr;
          ctx.stroke();
          ctx.restore();
        }

        // LAYER 2: Primary Core Harmonic Wave (Clean, Soft & Luminescent)
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < numPoints; i++) {
          const px = startX + i * stepX;
          const u = i / (numPoints - 1);

          // Smooth Hann envelope
          const env = 0.5 * (1 - Math.cos(2 * Math.PI * u));
          const envPow = Math.pow(env, 1.2);

          let waveDisp = 0;
          if (amp <= 2.2 * dpr) {
            // Idle calm living breath
            const breath = Math.sin(idleBreathPhase.current + u * Math.PI * 2) * (1.2 * dpr);
            waveDisp = breath * envPow;
          } else {
            // Soft rolling harmonic curves
            const f1 = Math.sin(u * Math.PI * 2.4 + p1) * 0.72;
            const f2 = Math.sin(u * Math.PI * 3.8 - p1 * 0.8) * 0.28;
            waveDisp = (f1 + f2) * amp * envPow;
          }

          const waterDisp = computeWaterDisplacement(px, cy, now, dpr);
          const py = cy + waveDisp + waterDisp;

          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }

        const coreGrad = ctx.createLinearGradient(startX, 0, startX + baseHalfWidth * 2, 0);
        coreGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
        coreGrad.addColorStop(0.12, `rgba(255, 255, 255, ${0.85 * waveWeight})`);
        coreGrad.addColorStop(0.5, `rgba(255, 255, 255, ${1.0 * waveWeight})`);
        coreGrad.addColorStop(0.88, `rgba(255, 255, 255, ${0.85 * waveWeight})`);
        coreGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.strokeStyle = coreGrad;
        ctx.lineWidth = (2.2 + userV * 0.8) * dpr;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = `rgba(255, 255, 255, ${0.9 * waveWeight})`;
        ctx.shadowBlur = (amp > 3 * dpr ? 12 : 6) * dpr;
        ctx.stroke();

        // Soft ambient bloom
        if (amp > 3.5 * dpr) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.14 * waveWeight})`;
          ctx.lineWidth = 4.5 * dpr;
          ctx.shadowBlur = 16 * dpr;
          ctx.stroke();
        }

        ctx.restore();
      }

      ctx.restore();

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animFrameId.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [connectionState, userVolume, aiVolume, isMuted, aiFrequencies, userFrequencies, scale, rotationDeg, offsetX, offsetY]);

  return (
    <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center overflow-hidden select-none cursor-pointer">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        className="absolute inset-0 w-full h-full block z-10 cursor-pointer"
        title="Tap to wake Tune or interact"
      />
    </div>
  );
};

export default WaveVisualizer;
