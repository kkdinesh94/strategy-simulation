import React, { useState } from "react";
import { User } from "../types/auth";
import { saveCurrentUser } from "../lib/authStore";
import { authApi, setSessionToken, type CohortInfo } from "../lib/apiClient";
import { Lock, Mail, ArrowRight, AlertCircle, Check, KeyRound, RefreshCw, Eye, EyeOff, Users } from "lucide-react";
import bgImage from "../assets/images/login-background.webp";

interface LoginPageProps {
  onLoginSuccess: (user: User, opts?: { mustChangePassword?: boolean }) => void;
}

type Mode = "login" | "register" | "password";

const inputClass =
  "w-full px-3 py-2.5 bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg text-sm text-[#1F2022] placeholder-[#A0A2A6] focus:outline-none focus:border-[#1F2022] focus:bg-white transition";
const labelClass = "block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1.5";
const primaryButton =
  "w-full py-2.5 bg-[#1F2022] hover:bg-[#343538] text-white text-xs font-semibold tracking-wider uppercase rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 shadow-sm disabled:opacity-50";

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [cohortCode, setCohortCode] = useState("");
  const [cohort, setCohort] = useState<CohortInfo | null>(null);
  const [teamI, setTeamI] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setSuccessMsg(null);
  };

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setSuccessMsg(null);
    setBusy(true);
    try {
      await fn();
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const { user, mustChangePassword } = await authApi.login(email.trim(), password);
      saveCurrentUser(user);
      onLoginSuccess(user, { mustChangePassword });
    });
  };

  const handleFindCohort = () =>
    run(async () => {
      const info = await authApi.cohort(cohortCode);
      setCohort(info);
      const open = info.teams.find((t) => t.members < info.maxMembersPerTeam);
      setTeamI(open ? open.i : null);
    });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cohort || teamI === null) {
      setError("Look up your cohort code and choose a team first.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }
    run(async () => {
      const { user } = await authApi.register({ name: name.trim(), email: email.trim(), password, code: cohortCode, teamI, institution: institution.trim() });
      saveCurrentUser(user);
      onLoginSuccess(user);
    });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    run(async () => {
      await authApi.login(email.trim(), password);
      try {
        await authApi.changePassword(password, newPassword);
      } finally {
        // This form only changes the password; the user signs in afterwards.
        await authApi.logout().catch(() => setSessionToken(null));
      }
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMsg("Password changed. Sign in with your new password.");
      setMode("login");
    });
  };

  const tab = (id: Mode, label: string) => (
    <button
      type="button"
      onClick={() => switchMode(id)}
      className={`pb-2 px-3 transition-colors relative ${
        mode === id ? "text-[#1F2022] font-semibold border-b-2 border-[#1F2022] -mb-[9px]" : "text-[#8A8C90] hover:text-[#4A4B4E]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      className="min-h-screen text-[#2C2D30] flex flex-col justify-between p-4 sm:p-10 font-sans selection:bg-[#C83E2B] selection:text-white relative bg-[#FAF8F5]"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(250, 248, 245, 0.88), rgba(250, 248, 245, 0.92)), url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      <header className="max-w-md w-full mx-auto flex items-center justify-between pb-6 border-b border-[#E8E4DC]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-[#C83E2B] text-white flex items-center justify-center font-serif font-bold text-sm shadow-sm tracking-widest">
            EV
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#1F2022] tracking-tight">EV Venture League</h1>
            <p className="text-[11px] text-[#7A7C80] tracking-wide">Department of Management Studies, NIT Warangal</p>
          </div>
        </div>
      </header>

      <main className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-5 sm:p-8 space-y-6">
          <div className="flex border-b border-[#EAE6DF] pb-2 text-xs font-medium tracking-wide" role="tablist">
            {tab("login", "Sign In")}
            {tab("register", "Join a Cohort")}
            {tab("password", "Password")}
          </div>

          {successMsg && (
            <div role="status" className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 leading-relaxed">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}
          {error && (
            <div role="alert" className="p-3 rounded-md bg-[#FFF5F3] border border-[#FAD3CD] text-[#B83828] text-xs flex items-start gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-[#C83E2B] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === "login" && (
            <form onSubmit={handleSignIn} className="space-y-4 pt-1">
              <div>
                <label htmlFor="login-email" className={labelClass}>Email address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-[#8A8C90]" />
                  <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@nitw.ac.in" className={`${inputClass} pl-9`} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className={labelClass.replace(" mb-1.5", "")}>Password</label>
                  <button type="button" onClick={() => switchMode("password")} className="text-[11px] text-[#8A8C90] hover:text-[#1F2022] transition">
                    Forgot or change?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-[#8A8C90]" />
                  <input id="login-password" type={showPass ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={`${inputClass} pl-9 pr-10`} />
                  <button type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? "Hide password" : "Show password"} className="absolute right-3 top-3 text-[#8A8C90] hover:text-[#1F2022]">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={busy} className={primaryButton}>
                {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Enter Simulation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4 pt-1">
              <div>
                <label htmlFor="reg-code" className={labelClass}>Cohort code</label>
                <div className="flex gap-2">
                  <input id="reg-code" required value={cohortCode} onChange={(e) => { setCohortCode(e.target.value.toUpperCase()); setCohort(null); }} placeholder="Given by your instructor, e.g. NITW2026" className={`${inputClass} font-mono uppercase`} />
                  <button type="button" onClick={handleFindCohort} disabled={busy || !cohortCode.trim()} className="px-3 rounded-lg border border-[#E0DCD3] text-xs font-semibold text-[#1F2022] hover:bg-[#F3F0EA] disabled:opacity-50 whitespace-nowrap">
                    Find
                  </button>
                </div>
                {cohort && <p className="mt-1.5 text-xs text-emerald-700">Found: {cohort.name}</p>}
              </div>

              {cohort && (
                <>
                  <div>
                    <label htmlFor="reg-team" className={labelClass}>Your team</label>
                    <div className="relative">
                      <Users className="w-4 h-4 absolute left-3 top-3 text-[#8A8C90]" />
                      <select id="reg-team" required value={teamI ?? ""} onChange={(e) => setTeamI(Number(e.target.value))} className={`${inputClass} pl-9`}>
                        <option value="" disabled>Choose a team</option>
                        {cohort.teams.map((t) => {
                          const full = t.members >= cohort.maxMembersPerTeam;
                          return (
                            <option key={t.i} value={t.i} disabled={full}>
                              {t.name} ({t.members}/{cohort.maxMembersPerTeam}{full ? ", full" : ""})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="reg-name" className={labelClass}>Full name</label>
                    <input id="reg-name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul Sharma" className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="reg-email" className={labelClass}>Email address</label>
                    <input id="reg-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@nitw.ac.in" className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="reg-inst" className={labelClass}>Programme (optional)</label>
                    <input id="reg-inst" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="e.g. NIT Warangal MBA '26" className={inputClass} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="reg-pass" className={labelClass}>Password</label>
                      <input id="reg-pass" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8+ characters" className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="reg-pass2" className={labelClass}>Confirm</label>
                      <input id="reg-pass2" type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-type password" className={inputClass} />
                    </div>
                  </div>
                  <button type="submit" disabled={busy || teamI === null} className={primaryButton}>
                    {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Create Account</span>
                  </button>
                </>
              )}
              <p className="text-[11px] text-[#8A8C90] leading-relaxed">Instructor accounts are created by the administrator.</p>
            </form>
          )}

          {mode === "password" && (
            <form onSubmit={handleChangePassword} className="space-y-4 pt-1">
              <div className="p-3 rounded-lg bg-[#F7F5F0] border border-[#EAE6DF] text-xs text-[#4A4C50] leading-relaxed">
                <strong className="text-[#1F2022]">Forgot your password?</strong> Ask your instructor to reset it from the team roster, then sign in and change it here.
              </div>
              <div>
                <label htmlFor="pw-email" className={labelClass}>Email address</label>
                <input id="pw-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="pw-current" className={labelClass}>Current password</label>
                <input id="pw-current" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pw-new" className={labelClass}>New password</label>
                  <input id="pw-new" type="password" autoComplete="new-password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="8+ characters" className={inputClass} />
                </div>
                <div>
                  <label htmlFor="pw-confirm" className={labelClass}>Confirm</label>
                  <input id="pw-confirm" type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
                </div>
              </div>
              <button type="submit" disabled={busy} className={primaryButton}>
                {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                <span>Change Password</span>
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="max-w-md w-full mx-auto pt-6 border-t border-[#E8E4DC] text-center text-[11px] text-[#8A8C90]">
        <div>© 2026 EV Venture League • NIT Warangal</div>
      </footer>
    </div>
  );
};
