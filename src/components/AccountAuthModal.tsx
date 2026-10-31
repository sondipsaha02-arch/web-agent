import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User as UserIcon,
  LogIn,
  LogOut,
  Key,
  Sparkles,
  ShieldCheck,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  AlertCircle,
  X,
  Sliders,
  Cloud,
  CheckCircle2,
  Wand2,
  HelpCircle,
  RefreshCw,
  Cpu
} from "lucide-react";
import { soundEngine } from "../utils/soundEngine";
import {
  auth,
  loginWithGoogle,
  logoutUser,
  subscribeUserProfile,
  saveUserProfileData,
  type User,
  type UserProfile
} from "../lib/firebase";
import { updateActiveProfileApiKey, STORAGE_API_KEY_CONFIGURED, detectAiProvider, PROVIDERS, AiProvider } from "../utils/userProfiles";

interface AccountAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApiKeyUpdated?: (key: string) => void;
  initialTab?: "account" | "personality" | "apikey";
}

const PERSONALITY_PRESETS = [
  {
    name: "Supportive Companion",
    prompt:
      "Tuned into a warm, encouraging, and deeply empathetic companion. Listen closely, cheer Boss on, and respond with genuine care and friendly Banglish/Bengali conversational charm."
  },
  {
    name: "Strict Senior Engineer",
    prompt:
      "Act as an elite Staff Software Engineer. Be extremely precise, technically rigorous, architecture-focused, and concise. No superficial praise; diagnose code flaws immediately with elegant fixes."
  },
  {
    name: "Academic Tutor & Math Mentor",
    prompt:
      "Act as a patient, brilliant math and science tutor. Break every complex equation or concept down step-by-step with simple analogies. Verify logic thoroughly before answering."
  },
  {
    name: "Concise & Direct",
    prompt:
      "Maximum brevity. Respond in single sharp sentences or bullet points. Zero small talk or conversational fillers unless explicitly asked."
  },
  {
    name: "Banglish Tech Lead",
    prompt:
      "Respond primarily in modern, natural Banglish (বাংলা + English tech terms). Speak with Boss like a trusted co-founder and engineering lead."
  }
];

export const AccountAuthModal: React.FC<AccountAuthModalProps> = ({
  isOpen,
  onClose,
  onApiKeyUpdated,
  initialTab = "account"
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isVerifyingKey, setIsVerifyingKey] = useState(false);
  const [keySaveSuccess, setKeySaveSuccess] = useState(false);

  const [personalityInput, setPersonalityInput] = useState("");
  const [isSavingPersonality, setIsSavingPersonality] = useState(false);
  const [personalitySaveSuccess, setPersonalitySaveSuccess] = useState(false);

  // Active tab inside modal: "account" | "personality" | "apikey"
  const [activeTab, setActiveTab] = useState<"account" | "personality" | "apikey">(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Subscribe to auth state
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        // Subscribe to Firestore user document
        const unsubProfile = subscribeUserProfile(user.uid, (profile) => {
          setUserProfile(profile);
          if (profile?.apiKey) {
            setApiKeyInput(profile.apiKey);
            localStorage.setItem("custom_gemini_api_key", profile.apiKey);
            localStorage.setItem(STORAGE_API_KEY_CONFIGURED, "true");
            updateActiveProfileApiKey(profile.apiKey);
          }
          if (profile?.personalityPrompt !== undefined) {
            setPersonalityInput(profile.personalityPrompt);
            localStorage.setItem("tune_custom_personality_prompt", profile.personalityPrompt);
          }
        });
        return () => unsubProfile();
      } else {
        setUserProfile(null);
      }
    });

    return () => unsub();
  }, []);

  // Prepopulate local storage values if user is guest
  useEffect(() => {
    if (isOpen && !currentUser) {
      const storedKey = typeof localStorage !== "undefined" ? localStorage.getItem("custom_gemini_api_key") || "" : "";
      const storedPrompt = typeof localStorage !== "undefined" ? localStorage.getItem("tune_custom_personality_prompt") || "" : "";
      if (storedKey) setApiKeyInput(storedKey);
      if (storedPrompt) setPersonalityInput(storedPrompt);
    }
  }, [isOpen, currentUser]);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setErrorMsg(null);
      soundEngine.playActionBeep();
      const user = await loginWithGoogle();
      if (user) {
        soundEngine.playNotificationChime();
      }
    } catch (err: any) {
      console.error("Sign-in failed:", err);
      setErrorMsg(err.message || "Google Sign-In failed. Please try again.");
      soundEngine.playAlertBeep();
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      soundEngine.playWaterDropSound();
      await logoutUser();
      setUserProfile(null);
      soundEngine.playAlertBeep();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to sign out.");
    } finally {
      setIsSigningOut(false);
    }
  };

  const formatApiErrorMessage = (rawError: any): string => {
    if (!rawError) return "Invalid Gemini API Key. Please verify your key from Google AI Studio.";
    const str = typeof rawError === "string" ? rawError : String(rawError?.message || rawError);
    if (str.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED")) {
      return "এটি একটি Google OAuth টোকেন, Gemini API Key নয়। অনুগ্রহ করে Google AI Studio থেকে ফ্রি Gemini API Key প্রদান করুন (যা 'AIzaSy' দিয়ে শুরু হয়)।";
    }
    try {
      const parsed = JSON.parse(str);
      const reason = parsed?.error?.details?.[0]?.reason || "";
      if (reason === "ACCESS_TOKEN_TYPE_UNSUPPORTED") {
        return "এটি একটি Google OAuth টোকেন, Gemini API Key নয়। অনুগ্রহ করে Google AI Studio থেকে ফ্রি Gemini API Key প্রদান করুন (যা 'AIzaSy' দিয়ে শুরু হয়)।";
      }
      if (parsed?.error?.message) return parsed.error.message;
      if (parsed?.message) return parsed.message;
    } catch {}
    return str;
  };

  const handleVerifyAndSaveKey = async () => {
    const cleanKey = apiKeyInput
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/[\r\n\t]/g, "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim();

    setIsVerifyingKey(true);
    setErrorMsg(null);
    setKeySaveSuccess(false);

    try {
      let detectedProv: AiProvider = "gemini";
      if (cleanKey) {
        if (cleanKey.startsWith("ya29.") || cleanKey.startsWith("Bearer ") || cleanKey.includes("eyJ")) {
          setErrorMsg("এটি একটি Google OAuth এক্সেস টোকেন, API Key নয়। অনুগ্রহ করে OpenRouter, Gemini, ChatGPT বা Claude এর API Key প্রদান করুন।");
          soundEngine.playAlertBeep();
          setIsVerifyingKey(false);
          return;
        }

        if (cleanKey.length < 10) {
          setErrorMsg("API Key-টি অসম্পূর্ণ। সম্পূর্ণ কী পেস্ট করুন।");
          soundEngine.playAlertBeep();
          setIsVerifyingKey(false);
          return;
        }

        detectedProv = detectAiProvider(cleanKey);

        // Validate key with server proxy
        const res = await fetch("/api/validate-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: cleanKey, provider: detectedProv })
        });
        const data = await res.json();
        if (!res.ok || !data.valid) {
          const friendly = formatApiErrorMessage(data.error || "Invalid API Key. Please verify your key.");
          setErrorMsg(friendly);
          soundEngine.playAlertBeep();
          setIsVerifyingKey(false);
          return;
        }
        if (data.provider) detectedProv = data.provider;
      }

      // Save to localStorage & active profile
      if (cleanKey) {
        localStorage.setItem("custom_gemini_api_key", cleanKey);
        localStorage.setItem("tune_api_provider", detectedProv);
        localStorage.setItem(STORAGE_API_KEY_CONFIGURED, "true");
        updateActiveProfileApiKey(cleanKey, detectedProv);
      } else {
        localStorage.removeItem("custom_gemini_api_key");
        localStorage.removeItem("tune_api_provider");
        localStorage.removeItem(STORAGE_API_KEY_CONFIGURED);
        updateActiveProfileApiKey("");
      }

      // If user is logged in, sync to Firestore
      if (currentUser) {
        await saveUserProfileData(currentUser.uid, {
          apiKey: cleanKey
        });
      }

      setKeySaveSuccess(true);
      soundEngine.playNotificationChime();
      if (onApiKeyUpdated) onApiKeyUpdated(cleanKey);
      setTimeout(() => setKeySaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(formatApiErrorMessage(err.message || "Failed to verify API Key. Please check your internet connection."));
      soundEngine.playAlertBeep();
    } finally {
      setIsVerifyingKey(false);
    }
  };

  const handleSavePersonality = async () => {
    setIsSavingPersonality(true);
    setErrorMsg(null);
    setPersonalitySaveSuccess(false);

    try {
      const cleanPrompt = personalityInput.trim();
      localStorage.setItem("tune_custom_personality_prompt", cleanPrompt);

      // If user is logged in, sync to Firestore
      if (currentUser) {
        await saveUserProfileData(currentUser.uid, {
          personalityPrompt: cleanPrompt
        });
      }

      // Dispatch event so active session or components react immediately
      window.dispatchEvent(
        new CustomEvent("tune_personality_prompt_updated", {
          detail: { prompt: cleanPrompt }
        })
      );

      setPersonalitySaveSuccess(true);
      soundEngine.playNotificationChime();
      setTimeout(() => setPersonalitySaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save personality instructions.");
      soundEngine.playAlertBeep();
    } finally {
      setIsSavingPersonality(false);
    }
  };

  const handleApplyPreset = (promptText: string) => {
    setPersonalityInput(promptText);
    soundEngine.playWaterDropSound();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="w-full max-w-lg bg-[#141417] border border-white/15 rounded-[32px] p-6 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.85)] relative overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Top subtle gloss */}
          <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

          {/* Modal Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-md shrink-0">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  Account, Key & Personality
                </h3>
                <p className="text-[11px] text-white/50 font-sans">
                  {currentUser ? `Signed in as ${currentUser.email}` : "Google Sign-In & Personal AI Setup"}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                soundEngine.playActionBeep();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition cursor-pointer"
              title="Close"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="grid grid-cols-3 gap-1 bg-white/[0.04] p-1 rounded-2xl my-4 border border-white/5 shrink-0">
            <button
              onClick={() => setActiveTab("account")}
              className={`py-2 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "account"
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Google Account</span>
            </button>
            <button
              onClick={() => setActiveTab("apikey")}
              className={`py-2 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "apikey"
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Gemini Key</span>
            </button>
            <button
              onClick={() => setActiveTab("personality")}
              className={`py-2 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "personality"
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>AI Personality</span>
            </button>
          </div>

          {/* Error notice */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start justify-between gap-2 shrink-0">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="leading-relaxed">{errorMsg}</p>
                  {errorMsg.toLowerCase().includes("api key") && (
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 underline text-[11px] font-semibold mt-0.5"
                    >
                      <span>Get a free Gemini Key from Google AI Studio</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-red-300/60 hover:text-red-200 p-0.5 transition cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Modal Content Scroll Area */}
          <div className="overflow-y-auto space-y-4 pr-1 flex-1">
            {/* ======================================================== */}
            {/* TAB 1: GOOGLE ACCOUNT & CLOUD SYNC                       */}
            {/* ======================================================== */}
            {activeTab === "account" && (
              <div className="space-y-4">
                {currentUser ? (
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center gap-3">
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt={currentUser.displayName || "User"}
                          className="w-12 h-12 rounded-full border border-cyan-400/40 shadow-md object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                          {(currentUser.displayName || currentUser.email || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white truncate">
                            {currentUser.displayName || "Google User"}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Verified
                          </span>
                        </div>
                        <p className="text-xs text-white/50 truncate font-mono mt-0.5">
                          {currentUser.email}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-white/60">
                      <div className="flex items-center gap-1.5 text-cyan-300">
                        <Cloud className="w-3.5 h-3.5" />
                        <span>Cloud Firestore Sync Active</span>
                      </div>
                      <span className="text-[10px] text-white/40 font-mono">
                        UID: {currentUser.uid.slice(0, 8)}...
                      </span>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-red-300 hover:text-red-200 border border-red-500/20 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        {isSigningOut ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <LogOut className="w-3.5 h-3.5" />
                        )}
                        <span>Sign Out of Google Account</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-center space-y-4">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-300 shadow-inner">
                      <LogIn className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Sign In with Google</h4>
                      <p className="text-xs text-white/60 mt-1 max-w-sm mx-auto leading-relaxed">
                        আপনার Google / Gmail অ্যাকাউন্ট দিয়ে সাইন-ইন করলে আপনার পারসোনাল API Key, কাস্টম পার্সোনালিটি এবং মেমোরি স্বয়ংক্রিয়ভাবে ক্লাউডে সুরক্ষিত থাকবে।
                      </p>
                    </div>

                    <button
                      onClick={handleGoogleSignIn}
                      disabled={isSigningIn}
                      className="w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2.5 shadow-lg transition cursor-pointer active:scale-[0.98]"
                    >
                      {isSigningIn ? (
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.26 21.36 7.33 24 12 24z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.43l4.02-3.14z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.26 6.57l4.02 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
                          />
                        </svg>
                      )}
                      <span>Continue with Google</span>
                    </button>
                  </div>
                )}

                {/* Privacy & Multi-User Architecture */}
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Isolated Multi-User Security</span>
                  </div>
                  <p className="text-[11px] text-white/60 leading-relaxed font-sans">
                    প্রতিটি ব্যবহারকারীর তথ্য ফায়ারবেস ক্লাউডে সম্পূর্ণ আলাদা এবং এনক্রিপ্টেড। আপনার পারসোনাল Gemini API Key শুধুমাত্র আপনার সেশনে কার্যকর থাকবে এবং অন্য কোনো ইউজার এটি এক্সেস করতে পারবে না।
                  </p>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: PERSONAL GEMINI API KEY                           */}
            {/* ======================================================== */}
            {activeTab === "apikey" && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/80 font-mono flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-cyan-400" />
                      Personal Gemini API Key
                    </label>
                    {apiKeyInput ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Key Set
                      </span>
                    ) : (
                      <span className="text-[10px] text-white/40 font-mono">No Key (Guest)</span>
                    )}
                  </div>

                  <p className="text-[11px] text-white/60 leading-relaxed font-sans">
                    Google AI Studio থেকে আপনার ফ্রি Gemini API Key প্রদান করুন। আপনার কী ক্লাউডে আপনার অ্যাকাউন্টে সুরক্ষিত থাকবে।
                  </p>

                  <div className="flex items-center gap-2 bg-black/50 border border-white/15 focus-within:border-cyan-400/70 rounded-xl px-3 py-2.5 transition-colors">
                    <Key className="w-4 h-4 text-cyan-400/70 shrink-0" />
                    <input
                      type={showKey ? "text" : "password"}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="AIzaSy..."
                      autoComplete="off"
                      spellCheck="false"
                      className="flex-1 bg-transparent text-xs text-cyan-300 font-mono placeholder:text-white/20 outline-none min-w-0"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="text-white/40 hover:text-white transition p-1 cursor-pointer shrink-0"
                      title={showKey ? "Hide Key" : "Show Key"}
                    >
                      {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleVerifyAndSaveKey}
                      disabled={isVerifyingKey}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-bold text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                    >
                      {isVerifyingKey ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying Key...</span>
                        </>
                      ) : keySaveSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Saved & Synced!</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verify & Save Key</span>
                        </>
                      )}
                    </button>

                    {apiKeyInput && (
                      <button
                        onClick={() => {
                          setApiKeyInput("");
                          handleVerifyAndSaveKey();
                        }}
                        className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs border border-white/10 transition cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-white/50">Gemini Key নেই? সম্পূর্ণ ফ্রি:</span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 underline underline-offset-2"
                    >
                      Get Free API Key <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 3: CUSTOM AI PERSONALITY & PROMPT                    */}
            {/* ======================================================== */}
            {activeTab === "personality" && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/80 font-mono flex items-center gap-1.5">
                      <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                      AI Personality & Custom Instructions
                    </label>
                  </div>

                  <p className="text-[11px] text-white/60 leading-relaxed font-sans">
                    Tune কিভাবে আপনার সাথে কথা বলবে এবং কেমন আচরণ করবে তা নির্ধারণ করুন। খালি রাখলে Tune এর নিজস্ব বুদ্ধিমান Banglish কম্প্যানিয়ন পার্সোনালিটি চালু থাকবে।
                  </p>

                  {/* Preset Chips */}
                  <div>
                    <span className="text-[10px] text-white/40 uppercase font-mono tracking-wider block mb-1.5">
                      Quick Preset Styles:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {PERSONALITY_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => handleApplyPreset(preset.prompt)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-[11px] text-white/80 hover:text-white border border-white/10 transition cursor-pointer active:scale-95 flex items-center gap-1"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-purple-300" />
                          <span>{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Textarea */}
                  <div className="relative">
                    <textarea
                      rows={5}
                      value={personalityInput}
                      onChange={(e) => setPersonalityInput(e.target.value)}
                      placeholder="e.g. Always respond in sharp, witty Banglish. Be deeply knowledgeable in React and Math, and never give long repetitive lectures..."
                      className="w-full bg-black/50 border border-white/15 focus:border-purple-400/70 rounded-xl p-3 text-xs text-white placeholder:text-white/20 outline-none resize-none font-sans leading-relaxed transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSavePersonality}
                      disabled={isSavingPersonality}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                    >
                      {isSavingPersonality ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving & Syncing...</span>
                        </>
                      ) : personalitySaveSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Personality Synced!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Save & Sync Personality</span>
                        </>
                      )}
                    </button>

                    {personalityInput && (
                      <button
                        onClick={() => {
                          setPersonalityInput("");
                          localStorage.removeItem("tune_custom_personality_prompt");
                          if (currentUser) {
                            saveUserProfileData(currentUser.uid, { personalityPrompt: "" });
                          }
                          soundEngine.playWaterDropSound();
                        }}
                        className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs border border-white/10 transition cursor-pointer"
                      >
                        Reset to Default
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40 font-mono shrink-0">
            <span>Tune Multi-User Architecture</span>
            <span>Silent Attentive Ready</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AccountAuthModal;
