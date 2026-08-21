import React, { useState, useEffect } from "react";
import { User, Universe } from "../types/auth";
import { loadUsers, saveUsers, saveActiveUniverse, getTeamMembersCount, createInitialUniverse } from "../lib/authStore";
import { saveUserUnified, deleteUserUnified, removeUserFromUniverseUnified, saveUsersBatchUnified, saveUniverseUnified } from "../lib/dbProvider";
import { ExcelUserUploader } from "./ExcelUserUploader";
import { isUserOnline, formatLastActive, getFullTimestamp } from "../lib/presence";
import { Users, Shield, Plus, Trash2, Bot, UserCheck, Building, Sparkles, AlertCircle, CheckCircle2, ChevronRight, Copy, Shuffle, UserPlus, Clock, X, UserMinus } from "lucide-react";
import { ARCHETYPES, TEAM_COLORS, SEGMENTS } from "../engine/catalog";
import { mkModel, botDecide } from "../engine/simulationEngine";
import { TeamState } from "../types/simulation";

interface UniverseRosterManagerProps {
  universe: Universe;
  currentUser: User;
  allUsers?: User[];
  allUniverses?: Universe[];
  onUniverseUpdate: (updatedUniv: Universe) => void;
  onUsersUpdate?: (updatedUsers: User[]) => void;
  onRefreshAll?: () => void;
}

export const UniverseRosterManager: React.FC<UniverseRosterManagerProps> = ({
  universe,
  currentUser,
  allUsers,
  allUniverses,
  onUniverseUpdate,
  onUsersUpdate,
  onRefreshAll
}) => {
  const [users, setUsers] = useState<User[]>(() => {
    if (allUsers && allUsers.length > 0) return allUsers;
    return loadUsers();
  });
  const [activeUniv, setActiveUniv] = useState<Universe>(universe);

  // Sync users with parent state
  useEffect(() => {
    if (allUsers && allUsers.length > 0) {
      setUsers(allUsers);
    }
  }, [allUsers]);

  // Sync activeUniv with parent state
  useEffect(() => {
    setActiveUniv(universe);
  }, [universe]);

  // New Student Modal / Form
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [selectedTeamI, setSelectedTeamI] = useState<number>(-1); // -1 = Unassigned Pool default
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // New Universe Form
  const [newUnivName, setNewUnivName] = useState("");
  const [newUnivCode, setNewUnivCode] = useState("");
  const [showCreateUniv, setShowCreateUniv] = useState(false);

  // Team Deletion and Creation State
  const [deletingTeam, setDeletingTeam] = useState<{ index: number; name: string; memberCount: number } | null>(null);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamArch, setNewTeamArch] = useState("commuter");
  const [newTeamColor, setNewTeamColor] = useState("#0B9E63");
  const [newTeamIsBot, setNewTeamIsBot] = useState(false);

  // Student Removal / Deletion Modal State
  const [deletingStudent, setDeletingStudent] = useState<{
    id: string;
    name: string;
    email: string;
    teamI: number;
  } | null>(null);

  const teams = activeUniv.gameState.teams;
  const universeUsers = users.filter((u) => u.universeId === activeUniv.id && u.role === "player");
  const totalStudents = universeUsers.length;
  const unassignedUsers = universeUsers.filter((u) => u.teamI === -1 || u.teamI === undefined || u.teamI < 0);
  const maxUniverseCapacity = activeUniv.maxTeams * activeUniv.maxMembersPerTeam; // 10 * 8 = 80

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!newStudentName.trim() || !newStudentEmail.trim()) {
      setMsg({ text: "Please enter both name and email.", type: "error" });
      return;
    }

    if (users.some((u) => u.email.toLowerCase() === newStudentEmail.trim().toLowerCase())) {
      setMsg({ text: "Student with this email already exists in system.", type: "error" });
      return;
    }

    if (selectedTeamI >= 0) {
      const currentCount = getTeamMembersCount(users, activeUniv.id, selectedTeamI);
      if (currentCount >= 8) {
        setMsg({ text: `Team ${selectedTeamI + 1} is at maximum capacity (8/8 members).`, type: "error" });
        return;
      }
    }

    const newStudent: User = {
      id: "usr_" + Date.now(),
      email: newStudentEmail.trim().toLowerCase(),
      name: newStudentName.trim(),
      role: "player",
      institution: currentUser.institution || "NIT Warangal",
      universeId: activeUniv.id,
      teamI: selectedTeamI,
      password: "student123"
    };

    const updated = [...users, newStudent];
    setUsers(updated);
    saveUsers(updated);
    onUsersUpdate?.(updated);
    saveUserUnified(newStudent).catch((e) => console.warn("Unified save student error:", e));

    setNewStudentName("");
    setNewStudentEmail("");
    setMsg({
      text: selectedTeamI >= 0
        ? `Student '${newStudent.name}' enrolled into Team ${selectedTeamI + 1}!`
        : `Student '${newStudent.name}' added to Unassigned Pool!`,
      type: "success"
    });
  };

  const handleUsersImportedFromExcel = (importedUsers: User[]) => {
    const updated = [...users, ...importedUsers];
    setUsers(updated);
    saveUsers(updated);
    onUsersUpdate?.(updated);
    saveUsersBatchUnified(importedUsers).catch((e) => console.warn("Unified batch sync error:", e));
    setMsg({
      text: `Successfully imported ${importedUsers.length} users with team assignments synced!`,
      type: "success"
    });
  };

  const handleMoveTeam = (userId: string, newTeamI: number) => {
    if (newTeamI >= 0) {
      const currentCount = getTeamMembersCount(users, activeUniv.id, newTeamI);
      if (currentCount >= 8) {
        setMsg({ text: `Target Team ${newTeamI + 1} is full (8/8 members limit).`, type: "error" });
        return;
      }
    }

    const targetStudent = users.find((u) => u.id === userId);
    if (!targetStudent) return;

    const updatedStudent = { ...targetStudent, teamI: newTeamI };
    const updated = users.map((u) => (u.id === userId ? updatedStudent : u));
    setUsers(updated);
    saveUsers(updated);
    onUsersUpdate?.(updated);
    saveUserUnified(updatedStudent).catch((e) => console.warn("Unified team update error:", e));
  };

  const handleAutoDistributeUnassigned = () => {
    if (unassignedUsers.length === 0) return;

    let updatedUsers = [...users];
    let currentTeamI = 0;

    for (const student of unassignedUsers) {
      // Find next team with available capacity (< 8)
      while (currentTeamI < 10) {
        const teamCount = updatedUsers.filter(
          (u) => u.universeId === activeUniv.id && u.role === "player" && u.teamI === currentTeamI
        ).length;

        if (teamCount < 8) {
          // Assign student to this team
          updatedUsers = updatedUsers.map((u) =>
            u.id === student.id ? { ...u, teamI: currentTeamI } : u
          );
          break;
        } else {
          currentTeamI++;
        }
      }

      if (currentTeamI >= 10) {
        setMsg({ text: "All 10 teams have reached the 8-member capacity limit.", type: "error" });
        break;
      }
    }

    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    onUsersUpdate?.(updatedUsers);
    saveUsersBatchUnified(updatedUsers).catch((e) => console.warn("Unified batch sync error:", e));
    setMsg({ text: "Auto-distributed unassigned students evenly across available teams!", type: "success" });
  };

  const handleTriggerRemoveStudent = (userId: string, name: string, email: string, teamI: number) => {
    setDeletingStudent({ id: userId, name, email, teamI });
  };

  const handleConfirmDetachStudent = async () => {
    if (!deletingStudent) return;
    const target = users.find((u) => u.id === deletingStudent.id);
    if (!target) {
      setDeletingStudent(null);
      return;
    }

    const updated = users.map((u) =>
      u.id === deletingStudent.id ? { ...u, universeId: "", teamI: -1 } : u
    );

    setUsers(updated);
    saveUsers(updated);
    onUsersUpdate?.(updated);
    setDeletingStudent(null);

    try {
      await removeUserFromUniverseUnified(target);
      setMsg({
        text: `Student '${target.name}' detached from this universe and moved to General Unassigned Pool. Account preserved.`,
        type: "success"
      });
    } catch (err: any) {
      setMsg({ text: "Error updating student: " + err.message, type: "error" });
    }
  };

  const handleConfirmDeleteStudent = async () => {
    if (!deletingStudent) return;
    const targetId = deletingStudent.id;
    const targetName = deletingStudent.name;
    const targetEmail = deletingStudent.email;

    const uIdLower = (targetId || "").toLowerCase().trim();
    const uEmailLower = (targetEmail || "").toLowerCase().trim();
    const updated = users.filter((u) => {
      const idMatch = (u.id || "").toLowerCase().trim() === uIdLower;
      const emailMatch =
        (u.email || "").toLowerCase().trim() === uIdLower ||
        (Boolean(uEmailLower) && (u.email || "").toLowerCase().trim() === uEmailLower);
      return !idMatch && !emailMatch;
    });

    setUsers(updated);
    saveUsers(updated);
    onUsersUpdate?.(updated);
    setDeletingStudent(null);

    try {
      await deleteUserUnified(targetId, targetEmail);
      setMsg({
        text: `Student account '${targetName}' permanently deleted from database.`,
        type: "success"
      });
      await onRefreshAll?.();
    } catch (err: any) {
      setMsg({ text: "Error deleting student: " + err.message, type: "error" });
    }
  };

  const handleToggleBot = (teamI: number) => {
    const updatedTeams = [...activeUniv.gameState.teams];
    const target = updatedTeams[teamI];
    if (target) {
      target.isBot = !target.isBot;
      if (target.isBot) {
        botDecide(target, activeUniv.gameState);
      }
      const updatedUniv = {
        ...activeUniv,
        gameState: {
          ...activeUniv.gameState,
          teams: updatedTeams
        }
      };
      setActiveUniv(updatedUniv);
      saveActiveUniverse(updatedUniv);
      saveUniverseUnified(updatedUniv).catch((err) => console.warn("Universe save error:", err));
      onUniverseUpdate(updatedUniv);
    }
  };

  const handleConfirmDeleteTeam = async () => {
    if (!deletingTeam) return;
    const delIdx = deletingTeam.index;
    const teamName = deletingTeam.name;

    if (activeUniv.gameState.teams.length <= 1) {
      setMsg({ text: "A universe must contain at least 1 team. Cannot delete the only remaining team.", type: "error" });
      setDeletingTeam(null);
      return;
    }

    const updatedTeams = activeUniv.gameState.teams
      .filter((_, idx) => idx !== delIdx)
      .map((t, newIdx) => ({
        ...t,
        i: newIdx
      }));

    // Update users in this universe
    const updatedUsers = users.map((u) => {
      if (u.universeId === activeUniv.id && u.role === "player") {
        if (u.teamI === delIdx) {
          return { ...u, teamI: -1 }; // Moved to unassigned pool
        } else if (u.teamI > delIdx) {
          return { ...u, teamI: u.teamI - 1 }; // Re-indexed
        }
      }
      return u;
    });

    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    onUsersUpdate?.(updatedUsers);

    const updatedUniv: Universe = {
      ...activeUniv,
      gameState: {
        ...activeUniv.gameState,
        teams: updatedTeams
      }
    };

    setActiveUniv(updatedUniv);
    saveActiveUniverse(updatedUniv);
    onUniverseUpdate(updatedUniv);
    setDeletingTeam(null);

    try {
      await saveUniverseUnified(updatedUniv);
      await saveUsersBatchUnified(updatedUsers);
      setMsg({ text: `Team '${teamName}' deleted. Remaining ${updatedTeams.length} teams re-indexed and synced.`, type: "success" });
    } catch (err: any) {
      setMsg({ text: "Error saving team deletion: " + err.message, type: "error" });
    }
  };

  const handleDeleteAllEmptyTeams = async () => {
    const currentStudents = users.filter((u) => u.universeId === activeUniv.id && u.role === "player");
    const emptyIndices: number[] = [];

    activeUniv.gameState.teams.forEach((_, idx) => {
      const memberCount = currentStudents.filter((u) => u.teamI === idx).length;
      if (memberCount === 0) {
        emptyIndices.push(idx);
      }
    });

    if (emptyIndices.length === 0) {
      setMsg({ text: "No empty teams found in this universe.", type: "error" });
      return;
    }

    if (emptyIndices.length === activeUniv.gameState.teams.length) {
      setMsg({ text: "Cannot delete all teams. At least 1 team must remain.", type: "error" });
      return;
    }

    if (!confirm(`Permanently delete all ${emptyIndices.length} empty team(s)? Remaining teams will be re-indexed.`)) {
      return;
    }

    const oldToNewMap = new Map<number, number>();
    let newCounter = 0;
    const updatedTeams: TeamState[] = [];

    activeUniv.gameState.teams.forEach((team, oldIdx) => {
      if (!emptyIndices.includes(oldIdx)) {
        updatedTeams.push({
          ...team,
          i: newCounter
        });
        oldToNewMap.set(oldIdx, newCounter);
        newCounter++;
      }
    });

    const updatedUsers = users.map((u) => {
      if (u.universeId === activeUniv.id && u.role === "player") {
        if (u.teamI >= 0) {
          const newTeamI = oldToNewMap.has(u.teamI) ? oldToNewMap.get(u.teamI)! : -1;
          return { ...u, teamI: newTeamI };
        }
      }
      return u;
    });

    setUsers(updatedUsers);
    saveUsers(updatedUsers);

    const updatedUniv: Universe = {
      ...activeUniv,
      gameState: {
        ...activeUniv.gameState,
        teams: updatedTeams
      }
    };

    setActiveUniv(updatedUniv);
    saveActiveUniverse(updatedUniv);
    onUniverseUpdate(updatedUniv);

    try {
      await saveUniverseUnified(updatedUniv);
      await saveUsersBatchUnified(updatedUsers);
      setMsg({ text: `Successfully deleted ${emptyIndices.length} empty team(s). Universe now has ${updatedTeams.length} active teams.`, type: "success" });
    } catch (err: any) {
      setMsg({ text: "Error deleting empty teams: " + err.message, type: "error" });
    }
  };

  const handleSwitchAllEmptyToBot = async () => {
    const currentStudents = users.filter((u) => u.universeId === activeUniv.id && u.role === "player");
    let countChanged = 0;

    const updatedTeams = activeUniv.gameState.teams.map((team, idx) => {
      const memberCount = currentStudents.filter((u) => u.teamI === idx).length;
      if (memberCount === 0 && !team.isBot) {
        countChanged++;
        const botTeam = { ...team, isBot: true };
        botDecide(botTeam, activeUniv.gameState);
        return botTeam;
      }
      return team;
    });

    if (countChanged === 0) {
      setMsg({ text: "All empty teams are already configured as AI Bots.", type: "error" });
      return;
    }

    const updatedUniv: Universe = {
      ...activeUniv,
      gameState: {
        ...activeUniv.gameState,
        teams: updatedTeams
      }
    };

    setActiveUniv(updatedUniv);
    saveActiveUniverse(updatedUniv);
    onUniverseUpdate(updatedUniv);

    try {
      await saveUniverseUnified(updatedUniv);
      setMsg({ text: `Switched ${countChanged} empty team(s) to AI Bot mode.`, type: "success" });
    } catch (err: any) {
      setMsg({ text: "Error switching to bots: " + err.message, type: "error" });
    }
  };

  const handleAddNewTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newIndex = activeUniv.gameState.teams.length;
    const teamTitle = newTeamName.trim() || `Team ${newIndex + 1} EV`;

    const archDef = ARCHETYPES[newTeamArch] || ARCHETYPES["commuter"];
    const m = mkModel(archDef.name, archDef.cfg, archDef.add, archDef.price);
    m.launchedQ = 1;
    const aw: Record<string, number> = {};
    const base: Record<string, number> = {};
    SEGMENTS.forEach((s) => {
      aw[s.id] = 0.05;
      base[s.id] = 0;
    });

    const newTeam: TeamState = {
      i: newIndex,
      name: teamTitle,
      color: newTeamColor || TEAM_COLORS[newIndex % TEAM_COLORS.length] || "#2563eb",
      isBot: newTeamIsBot,
      arch: newTeamArch,
      vision: "",
      mission: "",
      goals: "",
      prim: archDef.prim,
      sec: archDef.sec,
      charterDone: false,
      cash: 1900,
      paidIn: 2500,
      rep: 0.5,
      cumProfit: 0,
      aw,
      base,
      models: [m],
      capacity: 2500,
      ppe: 600,
      hr: { sales: 100, plant: 100 },
      centres: 4,
      staff: 20,
      qualityCum: 0,
      techs: [],
      rnd: [],
      debt: { bank: 0, lt: 0, ltLeft: 0, shark: 0 },
      cumFuture: 0,
      cumRevenue: 0,
      equityVC: 0,
      equityEm: 0,
      vcRaised: 0,
      bankrupt: false,
      dec: {
        ad: 180,
        alloc: { ...archDef.alloc },
        prod: { [m.id]: 1800 },
        locked: false,
        claims: [],
        buyIntel: false,
        buyClinic: false,
        vc: null,
        quality: 0,
        expBlocks: 0,
        newCentres: 0,
        hire: 0,
        bankTarget: 0,
        ltIssue: 0,
        devCost: 0
      },
      hist: []
    };

    if (newTeamIsBot) {
      botDecide(newTeam, activeUniv.gameState);
    }

    const updatedTeams = [...activeUniv.gameState.teams, newTeam];
    const updatedUniv: Universe = {
      ...activeUniv,
      gameState: {
        ...activeUniv.gameState,
        teams: updatedTeams
      }
    };

    setActiveUniv(updatedUniv);
    saveActiveUniverse(updatedUniv);
    onUniverseUpdate(updatedUniv);
    setShowAddTeamModal(false);
    setNewTeamName("");

    try {
      await saveUniverseUnified(updatedUniv);
      setMsg({ text: `Added new team '${teamTitle}' (Position ${newIndex + 1}) to universe.`, type: "success" });
    } catch (err: any) {
      setMsg({ text: "Error adding team: " + err.message, type: "error" });
    }
  };

  const handleCreateUniverseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnivName.trim() || !newUnivCode.trim()) return;

    const created = createInitialUniverse("univ_" + Date.now(), newUnivName.trim(), newUnivCode.trim().toUpperCase());
    created.instructorEmail = currentUser.email;
    saveActiveUniverse(created);
    setActiveUniv(created);
    onUniverseUpdate(created);
    setShowCreateUniv(false);
    setNewUnivName("");
    setNewUnivCode("");
  };

  return (
    <div className="space-y-6 text-[#1F2022] font-sans">
      {/* Universe Capacity Banner */}
      <div className="bg-[#1F2022] p-6 rounded-2xl border border-[#E5E1D8] shadow-md text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 border border-slate-600 text-[10px] font-mono font-bold uppercase">
              Universe Management Portal
            </span>
            <span className="text-xs text-slate-300 font-mono">Join Code: <strong>{activeUniv.code}</strong></span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">{activeUniv.name}</h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Cohort Capacity: {totalStudents} / {maxUniverseCapacity} Students Enrolled across 10 Teams (Max 8 per team)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/10 px-4 py-2 rounded-xl border border-slate-700 text-center font-mono">
            <div className="text-[10px] text-slate-300 uppercase">Class Enrollment</div>
            <div className="text-lg font-bold text-white">
              {totalStudents} <span className="text-xs text-slate-400 font-normal">/ 80</span>
            </div>
          </div>

          {currentUser.role === "admin" && (
            <button
              onClick={() => setShowCreateUniv(!showCreateUniv)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Universe
            </button>
          )}
        </div>
      </div>

      {/* Create New Universe Form (Admin) */}
      {showCreateUniv && (
        <form onSubmit={handleCreateUniverseSubmit} className="bg-white p-5 rounded-2xl border border-[#E5E1D8] shadow-md space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2 text-[#1F2022]">
            <Sparkles className="w-4 h-4 text-emerald-600" /> Create New Cohort Universe (10 Teams)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              required
              placeholder="Universe Name (e.g. EV League - Batch 2026-B)"
              value={newUnivName}
              onChange={(e) => setNewUnivName(e.target.value)}
              className="px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E0DCD3] rounded-xl text-[#1F2022]"
            />
            <input
              type="text"
              required
              placeholder="Cohort Code (e.g. NITW2026B)"
              value={newUnivCode}
              onChange={(e) => setNewUnivCode(e.target.value)}
              className="px-3 py-2 text-xs font-mono bg-[#FAF8F5] border border-[#E0DCD3] rounded-xl text-[#1F2022]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateUniv(false)}
              className="px-3 py-1.5 text-xs text-[#5A5C60] hover:text-[#1F2022]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs bg-[#1F2022] text-white font-bold rounded-xl shadow"
            >
              Deploy 10-Team Universe
            </button>
          </div>
        </form>
      )}

      {/* Excel / CSV Batch Upload Box */}
      <ExcelUserUploader
        universe={activeUniv}
        currentUser={currentUser}
        existingUsers={users}
        onUsersImported={handleUsersImportedFromExcel}
      />

      {/* Unassigned Student Pool Card */}
      {unassignedUsers.length > 0 && (
        <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-amber-200/80">
            <div>
              <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-700" />
                Unassigned Student Pool ({unassignedUsers.length} Pending Placement)
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                These users were uploaded or enrolled without a team assignment. Assign them to a team below or use auto-distribute.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAutoDistributeUnassigned}
              className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 shrink-0 font-mono"
            >
              <Shuffle className="w-3.5 h-3.5" /> Auto-Distribute to Teams
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {unassignedUsers.map((st) => {
              const online = isUserOnline(st);
              const lastActiveStr = formatLastActive(st.lastActiveAt);

              return (
                <div
                  key={st.id}
                  className="p-3 bg-white rounded-xl border border-amber-200 shadow-sm flex items-center justify-between text-xs"
                >
                  <div className="overflow-hidden mr-2">
                    <div className="font-bold text-[#1F2022] truncate flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          online ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
                        }`}
                      />
                      <span className="truncate">{st.name}</span>
                    </div>
                    <div className="text-[10px] text-[#5A5C60] font-mono truncate">{st.email}</div>
                    <div className="text-[9px] text-[#8A8C90] font-mono truncate flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{lastActiveStr}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <select
                      value={st.teamI}
                      onChange={(e) => handleMoveTeam(st.id, Number(e.target.value))}
                      className="px-2 py-1 text-[11px] bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg font-mono font-bold text-[#1F2022]"
                    >
                      <option value={-1}>Assign Team...</option>
                      {teams.map((_, destI) => {
                        const count = getTeamMembersCount(users, activeUniv.id, destI);
                        return (
                          <option key={destI} value={destI} disabled={count >= 8}>
                            Team {destI + 1} ({count}/8)
                          </option>
                        );
                      })}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleTriggerRemoveStudent(st.id, st.name, st.email, st.teamI)}
                      className="p-1 text-[#5A5C60] hover:text-red-600 transition"
                      title="Remove or delete student"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Student Enrollment Bar */}
      <div className="bg-white p-5 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-3">
        <h3 className="text-xs font-mono font-bold uppercase text-[#5A5C60] tracking-wider flex items-center gap-1.5">
          <UserCheck className="w-4 h-4 text-emerald-600" /> Manual Student Enrollment (Max 8 Members per Team)
        </h3>

        {msg && (
          <div
            className={`p-2.5 rounded-xl text-xs font-mono flex items-center gap-2 ${
              msg.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {msg.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{msg.text}</span>
          </div>
        )}

        <form onSubmit={handleAddStudent} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-mono text-[#5A5C60] mb-1">Student Full Name</label>
            <input
              type="text"
              placeholder="e.g. Vikramaditya Reddy"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E0DCD3] rounded-xl text-[#1F2022]"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-[11px] font-mono text-[#5A5C60] mb-1">Email Address</label>
            <input
              type="email"
              placeholder="student@nitw.ac.in"
              value={newStudentEmail}
              onChange={(e) => setNewStudentEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-[#FAF8F5] border border-[#E0DCD3] rounded-xl text-[#1F2022]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] font-mono text-[#5A5C60] mb-1">Assign Team</label>
            <select
              value={selectedTeamI}
              onChange={(e) => setSelectedTeamI(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E0DCD3] rounded-xl font-mono text-[#1F2022]"
            >
              <option value={-1}>Unassigned Pool</option>
              {teams.map((t, idx) => {
                const count = getTeamMembersCount(users, activeUniv.id, idx);
                return (
                  <option key={idx} value={idx} disabled={count >= 8}>
                    Team {idx + 1} ({count}/8)
                  </option>
                );
              })}
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Enroll Student
            </button>
          </div>
        </form>
      </div>

      {/* TEAMS MATRIX GRID */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF8F5] p-4 rounded-2xl border border-[#E5E1D8]">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-[#1F2022] flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" /> Universe Roster Matrix ({teams.length} Competing Teams)
            </h3>
            <p className="text-xs font-mono text-[#5A5C60] mt-0.5">
              Manage firm capacity, delete empty or unused teams, or configure simulated AI Bots.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setNewTeamName(`Team ${teams.length + 1} EV`);
                setNewTeamArch("commuter");
                setNewTeamColor(TEAM_COLORS[teams.length % TEAM_COLORS.length] || "#2563eb");
                setNewTeamIsBot(false);
                setShowAddTeamModal(true);
              }}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[#1F2022] border border-[#E0DCD3] rounded-xl text-xs font-semibold shadow-2xs transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" /> Add Team
            </button>

            <button
              type="button"
              onClick={handleSwitchAllEmptyToBot}
              title="Switch all teams without human students to AI Bot mode"
              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-semibold shadow-2xs transition flex items-center gap-1.5"
            >
              <Bot className="w-3.5 h-3.5 text-purple-700" /> Switch Empty to Bot
            </button>

            <button
              type="button"
              onClick={handleDeleteAllEmptyTeams}
              title="Permanently remove all teams with 0 assigned students"
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold shadow-2xs transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" /> Delete Empty Teams
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {teams.map((t, teamI) => {
            const teamStudents = users.filter(
              (u) => u.universeId === activeUniv.id && u.role === "player" && u.teamI === teamI
            );
            const count = teamStudents.length;
            const isFull = count >= 8;
            const isEmptyTeam = count === 0;

            return (
              <div
                key={teamI}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col justify-between transition ${
                  isEmptyTeam ? "border-amber-200/90" : "border-[#E5E1D8]"
                }`}
              >
                {/* Team Card Header */}
                <div className="p-4 border-b border-[#E0DCD3] bg-[#FAF8F5] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: t.color || "#3B82F6" }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold font-mono text-[#1F2022]">
                          Team {teamI + 1}: {t.name}
                        </h4>
                        {t.isBot ? (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-mono font-bold flex items-center gap-1">
                            <Bot className="w-3 h-3" /> Bot Driven
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-mono font-bold flex items-center gap-1">
                            <UserCheck className="w-3 h-3" /> Human Led
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#5A5C60] font-mono uppercase">
                        Archetype: {t.arch || "commuter"}
                      </span>
                    </div>
                  </div>

                  {/* Capacity Badge & Actions */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border ${
                        isFull
                          ? "bg-red-50 text-red-700 border-red-300"
                          : count > 0
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-slate-100 text-[#5A5C60] border-slate-300"
                      }`}
                    >
                      {count} / 8 Members {isFull ? "(FULL)" : ""}
                    </span>

                    {/* Bot Toggle & Delete Team */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleBot(teamI)}
                        title="Toggle between Human student control or Simulated AI Bot"
                        className="px-2 py-1 rounded-lg bg-white border border-[#E0DCD3] text-[#1F2022] hover:bg-slate-100 text-[10px] font-mono font-bold"
                      >
                        {t.isBot ? "Switch Human" : "Switch Bot"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingTeam({ index: teamI, name: t.name, memberCount: count })}
                        title="Delete team from universe"
                        className="p-1.5 rounded-lg text-[#5A5C60] hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Empty Team Dedicated Options Banner */}
                {isEmptyTeam && (
                  <div className="mx-4 mt-3 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-amber-900 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>Empty Team (0 human students)</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleBot(teamI)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition flex items-center gap-1 border ${
                          t.isBot
                            ? "bg-purple-100 text-purple-900 border-purple-300"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <Bot className="w-3 h-3 text-purple-700" />
                        {t.isBot ? "Bot Active" : "Switch to Bot"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingTeam({ index: teamI, name: t.name, memberCount: 0 })}
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-600 hover:bg-red-700 text-white transition flex items-center gap-1 shadow-2xs"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete Team
                      </button>
                    </div>
                  </div>
                )}

                {/* Team Members List */}
                <div className="p-4 space-y-2 flex-1">
                  {teamStudents.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#5A5C60] font-mono bg-[#FAF8F5] rounded-xl border border-dashed border-[#E0DCD3]">
                      No human students assigned yet. {t.isBot ? "Simulated by AI Bot." : "Assign students above or switch to Bot."}
                    </div>
                  ) : (
                    teamStudents.map((st) => {
                      const online = isUserOnline(st);
                      const lastActiveStr = formatLastActive(st.lastActiveAt);
                      const fullTooltip = getFullTimestamp(st.lastActiveAt);

                      return (
                        <div
                          key={st.id}
                          className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E0DCD3] flex items-center justify-between text-xs hover:bg-white transition"
                        >
                          <div>
                            <div className="font-bold text-[#1F2022] flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  online ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
                                }`}
                                title={online ? "Online Now" : "Offline"}
                              />
                              <span>{st.name}</span>
                              {online ? (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 text-[9px] font-bold">
                                  Online
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded bg-gray-100 text-[#5A5C60] border border-gray-300 text-[9px]">
                                  Offline
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#5A5C60] font-mono flex items-center gap-2 mt-0.5" title={fullTooltip}>
                              <span>{st.email}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 text-[#8A8C90]" />
                                <span className={st.lastActiveAt ? "text-[#1F2022] font-semibold" : "italic text-[#8A8C90]"}>
                                  {lastActiveStr}
                                </span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Move Team Dropdown */}
                            <select
                              value={st.teamI}
                              onChange={(e) => handleMoveTeam(st.id, Number(e.target.value))}
                              className="px-2 py-1 text-[10px] bg-white border border-[#E0DCD3] rounded-lg font-mono text-[#1F2022]"
                            >
                              {teams.map((_, destI) => (
                                <option key={destI} value={destI}>
                                  Move to T{destI + 1}
                                </option>
                              ))}
                            </select>

                            {/* Delete Student */}
                            <button
                              type="button"
                              onClick={() => handleTriggerRemoveStudent(st.id, st.name, st.email, st.teamI)}
                              className="p-1 text-[#5A5C60] hover:text-red-600 transition"
                              title="Remove or delete student"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Progress Bar for Capacity */}
                <div className="px-4 pb-3">
                  <div className="w-full bg-[#E0DCD3] rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isFull ? "bg-red-500" : count > 4 ? "bg-amber-500" : "bg-emerald-600"
                      }`}
                      style={{ width: `${(count / 8) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: DELETE TEAM */}
      {deletingTeam && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-2xl shadow-2xl max-w-sm w-full p-6 text-[#1F2022] space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#1F2022]">Delete Team</h3>
                <p className="text-xs text-[#5A5C60] font-mono">Position {deletingTeam.index + 1}: {deletingTeam.name}</p>
              </div>
            </div>
            <div className="text-xs text-[#5A5C60] space-y-2">
              <p>
                Are you sure you want to delete <strong>{deletingTeam.name}</strong> from this universe?
              </p>
              {deletingTeam.memberCount > 0 ? (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                  <span className="font-bold">Notice:</span> {deletingTeam.memberCount} student(s) will be released to the <strong>Unassigned Pool</strong>, and remaining teams will be re-indexed.
                </div>
              ) : (
                <p className="italic text-slate-500">
                  This team has no assigned students. Remaining teams will be automatically re-indexed and synchronized.
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E1D8]">
              <button
                onClick={() => setDeletingTeam(null)}
                className="px-3.5 py-1.5 bg-white border border-[#E0DCD3] rounded-lg text-xs font-semibold text-[#1F2022] hover:bg-[#F3F0EA] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteTeam}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
              >
                Delete Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD TEAM */}
      {showAddTeamModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-2xl shadow-2xl max-w-md w-full p-6 text-[#1F2022] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-3">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-[#1F2022]">Add New Team</h3>
              </div>
              <button onClick={() => setShowAddTeamModal(false)} className="p-1 text-[#8A8C90] hover:text-[#1F2022]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewTeamSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. HyperDrive EV"
                  className="w-full px-3 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs font-medium text-[#1F2022] focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">
                    Corporate Archetype
                  </label>
                  <select
                    value={newTeamArch}
                    onChange={(e) => setNewTeamArch(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs font-mono text-[#1F2022] focus:outline-none focus:border-purple-600"
                  >
                    <option value="premium">Premium Performance</option>
                    <option value="commuter">Urban Commuter</option>
                    <option value="budget">Budget GenZ</option>
                    <option value="fleeteco">Fleet Eco-Solutions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">
                    Brand Color
                  </label>
                  <input
                    type="color"
                    value={newTeamColor}
                    onChange={(e) => setNewTeamColor(e.target.value)}
                    className="w-full h-9 bg-white border border-[#E0DCD3] rounded-lg p-0.5 cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-3 bg-white border border-[#E0DCD3] rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-xs text-[#1F2022]">Simulated AI Bot Mode</div>
                  <div className="text-[11px] text-[#7A7C80]">Run automated decisions if no human students join</div>
                </div>
                <input
                  type="checkbox"
                  checked={newTeamIsBot}
                  onChange={(e) => setNewTeamIsBot(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E1D8]">
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="px-3.5 py-1.5 bg-white border border-[#E0DCD3] rounded-lg text-xs font-semibold text-[#1F2022] hover:bg-[#F3F0EA] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REMOVE OR DELETE STUDENT */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-2xl shadow-2xl max-w-md w-full p-6 text-[#1F2022] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-3">
              <div className="flex items-center gap-2.5 text-amber-700">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <UserMinus className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1F2022]">Manage Student Removal</h3>
                  <p className="text-xs text-[#5A5C60] font-mono truncate max-w-[260px]">{deletingStudent.name}</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingStudent(null)}
                className="p-1 text-[#8A8C90] hover:text-[#1F2022]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-white rounded-xl border border-[#E0DCD3] space-y-1">
              <div className="text-xs font-bold text-[#1F2022]">{deletingStudent.name}</div>
              <div className="text-xs text-[#5A5C60] font-mono">{deletingStudent.email}</div>
              <div className="text-[11px] text-[#8A8C90] font-mono mt-1">
                Current Assignment: {deletingStudent.teamI >= 0 ? `Team ${deletingStudent.teamI + 1}` : "Unassigned Pool"}
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Option A: Detach from Universe (Recommended)
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Removes the student from this cohort/universe and moves them into the unassigned pool. All other students, universes, and accounts remain completely safe and untouched.
                </p>
                <button
                  type="button"
                  onClick={handleConfirmDetachStudent}
                  className="w-full mt-2 py-2 px-3 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold text-xs shadow-xs transition"
                >
                  Detach Student (Keep Account Safe)
                </button>
              </div>

              <div className="p-3 rounded-xl bg-red-50/70 border border-red-200 text-xs text-red-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-red-900">
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  Option B: Permanently Delete Student Account
                </div>
                <p className="text-[11px] text-red-800 leading-relaxed">
                  Deletes this student's login credential and profile entirely from the database. Only this individual student will be deleted.
                </p>
                <button
                  type="button"
                  onClick={handleConfirmDeleteStudent}
                  className="w-full mt-2 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs shadow-xs transition"
                >
                  Permanently Delete Student Account
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E5E1D8]">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="px-4 py-1.5 bg-white border border-[#E0DCD3] rounded-lg text-xs font-semibold text-[#5A5C60] hover:text-[#1F2022] hover:bg-[#F3F0EA] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
