import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  Volume2,
  Trash2,
  Mic,
  MicOff,
  ChevronDown,
  Key,
  ExternalLink,
  Cpu
} from "lucide-react";
import { soundEngine } from "../utils/soundEngine";
import { getActiveProfile, PROVIDERS, detectAiProvider, AiProvider } from "../utils/userProfiles";
import { toolManagerInstance } from "../tools/ToolManager";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  provider?: string;
  model?: string;
}

interface InteractiveChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenApiKeySetup?: () => void;
}

const STORAGE_CHAT_KEY = "tune_drawer_chat_messages_v1";

const QUICK_PROMPTS = [
  "Google e search koro: Best Wireless Mouse 2026",
  "আজকের লাইভ আবহাওয়া ও তাপমাত্রা কেমন?",
  "Google Maps এ কাছাকাছি রেস্তোরাঁ ও রুট দেখাও",
  "Google Calendar এ আগামীকালের স্টাডি সেশন অ্যাড করো",
  "আজকের সারাদিনের একটি প্রোডাক্টিভ প্ল্যান দাও"
];

export const InteractiveChatDrawer: React.FC<InteractiveChatDrawerProps> = ({
  isOpen,
  onClose,
  onOpenApiKeySetup,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof localStorage !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_CHAT_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [
      {
        id: "msg_welcome",
        role: "assistant",
        content: "নমস্কার! আমি Tune—আপনার সার্বক্ষণিক পার্সোনাল এআই সঙ্গী ও কো-পাইলট। আপনার স্ক্রিন, কাজ, কোড বা দৈনন্দিন পরিকল্পনা—যেকোনো কিছু নিয়ে এখানে চ্যাট করতে পারেন। কীভাবে সাহায্য করতে পারি বলুন?",
        timestamp: Date.now(),
        provider: "Tune AI",
      },
    ];
  });

  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [activeProfile, setActiveProfile] = useState(() => getActiveProfile());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Sync active profile & provider on open
  useEffect(() => {
    if (isOpen) {
      setActiveProfile(getActiveProfile());
      setTimeout(() => {
        textareaRef.current?.focus();
        scrollToBottom();
      }, 250);
    }
  }, [isOpen]);

  // Listen to profile updates
  useEffect(() => {
    const handleProfileChange = () => {
      setActiveProfile(getActiveProfile());
    };
    window.addEventListener("tune-profile-changed", handleProfileChange);
    window.addEventListener("tune-api-key-updated", handleProfileChange);
    return () => {
      window.removeEventListener("tune-profile-changed", handleProfileChange);
      window.removeEventListener("tune-api-key-updated", handleProfileChange);
    };
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    if (typeof localStorage !== "undefined" && messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(messages));
      } catch {}
    }
  }, [messages]);

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Voice dictation using browser SpeechRecognition if supported
  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported on this browser.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "bn-BD"; // Bengali + English fallback
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        soundEngine.playActionBeep();
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((res: any) => res[0].transcript)
          .join("");
        setInputText(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text || isSending) return;

    soundEngine.playActionBeep();

    const userMsg: ChatMessage = {
      id: "msg_" + Math.random().toString(36).substring(2, 9),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText("");
    setIsSending(true);

    // Mandated: "Kono kisu search korte bolle jeno seta browsers e search kore"
    const lowerText = text.toLowerCase();
    const isSearchIntent =
      lowerText.includes("search koro") ||
      lowerText.includes("সার্চ করো") ||
      lowerText.includes("সার্চ কর") ||
      lowerText.includes("google search") ||
      lowerText.includes("google e search") ||
      lowerText.includes("গুগলে সার্চ") ||
      lowerText.includes("browser e search") ||
      lowerText.includes("ব্রাউজারে সার্চ") ||
      lowerText.startsWith("search ") ||
      lowerText.startsWith("search for ");

    if (isSearchIntent) {
      let cleanQuery = text
        .replace(/google\s*(e)?\s*search\s*(koro|korun|করো|করুন)?/gi, "")
        .replace(/browser\s*(e)?\s*search\s*(koro|korun|করো|করুন)?/gi, "")
        .replace(/গুগলে\s*সার্চ\s*(করো|করুন)?/gi, "")
        .replace(/ব্রাউজারে\s*সার্চ\s*(করো|করুন)?/gi, "")
        .replace(/^search\s*(for)?/gi, "")
        .replace(/search\s*(koro|korun|করো|করুন)?/gi, "")
        .replace(/[:\-]/g, " ")
        .trim();

      if (!cleanQuery) cleanQuery = text;
      const targetUrl = `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}`;
      try {
        toolManagerInstance.openWebsite(targetUrl);
      } catch (searchErr) {
        console.warn("Could not trigger browser search from text drawer:", searchErr);
      }
    }

    // Mandated: "r brouser e jemon tab khulte pare temoni jeno je tab er kotha ami close korte bolbo seta jeno close o korte pare"
    const isCloseTabIntent =
      lowerText.includes("tab close") ||
      lowerText.includes("close tab") ||
      lowerText.includes("tab bondho") ||
      lowerText.includes("ট্যাব বন্ধ") ||
      lowerText.includes("ট্যাব ক্লোজ") ||
      lowerText.includes("close this tab") ||
      lowerText.includes("close the tab");

    if (isCloseTabIntent) {
      const targetTab = text
        .replace(/tab\s*(close|bondho|বন্ধ|ক্লোজ)?/gi, "")
        .replace(/(close|bondho|বন্ধ|ক্লোজ)\s*tab/gi, "")
        .replace(/(koro|korun|করো|করুন)/gi, "")
        .replace(/(this|the|oi|ei)/gi, "")
        .replace(/[:\-]/g, " ")
        .trim();

      try {
        toolManagerInstance.closeWebsite(targetTab);
      } catch (closeErr) {
        console.warn("Could not trigger closeWebsite from text drawer:", closeErr);
      }
    }

    // Mandated: "YouTube e kono gan play korte bolle jeno sudhu youtube e giye search e na kore derect play kore dey"
    const isYouTubePlayIntent =
      lowerText.includes("youtube") ||
      lowerText.includes("ইউটিউব") ||
      lowerText.includes("গান চালাও") ||
      lowerText.includes("গান বাজাও") ||
      lowerText.includes("গান শুনবো") ||
      lowerText.includes("gan play") ||
      lowerText.includes("gan chalao") ||
      lowerText.includes("play song") ||
      lowerText.includes("play music") ||
      lowerText.includes("song play");

    if (isYouTubePlayIntent && (lowerText.includes("play") || lowerText.includes("চালাও") || lowerText.includes("বাজাও") || lowerText.includes("chalao") || lowerText.includes("গান") || lowerText.includes("song"))) {
      try {
        toolManagerInstance.searchYouTube(text);
      } catch (ytErr) {
        console.warn("Could not trigger direct YouTube playback from text drawer:", ytErr);
      }
    }

    // Determine current key, personality prompt, and provider
    const profile = getActiveProfile();
    const key =
      profile.apiKey ||
      (typeof localStorage !== "undefined"
        ? (localStorage.getItem("user_gemini_api_key") ||
            localStorage.getItem("custom_gemini_api_key") ||
            "").trim().replace(/^["']|["']$/g, "")
        : "");
    const provider = profile.provider || (key ? detectAiProvider(key) : "gemini");
    const personalityPrompt =
      typeof localStorage !== "undefined"
        ? (localStorage.getItem("tune_custom_personality_prompt") || "").trim()
        : "";

    try {
      // Build conversation payload (last 10 messages for context)
      const chatPayload = newHistory
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-10)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
        },
        body: JSON.stringify({
          messages: chatPayload,
          apiKey: key,
          provider: provider,
          personalityPrompt: personalityPrompt,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      const replyText = data.text || "আমি আপনার বার্তাটি পেয়েছি, কিন্তু উত্তর তৈরি করতে পারিনি।";

      const assistantMsg: ChatMessage = {
        id: "msg_" + Math.random().toString(36).substring(2, 9),
        role: "assistant",
        content: replyText,
        timestamp: Date.now(),
        provider: data.provider || provider,
        model: data.model,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      soundEngine.playNotificationChime();
    } catch (err: any) {
      console.error("Chat error:", err);
      const errorMsg: ChatMessage = {
        id: "msg_err_" + Math.random().toString(36).substring(2, 9),
        role: "assistant",
        content: `⚠️ ক্ষমা করবেন, উত্তর দেওয়া সম্ভব হয়নি। (${err.message || "Error connecting to AI"})\n\nদয়া করে নিশ্চিত করুন আপনার এপিআই কী সক্রিয় আছে।`,
        timestamp: Date.now(),
        provider: "System Notice",
      };
      setMessages((prev) => [...prev, errorMsg]);
      soundEngine.playAlertBeep();
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    soundEngine.playActionBeep();
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeakText = (id: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    setSpeakingId(id);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Try finding Bengali voice or fallback to default
    const voices = window.speechSynthesis.getVoices();
    const bnVoice = voices.find((v) => v.lang.includes("bn") || v.lang.includes("BD") || v.lang.includes("IN"));
    if (bnVoice) utterance.voice = bnVoice;

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    window.speechSynthesis.speak(utterance);
  };

  const handleClearHistory = () => {
    soundEngine.playActionBeep();
    if (confirm("আপনি কি চ্যাট হিস্ট্রি মুছে ফেলতে চান?")) {
      const resetMsg: ChatMessage = {
        id: "msg_" + Date.now(),
        role: "assistant",
        content: "চ্যাট হিস্ট্রি রিসেট করা হয়েছে। আমি আপনাকে আবার সাহায্য করার জন্য প্রস্তুত!",
        timestamp: Date.now(),
        provider: "Tune AI",
      };
      setMessages([resetMsg]);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify([resetMsg]));
      }
    }
  };

  // Provider display info
  const currentProviderId: AiProvider = activeProfile.provider || (activeProfile.apiKey ? detectAiProvider(activeProfile.apiKey) : "gemini");
  const providerMeta = PROVIDERS[currentProviderId] || PROVIDERS.gemini;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none">
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-auto"
          />

          {/* Slide-Up Messenger / ChatGPT Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340, mass: 0.6 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 350) {
                onClose();
              }
            }}
            className="relative w-full max-w-2xl mx-auto h-[88vh] sm:h-[82vh] bg-gradient-to-b from-zinc-900/98 via-zinc-950 to-black border-t-2 sm:border-x border-t-[#0084FF]/60 sm:border-white/10 sm:rounded-t-3xl shadow-[0_-15px_50px_rgba(0,0,0,0.85)] flex flex-col pointer-events-auto overflow-hidden text-zinc-100"
          >
            {/* 1. Drag Notch Indicator with Messenger subtle accent */}
            <div className="w-full flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing select-none">
              <div className="w-12 h-1.5 bg-white/20 hover:bg-white/40 rounded-full transition" />
            </div>

            {/* 2. Top Header Bar with Close (X) Button */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/[0.08] bg-black/40 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#0084FF] via-[#7B3FE4] to-[#FF4B72] flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                      <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.915 1.455 5.518 3.734 7.188v3.054c0 .543.59.88 1.05.589l3.375-2.12c.585.12 1.196.185 1.841.185 5.523 0 10-4.145 10-9.258C22 6.145 17.523 2 12 2zm1.096 12.443l-2.678-2.857-5.226 2.857 5.748-6.104 2.748 2.857 5.156-2.857-5.748 6.104z" />
                    </svg>
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-zinc-900 rounded-full animate-pulse" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold tracking-tight text-white truncate">Tune Assistant</h2>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                      Live
                    </span>
                  </div>
                  <div className="text-[10px] text-white/50 flex items-center gap-1.5 truncate">
                    <span>Active Profile: <strong className="text-white/80">{activeProfile.name}</strong></span>
                    {activeProfile.apiKey ? (
                      <span className="text-emerald-400 font-medium">● Key Ready</span>
                    ) : (
                      <span className="text-cyan-400 font-medium">● Ready</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons & Prominent Close (X) */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleClearHistory}
                  className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white transition cursor-pointer"
                  title="Clear Chat History"
                >
                  <Trash2 className="w-4 h-4 text-red-400/80" />
                </button>

                {/* Primary Dismiss Button Requested by User */}
                <button
                  onClick={() => {
                    soundEngine.playWaterDropSound();
                    onClose();
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-red-500/20 hover:text-red-300 text-white transition active:scale-95 cursor-pointer ml-1 border border-white/10"
                  title="Close and return to Home Screen (X)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 3. Messages Stream (Messenger / ChatGPT Bubbles) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {/* Assistant Avatar */}
                    {!isUser && (
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shrink-0 mt-0.5 shadow-md">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}

                    <div className={`max-w-[85%] sm:max-w-[78%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                      {/* Bubble */}
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed select-text ${
                          isUser
                            ? "bg-gradient-to-r from-[#0084FF] to-[#7B3FE4] text-white rounded-br-sm shadow-md shadow-blue-500/10"
                            : "bg-white/[0.07] border border-white/[0.1] text-zinc-100 rounded-bl-sm backdrop-blur-sm"
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                      </div>

                      {/* Bubble Footer Actions */}
                      <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-white/40">
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {msg.provider && !isUser && (
                          <span className="font-mono text-cyan-400/80">• {msg.provider}</span>
                        )}

                        {!isUser && (
                          <div className="flex items-center gap-1.5 ml-1">
                            <button
                              onClick={() => handleCopyText(msg.id, msg.content)}
                              className="hover:text-white transition p-0.5"
                              title="Copy text"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              onClick={() => handleSpeakText(msg.id, msg.content)}
                              className={`hover:text-white transition p-0.5 ${speakingId === msg.id ? "text-cyan-400 animate-pulse" : ""}`}
                              title="Listen aloud"
                            >
                              <Volume2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* User Avatar */}
                    {isUser && (
                      <div className={`w-7 h-7 rounded-xl bg-gradient-to-tr ${activeProfile.avatarColor || "from-cyan-500 to-blue-600"} flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-white shadow-md`}>
                        {activeProfile.name ? activeProfile.name.charAt(0).toUpperCase() : "U"}
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {/* Loading Wave Indicator */}
              {isSending && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2.5 items-center text-xs text-cyan-400 font-mono"
                >
                  <div className="w-7 h-7 rounded-xl bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
                  </div>
                  <div className="px-3.5 py-2 rounded-2xl bg-white/[0.05] border border-cyan-500/20 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    <span className="text-[11px] text-white/60 ml-1.5">Tune ভাবছে...</span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* 4. Quick Suggestions Strip */}
            {messages.length <= 3 && !isSending && (
              <div className="px-4 py-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[11px] text-white/70 hover:text-white shrink-0 transition text-left cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* 5. Bottom ChatGPT Style Input Bar */}
            <div className="p-3 sm:p-4 border-t border-white/[0.08] bg-black/40 shrink-0">
              <div className="relative flex items-center rounded-2xl bg-white/[0.07] border border-white/[0.12] focus-within:border-cyan-500/50 transition shadow-inner">
                {/* Voice dictation button */}
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`p-2.5 rounded-xl ml-1 transition cursor-pointer ${
                    isListening
                      ? "text-red-400 bg-red-500/20 animate-pulse"
                      : "text-white/50 hover:text-white"
                  }`}
                  title={isListening ? "Stop listening" : "Voice input (Bangla / English)"}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* Auto-expanding textarea */}
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Message Tune (${providerMeta.badge})... [Enter to send]`}
                  rows={1}
                  disabled={isSending}
                  className="flex-1 max-h-32 bg-transparent py-3 px-2 text-[13px] text-white placeholder:text-white/30 resize-none outline-none"
                />

                {/* Send Button */}
                <button
                  type="button"
                  disabled={!inputText.trim() || isSending}
                  onClick={() => handleSendMessage()}
                  className={`p-2.5 rounded-xl mr-1 transition cursor-pointer ${
                    inputText.trim() && !isSending
                      ? "bg-gradient-to-r from-[#0084FF] to-[#7B3FE4] text-white hover:opacity-95 active:scale-95 shadow-md shadow-purple-500/25"
                      : "text-white/20 cursor-not-allowed"
                  }`}
                  title="Send Message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Bottom Sub-text Notice */}
              <div className="flex items-center justify-between text-[10px] text-white/40 mt-2 px-1">
                <span>Hold & drag down or click <strong>(X)</strong> to close</span>
                <span>Powered by {providerMeta.name}</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
