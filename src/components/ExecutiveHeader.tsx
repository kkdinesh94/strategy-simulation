import React, { useState, useEffect } from "react";
import { TeamState, GameState } from "../types/simulation";
import { User, Universe } from "../types/auth";
import { fmtL } from "../engine/catalog";
import { equityOf, cumBSC } from "../engine/simulationEngine";
import { getAccessibleUniverses } from "../lib/authStore";
import {
  Lock,
  Unlock,
  TrendingUp,
  ShieldAlert,
  Award,
  DollarSign,
  PieChart,
  Users,
  LogOut,
  UserCheck,
  Shield,
  GraduationCap,
  Clock,
  Calendar,
  Pencil,
  X,
  Check,
  Globe,
  KeyRound
} from "lucide-react";

interface ExecutiveHeaderProps {
  team: TeamState;
  gameState: GameState;
  currentUser: User;
  universe: Universe;
  allUniverses?: Universe[];
  activeTeamIdx: number;
  onSelectTeam: (teamI: number) => void;
  onSelectUniverse?: (universe: Universe) => void;
  onLockToggle: () => void;
  onOpenAdvisor: () => void;
  onLogout: () => void;
  onOpenRoster?: () => void;
  onUpdateDeadline?: (deadlineISO: string | null) => void;
  onOpenChangePassword?: () => void;
}

export const ExecutiveHeader: React.FC<ExecutiveHeaderProps> = ({
  team,
  gameState,
  currentUser,
  universe,
  allUniverses = [],
  activeTeamIdx,
  onSelectTeam,
  onSelectUniverse,
  onLockToggle,
  onOpenAdvisor,
  onLogout,
  onOpenRoster,
  onUpdateDeadline,
  onOpenChangePassword
}) => {
  const equity = equityOf(team);
  const bsc = cumBSC(team);
  const lastResult = team.hist[team.hist.length - 1];
  const share = lastResult ? (lastResult.share * 100).toFixed(1) : "0.0";

  const isManagementRole = currentUser.role === "instructor" || currentUser.role === "admin";
  const accessibleUniverses = getAccessibleUniverses(currentUser, allUniverses.length > 0 ? allUniverses : [universe]);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // Deadline modal state
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState<boolean>(false);
  const [dtValue, setDtValue] = useState<string>("");

  useEffect(() => {
    if (!universe.deadlineISO) {
      setTimeLeft(null);
      setIsExpired(false);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const deadline = new Date(universe.deadlineISO!).getTime();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft("00h 00m 00s");
        setIsExpired(true);
      } else {
        setIsExpired(false);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        setTimeLeft(`${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [universe.deadlineISO]);

  // Format deadline for datetime-local picker input
  const openDeadlinePicker = () => {
    if (universe.deadlineISO) {
      const d = new Date(universe.deadlineISO);
      const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setDtValue(isoLocal);
    } else {
      // Default to +24 hours from now
      const d = new Date(Date.now() + 24 * 3600 * 1000);
      const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setDtValue(isoLocal);
    }
    setIsDeadlineModalOpen(true);
  };

  const applyPresetDeadline = (hoursFromNow: number) => {
    const d = new Date(Date.now() + hoursFromNow * 3600 * 1000);
    const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setDtValue(isoLocal);
  };

  const handleSaveDeadline = () => {
    if (!dtValue) {
      onUpdateDeadline?.(null);
    } else {
      const iso = new Date(dtValue).toISOString();
      onUpdateDeadline?.(iso);
    }
    setIsDeadlineModalOpen(false);
  };

  const handleClearDeadline = () => {
    onUpdateDeadline?.(null);
    setIsDeadlineModalOpen(false);
  };

  return (
    <div className="bg-[#FAF8F5] text-[#1F2022] border-b border-[#E5E1D8] shadow-sm">
      {/* Top Session & Role Bar */}
      <div className="bg-[#F3F0EA] px-4 py-1.5 border-b border-[#E5E1D8] text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {/* Role Badge */}
          <span
            className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase flex items-center gap-1 ${
              currentUser.role === "admin"
                ? "bg-amber-100 text-amber-900 border border-amber-300"
                : currentUser.role === "instructor"
                ? "bg-purple-100 text-purple-900 border border-purple-300"
                : "bg-emerald-100 text-emerald-900 border border-emerald-300"
            }`}
          >
            {currentUser.role === "admin" && <Shield className="w-3 h-3 text-amber-700" />}
            {currentUser.role === "instructor" && <GraduationCap className="w-3 h-3 text-purple-700" />}
            {currentUser.role === "player" && <UserCheck className="w-3 h-3 text-emerald-700" />}
            <span>{currentUser.role.toUpperCase()}</span>
          </span>

          <div className="font-semibold text-[#1F2022]">
            {currentUser.name} <span className="text-[#6C6D70] font-normal font-mono">({currentUser.institution || "NIT Warangal"})</span>
          </div>

          <span className="text-[#C5C2BA]">•</span>

          <div className="text-[#5A5C60] font-mono text-[11px] flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-purple-700 shrink-0" />
            <span className="font-semibold text-[#1F2022]">Universe:</span>
            {accessibleUniverses.length > 1 || isManagementRole ? (
              <select
                value={universe.id}
                onChange={(e) => {
                  const selected = accessibleUniverses.find((u) => u.id === e.target.value);
                  if (selected && onSelectUniverse) {
                    onSelectUniverse(selected);
                  }
                }}
                className="bg-white border border-[#E0DCD3] rounded px-2 py-0.5 text-xs font-bold text-[#1F2022] shadow-2xs focus:outline-none focus:ring-1 focus:ring-purple-600 cursor-pointer"
              >
                {accessibleUniverses.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            ) : (
              <>
                <strong className="text-[#1F2022]">{universe.name}</strong>
                <span className="text-[#8A8C90]">({universe.code})</span>
              </>
            )}
          </div>

          {isManagementRole && (
            <>
              <span className="text-[#C5C2BA]">•</span>

              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[10px] font-mono text-emerald-800" title="Cloudflare D1 synchronization active">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>D1 Live</span>
              </div>
            </>
          )}

          {/* Quarter Deadline Countdown Timer */}
          {timeLeft && (
            <>
              <span className="text-[#C5C2BA]">•</span>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-[11px] font-mono font-bold shadow-sm ${
                  isExpired
                    ? "bg-red-100 text-red-900 border-red-300 animate-pulse"
                    : "bg-amber-100 text-amber-950 border-amber-300"
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-800" />
                <span>Q{gameState.quarter} Deadline: {timeLeft}</span>
                {isExpired && <span className="text-[10px] font-sans font-normal">(Time's Up!)</span>}
              </div>
            </>
          )}

          {/* Instructor / Admin Quarter Deadline Config Button */}
          {isManagementRole && (
            <>
              <span className="text-[#C5C2BA]">•</span>
              <button
                onClick={openDeadlinePicker}
                title="Configure Quarter Submission Deadline"
                className="px-2 py-0.5 rounded bg-white hover:bg-[#FAF8F5] border border-[#E0DCD3] text-[11px] font-mono text-purple-900 font-medium flex items-center gap-1 transition shadow-2xs"
              >
                <Calendar className="w-3.5 h-3.5 text-purple-700" />
                <span>{universe.deadlineISO ? "Edit Deadline" : "Set Q" + gameState.quarter + " Deadline"}</span>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Team Switcher for Instructor & Admin */}
          {isManagementRole && (
            <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded border border-[#E0DCD3]">
              <span className="text-[10px] font-mono text-purple-800 font-bold uppercase">Inspect Team:</span>
              <select
                value={activeTeamIdx}
                onChange={(e) => onSelectTeam(Number(e.target.value))}
                className="bg-[#FAF8F5] text-[#1F2022] font-mono font-bold text-xs px-2 py-0.5 rounded border border-[#E0DCD3] focus:outline-none focus:border-purple-600"
              >
                {gameState.teams.map((t, idx) => (
                  <option key={idx} value={idx}>
                    Team {idx + 1}: {t.name} {t.isBot ? "(Bot)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Universe Roster Modal trigger - ONLY FOR INSTRUCTOR & ADMIN */}
          {isManagementRole && onOpenRoster && (
            <button
              onClick={onOpenRoster}
              className="text-[11px] font-mono text-slate-700 hover:text-slate-900 flex items-center gap-1 bg-white px-2.5 py-1 rounded border border-[#E0DCD3] transition cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-slate-600" /> 10-Team Roster
            </button>
          )}

          {/* Change Password Button */}
          {onOpenChangePassword && (
            <button
              onClick={onOpenChangePassword}
              title="Change your account password"
              className="text-[11px] font-mono text-[#5A5C60] hover:text-[#1F2022] flex items-center gap-1 bg-white hover:bg-[#F3F0EA] px-2.5 py-1 rounded border border-[#E0DCD3] transition shadow-2xs font-medium cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-600" />
              <span>Password</span>
            </button>
          )}

          {/* Logout */}
          <button
            onClick={onLogout}
            className="text-[11px] font-mono text-[#C83E2B] hover:text-[#9A2D1E] flex items-center gap-1 transition ml-1 font-medium cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Exit
          </button>
        </div>
      </div>

      {/* Team Level Ticker */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Company Identity */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center font-extrabold text-white shadow-sm text-sm border border-black/10"
            style={{ backgroundColor: team.color || "#1F2022" }}
          >
            {team.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-[#1F2022] tracking-tight">{team.name}</h1>
              <span className="text-xs text-[#7A7C80] font-mono">Team {team.i + 1} of {gameState.teams.length}</span>
              {team.bankrupt && (
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-red-100 text-red-800 rounded border border-red-300">
                  ADMINISTRATION
                </span>
              )}
              {team.dec.locked ? (
                <span className="px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-800 rounded-md border border-emerald-300 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  <Lock className="w-3 h-3 text-emerald-700" /> Locked
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-800 rounded-md border border-amber-300 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                  <Unlock className="w-3 h-3 text-amber-700" /> Planning
                </span>
              )}
            </div>
            <div className="text-xs text-[#6C6D70] flex items-center gap-2 mt-0.5">
              <span className="bg-white px-2 py-0.5 rounded border border-[#E0DCD3] text-[11px] font-mono text-[#3A3C40]">
                PERIOD: Q{gameState.quarter} / {gameState.cfg.quarters}
              </span>
              {gameState.quarter === 1 && (
                <>
                  <span className="text-[#C5C2BA]">•</span>
                  <span className="bg-amber-50 px-2 py-0.5 rounded border border-amber-300 text-[11px] font-mono text-amber-800">
                    SETUP QUARTER — sales begin Q2
                  </span>
                </>
              )}
              <span className="text-[#C5C2BA]">•</span>
              <span className="text-[#6C6D70] text-xs">
                TARGET: <strong className="text-[#1F2022] uppercase font-mono">{team.prim} / {team.sec}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Executive Ticker Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
          <div className="bg-white px-3.5 py-1.5 rounded-lg border border-[#E0DCD3] shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
            <div className="text-[10px] uppercase font-mono tracking-wider text-[#6C6D70] flex items-center justify-center gap-1">
              <DollarSign className="w-3 h-3 text-emerald-600" /> Ending Cash
            </div>
            <div className={`font-mono font-bold text-sm ${team.cash < 200 ? "text-red-600" : "text-emerald-700"}`}>
              {fmtL(team.cash)} L
            </div>
          </div>

          <div className="bg-white px-3.5 py-1.5 rounded-lg border border-[#E0DCD3] shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
            <div className="text-[10px] uppercase font-mono tracking-wider text-[#6C6D70] flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3 text-blue-600" /> Net Equity
            </div>
            <div className={`font-mono font-bold text-sm ${equity < 500 ? "text-red-600" : "text-blue-800"}`}>
              {fmtL(equity)} L
            </div>
          </div>

          <div className="bg-white px-3.5 py-1.5 rounded-lg border border-[#E0DCD3] shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
            <div className="text-[10px] uppercase font-mono tracking-wider text-[#6C6D70] flex items-center justify-center gap-1">
              <Award className="w-3 h-3 text-purple-600" /> BSC Score
            </div>
            <div className="font-mono font-bold text-sm text-purple-800">
              {bsc.toFixed(1)}
            </div>
          </div>

          <div className="bg-white px-3.5 py-1.5 rounded-lg border border-[#E0DCD3] shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
            <div className="text-[10px] uppercase font-mono tracking-wider text-[#6C6D70] flex items-center justify-center gap-1">
              <PieChart className="w-3 h-3 text-amber-600" /> Mkt Share
            </div>
            <div className="font-mono font-bold text-sm text-amber-800">
              {share}%
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAdvisor}
            className="px-3.5 py-2 bg-white hover:bg-[#F3F0EA] text-purple-900 border border-[#E0DCD3] rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
            title="AI Board Advisor (Feature Under Progress)"
          >
            <ShieldAlert className="w-4 h-4 text-purple-700" />
            <span>AI Board Advisor</span>
            <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-300 rounded-full">
              Under Progress
            </span>
          </button>

          <button
            onClick={onLockToggle}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm ${
              team.dec.locked
                ? "bg-amber-700 hover:bg-amber-800 text-white"
                : "bg-[#1F2022] hover:bg-[#343538] text-white"
            }`}
          >
            {team.dec.locked ? (
              <>
                <Unlock className="w-4 h-4" /> Unlock Decisions
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" /> Lock & Submit
              </>
            )}
          </button>
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
    </div>
  );
};
