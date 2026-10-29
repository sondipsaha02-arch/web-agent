import { AudioStreamer } from "../audio/AudioStreamer";
import { AudioPlayer } from "../audio/AudioPlayer";
import { toolManagerInstance } from "../tools/ToolManager";
import { ConnectionState, Transcription, LiveProcessState } from "../types";

export interface LiveSessionCallbacks {
  onStateChange: (state: ConnectionState) => void;
  onTranscription: (transcription: Transcription) => void;
  onVolumeChange: (userVolume: number, aiVolume: number) => void;
  onFrequenciesChange?: (userFrequencies: number[], aiFrequencies: number[]) => void;
  onError: (error: string) => void;
  onMemoryUpdated?: (memory: any) => void;
  onScreenShareChange?: (sharing: boolean) => void;
  onCameraShareChange?: (sharing: boolean) => void;
  onProcessStateChange?: (processState: LiveProcessState | null) => void;
}

/**
 * LiveSession coordinates the client-side WebSocket proxy connection,
 * audio capture streaming, and audio response playback.
 */
export class LiveSession {
  private ws: WebSocket | null = null;
  private streamer: AudioStreamer;
  private player: AudioPlayer;
  private state: ConnectionState = "disconnected";
  private callbacks: LiveSessionCallbacks;
  private volumePollInterval: any = null;
  private isMuted: boolean = false;
  private screenStream: MediaStream | null = null;
  private screenInterval: any = null;
  private isScreenSharing: boolean = false;
  private cameraStream: MediaStream | null = null;
  private cameraInterval: any = null;
  private cameraVideoEl: HTMLVideoElement | null = null;
  private isCameraSharing: boolean = false;

  // Auto Keep-Alive & Session Continuity
  private isUserDisconnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private pingInterval: any = null;
  private activeSessionDialogue: { text: string; isUser: boolean; id: string }[] = [];

  // Operation Mode: "manual" (Manual Mentorship) | "auto" (Auto) | "normal" (Conversational) | "asking" (Silent on-demand)
  private operationMode: "manual" | "auto" | "normal" | "asking" = typeof localStorage !== "undefined" 
    ? ((localStorage.getItem("tune_operation_mode") as any) || (localStorage.getItem("tune_asking_mode") === "true" ? "asking" : "normal"))
    : "normal";

  // Asking Mode (Silent Listener) state
  private isAskingMode: boolean = typeof localStorage !== "undefined" ? localStorage.getItem("tune_asking_mode") === "true" : false;
  private shouldSpeakInAskingMode: boolean = false;

  // Speaker Sound (Voice output) Mute state for Silent Text-Only Mode
  private isSpeakerMuted: boolean = typeof localStorage !== "undefined" ? localStorage.getItem("tune_speaker_muted") === "true" : false;
  private silentSpeakingTimer: any = null;

  // Real-time Voice Activity & Thinking State Tracker
  private userSpeechFrames: number = 0;
  private userSilenceFrames: number = 0;
  private thinkingTimeoutTimer: any = null;
  private duckRestoreTimer: any = null;
  private hasPendingInterruption: boolean = false;

  constructor(callbacks: LiveSessionCallbacks) {
    this.callbacks = callbacks;
    this.streamer = new AudioStreamer();
    this.player = new AudioPlayer();
    this.player.setMuted(this.isSpeakerMuted);

    if (typeof window !== "undefined") {
      window.addEventListener("pa_asking_mode_changed", (e: any) => {
        if (e.detail && typeof e.detail.askingMode === "boolean") {
          this.isAskingMode = e.detail.askingMode;
          console.log("💬 LiveSession: Asking Mode changed to:", this.isAskingMode);
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: "setMode", mode: this.isAskingMode ? "asking" : "normal" }));
          }
        }
      });

      window.addEventListener("tune_speaker_muted_changed", (e: any) => {
        if (e.detail && typeof e.detail.isSpeakerMuted === "boolean") {
          this.setSpeakerMuted(e.detail.isSpeakerMuted);
        }
      });

      window.addEventListener("tune_voice_sensitivity_changed", (e: any) => {
        if (e.detail && typeof e.detail.sensitivity === "number") {
          this.setVoiceSensitivity(e.detail.sensitivity);
        }
      });
    }
  }

  /**
   * Establishes the WebSocket connection and starts mic streaming.
   */
  async connect(): Promise<void> {
    if (this.state !== "disconnected" && this.state !== "connecting") return;

    if (typeof window !== "undefined" && !(this as any).hasApiKeyListener) {
      (this as any).hasApiKeyListener = true;
      window.addEventListener("tune-api-key-updated", () => {
        console.log("🔑 Gemini API Key updated! Reconnecting Tune Live session...");
        this.isUserDisconnecting = false;
        this.disconnect();
        setTimeout(() => {
          this.connect();
        }, 400);
      });
    }

    this.isUserDisconnecting = false;
    this.updateState("connecting");

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const customApiKey = typeof localStorage !== "undefined" ? (localStorage.getItem("custom_gemini_api_key") || "").trim().replace(/^["']|["']$/g, '') : "";
    const queryParam = customApiKey ? `?apiKey=${encodeURIComponent(customApiKey)}` : "";
    const wsUrl = `${protocol}//${window.location.host}/ws${queryParam}`;

    console.log(`🔌 Connecting to Tune WebSocket proxy at: ${wsUrl}`);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        console.log("🟢 WebSocket proxy connection opened. Synchronizing memory store...");
        this.reconnectAttempts = 0;

        // Heartbeat interval to keep connection active and synchronize live client clock
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
              type: "ping",
              clientTime: {
                iso: new Date().toISOString(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Dhaka",
                localTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
              }
            }));
          }
        }, 20000);

        try {
          // Initialize or fetch existing memory from local storage
          const saved = localStorage.getItem("tune_long_term_memory");
          const memoryData = saved ? JSON.parse(saved) : {
            user_profile: { name: "", personality: "", interests: [], goals: [] },
            preferences: { speaking_style: "Conversational, natural", favorite_topics: [] },
            history: { important_events: [], previous_projects: [] },
            memories: []
          };

          // Fetch recent chat history to maintain conversation flow across page reloads / restarts
          let recentDialogue: any[] = [];
          try {
            const savedArchive = localStorage.getItem("tune_chat_history_archive");
            if (savedArchive) {
              const archive = JSON.parse(savedArchive);
              if (Array.isArray(archive) && archive.length > 0) {
                let collected: any[] = [];
                for (const sess of archive) {
                  if (sess.messages && Array.isArray(sess.messages)) {
                    // Prepend because archive is sorted newest first, we want chronological order
                    collected = [...sess.messages, ...collected];
                  }
                  if (collected.length >= 25) break;
                }
                recentDialogue = collected.slice(-25);
              }
            }
          } catch (e) {
            console.warn("Failed to parse chat history archive:", e);
          }

          // Combine with activeSessionDialogue
          if (this.activeSessionDialogue.length > 0) {
            const mergedMap = new Map();
            [...recentDialogue, ...this.activeSessionDialogue].forEach((item) => {
              const key = (item.id || "") + "_" + (item.text || "");
              mergedMap.set(key, item);
            });
            recentDialogue = Array.from(mergedMap.values()).slice(-30);
          }

          const customApiKey = typeof localStorage !== "undefined" ? localStorage.getItem("custom_gemini_api_key") || "" : "";
          const personalityPrompt = typeof localStorage !== "undefined" ? (localStorage.getItem("tune_custom_personality_prompt") || "").trim() : "";

          const clientTimeInfo = {
            iso: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Dhaka",
            localTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }),
            localDate: new Date().toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })
          };

          const activeOperationMode = this.operationMode || "manual";

          // Synchronize memory and custom personality instructions first before any speech setup so server can personalize immediately
          this.ws?.send(JSON.stringify({ 
            type: "syncMemory", 
            data: memoryData,
            chatHistory: recentDialogue,
            customApiKey: customApiKey,
            personalityPrompt: personalityPrompt,
            operationMode: activeOperationMode,
            askingMode: this.isAskingMode,
            clientTime: clientTimeInfo
          }));

          if (!this.isMuted) {
            await this.startStreaming();
          } else {
            this.updateState("listening");
          }
          this.startVolumePolling();
        } catch (err: any) {
          this.callbacks.onError(`Handshake and mic access failed: ${err.message || err}`);
          this.disconnect();
        }
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case "apiKeyRequired":
              console.warn("🔒 User personal Gemini API Key required by server");
              this.isUserDisconnecting = true;
              this.disconnect();
              this.callbacks.onError(msg.message || "Please connect your Gemini API Key.");
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("tune_open_api_key_modal", { detail: { required: true } }));
              }
              break;

            case "status":
              if (msg.state === "connected") {
                // Initial handshake completed, we are active
                this.updateState("listening");
              } else if (msg.state === "disconnected") {
                if (this.isUserDisconnecting) {
                  this.disconnect();
                } else {
                  console.log("⚡ Server signaled disconnect, auto-reconnecting...");
                  this.handleAutoReconnect();
                }
              } else if (msg.state === "connecting") {
                this.updateState("connecting");
              }
              break;

            case "state":
              if (msg.state === "thinking" && this.state !== "speaking") {
                this.updateState("thinking");
                if (this.thinkingTimeoutTimer) clearTimeout(this.thinkingTimeoutTimer);
                this.thinkingTimeoutTimer = setTimeout(() => {
                  if (this.state === "thinking") {
                    this.updateState("listening");
                  }
                }, 6000);
              } else if (msg.state === "listening") {
                if (this.thinkingTimeoutTimer) {
                  clearTimeout(this.thinkingTimeoutTimer);
                  this.thinkingTimeoutTimer = null;
                }
                if (this.state !== "disconnected" && this.state !== "connecting") {
                  this.updateState("listening");
                }
              }
              break;

            case "audio":
              // We received response voice chunks from Gemini
              if (this.thinkingTimeoutTimer) {
                clearTimeout(this.thinkingTimeoutTimer);
                this.thinkingTimeoutTimer = null;
              }
              // If a new turn was confirmed after an interruption, smoothly transition to the new answer
              if (this.hasPendingInterruption) {
                this.hasPendingInterruption = false;
                this.player.softInterruptAndReset(60);
              }
              if (this.state !== "speaking") {
                this.updateState("speaking");
              }
              if (!this.isSpeakerMuted) {
                this.player.playChunk(msg.data);
              } else {
                // In Silent Mode (Speaker Muted), maintain visual speaking feedback without audio output
                if (this.silentSpeakingTimer) clearTimeout(this.silentSpeakingTimer);
                this.silentSpeakingTimer = setTimeout(() => {
                  if (this.state === "speaking") {
                    this.updateState("listening");
                  }
                }, 1400);
              }
              break;

            case "interrupted":
              // Interruption signal: Duck volume softly without abruptly cutting off speech
              // ("ER MAJE JODI KONO KOTHA DETECT KORE TOKHON EKTU ASTE KOTHA BOLBE KINTU TAR KOTHA THAMABE NA")
              console.log("⚡ Tune: Voice detected - ducking playback softly to background");
              if (this.thinkingTimeoutTimer) {
                clearTimeout(this.thinkingTimeoutTimer);
                this.thinkingTimeoutTimer = null;
              }
              this.hasPendingInterruption = true;
              this.player.setDucked(true, 0.25);
              break;

            case "transcription":
              // We received real-time transcription, propagate to the UI subtitles
              const isResearchResult = msg.isResearch || msg.text.includes("[Google Web Research") || msg.text.includes("🔎");
              
              if (msg.isUser && msg.text) {
                const lowerText = msg.text.toLowerCase();
                if (
                  lowerText.includes("switch to asking mode") ||
                  lowerText.includes("asking mode on") ||
                  lowerText.includes("asking mode e jao") ||
                  lowerText.includes("asking mode e thako") ||
                  lowerText.includes("turn on asking mode") ||
                  lowerText.includes("asking mode chalu") ||
                  lowerText.includes("asking mode open") ||
                  lowerText.includes("asking mode enable") ||
                  lowerText.includes("tune bolar por") ||
                  lowerText.includes("tune bole dakle") ||
                  lowerText.includes("just ask korlei")
                ) {
                  this.isAskingMode = true;
                  if (typeof localStorage !== "undefined") {
                    localStorage.setItem("tune_asking_mode", "true");
                  }
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("pa_asking_mode_changed", { detail: { askingMode: true } }));
                  }
                  if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({ type: "setMode", mode: "asking" }));
                  }
                } else if (
                  lowerText.includes("switch to normal mode") ||
                  lowerText.includes("normal mode e jao") ||
                  lowerText.includes("turn off asking mode") ||
                  lowerText.includes("asking mode off") ||
                  lowerText.includes("asking mode bondho") ||
                  lowerText.includes("normal mood e") ||
                  lowerText.includes("normal mode on") ||
                  lowerText.includes("normal kotha bolo") ||
                  lowerText.includes("shobhabik kotha bolo")
                ) {
                  this.isAskingMode = false;
                  if (typeof localStorage !== "undefined") {
                    localStorage.setItem("tune_asking_mode", "false");
                  }
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("pa_asking_mode_changed", { detail: { askingMode: false } }));
                  }
                  if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({ type: "setMode", mode: "normal" }));
                  }
                }
              }

              const transcription: Transcription = {
                id: Math.random().toString(36).substring(2, 9),
                text: msg.text,
                isUser: msg.isUser,
                timestamp: new Date(),
                isResearch: isResearchResult,
                topic: msg.topic,
                sources: msg.sources || [],
                imageUrl: msg.imageUrl,
                visualImages: msg.visualImages || []
              };
              
              // Track in activeSessionDialogue so context is preserved if WS auto-reconnects
              this.activeSessionDialogue.push({
                id: transcription.id,
                text: transcription.text,
                isUser: transcription.isUser
              });
              if (this.activeSessionDialogue.length > 35) {
                this.activeSessionDialogue.shift();
              }

              this.callbacks.onTranscription(transcription);
              break;

            case "liveProgress":
            case "processStep":
              if (msg.processState) {
                if (this.callbacks.onProcessStateChange) {
                  this.callbacks.onProcessStateChange(msg.processState);
                }
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("tune_live_process_updated", { detail: { processState: msg.processState } }));
                }
              }
              break;

            case "toolCall":
              // Gemini requested a tool call. Execute and return output!
              this.updateState("thinking");
              const toolName = msg.name || "Tool";
              const toolArgs = msg.args || {};
              const searchTopic = toolArgs.topic || toolArgs.query || toolArgs.param1 || toolArgs.title || toolName;

              // Broadcast live process start to UI HUD
              const initialProcess: LiveProcessState = {
                id: `tool_${Date.now()}`,
                taskTitle: toolName === "performGoogleResearch" ? "Google Fact-Checking & Deep Research" :
                           toolName === "createInteractiveDraft" ? "Interactive Script & Document Drafting" :
                           toolName === "openWhiteboardTeacher" ? "Interactive Teacher Whiteboard Drawing" :
                           toolName === "createPAPlan" ? "Personal Assistant Goal & Roadmap Planning" :
                           toolName === "controlBrowser" ? "Live Browser Automation & Web Navigation" :
                           toolName === "searchYouTube" ? "YouTube Search & Media Retrieval" :
                           toolName === "identifySongByHumming" ? "Google Sound Search / Hum Identification" :
                           `Executing ${toolName}`,
                isProcessing: true,
                currentStepLabel: `Initializing: ${searchTopic}`,
                steps: [
                  { id: "s1", label: "Request Analysis & Grounding", status: "completed" },
                  { id: "s2", label: `Executing ${toolName} for "${searchTopic.substring(0, 30)}"`, status: "active" },
                  { id: "s3", label: "Synthesizing verified results & speech", status: "pending" }
                ],
                progressPercent: 40,
                voiceNotice: "Daran Boss, ami eita niye kaj korchi, ektu wait korun...",
                startTime: Date.now()
              };

              if (this.callbacks.onProcessStateChange) {
                this.callbacks.onProcessStateChange(initialProcess);
              }
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("tune_live_process_updated", { detail: { processState: initialProcess } }));
              }

              if (msg.name === "performGoogleResearch" || msg.name === "controlBrowser" || msg.name === "openWebsite" || msg.name === "searchYouTube") {
                this.callbacks.onTranscription({
                  id: "search_start_" + Date.now(),
                  text: `🔎 Daran Boss, ami Google e search kore dekhchi, ektu wait korun... ("${searchTopic}")`,
                  isUser: false,
                  timestamp: new Date(),
                  isResearch: true,
                  isSearching: true,
                  topic: searchTopic
                });
              }

              const output = await toolManagerInstance.execute(msg.name, msg.args);
              this.sendToolResponse(msg.name, msg.id, output);

              // Complete process state
              const completedProcess: LiveProcessState = {
                ...initialProcess,
                isProcessing: false,
                currentStepLabel: "Completed successfully",
                steps: initialProcess.steps.map(s => ({ ...s, status: "completed" })),
                progressPercent: 100
              };
              if (this.callbacks.onProcessStateChange) {
                this.callbacks.onProcessStateChange(completedProcess);
              }
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("tune_live_process_updated", { detail: { processState: completedProcess } }));
              }
              setTimeout(() => {
                if (this.callbacks.onProcessStateChange) {
                  this.callbacks.onProcessStateChange(null);
                }
              }, 2200);

              this.updateState("listening");
              break;

            case "memoryUpdated":
              console.log("💾 Long-term memory updated by companion:", msg.data);
              localStorage.setItem("tune_long_term_memory", JSON.stringify(msg.data));
              if (this.callbacks.onMemoryUpdated) {
                this.callbacks.onMemoryUpdated(msg.data);
              }
              break;

            case "paPlanUpdated":
              console.log("📅 Intelligent PA Plan updated via Live WS:", msg.plan);
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("pa_plan_updated", { detail: { plan: msg.plan } }));
              }
              break;

            case "interactiveDraft":
            case "draftCreated":
              console.log("📝 Interactive Draft created via WS:", msg.draft);
              if (msg.draft) {
                try {
                  localStorage.setItem("tune_active_draft", JSON.stringify(msg.draft));
                } catch {}
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("tune_interactive_draft_updated", { detail: { draft: msg.draft } }));
                }
              }
              break;

            case "whiteboardSession":
            case "whiteboardCreated":
              console.log("🎓 Whiteboard session received via WS:", msg.whiteboard);
              if (msg.whiteboard) {
                try {
                  localStorage.setItem("tune_active_whiteboard", JSON.stringify(msg.whiteboard));
                } catch {}
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("tune_whiteboard_updated", { detail: { whiteboard: msg.whiteboard } }));
                }
              }
              break;

            case "calculatorData":
            case "mathCalculated":
              console.log("🧮 Calculator data received via WS:", msg.calculation);
              if (msg.calculation && typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("tune_calculator_updated", { detail: { calculation: msg.calculation } }));
              }
              break;

            case "clockPopup":
            case "timeResolved":
              console.log("⏰ Clock popup data received via WS:", msg.timeData);
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("tune_clock_popup", { detail: { timeData: msg.timeData } }));
              }
              break;

            case "modeSwitched":
              console.log("⚡ Mode switched via tool command to:", msg.mode);
              const incomingMode = msg.mode || "manual";
              this.operationMode = incomingMode;
              const isAsking = incomingMode === "asking";
              this.isAskingMode = isAsking;
              if (typeof localStorage !== "undefined") {
                localStorage.setItem("tune_operation_mode", incomingMode);
                localStorage.setItem("tune_asking_mode", String(isAsking));
              }
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("tune_operation_mode_changed", { detail: { mode: incomingMode } }));
                window.dispatchEvent(new CustomEvent("pa_asking_mode_changed", { detail: { askingMode: isAsking } }));
              }
              break;

            case "error":
              this.callbacks.onError(msg.error);
              break;

            default:
              break;
          }
        } catch (err) {
          console.error("Error handling incoming WebSocket message:", err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn("WebSocket status/error:", err);
        if (!this.isUserDisconnecting) {
          this.handleAutoReconnect();
        } else {
          this.callbacks.onError("WebSocket connection lost.");
          this.disconnect();
        }
      };

      this.ws.onclose = () => {
        console.log("🔌 WebSocket connection closed");
        if (this.pingInterval) clearInterval(this.pingInterval);
        if (!this.isUserDisconnecting) {
          this.handleAutoReconnect();
        } else {
          this.disconnect();
        }
      };
    } catch (err: any) {
      if (!this.isUserDisconnecting) {
        this.handleAutoReconnect();
      } else {
        this.callbacks.onError(`Failed to establish connection: ${err.message || err}`);
        this.disconnect();
      }
    }
  }

  /**
   * Automatically attempts seamless reconnection when WebSocket drops unexpectedly.
   */
  private handleAutoReconnect(): void {
    if (this.isUserDisconnecting) return;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Auto-reconnecting attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
      this.updateState("connecting");

      // Notify subtitle UI of auto-reconnect attempt
      this.callbacks.onTranscription({
        id: "sys_reconnect_" + Date.now(),
        text: `🔄 (Connection auto-renewed seamlessly... conversation memory active!)`,
        isUser: false,
        timestamp: new Date()
      });

      if (this.ws) {
        try { this.ws.close(); } catch (e) {}
        this.ws = null;
      }

      setTimeout(() => {
        if (!this.isUserDisconnecting) {
          this.state = "disconnected"; // Allow connect() to execute
          this.connect();
        }
      }, 1000);
    } else {
      console.warn("⚠️ Max auto-reconnect attempts reached.");
      this.callbacks.onError("Connection lost. Please click Connect to resume with full conversation memory.");
      this.disconnect();
    }
  }

  /**
   * Disconnects the session explicitly when requested by user.
   */
  disconnect(): void {
    this.isUserDisconnecting = true;
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.stopVolumePolling();
    this.streamer.stop();
    this.player.stop();
    this.stopScreenShare();
    this.stopCameraShare();
    toolManagerInstance.cleanup();

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    this.updateState("disconnected");
    console.log("🔌 Session explicitly terminated by user.");
  }

  /**
   * Toggles microphone mute.
   */
  async toggleMute(): Promise<boolean> {
    this.isMuted = !this.isMuted;
    console.log(`🎙️ Mute toggled: ${this.isMuted}`);

    if (this.isMuted) {
      this.streamer.stop();
      if (this.state !== "disconnected" && this.state !== "connecting") {
        this.updateState("listening");
      }
    } else {
      if (this.state !== "disconnected" && this.state !== "connecting") {
        await this.startStreaming();
      }
    }
    return this.isMuted;
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Triggers a manual interruption.
   */
  triggerManualInterrupt(): void {
    if (this.player.getIsPlaying()) {
      this.player.stop();
      this.updateState("listening");
      
      // Send a dummy input to trigger interruption on Gemini side if playing
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Simple empty trigger
        this.ws.send(JSON.stringify({ type: "audio", data: "" }));
      }
    }
  }

  /**
   * Sends captured microphone chunks over WebSocket.
   */
  private async startStreaming(): Promise<void> {
    await this.streamer.start(
      (base64PCM) => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN && !this.isMuted) {
          this.ws.send(JSON.stringify({ type: "audio", data: base64PCM }));
        }
      },
      (userVolume) => {
        // Smart Voice Ducking:
        // When speech is detected while Tune is talking:
        // Lower Tune's volume to soft background voice (~28%), but DO NOT abruptly stop playback!
        // ("ER MAJE JODI KONO KOTHA DETECT KORE TOKHON EKTU ASTE KOTHA BOLBE KINTU TAR KOTHA THAMABE NA")
        if (this.player.getIsPlaying()) {
          if (userVolume > 0.08) {
            this.player.setDucked(true, 0.28);
            if (this.duckRestoreTimer) {
              clearTimeout(this.duckRestoreTimer);
              this.duckRestoreTimer = null;
            }
          } else if (userVolume < 0.04 && this.player.getIsDucked()) {
            if (!this.duckRestoreTimer) {
              this.duckRestoreTimer = setTimeout(() => {
                if (this.player.getIsPlaying()) {
                  this.player.setDucked(false);
                }
                this.duckRestoreTimer = null;
              }, 750);
            }
          }
        }
      }
    );
  }

  /**
   * Sends execution outcomes of tool calls back to Gemini.
   */
  private sendToolResponse(name: string, id: string, output: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: "toolResponse",
        name,
        id,
        output
      }));
    }
  }

  /**
   * Periodically poll mic and play volumes and frequency spectrum for visualization.
   */
  private startVolumePolling(): void {
    this.stopVolumePolling();
    this.volumePollInterval = setInterval(() => {
      // Real-time user mic volume & frequency spectrum
      const realUserVol = this.isMuted ? 0 : this.streamer.getVolume();
      const realAiVol = this.player.getVolume();
      
      const userFrequencies = this.isMuted ? new Array(16).fill(0) : this.streamer.getFrequencyData();
      const aiFrequencies = this.player.getFrequencies();

      // Track intentional human speech vs speech end silence
      if (realUserVol > 0.04 && !this.player.getIsPlaying()) {
        this.userSpeechFrames++;
        this.userSilenceFrames = 0;
      } else if (!this.player.getIsPlaying()) {
        if (this.userSpeechFrames >= 3) {
          this.userSilenceFrames++;
          // When user stops speaking after saying a phrase (approx 160ms of silence = 4 frames at 40ms)
          if (this.userSilenceFrames >= 4 && this.state === "listening") {
            this.userSpeechFrames = 0;
            this.userSilenceFrames = 0;
            this.updateState("thinking");

            if (this.thinkingTimeoutTimer) clearTimeout(this.thinkingTimeoutTimer);
            this.thinkingTimeoutTimer = setTimeout(() => {
              if (this.state === "thinking") {
                this.updateState("listening");
              }
            }, 8000);
          }
        }
      }

      // Update speaking vs listening state based on player
      if (this.state === "speaking" && !this.player.getIsPlaying()) {
        this.updateState("listening");
      }

      this.callbacks.onVolumeChange(
        this.player.getIsPlaying() ? 0 : realUserVol,
        realAiVol
      );

      if (this.callbacks.onFrequenciesChange) {
        this.callbacks.onFrequenciesChange(
          this.player.getIsPlaying() ? new Array(16).fill(0) : userFrequencies,
          aiFrequencies
        );
      }
    }, 40);
  }

  private stopVolumePolling(): void {
    if (this.volumePollInterval) {
      clearInterval(this.volumePollInterval);
      this.volumePollInterval = null;
    }
  }

  private updateState(newState: ConnectionState): void {
    this.state = newState;
    this.callbacks.onStateChange(newState);
  }

  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Keeps audio/mic session active when tab is running in background.
   */
  public keepAliveBackground(): void {
    this.player.resumeIfSuspended();
    this.streamer.resumeIfSuspended();

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: "Tune Companion - Always Active",
          artist: "Sondip AI Assistant",
          album: "Background Voice Session",
        });
        navigator.mediaSession.playbackState = "playing";
      } catch (err) {}
    }
  }

  /**
   * Starts screen capture using navigator.mediaDevices.getDisplayMedia and streams frames.
   */
  async startScreenShare(targetMode: 'entire' | 'tab' = 'entire'): Promise<void> {
    if (this.isScreenSharing) return;

    if (!navigator?.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== "function") {
      throw new Error("Screen sharing is not supported in this browser or iframe context. Please click 'Open in a new tab' at top right to use screen sharing!");
    }

    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 5, max: 15 },
          displaySurface: targetMode === 'entire' ? 'monitor' : 'browser',
        } as any,
        audio: false,
        surfaceSwitching: "include",
        selfBrowserSurface: targetMode === 'entire' ? "exclude" : "include",
      } as any);

      const videoTrack = this.screenStream.getVideoTracks()[0];
      
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const videoEl = document.createElement("video");
      videoEl.srcObject = this.screenStream;
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.muted = true;

      await new Promise<void>((resolve) => {
        videoEl.onloadedmetadata = () => {
          videoEl.play().then(() => resolve()).catch(() => resolve());
        };
      });

      this.isScreenSharing = true;
      if (this.callbacks.onScreenShareChange) {
        this.callbacks.onScreenShareChange(true);
      }

      // Notify Tune server that screen sharing has actively started
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: "screenShareStarted"
        }));
      }

      this.screenInterval = setInterval(() => {
        if (!this.isScreenSharing || !ctx || videoTrack.readyState === "ended") {
          this.stopScreenShare();
          return;
        }

        const vw = videoEl.videoWidth || 1920;
        const vh = videoEl.videoHeight || 1080;
        // Scale up to 1280 width with high sharpness for crystal clear OCR text & math symbols
        const scale = Math.min(1.0, 1280 / Math.max(1, vw));
        canvas.width = Math.round(vw * scale);
        canvas.height = Math.round(vh * scale);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

        const base64JPEG = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
        if (base64JPEG && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: "video",
            data: base64JPEG,
            mimeType: "image/jpeg"
          }));
        }
      }, 1000); // Send 1 frame per second as per Live API requirements

      videoTrack.onended = () => {
        this.stopScreenShare();
      };

    } catch (err) {
      console.error("Failed to start screen share:", err);
      this.stopScreenShare();
      throw err;
    }
  }

  /**
   * Stops active screen sharing.
   */
  stopScreenShare(): void {
    const wasSharing = this.isScreenSharing;
    this.isScreenSharing = false;
    
    if (this.screenInterval) {
      clearInterval(this.screenInterval);
      this.screenInterval = null;
    }
    
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }
    
    if (wasSharing && this.callbacks.onScreenShareChange) {
      this.callbacks.onScreenShareChange(false);
    }
    if (wasSharing && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: "screenShareStopped"
      }));
    }
    console.log("🖥️ Screen sharing stopped.");
  }

  getIsScreenSharing(): boolean {
    return this.isScreenSharing;
  }

  /**
   * Triggers an immediate step-by-step math analysis on the currently shared screen.
   */
  async requestScreenMathExplanation(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Tune is not connected. Please connect first.");
    }

    let frameBase64: string | null = null;
    if (this.isScreenSharing) {
      const dataUrl = await this.captureSingleScreenFrame();
      if (dataUrl) {
        frameBase64 = dataUrl.split(",")[1] || null;
      }
    }

    this.ws.send(JSON.stringify({
      type: "screenMathRequest",
      frame: frameBase64
    }));
  }

  /**
   * Captures a single high-quality snapshot frame from active screen share or requests display media frame.
   */
  async captureSingleScreenFrame(): Promise<string | null> {
    if (this.isScreenSharing && this.screenStream) {
      const videoTrack = this.screenStream.getVideoTracks()[0];
      if (videoTrack && videoTrack.readyState === "live") {
        try {
          const videoEl = document.createElement("video");
          videoEl.srcObject = this.screenStream;
          videoEl.autoplay = true;
          videoEl.muted = true;
          await new Promise<void>((r) => {
            videoEl.onloadedmetadata = () => videoEl.play().then(() => r()).catch(() => r());
          });
          const canvas = document.createElement("canvas");
          canvas.width = videoEl.videoWidth || 1280;
          canvas.height = videoEl.videoHeight || 720;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL("image/jpeg", 0.85);
          }
        } catch (e) {
          console.warn("Failed to capture frame from active stream:", e);
        }
      }
    }

    if (typeof navigator !== "undefined" && navigator?.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === "function") {
      try {
        const tempStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } } as any,
          audio: false
        } as any);

        const videoEl = document.createElement("video");
        videoEl.srcObject = tempStream;
        videoEl.autoplay = true;
        videoEl.muted = true;
        await new Promise<void>((r) => {
          videoEl.onloadedmetadata = () => videoEl.play().then(() => r()).catch(() => r());
        });

        await new Promise((r) => setTimeout(r, 250));

        const canvas = document.createElement("canvas");
        canvas.width = videoEl.videoWidth || 1280;
        canvas.height = videoEl.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        let dataUrl: string | null = null;
        if (ctx) {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        }

        tempStream.getTracks().forEach((t) => t.stop());
        return dataUrl;
      } catch (err) {
        console.warn("Single frame displayMedia capture failed or cancelled by user:", err);
      }
    }

    return null;
  }

  public getCameraVideoElement(): HTMLVideoElement | null {
    return this.cameraVideoEl;
  }

  /**
   * Starts camera capture using navigator.mediaDevices.getUserMedia and streams video frames.
   */
  async startCameraShare(): Promise<void> {
    if (this.isCameraSharing) return;

    if (!navigator?.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      throw new Error("Camera vision is not supported in this browser or iframe context. Please click 'Open in a new tab' at top right.");
    }

    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 1 },
          facingMode: "user"
        },
        audio: false
      });

      const videoTrack = this.cameraStream.getVideoTracks()[0];
      
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      this.cameraVideoEl = document.createElement("video");
      this.cameraVideoEl.srcObject = this.cameraStream;
      this.cameraVideoEl.autoplay = true;
      this.cameraVideoEl.playsInline = true;
      this.cameraVideoEl.muted = true;

      const videoEl = this.cameraVideoEl;

      await new Promise<void>((resolve) => {
        videoEl.onloadedmetadata = () => {
          videoEl.play().then(() => resolve()).catch(() => resolve());
        };
      });

      this.isCameraSharing = true;
      if (this.callbacks.onCameraShareChange) {
        this.callbacks.onCameraShareChange(true);
      }

      this.cameraInterval = setInterval(() => {
        if (!this.isCameraSharing || !ctx || videoTrack.readyState === "ended") {
          this.stopCameraShare();
          return;
        }

        canvas.width = videoEl.videoWidth || 640;
        canvas.height = videoEl.videoHeight || 480;
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

        const base64JPEG = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
        if (base64JPEG && this.ws && this.ws.readyState === WebSocket.OPEN) {
          console.log("📷 Sending camera vision frame to proxy");
          this.ws.send(JSON.stringify({
            type: "video",
            data: base64JPEG,
            mimeType: "image/jpeg"
          }));
        }
      }, 1000);

      videoTrack.onended = () => {
        this.stopCameraShare();
      };

    } catch (err) {
      console.error("Failed to start camera vision:", err);
      this.stopCameraShare();
      throw err;
    }
  }

  /**
   * Stops active camera vision sharing completely.
   */
  stopCameraShare(): void {
    const wasSharing = this.isCameraSharing;
    this.isCameraSharing = false;
    
    if (this.cameraInterval) {
      clearInterval(this.cameraInterval);
      this.cameraInterval = null;
    }

    if (this.cameraVideoEl) {
      try {
        this.cameraVideoEl.pause();
        this.cameraVideoEl.srcObject = null;
      } catch (e) {
        // Ignore video cleanup error
      }
      this.cameraVideoEl = null;
    }
    
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((track) => {
        try {
          track.enabled = false;
          track.stop();
        } catch (e) {
          // Ignore track stop error
        }
      });
      this.cameraStream = null;
    }
    
    if (wasSharing && this.callbacks.onCameraShareChange) {
      this.callbacks.onCameraShareChange(false);
    }
    console.log("📷 Camera vision sharing fully stopped and device released.");
  }

  getIsCameraSharing(): boolean {
    return this.isCameraSharing;
  }

  setCrowdedMode(enabled: boolean): void {
    this.streamer.setCrowdedMode(enabled);
  }

  getCrowdedMode(): boolean {
    return this.streamer.getCrowdedMode();
  }

  setMood(mood: string): void {
    // Configures tone-aware acoustic output settings on player
    this.player.setMoodTone(mood);

    // Optionally notify server over WebSocket if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: "moodUpdate",
          mood
        }));
      } catch (err) {
        // Safe send error catch
      }
    }
  }

  setNoiseStatusCallback(cb: (status: any) => void): void {
    this.streamer.setNoiseStatusCallback(cb);
  }

  /**
   * Sets voice detection sensitivity and distance threshold (1 to 100).
   */
  setVoiceSensitivity(sensitivity: number): void {
    this.streamer.setSensitivity(sensitivity);
  }

  getVoiceSensitivity(): number {
    return this.streamer.getSensitivity();
  }

  /**
   * Sets whether Tune's voice sound output is muted (Silent text-only mode).
   */
  setSpeakerMuted(muted: boolean): void {
    this.isSpeakerMuted = muted;
    this.player.setMuted(muted);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("tune_speaker_muted", String(muted));
    }
    console.log("🔊 LiveSession: Speaker Muted set to:", muted);
  }

  getIsSpeakerMuted(): boolean {
    return this.isSpeakerMuted;
  }

  /**
   * Sets the active operation mode:
   * 'manual' (Manual Mentorship: step-by-step guidance, research delivery, zero idle talk, comprehension checks)
   * 'auto' (Auto Mode: direct execution of tasks)
   * 'normal' (Conversational companion)
   * 'asking' (Silent on-demand listener)
   */
  setOperationMode(mode: "manual" | "auto" | "normal" | "asking"): void {
    this.operationMode = mode;
    this.isAskingMode = mode === "asking";
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("tune_operation_mode", mode);
      localStorage.setItem("tune_asking_mode", String(mode === "asking"));
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type: "switchMode",
          mode
        }));
      } catch (err) {
        console.error("Failed to send switchMode via WebSocket:", err);
      }
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tune_operation_mode_changed", { detail: { mode } }));
      window.dispatchEvent(new CustomEvent("pa_asking_mode_changed", { detail: { askingMode: mode === "asking" } }));
    }
    console.log("⚡ LiveSession: Operation mode switched to:", mode);
  }

  getOperationMode(): "manual" | "auto" | "normal" | "asking" {
    return this.operationMode;
  }

  /**
   * Sends a user text prompt to the Gemini Live session (e.g., from interactive whiteboard quick ask)
   */
  sendTextPrompt(text: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            type: "textPrompt",
            text,
          })
        );
      } catch (err) {
        console.error("Failed to send textPrompt via LiveSession:", err);
      }
    }
  }
}
export default LiveSession;
