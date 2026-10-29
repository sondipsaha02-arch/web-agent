import React, { useEffect, useRef } from "react";
import { ConnectionState } from "../types";

export type AIMood =
  | "calm"
  | "excited"
  | "thinking"
  | "happy"
  | "confused"
  | "supportive"
  | "surprised"
  | "concerned"
  | "curious"
  | "neutral"
  | "angry"
  | "scolded"
  | "baby_pout"
  | "laughing";

interface ParticleBackgroundProps {
  connectionState: ConnectionState;
  mood?: AIMood;
  aiVolume?: number;
  userVolume?: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  alpha: number;
  maxAlpha: number;
  colorIdx: number;
  pulsePhase: number;
}

type RGB = [number, number, number];

interface MoodTheme {
  primaryRGB: RGB;
  secondaryRGB: RGB;
  accentRGB: RGB;
  particleRGBs: RGB[];
  particleSpeed: number;
  pulseFreq: number;
}

const MOOD_THEMES: Record<string, MoodTheme> = {
  happy: {
    primaryRGB: [245, 158, 11],
    secondaryRGB: [251, 191, 36],
    accentRGB: [217, 119, 6],
    particleRGBs: [[245, 158, 11], [251, 191, 36], [252, 211, 77]],
    particleSpeed: 0.25,
    pulseFreq: 1.4,
  },
  laughing: {
    primaryRGB: [251, 146, 60],
    secondaryRGB: [245, 158, 11],
    accentRGB: [234, 179, 8],
    particleRGBs: [[251, 146, 60], [245, 158, 11], [250, 204, 21]],
    particleSpeed: 0.35,
    pulseFreq: 1.8,
  },
  thinking: {
    primaryRGB: [245, 158, 11],
    secondaryRGB: [168, 85, 247],
    accentRGB: [56, 189, 248],
    particleRGBs: [[245, 158, 11], [168, 85, 247], [56, 189, 248]],
    particleSpeed: 0.12,
    pulseFreq: 0.75,
  },
  excited: {
    primaryRGB: [236, 72, 153],
    secondaryRGB: [244, 63, 94],
    accentRGB: [139, 92, 246],
    particleRGBs: [[236, 72, 153], [244, 63, 94], [168, 85, 247]],
    particleSpeed: 0.35,
    pulseFreq: 1.6,
  },
  scolded: {
    primaryRGB: [244, 114, 182],
    secondaryRGB: [251, 146, 60],
    accentRGB: [192, 132, 252],
    particleRGBs: [[244, 114, 182], [251, 146, 60], [192, 132, 252]],
    particleSpeed: 0.18,
    pulseFreq: 1.0,
  },
  baby_pout: {
    primaryRGB: [244, 114, 182],
    secondaryRGB: [251, 146, 60],
    accentRGB: [192, 132, 252],
    particleRGBs: [[244, 114, 182], [251, 146, 60], [192, 132, 252]],
    particleSpeed: 0.16,
    pulseFreq: 0.9,
  },
  surprised: {
    primaryRGB: [234, 179, 8],
    secondaryRGB: [163, 230, 53],
    accentRGB: [34, 197, 94],
    particleRGBs: [[234, 179, 8], [163, 230, 53], [34, 197, 94]],
    particleSpeed: 0.3,
    pulseFreq: 1.5,
  },
  concerned: {
    primaryRGB: [168, 85, 247],
    secondaryRGB: [129, 140, 248],
    accentRGB: [99, 102, 241],
    particleRGBs: [[168, 85, 247], [129, 140, 248], [99, 102, 241]],
    particleSpeed: 0.15,
    pulseFreq: 0.8,
  },
  supportive: {
    primaryRGB: [168, 85, 247],
    secondaryRGB: [129, 140, 248],
    accentRGB: [99, 102, 241],
    particleRGBs: [[168, 85, 247], [129, 140, 248], [99, 102, 241]],
    particleSpeed: 0.18,
    pulseFreq: 0.9,
  },
  curious: {
    primaryRGB: [99, 102, 241],
    secondaryRGB: [6, 182, 212],
    accentRGB: [59, 130, 246],
    particleRGBs: [[99, 102, 241], [6, 182, 212], [59, 130, 246]],
    particleSpeed: 0.22,
    pulseFreq: 1.2,
  },
  confused: {
    primaryRGB: [99, 102, 241],
    secondaryRGB: [6, 182, 212],
    accentRGB: [59, 130, 246],
    particleRGBs: [[99, 102, 241], [6, 182, 212], [59, 130, 246]],
    particleSpeed: 0.2,
    pulseFreq: 1.1,
  },
  angry: {
    primaryRGB: [239, 68, 68],
    secondaryRGB: [249, 115, 22],
    accentRGB: [185, 28, 28],
    particleRGBs: [[239, 68, 68], [249, 115, 22], [185, 28, 28]],
    particleSpeed: 0.4,
    pulseFreq: 1.9,
  },
  calm: {
    primaryRGB: [16, 185, 129],
    secondaryRGB: [6, 182, 212],
    accentRGB: [59, 130, 246],
    particleRGBs: [[16, 185, 129], [6, 182, 212], [59, 130, 246]],
    particleSpeed: 0.16,
    pulseFreq: 0.8,
  },
  neutral: {
    primaryRGB: [16, 185, 129],
    secondaryRGB: [6, 182, 212],
    accentRGB: [59, 130, 246],
    particleRGBs: [[16, 185, 129], [6, 182, 212], [59, 130, 246]],
    particleSpeed: 0.16,
    pulseFreq: 0.8,
  },
};

export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  connectionState,
  mood = "calm",
  aiVolume = 0,
  userVolume = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentPrimaryRef = useRef<RGB>([16, 185, 129]);
  const currentSecondaryRef = useRef<RGB>([6, 182, 212]);
  const currentAccentRef = useRef<RGB>([59, 130, 246]);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Subtle micro-dust particles for celestial depth
    const maxParticles = 24;
    const particles: Particle[] = [];

    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.8 + 0.6,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -(Math.random() * 0.25 + 0.08),
        alpha: Math.random() * 0.25 + 0.05,
        maxAlpha: Math.random() * 0.35 + 0.12,
        colorIdx: Math.floor(Math.random() * 3),
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    let t = 0;

    const render = (now: number) => {
      const dt = Math.min(0.033, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      ctx.clearRect(0, 0, width, height);
      t += dt * 1.2;

      const targetTheme = MOOD_THEMES[mood] || MOOD_THEMES.calm;

      const effectiveTheme = connectionState === "disconnected"
        ? {
            primaryRGB: [75, 85, 99] as RGB,
            secondaryRGB: [55, 65, 81] as RGB,
            accentRGB: [31, 41, 55] as RGB,
            particleRGBs: [[107, 114, 128] as RGB, [75, 85, 99] as RGB, [55, 65, 81] as RGB],
            particleSpeed: 0.08,
            pulseFreq: 0.5,
          }
        : targetTheme;

      const lerpFactor = Math.min(1, dt * 2.5);
      const lerpRGB = (curr: RGB, target: RGB): RGB => [
        curr[0] + (target[0] - curr[0]) * lerpFactor,
        curr[1] + (target[1] - curr[1]) * lerpFactor,
        curr[2] + (target[2] - curr[2]) * lerpFactor,
      ];

      currentPrimaryRef.current = lerpRGB(currentPrimaryRef.current, effectiveTheme.primaryRGB);
      currentSecondaryRef.current = lerpRGB(currentSecondaryRef.current, effectiveTheme.secondaryRGB);
      currentAccentRef.current = lerpRGB(currentAccentRef.current, effectiveTheme.accentRGB);

      const pRGB = currentPrimaryRef.current;
      const sRGB = currentSecondaryRef.current;
      const aRGB = currentAccentRef.current;

      const audioPulse = connectionState === "speaking" ? aiVolume * 0.25 : userVolume * 0.20;
      const moodPulse = Math.sin(t * effectiveTheme.pulseFreq) * 0.04;
      const totalIntensity = Math.max(0.6, 1.0 + audioPulse + moodPulse);

      // Deep Obsidian Base
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, width, height);

      // 1. Soft Central Aura behind Avatar
      const cx = width / 2;
      const cy = height / 2;
      const primaryRadius = Math.min(width, height) * 0.48 * totalIntensity;
      const primaryGrad = ctx.createRadialGradient(cx, cy - 20, 10, cx, cy - 20, primaryRadius);
      primaryGrad.addColorStop(0, `rgba(${pRGB[0]}, ${pRGB[1]}, ${pRGB[2]}, ${0.08 * totalIntensity})`);
      primaryGrad.addColorStop(0.5, `rgba(${sRGB[0]}, ${sRGB[1]}, ${sRGB[2]}, ${0.03 * totalIntensity})`);
      primaryGrad.addColorStop(1, "rgba(9, 9, 11, 0)");

      ctx.fillStyle = primaryGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Corner Ambient Accent
      const cornerGrad = ctx.createRadialGradient(width * 0.85, height * 0.2, 10, width * 0.85, height * 0.2, width * 0.4);
      cornerGrad.addColorStop(0, `rgba(${aRGB[0]}, ${aRGB[1]}, ${aRGB[2]}, 0.04)`);
      cornerGrad.addColorStop(1, "rgba(9, 9, 11, 0)");

      ctx.fillStyle = cornerGrad;
      ctx.fillRect(0, 0, width, height);

      // 3. Floating Micro-dust Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.vy * (1 + audioPulse * 1.5);
        p.x += p.vx;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }

        const colorTuple = effectiveTheme.particleRGBs[p.colorIdx] || pRGB;
        const pAlpha = (Math.sin(t * 1.5 + p.pulsePhase) * 0.15 + 0.85) * p.alpha;

        ctx.fillStyle = `rgba(${colorTuple[0]}, ${colorTuple[1]}, ${colorTuple[2]}, ${pAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [connectionState, mood, aiVolume, userVolume]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
};

export default ParticleBackground;
