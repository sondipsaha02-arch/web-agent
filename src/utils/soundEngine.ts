// Web Audio API Sound Generator for Alarms and Notifications
class SoundEngine {
  private audioCtx: AudioContext | null = null;
  private isAlarmRinging = false;
  private alarmInterval: any = null;

  private getContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Plays a crisp 2-note notification chime (E5 -> B5 harmonic chime)
  public playNotificationChime() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "sine";

      // Note 1: E5 (659.25Hz), Note 2: B5 (987.77Hz)
      osc1.frequency.setValueAtTime(659.25, now);
      osc1.frequency.setValueAtTime(987.77, now + 0.12);

      // Harmony octave
      osc2.frequency.setValueAtTime(1318.51, now);
      osc2.frequency.setValueAtTime(1975.53, now + 0.12);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.65);
      osc2.stop(now + 0.65);
    } catch (e) {
      console.error("Error playing notification chime:", e);
    }
  }

  // Plays an energetic multi-harmonic PA alarm ringtone loop until stopped
  public playAlarmRingtone(): () => void {
    try {
      this.stopAlarmRingtone();
      const ctx = this.getContext();
      this.isAlarmRinging = true;

      const playSequence = () => {
        if (!this.isAlarmRinging) return;
        const now = ctx.currentTime;

        // Alarm Melody: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz) repeating chime pattern
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + idx * 0.14);

          gain.gain.setValueAtTime(0, now + idx * 0.14);
          gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.14 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.38);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.14);
          osc.stop(now + idx * 0.14 + 0.38);
        });
      };

      playSequence();
      this.alarmInterval = setInterval(playSequence, 1100);

      return () => this.stopAlarmRingtone();
    } catch (e) {
      console.error("Error playing alarm ringtone:", e);
      return () => {};
    }
  }

  // Stops any active alarm ringtone
  public stopAlarmRingtone() {
    this.isAlarmRinging = false;
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
  }

  // Subtle tactile tap beep for UI actions and tool movements
  public playActionBeep() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now); // A5
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {
      // Ignored
    }
  }

  // Warning/alert error beep
  public playAlertBeep() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.setValueAtTime(240, now + 0.08);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      // Ignored
    }
  }

  // Soft click tick for reorder operations
  public playTick() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(540, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {
      // Ignored
    }
  }

  // Soft, smooth, realistic water drop popup sound ("smooth and soft like water drop")
  public playWaterDropSound() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Primary droplet bubble oscillator (smooth pitch ramp: 480Hz -> 1420Hz -> 890Hz)
      const osc = ctx.createOscillator();
      const subOsc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sine";
      subOsc.type = "sine";

      // Water droplet frequency contour (rising curve then resonant drop)
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(1480, now + 0.05);
      osc.frequency.exponentialRampToValueAtTime(820, now + 0.16);

      subOsc.frequency.setValueAtTime(900, now);
      subOsc.frequency.exponentialRampToValueAtTime(2960, now + 0.05);
      subOsc.frequency.exponentialRampToValueAtTime(1640, now + 0.16);

      // Lowpass smoothing filter for clean liquid drop tone
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2200, now);
      filter.frequency.exponentialRampToValueAtTime(1200, now + 0.22);
      filter.Q.setValueAtTime(3.2, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(filter);
      subOsc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      subOsc.start(now);
      osc.stop(now + 0.22);
      subOsc.stop(now + 0.22);
    } catch (e) {
      // Ignored
    }
  }

  // Realistic tactile card swipe / flip sound effect
  public playCardSwipeSound(direction: "up" | "down" = "up") {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const noiseGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "triangle";

      if (direction === "up") {
        // Next card coming from below (rising gentle sweep)
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(680, now + 0.07);
        osc.frequency.exponentialRampToValueAtTime(380, now + 0.14);
      } else {
        // Previous card returning from above (descending sweep)
        osc.frequency.setValueAtTime(640, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.14);
      }

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(650, now);
      filter.Q.setValueAtTime(2.0, now);

      noiseGain.gain.setValueAtTime(0, now);
      noiseGain.gain.linearRampToValueAtTime(0.18, now + 0.02);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      // Ignored
    }
  }

  // Soft tactile acoustic tap for keypad and calculator buttons
  public playKeypadClickSound() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.035);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    } catch (e) {}
  }

  // Futuristic Cosmic Warp Emerge Sound Effect (Search Card erupting from Black Hole)
  public playWarpEmergeSound() {
    this.playWaterDropSound();
  }

  // Harmonic Chime popup sound
  public playSearchCardPopupSound() {
    this.playWaterDropSound();
  }

  // Test preview
  public testRingtone() {
    this.playAlarmRingtone();
    setTimeout(() => {
      this.stopAlarmRingtone();
    }, 4500);
  }
}

export const soundEngine = new SoundEngine();
