/**
 * AudioPlayer handles playing back 24kHz PCM16 raw audio chunks
 * received from the Gemini Live API with precise timing to prevent
 * gaps or overlaps. It also provides real-time amplitude analysis
 * for visual waveforms.
 */
export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private masterGainNode: GainNode | null = null;
  private toneFilterNode: BiquadFilterNode | null = null;
  private currentMood: string = "calm";
  private targetGainValue: number = 1.0;
  private nextStartTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isPlaying: boolean = false;
  private fadeTimeout: any = null;
  private isMuted: boolean = false;
  private isDucked: boolean = false;
  private duckRatio: number = 0.28;

  constructor() {}

  /**
   * Smoothly ducks or restores playback volume when user voice activity is detected.
   * Keeps Tune talking softly in the background without cutting off.
   */
  public setDucked(ducked: boolean, ratio: number = 0.28): void {
    if (this.isMuted) return;
    this.duckRatio = ratio;
    if (this.isDucked === ducked) return;
    this.isDucked = ducked;
    if (!this.audioContext || !this.masterGainNode) return;

    const now = this.audioContext.currentTime;
    const targetGain = ducked ? Math.max(0.08, this.targetGainValue * this.duckRatio) : this.targetGainValue;
    this.masterGainNode.gain.cancelScheduledValues(now);
    this.masterGainNode.gain.setValueAtTime(this.masterGainNode.gain.value, now);
    this.masterGainNode.gain.linearRampToValueAtTime(targetGain, now + (ducked ? 0.12 : 0.25));
    console.log(`🔉 AudioPlayer: Voice volume ducking -> ${ducked ? "DUCKED (soft background voice)" : "NORMAL (full voice)"}`);
  }

  public getIsDucked(): boolean {
    return this.isDucked;
  }

  /**
   * Toggles or sets whether Tune's voice sound output is muted for silent text-only mode.
   */
  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.hardStop();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Initializes the audio context, master gain node, tone filter, and analyzer if not already active.
   */
  private initContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000, // Gemini Live output rate is strictly 24kHz
      });
      
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;

      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.gain.value = this.targetGainValue;

      // Create BiquadFilter for Tone-Aware Acoustic Shaping
      this.toneFilterNode = this.audioContext.createBiquadFilter();
      this.toneFilterNode.type = "lowpass";
      this.toneFilterNode.frequency.value = 8000;

      // Connect source -> toneFilterNode -> masterGain -> analyser -> destination
      this.toneFilterNode.connect(this.masterGainNode);
      this.masterGainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);

      // Apply initial mood filter
      this.applyToneFilter(this.currentMood);
    }

    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
  }

  /**
   * Dynamically configures tone-aware acoustic synthesis filters matching the active mood state.
   * Ensures energetic crisp output when happy/excited, and soft/empathetic warm output when concerned/supportive.
   */
  public setMoodTone(mood: string): void {
    this.currentMood = mood;
    if (this.audioContext) {
      this.applyToneFilter(mood);
    }
  }

  private applyToneFilter(mood: string): void {
    if (!this.audioContext || !this.toneFilterNode || !this.masterGainNode) return;
    const now = this.audioContext.currentTime;
    const moodLower = (mood || "").toLowerCase();

    if (["happy", "excited", "laughing"].includes(moodLower)) {
      // Vibrant, energetic voice output setting (crisp presence boost + energetic output gain)
      this.toneFilterNode.type = "peaking";
      this.toneFilterNode.frequency.setTargetAtTime(3400, now, 0.08);
      this.toneFilterNode.Q.setTargetAtTime(1.2, now, 0.08);
      this.toneFilterNode.gain.setTargetAtTime(3.5, now, 0.08); // +3.5dB presence boost for energy
      this.targetGainValue = 1.15;
      this.masterGainNode.gain.setTargetAtTime(1.15, now, 0.08);
    } else if (["concerned", "supportive", "sad", "scolded", "baby_pout", "angry"].includes(moodLower)) {
      // Soft, empathetic, gentle voice output setting (warm low-pass filter soothes harsh highs)
      this.toneFilterNode.type = "lowpass";
      this.toneFilterNode.frequency.setTargetAtTime(2800, now, 0.08); // Soothes high frequencies into a warm, cozy voice
      this.toneFilterNode.Q.setTargetAtTime(0.7, now, 0.08);
      this.targetGainValue = 0.88;
      this.masterGainNode.gain.setTargetAtTime(0.88, now, 0.08);
    } else if (["thinking", "curious", "confused"].includes(moodLower)) {
      // Thoughtful, inquisitive, clear articulation
      this.toneFilterNode.type = "peaking";
      this.toneFilterNode.frequency.setTargetAtTime(2200, now, 0.08);
      this.toneFilterNode.Q.setTargetAtTime(1.0, now, 0.08);
      this.toneFilterNode.gain.setTargetAtTime(1.8, now, 0.08);
      this.targetGainValue = 0.98;
      this.masterGainNode.gain.setTargetAtTime(0.98, now, 0.08);
    } else {
      // Natural baseline (transparent)
      this.toneFilterNode.type = "lowpass";
      this.toneFilterNode.frequency.setTargetAtTime(8000, now, 0.08);
      this.targetGainValue = 1.0;
      this.masterGainNode.gain.setTargetAtTime(1.0, now, 0.08);
    }
  }

  /**
   * Schedules a raw PCM16 base64 chunk for gapless playback.
   */
  playChunk(base64Data: string): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.audioContext || !this.analyserNode || !this.masterGainNode || !this.toneFilterNode) return;

    if (this.audioContext.state === "suspended") {
      this.audioContext.resume().catch((err) => console.warn("Failed to resume AudioContext:", err));
    }

    // Restore active mood gain if a fade-out was scheduled
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }
    const currentTime = this.audioContext.currentTime;
    const effectiveGain = this.isDucked
      ? Math.max(0.08, this.targetGainValue * this.duckRatio)
      : this.targetGainValue;
    this.masterGainNode.gain.cancelScheduledValues(currentTime);
    this.masterGainNode.gain.setValueAtTime(effectiveGain, currentTime);

    // Convert Base64 back to Float32 sample data
    const float32Data = this.base64ToFloat32(base64Data);
    if (float32Data.length === 0) return;

    // Create an AudioBuffer
    const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, 24000);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Route through toneFilterNode -> master gain node and analyzer
    source.connect(this.toneFilterNode);

    // Ultra-low latency 15ms jitter buffer for instant playback the moment audio arrives
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime + 0.015; // 15ms instant playback buffer
    }

    source.start(this.nextStartTime);
    this.activeSources.push(source);
    this.isPlaying = true;

    // Clean up completed sources
    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx !== -1) {
        this.activeSources.splice(idx, 1);
      }
      if (this.activeSources.length === 0) {
        this.isPlaying = false;
        if (this.isDucked) {
          this.setDucked(false);
        }
      }
    };

    // Advance scheduling pointer
    this.nextStartTime += audioBuffer.duration;
  }

  /**
   * Stops scheduled playback smoothly with a gentle volume fade-out when interrupted by the user.
   * @param fadeOutDurationMs Duration of the smooth soft fade-out in milliseconds (default 350ms).
   */
  stop(fadeOutDurationMs: number = 350): void {
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }

    if (fadeOutDurationMs > 0 && this.masterGainNode && this.audioContext && this.isPlaying) {
      const currTime = this.audioContext.currentTime;
      const fadeSec = fadeOutDurationMs / 1000;
      this.masterGainNode.gain.cancelScheduledValues(currTime);
      this.masterGainNode.gain.setValueAtTime(this.masterGainNode.gain.value, currTime);
      this.masterGainNode.gain.linearRampToValueAtTime(0.001, currTime + fadeSec);

      this.fadeTimeout = setTimeout(() => {
        this.hardStop();
      }, fadeOutDurationMs);
    } else {
      this.hardStop();
    }
  }

  /**
   * Smoothly stops ongoing audio sources and resets scheduling pointer for an immediate new turn response.
   */
  public softInterruptAndReset(fadeMs: number = 60): void {
    if (!this.audioContext || !this.isPlaying) {
      this.nextStartTime = 0;
      this.isDucked = false;
      return;
    }
    const currTime = this.audioContext.currentTime;
    if (this.masterGainNode && fadeMs > 0) {
      const fadeSec = fadeMs / 1000;
      this.masterGainNode.gain.cancelScheduledValues(currTime);
      this.masterGainNode.gain.setValueAtTime(this.masterGainNode.gain.value, currTime);
      this.masterGainNode.gain.linearRampToValueAtTime(0.001, currTime + fadeSec);
    }
    setTimeout(() => {
      this.activeSources.forEach((source) => {
        try { source.stop(); } catch {}
      });
      this.activeSources = [];
      this.nextStartTime = 0;
      this.isPlaying = false;
      this.isDucked = false;
      if (this.masterGainNode && this.audioContext) {
        const now = this.audioContext.currentTime;
        this.masterGainNode.gain.cancelScheduledValues(now);
        this.masterGainNode.gain.setValueAtTime(this.targetGainValue, now);
      }
    }, fadeMs);
  }

  /**
   * Immediate hard stop of all active audio sources.
   */
  private hardStop(): void {
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch (err) {
        // Source already finished or not started
      }
    });
    this.activeSources = [];
    this.nextStartTime = 0;
    this.isPlaying = false;
    this.isDucked = false;
    if (this.masterGainNode && this.audioContext) {
      const currTime = this.audioContext.currentTime;
      this.masterGainNode.gain.cancelScheduledValues(currTime);
      this.masterGainNode.gain.setValueAtTime(this.targetGainValue, currTime);
    }
    console.log("🔊 AudioPlayer: Stopped active voice sources (Interrupted with soft finish)");
  }

  /**
   * Resumes audio context if suspended when tab becomes active or in background.
   */
  public resumeIfSuspended(): void {
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }
  }

  /**
   * Returns current playing state.
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Computes the real-time RMS volume of the playing voice.
   * Useful for syncing voice waveforms. Returns 0.0 to 1.0.
   */
  getVolume(): number {
    if (!this.analyserNode || !this.isPlaying) return 0;
    
    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyserNode.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const deviation = dataArray[i] - 128; // Center point is 128 (8-bit)
      sum += deviation * deviation;
    }
    const rms = Math.sqrt(sum / bufferLength);
    // Scale the raw RMS to [0.0, 1.0] visually
    return Math.min(1.0, rms / 48.0);
  }

  /**
   * Computes real-time frequency spectrum bins of the playing AI voice.
   */
  getFrequencies(): number[] {
    if (!this.analyserNode || !this.isPlaying) return new Array(16).fill(0);
    const buffer = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(buffer);
    const bins = 16;
    const step = Math.max(1, Math.floor(buffer.length / bins));
    const result: number[] = [];
    for (let i = 0; i < bins; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += buffer[i * step + j] || 0;
      }
      const val = (sum / step) / 255.0;
      result.push(Math.min(1.0, val * 1.5));
    }
    return result;
  }

  /**
   * Converts base64 PCM16 data into a Float32Array [-1.0, 1.0] for Web Audio API.
   */
  private base64ToFloat32(base64: string): Float32Array {
    try {
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }
      return float32Array;
    } catch (err) {
      console.error("Failed to decode base64 audio playing chunk:", err);
      return new Float32Array(0);
    }
  }
}
