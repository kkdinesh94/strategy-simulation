import React, { useState, useEffect } from "react";
import { GameState } from "../../types/simulation";
import { Universe, User } from "../../types/auth";
import { fmtL } from "../../engine/catalog";
import { simulateQuarter, cumBSC, equityOf, newState } from "../../engine/simulationEngine";
import { loadUsers, saveActiveUniverse, saveUniverses, getAccessibleUniverses, DEFAULT_10_TEAMS } from "../../lib/authStore";
import { saveUniverseUnified } from "../../lib/dbProvider";
import { isUserOnline, formatLastActive, getFullTimestamp, formatActiveTime } from "../../lib/presence";
import {
  Play,
  Lock,
  Unlock,
  Download,
  Clock,
  Users,
  Activity,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
  TrendingUp,
  BarChart3,
  Globe,
  Plus,
  Check,
  ChevronRight
} from "lucide-react";

interface InstructorConsoleTabProps {
  gameState: GameState;
  universe: Universe;
  currentUser: User;
  allUniverses: Universe[];
  allUsers?: User[];
  onUpdateState: (newState: GameState) => void;
  onUpdateUniverse?: (updatedUniv: Universe) => void;
  onSelectUniverse?: (selectedUniv: Universe) => void;
  onNotify: (msg: string) => void;
}

export const InstructorConsoleTab: React.FC<InstructorConsoleTabProps> = ({
  gameState,
  universe,
  currentUser,
  allUniverses = [],
  allUsers: passedAllUsers,
  onUpdateState,
  onUpdateUniverse,
  onSelectUniverse,
  onNotify
}) => {
  const [jsonExport, setJsonExport] = useState<string>("");
  const [internalUsers, setInternalUsers] = useState<User[]>(() => loadUsers());
  const allUsers = passedAllUsers && passedAllUsers.length > 0 ? passedAllUsers : internalUsers;

  // Realtime tick every 10 seconds to keep presence & timestamp display live
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
      if (!passedAllUsers || passedAllUsers.length === 0) {
        setInternalUsers(loadUsers());
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [passedAllUsers]);

  // Universe Creation Modal State
  const [showCreateUnivModal, setShowCreateUnivModal] = useState(false);
  const [newUnivName, setNewUnivName] = useState("");
  const [newUnivCode, setNewUnivCode] = useState("");
  const [newUnivInstructorEmail, setNewUnivInstructorEmail] = useState(currentUser?.email || "");

  const accessibleUniverses = getAccessibleUniverses(currentUser, allUniverses.length > 0 ? allUniverses : [universe]);

  const handleCreateUniverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnivName.trim() || !newUnivCode.trim()) {
      alert("Please provide both Universe Name and Cohort Code.");
      return;
    }

    const codeClean = newUnivCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const newUnivId = "univ_" + codeClean.toLowerCase() + "_" + Date.now().toString().slice(-4);
    const initialGs = newState(DEFAULT_10_TEAMS, 12, 25000, 5);

    const newUniv: Universe = {
      id: newUnivId,
      name: newUnivName.trim(),
      code: codeClean,
      instructorEmail: (newUnivInstructorEmail.trim() || currentUser.email).toLowerCase(),
      maxTeams: 10,
      maxMembersPerTeam: 8,
      gameState: initialGs,
      createdAt: new Date().toISOString()
    };

    try {
      await saveUniverseUnified(newUniv);
      const updatedList = [...allUniverses.filter((u) => u.id !== newUnivId), newUniv];
      saveUniverses(updatedList);
      setShowCreateUnivModal(false);
      setNewUnivName("");
      setNewUnivCode("");

      if (onSelectUniverse) {
        onSelectUniverse(newUniv);
      }
      onNotify(`New Cohort Universe '${newUniv.name}' (${newUniv.code}) created & selected!`);
    } catch (err: any) {
      alert("Failed to create cohort universe: " + err.message);
    }
  };

  // Deadline selection helper
  const handleSetDeadlineHours = (hours: number) => {
    const deadline = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    const updatedUniv: Universe = {
      ...universe,
      deadlineISO: deadline
    };
    saveActiveUniverse(updatedUniv);
    if (onUpdateUniverse) onUpdateUniverse(updatedUniv);
    onNotify(`Quarter ${gameState.quarter} decision deadline set to +${hours} hours.`);
  };

  const handleClearDeadline = () => {
    const updatedUniv: Universe = {
      ...universe,
      deadlineISO: null
    };
    saveActiveUniverse(updatedUniv);
    if (onUpdateUniverse) onUpdateUniverse(updatedUniv);
    onNotify("Quarter deadline cleared.");
  };

  const handleSimulateNextQuarter = () => {
    const unLockedCount = gameState.teams.filter((t) => !t.isBot && !t.dec.locked).length;

    if (unLockedCount > 0) {
      const confirmForce = confirm(
        `There are ${unLockedCount} human teams that have not locked their decisions yet. Force run quarter simulation anyway?`
      );
      if (!confirmForce) return;
    }

    const updatedState = { ...gameState };
    simulateQuarter(updatedState);
    
    // Clear deadline upon simulation completion
    const updatedUniv: Universe = {
      ...universe,
      gameState: updatedState,
      deadlineISO: null
    };
    saveActiveUniverse(updatedUniv);
    if (onUpdateUniverse) onUpdateUniverse(updatedUniv);

    onUpdateState(updatedState);
    onNotify(`Quarter ${updatedState.quarter - 1} simulation executed! Results published.`);
  };

  const handleToggleLockTeam = (teamIndex: number) => {
    const updatedTeams = [...gameState.teams];
    const t = { ...updatedTeams[teamIndex] };
    t.dec = { ...t.dec, locked: !t.dec.locked };
    updatedTeams[teamIndex] = t;

    const newGs = {
      ...gameState,
      teams: updatedTeams
    };

    onUpdateState(newGs);
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(gameState, null, 2);
    setJsonExport(dataStr);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    try {
      const parsed = JSON.parse(e.target.value);
      if (parsed && parsed.teams && parsed.quarter) {
        onUpdateState(parsed);
        onNotify("Game state imported successfully.");
      }
    } catch (err) {
      // ignore
    }
  };

  // Filter students for telemetry
  const studentMembers = allUsers.filter(
    (u) => u.universeId === universe.id && u.role === "player"
  );

  return (
    <div className="space-y-6 text-[#1F2022] font-sans">
      {/* Multi-Universe Cohort Selection & Management Card */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E0DCD3] pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
                <Globe className="w-3 h-3 text-purple-700" /> Multi-Universe Management
              </span>
            </div>
            <h3 className="text-base font-bold text-[#1F2022]">
              Assigned Cohort Universes ({accessibleUniverses.length})
            </h3>
            <p className="text-xs text-[#5A5C60]">
              Select and switch active simulation cohorts. Instructors assigned to multiple universes can manage each cohort independently.
            </p>
          </div>

          <button
            onClick={() => setShowCreateUnivModal(true)}
            className="px-4 py-2 bg-[#1F2022] hover:bg-[#343538] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" /> Create New Cohort Universe
          </button>
        </div>

        {/* Cohort Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {accessibleUniverses.map((u) => {
            const isSelected = u.id === universe.id;
            const univStudents = allUsers.filter((user) => user.universeId === u.id && user.role === "player").length;
            const currentQ = u.gameState?.quarter || 1;

            return (
              <div
                key={u.id}
                className={`p-4 rounded-xl border transition flex flex-col justify-between gap-3 ${
                  isSelected
                    ? "bg-purple-50/70 border-purple-300 ring-1 ring-purple-400/50 shadow-2xs"
                    : "bg-[#FAF8F5] border-[#E0DCD3] hover:border-purple-200"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-[#E0DCD3] text-[#1F2022]">
                      CODE: {u.code}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200">
                      Q{currentQ} Active
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#1F2022] line-clamp-1" title={u.name}>
                    {u.name}
                  </h4>
                  <div className="text-[11px] text-[#5A5C60] font-mono mt-1 space-y-0.5">
                    <div>Instructor: <strong className="text-[#1F2022]">{u.instructorEmail || "Unassigned"}</strong></div>
                    <div>Enrolled: <strong className="text-[#1F2022]">{univStudents} Students</strong> across 10 Teams</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E0DCD3]/60 flex items-center justify-between">
                  {isSelected ? (
                    <span className="px-3 py-1 bg-purple-700 text-white text-[11px] font-mono font-bold rounded-lg flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> ACTIVE COHORT
                    </span>
                  ) : (
                    <button
                      onClick={() => onSelectUniverse && onSelectUniverse(u)}
                      className="px-3 py-1 bg-white hover:bg-purple-100/60 text-purple-900 border border-[#E0DCD3] text-[11px] font-mono font-bold rounded-lg transition flex items-center gap-1 shadow-2xs"
                    >
                      <span>Select Cohort</span>
                      <ChevronRight className="w-3.5 h-3.5 text-purple-700" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal for Creating New Universe */}
      {showCreateUnivModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl border border-[#E5E1D8] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E0DCD3] pb-3">
              <h3 className="text-lg font-extrabold text-[#1F2022] flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-700" /> Create Cohort Universe
              </h3>
              <button
                onClick={() => setShowCreateUnivModal(false)}
                className="text-[#5A5C60] hover:text-[#1F2022] text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUniverseSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase font-mono text-[#5A5C60] mb-1">
                  Universe / Cohort Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EV League - MBA Batch 2026-B"
                  value={newUnivName}
                  onChange={(e) => setNewUnivName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E0DCD3] rounded-xl text-xs font-semibold focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase font-mono text-[#5A5C60] mb-1">
                  Access Join Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NITWB2026"
                  value={newUnivCode}
                  onChange={(e) => setNewUnivCode(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E0DCD3] rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase font-mono text-[#5A5C60] mb-1">
                  Assigned Instructor Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. instructor@nitw.ac.in"
                  value={newUnivInstructorEmail}
                  onChange={(e) => setNewUnivInstructorEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E0DCD3] rounded-xl text-xs font-mono focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateUnivModal(false)}
                  className="px-4 py-2 bg-white hover:bg-[#FAF8F5] border border-[#E0DCD3] text-[#5A5C60] text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  Create & Select Cohort
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Console Controls & Quarter Simulation Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-mono font-bold uppercase">
              Faculty Command Console
            </span>
            <span className="text-xs text-[#5A5C60] font-mono">Period: Quarter {gameState.quarter} of {gameState.cfg.quarters}</span>
          </div>
          <h2 className="text-xl font-bold text-[#1F2022]">
            Instructor & Administrator Console
          </h2>
          <p className="text-xs text-[#5A5C60]">
            Configure decision deadlines, track student engagement, inspect team lock-in states, and run quarterly market simulations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSimulateNextQuarter}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl transition flex items-center gap-2 shadow-sm"
          >
            <Play className="w-4 h-4 fill-current" /> Run Quarter {gameState.quarter} Simulation
          </button>
        </div>
      </div>

      {/* Quarter Schedule & Deadline Planner */}
      <div className="bg-amber-50/70 p-6 rounded-2xl border border-amber-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-200/60 text-amber-900 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-950">
                Quarter {gameState.quarter} Decision Deadline Schedule
              </h3>
              <p className="text-xs text-amber-800">
                Set a countdown timer for student teams. A prominent countdown banner will be displayed to all student members.
              </p>
            </div>
          </div>

          {universe.deadlineISO ? (
            <button
              onClick={handleClearDeadline}
              className="px-3.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 rounded-xl text-xs font-mono font-bold transition shrink-0"
            >
              Clear Current Deadline
            </button>
          ) : (
            <span className="text-xs font-mono text-amber-800 font-semibold bg-amber-100/80 px-3 py-1 rounded-lg border border-amber-300">
              No active deadline set
            </span>
          )}
        </div>

        {/* Quick Set Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-mono text-amber-900 font-bold mr-2">Set Quick Countdown:</span>
          {[1, 2, 4, 12, 24].map((h) => (
            <button
              key={h}
              onClick={() => handleSetDeadlineHours(h)}
              className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 text-xs font-mono font-bold rounded-xl transition shadow-sm"
            >
              +{h} {h === 1 ? "Hour" : "Hours"}
            </button>
          ))}
        </div>
      </div>

      {/* Student Telemetry & Performance Dashboard */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E0DCD3] pb-3">
          <div>
            <h3 className="text-base font-bold text-[#1F2022] flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              Student Member Engagement & Activity Telemetry
            </h3>
            <p className="text-xs text-[#5A5C60]">
              Real-time online status heartbeat, last active timestamps, time spent, and quarterly decision lock status.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-xs font-mono font-bold rounded-lg border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {studentMembers.filter((st) => isUserOnline(st)).length} Online Active
            </span>
            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-mono font-medium rounded-lg border border-gray-200">
              {studentMembers.filter((st) => !isUserOnline(st)).length} Offline
            </span>
            <span className="px-3 py-1 bg-purple-50 text-purple-800 text-xs font-mono font-bold rounded-lg border border-purple-200">
              {studentMembers.length} Enrolled
            </span>
          </div>
        </div>

        {studentMembers.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-[#5A5C60] bg-[#FAF8F5] rounded-xl border border-dashed border-[#E0DCD3]">
            No students enrolled yet in this cohort. Add student members in Universe Roster.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-[#E0DCD3] text-[#5A5C60] uppercase text-left">
                  <th className="py-2.5">Student Member</th>
                  <th className="py-2.5">Assigned Team</th>
                  <th className="py-2.5 text-center">Presence Status</th>
                  <th className="py-2.5">Last Active (Timestamp)</th>
                  <th className="py-2.5 text-right">Time Spent</th>
                  <th className="py-2.5 text-center">Team Decision Lock</th>
                  <th className="py-2.5 text-right">Team BSC Score</th>
                </tr>
              </thead>
              <tbody>
                {studentMembers.map((st) => {
                  const assignedTeam = gameState.teams[st.teamI] || (st.teamI >= 0 ? gameState.teams[0] : null);
                  const isOnline = isUserOnline(st);
                  const lastActiveFormatted = formatLastActive(st.lastActiveAt);
                  const fullTooltip = getFullTimestamp(st.lastActiveAt);
                  const timeFormatted = formatActiveTime(st.activeMinutes);
                  const bscScore = assignedTeam ? cumBSC(assignedTeam).toFixed(1) : "0.0";

                  return (
                    <tr key={st.id} className="border-b border-[#E0DCD3] hover:bg-[#FAF8F5] transition">
                      <td className="py-3 font-sans font-bold text-[#1F2022]">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isOnline ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
                            }`}
                            title={isOnline ? "Online Active Now" : "Offline"}
                          />
                          <div>
                            <div>{st.name}</div>
                            <div className="text-[10px] text-[#5A5C60] font-mono font-normal">{st.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3">
                        {assignedTeam ? (
                          <div className="flex items-center gap-1.5 font-sans font-bold">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: assignedTeam.color }} />
                            <span>Team {assignedTeam.i + 1}: {assignedTeam.name}</span>
                          </div>
                        ) : (
                          <span className="text-amber-700 font-bold">⚠️ Unassigned Pool</span>
                        )}
                      </td>

                      <td className="py-3 text-center">
                        {isOnline ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Online Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gray-100 text-[#5A5C60] border border-gray-300 text-[10px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                            Offline
                          </span>
                        )}
                      </td>

                      <td className="py-3 text-left">
                        <div className="flex items-center gap-1.5 text-xs font-mono" title={fullTooltip}>
                          <Clock className="w-3.5 h-3.5 text-[#8A8C90] shrink-0" />
                          <span className={st.lastActiveAt ? "font-bold text-[#1F2022]" : "text-[#8A8C90] italic font-normal"}>
                            {lastActiveFormatted}
                          </span>
                        </div>
                        {st.lastActiveAt && (
                          <div className="text-[10px] text-[#7A7C80] font-mono pl-5">
                            {new Date(st.lastActiveAt).toLocaleDateString([], { month: "short", day: "numeric" })},{" "}
                            {new Date(st.lastActiveAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        )}
                      </td>

                      <td className="py-3 text-right font-bold font-mono text-purple-900">
                        {timeFormatted}
                      </td>

                      <td className="py-3 text-center">
                        {assignedTeam && assignedTeam.dec.locked ? (
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                            <Unlock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>

                      <td className="py-3 text-right font-bold text-[#1F2022]">
                        {bscScore}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Team Lock Status Overview */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
        <h3 className="text-base font-bold text-[#1F2022] flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          Executive Teams Lock & Decision Control
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {gameState.teams.map((t, idx) => {
            const bsc = cumBSC(t);

            return (
              <div
                key={t.i}
                className="p-4 rounded-xl border flex items-center justify-between gap-3 bg-[#FAF8F5] border-[#E0DCD3]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: t.color }}
                  />
                  <div>
                    <div className="font-bold text-sm text-[#1F2022]">
                      Team {t.i + 1}: {t.name} {t.isBot && "(AI Bot)"}
                    </div>
                    <div className="text-xs text-[#5A5C60] font-mono mt-0.5">
                      Cash: {fmtL(t.cash)} L | BSC: {bsc.toFixed(1)} | Models: {t.models.length}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {t.dec.locked ? (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-mono font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-mono font-bold flex items-center gap-1">
                      <Unlock className="w-3 h-3" /> Pending
                    </span>
                  )}

                  <button
                    onClick={() => handleToggleLockTeam(idx)}
                    className="px-3 py-1.5 bg-white border border-[#E0DCD3] text-xs font-semibold rounded-lg hover:bg-slate-100 text-[#1F2022]"
                  >
                    {t.dec.locked ? "Unlock" : "Lock"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export / Import State */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-[#1F2022]">
            Export / Import Game State JSON Backup
          </h3>
          <button
            onClick={handleExportJSON}
            className="px-3.5 py-1.5 bg-[#FAF8F5] hover:bg-slate-100 text-[#1F2022] border border-[#E0DCD3] text-xs font-semibold rounded-lg transition flex items-center gap-1 font-mono"
          >
            <Download className="w-3.5 h-3.5" /> Export Game State JSON
          </button>
        </div>

        {jsonExport && (
          <div>
            <label className="block text-xs font-mono uppercase text-[#5A5C60] mb-1">
              State Backup JSON:
            </label>
            <textarea
              rows={6}
              value={jsonExport}
              onChange={handleImportJSON}
              className="w-full p-3 font-mono text-xs bg-[#FAF8F5] text-[#1F2022] rounded-xl border border-[#E0DCD3]"
            />
          </div>
        )}
      </div>
    </div>
  );
};
