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
}

export function RightPanel({ team, gameState, universeId, onNotify, onNavigate, decisionRevision }: RightPanelProps) {
  return (
    <div
      style={{
        width: "260px",
        flexShrink: 0,
        borderLeft: "0.5px solid #E5E1D8",
        overflowY: "auto",
        background: "#FAF8F5"
      }}
    >
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
      <div>
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
      </div>
    </div>
  );
}

export default RightPanel;
