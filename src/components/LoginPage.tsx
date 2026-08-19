import React, { useState, useEffect } from "react";
import { User, Universe, UserRole } from "../types/auth";
import { loadUsers, saveUsers, loadUniverses, saveCurrentUser, getTeamMembersCount } from "../lib/authStore";
import { subscribeUsers, fetchUsersFromFirestore } from "../lib/firebase";
import { saveUserUnified } from "../lib/dbProvider";
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Check,
  KeyRound,
  Shield,
  ShieldCheck,
  Send,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";
import bgImage from "../assets/images/minimal_jp_bg_1786465065318.jpg";

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [activeMode, setActiveMode] = useState<"login" | "register" | "reset_password">("login");
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

  // Password Reset / Change State
  const [resetMethod, setResetMethod] = useState<"old_password" | "email_otp">("old_password");
  const [oldPasswordInput, setOldPasswordInput] = useState<string>("");
  const [newPasswordInput, setNewPasswordInput] = useState<string>("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>("");
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [enteredOtp, setEnteredOtp] = useState<string>("");
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpVerified, setOtpVerified] = useState<boolean>(false);
  const [otpCountdown, setOtpCountdown] = useState<number>(0);
  const [showPass, setShowPass] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const activeUniverse = universes.find((u) => u.id === selectedUnivId) || universes[0];
  const teams = activeUniverse?.gameState.teams || [];

  // OTP Countdown timer
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

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
      setError("Incorrect password. Please verify your credentials or click 'Change Password' above.");
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
    saveUserUnified(userWithPresence).catch((e) => console.warn("User login sync error:", e));
    onLoginSuccess(userWithPresence);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

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
    await saveUserUnified(newUser);
    saveCurrentUser(newUser);
    onLoginSuccess(newUser);
  };

  // Dispatch OTP for Reset Password
  const handleSendResetOtp = () => {
    setError(null);
    setSuccessMsg(null);

    const targetUser = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!targetUser) {
      setError("No registered account found with this email address. Please verify the email.");
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setOtpSent(true);
    setOtpCountdown(60);
    setSuccessMsg(`Security OTP generated for ${targetUser.email}: ${code}`);
  };

  // Verify OTP for Reset Password
  const handleVerifyResetOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!enteredOtp || enteredOtp.trim() !== generatedOtp) {
      setError("Invalid 6-digit OTP code. Please check and try again.");
      return;
    }
    setOtpVerified(true);
    setError(null);
    setSuccessMsg("OTP verified! Please enter your new password below.");
  };

  // Submit Reset Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const targetUser = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!targetUser) {
      setError("User account not found. Please verify your email address.");
      return;
    }

    if (newPasswordInput.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (resetMethod === "old_password") {
      const currentStoredPass = targetUser.password || "student123";
      if (oldPasswordInput !== currentStoredPass) {
        setError("Current password is incorrect. Use the Email OTP tab if you forgot it.");
        return;
      }
    } else {
      if (!otpVerified) {
        setError("Please verify the 6-digit email OTP first.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const updatedUser: User = {
        ...targetUser,
        password: newPasswordInput,
        lastActiveAt: new Date().toISOString()
      };

      const updatedUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
      setUsers(updatedUsers);
      saveUsers(updatedUsers);
      await saveUserUnified(updatedUser);

      setSuccessMsg("Password changed successfully! You can now sign in.");
      setPassword(newPasswordInput);
      setTimeout(() => {
        setActiveMode("login");
        setError(null);
      }, 1500);
    } catch (err: any) {
      setError("Failed to update password: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
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

      {/* Main Login Card */}
      <main className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 sm:p-8 space-y-6">
          
          {/* 3-Tab Header */}
          <div className="flex border-b border-[#EAE6DF] pb-2 text-xs font-medium tracking-wide">
            <button
              type="button"
              onClick={() => { setActiveMode("login"); setError(null); setSuccessMsg(null); }}
              className={`pb-2 px-3 transition-colors relative ${
                activeMode === "login"
                  ? "text-[#1F2022] font-semibold border-b-2 border-[#1F2022] -mb-[9px]"
                  : "text-[#8A8C90] hover:text-[#4A4B4E]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setActiveMode("register"); setError(null); setSuccessMsg(null); }}
              className={`pb-2 px-3 transition-colors relative ${
                activeMode === "register"
                  ? "text-[#1F2022] font-semibold border-b-2 border-[#1F2022] -mb-[9px]"
                  : "text-[#8A8C90] hover:text-[#4A4B4E]"
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => { setActiveMode("reset_password"); setError(null); setSuccessMsg(null); }}
              className={`pb-2 px-3 transition-colors relative ${
                activeMode === "reset_password"
                  ? "text-[#1F2022] font-semibold border-b-2 border-[#1F2022] -mb-[9px]"
                  : "text-[#8A8C90] hover:text-[#4A4B4E]"
              }`}
            >
              Change Password
            </button>
          </div>

          {/* Success Message */}
          {successMsg && (
            <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 leading-relaxed">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-md bg-[#FFF5F3] border border-[#FAD3CD] text-[#B83828] text-xs flex items-start gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-[#C83E2B] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: SIGN IN FORM */}
          {activeMode === "login" && (
            <form onSubmit={handleSignIn} className="space-y-4 pt-1">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-[#8A8C90]" />
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setActiveMode("reset_password"); setError(null); }}
                    className="text-[11px] text-[#8A8C90] hover:text-[#1F2022] transition"
                  >
                    Forgot / Change?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-[#8A8C90]" />
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022] placeholder-[#A0A2A6] focus:outline-none focus:border-[#1F2022] focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-3 text-[#8A8C90] hover:text-[#1F2022]"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1F2022] hover:bg-[#343538] text-white text-xs font-semibold tracking-wider uppercase rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 shadow-sm cursor-pointer"
              >
                <span>Enter Simulation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* TAB 2: REGISTER FORM */}
          {activeMode === "register" && (
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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••• (min. 6 chars)"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022] placeholder-[#A0A2A6] focus:outline-none focus:border-[#1F2022] focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1">
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022] focus:outline-none focus:border-[#1F2022]"
                  >
                    <option value="player">Player (Student)</option>
                    <option value="instructor">Instructor</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1">
                    Universe
                  </label>
                  <select
                    value={selectedUnivId}
                    onChange={(e) => setSelectedUnivId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022] focus:outline-none focus:border-[#1F2022]"
                  >
                    {universes.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {role === "player" && (
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1">
                    Assign Competing Team
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
                className="w-full py-2.5 bg-[#1F2022] hover:bg-[#343538] text-white text-xs font-semibold tracking-wider uppercase rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 shadow-sm cursor-pointer"
              >
                <span>Create Account</span>
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* TAB 3: RESET / CHANGE PASSWORD */}
          {activeMode === "reset_password" && (
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1.5">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-[#8A8C90]" />
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

              {/* Method Toggle */}
              <div className="grid grid-cols-2 gap-2 bg-[#F3F0EA] p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => { setResetMethod("old_password"); setError(null); }}
                  className={`py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                    resetMethod === "old_password"
                      ? "bg-white text-[#1F2022] shadow-2xs font-bold"
                      : "text-[#5A5C60] hover:text-[#1F2022]"
                  }`}
                >
                  Match Old Password
                </button>
                <button
                  type="button"
                  onClick={() => { setResetMethod("email_otp"); setError(null); }}
                  className={`py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer ${
                    resetMethod === "email_otp"
                      ? "bg-white text-[#1F2022] shadow-2xs font-bold"
                      : "text-[#5A5C60] hover:text-[#1F2022]"
                  }`}
                >
                  6-Digit Email OTP
                </button>
              </div>

              {resetMethod === "old_password" ? (
                /* Sub-form: Verify with Old Password */
                <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1">
                      Current (Old) Password
                    </label>
                    <input
                      type="password"
                      required
                      value={oldPasswordInput}
                      onChange={(e) => setOldPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022] focus:outline-none focus:border-[#1F2022]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1">
                      New Password (min. 6 chars)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022] focus:outline-none focus:border-[#1F2022]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022] focus:outline-none focus:border-[#1F2022]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !email || !oldPasswordInput || !newPasswordInput}
                    className="w-full py-2.5 bg-[#1F2022] hover:bg-[#343538] text-white text-xs font-semibold tracking-wider uppercase rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <KeyRound className="w-3.5 h-3.5" />
                    )}
                    <span>Update & Set New Password</span>
                  </button>
                </form>
              ) : (
                /* Sub-form: Verify with 6-Digit Email OTP */
                <div className="space-y-3.5">
                  {!otpVerified ? (
                    <div className="space-y-3">
                      {!otpSent ? (
                        <button
                          type="button"
                          onClick={handleSendResetOtp}
                          disabled={!email.trim()}
                          className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Send 6-Digit Verification OTP
                        </button>
                      ) : (
                        <form onSubmit={handleVerifyResetOtp} className="space-y-3">
                          {generatedOtp && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-950 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold flex items-center gap-1">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-700" /> Security OTP Code:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEnteredOtp(generatedOtp)}
                                  className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold text-[10px] rounded font-mono transition cursor-pointer"
                                >
                                  Autofill
                                </button>
                              </div>
                              <div className="font-mono text-base tracking-widest font-bold text-amber-950">{generatedOtp}</div>
                            </div>
                          )}

                          <div>
                            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1">
                              Enter 6-Digit OTP
                            </label>
                            <input
                              type="text"
                              required
                              maxLength={6}
                              value={enteredOtp}
                              onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ""))}
                              placeholder="••••••"
                              className="w-full text-center tracking-[0.4em] text-base font-mono font-bold py-2 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg text-[#1F2022] focus:outline-none focus:border-blue-600"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              disabled={otpCountdown > 0}
                              onClick={handleSendResetOtp}
                              className="text-xs text-blue-700 hover:text-blue-900 disabled:text-slate-400 font-medium"
                            >
                              {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : "Resend OTP"}
                            </button>
                            <button
                              type="submit"
                              disabled={enteredOtp.length !== 6}
                              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg transition disabled:opacity-50 cursor-pointer"
                            >
                              Verify OTP
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  ) : (
                    /* OTP Verified -> Enter New Password */
                    <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>OTP Verified! Set your new password below.</span>
                      </div>

                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1">
                          New Password (min. 6 chars)
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={newPasswordInput}
                          onChange={(e) => setNewPasswordInput(e.target.value)}
                          placeholder="Enter new password"
                          className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022] focus:outline-none focus:border-[#1F2022]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={confirmPasswordInput}
                          onChange={(e) => setConfirmPasswordInput(e.target.value)}
                          placeholder="Re-type new password"
                          className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg text-xs text-[#1F2022] focus:outline-none focus:border-[#1F2022]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting || !newPasswordInput || !confirmPasswordInput}
                        className="w-full py-2.5 bg-[#1F2022] hover:bg-[#343538] text-white text-xs font-semibold tracking-wider uppercase rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Save & Complete Reset</span>
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
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
