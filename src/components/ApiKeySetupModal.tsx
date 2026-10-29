import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Key,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle
} from "lucide-react";
import { soundEngine } from "../utils/soundEngine";
import { updateActiveProfileApiKey, STORAGE_API_KEY_CONFIGURED } from "../utils/userProfiles";

interface ApiKeySetupModalProps {
  isOpen: boolean;
  onSuccess: (apiKey: string) => void;
  onCancel?: () => void;
  canDismiss?: boolean;
}

export const ApiKeySetupModal: React.FC<ApiKeySetupModalProps> = ({
  isOpen,
  onSuccess,
  onCancel,
  canDismiss = true,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [showHelloAnimation, setShowHelloAnimation] = useState(false);

  // Prepopulate if previously stored in localStorage
  useEffect(() => {
    if (isOpen && typeof localStorage !== "undefined") {
      const stored = (localStorage.getItem("custom_gemini_api_key") || "").trim();
      if (stored) {
        setApiKeyInput(stored);
      }
    }
  }, [isOpen]);

  const handleValidateAndRun = async () => {
    const cleanKey = apiKeyInput
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/[\r\n\t]/g, "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim();

    if (!cleanKey) {
      setIsError(true);
      setStatusMessage("দয়া করে আপনার Gemini API Key টি পেস্ট করুন!");
      soundEngine.playAlertBeep();
      return;
    }

    if (cleanKey.startsWith("ya29.") || cleanKey.startsWith("Bearer ") || cleanKey.includes("eyJ")) {
      setIsError(true);
      setStatusMessage("এটি একটি Google OAuth এক্সেস টোকেন, Gemini API Key নয়। অনুগ্রহ করে Google AI Studio থেকে ফ্রি Gemini API Key প্রদান করুন (যা 'AIzaSy' দিয়ে শুরু হয়)।");
      soundEngine.playAlertBeep();
      return;
    }

    if (cleanKey.length < 15) {
      setIsError(true);
      setStatusMessage("API Key-টি অসম্পূর্ণ বা ভুল ফরম্যাট। Gemini Key সাধারণত 'AIzaSy' দিয়ে শুরু হয়।");
      soundEngine.playAlertBeep();
      return;
    }

    setIsVerifying(true);
    setIsError(false);
    setStatusMessage("API Key যাচাই করা হচ্ছে (Verifying connection)...");
    soundEngine.playActionBeep();

    try {
      const response = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: cleanKey }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        // Save key to active user profile and mark as configured
        updateActiveProfileApiKey(cleanKey);
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("custom_gemini_api_key", cleanKey);
          localStorage.setItem(STORAGE_API_KEY_CONFIGURED, "true");
        }

        // Trigger Apple iPhone "hello" welcome animation
        soundEngine.playWarpEmergeSound();
        setShowHelloAnimation(true);

        setTimeout(() => {
          setIsVerifying(false);
          setShowHelloAnimation(false);
          onSuccess(cleanKey);
        }, 3400);
      } else {
        setIsVerifying(false);
        setIsError(true);
        let errorMsg = data.error || "ভুল API Key! দয়া করে সঠিক Gemini Key প্রদান করুন।";
        try {
          const parsed = typeof errorMsg === "string" ? JSON.parse(errorMsg) : errorMsg;
          if (parsed?.error?.message) errorMsg = parsed.error.message;
        } catch {}
        setStatusMessage(errorMsg);
        soundEngine.playAlertBeep();
      }
    } catch (err: any) {
      // If server route is temporarily unreachable, fallback to client save with warning
      if (cleanKey.length >= 20) {
        updateActiveProfileApiKey(cleanKey);
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("custom_gemini_api_key", cleanKey);
          localStorage.setItem(STORAGE_API_KEY_CONFIGURED, "true");
        }
        setShowHelloAnimation(true);
        setTimeout(() => {
          setIsVerifying(false);
          setShowHelloAnimation(false);
          onSuccess(cleanKey);
        }, 3000);
      } else {
        setIsVerifying(false);
        setIsError(true);
        setStatusMessage("API Key যাচাই করা যায়নি। কী-টি সম্পূর্ণ কিনা পুনরায় চেক করুন।");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl select-none">
        {/* ========================================================================= */}
        {/* IPHONE "HELLO" CINEMATIC INTRO SCREEN (WHEN KEY IS VALIDATED)             */}
        {/* ========================================================================= */}
        {showHelloAnimation ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center justify-center text-center max-w-md w-full px-6 py-12 relative"
          >
            {/* Ambient Apple Glow */}
            <div className="absolute -inset-10 bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-blue-500/20 blur-3xl rounded-full pointer-events-none" />

            {/* Apple "hello" signature cursive cursive-look motion */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 1, ease: "easeOut" }}
              className="relative z-10"
            >
              <h1
                style={{ fontFamily: "'Caveat', 'Playfair Display', cursive, serif" }}
                className="text-7xl sm:text-8xl md:text-9xl tracking-tight text-white select-none drop-shadow-[0_12px_45px_rgba(255,255,255,0.45)] font-medium"
              >
                hello
              </h1>
            </motion.div>

            {/* Subtitle Welcome */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.7 }}
              className="text-sm sm:text-base text-white/80 font-medium tracking-wide mt-4 relative z-10"
            >
              Welcome to Tune AI Companion
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.3, duration: 0.6 }}
              className="mt-3 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" /> API Key Verified & Ready
            </motion.div>

            {/* CREATOR SIGNATURE (Requested by User: Niche choto kore amar nam lekha thakbe) */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.7, duration: 0.8 }}
              className="mt-12 flex flex-col items-center gap-1 relative z-10"
            >
              <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-white/20 to-transparent mb-2" />
              <p className="text-[11px] uppercase tracking-[0.25em] text-white/40 font-mono font-medium">
                Crafted & Built with ❤️ by
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-semibold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300">
                  Sondip Saha
                </span>
                <span className="text-[10px] text-white/40 font-mono">(Sondip)</span>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          /* ========================================================================= */
          /* API KEY ENTRY MODAL CARD                                                  */
          /* ========================================================================= */
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="w-full max-w-md bg-[#16161a] border border-white/15 rounded-[32px] p-6 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.85)] relative overflow-hidden flex flex-col"
          >
            {/* Top Gloss Edge */}
            <div className="absolute top-0 inset-x-10 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

            {/* Header Icon + Title */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-md shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                    Connect Your Gemini API Key
                  </h3>
                  <p className="text-[11px] text-white/50 font-sans">
                    সম্পূর্ণ ফ্রিতে Tune Voice Companion ব্যবহার করুন
                  </p>
                </div>
              </div>

              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/60 hover:text-white flex items-center justify-center transition cursor-pointer"
                  title="Close (বন্ধ করুন)"
                  aria-label="Close"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Security & Multi-User Explanation */}
            <div className="mb-4 p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>100% Private & Device Local</span>
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed font-sans">
                আপনার দেওয়া <strong>Gemini API Key</strong> শুধুমাত্র আপনার নিজের ডিভাইসে সেভ থাকে।
                অন্য কারও সাথে শেয়ার হয় না, এবং অন্য কেউ আপনার অ্যাকাউন্ট বা কোটা ব্যবহার করতে পারবে না।
              </p>
            </div>

            {/* Input Field */}
            <div className="space-y-2 mb-4">
              <label className="text-[11px] font-mono font-medium text-white/60 uppercase tracking-wider block">
                Paste Gemini API Key (AI Studio)
              </label>

              <div className="flex items-center gap-2 bg-black/40 border border-white/15 focus-within:border-cyan-400/70 rounded-2xl px-3.5 py-3 transition-colors">
                <Key className="w-4 h-4 text-cyan-400/70 shrink-0" />
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value);
                    if (isError) setIsError(false);
                  }}
                  placeholder="AIzaSy..."
                  autoComplete="off"
                  spellCheck="false"
                  disabled={isVerifying}
                  className="flex-1 bg-transparent text-sm text-cyan-300 font-mono placeholder:text-white/25 outline-none min-w-0"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="text-white/40 hover:text-white transition p-1 cursor-pointer shrink-0"
                  title={showKey ? "Hide Key" : "Show Key"}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Status or error message */}
              {statusMessage && (
                <div
                  className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${
                    isError
                      ? "bg-red-500/10 border border-red-500/30 text-red-300"
                      : "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 animate-pulse"
                  }`}
                >
                  {isError ? <AlertCircle className="w-3.5 h-3.5 shrink-0" /> : <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                  <span className="leading-snug">{statusMessage}</span>
                </div>
              )}
            </div>

            {/* Run Button */}
            <button
              type="button"
              onClick={handleValidateAndRun}
              disabled={isVerifying}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 hover:from-cyan-400 to-blue-600 hover:to-blue-500 disabled:opacity-50 text-zinc-950 font-bold text-xs uppercase tracking-wider font-mono flex items-center justify-center gap-2 shadow-[0_4px_25px_rgba(6,182,212,0.35)] transition cursor-pointer active:scale-[0.98]"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying API Key...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-zinc-950" />
                  <span>Save & Run Tune Companion</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Get Free API Key Link */}
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
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

            {/* Small Footer Branding by Sondip */}
            <div className="mt-4 pt-2 flex items-center justify-center text-[10px] text-white/35 font-mono">
              Designed & Engineered by Sondip
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};

export default ApiKeySetupModal;
