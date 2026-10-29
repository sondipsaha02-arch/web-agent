export type ConnectionState = "disconnected" | "connecting" | "listening" | "speaking" | "thinking";

export interface ResearchSource {
  title: string;
  url: string;
  domain?: string;
  verified?: boolean;
  snippet?: string;
  imageUrl?: string;
  favicon?: string;
  images?: Array<{ title?: string; imageUrl: string; sourceUrl?: string }>;
}

export interface VisualSearchResult {
  title: string;
  imageUrl: string;
  sourceUrl?: string;
  domain?: string;
}

export interface Transcription {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isResearch?: boolean;
  isSearching?: boolean;
  topic?: string;
  sources?: ResearchSource[];
  imageUrl?: string;
  visualImages?: VisualSearchResult[];
  isDecisionCard?: boolean;
  decisionData?: {
    dilemma: string;
    options: Array<{
      optionTitle: string;
      summary?: string;
      pros?: string[];
      cons?: string[];
      tradeOffs?: string;
    }>;
    recommendation?: string;
  };
}

export interface Reminder {
  id: string;
  text: string;
  time: string;
  active: boolean;
  dueTimestamp?: number;
  totalDurationMs?: number;
}

export interface ActiveTimer {
  id: string;
  label: string;
  durationSeconds: number;
  remainingSeconds: number;
  totalSeconds: number;
  status: "running" | "paused" | "completed";
  createdAt: number;
  expiresAt: number;
  isReminder?: boolean;
}

export type AmbientSoundType = "rain" | "forest" | "waves" | "off";

export interface ActiveTool {
  id: string;
  name: string;
  args: any;
  status: "running" | "completed" | "failed";
  result?: string;
}

export type DeviceAgentStatus = "offline" | "connecting" | "connected";

export interface AllowedApplication {
  name: string;
  category: string;
  description: string;
  logo: string;
  autoApprove: boolean;
}

export interface DeviceLog {
  id: string;
  timestamp: Date;
  action: string;
  status: "success" | "pending" | "denied";
  details: string;
}

export interface PendingApproval {
  id: string;
  name: string;
  args: any;
  resolve: (approved: boolean) => void;
}

export interface MemorySnippet {
  id: string;
  text: string;
  category: string;
  timestamp: string;
  updatedAt?: string;
  embedding?: number[];
}

export interface UserProfile {
  name: string;
  personality: string;
  interests: string[];
  goals: string[];
}

export type ThemeMode = "classic" | "blackhole";
export type CharacterDesign = "astro_bot" | "eve_android" | "cyber_bot" | "mecha_neko" | "celestial_core" | "minimal";

export interface UserPreferences {
  theme_mode?: ThemeMode;
  character_design?: CharacterDesign;
  speaking_style: string;
  favorite_topics: string[];
  voice_name?: string;
  character_personality?: string;
  proactive_coaching?: boolean;
  oviman_behavior?: boolean;
  vocal_sfx?: boolean;
  avatar_scale?: number;
  avatar_offset_x?: number;
  avatar_offset_y?: number;
  wave_rotation_deg?: number;
  wave_scale?: number;
  wave_offset_x?: number;
  wave_offset_y?: number;
  screen_share_mode?: "entire" | "tab";
  background_keep_alive?: boolean;
  user_title?: string;
}

export interface UserHistory {
  important_events: string[];
  previous_projects: string[];
}

export interface SpeakerProfile {
  id: string;
  name: string;
  relationship: string;
  preferences?: string;
  notes?: string;
  lastSpokeAt?: string;
}

export interface ActiveSpeaker {
  name: string;
  relationship?: string;
  confidence?: string;
}

export interface LongTermMemory {
  user_profile: UserProfile;
  preferences: UserPreferences;
  history: UserHistory;
  memories: MemorySnippet[];
  speakers?: SpeakerProfile[];
  active_speaker?: ActiveSpeaker;
}

export interface ActiveDraft {
  id: string;
  title: string;
  contentType: "script" | "email" | "article" | "code" | "notes" | "letter" | "general";
  content: string;
  summary?: string;
  createdAt: number;
  updatedAt: number;
}

export interface LiveProcessStep {
  id: string;
  label: string;
  status: "pending" | "active" | "completed" | "error";
  details?: string;
}

export interface LiveProcessState {
  id: string;
  taskTitle: string;
  isProcessing: boolean;
  currentStepLabel: string;
  steps: LiveProcessStep[];
  progressPercent: number;
  voiceNotice?: string;
  startTime: number;
  estimatedTime?: string;
}

export interface WhiteboardElement {
  id: string;
  type: "box" | "circle" | "arrow" | "line" | "text" | "formula" | "code" | "badge" | "highlight";
  label: string;
  sublabel?: string;
  x: number; // Percentage 0 - 100
  y: number; // Percentage 0 - 100
  toX?: number; // Percentage 0 - 100 (for lines and arrows)
  toY?: number; // Percentage 0 - 100 (for lines and arrows)
  color?: string;
  bgColor?: string;
  width?: number;
  height?: number;
  details?: string;
}

export interface WhiteboardLessonStep {
  stepNumber: number;
  title: string;
  explanation: string;
  drawingType?: "diagram" | "flowchart" | "math_equation" | "mindmap" | "comparison" | "architecture" | "sketch";
  elements: WhiteboardElement[];
  teacherSpeech?: string;
}

export interface WhiteboardSession {
  id: string;
  topic: string;
  conceptSummary: string;
  activeStepIndex: number;
  steps: WhiteboardLessonStep[];
  createdAt: number;
  updatedAt: number;
}

export interface CalculationData {
  expression: string;
  result: string;
  operationType?: string;
  steps?: string;
  speechAnswer?: string;
  timestamp?: number;
}

export interface ClockData {
  time12: string;
  time24?: string;
  timePeriodBn: string;
  timePeriodEn: string;
  dayNameBn: string;
  dayNameEn: string;
  dateBn: string;
  dateEn: string;
  timezone: string;
  timestamp?: number;
}

