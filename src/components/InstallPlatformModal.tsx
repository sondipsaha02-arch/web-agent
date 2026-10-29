import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Smartphone,
  Monitor,
  Globe,
  Download,
  Check,
  Copy,
  QrCode,
  Sparkles,
  ExternalLink,
  X,
  ShieldCheck,
  Share2,
  Package,
  Layers,
  ArrowRight,
  Info
} from "lucide-react";

interface InstallPlatformModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
  onTriggerInstall?: () => void;
}

export const InstallPlatformModal: React.FC<InstallPlatformModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onTriggerInstall
}) => {
  const [activeTab, setActiveTab] = useState<"android" | "windows" | "web">("android");
  const [copied, setCopied] = useState(false);

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(currentUrl)}`;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Tune AI Companion",
          text: "Experience Tune - Your Voice, Vision & Intelligence AI Companion!",
          url: currentUrl
        });
      } catch (err) {}
    } else {
      handleCopy();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-xl bg-zinc-950 border border-cyan-500/30 rounded-[28px] p-5 sm:p-6 shadow-[0_0_80px_rgba(6,182,212,0.18)] text-white overflow-hidden"
        >
          {/* Ambient ambient background gradients */}
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-white/10 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-zinc-950 shadow-md shrink-0">
                <Download className="w-5 h-5 text-zinc-950" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display tracking-wide text-white">
                  INSTALL & RUN TUNE AI
                </h3>
                <p className="text-[11px] font-mono text-cyan-300">
                  Android • Windows 10/11 • Web Browser
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Platform Tab Navigation */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/10 my-4 relative z-10">
            <button
              onClick={() => setActiveTab("android")}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === "android"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 shadow-md font-extrabold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>Android</span>
            </button>

            <button
              onClick={() => setActiveTab("windows")}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === "windows"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-zinc-950 shadow-md font-extrabold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Monitor className="w-4 h-4 shrink-0" />
              <span>Windows</span>
            </button>

            <button
              onClick={() => setActiveTab("web")}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === "web"
                  ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md font-extrabold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span>Web</span>
            </button>
          </div>

          {/* TAB 1: ANDROID INSTRUCTIONS & 1-CLICK WEBAPK */}
          {activeTab === "android" && (
            <div className="space-y-3.5 relative z-10">
              <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-3 text-[11px] text-emerald-200 leading-relaxed flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block mb-0.5">
                    Official Google WebAPK (No APK Parse Errors!)
                  </span>
                  Android এ সাধারণ আনসাইন্ড .apk ফাইল সিকিউরিটি কারণে ইন্সটল হয় না। গুগল প্লে সার্ভিসেস স্বয়ংক্রিয়ভাবে সরাসরি আপনার ফোনের হোম স্ক্রিনে অফিশিয়াল <strong>WebAPK</strong> তৈরি করে দেয়।
                </div>
              </div>

              {deferredPrompt ? (
                <button
                  onClick={onTriggerInstall}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  1-Click Install Tune on Android Now
                </button>
              ) : (
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 space-y-2.5">
                  <span className="text-[11px] font-bold font-mono text-emerald-400 uppercase tracking-wider block">
                    📱 Android Chrome এ ইন্সটল করার সহজ ৩টি স্টেপ:
                  </span>
                  <ol className="space-y-2 list-decimal pl-4 text-[11px] text-white/90 leading-relaxed">
                    <li>
                      আপনার ফোনের <strong>Google Chrome</strong> ব্রাউজারে এই পেজটি ওপেন করুন।
                    </li>
                    <li>
                      ক্রোমের উপরের ডান পাশের <strong>৩ ডট মেনু (⋮)</strong> এ ট্যাপ করুন।
                    </li>
                    <li>
                      <strong>"Install App"</strong> (বা <strong>"Add to Home Screen" / "হোম স্ক্রিনে যোগ করুন"</strong>) অপশনে ট্যাপ করুন।
                    </li>
                  </ol>
                  <p className="text-[10px] text-white/50 pt-1 border-t border-white/5">
                    ✅ এটি স্বয়ংক্রিয়ভাবে আপনার ফোনে ফুল-স্ক্রিন অ্যাপ আইকন, ব্যাকগ্রাউন্ড ভয়েস ও পার্মানেন্ট মাইক সাপোর্ট সহ আসল অ্যাপের মতো ইন্সটল হয়ে যাবে।
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleNativeShare}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Send Link to Android Phone</span>
                </button>
                <button
                  onClick={handleCopy}
                  className="px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy URL"}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: WINDOWS DESKTOP PWA */}
          {activeTab === "windows" && (
            <div className="space-y-3.5 relative z-10">
              <div className="bg-cyan-500/10 border border-cyan-500/25 rounded-2xl p-3 text-[11px] text-cyan-200 leading-relaxed flex items-start gap-2.5">
                <Monitor className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block mb-0.5">
                    Windows 10 / 11 Native Desktop App
                  </span>
                  Tune উইন্ডোজ কম্পিউটারে সরাসরি একটি স্ট্যান্ডঅ্যালোন ডেস্কটপ অ্যাপ হিসেবে রান করতে পারে, যা আপনার Windows Start Menu ও Taskbar এ যুক্ত হয়ে যায়!
                </div>
              </div>

              {deferredPrompt ? (
                <button
                  onClick={onTriggerInstall}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-zinc-950 font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition cursor-pointer active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  1-Click Install on Windows Desktop (PWA)
                </button>
              ) : (
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 space-y-2.5">
                  <span className="text-[11px] font-bold font-mono text-cyan-400 uppercase tracking-wider block">
                    💻 Windows এ ইন্সটল করার সহজ নিয়ম (Chrome বা Edge):
                  </span>
                  <ol className="space-y-2 list-decimal pl-4 text-[11px] text-white/90 leading-relaxed">
                    <li>
                      আপনার কম্পিউটারে <strong>Google Chrome</strong> অথবা <strong>Microsoft Edge</strong> এ এই লিংকটি ওপেন করুন।
                    </li>
                    <li>
                      ব্রাউজারের অ্যাড্রেস বারের (URL bar) একদম ডান পাশে <strong>ইন্সটল আইকন (⊕ বা 💻 App available)</strong> দেখতে পাবেন, সেখানে ক্লিক করুন।
                    </li>
                    <li>
                      অথবা ব্রাউজারের ৩ ডট মেনু (⋮) থেকে <strong>"Install Tune AI Companion"</strong> সিলেক্ট করুন।
                    </li>
                  </ol>
                  <p className="text-[10px] text-white/50 pt-1 border-t border-white/5">
                    ✅ এটি সরাসরি আপনার Windows Taskbar ও Start Menu তে পিন হয়ে যাবে এবং আলাদা উইন্ডোতে সুপার-ফাস্ট চলবে।
                  </p>
                </div>
              )}

              {/* Windows Launcher Direct Downloads */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href="/api/download/Tune_AI_Windows_Launcher.bat"
                  download="Tune_AI_Windows_Launcher.bat"
                  className="py-2.5 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download Windows Launcher (.bat)</span>
                </a>
                <a
                  href="/api/download/Tune_AI_Windows_Shortcut.url"
                  download="Tune_AI_Companion.url"
                  className="py-2.5 px-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>Download Windows Shortcut (.url)</span>
                </a>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "URL Copied to Clipboard!" : "Copy Web URL for Windows"}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: DIRECT WEB ACCESS */}
          {activeTab === "web" && (
            <div className="space-y-3.5 relative z-10">
              <div className="bg-purple-500/10 border border-purple-500/25 rounded-2xl p-3 text-[11px] text-purple-200 leading-relaxed flex items-start gap-2.5">
                <Globe className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block mb-0.5">
                    Instant Browser Access (Zero Installation Needed)
                  </span>
                  যেকোনো ডিভাইস (মোবাইল, ল্যাপটপ, ট্যাবলেট, ম্যাক, লিনাক্স) থেকে সরাসরি ব্রাউজারে লিংক ওপেন করেই টিউন ব্যবহার করা যায়!
                </div>
              </div>

              {/* URL Display Box */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentUrl}
                  className="flex-1 bg-transparent text-xs text-purple-300 font-mono outline-none min-w-0 select-all px-1"
                />
                <button
                  onClick={handleCopy}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                    copied
                      ? "bg-purple-500 text-white"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>

              {/* QR Code section */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/[0.03] border border-white/5 p-3 rounded-2xl">
                <div className="p-2 bg-white rounded-xl shrink-0 shadow-lg">
                  <img
                    src={qrCodeUrl}
                    alt="Quick Connect QR Code"
                    className="w-24 h-24 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-center sm:text-left">
                  <h4 className="text-xs font-bold text-white">Scan with Phone Camera</h4>
                  <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
                    আপনার ফোনের ক্যামেরা বা কিউআর কোড স্ক্যানার দিয়ে স্ক্যান করলেই তাৎক্ষণিক টিউনের ফুল ফিচার চালু হয়ে যাবে।
                  </p>
                </div>
              </div>

              {/* Full Source Code Bundle Option */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-white/50">Run locally on your PC:</span>
                <a
                  href="/api/download/project.zip"
                  download="TuneCompanion_Source_Bundle.zip"
                  className="text-[11px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Download Project Bundle (.zip)</span>
                </a>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between relative z-10">
            <span className="text-[10px] text-white/40 font-mono">
              Tune AI Companion v1.0 • PWA & WebAPK Ready
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default InstallPlatformModal;
