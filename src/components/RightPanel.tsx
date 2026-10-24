import React from "react";
import { GameState, TeamState } from "../types/simulation";
import { TabKey } from "./Navbar";
import { ProFormaPanel } from "./tabs/ProFormaPanel";
import QuarterChecklist from "./QuarterChecklist";

interface RightPanelProps {
  team: TeamState;
  gameState: GameState;
  universeId: string;
  onNotify?: (msg: string) => void;
  onNavigate?: (tab: TabKey) => void;
  decisionRevision?: number;
  /** Fill the container (drawer) instead of the fixed desktop column width. */
  fill?: boolean;
  /** Hide the checklist where the page already shows it (Home). */
  showChecklist?: boolean;
}

export function RightPanel({ team, gameState, universeId, onNotify, onNavigate, decisionRevision, fill = false, showChecklist = true }: RightPanelProps) {
  return (
    <aside aria-label="Cash forecast" className={`${fill ? "w-full flex-1" : "w-[272px] h-full border-l border-[#E5E1D8]"} shrink-0 overflow-y-auto bg-[#FAF8F5]`}>
      <div style={{ borderBottom: "0.5px solid #E5E1D8" }}>
        <ProFormaPanel
          team={team}
          gameState={gameState}
          universeId={universeId}
          onNotify={onNotify}
          compact
          decisionRevision={decisionRevision}
          onExpand={onNavigate ? () => onNavigate("finance") : undefined}
        />
      </div>
      {showChecklist && <div>
        <div className="px-3 pt-3 pb-1 text-[10px] uppercase text-[#96989B]">
          Q{gameState.quarter} priorities
        </div>
        <QuarterChecklist
          universeId={universeId}
          teamId={team.i}
          quarter={gameState.quarter}
          onNavigate={onNavigate}
          team={team}
        />
      </div>}
    </aside>
  );
}

export default RightPanel;
