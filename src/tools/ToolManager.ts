import { Reminder, ActiveTimer, AmbientSoundType, AllowedApplication, DeviceLog, ActiveDraft, WhiteboardSession, WhiteboardLessonStep } from "../types";

export type ToolEventListener = (event: {
  type: string;
  data: any;
}) => void;

/**
 * ToolManager coordinates the execution of client-side tools called by Gemini.
 * It provides the raw output results to send back to the server and emits
 * events so the React UI can dynamically render the tool's visual impacts.
 */
export class ToolManager {
  private listeners: Set<ToolEventListener> = new Set();
  private ambientAudios: Record<string, HTMLAudioElement | null> = {
    rain: null,
    forest: null,
    waves: null,
  };
  private currentPlayingSound: AmbientSoundType = "off";

  // Security - Allowed Application List
  private allowedApplications: AllowedApplication[] = [
    { name: "Google Chrome", category: "Web Browser", description: "Standard secure web browser client", logo: "🌐", autoApprove: true },
    { name: "Visual Studio Code", category: "IDE & Editor", description: "Primary software editing engine", logo: "💻", autoApprove: false },
    { name: "Spotify", category: "Media & Audio", description: "Audio streaming provider", logo: "🎵", autoApprove: false },
    { name: "Downloads", category: "File System", description: "Local user downloads directory", logo: "📥", autoApprove: true },
    { name: "Terminal", category: "Developer Tool", description: "Command-line terminal console", logo: "🐚", autoApprove: false },
    { name: "Slack", category: "Communication", description: "Team communication interface", logo: "💬", autoApprove: false },
    { name: "Discord", category: "Communication", description: "Community voice and chat platform", logo: "👾", autoApprove: false },
    { name: "Zoom", category: "Meeting Client", description: "Video conference portal", logo: "📹", autoApprove: false },
  ];

  // Device Logs
  private logs: DeviceLog[] = [];

  // Tracked opened windows/tabs for smart primary vs background tab management
  private openedTabs: {
    id: string;
    tab: Window;
    url: string;
    openedAt: number;
    isPrimary: boolean;
    autoCloseTimer?: any;
  }[] = [];

  // Hardware states (Future extension simulation)
  private volume: number = 75;
  private brightness: number = 80;
  private cameraActive: boolean = false;
  private bypassSecurity: boolean = typeof window !== "undefined"
    ? localStorage.getItem("tune_bypass_security") !== "false"
    : true;

  constructor() {
    // Setup high-quality static looping ambient sound URLs
    if (typeof window !== "undefined") {
      this.ambientAudios.rain = new Audio("https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg");
      this.ambientAudios.rain.loop = true;

      this.ambientAudios.forest = new Audio("https://actions.google.com/sounds/v1/ambiences/morning_birds.ogg");
      this.ambientAudios.forest.loop = true;

      this.ambientAudios.waves = new Audio("https://actions.google.com/sounds/v1/water/sea_waves.ogg");
      this.ambientAudios.waves.loop = true;
    }
  }

  /**
   * Subscribe to tool execution events (to update state in React).
   */
  subscribe(listener: ToolEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(type: string, data: any): void {
    this.listeners.forEach((listener) => {
      try {
        listener({ type, data });
      } catch (err) {
        console.error("Error in tool listener:", err);
      }
    });
  }

  /**
   * Translates fuzzy user voice inputs into structured application names.
   */
  public resolveApplicationName(input: string): string {
    const clean = input.toLowerCase().trim();
    if (clean.includes("coding") || clean.includes("code") || clean.includes("vs code") || clean.includes("editor") || clean.includes("programming") || clean.includes("visual studio")) {
      return "Visual Studio Code";
    }
    if (clean.includes("music") || clean.includes("spotify") || clean.includes("song") || clean.includes("playlist") || clean.includes("audio")) {
      return "Spotify";
    }
    if (clean.includes("browser") || clean.includes("chrome") || clean.includes("web") || clean.includes("internet") || clean.includes("google")) {
      return "Google Chrome";
    }
    if (clean.includes("downloads") || clean.includes("download folder") || clean.includes("my download")) {
      return "Downloads";
    }
    if (clean.includes("terminal") || clean.includes("command") || clean.includes("shell") || clean.includes("bash") || clean.includes("console")) {
      return "Terminal";
    }
    if (clean.includes("slack") || clean.includes("work chat") || clean.includes("workspace messenger")) {
      return "Slack";
    }
    if (clean.includes("discord") || clean.includes("gaming chat") || clean.includes("guild")) {
      return "Discord";
    }
    if (clean.includes("zoom") || clean.includes("meeting") || clean.includes("video call")) {
      return "Zoom";
    }
    // Fallback capitalizations
    return input.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  /**
   * Adds a record to the live device audit log.
   */
  private addLog(action: string, status: "success" | "pending" | "denied", details: string): DeviceLog {
    const log: DeviceLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date(),
      action,
      status,
      details,
    };
    this.logs.unshift(log);
    this.emit("deviceLogAdded", log);
    return log;
  }

  /**
   * Prompts the user with a sleek UI popup for verification.
   */
  private async requestUserPermission(actionName: string, details: string): Promise<boolean> {
    if (this.bypassSecurity) {
      this.addLog(actionName, "success", `Auto-Authorized (Bypass Active): ${details}`);
      return true;
    }

    const logId = this.addLog(actionName, "pending", `Awaiting user permission: ${details}`).id;
    
    return new Promise<boolean>((resolve) => {
      this.emit("permissionRequested", {
        id: Math.random().toString(36).substring(2, 9),
        actionName,
        details,
        resolve: (approved: boolean) => {
          // Update the log status based on decision
          const logIndex = this.logs.findIndex(l => l.id === logId);
          if (logIndex !== -1) {
            this.logs[logIndex].status = approved ? "success" : "denied";
            this.logs[logIndex].details = approved 
              ? `Authorized by user. ${details}`
              : `Denied by user. ${details}`;
            this.emit("deviceLogsUpdated", [...this.logs]);
          }
          resolve(approved);
        }
      });
    });
  }

  /**
   * Main entry point to execute a tool.
   * Runs the local side-effect and returns a result payload to send back to Gemini.
   */
  async execute(name: string, args: any): Promise<any> {
    console.log(`🔧 Executing tool: ${name} with args:`, args);
    this.emit("toolStart", { name, args });

    try {
      let output: any = null;

      switch (name) {
        case "openWebsite":
          output = await this.openWebsite(args.url, args.autoCloseSeconds || args.temporarySeconds);
          break;

        case "closeWebsite":
          output = await this.closeWebsite();
          break;

        case "getWeather":
          output = await this.getWeather(args.location);
          break;

        case "getDateTime":
        case "getCurrentTime":
          output = await this.getDateTime(args.timezone);
          break;

        case "createReminder":
          output = await this.createReminder(args.text, args.time);
          break;

        case "setTimer":
          output = await this.setTimer(args.duration || args.time, args.label || args.title || args.text);
          break;

        case "playAmbientSound":
          output = await this.playAmbientSound(args.soundType);
          break;

        // --- REAL FUNCTIONAL DEVICE & APPLICATION CONTROLS ---
        case "openApplication":
          output = await this.openApplication(args.appName);
          break;

        case "launchProgram":
          output = await this.launchProgram(args.programName);
          break;

        case "executeShellCommand":
          output = await this.executeShellCommand(args.command);
          break;

        case "closeProgram":
          output = await this.closeProgram(args.programName);
          break;

        case "requestScreenShare":
          output = await this.requestScreenShare(args.reason);
          break;

        case "requestCameraShare":
          output = await this.requestCameraShare(args.action, args.reason);
          break;

        case "getUserLocation":
          output = await this.getUserLocation();
          break;

        case "analyzeScreenContent":
          output = await this.analyzeScreenContent(args.focusQuery || args.query);
          break;

        case "controlBrowser":
          output = await this.controlBrowser(args.action, args.param1, args.param2);
          break;

        case "searchYouTube":
          output = await this.searchYouTube(args.query, args.specificSectionOrTimestamp);
          break;

        case "identifySongByHumming":
          output = await this.identifySongByHumming(
            args.hummedMelodyOrLyrics,
            args.genreOrLanguage,
            args.candidateSongTitle,
            args.candidateArtist
          );
          break;

        case "performGoogleResearch":
          output = await this.performGoogleResearch(args.topic || args.query || "General search");
          break;

        case "createInteractiveDraft":
          output = await this.createInteractiveDraft(
            args.title,
            args.contentType,
            args.content,
            args.summary
          );
          break;

        case "openWhiteboardTeacher":
          output = await this.openWhiteboardTeacher(
            args.topic,
            args.conceptSummary,
            args.steps
          );
          break;

        case "calculateMath":
          output = await this.calculateMath(
            args.expression || args.expr || args.query,
            args.result,
            args.operationType,
            args.steps
          );
          break;

        default:
          throw new Error(`Tool '${name}' is not supported.`);
      }

      console.log(`✅ Tool ${name} execution result:`, output);
      this.emit("toolSuccess", { name, args, output });
      return output;
    } catch (err: any) {
      console.error(`❌ Tool ${name} failed:`, err);
      this.emit("toolFailure", { name, args, error: err.message || err });
      return { error: err.message || "Failed to execute tool" };
    }
  }

  /**
   * Conducts Google web research as fallback.
   */
  private async performGoogleResearch(topic: string): Promise<any> {
    console.log(`🔎 Performing client-fallback Google Research for topic: "${topic}"`);
    try {
      const response = await fetch("/api/browser/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search", param1: topic })
      });
      const data = await response.json();
      return {
        status: "success",
        topic,
        researchSummary: data.result || `Completed Google Web Research for "${topic}".`
      };
    } catch (err: any) {
      return {
        status: "success",
        topic,
        researchSummary: `Executed Google Search query for "${topic}".`
      };
    }
  }

  /**
   * Google Sound Search & Hum to Find Song: Identifies song from hummed notes/lyrics and opens YouTube search
   */
  private async identifySongByHumming(
    hummedMelodyOrLyrics: string,
    genreOrLanguage?: string,
    candidateSongTitle?: string,
    candidateArtist?: string
  ): Promise<any> {
    console.log(`🎵 Client-side identifySongByHumming: "${hummedMelodyOrLyrics}"`);
    const title = candidateSongTitle || "Identified Song";
    const artist = candidateArtist || "Singer";
    const query = `${title} ${artist}`.trim();
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

    // Open YouTube search as primary tab directly
    await this.openWebsite(ytUrl);

    return {
      success: true,
      hummedMelodyOrLyrics,
      songTitle: title,
      artist,
      youtubeUrl: ytUrl,
      message: `Identified hummed melody and opened YouTube search for "${query}".`
    };
  }

  /**
   * Creates an interactive draft (script, email, article, code, notes) for Boss
   * and opens the interactive draft modal with 1-click copy, live editing, and download tools.
   */
  private async createInteractiveDraft(
    title?: string,
    contentType?: "script" | "email" | "article" | "code" | "notes" | "letter" | "general",
    content?: string,
    summary?: string
  ): Promise<any> {
    console.log(`📝 Creating interactive draft: "${title}" (${contentType})`);
    const draft: ActiveDraft = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: title || "Untitled Draft",
      contentType: contentType || "general",
      content: content || "",
      summary: summary || `Draft: ${title || "New Document"}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem("tune_active_draft", JSON.stringify(draft));
      } catch (e) {
        console.warn("Failed to store draft in localStorage:", e);
      }
    }

    // Emit event to update React UI
    this.emit("draftCreated", { draft });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tune_interactive_draft_updated", { detail: { draft } }));
    }

    return {
      success: true,
      draftId: draft.id,
      title: draft.title,
      contentType: draft.contentType,
      wordCount: draft.content.trim().split(/\s+/).filter(Boolean).length,
      message: `Draft '${draft.title}' has been successfully created and opened on Boss's screen with 1-click Copy, Live Edit, and Download tools.`
    };
  }

  /**
   * Opens an interactive real-time whiteboard modal and draws diagrams, formulas, and visual concepts
   * like an active teacher.
   */
  private async openWhiteboardTeacher(
    topic?: string,
    conceptSummary?: string,
    steps?: WhiteboardLessonStep[]
  ): Promise<any> {
    console.log(`🎓 Opening Teacher Whiteboard for: "${topic}"`);
    const session: WhiteboardSession = {
      id: `wb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      topic: topic || "Lesson Topic",
      conceptSummary: conceptSummary || "Interactive Whiteboard Demonstration",
      activeStepIndex: 0,
      steps: steps && steps.length > 0 ? steps : [
        {
          stepNumber: 1,
          title: topic || "Core Concept Overview",
          explanation: conceptSummary || "Step-by-step whiteboard explanation",
          elements: [
            {
              id: "node_1",
              type: "box",
              label: topic || "Concept Root",
              sublabel: "Fundamental Principle",
              x: 50,
              y: 50,
              color: "#2563eb",
              bgColor: "#eff6ff"
            }
          ]
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem("tune_active_whiteboard", JSON.stringify(session));
      } catch (e) {
        console.warn("Failed to store whiteboard in localStorage:", e);
      }
    }

    this.emit("whiteboardCreated", { whiteboard: session });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tune_whiteboard_updated", { detail: { whiteboard: session } }));
    }

    return {
      success: true,
      whiteboardId: session.id,
      topic: session.topic,
      stepsCount: session.steps.length,
      message: `Interactive teacher whiteboard for '${session.topic}' has been launched on Boss's screen with step-by-step drawing visuals.`
    };
  }

  /**
   * Tool: calculateMath
   * Computes math calculation and opens the real-time floating calculator on Boss's screen.
   */
  public async calculateMath(
    expression: string,
    result?: string,
    operationType?: string,
    steps?: string
  ): Promise<any> {
    console.log(`🧮 Tool calculateMath: "${expression}"`);
    let finalResult = result;
    if (!finalResult && expression) {
      try {
        const clean = expression
          .replace(/×/g, "*")
          .replace(/÷/g, "/")
          .replace(/−/g, "-")
          .replace(/,/g, "")
          .replace(/(\d+(\.\d+)?)%/g, "($1/100)")
          .trim();
        const compute = new Function(`'use strict'; return (${clean})`);
        const val = compute();
        if (typeof val === "number" && !isNaN(val) && isFinite(val)) {
          finalResult = Number(Math.round(Number(val + "e+8")) + "e-8").toLocaleString("en-US");
        }
      } catch (e) {
        finalResult = "Calculated";
      }
    }

    const payload = {
      expression: expression || "Math",
      result: finalResult || "0",
      operationType: operationType || "math",
      steps: steps || `${expression} = ${finalResult || "0"}`,
      timestamp: Date.now()
    };

    this.emit("calculatorUpdated", payload);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tune_calculator_updated", { detail: { calculation: payload } }));
    }

    return {
      success: true,
      expression: payload.expression,
      result: payload.result,
      steps: payload.steps,
      message: `Calculated: ${payload.expression} = ${payload.result}. Realtime calculator is now showing on Boss's screen.`
    };
  }

  /**
   * Tool: getDateTime
   * Resolves current date/time and opens the Clock Popup modal.
   */
  public async getDateTime(timezone?: string): Promise<any> {
    const targetTz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Dhaka";
    const now = new Date();
    const time12 = now.toLocaleTimeString("en-US", { timeZone: targetTz, hour: "numeric", minute: "2-digit", hour12: true });
    const dayNamesBn = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
    const monthNamesBn = [
      "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
      "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
    ];
    const dayNameBn = dayNamesBn[now.getDay()];
    const dateBn = `${now.getDate()} ${monthNamesBn[now.getMonth()]}, ${now.getFullYear()}`;

    const payload = {
      time12,
      timezone: targetTz,
      dateBn,
      dayNameBn,
      timestamp: Date.now()
    };

    this.emit("clockPopup", payload);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tune_clock_popup", { detail: { timeData: payload } }));
    }

    return {
      success: true,
      currentTime: time12,
      timezone: targetTz,
      date: dateBn,
      day: dayNameBn,
      message: `Current time is ${time12} (${targetTz}). Opened the live clock popup for Boss.`
    };
  }

  // --- DEVICE CONTROLS IMPLEMENTATION ---

  /**
   * Dispatches a command to the remote companion on the user's local PC.
   */
  private async dispatchToCompanion(action: string, payload: any): Promise<boolean> {
    try {
      const response = await fetch("/api/pc/connection-status");
      const status = await response.json();
      if (status.active) {
        await fetch("/api/pc/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, payload })
        });
        return true;
      }
    } catch (err) {
      console.warn("Failed to dispatch to PC companion:", err);
    }
    return false;
  }

  /**
   * Runs a shell command on your real PC via the companion script.
   */
  private async executeShellCommand(command: string): Promise<any> {
    const allowed = await this.requestUserPermission(
      "Execute CLI Command",
      `Execute shell command: "${command}"`
    );

    if (!allowed) {
      return {
        success: false,
        action: "denied",
        reason: "User denied console command execution permission."
      };
    }

    const remoteActive = await this.dispatchToCompanion("execute_shell", { command });

    this.addLog("Execute CLI Command", "success", `Command executed: ${command} ${remoteActive ? "(on local PC)" : ""}`);
    
    if (remoteActive) {
      // Since it's async polling, let's wait a couple of seconds to see if there is an update in the logs!
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      try {
        const logsRes = await fetch("/api/pc/logs");
        const data = await logsRes.json();
        const latestLog = data.logs?.[0];
        if (latestLog && latestLog.action === "execute_shell") {
          return {
            success: latestLog.status === "success",
            action: "executed_remote",
            command,
            output: latestLog.details,
            message: `Command executed on your actual PC: ${latestLog.details}`
          };
        }
      } catch (err) {
        // Log fetch failed
      }

      return {
        success: true,
        action: "dispatched",
        command,
        message: `Successfully sent terminal command to execute on your actual PC. Keep an eye on your console or companion logs for outputs!`
      };
    }

    return {
      success: true,
      action: "simulated_shell",
      command,
      output: `[SIMULATED] Executing '${command}' in virtual container. Run the PC Companion to execute real commands on your local device.`,
      message: `Executed simulated terminal command '${command}' successfully.`
    };
  }

  private async openApplication(appName: string): Promise<any> {
    const targetAppName = this.resolveApplicationName(appName);
    
    // Check security checklist configuration
    const config = this.allowedApplications.find(
      app => app.name.toLowerCase() === targetAppName.toLowerCase()
    );

    const requiresConfirm = !config || !config.autoApprove;

    if (requiresConfirm) {
      const allowed = await this.requestUserPermission(
        "Open Application",
        `Start program: ${targetAppName}`
      );
      if (!allowed) {
        return {
          success: false,
          action: "denied",
          reason: "User denied device permission request.",
          application: targetAppName
        };
      }
    }

    // Try to open on local PC via companion!
    const remoteActive = await this.dispatchToCompanion("open_app", { appName: targetAppName });

    // Process the successful opening simulation
    this.addLog("Open Application", "success", `Successfully launched ${targetAppName} ${remoteActive ? "(on local PC)" : ""}`);
    
    // Notify React UI to display an amazing mock virtual OS window of the application!
    this.emit("applicationOpened", { appName: targetAppName, remoteActive });

    return {
      success: true,
      action: "opened",
      application: targetAppName,
      remoteActive,
      message: remoteActive
        ? `Successfully launched real program "${targetAppName}" on your local PC!`
        : `Successfully launched mock virtual ${targetAppName} on your workspace screen.`
    };
  }

  private async launchProgram(programName: string): Promise<any> {
    // Treat similar to openApplication for seamless experience
    return this.openApplication(programName);
  }

  private async closeProgram(programName: string): Promise<any> {
    const targetProgramName = this.resolveApplicationName(programName);

    const allowed = await this.requestUserPermission(
      "Terminate Program",
      `Force stop application: ${targetProgramName}`
    );

    if (!allowed) {
      return {
        success: false,
        action: "denied",
        reason: "User declined termination request for security.",
        program: targetProgramName
      };
    }

    // Try to close on local PC via companion!
    const remoteActive = await this.dispatchToCompanion("close_app", { appName: targetProgramName });

    this.addLog("Terminate Program", "success", `Stopped process: ${targetProgramName} ${remoteActive ? "(on local PC)" : ""}`);
    this.emit("applicationClosed", { appName: targetProgramName, remoteActive });

    return {
      success: true,
      action: "closed",
      program: targetProgramName,
      remoteActive,
      message: remoteActive
        ? `Successfully terminated process for "${targetProgramName}" on your local PC.`
        : `Process for ${targetProgramName} was closed safely.`
    };
  }

  private async openFile(fileName: string): Promise<any> {
    const cleanFileName = fileName.trim();
    
    // Security check for file access
    const allowed = await this.requestUserPermission(
      "Read Local File",
      `Accessing file: "${cleanFileName}"`
    );

    if (!allowed) {
      return {
        success: false,
        action: "denied",
        reason: "Access to the requested file was denied by the user."
      };
    }

    const mockFilePath = `/Users/tune/Documents/${cleanFileName}`;
    this.addLog("Read Local File", "success", `Opened file: ${cleanFileName}`);
    this.emit("fileOpened", { fileName: cleanFileName, path: mockFilePath });

    return {
      success: true,
      action: "opened_file",
      fileName: cleanFileName,
      path: mockFilePath,
      message: `Successfully loaded file "${cleanFileName}" into editor.`
    };
  }

  private async openFolder(folderPath: string): Promise<any> {
    // Resolve smart names like "downloads"
    let targetPath = folderPath.trim();
    if (targetPath.toLowerCase() === "downloads") {
      targetPath = "/Users/tune/Downloads";
    }

    const allowed = await this.requestUserPermission(
      "Navigate Directory",
      `Open folder directory: ${targetPath}`
    );

    if (!allowed) {
      return {
        success: false,
        action: "denied",
        reason: "Folder access permission rejected."
      };
    }

    this.addLog("Navigate Directory", "success", `Opened folder view: ${targetPath}`);
    this.emit("folderOpened", { folderPath: targetPath });

    return {
      success: true,
      action: "opened_folder",
      folderPath: targetPath,
      message: `Directory folder view resolved at: ${targetPath}`
    };
  }

  private async searchOnDevice(query: string): Promise<any> {
    this.addLog("Search Local Disk", "success", `Searched indexes for: "${query}"`);

    // Dynamic mock search results
    const results = [
      { name: `${query}_final_v2.pdf`, path: `/Users/tune/Documents/${query}_final_v2.pdf`, size: "2.4 MB" },
      { name: `notes_on_${query}.txt`, path: `/Users/tune/Downloads/notes_on_${query}.txt`, size: "14 KB" },
      { name: `archive_${query}.zip`, path: `/Users/tune/Archive/archive_${query}.zip`, size: "48.2 MB" }
    ];

    return {
      success: true,
      action: "searched",
      query,
      results,
      message: `Found ${results.length} files matching the criteria on your disk.`
    };
  }

  // --- FUTURE EXTENSIONS SIMULATION ---

  private async adjustVolume(level: number): Promise<any> {
    this.volume = Math.max(0, Math.min(100, level));
    this.addLog("Volume Adjust", "success", `Set master volume to ${this.volume}%`);
    
    // Dispatch to local PC companion!
    const remoteActive = await this.dispatchToCompanion("adjust_volume", { level: this.volume });

    this.emit("hardwareStateChanged", { type: "volume", value: this.volume, remoteActive });
    return { 
      success: true, 
      volume: this.volume, 
      remoteActive,
      message: remoteActive 
        ? `Successfully updated volume to ${this.volume}% on your local computer!`
        : `System volume updated to ${this.volume}%.` 
    };
  }

  private async adjustBrightness(level: number): Promise<any> {
    this.brightness = Math.max(0, Math.min(100, level));
    this.addLog("Brightness Adjust", "success", `Set display brightness to ${this.brightness}%`);
    this.emit("hardwareStateChanged", { type: "brightness", value: this.brightness });
    return { success: true, brightness: this.brightness, message: `Screen brightness level adjusted to ${this.brightness}%.` };
  }

  private async takeScreenshot(): Promise<any> {
    this.addLog("Capture Screenshot", "success", `Saved workspace screenshot capture.`);
    this.emit("screenshotTaken", {});
    return { 
      success: true, 
      action: "screenshot", 
      path: "/Users/tune/Pictures/Screenshot_2026_07.png",
      message: "Screenshot captured and saved to system pictures directory." 
    };
  }

  private async getSystemMetrics(): Promise<any> {
    const cpu = 15 + Math.round(Math.random() * 20);
    const ram = 54;
    return {
      success: true,
      cpuUsage: `${cpu}%`,
      ramUsage: `${ram}%`,
      temperature: "42°C",
      uptime: "3 days, 4 hours"
    };
  }

  private async requestScreenShare(reason: string): Promise<any> {
    this.addLog("Request Screen Share", "pending", `Requested access: "${reason}"`);
    return new Promise((resolve) => {
      this.emit("requestScreenShareEvent", {
        reason,
        callback: (approved: boolean) => {
          if (approved) {
            this.addLog("Request Screen Share", "success", "Screen share authorized by user.");
            resolve({
              success: true,
              sharing: true,
              message: "User approved screen sharing. Capturing browser frame stream now."
            });
          } else {
            this.addLog("Request Screen Share", "denied", "Screen share authorization declined.");
            resolve({
              success: false,
              sharing: false,
              message: "User declined the screen sharing request."
            });
          }
        }
      });
    });
  }

  private async requestCameraShare(action: string = "start", reason?: string): Promise<any> {
    const isStop = action === "stop" || action === "disable" || action === "off";
    this.addLog("Camera Vision Control", "pending", `${isStop ? "Deactivating" : "Activating"} camera vision (${reason || "User request"})`);
    return new Promise((resolve) => {
      this.emit("requestCameraShareEvent", {
        action,
        reason: reason || "to see through device camera",
        callback: (approved: boolean, errorMsg?: string) => {
          if (approved) {
            this.addLog("Camera Vision Control", "success", `Camera vision ${isStop ? "deactivated" : "activated"}.`);
            resolve({
              success: true,
              cameraActive: !isStop,
              message: isStop ? "Camera vision has been completely turned off." : "User approved camera vision. Streaming camera video frames now."
            });
          } else {
            this.addLog("Camera Vision Control", "denied", `Camera vision ${isStop ? "stop failed" : "permission declined"}.`);
            resolve({
              success: false,
              cameraActive: isStop,
              message: errorMsg || (isStop ? "Could not stop camera vision." : "User declined or denied camera permission request.")
            });
          }
        }
      });
    });
  }

  public async getUserLocation(): Promise<any> {
    this.addLog("Geolocation", "pending", "Detecting user real-world location...");
    try {
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          });
        });

        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        let address = "";
        let city = "";
        let country = "";

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
          if (res.ok) {
            const data = await res.json();
            address = data.display_name || "";
            const addrObj = data.address || {};
            city = addrObj.city || addrObj.town || addrObj.village || addrObj.state_district || "";
            country = addrObj.country || "";
          }
        } catch (e) {
          console.warn("Reverse geocoding fetch error:", e);
        }

        if (!address) {
          address = `Latitude ${lat.toFixed(4)}, Longitude ${lon.toFixed(4)}`;
        }

        this.addLog("Geolocation", "success", `Detected location: ${address}`);
        return {
          success: true,
          latitude: lat,
          longitude: lon,
          address: address,
          city: city,
          country: country,
          message: `User's current physical location is: ${address}.`
        };
      }
    } catch (err: any) {
      console.warn("Browser geolocation failed, attempting IP fallback:", err);
    }

    try {
      const ipRes = await fetch("https://ipapi.co/json/");
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        const address = `${ipData.city || ""}, ${ipData.region || ""}, ${ipData.country_name || ""}`;
        this.addLog("Geolocation (IP)", "success", `Detected location: ${address}`);
        return {
          success: true,
          latitude: ipData.latitude,
          longitude: ipData.longitude,
          address: address,
          city: ipData.city,
          country: ipData.country_name,
          message: `User's location via IP lookup is: ${address}.`
        };
      }
    } catch (e) {
      console.warn("IP geolocation fallback failed:", e);
    }

    return {
      success: false,
      message: "Unable to detect exact geolocation. Please enable browser location permissions."
    };
  }

  public async analyzeScreenContent(focusQuery?: string): Promise<any> {
    this.addLog("Analyze Screen", "pending", `Capturing screen for visual analysis: "${focusQuery || "email or open tab"}"`);
    return new Promise((resolve) => {
      this.emit("captureAndAnalyzeScreenEvent", {
        query: focusQuery,
        callback: async (dataUrl: string | null, errorMsg?: string) => {
          if (!dataUrl) {
            this.addLog("Analyze Screen", "denied", errorMsg || "Failed to capture screen image.");
            resolve({
              success: false,
              message: errorMsg || "Unable to capture screen image. Please allow screen sharing or tab capture."
            });
            return;
          }

          try {
            const customApiKey = typeof localStorage !== "undefined" ? localStorage.getItem("custom_gemini_api_key") || "" : "";
            const res = await fetch("/api/analyze-screen", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                ...(customApiKey ? { "x-gemini-api-key": customApiKey } : {})
              },
              body: JSON.stringify({
                image: dataUrl,
                query: focusQuery || "Read all visible text, email messages (subject, sender like Ornob Kundu sir, and body), or open tab content and explain it clearly.",
                customApiKey
              })
            });

            if (res.ok) {
              const data = await res.json();
              this.addLog("Analyze Screen", "success", "Screen content analyzed successfully.");
              resolve({
                success: true,
                extractedAnalysis: data.analysis,
                message: `Screen content analysis result: ${data.analysis}`
              });
            } else {
              const errData = await res.json().catch(() => ({}));
              this.addLog("Analyze Screen", "denied", errData.error || "Vision API analysis failed.");
              resolve({
                success: false,
                message: `Vision analysis failed: ${errData.error || "Server error"}`
              });
            }
          } catch (err: any) {
            console.error("Error sending screen image to vision API:", err);
            this.addLog("Analyze Screen", "denied", err.message);
            resolve({
              success: false,
              message: `Error analyzing screen: ${err.message}`
            });
          }
        }
      });
    });
  }

  private async controlBrowser(action: string, param1?: string, param2?: string): Promise<any> {
    this.addLog("Control Browser", "success", `Browser command: ${action} (${param1 || ''}, ${param2 || ''})`);
    
    // Delegate key commands directly to the actual Chrome browser via openWebsite/closeWebsite
    if (action === "navigate" && param1) {
      return await this.openWebsite(param1);
    } else if (action === "search" && param1) {
      const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(param1)}`;
      return await this.openWebsite(googleSearchUrl);
    } else if (action === "newTab") {
      const targetUrl = param1 || "https://www.google.com";
      return await this.openWebsite(targetUrl);
    } else if (action === "closeTab" || action === "close") {
      return await this.closeWebsite();
    }

    // For other visual or interactive actions, we can still emit the event so UI logs it, but return success
    this.emit("controlBrowserEvent", { action, param1, param2 });
    
    return {
      success: true,
      action,
      message: `Browser command '${action}' logged. For live browsing, Chrome is opened directly on your PC.`
    };
  }

  // --- ACCESSORS & SETTERS ---

  public getBypassSecurity(): boolean {
    return this.bypassSecurity;
  }

  public setBypassSecurity(val: boolean) {
    this.bypassSecurity = val;
    if (typeof window !== "undefined") {
      localStorage.setItem("tune_bypass_security", String(val));
    }
    this.emit("securityBypassChanged", val);
  }

  public getAllowedApplications(): AllowedApplication[] {
    return this.allowedApplications;
  }

  public updateAllowedApplication(name: string, autoApprove: boolean) {
    const app = this.allowedApplications.find(a => a.name === name);
    if (app) {
      app.autoApprove = autoApprove;
      this.emit("allowedAppsUpdated", [...this.allowedApplications]);
    }
  }

  public addAllowedApplication(app: AllowedApplication) {
    this.allowedApplications.push(app);
    this.emit("allowedAppsUpdated", [...this.allowedApplications]);
  }

  public getLogs(): DeviceLog[] {
    return this.logs;
  }

  public getHardwareState() {
    return {
      volume: this.volume,
      brightness: this.brightness,
      cameraActive: this.cameraActive,
    };
  }

  /**
   * Tool: searchYouTube
   * Searches YouTube for targeted tutorials, learning topics, specific video timestamps/chapters, music, or videos and opens directly in Chrome.
   */
  private async searchYouTube(query: string, specificSectionOrTimestamp?: string): Promise<any> {
    let cleanQuery = (query || "").trim();
    if (specificSectionOrTimestamp) {
      cleanQuery = `${cleanQuery} ${specificSectionOrTimestamp.trim()}`;
    }
    this.addLog("YouTube Resource", "success", `Opening targeted YouTube resource: "${cleanQuery}" on Chrome`);
    const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`;
    return await this.openWebsite(youtubeUrl);
  }

  /**
   * Tool: openWebsite
   * Attempts to open the URL in a new tab.
   * SMART TAB POLICY:
   * 1. The newly opened tab becomes the PRIMARY active viewing tab. It stays OPEN continuously and is NEVER auto-closed, closing only when the user explicitly requests ("close tab").
   * 2. If multiple tabs are opened, all previous/background tabs automatically close one by one after 30 seconds to prevent browser clutter.
   */
  private async openWebsite(url: string, autoCloseSeconds?: number): Promise<any> {
    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    // Auto-allow safe and standard search / utility URLs for seamless user experience
    const isSafeDomain = /^(https?:\/\/)?(www\.)?(google\.com|news\.google\.com|youtube\.com|youtu\.be|wikipedia\.org|github\.com|spotify\.com|docs\.new|sheets\.new|keep\.google\.com)/i.test(cleanUrl);
    
    let allowed = true;
    if (!isSafeDomain && !this.bypassSecurity) {
      allowed = await this.requestUserPermission(
        "Browse Web Link",
        `Open external URL: ${cleanUrl}`
      );
    } else {
      this.addLog("Browse Web Link", "success", `Directly opened search / browser URL: ${cleanUrl}`);
    }

    if (!allowed) {
      return {
        success: false,
        action: "denied",
        reason: "User denied browse action."
      };
    }

    // Try to open on the actual PC default browser via companion!
    const remoteActive = await this.dispatchToCompanion("open_website", { url: cleanUrl, autoCloseSeconds });

    let opened = false;
    if (!remoteActive) {
      try {
        const newWindow = window.open(cleanUrl, "_blank");
        if (newWindow) {
          opened = true;
          const tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

          // 1. Filter out tabs that were already closed manually by user
          this.openedTabs = this.openedTabs.filter(t => t.tab && !t.tab.closed);

          // 2. Mark previous tabs as background tabs and schedule them to auto-close after 30 seconds
          this.openedTabs.forEach((bgTab, index) => {
            bgTab.isPrimary = false;
            if (!bgTab.autoCloseTimer) {
              const delaySeconds = 30 + (index * 2); // 30s, 32s, 34s... closes background tabs one by one
              bgTab.autoCloseTimer = setTimeout(() => {
                try {
                  if (bgTab.tab && !bgTab.tab.closed && !bgTab.isPrimary) {
                    bgTab.tab.close();
                    this.addLog("Auto-Clean Background Tab", "success", `Auto-closed background tab after 30s: ${bgTab.url}`);
                    this.openedTabs = this.openedTabs.filter(t => t.id !== bgTab.id);
                    this.emit("backgroundTabClosed", { url: bgTab.url });
                  }
                } catch (e) {
                  console.warn("Could not auto-close background tab:", e);
                }
              }, delaySeconds * 1000);
            }
          });

          // 3. Register the newly opened tab as PRIMARY (stays open continuously unless user explicitly asks to close)
          const newManagedTab = {
            id: tabId,
            tab: newWindow,
            url: cleanUrl,
            openedAt: Date.now(),
            isPrimary: true,
            autoCloseTimer: undefined as any
          };

          // If explicit autoCloseSeconds was passed by user override, allow it
          if (autoCloseSeconds && autoCloseSeconds > 0) {
            newManagedTab.autoCloseTimer = setTimeout(() => {
              try {
                if (newManagedTab.tab && !newManagedTab.tab.closed) {
                  newManagedTab.tab.close();
                  this.openedTabs = this.openedTabs.filter(t => t.id !== newManagedTab.id);
                }
              } catch (e) {}
            }, autoCloseSeconds * 1000);
          }

          this.openedTabs.push(newManagedTab);
        }
      } catch (err) {
        // Sandbox / Popup blocker
      }
    } else {
      opened = true;
    }

    this.addLog("Browse Web Link", "success", `Browsed URL: ${cleanUrl} ${remoteActive ? "(on local PC)" : ""} (Primary tab stays open)`);
    this.emit("websiteOpened", { url: cleanUrl, opened, remoteActive });

    return {
      success: opened || remoteActive,
      url: cleanUrl,
      remoteActive,
      openedSuccessfully: opened,
      message: remoteActive
        ? `Successfully launched "${cleanUrl}" on your PC's browser!`
        : opened 
        ? `Successfully opened ${cleanUrl} as your active primary tab. It will stay open until you ask to close it. Background tabs will automatically close after 30 seconds.` 
        : `Requested opening ${cleanUrl}. Some browsers may block automatic popups, so a link has been displayed on the screen for the user.`
    };
  }

  /**
   * Tool: closeWebsite
   * Closes the current primary / active browser tab when requested by the user.
   */
  private async closeWebsite(): Promise<any> {
    const allowed = await this.requestUserPermission(
      "Close Web Link",
      `Close the current primary browser tab/window.`
    );

    if (!allowed) {
      return {
        success: false,
        action: "denied",
        reason: "User denied the action to close the tab."
      };
    }

    // Try to close on the actual PC via companion!
    const remoteActive = await this.dispatchToCompanion("close_website", {});

    let closedSuccessfully = false;
    if (!remoteActive) {
      // Filter out already closed tabs
      this.openedTabs = this.openedTabs.filter(t => t.tab && !t.tab.closed);

      if (this.openedTabs.length === 0) {
        this.addLog("Close Web Link", "success", "Requested tab close but no active open tabs found.");
        return {
          success: false,
          message: "No active browser tabs opened by this application are currently available to close."
        };
      }

      // Find primary tab or the latest tab
      const primaryIdx = this.openedTabs.findIndex(t => t.isPrimary);
      const targetTab = primaryIdx !== -1 ? this.openedTabs.splice(primaryIdx, 1)[0] : this.openedTabs.pop();

      if (targetTab) {
        if (targetTab.autoCloseTimer) {
          clearTimeout(targetTab.autoCloseTimer);
        }
        try {
          targetTab.tab.close();
          closedSuccessfully = true;
        } catch (err) {
          console.error("Error trying to close tab:", err);
        }
      }

      // If previous tabs are still open in the background, promote the most recent one to Primary and cancel its auto-close timer
      if (this.openedTabs.length > 0) {
        const newPrimary = this.openedTabs[this.openedTabs.length - 1];
        newPrimary.isPrimary = true;
        if (newPrimary.autoCloseTimer) {
          clearTimeout(newPrimary.autoCloseTimer);
          newPrimary.autoCloseTimer = undefined;
          this.addLog("Promote Primary Tab", "success", `Promoted ${newPrimary.url} to Primary Tab (auto-close cancelled, stays open).`);
        }
      }
    } else {
      closedSuccessfully = true;
    }

    this.addLog("Close Web Link", "success", `Closed active web tab on request. ${remoteActive ? "(on local PC)" : ""}`);
    this.emit("websiteClosed", { closedSuccessfully, remoteActive });

    return {
      success: closedSuccessfully || remoteActive,
      remoteActive,
      message: remoteActive
        ? "Successfully closed the active browser tab on your PC."
        : closedSuccessfully
        ? "Successfully closed the active browser tab."
        : "Failed to close the browser tab. Some browsers restrict window.close() on certain tabs."
    };
  }

  /**
   * Tool: getWeather
   * Generates highly contextual realistic mock weather.
   */
  private async getWeather(location: string): Promise<any> {
    const weatherDataList = [
      { temp: "72°F (22°C)", condition: "Sunny", desc: "with a perfect gentle ocean breeze" },
      { temp: "64°F (18°C)", condition: "Partly Cloudy", desc: "with crisp and fresh air" },
      { temp: "55°F (13°C)", condition: "Light Rain", desc: "bringing a soothing petrichor scent" },
      { temp: "78°F (26°C)", condition: "Warm and Clear", desc: "ideal for a scenic walk" },
    ];

    // Seed based on string hash for consistency
    let hash = 0;
    for (let i = 0; i < location.length; i++) {
      hash = location.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % weatherDataList.length;
    const selected = weatherDataList[idx];

    const result = {
      location,
      temperature: selected.temp,
      condition: selected.condition,
      description: selected.desc,
      formattedReport: `It is currently ${selected.temp} and ${selected.condition} in ${location}, ${selected.desc}.`
    };

    return result;
  }

  /**
   * Tool: setTimer
   * Starts an active countdown timer on the user's screen with real-time visual progress bar.
   */
  private async setTimer(duration: string | number, label?: string): Promise<any> {
    let totalSeconds = 60;
    if (typeof duration === "number") {
      totalSeconds = Math.max(1, Math.round(duration));
    } else if (typeof duration === "string") {
      const lower = duration.toLowerCase().trim();
      const secMatch = lower.match(/(\d+)\s*(s|sec|second|seconds)/);
      const minMatch = lower.match(/(\d+)\s*(m|min|minute|minutes)/);
      const hrMatch = lower.match(/(\d+)\s*(h|hr|hour|hours)/);
      if (secMatch) totalSeconds = parseInt(secMatch[1], 10);
      else if (minMatch) totalSeconds = parseInt(minMatch[1], 10) * 60;
      else if (hrMatch) totalSeconds = parseInt(hrMatch[1], 10) * 3600;
      else {
        const num = parseInt(lower, 10);
        if (!isNaN(num) && num > 0) {
          totalSeconds = num <= 60 && !lower.includes("s") ? num * 60 : num;
        }
      }
    }

    const timerLabel = label || "Timer";
    const timerId = "timer_" + Math.random().toString(36).substring(2, 9);
    const now = Date.now();
    const expiresAt = now + totalSeconds * 1000;

    const timerObj: ActiveTimer = {
      id: timerId,
      label: timerLabel,
      durationSeconds: totalSeconds,
      remainingSeconds: totalSeconds,
      totalSeconds: totalSeconds,
      status: "running",
      createdAt: now,
      expiresAt: expiresAt,
      isReminder: false
    };

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tune_timer_created", { detail: timerObj }));
    }

    this.emit("timerCreated", timerObj);

    const formattedTime =
      totalSeconds >= 3600
        ? `${Math.floor(totalSeconds / 3600)} hr ${Math.floor((totalSeconds % 3600) / 60)} min`
        : totalSeconds >= 60
        ? `${Math.floor(totalSeconds / 60)} min ${totalSeconds % 60 ? `${totalSeconds % 60} sec` : ""}`.trim()
        : `${totalSeconds} seconds`;

    return {
      success: true,
      timerId,
      label: timerLabel,
      totalSeconds,
      duration: formattedTime,
      message: `Started a countdown timer for ${timerLabel} (${formattedTime}). A live timer with a progress bar is now showing on your screen!`
    };
  }

  /**
   * Tool: createReminder
   * Adds a reminder to the UI and schedules a real-time alarm trigger if relative time is provided.
   */
  private async createReminder(text: string, time: string): Promise<any> {
    const reminder: Reminder = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      time,
      active: true,
    };

    // Parse relative time delay (e.g. "30 sec", "30 seconds", "30s", "1 min", "5 minutes")
    let delayMs: number | null = null;
    const lowerTime = time.toLowerCase().trim();

    const secMatch = lowerTime.match(/(\d+)\s*(s|sec|second|seconds)/);
    const minMatch = lowerTime.match(/(\d+)\s*(m|min|minute|minutes)/);
    const hourMatch = lowerTime.match(/(\d+)\s*(h|hr|hour|hours)/);

    if (secMatch) {
      delayMs = parseInt(secMatch[1], 10) * 1000;
    } else if (minMatch) {
      delayMs = parseInt(minMatch[1], 10) * 60 * 1000;
    } else if (hourMatch) {
      delayMs = parseInt(hourMatch[1], 10) * 3600 * 1000;
    } else if (lowerTime.includes("30 sec") || lowerTime.includes("30s")) {
      delayMs = 30000;
    }

    if (delayMs && delayMs > 0) {
      const totalSeconds = Math.round(delayMs / 1000);
      const timerObj: ActiveTimer = {
        id: "reminder_" + reminder.id,
        label: `Reminder: ${text}`,
        durationSeconds: totalSeconds,
        remainingSeconds: totalSeconds,
        totalSeconds: totalSeconds,
        status: "running",
        createdAt: Date.now(),
        expiresAt: Date.now() + delayMs,
        isReminder: true
      };

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("tune_timer_created", { detail: timerObj }));
      }
      this.emit("timerCreated", timerObj);

      console.log(`⏰ Scheduling relative alarm for reminder "${text}" in ${delayMs / 1000} seconds`);
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("pa_trigger_alarm", {
              detail: {
                id: reminder.id,
                title: `⏰ Reminder Alarm: ${text}`,
                topic: `Scheduled for ${time}`,
                time: time,
                alarmEnabled: true,
                completed: false
              }
            })
          );
        }
      }, delayMs);
    }

    this.emit("reminderCreated", reminder);

    return {
      success: true,
      text,
      time,
      id: reminder.id,
      scheduledDelayMs: delayMs,
      message: `I've created a reminder for "${text}" set for ${time}.${
        delayMs ? ` Live timer with progress bar is active and alarm will ring in ${delayMs / 1000} seconds!` : ""
      }`
    };
  }

  /**
   * Tool: playAmbientSound
   * Toggles audio loop playbacks.
   */
  private async playAmbientSound(soundType: string): Promise<any> {
    const target = soundType.toLowerCase().trim() as AmbientSoundType;
    
    // Stop current sounds
    Object.keys(this.ambientAudios).forEach((key) => {
      const audio = this.ambientAudios[key];
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });

    if (target === "off" || !["rain", "forest", "waves"].includes(target)) {
      this.currentPlayingSound = "off";
      this.emit("ambientSoundChanged", "off");
      return { success: true, playing: false, message: "Turned off all ambient sounds." };
    }

    const audioToPlay = this.ambientAudios[target];
    if (audioToPlay) {
      try {
        await audioToPlay.play();
        this.currentPlayingSound = target;
        this.emit("ambientSoundChanged", target);
        return { success: true, playing: true, sound: target, message: `Playing looping ambient ${target} sound.` };
      } catch (err) {
        console.warn(`Failed to play ambient sound: ${target}`, err);
        return { success: false, error: "Audio playback was blocked by browser autoplay policy. Ask the user to click the screen first." };
      }
    }

    return { success: false, error: "Sound file unavailable." };
  }

  getCurrentAmbientSound(): AmbientSoundType {
    return this.currentPlayingSound;
  }

  cleanup(): void {
    Object.keys(this.ambientAudios).forEach((key) => {
      const audio = this.ambientAudios[key];
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    this.currentPlayingSound = "off";
  }
}
export const toolManagerInstance = new ToolManager();
