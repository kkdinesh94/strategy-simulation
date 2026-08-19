import React, { useState, useEffect } from "react";
import { User, Universe, UserRole } from "../../types/auth";
import { GameState, TeamState } from "../../types/simulation";
import { newState } from "../../engine/simulationEngine";
import {
  saveUsers,
  saveUniverses,
  saveActiveUniverse,
  createInitialUniverse,
  DEFAULT_10_TEAMS
} from "../../lib/authStore";
import {
  fetchUsersFromFirestore,
  fetchUniversesFromFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  saveUsersBatchToFirestore,
  saveUniverseToFirestore,
  deleteUniverseFromFirestore,
  rawFetchCollectionDocs,
  rawSetDocInFirestore,
  rawDeleteDocInFirestore,
  testConnection
} from "../../lib/firebase";
import {
  Database,
  Server,
  Users,
  Globe,
  Plus,
  Trash2,
  Edit3,
  Save,
  RefreshCw,
  Search,
  Download,
  Upload,
  ShieldCheck,
  Key,
  Check,
  X,
  Layers,
  FileJson,
  Building,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Copy,
  Zap,
  Settings,
  Code,
  UserPlus,
  Shuffle,
  Bot,
  UserCheck,
  ChevronRight,
  ArrowRightLeft
} from "lucide-react";
import { isUserOnline, formatLastActive, getFullTimestamp } from "../../lib/presence";

interface AdminDatabaseTabProps {
  currentUser: User;
  activeUniverse: Universe;
  allUsers: User[];
  allUniverses: Universe[];
  onRefreshAll: () => void;
  onSelectActiveUniverse: (univ: Universe) => void;
  onNotify: (msg: string) => void;
}

export const AdminDatabaseTab: React.FC<AdminDatabaseTabProps> = ({
  currentUser,
  activeUniverse,
  allUsers,
  allUniverses,
  onRefreshAll,
  onSelectActiveUniverse,
  onNotify
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"universes" | "users" | "batch" | "explorer" | "schema">("universes");

  // Selected Universe for Visual Editing
  const [selectedUnivId, setSelectedUnivId] = useState<string>(activeUniverse?.id || allUniverses[0]?.id || "univ_nitw_2026");
  const targetUniv = allUniverses.find((u) => u.id === selectedUnivId) || activeUniverse || allUniverses[0];

  // Team Visual Editor State for targetUniv
  const [editableTeams, setEditableTeams] = useState<TeamState[]>([]);
  const [isEditingTeams, setIsEditingTeams] = useState<boolean>(false);

  useEffect(() => {
    if (targetUniv && targetUniv.gameState) {
      setEditableTeams(JSON.parse(JSON.stringify(targetUniv.gameState.teams)));
    }
  }, [selectedUnivId, targetUniv]);

  // Visual Collection Explorer state
  const [selectedCollection, setSelectedCollection] = useState<string>("users");
  const [collectionDocs, setCollectionDocs] = useState<{ id: string; [key: string]: any }[]>([]);
  const [explorerSearch, setExplorerSearch] = useState<string>("");
  const [loadingExplorer, setLoadingExplorer] = useState<boolean>(false);
  const [editingDoc, setEditingDoc] = useState<{ collection: string; id: string; jsonStr: string } | null>(null);
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState<boolean>(false);
  const [newDocId, setNewDocId] = useState<string>("");
  const [newDocJson, setNewDocJson] = useState<string>("{\n  \"name\": \"Sample Document\"\n}");

  // Universe Composer Modal state
  const [isUniverseModalOpen, setIsUniverseModalOpen] = useState<boolean>(false);
  const [univName, setUnivName] = useState<string>("");
  const [univCode, setUnivCode] = useState<string>("");
  const [univInstructorEmail, setUnivInstructorEmail] = useState<string>("instructor@nitw.ac.in");
  const [univMaxTeams, setUnivMaxTeams] = useState<number>(10);
  const [univMaxMembers, setUnivMaxMembers] = useState<number>(8);
  const [univInitialMarket, setUnivInitialMarket] = useState<number>(25000);
  const [univVcOpeningQ, setUnivVcOpeningQ] = useState<number>(5);

  // User Manager State
  const [userSearch, setUserSearch] = useState<string>("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [userUnivFilter, setUserUnivFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState<boolean>(false);
  const [newUser, setNewUser] = useState<Partial<User>>({
    id: "",
    name: "",
    email: "",
    password: "student123",
    role: "player",
    institution: "NIT Warangal",
    universeId: selectedUnivId,
    teamI: 0
  });

  // Custom confirmation modal states (replaces iframe-blocked native dialogs)
  const [deletingUser, setDeletingUser] = useState<{ id: string; name: string } | null>(null);
  const [deletingUniverse, setDeletingUniverse] = useState<{ id: string; name: string } | null>(null);
  const [editingInstructorUniv, setEditingInstructorUniv] = useState<Universe | null>(null);
  const [instructorEmailInput, setInstructorEmailInput] = useState<string>("");

  // Batch User Generator State
  const [batchPrefix, setBatchPrefix] = useState<string>("student");
  const [batchCount, setBatchCount] = useState<number>(10);
  const [batchDomain, setBatchDomain] = useState<string>("nitw.ac.in");
  const [batchUniverseId, setBatchUniverseId] = useState<string>(selectedUnivId);

  const handleUpdateInstructorEmail = async (targetU: Universe, newEmail: string) => {
    if (!newEmail.trim()) return;
    const updated: Universe = {
      ...targetU,
      instructorEmail: newEmail.trim().toLowerCase()
    };
    try {
      await saveUniverseToFirestore(updated);
      const updatedList = allUniverses.map((u) => (u.id === updated.id ? updated : u));
      saveUniverses(updatedList);
      if (activeUniverse.id === updated.id) {
        onSelectActiveUniverse(updated);
      }
      onNotify(`Updated assigned instructor for '${updated.name}' to ${updated.instructorEmail}`);
      onRefreshAll();
    } catch (err: any) {
      alert("Failed to update instructor email: " + err.message);
    }
  };

  // Health check state
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    testConnection().then((ok) => setIsConnected(ok));
  }, []);

  // Fetch documents for raw collection explorer
  const loadCollectionDocs = async (collName: string) => {
    setLoadingExplorer(true);
    try {
      const docs = await rawFetchCollectionDocs(collName);
      setCollectionDocs(docs);
    } catch (err) {
      console.error("Error fetching collection docs:", err);
      onNotify(`Failed to fetch collection ${collName}`);
    } finally {
      setLoadingExplorer(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "explorer") {
      loadCollectionDocs(selectedCollection);
    }
  }, [selectedCollection, activeSubTab]);

  // Save changes to Teams in Universe visually
  const handleSaveTeamsVisual = async () => {
    if (!targetUniv) return;

    const updatedUniv: Universe = {
      ...targetUniv,
      gameState: {
        ...targetUniv.gameState,
        teams: editableTeams
      }
    };

    try {
      await saveUniverseToFirestore(updatedUniv);
      const updatedList = allUniverses.map((u) => (u.id === updatedUniv.id ? updatedUniv : u));
      saveUniverses(updatedList);
      if (activeUniverse.id === updatedUniv.id) {
        onSelectActiveUniverse(updatedUniv);
      }
      setIsEditingTeams(false);
      onNotify(`Successfully updated team names & configurations for ${updatedUniv.name}`);
      onRefreshAll();
    } catch (err: any) {
      alert("Failed to save team updates: " + err.message);
    }
  };

  // Reassign student to team visually
  const handleReassignStudent = (user: User, newTeamI: number) => {
    const updatedUser: User = {
      ...user,
      teamI: newTeamI
    };

    const updatedUsers = allUsers.map((u) => (u.id === user.id ? updatedUser : u));
    saveUsers(updatedUsers);
    onNotify(`Reassigned ${user.name} to ${newTeamI === -1 ? "Unassigned Pool" : "Team " + (newTeamI + 1)}`);

    saveUserToFirestore(updatedUser).catch((err) => {
      console.warn("Firestore reassign sync error:", err);
    });
  };

  // Save new universe submit
  const handleCreateUniverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!univName.trim() || !univCode.trim()) {
      alert("Universe Name and Access Code are required.");
      return;
    }

    const newUnivId = "univ_" + univCode.toLowerCase().replace(/[^a-z0-9]/g, "");
    const initialGs: GameState = newState(
      DEFAULT_10_TEAMS,
      12,
      univInitialMarket,
      univVcOpeningQ
    );

    const newUniv: Universe = {
      id: newUnivId,
      name: univName.trim(),
      code: univCode.trim().toUpperCase(),
      instructorEmail: univInstructorEmail.trim(),
      maxTeams: univMaxTeams,
      maxMembersPerTeam: univMaxMembers,
      gameState: initialGs,
      createdAt: new Date().toISOString()
    };

    try {
      await saveUniverseToFirestore(newUniv);
      const updatedList = [...allUniverses.filter((u) => u.id !== newUnivId), newUniv];
      saveUniverses(updatedList);
      setIsUniverseModalOpen(false);
      setSelectedUnivId(newUnivId);
      onNotify(`Universe '${newUniv.name}' created and synchronized to Firestore!`);
      onRefreshAll();
    } catch (err: any) {
      alert("Failed to create universe: " + err.message);
    }
  };

  const handleDeleteUniverse = (univId: string, name: string) => {
    setDeletingUniverse({ id: univId, name });
  };

  // Add User submit
  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name?.trim() || !newUser.email?.trim() || !newUser.password?.trim()) {
      alert("Name, Email, and Password are required.");
      return;
    }

    const createdUser: User = {
      id: newUser.id || "usr_" + Date.now(),
      name: newUser.name.trim(),
      email: newUser.email.trim().toLowerCase(),
      password: newUser.password.trim(),
      role: newUser.role || "player",
      institution: newUser.institution?.trim() || "NIT Warangal",
      universeId: newUser.universeId || selectedUnivId,
      teamI: (newUser.role === "admin" || newUser.role === "instructor") ? -1 : (newUser.teamI ?? 0)
    };

    const updatedUsers = [...allUsers.filter((u) => u.id !== createdUser.id), createdUser];
    saveUsers(updatedUsers);
    setIsAddUserModalOpen(false);
    onNotify(`User '${createdUser.name}' saved successfully!`);

    saveUserToFirestore(createdUser).catch((err) => {
      console.warn("Firestore save user error:", err);
    });
  };

  const handleDeleteUser = (userId: string, name: string) => {
    setDeletingUser({ id: userId, name });
  };

  const handleAutoDistributeAllUnassigned = () => {
    const unassigned = allUsers.filter(
      (u) => u && u.role === "player" && (u.teamI === -1 || u.teamI === undefined || u.teamI === null)
    );
    if (unassigned.length === 0) {
      alert("No unassigned students found in system.");
      return;
    }

    let teamCounter = 0;
    const updatedUsers = allUsers.map((u) => {
      if (u && u.role === "player" && (u.teamI === -1 || u.teamI === undefined || u.teamI === null)) {
        const univObj = allUniverses.find((un) => un.id === u.universeId) || targetUniv;
        const maxT = univObj?.maxTeams || 10;
        const assignedTeam = teamCounter % maxT;
        teamCounter++;
        return { ...u, teamI: assignedTeam };
      }
      return u;
    });

    saveUsers(updatedUsers);
    saveUsersBatchToFirestore(updatedUsers).catch((err) => {
      console.warn("Firestore batch sync error:", err);
    });
    onNotify(`Auto-distributed ${unassigned.length} unassigned students evenly across available teams!`);
  };

  // Batch User Generation submit
  const handleGenerateBatchUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    const created: User[] = [];
    const targetU = allUniverses.find((u) => u.id === batchUniverseId) || targetUniv;

    for (let i = 1; i <= batchCount; i++) {
      const teamIdx = (i - 1) % (targetU.maxTeams || 10);
      const userObj: User = {
        id: "usr_" + Date.now() + "_" + i,
        email: `${batchPrefix.toLowerCase()}${i}@${batchDomain.toLowerCase()}`,
        name: `Student ${batchPrefix.toUpperCase()} #${i}`,
        role: "player",
        institution: "NIT Warangal",
        universeId: batchUniverseId,
        teamI: teamIdx,
        password: "student123"
      };
      created.push(userObj);
    }

    try {
      for (const u of created) {
        await saveUserToFirestore(u);
      }
      const combined = [...allUsers, ...created];
      saveUsers(combined);
      onNotify(`Generated ${batchCount} student accounts across competing teams!`);
      onRefreshAll();
    } catch (err: any) {
      alert("Error generating batch users: " + err.message);
    }
  };

  // Filtered users list with robust null guards
  const filteredUsers = (allUsers || []).filter((u) => {
    if (!u) return false;
    const searchLower = (userSearch || "").toLowerCase();
    const nameStr = (u.name || "").toLowerCase();
    const emailStr = (u.email || "").toLowerCase();
    const instStr = (u.institution || "").toLowerCase();

    const matchesSearch =
      nameStr.includes(searchLower) ||
      emailStr.includes(searchLower) ||
      instStr.includes(searchLower);

    const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
    const matchesUniv = userUnivFilter === "all" || u.universeId === userUnivFilter;

    return matchesSearch && matchesRole && matchesUniv;
  });

  // Students in target universe
  const univStudents = allUsers.filter((u) => u.universeId === selectedUnivId && u.role === "player");
  const unassignedStudents = univStudents.filter((u) => u.teamI === -1 || u.teamI === undefined || u.teamI === null);

  if (currentUser.role !== "admin") {
    return (
      <div className="p-8 bg-white rounded-2xl border border-[#E5E1D8] text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6 text-red-700" />
        </div>
        <h3 className="text-base font-bold text-[#1F2022]">Access Restricted</h3>
        <p className="text-xs text-[#5A5C60] max-w-md mx-auto">
          The Central Database and Administrator Operations console is strictly reserved for System Administrators. Instructors and Students do not have access to these options.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans text-[#1F2022]">
      {/* Top Console Header Bar */}
      <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-lg shadow-2xs">
              <Database className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-[#1F2022]">
                  Super Admin Database & Systems Console
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                  Live Firestore Active
                </span>
              </div>
              <p className="text-xs text-[#5A5C60] mt-0.5 font-mono">
                Cloud Firestore Database: <strong className="text-[#1F2022]">ai-studio-evventureleague-1e6a6938...</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Firestore Connection Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#E0DCD3] text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span>
            <span>{isConnected ? "Firestore Connected" : "Checking Connection..."}</span>
          </div>

          <button
            onClick={onRefreshAll}
            className="px-3.5 py-1.5 bg-white hover:bg-[#F3F0EA] border border-[#E0DCD3] rounded-lg text-xs font-semibold text-[#1F2022] transition flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" /> Sync Cloud
          </button>
        </div>
      </div>

      {/* Admin Sub-navigation Bar */}
      <div className="flex border-b border-[#E5E1D8] gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("universes")}
          className={`px-4 py-2.5 rounded-t-lg text-xs font-semibold transition flex items-center gap-2 ${
            activeSubTab === "universes"
              ? "bg-[#FAF8F5] text-[#1F2022] border-t border-x border-[#E5E1D8] shadow-2xs"
              : "text-[#5A5C60] hover:text-[#1F2022] hover:bg-[#F3F0EA]"
          }`}
        >
          <Globe className="w-4 h-4 text-blue-600" />
          <span>Visual Universe & Teams Manager</span>
        </button>

        <button
          onClick={() => setActiveSubTab("users")}
          className={`px-4 py-2.5 rounded-t-lg text-xs font-semibold transition flex items-center gap-2 ${
            activeSubTab === "users"
              ? "bg-[#FAF8F5] text-[#1F2022] border-t border-x border-[#E5E1D8] shadow-2xs"
              : "text-[#5A5C60] hover:text-[#1F2022] hover:bg-[#F3F0EA]"
          }`}
        >
          <Users className="w-4 h-4 text-purple-600" />
          <span>User Accounts ({allUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("batch")}
          className={`px-4 py-2.5 rounded-t-lg text-xs font-semibold transition flex items-center gap-2 ${
            activeSubTab === "batch"
              ? "bg-[#FAF8F5] text-[#1F2022] border-t border-x border-[#E5E1D8] shadow-2xs"
              : "text-[#5A5C60] hover:text-[#1F2022] hover:bg-[#F3F0EA]"
          }`}
        >
          <UserPlus className="w-4 h-4 text-emerald-600" />
          <span>Batch Student Onboarding</span>
        </button>

        <button
          onClick={() => setActiveSubTab("explorer")}
          className={`px-4 py-2.5 rounded-t-lg text-xs font-semibold transition flex items-center gap-2 ${
            activeSubTab === "explorer"
              ? "bg-[#FAF8F5] text-[#1F2022] border-t border-x border-[#E5E1D8] shadow-2xs"
              : "text-[#5A5C60] hover:text-[#1F2022] hover:bg-[#F3F0EA]"
          }`}
        >
          <Layers className="w-4 h-4 text-amber-600" />
          <span>Raw Collection Inspector</span>
        </button>

        <button
          onClick={() => setActiveSubTab("schema")}
          className={`px-4 py-2.5 rounded-t-lg text-xs font-semibold transition flex items-center gap-2 ${
            activeSubTab === "schema"
              ? "bg-[#FAF8F5] text-[#1F2022] border-t border-x border-[#E5E1D8] shadow-2xs"
              : "text-[#5A5C60] hover:text-[#1F2022] hover:bg-[#F3F0EA]"
          }`}
        >
          <Code className="w-4 h-4 text-slate-600" />
          <span>Blueprint & Rules</span>
        </button>
      </div>

      {/* SUB-TAB 1: VISUAL UNIVERSE & TEAMS MANAGER */}
      {activeSubTab === "universes" && (
        <div className="space-y-6">
          {/* Selector & Actions Card */}
          <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl p-5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1">
                  Select Universe Cohort
                </label>
                <select
                  value={selectedUnivId}
                  onChange={(e) => setSelectedUnivId(e.target.value)}
                  className="px-3.5 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs font-bold font-mono text-[#1F2022] focus:outline-none focus:border-purple-600 shadow-2xs"
                >
                  {allUniverses.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code}) - Q{u.gameState?.quarter || 1}
                    </option>
                  ))}
                </select>
              </div>

              {targetUniv && (
                <div className="flex items-center gap-2 text-xs font-mono text-[#5A5C60] pt-4">
                  <span className="px-2 py-0.5 bg-white border border-[#E0DCD3] rounded">ID: {targetUniv.id}</span>
                  <span className="px-2 py-0.5 bg-white border border-[#E0DCD3] rounded flex items-center gap-1.5">
                    <span>Instructor:</span>
                    <strong className="text-[#1F2022]">{targetUniv.instructorEmail || "Unassigned"}</strong>
                    <button
                      onClick={() => {
                        setInstructorEmailInput(targetUniv.instructorEmail || "");
                        setEditingInstructorUniv(targetUniv);
                      }}
                      className="ml-1 text-[10px] text-purple-700 hover:text-purple-900 underline font-semibold cursor-pointer"
                    >
                      Change
                    </button>
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsUniverseModalOpen(true)}
                className="px-3.5 py-2 bg-[#1F2022] hover:bg-[#343538] text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Create New Universe
              </button>

              {targetUniv && (
                <button
                  onClick={() => handleDeleteUniverse(targetUniv.id, targetUniv.name)}
                  className="px-3.5 py-2 bg-white text-[#C83E2B] hover:bg-red-50 border border-[#E0DCD3] rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Delete Universe
                </button>
              )}
            </div>
          </div>

          {/* Teams Visual Management Grid */}
          {targetUniv && targetUniv.gameState && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#1F2022] flex items-center gap-2">
                    <Building className="w-5 h-5 text-blue-600" />
                    <span>Visual Firm & Roster Manager ({targetUniv.gameState.teams.length} Competing Firms)</span>
                  </h2>
                  <p className="text-xs text-[#6C6D70]">
                    Directly edit team names, archetypes, bot/human control status, and student rosters without modifying raw JSON.
                  </p>
                </div>

                <button
                  onClick={handleSaveTeamsVisual}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Save Universe Teams to Firestore
                </button>
              </div>

              {/* Unassigned Students Alert Box if any */}
              {unassignedStudents.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-700" />
                      <span>{unassignedStudents.length} Students in Unassigned Pool (No Team Assigned)</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                    {unassignedStudents.map((st) => (
                      <div key={st.id} className="p-2.5 bg-white border border-amber-200 rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-[#1F2022]">{st.name}</div>
                          <div className="text-[10px] text-[#7A7C80] font-mono">{st.email}</div>
                        </div>
                        <select
                          onChange={(e) => handleReassignStudent(st, Number(e.target.value))}
                          defaultValue="-1"
                          className="px-2 py-1 bg-[#FAF8F5] border border-[#E0DCD3] rounded text-[11px] font-mono text-[#1F2022] focus:outline-none focus:border-purple-600"
                        >
                          <option value="-1" disabled>Assign to Team...</option>
                          {targetUniv.gameState.teams.map((tm, idx) => (
                            <option key={idx} value={idx}>
                              Team {idx + 1}: {tm.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 10 Teams Visual Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editableTeams.map((team, idx) => {
                  const assignedMembers = univStudents.filter((u) => u.teamI === idx);

                  return (
                    <div
                      key={idx}
                      className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl p-4 shadow-2xs space-y-3 relative hover:border-[#D8D4CA] transition"
                    >
                      <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-xs shadow-2xs"
                            style={{ backgroundColor: team.color || "#1F2022" }}
                          >
                            T{idx + 1}
                          </div>
                          <div>
                            <span className="text-[10px] font-mono text-[#7A7C80] uppercase tracking-wider block">
                              Team Position {idx + 1}
                            </span>
                            <input
                              type="text"
                              value={team.name}
                              onChange={(e) => {
                                const newTeams = [...editableTeams];
                                newTeams[idx].name = e.target.value;
                                setEditableTeams(newTeams);
                              }}
                              className="font-bold text-sm text-[#1F2022] bg-white border border-[#E0DCD3] px-2 py-0.5 rounded focus:outline-none focus:border-purple-600 w-48 sm:w-56"
                            />
                          </div>
                        </div>

                        {/* Bot Toggle */}
                        <button
                          type="button"
                          onClick={() => {
                            const newTeams = [...editableTeams];
                            newTeams[idx].isBot = !newTeams[idx].isBot;
                            setEditableTeams(newTeams);
                          }}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition flex items-center gap-1 ${
                            team.isBot
                              ? "bg-purple-100 text-purple-900 border border-purple-300"
                              : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          }`}
                        >
                          {team.isBot ? (
                            <>
                              <Bot className="w-3.5 h-3.5 text-purple-700" /> AI Bot
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5 text-emerald-700" /> Human
                            </>
                          )}
                        </button>
                      </div>

                      {/* Archetype Selector */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-[10px] uppercase font-mono text-[#6C6D70] mb-0.5">
                            Corporate Archetype
                          </label>
                          <select
                            value={team.arch}
                            onChange={(e) => {
                              const newTeams = [...editableTeams];
                              newTeams[idx].arch = e.target.value as any;
                              setEditableTeams(newTeams);
                            }}
                            className="w-full px-2 py-1 bg-white border border-[#E0DCD3] rounded text-xs text-[#1F2022] focus:outline-none focus:border-purple-600 font-mono"
                          >
                            <option value="premium">Premium Performance</option>
                            <option value="commuter">Urban Commuter</option>
                            <option value="budget">Budget GenZ</option>
                            <option value="fleeteco">Fleet Eco-Solutions</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-mono text-[#6C6D70] mb-0.5">
                            Team Color
                          </label>
                          <input
                            type="color"
                            value={team.color || "#2563eb"}
                            onChange={(e) => {
                              const newTeams = [...editableTeams];
                              newTeams[idx].color = e.target.value;
                              setEditableTeams(newTeams);
                            }}
                            className="h-7 w-full bg-white border border-[#E0DCD3] rounded cursor-pointer p-0.5"
                          />
                        </div>
                      </div>

                      {/* Roster Members Box */}
                      <div className="bg-white border border-[#E0DCD3] rounded-lg p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[#5A5C60] font-mono border-b border-[#F0ECE1] pb-1">
                          <span>ENROLLED STUDENTS ({assignedMembers.length}/8)</span>
                          {assignedMembers.length === 0 && (
                            <span className="text-amber-700 font-normal">No human players</span>
                          )}
                        </div>

                        {assignedMembers.length > 0 ? (
                          <div className="space-y-1">
                            {assignedMembers.map((m) => (
                              <div key={m.id} className="flex items-center justify-between text-xs py-1 border-b border-[#F5F2EB] last:border-0">
                                <div>
                                  <span className="font-semibold text-[#1F2022]">{m.name}</span>
                                  <span className="text-[10px] text-[#8A8C90] font-mono ml-2">({m.email})</span>
                                </div>
                                <button
                                  onClick={() => handleReassignStudent(m, -1)}
                                  title="Unassign from team to Pool"
                                  className="text-[10px] font-mono text-[#C83E2B] hover:underline"
                                >
                                  Unassign
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-[#8A8C90] italic py-1">
                            Controlled by AI Bot engine when empty.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: USER ACCOUNTS MANAGER */}
      {activeSubTab === "users" && (
        <div className="space-y-4">
          <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#8A8C90] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user name, email, or institution..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022] focus:outline-none focus:border-purple-600"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022] focus:outline-none focus:border-purple-600 font-mono"
              >
                <option value="all">All Roles</option>
                <option value="player">Students</option>
                <option value="instructor">Instructors</option>
                <option value="admin">Admins</option>
              </select>

              <select
                value={userUnivFilter}
                onChange={(e) => setUserUnivFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022] focus:outline-none focus:border-purple-600 font-mono"
              >
                <option value="all">All Universes</option>
                {allUniverses.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoDistributeAllUnassigned}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-lg text-xs font-semibold shadow-2xs transition flex items-center gap-1.5"
                title="Auto-distribute unassigned students across teams"
              >
                <Shuffle className="w-3.5 h-3.5 text-indigo-700" /> Auto-Distribute Unassigned
              </button>

              <button
                onClick={() => {
                  setNewUser({
                    id: "usr_" + Date.now(),
                    name: "",
                    email: "",
                    password: "student123",
                    role: "player",
                    institution: "NIT Warangal",
                    universeId: selectedUnivId,
                    teamI: 0
                  });
                  setIsAddUserModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-[#1F2022] hover:bg-[#343538] text-white rounded-lg text-xs font-semibold shadow-2xs transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add User Account
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F3F0EA] border-b border-[#E5E1D8] text-[10px] uppercase font-mono font-semibold text-[#5A5C60]">
                  <tr>
                    <th className="px-4 py-3">User & Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Presence & Activity</th>
                    <th className="px-4 py-3">Institution</th>
                    <th className="px-4 py-3">Universe & Team Assignment</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E1D8]">
                  {filteredUsers.map((u) => {
                    const univ = allUniverses.find((un) => un.id === u.universeId);
                    const teamName =
                      u.role === "admin" || u.role === "instructor"
                        ? "Global Manager"
                        : univ?.gameState?.teams?.[u.teamI]?.name || `Team ${u.teamI + 1}`;

                    const teamsList = univ?.gameState?.teams || targetUniv?.gameState?.teams || DEFAULT_10_TEAMS;
                    const online = isUserOnline(u);
                    const lastActiveStr = formatLastActive(u.lastActiveAt);
                    const fullTooltip = getFullTimestamp(u.lastActiveAt);

                    return (
                      <tr key={u.id} className="hover:bg-white transition">
                        <td className="px-4 py-3 font-medium text-[#1F2022]">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                online ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
                              }`}
                              title={online ? "Online Now" : "Offline"}
                            />
                            <div>
                              <div>{u.name}</div>
                              <div className="text-[10px] font-mono text-[#7A7C80]">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              u.role === "admin"
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : u.role === "instructor"
                                ? "bg-purple-100 text-purple-900 border border-purple-300"
                                : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5" title={fullTooltip}>
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              {online ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[9px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Online
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-gray-100 text-[#5A5C60] border border-gray-300 text-[9px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                  Offline
                                </span>
                              )}
                              <span className={u.lastActiveAt ? "text-[#1F2022] font-medium" : "text-[#8A8C90] italic"}>
                                {lastActiveStr}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#5A5C60]">{u.institution || "NIT Warangal"}</td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {u.role === "player" ? (
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#1F2022]">{univ?.code || u.universeId}</span>
                              <select
                                value={u.teamI ?? -1}
                                onChange={(e) => handleReassignStudent(u, Number(e.target.value))}
                                className={`px-2 py-1 rounded text-xs border font-sans font-medium focus:outline-none transition ${
                                  u.teamI === -1 || u.teamI === undefined || u.teamI === null
                                    ? "bg-amber-50 border-amber-300 text-amber-900 font-bold"
                                    : "bg-white border-[#E0DCD3] text-[#1F2022] hover:border-[#1F2022]"
                                }`}
                              >
                                <option value={-1}>⚠️ Unassigned Pool</option>
                                {teamsList.map((t, idx) => (
                                  <option key={idx} value={idx}>
                                    Team {idx + 1}: {t.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div>
                              <span className="font-bold text-[#1F2022]">{univ?.code || u.universeId}</span>
                              <span className="text-[#8A8C90] ml-2">({teamName})</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setNewUser(u);
                                setIsAddUserModalOpen(true);
                              }}
                              className="p-1 text-[#5A5C60] hover:text-[#1F2022] hover:bg-[#F3F0EA] rounded transition"
                              title="Edit User"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              className="p-1 text-[#C83E2B] hover:bg-red-50 rounded transition"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: BATCH STUDENT GENERATOR */}
      {activeSubTab === "batch" && (
        <div className="max-w-2xl mx-auto bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl p-6 shadow-2xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-[#1F2022] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              <span>Batch Student Account Generator</span>
            </h2>
            <p className="text-xs text-[#5A5C60] mt-1">
              Rapidly generate student accounts evenly distributed across all 10 competing firms in a universe cohort.
            </p>
          </div>

          <form onSubmit={handleGenerateBatchUsers} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">
                Target Universe Cohort
              </label>
              <select
                value={batchUniverseId}
                onChange={(e) => setBatchUniverseId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs font-mono text-[#1F2022] focus:outline-none focus:border-purple-600"
              >
                {allUniverses.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">
                  Email Prefix
                </label>
                <input
                  type="text"
                  value={batchPrefix}
                  onChange={(e) => setBatchPrefix(e.target.value)}
                  placeholder="e.g. mba2026"
                  className="w-full px-3 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs font-mono text-[#1F2022] focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">
                  Email Domain
                </label>
                <input
                  type="text"
                  value={batchDomain}
                  onChange={(e) => setBatchDomain(e.target.value)}
                  placeholder="nitw.ac.in"
                  className="w-full px-3 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs font-mono text-[#1F2022] focus:outline-none focus:border-purple-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">
                Number of Accounts to Generate
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={batchCount}
                onChange={(e) => setBatchCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs font-mono text-[#1F2022] focus:outline-none focus:border-purple-600"
              />
              <span className="text-[10px] text-[#7A7C80] font-mono mt-1 block">
                Accounts will be distributed across Teams 1 to 10 with default password: <code className="text-purple-700 font-bold">student123</code>
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#1F2022] hover:bg-[#343538] text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-400" /> Generate & Sync Accounts to Firestore
            </button>
          </form>
        </div>
      )}

      {/* SUB-TAB 4: RAW COLLECTION INSPECTOR */}
      {activeSubTab === "explorer" && (
        <div className="space-y-4">
          <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl p-4 shadow-2xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase text-[#5A5C60] font-mono">Collection:</span>
              <div className="flex gap-2">
                {["users", "universes"].map((coll) => (
                  <button
                    key={coll}
                    onClick={() => setSelectedCollection(coll)}
                    className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition ${
                      selectedCollection === coll
                        ? "bg-[#1F2022] text-white shadow-2xs"
                        : "bg-white text-[#5A5C60] border border-[#E0DCD3] hover:bg-[#F3F0EA]"
                    }`}
                  >
                    {coll}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsNewDocModalOpen(true)}
              className="px-3 py-1.5 bg-[#1F2022] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Document
            </button>
          </div>

          {loadingExplorer ? (
            <div className="p-12 text-center text-xs font-mono text-[#5A5C60]">Loading documents from Firestore...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {collectionDocs.map((doc) => (
                <div key={doc.id} className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl p-4 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-2">
                    <span className="font-bold text-[#1F2022]">ID: {doc.id}</span>
                    <button
                      onClick={() => setEditingDoc({ collection: selectedCollection, id: doc.id, jsonStr: JSON.stringify(doc, null, 2) })}
                      className="px-2 py-0.5 bg-white border border-[#E0DCD3] rounded text-[11px] hover:bg-[#F3F0EA] transition"
                    >
                      Edit JSON
                    </button>
                  </div>
                  <pre className="p-3 bg-white border border-[#E0DCD3] rounded-lg text-[11px] text-[#3A3C40] overflow-x-auto max-h-48 leading-relaxed">
                    {JSON.stringify(doc, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 5: SCHEMA & RULES */}
      {activeSubTab === "schema" && (
        <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl p-6 shadow-2xs space-y-4">
          <h2 className="text-base font-bold text-[#1F2022] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Firebase Security Rules & Blueprint Schema Audit</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div className="p-4 bg-white border border-[#E0DCD3] rounded-lg space-y-2">
              <strong className="text-[#1F2022] block font-bold">firebase-blueprint.json Schema:</strong>
              <p className="text-[11px] text-[#5A5C60]">
                Defines declarative collections: <code>users</code> (keyed by user ID) and <code>universes</code> (keyed by universe ID).
              </p>
            </div>
            <div className="p-4 bg-white border border-[#E0DCD3] rounded-lg space-y-2">
              <strong className="text-[#1F2022] block font-bold">firestore.rules Security:</strong>
              <p className="text-[11px] text-[#5A5C60]">
                Configured with open-access prototyping mode to allow seamless realtime synchronization during simulation execution.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT USER */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-2xl shadow-2xl max-w-md w-full p-6 text-[#1F2022] space-y-5">
            <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-3">
              <h3 className="font-bold text-base text-[#1F2022]">Add / Edit User Account</h3>
              <button onClick={() => setIsAddUserModalOpen(false)} className="p-1 text-[#8A8C90] hover:text-[#1F2022]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newUser.name || ""}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Rahul Sharma"
                  className="w-full px-3 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newUser.email || ""}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="student1@nitw.ac.in"
                  className="w-full px-3 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">
                  Password
                </label>
                <input
                  type="text"
                  required
                  value={newUser.password || "student123"}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs font-mono text-[#1F2022]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">
                    Role
                  </label>
                  <select
                    value={newUser.role || "player"}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022]"
                  >
                    <option value="player">Student Player</option>
                    <option value="instructor">Instructor</option>
                    <option value="admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">
                    Institution
                  </label>
                  <input
                    type="text"
                    value={newUser.institution || "NIT Warangal"}
                    onChange={(e) => setNewUser({ ...newUser, institution: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">
                  Assigned Universe
                </label>
                <select
                  value={newUser.universeId || selectedUnivId}
                  onChange={(e) => setNewUser({ ...newUser, universeId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022]"
                >
                  {allUniverses.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code})
                    </option>
                  ))}
                </select>
              </div>

              {newUser.role === "player" && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">
                    Assigned Team (1 to 10)
                  </label>
                  <select
                    value={newUser.teamI ?? 0}
                    onChange={(e) => setNewUser({ ...newUser, teamI: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022]"
                  >
                    <option value={-1}>Unassigned Pool</option>
                    {targetUniv?.gameState.teams.map((t, idx) => (
                      <option key={idx} value={idx}>
                        Team {idx + 1}: {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E1D8]">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1F2022] hover:bg-[#343538] text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  Save User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE NEW UNIVERSE */}
      {isUniverseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-2xl shadow-2xl max-w-lg w-full p-6 text-[#1F2022] space-y-5">
            <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-3">
              <h3 className="font-bold text-base text-[#1F2022]">Create New Universe Cohort</h3>
              <button onClick={() => setIsUniverseModalOpen(false)} className="p-1 text-[#8A8C90] hover:text-[#1F2022]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUniverseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">
                  Cohort / Universe Name
                </label>
                <input
                  type="text"
                  required
                  value={univName}
                  onChange={(e) => setUnivName(e.target.value)}
                  placeholder="e.g. EV League - NIT Warangal MBA 2026"
                  className="w-full px-3 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">
                    Access Code
                  </label>
                  <input
                    type="text"
                    required
                    value={univCode}
                    onChange={(e) => setUnivCode(e.target.value)}
                    placeholder="NITW2026"
                    className="w-full px-3 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs font-mono font-bold uppercase text-[#1F2022]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">
                    Instructor Email
                  </label>
                  <input
                    type="email"
                    required
                    value={univInstructorEmail}
                    onChange={(e) => setUnivInstructorEmail(e.target.value)}
                    placeholder="instructor@nitw.ac.in"
                    className="w-full px-3 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">
                    Initial Demand (Units/Qtr)
                  </label>
                  <input
                    type="number"
                    value={univInitialMarket}
                    onChange={(e) => setUnivInitialMarket(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs font-mono text-[#1F2022]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">
                    VC Opening Quarter
                  </label>
                  <input
                    type="number"
                    value={univVcOpeningQ}
                    onChange={(e) => setUnivVcOpeningQ(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs font-mono text-[#1F2022]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E1D8]">
                <button
                  type="button"
                  onClick={() => setIsUniverseModalOpen(false)}
                  className="px-4 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1F2022] hover:bg-[#343538] text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  Create Universe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RAW JSON DOC EDITOR */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-2xl shadow-2xl max-w-xl w-full p-6 text-[#1F2022] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-3">
              <h3 className="font-bold text-base text-[#1F2022]">Edit Document ({editingDoc.id})</h3>
              <button onClick={() => setEditingDoc(null)} className="p-1 text-[#8A8C90] hover:text-[#1F2022]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <textarea
                value={editingDoc.jsonStr}
                onChange={(e) => setEditingDoc({ ...editingDoc, jsonStr: e.target.value })}
                rows={12}
                className="w-full p-3 bg-white border border-[#E0DCD3] rounded-lg font-mono text-xs text-[#1F2022] leading-relaxed focus:outline-none focus:border-purple-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E1D8]">
              <button
                onClick={() => setEditingDoc(null)}
                className="px-4 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const parsed = JSON.parse(editingDoc.jsonStr);
                    await rawSetDocInFirestore(editingDoc.collection, editingDoc.id, parsed);
                    onNotify(`Updated document ${editingDoc.id}`);
                    setEditingDoc(null);
                    loadCollectionDocs(editingDoc.collection);
                    onRefreshAll();
                  } catch (err: any) {
                    alert("Invalid JSON: " + err.message);
                  }
                }}
                className="px-4 py-2 bg-[#1F2022] text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                Save JSON Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE USER CONFIRMATION */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-2xl shadow-2xl max-w-sm w-full p-6 text-[#1F2022] space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#1F2022]">Delete User Account</h3>
                <p className="text-xs text-[#5A5C60] font-mono">{deletingUser.name} ({deletingUser.id})</p>
              </div>
            </div>
            <p className="text-xs text-[#5A5C60]">
              Are you sure you want to permanently delete this user account? The student or manager will lose access.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E1D8]">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-3.5 py-1.5 bg-white border border-[#E0DCD3] rounded-lg text-xs font-semibold text-[#1F2022] hover:bg-[#F3F0EA] transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const targetId = deletingUser.id;
                  const targetName = deletingUser.name;
                  setDeletingUser(null);
                  const remaining = allUsers.filter((u) => u.id !== targetId);
                  saveUsers(remaining);
                  onNotify(`User '${targetName}' deleted.`);
                  deleteUserFromFirestore(targetId).catch((err) => {
                    console.warn("Firestore delete user error:", err);
                  });
                }}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE UNIVERSE CONFIRMATION */}
      {deletingUniverse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-2xl shadow-2xl max-w-sm w-full p-6 text-[#1F2022] space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#1F2022]">Delete Universe</h3>
                <p className="text-xs text-[#5A5C60] font-mono">{deletingUniverse.name} ({deletingUniverse.id})</p>
              </div>
            </div>
            <p className="text-xs text-[#5A5C60]">
              PERMANENT ACTION: Delete universe and clear associated team states from Firestore? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E1D8]">
              <button
                onClick={() => setDeletingUniverse(null)}
                className="px-3.5 py-1.5 bg-white border border-[#E0DCD3] rounded-lg text-xs font-semibold text-[#1F2022] hover:bg-[#F3F0EA] transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const targetId = deletingUniverse.id;
                  const targetName = deletingUniverse.name;
                  setDeletingUniverse(null);
                  deleteUniverseFromFirestore(targetId)
                    .then(() => {
                      const remaining = allUniverses.filter((u) => u.id !== targetId);
                      saveUniverses(remaining);
                      if (activeUniverse.id === targetId && remaining.length > 0) {
                        saveActiveUniverse(remaining[0]);
                        onSelectActiveUniverse(remaining[0]);
                      }
                      onNotify(`Universe '${targetName}' deleted.`);
                      onRefreshAll();
                    })
                    .catch((err) => {
                      alert("Error deleting universe: " + err.message);
                    });
                }}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
              >
                Delete Universe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT INSTRUCTOR EMAIL */}
      {editingInstructorUniv && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-2xl shadow-2xl max-w-md w-full p-6 text-[#1F2022] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-3">
              <h3 className="font-bold text-base text-[#1F2022]">Assigned Instructor Email</h3>
              <button onClick={() => setEditingInstructorUniv(null)} className="p-1 text-[#8A8C90] hover:text-[#1F2022]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const univObj = editingInstructorUniv;
                setEditingInstructorUniv(null);
                if (univObj && instructorEmailInput.trim()) {
                  handleUpdateInstructorEmail(univObj, instructorEmailInput.trim());
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A5C60] mb-1">
                  Instructor Email ({editingInstructorUniv.name})
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={instructorEmailInput}
                  onChange={(e) => setInstructorEmailInput(e.target.value)}
                  placeholder="instructor@nitw.ac.in"
                  className="w-full px-3 py-2 bg-white border border-[#E0DCD3] rounded-lg text-xs font-mono text-[#1F2022]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E1D8]">
                <button
                  type="button"
                  onClick={() => setEditingInstructorUniv(null)}
                  className="px-3.5 py-1.5 bg-white border border-[#E0DCD3] rounded-lg text-xs font-semibold text-[#1F2022] hover:bg-[#F3F0EA] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#1F2022] hover:bg-[#343538] text-white rounded-lg text-xs font-semibold shadow-2xs transition"
                >
                  Save Instructor Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
