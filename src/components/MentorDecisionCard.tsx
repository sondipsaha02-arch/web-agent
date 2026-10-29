import React, { useState } from "react";
import { motion } from "motion/react";
import { Brain, CheckCircle2, AlertTriangle, Scale, Lightbulb, X, Copy, Check } from "lucide-react";
import { soundEngine } from "../utils/soundEngine";

interface DecisionOption {
  optionTitle: string;
  summary?: string;
  pros?: string[];
  cons?: string[];
  tradeOffs?: string;
}

interface MentorDecisionCardProps {
  dilemma: string;
  options: DecisionOption[];
  recommendation?: string;
  onClose?: () => void;
}

export const MentorDecisionCard: React.FC<MentorDecisionCardProps> = ({
  dilemma,
  options = [],
  recommendation,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const handleCopySummary = () => {
    let text = `🧠 Wise Mentor Decision Counsel\nDilemma: ${dilemma}\n\n`;
    options.forEach((opt, idx) => {
      text += `Option ${String.fromCharCode(65 + idx)}: ${opt.optionTitle}\n`;
      if (opt.summary) text += `${opt.summary}\n`;
      if (opt.pros?.length) text += `Pros: ${opt.pros.join(", ")}\n`;
      if (opt.cons?.length) text += `Cons: ${opt.cons.join(", ")}\n`;
      if (opt.tradeOffs) text += `Trade-offs: ${opt.tradeOffs}\n`;
      text += `\n`;
    });
    if (recommendation) {
      text += `Recommendation: ${recommendation}\n`;
    }
    navigator.clipboard?.writeText(text);
    setCopied(true);
    soundEngine.playActionBeep();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="w-full max-w-xl bg-zinc-950/95 backdrop-blur-2xl border border-emerald-500/30 rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col gap-3.5 text-left pointer-events-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-300">
              Wise Mentor Decision Counsel
            </h3>
            <p className="text-[11px] text-white/50 font-mono">
              Empowering Boss with clear paths & trade-offs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopySummary}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition"
            title="Copy Decision Summary"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Dilemma question */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3.5 py-2">
        <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block mb-0.5">
          Dilemma / Decision Problem:
        </span>
        <p className="text-xs sm:text-sm font-semibold text-white/95 leading-snug">
          {dilemma}
        </p>
      </div>

      {/* Options list */}
      <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
        {options.map((opt, idx) => {
          const optLabel = String.fromCharCode(65 + idx);
          const isSelected = selectedOption === idx;
          return (
            <div
              key={idx}
              onClick={() => setSelectedOption(isSelected ? null : idx)}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                isSelected
                  ? "bg-zinc-900 border-cyan-500/50 shadow-md"
                  : "bg-zinc-900/70 border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/90 text-[10px] font-mono font-bold">
                    Option {optLabel}
                  </span>
                  <h4 className="text-xs font-bold text-white/90">{opt.optionTitle}</h4>
                </div>
              </div>

              {opt.summary && (
                <p className="text-[11px] text-white/70 italic mb-2 leading-relaxed">
                  "{opt.summary}"
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {opt.pros && opt.pros.length > 0 && (
                  <div className="flex flex-col gap-1 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                    <span className="text-[9px] font-bold font-mono text-emerald-400 flex items-center gap-1 uppercase">
                      <CheckCircle2 className="w-3 h-3" /> Advantages (Pros)
                    </span>
                    <ul className="list-disc list-inside text-white/80 space-y-0.5">
                      {opt.pros.map((pro, pIdx) => (
                        <li key={pIdx} className="leading-tight">{pro}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {opt.cons && opt.cons.length > 0 && (
                  <div className="flex flex-col gap-1 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                    <span className="text-[9px] font-bold font-mono text-rose-400 flex items-center gap-1 uppercase">
                      <AlertTriangle className="w-3 h-3" /> Risks / Costs (Cons)
                    </span>
                    <ul className="list-disc list-inside text-white/80 space-y-0.5">
                      {opt.cons.map((con, cIdx) => (
                        <li key={cIdx} className="leading-tight">{con}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {opt.tradeOffs && (
                <div className="mt-2 text-[10px] text-white/60 flex items-center gap-1.5 font-mono">
                  <Scale className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>{opt.tradeOffs}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Wise Mentor Recommendation */}
      {recommendation && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 flex items-start gap-2.5">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono uppercase font-bold text-amber-300 block mb-0.5">
              Wise Mentor's Bottom Line:
            </span>
            <p className="text-xs text-amber-100 font-medium leading-relaxed">
              {recommendation}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
};
