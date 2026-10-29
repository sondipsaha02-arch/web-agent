import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Share2,
  Copy,
  Check,
  Smartphone,
  QrCode,
  X,
  Key,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Info
} from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl?: string;
  onOpenApiKeySettings?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  shareUrl = typeof window !== "undefined" ? window.location.href : "",
  onOpenApiKeySettings
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"qr" | "link">("qr");

  const cleanUrl = shareUrl || (typeof window !== "undefined" ? window.location.href : "");
  const qrCodeImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(cleanUrl)}`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cleanUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Tune - AI Companion",
          text: "Experience Tune - Your Voice, Vision & Intelligence AI Companion!",
          url: cleanUrl
        });
      } catch (err) {
        console.warn("Share cancelled or failed:", err);
      }
    } else {
      handleCopyLink();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-zinc-950/95 border border-white/10 rounded-3xl p-6 shadow-[0_0_80px_rgba(16,185,129,0.12)] text-white overflow-hidden"
        >
          {/* Top ambient glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  Share & Mobile Access
                </h3>
                <p className="text-[11px] text-white/50">
                  মোবাইলে ব্যবহার ও বন্ধুদের শেয়ার করার উপায়
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Sub-tabs */}
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 my-4">
            <button
              onClick={() => setActiveTab("qr")}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === "qr"
                  ? "bg-emerald-500 text-zinc-950 shadow-md font-bold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              Scan QR Code
            </button>
            <button
              onClick={() => setActiveTab("link")}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === "link"
                  ? "bg-emerald-500 text-zinc-950 shadow-md font-bold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              Direct Link
            </button>
          </div>

          {/* QR Tab */}
          {activeTab === "qr" && (
            <div className="flex flex-col items-center justify-center py-2 text-center">
              <div className="relative p-3 bg-white rounded-2xl shadow-2xl border-4 border-emerald-500/30 group">
                <img
                  src={qrCodeImgUrl}
                  alt="App QR Code"
                  className="w-48 h-48 rounded-lg object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <p className="text-xs text-emerald-300 font-medium mt-3 flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                আপনার ফোনের ক্যামেরা দিয়ে কিউআর কোডটি স্ক্যান করুন
              </p>
              <p className="text-[11px] text-white/50 mt-1 max-w-xs">
                Scan with any smartphone camera or Chrome/Safari to instantly open Tune on your mobile phone!
              </p>
            </div>
          )}

          {/* Link Tab */}
          {activeTab === "link" && (
            <div className="flex flex-col gap-3 py-2">
              <label className="text-[11px] text-white/60 font-medium flex items-center gap-1">
                <Share2 className="w-3 h-3 text-emerald-400" />
                Shareable Application URL:
              </label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-2.5">
                <input
                  type="text"
                  readOnly
                  value={cleanUrl}
                  className="flex-1 bg-transparent text-xs text-emerald-300 font-mono outline-none min-w-0 select-all"
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    copied
                      ? "bg-emerald-500 text-zinc-950"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>

              {/* Native OS Share Button */}
              {typeof navigator !== "undefined" && "share" in navigator && (
                <button
                  onClick={handleNativeShare}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer active:scale-98 mt-1"
                >
                  <Share2 className="w-4 h-4" />
                  Share via Phone App (WhatsApp / Messenger / SMS)
                </button>
              )}
            </div>
          )}

          {/* Multi-User Custom API Key Info Banner */}
          <div className="mt-4 p-3.5 rounded-2xl bg-white/3 border border-white/10 flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
              <Key className="w-4 h-4" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                Custom API Key Supported!
              </h4>
              <p className="text-[11px] text-white/70 leading-relaxed mt-0.5">
                আপনি যাকে লিংক পাঠাবেন, সে তার ফোনের **সেটিংসে (Settings &gt; API Keys)** গিয়ে নিজের জেমিনাই এপিআই কি (Gemini API Key) বসিয়ে ফ্রিতে সব ফিচার আনলিমিটেড ব্যবহার করতে পারবে।
              </p>

              {onOpenApiKeySettings && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenApiKeySettings();
                  }}
                  className="mt-2.5 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 underline underline-offset-2 cursor-pointer"
                >
                  Set your own Gemini API Key in Settings <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Footer Close */}
          <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
