import React, { useEffect, useRef } from "react";
import { ConnectionState } from "../types";

interface CosmicBlackHoleVisualizerProps {
  connectionState: ConnectionState;
  userVolume: number;
  aiVolume: number;
  userFrequencies?: number[];
  aiFrequencies?: number[];
  isMuted?: boolean;
  onClick?: () => void;
  rotationDeg?: number;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}

export const CosmicBlackHoleVisualizer: React.FC<CosmicBlackHoleVisualizerProps> = ({
  connectionState,
  userVolume,
  aiVolume,
  userFrequencies,
  aiFrequencies,
  onClick,
  rotationDeg = -16,
  scale = 1.0,
  offsetX = 0,
  offsetY = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    rotation: 0,
    time: 0,
    smoothedUserVol: 0,
    smoothedAiVol: 0,
    smoothedFreqs: new Array(48).fill(0),
    particles: [] as Array<{
      r: number;
      angle: number;
      speed: number;
      size: number;
      alpha: number;
      color: string;
      radialSpeed: number;
      tiltZ: number;
    }>,
  });

  // Initialize astronomical stardust & accretion particles
  useEffect(() => {
    const pCount = 140;
    const particles = [];
    const colorPalette = ["#38bdf8", "#818cf8", "#c084fc", "#f472b6", "#34d399", "#fde047"];

    for (let i = 0; i < pCount; i++) {
      particles.push({
        r: 55 + Math.random() * 190,
        angle: Math.random() * Math.PI * 2,
        speed: (0.004 + Math.random() * 0.018) * (Math.random() > 0.15 ? 1 : -1),
        size: 0.5 + Math.random() * 1.8,
        alpha: 0.15 + Math.random() * 0.8,
        color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
        radialSpeed: (0.05 + Math.random() * 0.22) * -1,
        tiltZ: (Math.random() - 0.5) * 0.3,
      });
    }
    stateRef.current.particles = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationId: number;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displaySize = 540;
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;

    const render = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, displaySize, displaySize);

      const state = stateRef.current;
      state.time += 0.015;

      // Smooth volume transitions with responsive exponential decay
      state.smoothedUserVol += (userVolume - state.smoothedUserVol) * 0.22;
      state.smoothedAiVol += (aiVolume - state.smoothedAiVol) * 0.22;

      const effectiveAi = Math.max(0, Math.min(1, state.smoothedAiVol));
      const effectiveUser = Math.max(0, Math.min(1, state.smoothedUserVol));
      const isSpeaking = connectionState === "speaking" || effectiveAi > 0.05;
      const isListening = connectionState === "listening" || effectiveUser > 0.05;
      const isThinking = connectionState === "thinking";

      const totalEnergy = Math.max(
        effectiveAi * 2.2,
        effectiveUser * 1.9,
        isThinking ? 0.75 : 0
      );

      // Smooth multi-band audio frequencies
      const rawFreqs = effectiveAi > 0.04 ? aiFrequencies : userFrequencies;
      if (rawFreqs && rawFreqs.length > 0) {
        for (let i = 0; i < 48; i++) {
          const target = (rawFreqs[i % rawFreqs.length] || 0) / 255;
          state.smoothedFreqs[i] += (target - state.smoothedFreqs[i]) * 0.32;
        }
      } else {
        for (let i = 0; i < 48; i++) {
          state.smoothedFreqs[i] += (0 - state.smoothedFreqs[i]) * 0.06;
        }
      }

      const centerX = displaySize / 2;
      const centerY = displaySize / 2;

      ctx.save();
      ctx.translate(centerX, centerY);

      // Organic base tilt
      const baseTilt = (rotationDeg * Math.PI) / 180;
      ctx.rotate(baseTilt);

      // =========================================================
      // 1. DEEP CHROMATIC GRAVITATIONAL LENSING FIELD (ATMOSPHERE)
      // =========================================================
      const outerGlowRadius = (165 + totalEnergy * 85) * scale;
      const glowGrad = ctx.createRadialGradient(0, 0, 30 * scale, 0, 0, outerGlowRadius);

      if (isSpeaking) {
        glowGrad.addColorStop(0, "rgba(192, 132, 252, 0.35)"); // Violet glow
        glowGrad.addColorStop(0.35, "rgba(244, 114, 182, 0.18)"); // Neon pink
        glowGrad.addColorStop(0.7, "rgba(99, 102, 241, 0.06)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else if (isListening) {
        glowGrad.addColorStop(0, "rgba(34, 211, 238, 0.4)"); // Cyan glow
        glowGrad.addColorStop(0.35, "rgba(52, 211, 153, 0.16)"); // Emerald
        glowGrad.addColorStop(0.7, "rgba(59, 130, 246, 0.06)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else if (isThinking) {
        // Distinct Thought State: Slowed, luminous amber-gold and nebula violet pulse
        const thinkPulse = Math.sin(state.time * 1.5) * 0.5 + 0.5;
        glowGrad.addColorStop(0, `rgba(251, 191, 36, ${0.32 + thinkPulse * 0.16})`); // Amber gold
        glowGrad.addColorStop(0.4, `rgba(168, 85, 247, ${0.18 + thinkPulse * 0.08})`); // Violet
        glowGrad.addColorStop(0.75, "rgba(56, 189, 248, 0.08)"); // Ethereal cyan edge
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else {
        const pulse = Math.sin(state.time * 1.5) * 0.04 + 0.14;
        glowGrad.addColorStop(0, `rgba(129, 140, 248, ${pulse})`);
        glowGrad.addColorStop(0.5, "rgba(6, 182, 212, 0.04)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      }

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, outerGlowRadius + (isThinking ? Math.sin(state.time * 1.6) * 12 : 0), 0, Math.PI * 2);
      ctx.fill();

      // =========================================================
      // 2. INWARD-SWIRLING STARDUST ACCRETION PARTICLES
      // =========================================================
      // Distinct slowed pulse and spin during thinking state
      const spinSpeed = (isThinking ? 0.45 : isSpeaking || isListening ? 1.6 : 0.9) * 0.008;
      state.rotation += spinSpeed;

      state.particles.forEach((p) => {
        p.angle += p.speed * (isThinking ? 0.4 : 1);
        p.r += p.radialSpeed * (isThinking ? 0.5 : (1 + totalEnergy * 1.8));

        // Reset if crossed event horizon
        if (p.r < 44 * scale) {
          p.r = 185 * scale + Math.random() * 40;
        }

        const px = Math.cos(p.angle) * p.r;
        const py = Math.sin(p.angle) * p.r * (0.44 + p.tiltZ);

        const distNorm = Math.max(0, Math.min(1, p.r / (160 * scale)));
        const pAlpha = p.alpha * distNorm * (isSpeaking || isListening ? 1 : 0.7);

        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, p.size * (1 + totalEnergy * 0.4), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = pAlpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;
        ctx.fill();
        ctx.restore();
      });

      // =========================================================
      // 3. FLUID SILK ACCRETION RINGS (Continuous Smooth Splines)
      // =========================================================
      const numRings = 5;
      const baseRadius = 52 * scale;

      for (let layer = 0; layer < numRings; layer++) {
        const ringRadius = (baseRadius + layer * 16) * (1 + totalEnergy * 0.08);
        const segments = 80;
        const layerSpeed = (1.4 + layer * 0.35) * (layer % 2 === 0 ? 1 : -1);
        const layerPhase = state.time * layerSpeed;

        const points: { x: number; y: number }[] = [];

        for (let i = 0; i < segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          const freqIdx = Math.floor((i / segments) * 48);
          const freqVal = state.smoothedFreqs[freqIdx] || 0;

          // Relativistic Doppler beaming
          const doppler = Math.cos(theta - state.rotation) * 0.22 + 0.78;

          // Dynamic multi-frequency displacement
          const wave1 = Math.sin(theta * (2 + layer) + layerPhase) * (3.5 + layer * 2.2);
          const wave2 = Math.cos(theta * 4 - state.time * 2.2) * (2 + totalEnergy * 3.5);
          const freqDisplacement = freqVal * (42 + layer * 18) * (totalEnergy + 0.15) * doppler;

          const r = ringRadius + wave1 + wave2 + freqDisplacement;
          const x = Math.cos(theta) * r;
          const y = Math.sin(theta) * r * (0.62 + layer * 0.06);

          points.push({ x, y });
        }

        // Draw ultra-smooth Bézier curve through points
        ctx.save();
        ctx.beginPath();
        if (points.length > 2) {
          ctx.moveTo((points[0].x + points[points.length - 1].x) / 2, (points[0].y + points[points.length - 1].y) / 2);
          for (let i = 0; i < points.length; i++) {
            const next = points[(i + 1) % points.length];
            const midX = (points[i].x + next.x) / 2;
            const midY = (points[i].y + next.y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
          }
        }
        ctx.closePath();

        // High-end glowing stroke styling
        if (isSpeaking) {
          ctx.strokeStyle =
            layer === 0
              ? "rgba(244, 114, 182, 0.95)"
              : layer === 1
              ? "rgba(192, 132, 252, 0.85)"
              : layer === 2
              ? "rgba(147, 51, 234, 0.55)"
              : "rgba(126, 34, 206, 0.25)";
          ctx.shadowColor = "#ec4899";
          ctx.shadowBlur = 16 + totalEnergy * 20;
          ctx.lineWidth = 2.2 + totalEnergy * 1.6;
        } else if (isListening) {
          ctx.strokeStyle =
            layer === 0
              ? "rgba(34, 211, 238, 0.95)"
              : layer === 1
              ? "rgba(52, 211, 153, 0.85)"
              : layer === 2
              ? "rgba(6, 182, 212, 0.5)"
              : "rgba(16, 185, 129, 0.2)";
          ctx.shadowColor = "#06b6d4";
          ctx.shadowBlur = 16 + totalEnergy * 20;
          ctx.lineWidth = 2.2 + totalEnergy * 1.6;
        } else if (isThinking) {
          const thinkPulse = Math.sin(state.time * 1.5 + layer * 0.8) * 0.5 + 0.5;
          ctx.strokeStyle = layer === 0 
            ? `rgba(251, 191, 36, ${0.85 + thinkPulse * 0.15})` 
            : layer === 1 
            ? `rgba(168, 85, 247, ${0.70 + thinkPulse * 0.20})` 
            : "rgba(56, 189, 248, 0.45)";
          ctx.shadowColor = thinkPulse > 0.5 ? "#f59e0b" : "#a855f7";
          ctx.shadowBlur = 18 + thinkPulse * 8;
          ctx.lineWidth = layer === 0 ? 2.6 : 1.8;
        } else {
          ctx.strokeStyle = layer === 0 ? "rgba(129, 140, 248, 0.65)" : "rgba(99, 102, 241, 0.2)";
          ctx.shadowColor = "#6366f1";
          ctx.shadowBlur = 8;
          ctx.lineWidth = 1.6;
        }

        ctx.stroke();
        ctx.restore();
      }

      // =========================================================
      // 4. RAZOR-SHARP EINSTEIN PHOTON RING & ABSOLUTE SINGULARITY
      // =========================================================
      const horizonRadius = 45 * scale * (1 - Math.sin(state.time * 2) * 0.015);

      // Super-bright Einstein photon deflection rim
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, horizonRadius + 1.2, 0, Math.PI * 2);
      ctx.strokeStyle = isSpeaking
        ? "rgba(255, 255, 255, 0.98)"
        : isListening
        ? "rgba(224, 242, 254, 0.98)"
        : "rgba(255, 255, 255, 0.82)";
      ctx.shadowColor = isSpeaking ? "#f472b6" : isListening ? "#22d3ee" : "#818cf8";
      ctx.shadowBlur = 14 + totalEnergy * 18;
      ctx.lineWidth = 2.0;
      ctx.stroke();
      ctx.restore();

      // Pitch-black Singularity Void
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, horizonRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#000000";
      ctx.shadowColor = "#000000";
      ctx.shadowBlur = 35;
      ctx.fill();
      ctx.restore();

      ctx.restore();

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [connectionState, userVolume, aiVolume, userFrequencies, aiFrequencies, rotationDeg, scale, offsetX, offsetY]);

  return (
    <div
      className="relative flex items-center justify-center cursor-pointer transition-transform duration-300 select-none"
      style={{
        transform: `translate(${offsetX}px, ${offsetY}px)`,
      }}
      onClick={onClick}
      title="Singularity Core"
    >
      <canvas ref={canvasRef} className="w-[460px] h-[460px] pointer-events-none" />
    </div>
  );
};
