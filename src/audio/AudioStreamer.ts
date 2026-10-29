/**
 * AudioStreamer handles recording from the user's microphone,
 * downsampling native sample rates to 16kHz, and encoding the
 * raw audio to PCM16 base64 format for the Gemini Live API.
 */
export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private highPassFilter: BiquadFilterNode | null = null;
  private lowPassFilter: BiquadFilterNode | null = null;
  private speechEqFilter: BiquadFilterNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  
  private onAudioDataCallback: ((base64: string) => void) | null = null;
  private onVolumeCallback: ((volume: number) => void) | null = null;
  private isRecording: boolean = false;
  private lastVolume: number = 0;

  // Crowded situation & adaptive noise suppression state
  private crowdedMode: boolean = false;
  private ambientNoiseFloor: number = 0.005;
  private speechHangoverCounter: number = 0; // Holds gate open for ~500ms after last speech frame
  private wasSpeechActive: boolean = false;
  private silenceEndFramesRemaining: number = 0;
  
  // Voice Detection Sensitivity & Distance Range (1 to 100, default 65)
  // Higher = further distance & whisper detection, Lower = close-up noise rejection
  private sensitivity: number = typeof localStorage !== "undefined" ? Math.max(1, Math.min(100, parseInt(localStorage.getItem("tune_voice_sensitivity") || "65", 10))) : 65;
  
  // Pre-roll Ring Buffer (stores ~150ms of audio so initial consonants are never clipped)
  private preRollBuffer: string[] = [];
  private readonly maxPreRollFrames: number = 8;

  private onNoiseStatusCallback: ((status: {
    noiseFloor: number;
    isSpeech: boolean;
    rawSpeech: boolean;
    rms: number;
    threshold: number;
    sensitivity: number;
    crowdedMode: boolean;
  }) => void) | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("tune_voice_sensitivity_changed", (e: any) => {
        if (e.detail && typeof e.detail.sensitivity === "number") {
          this.setSensitivity(e.detail.sensitivity);
        }
      });
    }
  }

  /**
   * Sets the voice detection sensitivity & distance scale (1 to 100).
   * Persists value to localStorage.
   */
  public setSensitivity(value: number): void {
    const clamped = Math.max(1, Math.min(100, Math.round(value)));
    this.sensitivity = clamped;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("tune_voice_sensitivity", clamped.toString());
    }
    console.log(`🎙️ AudioStreamer Voice Detection Sensitivity set to: ${clamped}%`);
  }

  public getSensitivity(): number {
    return this.sensitivity;
  }

  /**
   * Returns current mic input volume [0.0 - 1.0]
   */
  public getVolume(): number {
    if (!this.isRecording) return 0;
    return this.lastVolume;
  }

  /**
   * Returns real-time 16-band normalized frequency spectrum data [0.0 - 1.0]
   */
  public getFrequencyData(): number[] {
    if (!this.isRecording || !this.analyserNode) {
      return new Array(16).fill(0);
    }
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
   * Toggles or sets Crowded Situation Noise Isolation mode
   */
  public setCrowdedMode(enabled: boolean): void {
    this.crowdedMode = enabled;
    console.log(`🎙️ AudioStreamer Crowded Mode set to: ${enabled}`);
  }

  public getCrowdedMode(): boolean {
    return this.crowdedMode;
  }

  public setNoiseStatusCallback(cb: (status: { noiseFloor: number; isSpeech: boolean; crowdedMode: boolean }) => void): void {
    this.onNoiseStatusCallback = cb;
  }

  public resumeIfSuspended(): void {
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }
  }

  /**
   * Starts recording audio from the user's microphone.
   * @param onAudioData Callback that receives the base64 encoded PCM16 audio chunks.
   * @param onVolume Callback that receives real-time audio volume (0.0 to 1.0).
   */
  async start(
    onAudioData: (base64: string) => void,
    onVolume?: (volume: number) => void
  ): Promise<void> {
    if (this.isRecording) return;

    this.onAudioDataCallback = onAudioData;
    if (onVolume) this.onVolumeCallback = onVolume;

    try {
      // 1. Request microphone stream: try advanced constraints -> fallback to basic audio: true
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone access API (getUserMedia) is not supported in this browser or iframe.");
      }

      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: { ideal: 48000 },
            sampleSize: 16,
            googNoiseSuppression: true,
            googEchoCancellation: true,
            googAutoGainControl: true,
            googHighpassFilter: true,
            googAudioMirroring: false,
            googNoiseSuppression2: true,
            googEchoCancellation2: true,
          } as any,
        });
      } catch (constraintErr: any) {
        // If the error was explicitly Permission Denied / NotAllowedError, rethrow immediately
        if (
          constraintErr?.name === "NotAllowedError" ||
          constraintErr?.name === "PermissionDeniedError" ||
          constraintErr?.message?.includes("Permission denied") ||
          constraintErr?.message?.includes("not allowed")
        ) {
          throw constraintErr;
        }

        console.warn("⚠️ Advanced audio constraints failed, trying minimal constraints:", constraintErr);
        try {
          this.mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        } catch (minimalErr: any) {
          if (
            minimalErr?.name === "NotAllowedError" ||
            minimalErr?.name === "PermissionDeniedError" ||
            minimalErr?.message?.includes("Permission denied")
          ) {
            throw minimalErr;
          }
          console.warn("⚠️ Minimal constraints failed, trying plain audio: true fallback:", minimalErr);
          this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      }

      // Initialize Web Audio API context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
      const sampleRate = this.audioContext.sampleRate;

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // 2. Build DSP Noise Reduction Filter Chain
      // A) High-Pass Filter (70Hz): Cuts out low-frequency sub-rumble while preserving full human voice fundamentals
      this.highPassFilter = this.audioContext.createBiquadFilter();
      this.highPassFilter.type = "highpass";
      this.highPassFilter.frequency.value = 70;
      this.highPassFilter.Q.value = 0.5;

      // B) Low-Pass Filter (7950Hz): Preserves full speech spectrum, consonants, sibilants, and fricatives for STT engine
      this.lowPassFilter = this.audioContext.createBiquadFilter();
      this.lowPassFilter.type = "lowpass";
      this.lowPassFilter.frequency.value = 7950;
      this.lowPassFilter.Q.value = 0.5;

      // C) Formant Boost Peaking EQ (2200Hz): +3.0dB presence boost for maximum human voice speech intelligibility
      this.speechEqFilter = this.audioContext.createBiquadFilter();
      this.speechEqFilter.type = "peaking";
      this.speechEqFilter.frequency.value = 2200;
      this.speechEqFilter.gain.value = 3.0;
      this.speechEqFilter.Q.value = 0.8;

      // D) AnalyserNode for Real-Time Voice Frequency Spectrum Analysis
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 64;
      this.analyserNode.smoothingTimeConstant = 0.55;

      // ScriptProcessorNode optimized for ultra-low latency (1024 samples ~ 21ms @ 48kHz)
      this.processorNode = this.audioContext.createScriptProcessor(1024, 1, 1);

      // Connect Node Graph: Source -> HighPass -> LowPass -> SpeechEQ -> Processor -> Destination
      // And SpeechEQ -> AnalyserNode for frequency analysis
      this.sourceNode.connect(this.highPassFilter);
      this.highPassFilter.connect(this.lowPassFilter);
      this.lowPassFilter.connect(this.speechEqFilter);
      this.speechEqFilter.connect(this.processorNode);
      this.speechEqFilter.connect(this.analyserNode);
      this.processorNode.connect(this.audioContext.destination);

      // Pre-compute a static zeroed silence frame (PCM16 16kHz base64) for clean turn boundaries
      const silenceDownsampled = new Int16Array(Math.round(1024 * (16000 / sampleRate)));
      const silenceBase64 = this.int16ToBase64(silenceDownsampled);

      this.processorNode.onaudioprocess = (e) => {
        if (!this.isRecording) return;

        const inputBuffer = e.inputBuffer.getChannelData(0);
        const bufferLength = inputBuffer.length;
        
        // 1. Calculate RMS energy of filtered audio stream
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += inputBuffer[i] * inputBuffer[i];
        }
        const rms = Math.sqrt(sum / bufferLength);

        // 2. Adaptive Ambient Noise Floor Estimation
        if (rms < this.ambientNoiseFloor * 2.0 || rms < 0.025) {
          this.ambientNoiseFloor = this.ambientNoiseFloor * 0.96 + rms * 0.04;
        }

        // 3. Dynamic Voice Activity Detection & Adaptive Distance/Sensitivity Scale
        // sensitivity is 1 to 100 (default 65)
        const sensNorm = this.sensitivity / 100.0;
        
        // Higher sensitivity = lower threshold, picks up distant speech / quiet whisper
        // Lower sensitivity = higher threshold, only picks up direct close-up speech
        const baseThreshold = this.crowdedMode
          ? (0.016 * Math.pow(1 - sensNorm * 0.75, 2) + 0.0035)
          : (0.020 * Math.pow(1 - sensNorm * 0.85, 2) + 0.0016);
        
        const noiseMultiplier = this.crowdedMode
          ? (2.8 - 1.2 * sensNorm)
          : (2.2 - 0.9 * sensNorm);
          
        const speechThreshold = Math.max(baseThreshold, this.ambientNoiseFloor * noiseMultiplier);
        const rawSpeechDetected = rms >= speechThreshold;

        // Natural conversational hangover window (~850ms @ 21ms/frame) so natural pauses between words are preserved
        if (rawSpeechDetected) {
          this.speechHangoverCounter = 40;
        } else if (this.speechHangoverCounter > 0) {
          this.speechHangoverCounter--;
        }

        const isSpeechActive = this.speechHangoverCounter > 0;

        if (this.onNoiseStatusCallback) {
          this.onNoiseStatusCallback({
            noiseFloor: this.ambientNoiseFloor,
            isSpeech: isSpeechActive,
            rawSpeech: rawSpeechDetected,
            rms,
            threshold: speechThreshold,
            sensitivity: this.sensitivity,
            crowdedMode: this.crowdedMode,
          });
        }

        // 4. Map RMS volume to logarithmic scale for UI visualizers
        const volume = Math.min(1.0, rms * (6.0 + sensNorm * 4.0));
        this.lastVolume = volume;
        if (this.onVolumeCallback) {
          this.onVolumeCallback(volume);
        }

        // 5. Digital Pre-amp Gain calibrated by sensitivity and crowded isolation mode
        const processedBuffer = new Float32Array(bufferLength);
        const gainBoost = this.crowdedMode ? 1.35 : (1.10 + sensNorm * 0.50);

        for (let i = 0; i < bufferLength; i++) {
          processedBuffer[i] = Math.max(-1.0, Math.min(1.0, inputBuffer[i] * gainBoost));
        }

        // 6. Downsample filtered Float32 buffer to target 16kHz PCM16 for Gemini
        const downsampled = this.downsample(processedBuffer, sampleRate, 16000);

        // 7. Convert Float32 buffer to PCM16 Int16Array
        const pcm16 = this.float32ToInt16(downsampled);

        // 8. Convert Int16Array buffer to Base64 string
        const base64 = this.int16ToBase64(pcm16);

        // 9. Continuous Audio Streaming to Gemini Live:
        // Stream every 16kHz PCM16 chunk continuously so Gemini Live's neural VAD
        // receives immediate, unclipped, real-time speech without dropped consonants or gating latency.
        if (this.onAudioDataCallback && base64) {
          this.onAudioDataCallback(base64);
        }
      };

      this.isRecording = true;
      console.log(`🎙️ AudioStreamer started recording and continuous 16kHz streaming (native: ${sampleRate}Hz -> target: 16000Hz)`);
    } catch (err) {
      console.error("Failed to start audio recording:", err);
      this.stop();
      throw err;
    }
  }

  /**
   * Stops recording and cleans up resources.
   */
  stop(): void {
    this.isRecording = false;
    this.onAudioDataCallback = null;
    this.onVolumeCallback = null;
    this.onNoiseStatusCallback = null;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.speechEqFilter) {
      this.speechEqFilter.disconnect();
      this.speechEqFilter = null;
    }

    if (this.lowPassFilter) {
      this.lowPassFilter.disconnect();
      this.lowPassFilter = null;
    }

    if (this.highPassFilter) {
      this.highPassFilter.disconnect();
      this.highPassFilter = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      if (this.audioContext.state !== "closed") {
        this.audioContext.close();
      }
      this.audioContext = null;
    }

    console.log("🎙️ AudioStreamer stopped and cleaned up");
  }

  /**
   * Downsamples a Float32Array audio buffer to a target sample rate.
   */
  private downsample(
    buffer: Float32Array,
    inputSampleRate: number,
    outputSampleRate: number
  ): Float32Array {
    if (inputSampleRate === outputSampleRate) {
      return buffer;
    }

    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    
    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;

      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }

      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }

    return result;
  }

  /**
   * Converts Float32Array values [-1.0, 1.0] to PCM16 Int16Array values [-32768, 32767].
   */
  private float32ToInt16(buffer: Float32Array): Int16Array {
    const l = buffer.length;
    const int16Array = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      const s = Math.max(-1.0, Math.min(1.0, buffer[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }

  /**
   * Converts an Int16Array to a base64 string.
   */
  private int16ToBase64(int16Array: Int16Array): string {
    const buffer = int16Array.buffer;
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
