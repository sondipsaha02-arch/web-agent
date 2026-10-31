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

  // Store continuously changing props in refs to avoid re-triggering canvas effect
  const propsRef = useRef({
    connectionState,
    userVolume,
    aiVolume,
    isMuted,
    sensitivity,
    rotationDeg,
    scale,
    offsetX,
    offsetY,
    onClick,
    onDoubleTap,
  });

  propsRef.current = {
    connectionState,
    userVolume,
    aiVolume,
    isMuted,
    sensitivity,
    rotationDeg,
    scale,
    offsetX,
    offsetY,
    onClick,
    onDoubleTap,
  };

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
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const tapX = (e.clientX - rect.left) * dpr;
      const tapY = (e.clientY - rect.top) * dpr;

      // Soft water ripples on surface touch
      waterRipples.current.push({
        id: Math.random(),
        x: tapX,
        y: tapY,
        startTime: performance.now(),
        duration: 1.8,
        speed: 260 * dpr,
        wavelength: 36 * dpr,
        strength: 0.85,
      });

      if (waterRipples.current.length > 4) {
        waterRipples.current.shift();
      }
    }

    const now = performance.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;

    // DETECT DOUBLE-TAP (within 400ms)
    if (timeSinceLastTap > 30 && timeSinceLastTap < 400) {
      lastTapTimeRef.current = 0; // Reset
      
      // If currently awake or active: DOUBLE TAP TURNS TUNE OFF
      if (
        propsRef.current.connectionState !== "disconnected" ||
        wakeState.current === "awake" ||
        wakeState.current === "waking"
      ) {
        playSleepSound();
        wakeState.current = "sleeping";
        sleepProgress.current = 0.0;
        if (propsRef.current.onDoubleTap) {
          propsRef.current.onDoubleTap();
        } else if (propsRef.current.onClick) {
          propsRef.current.onClick();
        }
        return;
      }
    }

    // First tap of a sequence
    lastTapTimeRef.current = now;

    if (
      wakeState.current === "dormant" ||
      wakeState.current === "sleeping" ||
      propsRef.current.connectionState === "disconnected"
    ) {
      // Single tap while dormant/disconnected: wake up
      playWakeSound();
      wakeState.current = "waking";
      wakeProgress.current = 0.0;
      if (propsRef.current.onClick) propsRef.current.onClick();
    } else if (propsRef.current.connectionState === "speaking") {
      // Single tap while AI is speaking: triggers quick speech interrupt
      if (propsRef.current.onClick) propsRef.current.onClick();
    }
  };

  // Sync connectionState transitions without restarting the render loop
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

  // Main rendering engine - runs permanently with zero teardown stutter
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let isRunning = true;

    const handleResize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    /**
     * Compute Hann-windowed physical water wave vertical displacement.
     * Fast-paths when ripples array is empty!
     */
    const computeWaterDisplacement = (
      px: number,
      py: number,
      currentTime: number,
      dpr: number
    ): number => {
      if (waterRipples.current.length === 0) return 0;

      let totalDisp = 0;
      for (const ripple of waterRipples.current) {
        const age = (currentTime - ripple.startTime) / 1000;
        if (age < 0 || age >= ripple.duration) continue;

        const progress = age / ripple.duration;
        const waveRadius = age * ripple.speed;
        const decay = (1 - progress) * (1 - progress);

        const dx = px - ripple.x;
        const dy = py - ripple.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const packetWidth = ripple.wavelength * 3.0;
        const distFromFront = waveRadius - dist;

        if (distFromFront >= 0 && distFromFront <= packetWidth) {
          const normDist = distFromFront / packetWidth;
          const hann = 0.5 * (1 - Math.cos(2 * Math.PI * normDist));
          const wavePhase = (distFromFront / ripple.wavelength) * Math.PI * 2;
          const amp = 6.0 * dpr * decay * ripple.strength * hann;
          totalDisp += Math.sin(wavePhase) * amp;
        }
      }
      return totalDisp;
    };

    const render = (now: number) => {
      if (!isRunning) return;

      const dt = Math.min(0.033, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = canvas.width;
      const height = canvas.height;
      const currentScale = propsRef.current.scale || 1;
      const cx = width * 0.5 + (propsRef.current.offsetX || 0) * dpr;
      const cy = height * 0.5 + (propsRef.current.offsetY || 0) * dpr;

      // 1. OLED PITCH BLACK BACKGROUND
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // Clean up expired ripples
      if (waterRipples.current.length > 0) {
        waterRipples.current = waterRipples.current.filter(
          (r) => (now - r.startTime) / 1000 < r.duration
        );
      }

      // Render Soft Water Rings
      if (waterRipples.current.length > 0) {
        for (const ripple of waterRipples.current) {
          const age = (now - ripple.startTime) / 1000;
          if (age >= ripple.duration) continue;

          const progress = age / ripple.duration;
          const waveRadius = age * ripple.speed;
          const decay = Math.pow(1 - progress, 2.0);
          const r = waveRadius;

          if (r > 3 * dpr) {
            const highlightAlpha = 0.08 * decay;
            ctx.beginPath();
            ctx.arc(ripple.x, ripple.y, r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${highlightAlpha})`;
            ctx.lineWidth = 1.2 * dpr;
            ctx.stroke();
          }
        }
      }

      // STATE 1: DORMANT
      if (wakeState.current === "dormant") {
        animFrameId.current = requestAnimationFrame(render);
        return;
      }

      // Base dimensions: optimized point count (84 points)
      const baseHalfWidth = Math.min(width * 0.42, 170 * dpr) * currentScale * currentSpread.current;
      const numPoints = 84;

      // STATE 2: WAKING (DOT POP -> HORIZONTAL LINE)
      if (wakeState.current === "waking") {
        wakeProgress.current += dt / 0.75;
        const wp = Math.min(1.0, wakeProgress.current);

        const dotProgress = Math.min(1.0, wp / 0.28);
        const dotScale = smoothstep5(dotProgress);

        const stretchProgress = Math.max(0, Math.min(1.0, (wp - 0.20) / 0.80));
        const stretchEase = smoothstep5(stretchProgress);

        const currentHalfSpan = baseHalfWidth * stretchEase;
        const startX = cx - currentHalfSpan;
        const endX = cx + currentHalfSpan;
        const currentThickness = (5.5 * (1 - stretchEase) + 2.0 * stretchEase) * dpr * dotScale;

        if (stretchEase < 0.95) {
          const glowAlpha = 0.85 * (1 - stretchEase * 0.7) * dotScale;
          const glowRadius = (14 * dotScale + 8 * (1 - stretchEase)) * dpr;
          const dotWaterDisp = computeWaterDisplacement(cx, cy, now, dpr);

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
        }

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
        ctx.stroke();

        if (wp >= 1.0) {
          wakeState.current = "awake";
        }

        animFrameId.current = requestAnimationFrame(render);
        return;
      }

      // STATE 3: SLEEPING
      if (wakeState.current === "sleeping") {
        sleepProgress.current += dt / 0.75;
        const sp = Math.min(1.0, sleepProgress.current);

        const contractProgress = Math.min(1.0, sp / 0.75);
        const contractEase = 1 - smoothstep5(contractProgress);

        const fadeProgress = Math.max(0, Math.min(1.0, (sp - 0.65) / 0.35));
        const dotScale = 1 - smoothstep5(fadeProgress);

        const currentHalfSpan = baseHalfWidth * contractEase;
        const startX = cx - currentHalfSpan;
        const endX = cx + currentHalfSpan;
        const currentThickness = (5.5 * (1 - contractEase) + 2.0 * contractEase) * dpr * dotScale;

        if (dotScale > 0.005) {
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
          ctx.stroke();
        }

        if (sp >= 1.0) {
          wakeState.current = "dormant";
        }

        animFrameId.current = requestAnimationFrame(render);
        return;
      }

      // STATE 4: ACTIVE & AWAKE
      const targetAi = Math.max(0, Math.min(1, propsRef.current.aiVolume));
      const targetUser = propsRef.current.isMuted
        ? 0
        : Math.max(0, Math.min(1, propsRef.current.userVolume));

      // Fast, responsive exponential audio smoothing
      smoothedAiVol.current += (targetAi - smoothedAiVol.current) * (1 - Math.exp(-22 * dt));
      smoothedUserVol.current += (targetUser - smoothedUserVol.current) * (1 - Math.exp(-18 * dt));

      const aiV = smoothedAiVol.current;
      const userV = smoothedUserVol.current;
      const currentConnState = propsRef.current.connectionState;

      const isAiSpeaking = aiV > 0.012 || currentConnState === "speaking";
      const isUserSpeaking = !isAiSpeaking && userV > 0.015;
      const isThinking = currentConnState === "thinking";

      // Morph controller: Line <--> Sentient mouth
      const targetMorph = isAiSpeaking ? 1.0 : 0.0;
      aiLipMorph.current += (targetMorph - aiLipMorph.current) * (1 - Math.exp(-18 * dt));
      const morph = aiLipMorph.current;

      // Syllable clock
      if (isAiSpeaking) {
        speechClock.current += dt * (3.8 + aiV * 24);
      }
      const clock = speechClock.current;
      const cadence =
        Math.sin(clock * 1.5) * 0.40 +
        Math.cos(clock * 3.2) * 0.24 +
        Math.sin(clock * 5.6) * 0.12 +
        1.15;

      const targetOpen = isAiSpeaking ? Math.max(0.1, aiV * (0.35 + cadence * 0.8)) : 0;
      currentOpenness.current += (targetOpen - currentOpenness.current) * (1 - Math.exp(-26 * dt));

      const targetSpreadVal = isAiSpeaking ? 1.0 + Math.sin(clock * 1.2) * 0.10 * aiV : 1.0;
      currentSpread.current += (targetSpreadVal - currentSpread.current) * (1 - Math.exp(-16 * dt));

      const targetSmileVal = isAiSpeaking ? 0.16 * aiV : 0;
      currentSmile.current += (targetSmileVal - currentSmile.current) * (1 - Math.exp(-12 * dt));

      const openness = currentOpenness.current;
      const apertureH = openness * (64 * dpr) * morph;

      const smileOffset = currentSmile.current * (12 * dpr) * morph;
      const cornerL = { x: cx - baseHalfWidth, y: cy - smileOffset * 0.25 };
      const cornerR = { x: cx + baseHalfWidth, y: cy - smileOffset * 0.25 };

      ctx.save();
      const currentRot = propsRef.current.rotationDeg || 0;
      if (currentRot !== 0) {
        ctx.translate(cx, cy);
        ctx.rotate((currentRot * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      // 4A: AI REPLIES -> GLOWING WHITE 2D SENTIENT MOUTH / LIPS ANIMATION
      if (morph >= 0.02) {
        const upperH = apertureH * 0.52;
        const lowerH = apertureH * 0.58;

        const peakX = baseHalfWidth * 0.22;
        const upperDipY = cy - upperH * 0.85;
        const upperPeakY = cy - upperH * 1.05;

        // Solid white mouth interior when aperture opens
        if (apertureH > 1.2 * dpr) {
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

          ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * morph})`;
          ctx.fill();
        }

        // Clean white lip contours
        const lipLineWidth = (2.0 + aiV * 0.8) * dpr;
        const lipLineGrad = ctx.createLinearGradient(cornerL.x, 0, cornerR.x, 0);
        lipLineGrad.addColorStop(0, "rgba(255, 255, 255, 0.0)");
        lipLineGrad.addColorStop(0.12, `rgba(255, 255, 255, ${0.85 * morph})`);
        lipLineGrad.addColorStop(0.5, `rgba(255, 255, 255, ${1.0 * morph})`);
        lipLineGrad.addColorStop(0.88, `rgba(255, 255, 255, ${0.85 * morph})`);
        lipLineGrad.addColorStop(1, "rgba(255, 255, 255, 0.0)");

        // Upper Lip Contour
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
        ctx.stroke();

        // Lower Lip Contour
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
        ctx.stroke();
      }

      // 4B: USER SPEAKING / IDLE / LISTENING -> ULTRA-SOFT & VELVETY ORGANIC WAVE
      if (morph < 0.98) {
        const waveWeight = 1 - morph;

        // Wave phase progression
        idleBreathPhase.current += dt * 1.8;
        thinkingPulse.current += dt * 3.5;

        const waveSpeed = isUserSpeaking ? (3.5 + userV * 7.0) : 1.2;
        primaryWavePhase.current += dt * waveSpeed;
        secondaryWavePhase.current += dt * (waveSpeed * 0.85);

        const p1 = primaryWavePhase.current;
        const p2 = secondaryWavePhase.current;

        // Target amplitude
        let targetAmp = 0;
        if (isUserSpeaking) {
          targetAmp = Math.min(34 * dpr, (6 + userV * 42) * dpr);
        } else if (isThinking) {
          targetAmp = (4.0 + Math.sin(thinkingPulse.current) * 2.2) * dpr;
        } else {
          // Subtle living respiration line
          targetAmp = 1.4 * dpr;
        }

        waveAmpSmoothed.current += (targetAmp - waveAmpSmoothed.current) * (1 - Math.exp(-18 * dt));
        const amp = waveAmpSmoothed.current;

        const startX = cx - baseHalfWidth;
        const stepX = (baseHalfWidth * 2) / (numPoints - 1);

        // LAYER 1: Soft Harmonic Companion Wave (when user speaks)
        if (isUserSpeaking && amp > 3.5 * dpr) {
          ctx.beginPath();
          for (let i = 0; i < numPoints; i++) {
            const px = startX + i * stepX;
            const u = i / (numPoints - 1);
            const env = 0.5 * (1 - Math.cos(2 * Math.PI * u));
            const envPow = env * env;

            const h1 = Math.sin(u * Math.PI * 2.2 - p2) * 0.65;
            const h2 = Math.sin(u * Math.PI * 4.2 + p2 * 0.7) * 0.35;
            const waveDisp = (h1 + h2) * (amp * 0.55) * envPow;

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
          ctx.lineWidth = 1.2 * dpr;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();
        }

        // LAYER 2: Primary Core Harmonic Wave (Clean, Soft & Luminescent)
        // High-performance GPU multi-pass glow
        const corePoints: { x: number; y: number }[] = [];
        for (let i = 0; i < numPoints; i++) {
          const px = startX + i * stepX;
          const u = i / (numPoints - 1);
          const env = 0.5 * (1 - Math.cos(2 * Math.PI * u));
          const envPow = env * env;

          let waveDisp = 0;
          if (amp <= 2.0 * dpr) {
            const breath = Math.sin(idleBreathPhase.current + u * Math.PI * 2) * (1.1 * dpr);
            waveDisp = breath * envPow;
          } else {
            const f1 = Math.sin(u * Math.PI * 2.4 + p1) * 0.72;
            const f2 = Math.sin(u * Math.PI * 3.8 - p1 * 0.8) * 0.28;
            waveDisp = (f1 + f2) * amp * envPow;
          }

          const waterDisp = computeWaterDisplacement(px, cy, now, dpr);
          corePoints.push({ x: px, y: cy + waveDisp + waterDisp });
        }

        // Pass 2A: Soft luminous ambient glow (wide stroke, low alpha)
        if (amp > 2.5 * dpr) {
          ctx.beginPath();
          for (let i = 0; i < numPoints; i++) {
            if (i === 0) ctx.moveTo(corePoints[i].x, corePoints[i].y);
            else ctx.lineTo(corePoints[i].x, corePoints[i].y);
          }
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.12 * waveWeight})`;
          ctx.lineWidth = 4.2 * dpr;
          ctx.stroke();
        }

        // Pass 2B: Crisp Core White Stroke
        const coreGrad = ctx.createLinearGradient(startX, 0, startX + baseHalfWidth * 2, 0);
        coreGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
        coreGrad.addColorStop(0.12, `rgba(255, 255, 255, ${0.85 * waveWeight})`);
        coreGrad.addColorStop(0.5, `rgba(255, 255, 255, ${1.0 * waveWeight})`);
        coreGrad.addColorStop(0.88, `rgba(255, 255, 255, ${0.85 * waveWeight})`);
        coreGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.beginPath();
        for (let i = 0; i < numPoints; i++) {
          if (i === 0) ctx.moveTo(corePoints[i].x, corePoints[i].y);
          else ctx.lineTo(corePoints[i].x, corePoints[i].y);
        }

        ctx.strokeStyle = coreGrad;
        ctx.lineWidth = (2.0 + userV * 0.7) * dpr;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
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
  }, []);

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
