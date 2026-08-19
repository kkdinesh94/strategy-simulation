import React, { useState, useEffect } from "react";
import { User, Universe, UserRole } from "../types/auth";
import { loadUsers, saveUsers, loadUniverses, saveCurrentUser, getTeamMembersCount } from "../lib/authStore";
import { subscribeUsers, fetchUsersFromFirestore, saveUserToFirestore } from "../lib/firebase";
import { Lock, Mail, ArrowRight, AlertCircle, Check } from "lucide-react";
import bgImage from "../assets/images/minimal_jp_bg_1786465065318.jpg";

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [users, setUsers] = useState<User[]>(() => loadUsers());
  const [universes] = useState<Universe[]>(() => loadUniverses());

  // Subscribe to realtime users from Firestore
  useEffect(() => {
    fetchUsersFromFirestore().then((remoteUsers) => {
      if (remoteUsers && remoteUsers.length > 0) {
        setUsers(remoteUsers);
        saveUsers(remoteUsers);
      }
    });

    const unsubscribe = subscribeUsers((remoteUsers) => {
      if (remoteUsers && remoteUsers.length > 0) {
        setUsers(remoteUsers);
        saveUsers(remoteUsers);
      }
    });

    return () => unsubscribe();
  }, []);

  // Form State
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [role, setRole] = useState<UserRole>("player");
  const [institution, setInstitution] = useState<string>("NIT Warangal");
  const [selectedUnivId, setSelectedUnivId] = useState<string>(universes[0]?.id || "univ_nitw_2026");
  const [selectedTeamI, setSelectedTeamI] = useState<number>(0);

  const [error, setError] = useState<string | null>(null);

  const activeUniverse = universes.find((u) => u.id === selectedUnivId) || universes[0];
  const teams = activeUniverse?.gameState.teams || [];

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let currentUsersList = users;
    let foundUser = currentUsersList.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    // Fallback: If user not found in local state, query Firestore directly
    if (!foundUser) {
      const remoteUsers = await fetchUsersFromFirestore();
      if (remoteUsers && remoteUsers.length > 0) {
        currentUsersList = remoteUsers;
        setUsers(remoteUsers);
        saveUsers(remoteUsers);
        foundUser = remoteUsers.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase()
        );
      }
    }

    if (!foundUser) {
      setError("User email not found. Please check your credentials or click 'Create Account' below.");
      return;
    }

    if (foundUser.password && foundUser.password !== password) {
      setError("Incorrect password. Please verify your credentials and try again.");
      return;
    }

    if (foundUser.role === "instructor") {
      const assignedUniv = universes.find((u) => u.instructorEmail?.toLowerCase() === foundUser?.email?.toLowerCase());
      if (assignedUniv) {
        foundUser.universeId = assignedUniv.id;
      }
    }

    const userWithPresence: User = {
      ...foundUser,
      isOnline: true,
      lastActiveAt: new Date().toISOString(),
      activeMinutes: foundUser.activeMinutes || 0
    };

    saveCurrentUser(userWithPresence);
    saveUserToFirestore(userWithPresence).catch((e) => console.warn("Firestore user login sync error:", e));
    onLoginSuccess(userWithPresence);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    // Check duplicate
    if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      setError("An account with this email address already exists. Please Sign In instead.");
      return;
    }

    // Check team capacity if player
    if (role === "player") {
      const count = getTeamMembersCount(users, selectedUnivId, selectedTeamI);
      if (count >= 8) {
        setError(`Team '${teams[selectedTeamI]?.name || "Team " + (selectedTeamI + 1)}' is full (8/8 members limit reached). Please select another team.`);
        return;
      }
    }

    const newUser: User = {
      id: "usr_" + Date.now(),
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role,
      institution: institution.trim() || "NIT Warangal",
      universeId: selectedUnivId,
      teamI: role === "player" ? selectedTeamI : -1,
      password: password.trim(),
      isOnline: true,
      lastActiveAt: new Date().toISOString(),
      activeMinutes: 0
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
    saveUserToFirestore(newUser);
    saveCurrentUser(newUser);
    onLoginSuccess(newUser);
  };

  return (
    <div
      className="min-h-screen text-[#2C2D30] flex flex-col justify-between p-6 sm:p-10 font-sans selection:bg-[#C83E2B] selection:text-white relative bg-[#FAF8F5]"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(250, 248, 245, 0.88), rgba(250, 248, 245, 0.92)), url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      {/* Top Header - Minimalist Japanese Style Header */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between pb-6 border-b border-[#E8E4DC]">
        <div className="flex items-center gap-3">
          {/* Hanko-style Red Seal Icon */}
          <div className="w-8 h-8 rounded-sm bg-[#C83E2B] text-white flex items-center justify-center font-serif font-bold text-sm shadow-sm tracking-widest">
            EV
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#1F2022] tracking-tight">
              EV Venture League
            </h1>
            <p className="text-[11px] text-[#7A7C80] tracking-wide">
              Department of Management Studies, NIT Warangal
            </p>
          </div>
        </div>
      </header>

      {/* Main Login Card - Pure, Minimalist Center Alignment */}
      <main className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 sm:p-8 space-y-6">
          
          {/* Minimalist Tab Toggle */}
          <div className="flex border-b border-[#EAE6DF] pb-2 text-xs font-medium tracking-wide">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(null); }}
              className={`pb-2 px-3 transition-colors relative ${
                !isRegister
                  ? "text-[#1F2022] font-semibold border-b-2 border-[#1F2022] -mb-[9px]"
                  : "text-[#8A8C90] hover:text-[#4A4B4E]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(null); }}
              className={`pb-2 px-3 transition-colors relative ${
                isRegister
                  ? "text-[#1F2022] font-semibold border-b-2 border-[#1F2022] -mb-[9px]"
                  : "text-[#8A8C90] hover:text-[#4A4B4E]"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-md bg-[#FFF5F3] border border-[#FAD3CD] text-[#B83828] text-xs flex items-start gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-[#C83E2B] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {!isRegister ? (
            <form onSubmit={handleSignIn} className="space-y-4 pt-1">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#9A9C100] absolute left-3 top-3 text-[#8A8C90]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student1@nitw.ac.in"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022] placeholder-[#A0A2A6] focus:outline-none focus:border-[#1F2022] focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-[#8A8C90]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022] placeholder-[#A0A2A6] focus:outline-none focus:border-[#1F2022] focus:bg-white transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1F2022] hover:bg-[#343538] text-white text-xs font-semibold tracking-wider uppercase rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 shadow-sm"
              >
                <span>Enter Simulation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegister} className="space-y-4 pt-1">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022] placeholder-[#A0A2A6] focus:outline-none focus:border-[#1F2022] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@nitw.ac.in"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022] placeholder-[#A0A2A6] focus:outline-none focus:border-[#1F2022] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022] placeholder-[#A0A2A6] focus:outline-none focus:border-[#1F2022] focus:bg-white transition"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1">
                  Role
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setRole("player")}
                    className={`py-1.5 px-2 text-center rounded-md border text-xs transition ${
                      role === "player"
                        ? "border-[#1F2022] bg-[#1F2022] text-white font-medium"
                        : "border-[#E0DCD3] bg-[#FAF8F5] text-[#5A5C60] hover:text-[#1F2022]"
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("instructor")}
                    className={`py-1.5 px-2 text-center rounded-md border text-xs transition ${
                      role === "instructor"
                        ? "border-[#1F2022] bg-[#1F2022] text-white font-medium"
                        : "border-[#E0DCD3] bg-[#FAF8F5] text-[#5A5C60] hover:text-[#1F2022]"
                    }`}
                  >
                    Instructor
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("admin")}
                    className={`py-1.5 px-2 text-center rounded-md border text-xs transition ${
                      role === "admin"
                        ? "border-[#1F2022] bg-[#1F2022] text-white font-medium"
                        : "border-[#E0DCD3] bg-[#FAF8F5] text-[#5A5C60] hover:text-[#1F2022]"
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>

              {/* Institution */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1">
                  Institution
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. NIT Warangal"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022] placeholder-[#A0A2A6] focus:outline-none focus:border-[#1F2022] focus:bg-white transition"
                />
              </div>

              {/* Universe Selection */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1">
                  Universe Cohort
                </label>
                <select
                  value={selectedUnivId}
                  onChange={(e) => setSelectedUnivId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022] focus:outline-none focus:border-[#1F2022]"
                >
                  {universes.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.code}) {u.instructorEmail ? `— Instructor: ${u.instructorEmail}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Team Selection (For Students) */}
              {role === "player" && (
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1">
                    Select Team
                  </label>
                  <select
                    value={selectedTeamI}
                    onChange={(e) => setSelectedTeamI(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022] focus:outline-none focus:border-[#1F2022]"
                  >
                    {teams.map((t, idx) => {
                      const count = getTeamMembersCount(users, selectedUnivId, idx);
                      const isFull = count >= 8;
                      return (
                        <option key={idx} value={idx} disabled={isFull}>
                          Team {idx + 1}: {t.name} ({count}/8 members{isFull ? " - FULL" : ""})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1F2022] hover:bg-[#343538] text-white text-xs font-semibold tracking-wider uppercase rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 shadow-sm"
              >
                <span>Create Account</span>
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="max-w-md w-full mx-auto pt-6 border-t border-[#E8E4DC] text-center text-[11px] text-[#8A8C90]">
        <div>© 2026 EV Venture League • NIT Warangal</div>
      </footer>
    </div>
  );
};
