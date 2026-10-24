import React, { useState, useEffect, useRef } from "react";
import { TeamState, GameState } from "../types/simulation";
import { User, Universe } from "../types/auth";
import { fmtL } from "../engine/catalog";
import { getAccessibleUniverses } from "../lib/authStore";
import { Lock, Unlock, LogOut, Clock, Calendar, X, Check, KeyRound, Menu, PanelRight, ChevronDown, Sparkles, Eye } from "lucide-react";

interface ExecutiveHeaderProps {
  team: TeamState;
  gameState: GameState;
  currentUser: User;
  universe: Universe;
  allUniverses?: Universe[];
  /** Team being viewed. For staff this is a read-only observation; null = no team selected. */
  observedTeamIdx?: number | null;
  onObserveTeam?: (teamI: number | null) => void;
  onSelectUniverse?: (universe: Universe) => void;
  onLockToggle: () => void;
  onOpenAdvisor?: () => void;
  onLogout: () => void;
  onUpdateDeadline?: (deadlineISO: string | null) => void;
  onOpenChangePassword?: () => void;
  onToggleNav: () => void;
  onToggleForecast: () => void;
}

function useCountdown(deadlineISO?: string | null) {
  const [left, setLeft] = useState<{ text: string; expired: boolean; urgent: boolean } | null>(null);
  useEffect(() => {
    if (!deadlineISO) {
      setLeft(null);
      return;
    }
    const tick = () => {
      const diff = new Date(deadlineISO).getTime() - Date.now();
      if (diff <= 0) return setLeft({ text: "Deadline passed", expired: true, urgent: true });
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLeft({ text: d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`, expired: false, urgent: diff < 3 * 3600000 });
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [deadlineISO]);
  return left;
}

export const ExecutiveHeader: React.FC<ExecutiveHeaderProps> = ({
  team,
  gameState,
  currentUser,
  universe,
  allUniverses = [],
  observedTeamIdx = null,
  onObserveTeam,
  onSelectUniverse,
  onLockToggle,
  onOpenAdvisor,
  onLogout,
  onUpdateDeadline,
  onOpenChangePassword,
  onToggleNav,
  onToggleForecast
}) => {
  const isStaff = currentUser.role === "instructor" || currentUser.role === "admin";
  const accessibleUniverses = getAccessibleUniverses(currentUser, allUniverses.length > 0 ? allUniverses : [universe]);
  const countdown = useCountdown(universe.deadlineISO);
  const gameOver = gameState.phase === "gameover";
  const quarterLabel = gameOver ? "Game complete" : `Quarter ${gameState.quarter} of ${gameState.cfg.quarters}`;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState<boolean>(false);
  const [dtValue, setDtValue] = useState<string>("");
  const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const openDeadlinePicker = () => {
    setDtValue(toLocalInput(universe.deadlineISO ? new Date(universe.deadlineISO) : new Date(Date.now() + 24 * 3600 * 1000)));
    setIsDeadlineModalOpen(true);
  };
  const applyPresetDeadline = (hoursFromNow: number) => setDtValue(toLocalInput(new Date(Date.now() + hoursFromNow * 3600 * 1000)));
  const handleSaveDeadline = () => {
    onUpdateDeadline?.(dtValue ? new Date(dtValue).toISOString() : null);
    setIsDeadlineModalOpen(false);
  };
  const handleClearDeadline = () => {
    onUpdateDeadline?.(null);
    setIsDeadlineModalOpen(false);
  };

  const initials = currentUser.name
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w) && !/^(dr|prof|mr|ms|mrs)\.?$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  const showTeam = !isStaff || observedTeamIdx !== null;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E5E1D8]">
      <div className="h-14 px-2 sm:px-4 flex items-center gap-2 sm:gap-3">
        <button onClick={onToggleNav} className="lg:hidden p-2 -ml-1 rounded-lg text-[#3A3C40] hover:bg-[#F3F0EA]" aria-label="Open navigation">
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 pr-3 border-r border-[#EEEAE2]">
          <div className="w-7 h-7 rounded-sm bg-[#C83E2B] text-white flex items-center justify-center font-serif font-bold text-[11px] tracking-widest">EV</div>
          <span className="hidden xl:block text-sm font-semibold text-[#1F2022]">EV Venture League</span>
        </div>

        {showTeam ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 shrink-0 rounded-md flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: team.color || "#1F2022" }} aria-hidden="true">
              {team.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sm text-[#1F2022] truncate">{team.name}</span>
                {team.bankrupt ? (
                  <span className="hidden sm:flex shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-50 text-red-800 border border-red-200">Insolvent</span>
                ) : team.dec.locked ? (
                  <span className="hidden sm:flex shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1"><Lock className="w-2.5 h-2.5" />Submitted</span>
                ) : (
                  <span className="hidden sm:flex shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-50 text-amber-800 border border-amber-200">Planning</span>
                )}
              </div>
              <div className="text-[11px] text-[#6C6D70] truncate">
                {quarterLabel}
                {gameState.quarter === 1 && !gameOver ? " · setup quarter, sales start in Q2" : ""}
              </div>
            </div>
          </div>
        ) : (
          <div className="min-w-0">
            <div className="font-semibold text-sm text-[#1F2022] truncate">{universe.name}</div>
            <div className="text-[11px] text-[#6C6D70]">{quarterLabel} · Instructor view</div>
          </div>
        )}

        <div className="flex-1" />

        {countdown && (
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold tabular-nums ${
              countdown.expired ? "bg-red-50 text-red-800 border-red-200" : countdown.urgent ? "bg-amber-50 text-amber-900 border-amber-200" : "bg-[#F7F5F0] text-[#3A3C40] border-[#E5E1D8]"
            }`}
            title={`Q${gameState.quarter} deadline: ${new Date(universe.deadlineISO!).toLocaleString()}`}
          >
            <Clock className="w-3.5 h-3.5" />
            {countdown.text}
          </div>
        )}

        {showTeam && (
          <div className="hidden md:flex flex-col items-end leading-tight px-2" title="Cash on hand at the start of this quarter">
            <span className="text-[10px] uppercase tracking-wide text-[#8A8C90]">Cash</span>
            <span className={`text-sm font-semibold tabular-nums ${team.cash < 200 ? "text-red-700" : "text-[#1F2022]"}`}>Rs. {fmtL(team.cash)} L</span>
          </div>
        )}

        {isStaff && (
          <>
            {accessibleUniverses.length > 1 && (
              <select
                aria-label="Cohort"
                value={universe.id}
                onChange={(e) => {
                  const selected = accessibleUniverses.find((u) => u.id === e.target.value);
                  if (selected) onSelectUniverse?.(selected);
                }}
                className="hidden md:block max-w-[180px] bg-white border border-[#E0DCD3] rounded-lg px-2 py-1.5 text-xs text-[#1F2022]"
              >
                {accessibleUniverses.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            )}
            <div className="hidden sm:flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-[#8A8C90]" aria-hidden="true" />
              <select
                aria-label="Observe a team"
                value={observedTeamIdx ?? ""}
                onChange={(e) => onObserveTeam?.(e.target.value === "" ? null : Number(e.target.value))}
                className="max-w-[170px] bg-white border border-[#E0DCD3] rounded-lg px-2 py-1.5 text-xs text-[#1F2022]"
              >
                <option value="">Observe a team…</option>
                {gameState.teams.map((t, idx) => (
                  <option key={idx} value={idx}>{t.name}{t.isBot ? " (bot)" : ""}</option>
                ))}
              </select>
            </div>
            <button onClick={openDeadlinePicker} className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E0DCD3] text-xs font-medium text-[#1F2022] hover:bg-[#F3F0EA]">
              <Calendar className="w-3.5 h-3.5" />
              {universe.deadlineISO ? "Deadline" : "Set deadline"}
            </button>
          </>
        )}

        {!isStaff && !gameOver && (
          <button
            onClick={onLockToggle}
            className={`shrink-0 px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              team.dec.locked ? "bg-white border border-[#E0DCD3] text-[#1F2022] hover:bg-[#F3F0EA]" : "bg-[#1F2022] hover:bg-[#343538] text-white"
            }`}
          >
            {team.dec.locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            <span className="hidden sm:inline">{team.dec.locked ? "Unlock to edit" : "Lock & submit"}</span>
            <span className="sm:hidden">{team.dec.locked ? "Unlock" : "Submit"}</span>
          </button>
        )}

        {showTeam && (
          <button onClick={onToggleForecast} className="xl:hidden p-2 rounded-lg text-[#3A3C40] hover:bg-[#F3F0EA]" aria-label="Show cash forecast and checklist">
            <PanelRight className="w-5 h-5" />
          </button>
        )}

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-1 p-1 rounded-full hover:bg-[#F3F0EA]"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
          >
            <span className="w-8 h-8 rounded-full bg-[#1F2022] text-white text-xs font-semibold flex items-center justify-center">{initials || "?"}</span>
            <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-[#6C6D70]" />
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 mt-2 w-64 bg-white border border-[#E5E1D8] rounded-xl shadow-lg py-2 z-40">
              <div className="px-4 py-2 border-b border-[#EEEAE2]">
                <div className="text-sm font-semibold text-[#1F2022] truncate">{currentUser.name}</div>
                <div className="text-xs text-[#6C6D70] truncate">{currentUser.email}</div>
                <div className="mt-1 text-[11px] text-[#6C6D70] capitalize">
                  {currentUser.role === "player" ? "Student" : currentUser.role} · {universe.name}
                </div>
              </div>
              {isStaff && (
                <button role="menuitem" onClick={() => { setMenuOpen(false); openDeadlinePicker(); }} className="md:hidden w-full px-4 py-2 text-left text-sm text-[#1F2022] hover:bg-[#F7F5F0] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#6C6D70]" /> Quarter deadline
                </button>
              )}
              {onOpenAdvisor && (
                <button role="menuitem" onClick={() => { setMenuOpen(false); onOpenAdvisor(); }} className="w-full px-4 py-2 text-left text-sm text-[#1F2022] hover:bg-[#F7F5F0] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#6C6D70]" /> Ask the board advisor
                </button>
              )}
              {onOpenChangePassword && (
                <button role="menuitem" onClick={() => { setMenuOpen(false); onOpenChangePassword(); }} className="w-full px-4 py-2 text-left text-sm text-[#1F2022] hover:bg-[#F7F5F0] flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#6C6D70]" /> Change password
                </button>
              )}
              <button role="menuitem" onClick={onLogout} className="w-full px-4 py-2 text-left text-sm text-[#B83828] hover:bg-red-50 flex items-center gap-2">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quarter Submission Deadline Modal for Instructors / Admins */}
      {isDeadlineModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-2xl shadow-2xl max-w-md w-full p-6 text-[#1F2022] space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 border border-purple-200 text-purple-900 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1F2022]">Configure Quarter Deadline</h3>
                  <p className="text-xs text-[#6C6D70] font-mono">Cohort: {universe.name} (Q{gameState.quarter})</p>
                </div>
              </div>
              <button
                onClick={() => setIsDeadlineModalOpen(false)}
                className="p-1 rounded-md text-[#8A8C90] hover:text-[#1F2022] hover:bg-[#F3F0EA] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1.5">
                  Exact Date & Time Deadline
                </label>
                <input
                  type="datetime-local"
                  value={dtValue}
                  onChange={(e) => setDtValue(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-[#E0DCD3] rounded-lg text-xs font-mono text-[#1F2022] focus:outline-none focus:border-purple-600 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5A5C60] mb-1.5">
                  Quick Deadline Presets
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPresetDeadline(1)}
                    className="px-2.5 py-1.5 bg-white hover:bg-[#F3F0EA] border border-[#E0DCD3] rounded-md text-xs font-mono text-[#3A3C40] hover:text-[#1F2022] transition"
                  >
                    +1 Hour
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetDeadline(6)}
                    className="px-2.5 py-1.5 bg-white hover:bg-[#F3F0EA] border border-[#E0DCD3] rounded-md text-xs font-mono text-[#3A3C40] hover:text-[#1F2022] transition"
                  >
                    +6 Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetDeadline(24)}
                    className="px-2.5 py-1.5 bg-white hover:bg-[#F3F0EA] border border-[#E0DCD3] rounded-md text-xs font-mono text-[#3A3C40] hover:text-[#1F2022] transition"
                  >
                    +24 Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetDeadline(72)}
                    className="px-2.5 py-1.5 bg-white hover:bg-[#F3F0EA] border border-[#E0DCD3] rounded-md text-xs font-mono text-[#3A3C40] hover:text-[#1F2022] transition"
                  >
                    +3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetDeadline(168)}
                    className="px-2.5 py-1.5 bg-white hover:bg-[#F3F0EA] border border-[#E0DCD3] rounded-md text-xs font-mono text-[#3A3C40] hover:text-[#1F2022] transition"
                  >
                    +1 Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setDtValue("")}
                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-md text-xs font-mono transition"
                  >
                    Clear Input
                  </button>
                </div>
              </div>

              {dtValue && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-950 font-mono">
                  <strong>Selected Target:</strong> {new Date(dtValue).toLocaleString()}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E5E1D8]">
              <button
                type="button"
                onClick={handleClearDeadline}
                className="px-3 py-2 bg-white text-[#C83E2B] border border-[#E0DCD3] hover:bg-red-50 rounded-lg text-xs font-semibold transition"
              >
                Disable Deadline
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeadlineModalOpen(false)}
                  className="px-4 py-2 bg-white text-[#5A5C60] border border-[#E0DCD3] rounded-lg text-xs font-semibold hover:bg-[#F3F0EA] transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDeadline}
                  className="px-4 py-2 bg-[#1F2022] hover:bg-[#343538] text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save Deadline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
