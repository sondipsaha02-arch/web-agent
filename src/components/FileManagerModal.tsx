import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Folder,
  FileCode,
  Download,
  Smartphone,
  X,
  ChevronRight,
  ArrowLeft,
  FileText,
  Package,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Code,
  HardDrive,
  Copy,
  Check,
  QrCode,
  AlertCircle
} from "lucide-react";

interface FileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FileItem {
  name: string;
  relativePath: string;
  isDirectory: boolean;
  size: number;
  mtime: string | null;
}

export function FileManagerModal({ isOpen, onClose }: FileManagerModalProps) {
  const [activeTab, setActiveTab] = useState<"apk" | "files">("apk");

  // File Manager State
  const [currentDir, setCurrentDir] = useState<string>(".");
  const [filesList, setFilesList] = useState<FileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<string | null>("server.ts");
  const [fileContent, setFileContent] = useState<string>("");
  const [loadingContent, setLoadingContent] = useState<boolean>(false);

  // Copy helper
  const [copiedPath, setCopiedPath] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Catch PWA Install Prompt for Android
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  // Fetch Directory Files
  const fetchDirectory = async (dir: string) => {
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/files/list?dir=${encodeURIComponent(dir)}`);
      const data = await res.json();
      if (data.files) {
        setFilesList(data.files);
        setCurrentDir(dir);
      }
    } catch (err) {
      console.error("Error fetching files:", err);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Fetch File Content
  const fetchFileContent = async (filePath: string) => {
    setLoadingContent(true);
    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.content !== undefined) {
        setFileContent(data.content);
        setSelectedFile(filePath);
      }
    } catch (err) {
      console.error("Error reading file:", err);
      setFileContent("// Failed to load file contents");
    } finally {
      setLoadingContent(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDirectory(currentDir);
      if (selectedFile) {
        fetchFileContent(selectedFile);
      }
    }
  }, [isOpen]);

  const handleNavigateUp = () => {
    if (currentDir === "." || !currentDir) return;
    const parts = currentDir.split("/").filter(Boolean);
    parts.pop();
    const parentDir = parts.length > 0 ? parts.join("/") : ".";
    fetchDirectory(parentDir);
  };

  const handleInstallPWA = () => {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      installPromptEvent.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === "accepted") {
          setIsInstalled(true);
        }
        setInstallPromptEvent(null);
      });
    } else {
      alert("👉 To install on Android Mobile:\n\n1. Open this website in Google Chrome on your phone.\n2. Tap the 3 dots menu (⋮) at top right.\n3. Tap 'Add to Home screen' or 'Install app'!");
    }
  };

  const handleCopyPath = (pathText: string) => {
    navigator.clipboard.writeText(pathText);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-5xl h-[88vh] bg-[#0c0c14]/95 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col font-sans"
        >
          {/* HEADER BAR */}
          <div className="px-5 py-4 bg-[#12121d] border-b border-white/10 flex items-center justify-between select-none">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-wider text-white flex items-center gap-2">
                  TUNE FILE MANAGER & ANDROID APK HUB
                  <span className="px-2 py-0.5 rounded-md bg-green-500/20 text-green-400 border border-green-500/30 font-mono text-[9px] uppercase font-semibold">
                    Android Ready
                  </span>
                </h2>
                <p className="text-[10px] text-white/40 font-mono">WORKSPACE FILES & MOBILE INSTALLATION PACKAGE</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setActiveTab("apk")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    activeTab === "apk" ? "bg-cyan-500 text-zinc-950 shadow-md font-bold" : "text-white/50 hover:text-white"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> <span>Android APK Hub</span>
                </button>
                <button
                  onClick={() => setActiveTab("files")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    activeTab === "files" ? "bg-blue-500 text-white shadow-md font-bold" : "text-white/50 hover:text-white"
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" /> <span>File Manager</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition cursor-pointer border border-white/5"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* BODY CONTENT */}
          <div className="flex-1 overflow-hidden relative flex flex-col bg-[#07070b]">
            {/* TAB 1: ANDROID APK & MOBILE HUB */}
            {activeTab === "apk" && (
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                {/* Notice explaining APK parse issue & the official solution */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 md:p-5 flex items-start gap-3.5">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-200/90 leading-relaxed space-y-1">
                    <div className="font-bold text-white text-sm">
                      Android APK "App Not Installed / Parse Error" সমাধানের সহজ নিয়ম:
                    </div>
                    <p>
                      Android 8 থেকে 15 পর্যন্ত যেকোনো ফোনে আনসাইন্ড সাধারণ জিপ বা কাঁচা .apk ফাইল দিলে সিকিউরিটির জন্য ফোন <em>"There was a problem parsing the package"</em> বা <em>"App not installed"</em> দেখায়।
                    </p>
                    <p className="text-amber-300 font-medium">
                      👉 <strong>আসল সমাধান:</strong> গুগল প্লে সার্ভিসেস ও ক্রোম সরাসরি আপনার ফোনের হোম স্ক্রিনে অফিশিয়াল <strong>Google WebAPK</strong> বানিয়ে দেয়, যাতে কোনো পার্স এরর ছাড়াই আসল অ্যাপের মতো ফুল-স্ক্রিনে চলে!
                    </p>
                  </div>
                </div>

                {/* 3-Platform Action Grid: Android, Windows, Web */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Android WebAPK Card */}
                  <div className="bg-gradient-to-b from-[#0f231c] to-[#0a1512] border border-emerald-500/30 rounded-2xl p-4 md:p-5 flex flex-col justify-between space-y-4 shadow-lg shadow-emerald-950/30">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase">
                        <Smartphone className="w-4 h-4" /> 1. Android Mobile
                      </div>
                      <h4 className="text-sm font-bold text-white">Google WebAPK (100% Working)</h4>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        কোনো পার্স এরর ছাড়া সরাসরি আপনার ফোনের হোম স্ক্রিন ও অ্যাপ ড্রয়ারে ইন্সটল করুন।
                      </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <button
                        onClick={handleInstallPWA}
                        className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{isInstalled ? "✓ Installed on Phone" : "1-Click Install WebAPK"}</span>
                      </button>
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent("tune_open_install_modal"))}
                        className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <span>Android ইন্সটলেশন গাইড দেখুন</span>
                      </button>
                    </div>
                  </div>

                  {/* Windows Desktop Card */}
                  <div className="bg-gradient-to-b from-[#0f1d2e] to-[#0a111a] border border-cyan-500/30 rounded-2xl p-4 md:p-5 flex flex-col justify-between space-y-4 shadow-lg shadow-cyan-950/30">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase">
                        <HardDrive className="w-4 h-4" /> 2. Windows PC
                      </div>
                      <h4 className="text-sm font-bold text-white">Windows Desktop Launcher</h4>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        উইন্ডোজ কম্পিউটারের ডেস্কটপ বা টাস্কবার থেকে সরাসরি ১-ক্লিকে ফুল স্ক্রিনে রান করুন।
                      </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <a
                        href="/api/download/Tune_AI_Windows_Launcher.bat"
                        download="Tune_AI_Windows_Launcher.bat"
                        className="w-full py-2.5 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Windows Launcher (.bat)</span>
                      </a>
                      <a
                        href="/api/download/Tune_AI_Windows_Shortcut.url"
                        download="Tune_AI_Companion.url"
                        className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Download Desktop Shortcut (.url)</span>
                      </a>
                    </div>
                  </div>

                  {/* Web Browser & Bundle Card */}
                  <div className="bg-gradient-to-b from-[#1c122b] to-[#120b1c] border border-purple-500/30 rounded-2xl p-4 md:p-5 flex flex-col justify-between space-y-4 shadow-lg shadow-purple-950/30">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-purple-400 font-mono text-xs font-bold uppercase">
                        <Sparkles className="w-4 h-4" /> 3. Direct Web Browser
                      </div>
                      <h4 className="text-sm font-bold text-white">Instant Browser Access</h4>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        যেকোনো ব্রাউজারে ইনস্টল ছাড়াই সরাসরি লিংক দিয়ে টিউন ব্যবহার করুন।
                      </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <button
                        onClick={() => handleCopyPath(window.location.origin)}
                        className="w-full py-2.5 px-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                      >
                        {copiedPath ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPath ? "Link Copied!" : "Copy Web URL"}</span>
                      </button>
                      <a
                        href="/api/download/project.zip"
                        download="TuneCompanion_Source_Bundle.zip"
                        className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Download Full Source (.zip)</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Step-by-Step Installation Guide */}
                <div className="bg-[#0b0b12] border border-white/10 rounded-2xl p-5 space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 uppercase font-mono tracking-wider text-cyan-400">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    How to Run on Android, Windows & Web (সহজ গাইড)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Android Step Guide */}
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 space-y-2.5 text-zinc-300">
                      <p className="font-bold text-emerald-400 border-b border-white/10 pb-1.5 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5" /> 📱 Android এ চালানোর নিয়ম:
                      </p>
                      <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-[11px]">
                        <li>
                          আপনার ফোনে <strong>Google Chrome</strong> ব্রাউজারে এই ওয়েব অ্যাড্রেসটি ওপেন করুন।
                        </li>
                        <li>
                          উপরের <span className="text-emerald-400 font-bold">"1-Click Install WebAPK"</span> বাটনে চাপ দিন।
                        </li>
                        <li>
                          অথবা ক্রোমের উপরের ডানপাশের ৩ ডট মেনু (⋮) থেকে <strong>"Install App"</strong> (বা <strong>"Add to Home screen"</strong>) সিলেক্ট করুন।
                        </li>
                        <li>
                          গুগল স্বয়ংক্রিয়ভাবে একটি অফিশিয়াল অ্যাপ হিসেবে এটি আপনার ফোনে ইন্সটল করে দেবে।
                        </li>
                      </ol>
                    </div>

                    {/* Windows Step Guide */}
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 space-y-2.5 text-zinc-300">
                      <p className="font-bold text-cyan-400 border-b border-white/10 pb-1.5 flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5" /> 💻 Windows এ চালানোর নিয়ম:
                      </p>
                      <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-[11px]">
                        <li>
                          উপরের <span className="text-cyan-400 font-bold">"Download Windows Launcher (.bat)"</span> বাটনে ক্লিক করে ফাইলটি ডাউনলোড করুন।
                        </li>
                        <li>
                          ডাউনলোড করা <span className="text-cyan-300 font-bold">Tune_AI_Windows_Launcher.bat</span> ফাইলের ওপর ডাবল-ক্লিক করুন।
                        </li>
                        <li>
                          এটি সরাসরি উইন্ডোজে আপনার ব্রাউজারে ফুল-স্ক্রিনে টিউন রান করবে।
                        </li>
                        <li>
                          অথবা Chrome/Edge ব্রাউজারের অ্যাড্রেস বারের ডান পাশে থাকা <strong>ইন্সটল আইকন (⊕)</strong> ক্লিক করুন।
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: IN-APP FILE MANAGER */}
            {activeTab === "files" && (
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-full">
                {/* File Tree Directory View */}
                <div className="w-full md:w-80 bg-[#0a0a10] border-r border-white/10 flex flex-col h-full overflow-hidden">
                  {/* Current Dir Navigation Bar */}
                  <div className="p-3 bg-[#11111a] border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <button
                        onClick={handleNavigateUp}
                        disabled={currentDir === "."}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white/70 transition cursor-pointer"
                        title="Go up to parent folder"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono text-xs text-cyan-300 truncate font-semibold">
                        {currentDir === "." ? "root" : currentDir}
                      </span>
                    </div>

                    <a
                      href={`/api/download/file?path=${encodeURIComponent(selectedFile || "")}`}
                      download
                      className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs flex items-center gap-1 transition cursor-pointer"
                      title="Download selected file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Directory Items List */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loadingFiles ? (
                      <div className="p-4 text-center font-mono text-xs text-white/40">Loading workspace files...</div>
                    ) : (
                      filesList.map((item) => (
                        <div
                          key={item.relativePath}
                          onClick={() => {
                            if (item.isDirectory) {
                              fetchDirectory(item.relativePath);
                            } else {
                              fetchFileContent(item.relativePath);
                            }
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center justify-between transition cursor-pointer ${
                            selectedFile === item.relativePath
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold"
                              : "text-white/70 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {item.isDirectory ? (
                              <Folder className="w-4 h-4 text-yellow-400 shrink-0" />
                            ) : (
                              <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
                            )}
                            <span className="truncate">{item.name}</span>
                          </div>
                          <span className="text-[10px] text-white/30 shrink-0 font-sans">
                            {item.isDirectory ? "DIR" : `${(item.size / 1024).toFixed(1)} KB`}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* File Preview Content Display */}
                <div className="flex-1 bg-[#050508] flex flex-col h-full overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#0e0e18] border-b border-white/10 flex justify-between items-center select-none">
                    <div className="flex items-center gap-2 font-mono text-xs text-white/70">
                      <Code className="w-4 h-4 text-cyan-400" />
                      <span>{selectedFile || "No file selected"}</span>
                    </div>

                    {selectedFile && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyPath(fileContent)}
                          className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-mono text-zinc-300 flex items-center gap-1 border border-white/10 transition cursor-pointer"
                        >
                          {copiedPath ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-cyan-400" />}
                          <span>{copiedPath ? "Copied" : "Copy Code"}</span>
                        </button>
                        <a
                          href={`/api/download/file?path=${encodeURIComponent(selectedFile)}`}
                          download
                          className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download File</span>
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-auto p-4 font-mono text-xs text-cyan-200 leading-relaxed select-text">
                    {loadingContent ? (
                      <div className="text-white/40 font-mono text-xs">Loading content...</div>
                    ) : fileContent ? (
                      <pre className="whitespace-pre-wrap break-all">{fileContent}</pre>
                    ) : (
                      <div className="text-white/30 font-mono text-xs italic">Select a file from the file explorer to view its contents.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
