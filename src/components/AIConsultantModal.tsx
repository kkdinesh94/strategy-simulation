import React, { useState } from "react";
import { TeamState, GameState } from "../types/simulation";
import { ShieldAlert, X, Sparkles, Send, Clock } from "lucide-react";

interface AIConsultantModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: TeamState;
  gameState: GameState;
}

export const AIConsultantModal: React.FC<AIConsultantModalProps> = ({
  isOpen,
  onClose
}) => {
  const [prompt, setPrompt] = useState<string>("");
  const [notice, setNotice] = useState<string>("");

  if (!isOpen) return null;

  const handleAskAdvisor = () => {
    setNotice("Under progress: The AI Board Strategic Advisor engine is currently being upgraded for multi-segment predictive analysis and will be available in the upcoming release.");
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1F2022]/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-[#E5E1D8] pb-3">
          <div className="flex items-center gap-2 text-[#C83E2B]">
            <Sparkles className="w-5 h-5 text-[#C83E2B]" />
            <h3 className="text-base font-bold text-[#1F2022]">
              AI Board of Directors Strategic Advisor
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-mono font-bold uppercase tracking-wider">
              Under Progress
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#8A8C90] hover:text-[#1F2022] rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto space-y-4 text-xs text-[#2C2D30]">
          {/* Progress Alert Banner */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg shrink-0 text-amber-800">
              <Clock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-amber-950 text-sm">Feature Under Progress</h4>
              <p className="text-amber-800 text-xs leading-relaxed">
                The AI Board Advisor feature is currently under active development. Strategic feedback for product pricing, marketing claims, and capacity expansion will be available in the next release.
              </p>
            </div>
          </div>

          <div className="flex gap-2 opacity-60">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Is our pricing too high for the Commuters segment in Q3?"
              className="flex-1 p-2.5 bg-white border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022] focus:outline-none"
            />
            <button
              onClick={handleAskAdvisor}
              className="px-4 py-2.5 bg-[#1F2022] hover:bg-[#343538] text-white font-semibold rounded-lg flex items-center gap-1.5 transition text-xs shadow-2xs"
            >
              <Send className="w-4 h-4" /> Ask
            </button>
          </div>

          {notice && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>{notice}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

