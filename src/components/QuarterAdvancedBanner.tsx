import React from "react";
import { Zap } from "lucide-react";

interface QuarterAdvancedBannerProps {
  newQuarter: number;
  onRefresh: () => void;
  onDismiss: () => void;
}

export function QuarterAdvancedBanner({ newQuarter, onRefresh, onDismiss }: QuarterAdvancedBannerProps) {
  return (
    <div className="w-full bg-emerald-50 border-b border-emerald-300 px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-emerald-900 font-semibold">
        <Zap className="w-4 h-4 text-emerald-700" />
        <span>
          Quarter {newQuarter - 1} results are ready! Refresh to begin Q{newQuarter}.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          className="px-3 py-1 rounded-md bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
        >
          Refresh now
        </button>
        <button
          onClick={onDismiss}
          className="px-2 py-1 text-xs text-emerald-800 hover:text-emerald-900"
        >
          ✕ Dismiss
        </button>
      </div>
    </div>
  );
}
