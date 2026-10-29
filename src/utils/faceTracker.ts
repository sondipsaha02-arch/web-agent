export type FaceReactionMood =
  | "calm" | "neutral" | "happy" | "excited" | "laughing" | "giggle" | "ecstatic" | "joyful"
  | "scolded" | "baby_pout" | "sad" | "crying" | "oviman" | "heartbroken" | "pleading"
  | "angry" | "furious" | "pissed" | "annoyed" | "grumpy" | "outraged"
  | "confused" | "curious" | "puzzled" | "skeptical" | "suspicious" | "investigating"
  | "surprised" | "shocked" | "mindblown" | "speechless" | "gasping" | "stunned"
  | "thinking" | "calculating" | "pondering" | "concentrating" | "scheming" | "brainstorming"
  | "supportive" | "concerned" | "empathetic" | "caring" | "reassuring" | "loving"
  | "flirty" | "wink" | "charming" | "smirk" | "shy" | "blushing"
  | "sleepy" | "tired" | "yawning" | "bored" | "drowsy" | "exhausted"
  | "cool" | "sunglasses" | "confident" | "badass" | "boss" | "proud"
  | "heroic" | "determined" | "fierce" | "focused" | "energetic" | "hyped"
  | "fearful" | "scared" | "panicked" | "nervous" | "terrified" | "worried"
  | "disgusted" | "eww" | "cringe" | "repulsed" | "sick"
  | "silly" | "tongue_out" | "goofy" | "derp" | "playful" | "wacky"
  | "robot" | "cyber" | "matrix" | "alien" | "glitch" | "futuristic"
  | "singing" | "rockstar" | "grooving" | "dancing" | "melodic" | "beatbox"
  | "sarcastic" | "smug" | "unamused" | "rolling_eyes" | "facepalm" | "meh"
  | "peaceful" | "meditating" | "zen" | "relaxed" | "cozy" | "dreamy"
  | "embarrassed" | "bashful" | "nervous_laugh" | "flustered" | "sweating"
  | "victorious" | "celebrating" | "triumphant" | "genius" | "eureka" | "flexing"
  | "innocent" | "angelic" | "mischievous" | "dramatic" | "starstruck";

export interface FaceMirrorData {
  yaw: number;           // -0.5 to 0.5 (left / right rotation)
  pitch: number;         // -0.5 to 0.5 (up / down inclination)
  tilt: number;          // -0.3 to 0.3 (side head roll)
  mouthHeight: number;   // 0 to 30px (open mouth height)
  smileRatio: number;    // -0.5 (frown) to 1.0 (wide smile)
  eyebrowY: number;      // -10px (raised) to +5px (furrowed)
  eyeScaleY: number;     // 0.2 (blink) to 1.3 (wide open)
  detectedMood: FaceReactionMood;
  confidence: number;
}

export class FaceTracker {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;

  // Smoothing buffers to prevent ANY camera shaking/jittering
  private rawHistory: Array<{
    yaw: number;
    pitch: number;
    tilt: number;
    mouthHeight: number;
    smileRatio: number;
    eyebrowY: number;
  }> = [];

  private smoothedData: FaceMirrorData = {
    yaw: 0,
    pitch: 0,
    tilt: 0,
    mouthHeight: 0,
    smileRatio: 0.2,
    eyebrowY: -3,
    eyeScaleY: 1.0,
    detectedMood: "calm",
    confidence: 0,
  };

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 160;
    this.canvas.height = 120;
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
  }

  public processVideoFrame(video: HTMLVideoElement): FaceMirrorData {
    if (!this.ctx || !video || video.readyState < 2 || video.paused || video.ended) {
      return this.smoothedData;
    }

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Draw video frame to small low-res canvas for fast analysis
    this.ctx.drawImage(video, 0, 0, w, h);
    const imgData = this.ctx.getImageData(0, 0, w, h);
    const pixels = imgData.data;

    let totalSkinX = 0;
    let totalSkinY = 0;
    let skinPixelCount = 0;

    let minSkinX = w;
    let maxSkinX = 0;
    let minSkinY = h;
    let maxSkinY = 0;

    // 1. Skin tone pixel detection
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const i = (y * w + x) * 4;
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        // Robust skin color threshold
        const isSkin =
          r > 55 &&
          g > 28 &&
          b > 15 &&
          r > g &&
          r > b &&
          Math.abs(r - g) > 8;

        if (isSkin) {
          totalSkinX += x;
          totalSkinY += y;
          skinPixelCount++;

          if (x < minSkinX) minSkinX = x;
          if (x > maxSkinX) maxSkinX = x;
          if (y < minSkinY) minSkinY = y;
          if (y > maxSkinY) maxSkinY = y;
        }
      }
    }

    if (skinPixelCount < 60) {
      // Gentle decay if face temporarily obscured
      this.smoothedData.confidence = Math.max(0, this.smoothedData.confidence - 0.05);
      return this.smoothedData;
    }

    let faceCenterX = totalSkinX / skinPixelCount;
    let faceCenterY = totalSkinY / skinPixelCount;
    let faceW = Math.max(20, maxSkinX - minSkinX);
    let faceH = Math.max(20, maxSkinY - minSkinY);

    // 2. Compute raw Head Yaw, Pitch & Tilt
    const rawYaw = -((faceCenterX - w / 2) / (w / 2)) * 0.55;
    const rawPitch = ((faceCenterY - h / 2) / (h / 2)) * 0.45;
    const rawTilt = -((faceCenterX - w / 2) / (w / 2)) * 0.15;

    // 3. Analyze Mouth region
    const mouthRegionTop = Math.floor(faceCenterY + faceH * 0.05);
    const mouthRegionBottom = Math.floor(Math.min(h - 1, faceCenterY + faceH * 0.48));
    const mouthRegionLeft = Math.floor(Math.max(0, faceCenterX - faceW * 0.38));
    const mouthRegionRight = Math.floor(Math.min(w - 1, faceCenterX + faceW * 0.38));

    let darkMouthPixels = 0;
    let mouthMinX = mouthRegionRight;
    let mouthMaxX = mouthRegionLeft;
    let mouthMinY = mouthRegionBottom;
    let mouthMaxY = mouthRegionTop;

    for (let my = mouthRegionTop; my <= mouthRegionBottom; my += 2) {
      for (let mx = mouthRegionLeft; mx <= mouthRegionRight; mx += 2) {
        const mi = (my * w + mx) * 4;
        const mr = pixels[mi];
        const mg = pixels[mi + 1];
        const mb = pixels[mi + 2];
        const brightness = (mr + mg + mb) / 3;

        const isMouthPixel = brightness < 75 || (mr > mg + 18 && mr > mb + 15);
        if (isMouthPixel) {
          darkMouthPixels++;
          if (mx < mouthMinX) mouthMinX = mx;
          if (mx > mouthMaxX) mouthMaxX = mx;
          if (my < mouthMinY) mouthMinY = my;
          if (my > mouthMaxY) mouthMaxY = my;
        }
      }
    }

    const measuredMouthW = Math.max(0, mouthMaxX - mouthMinX);
    const measuredMouthH = Math.max(0, mouthMaxY - mouthMinY);

    const rawMouthOpenRatio = Math.min(1.0, measuredMouthH / Math.max(10, faceH * 0.30));
    const rawMouthHeight = Math.round(rawMouthOpenRatio * 26);

    const mouthWidthRatio = measuredMouthW / Math.max(1, faceW);
    let rawSmileRatio = (mouthWidthRatio - 0.28) * 3.8;
    rawSmileRatio = Math.max(-0.6, Math.min(1.0, rawSmileRatio));

    // 4. Eyebrow position
    const eyeRegionTop = Math.floor(Math.max(0, faceCenterY - faceH * 0.38));
    const eyeToTopDist = faceCenterY - eyeRegionTop;
    const rawEyebrowY = eyeToTopDist > faceH * 0.30 ? -9 : -3;

    // Push into history queue (max 5 frames) for temporal moving average
    this.rawHistory.push({
      yaw: rawYaw,
      pitch: rawPitch,
      tilt: rawTilt,
      mouthHeight: rawMouthHeight,
      smileRatio: rawSmileRatio,
      eyebrowY: rawEyebrowY,
    });
    if (this.rawHistory.length > 5) {
      this.rawHistory.shift();
    }

    // Calculate temporal mean to filter out camera noise completely
    let avgYaw = 0, avgPitch = 0, avgTilt = 0, avgMouth = 0, avgSmile = 0, avgBrow = 0;
    for (const h of this.rawHistory) {
      avgYaw += h.yaw;
      avgPitch += h.pitch;
      avgTilt += h.tilt;
      avgMouth += h.mouthHeight;
      avgSmile += h.smileRatio;
      avgBrow += h.eyebrowY;
    }
    const len = this.rawHistory.length;
    avgYaw /= len;
    avgPitch /= len;
    avgTilt /= len;
    avgMouth /= len;
    avgSmile /= len;
    avgBrow /= len;

    // Apply hysteresis deadband (ignore micro changes < noise threshold)
    const deadband = (current: number, target: number, threshold: number) => {
      return Math.abs(target - current) < threshold ? current : target;
    };

    const targetYaw = deadband(this.smoothedData.yaw, avgYaw, 0.018);
    const targetPitch = deadband(this.smoothedData.pitch, avgPitch, 0.018);
    const targetTilt = deadband(this.smoothedData.tilt, avgTilt, 0.015);
    const targetMouth = deadband(this.smoothedData.mouthHeight, avgMouth, 1.2);
    const targetSmile = deadband(this.smoothedData.smileRatio, avgSmile, 0.025);
    const targetBrow = deadband(this.smoothedData.eyebrowY, avgBrow, 0.5);

    // Dynamic Mood Detection Engine (100+ reaction categorization)
    let mood: FaceReactionMood = "calm";
    if (targetSmile > 0.65 && targetMouth > 12) {
      mood = "laughing";
    } else if (targetSmile > 0.85) {
      mood = "ecstatic";
    } else if (targetSmile > 0.45) {
      mood = "happy";
    } else if (targetSmile > 0.25 && targetBrow < -6) {
      mood = "joyful";
    } else if (targetMouth > 18 && targetBrow < -8) {
      mood = "shocked";
    } else if (targetMouth > 12) {
      mood = "surprised";
    } else if (targetSmile < -0.35 && targetBrow > -4) {
      mood = "angry";
    } else if (targetSmile < -0.2 && targetBrow < -6) {
      mood = "scolded"; // pleading oviman pout
    } else if (Math.abs(targetYaw) > 0.18 || Math.abs(targetPitch) > 0.15) {
      mood = "curious";
    } else if (targetSmile > 0.15 && Math.abs(targetTilt) > 0.08) {
      mood = "flirty";
    } else if (targetSmile > 0.2) {
      mood = "neutral";
    }

    // Silky Smooth Exponential Lerp (alpha = 0.12 ensures smooth movement with 0 shaking)
    const alpha = 0.12;
    this.smoothedData.yaw += (targetYaw - this.smoothedData.yaw) * alpha;
    this.smoothedData.pitch += (targetPitch - this.smoothedData.pitch) * alpha;
    this.smoothedData.tilt += (targetTilt - this.smoothedData.tilt) * alpha;
    this.smoothedData.mouthHeight += (targetMouth - this.smoothedData.mouthHeight) * 0.18;
    this.smoothedData.smileRatio += (targetSmile - this.smoothedData.smileRatio) * alpha;
    this.smoothedData.eyebrowY += (targetBrow - this.smoothedData.eyebrowY) * alpha;
    this.smoothedData.eyeScaleY += (1.0 - this.smoothedData.eyeScaleY) * alpha;
    this.smoothedData.detectedMood = mood;
    this.smoothedData.confidence = Math.min(1.0, this.smoothedData.confidence + 0.1);

    return this.smoothedData;
  }
}
