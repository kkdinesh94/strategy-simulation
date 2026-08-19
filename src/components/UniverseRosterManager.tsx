import React, { useState } from "react";
import { User, Universe } from "../types/auth";
import { loadUsers, saveUsers, saveActiveUniverse, getTeamMembersCount, createInitialUniverse } from "../lib/authStore";
import { saveUserToFirestore, deleteUserFromFirestore, saveUsersBatchToFirestore } from "../lib/firebase";
import { ExcelUserUploader } from "./ExcelUserUploader";
import { isUserOnline, formatLastActive, getFullTimestamp } from "../lib/presence";
import { Users, Shield, Plus, Trash2, Bot, UserCheck, Building, Sparkles, AlertCircle, CheckCircle2, ChevronRight, Copy, Shuffle, UserPlus, Clock } from "lucide-react";

interface UniverseRosterManagerProps {
  universe: Universe;
  currentUser: User;
  onUniverseUpdate: (updatedUniv: Universe) => void;
}

export const UniverseRosterManager: React.FC<UniverseRosterManagerProps> = ({
  universe,
  currentUser,
  onUniverseUpdate
}) => {
  const [users, setUsers] = useState<User[]>(() => loadUsers());
  const [activeUniv, setActiveUniv] = useState<Universe>(universe);

  // New Student Modal / Form
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [selectedTeamI, setSelectedTeamI] = useState<number>(-1); // -1 = Unassigned Pool default
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // New Universe Form
  const [newUnivName, setNewUnivName] = useState("");
  const [newUnivCode, setNewUnivCode] = useState("");
  const [showCreateUniv, setShowCreateUniv] = useState(false);

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
    saveUsersBatchToFirestore(importedUsers);
    setMsg({
      text: `Successfully imported ${importedUsers.length} users with team assignments synced!`,
      type: "success"
    });
  };

  const handleMoveTeam = (userId: string, newTeamI: number) => {
    if (newTeamI >= 0) {
      const currentCount = getTeamMembersCount(users, activeUniv.id, newTeamI);
      if (currentCount >= 8) {
        alert(`Target Team ${newTeamI + 1} is full (8/8 members limit).`);
        return;
      }
    }

    const targetStudent = users.find((u) => u.id === userId);
    if (!targetStudent) return;

    const updatedStudent = { ...targetStudent, teamI: newTeamI };
    const updated = users.map((u) => (u.id === userId ? updatedStudent : u));
    setUsers(updated);
    saveUsers(updated);
    saveUserToFirestore(updatedStudent).catch((e) => console.warn("Firestore team update error:", e));
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
        alert("All 10 teams have reached the 8-member capacity limit.");
        break;
      }
    }

    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    saveUsersBatchToFirestore(updatedUsers).catch((e) => console.warn("Firestore batch sync error:", e));
    setMsg({ text: "Auto-distributed unassigned students evenly across available teams!", type: "success" });
  };

  const handleRemoveStudent = (userId: string, name: string) => {
    if (confirm(`Remove student '${name}' from universe roster?`)) {
      const updated = users.filter((u) => u.id !== userId);
      setUsers(updated);
      saveUsers(updated);
      deleteUserFromFirestore(userId).catch((e) => console.warn("Firestore delete user error:", e));
    }
  };

  const handleToggleBot = (teamI: number) => {
    const updatedTeams = [...activeUniv.gameState.teams];
    const target = updatedTeams[teamI];
    if (target) {
      target.isBot = !target.isBot;
      const updatedUniv = {
        ...activeUniv,
        gameState: {
          ...activeUniv.gameState,
          teams: updatedTeams
        }
      };
      setActiveUniv(updatedUniv);
      saveActiveUniverse(updatedUniv);
      onUniverseUpdate(updatedUniv);
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
                      onClick={() => handleRemoveStudent(st.id, st.name)}
                      className="p-1 text-[#5A5C60] hover:text-red-600 transition"
                      title="Remove user"
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

      {/* 10 TEAMS GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-tight text-[#1F2022] flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" /> Universe Roster Matrix (10 Teams × 8 Members)
          </h3>
          <span className="text-xs font-mono text-[#5A5C60]">Class Limit: 80 Members Max</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {teams.map((t, teamI) => {
            const teamStudents = users.filter(
              (u) => u.universeId === activeUniv.id && u.role === "player" && u.teamI === teamI
            );
            const count = teamStudents.length;
            const isFull = count >= 8;

            return (
              <div
                key={teamI}
                className="bg-white rounded-2xl border border-[#E5E1D8] shadow-sm overflow-hidden flex flex-col justify-between"
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

                  {/* Capacity Badge */}
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

                    {/* Bot Toggle & Remove Team */}
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
                        onClick={() => {
                          if (confirm(`Remove/Deactivate Team ${teamI + 1} (${t.name})? Any assigned students will be moved to the Unassigned Pool, and team will switch to AI Bot.`)) {
                            // Move assigned students to unassigned
                            const updatedUsers = users.map((u) =>
                              u.universeId === activeUniv.id && u.role === "player" && u.teamI === teamI
                                ? { ...u, teamI: -1 }
                                : u
                            );
                            setUsers(updatedUsers);
                            saveUsers(updatedUsers);

                            // Set team as Bot
                            const updatedTeams = [...activeUniv.gameState.teams];
                            if (updatedTeams[teamI]) {
                              updatedTeams[teamI].isBot = true;
                              const updatedUniv = {
                                ...activeUniv,
                                gameState: {
                                  ...activeUniv.gameState,
                                  teams: updatedTeams
                                }
                              };
                              setActiveUniv(updatedUniv);
                              saveActiveUniverse(updatedUniv);
                              onUniverseUpdate(updatedUniv);
                            }
                            setMsg({ text: `Team ${teamI + 1} deactivated and students moved to Unassigned Pool.`, type: "success" });
                          }
                        }}
                        title="Deactivate team and release members to Unassigned Pool"
                        className="p-1.5 rounded-lg text-[#5A5C60] hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Team Members List */}
                <div className="p-4 space-y-2 flex-1">
                  {teamStudents.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#5A5C60] font-mono bg-[#FAF8F5] rounded-xl border border-dashed border-[#E0DCD3]">
                      No human students assigned yet. {t.isBot ? "Simulated by AI Bot." : "Assign students above."}
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
                              onClick={() => handleRemoveStudent(st.id, st.name)}
                              className="p-1 text-[#5A5C60] hover:text-red-600 transition"
                              title="Remove student"
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
    </div>
  );
};
