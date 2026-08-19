import React, { useState, useEffect } from "react";
import { User } from "../types/auth";
import { saveCurrentUser, loadUsers, saveUsers } from "../lib/authStore";
import { saveUserUnified } from "../lib/dbProvider";
import {
  Lock,
  KeyRound,
  Mail,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  RefreshCw,
  Send,
  X,
  Sparkles,
  ArrowRight,
  Shield
} from "lucide-react";

interface ChangePasswordModalProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
  onNotify: (msg: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onSuccess,
  onNotify
}) => {
  const [method, setMethod] = useState<"old_password" | "email_otp">("old_password");

  // Old password fields
  const [oldPassword, setOldPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  // Visibility toggles
  const [showOldPass, setShowOldPass] = useState<boolean>(false);
  const [showNewPass, setShowNewPass] = useState<boolean>(false);
  const [showConfirmPass, setShowConfirmPass] = useState<boolean>(false);

  // OTP state
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [enteredOtp, setEnteredOtp] = useState<string>("");
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpVerified, setOtpVerified] = useState<boolean>(false);
  const [otpCountdown, setOtpCountdown] = useState<number>(0);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setGeneratedOtp(null);
      setEnteredOtp("");
      setOtpSent(false);
      setOtpVerified(false);
      setError(null);
    }
  }, [isOpen]);

  // OTP countdown timer
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  if (!isOpen) return null;

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "Empty", color: "bg-slate-200" };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 1, label: "Weak", color: "bg-red-500", text: "text-red-600" };
    if (score <= 3) return { score: 2, label: "Medium", color: "bg-amber-500", text: "text-amber-600" };
    return { score: 3, label: "Strong", color: "bg-emerald-500", text: "text-emerald-600" };
  };

  const strength = getPasswordStrength(newPassword);

  // Generate & Dispatch 6-digit OTP
  const handleSendOtp = () => {
    setError(null);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setOtpSent(true);
    setOtpCountdown(60);
    onNotify(`Security OTP code sent to ${currentUser.email}: ${code}`);
  };

  // Verify OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!enteredOtp || enteredOtp.trim() !== generatedOtp) {
      setError("Invalid 6-digit OTP code. Please check the code and try again.");
      return;
    }
    setOtpVerified(true);
    setError(null);
    onNotify("OTP code verified successfully! Now set your new password.");
  };

  // Submit Password Change
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (method === "old_password") {
      const currentStoredPass = currentUser.password || "student123";
      if (oldPassword !== currentStoredPass) {
        setError("Current password is incorrect. If you have forgotten your password, use the Email OTP option.");
        return;
      }
    } else {
      if (!otpVerified) {
        setError("Please verify the 6-digit OTP sent to your email first.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const updatedUser: User = {
        ...currentUser,
        password: newPassword,
        lastActiveAt: new Date().toISOString()
      };

      // 1. Update active session
      saveCurrentUser(updatedUser);

      // 2. Update local users array
      const existingUsers = loadUsers();
      const updatedUsers = existingUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u));
      saveUsers(updatedUsers);

      // 3. Save to Unified DB (Cloudflare D1 & Firestore)
      await saveUserUnified(updatedUser);

      onNotify("Your password has been changed successfully!");
      onSuccess(updatedUser);
      onClose();
    } catch (err: any) {
      setError("Failed to update password in database: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-2xl shadow-2xl max-w-md w-full p-6 text-[#1F2022] space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white rounded-xl border border-[#E0DCD3] text-[#C83E2B] shadow-2xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1F2022]">Change Password</h3>
              <p className="text-xs text-[#5A5C60] font-mono">{currentUser.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8A8C90] hover:text-[#1F2022] hover:bg-[#F3F0EA] transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verification Method Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-[#F3F0EA] p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMethod("old_password");
              setError(null);
            }}
            className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              method === "old_password"
                ? "bg-white text-[#1F2022] shadow-2xs font-bold"
                : "text-[#5A5C60] hover:text-[#1F2022]"
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-slate-700" />
            <span>Match Old Password</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMethod("email_otp");
              setError(null);
            }}
            className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              method === "email_otp"
                ? "bg-white text-[#1F2022] shadow-2xs font-bold"
                : "text-[#5A5C60] hover:text-[#1F2022]"
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-blue-600" />
            <span>Email OTP Verification</span>
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 leading-relaxed">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* METHOD 1: OLD PASSWORD MATCH FORM */}
        {method === "old_password" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5A5C60] mb-1.5">
                Current (Old) Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-[#8A8C90]" />
                <input
                  type={showOldPass ? "text" : "password"}
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-[#E0DCD3] rounded-lg text-xs font-mono text-[#1F2022] focus:outline-none focus:border-[#1F2022] focus:ring-1 focus:ring-[#1F2022]"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  className="absolute right-3 top-3 text-[#8A8C90] hover:text-[#1F2022]"
                >
                  {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5A5C60]">
                  New Password
                </label>
                {newPassword && (
                  <span className={`text-[10px] font-bold font-mono ${strength.text}`}>
                    {strength.label}
                  </span>
                )}
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-[#8A8C90]" />
                <input
                  type={showNewPass ? "text" : "password"}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 chars)"
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-[#E0DCD3] rounded-lg text-xs font-mono text-[#1F2022] focus:outline-none focus:border-[#1F2022] focus:ring-1 focus:ring-[#1F2022]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-3 text-[#8A8C90] hover:text-[#1F2022]"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength visual bar */}
              {newPassword && (
                <div className="w-full bg-[#E0DCD3] h-1.5 rounded-full mt-2 overflow-hidden flex">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${(strength.score / 3) * 100}%` }}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5A5C60] mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-[#8A8C90]" />
                <input
                  type={showConfirmPass ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-[#E0DCD3] rounded-lg text-xs font-mono text-[#1F2022] focus:outline-none focus:border-[#1F2022] focus:ring-1 focus:ring-[#1F2022]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-3 text-[#8A8C90] hover:text-[#1F2022]"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && newPassword && confirmPassword === newPassword && (
                <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium mt-1">
                  <Check className="w-3.5 h-3.5" /> Passwords match
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E5E1D8]">
              <button
                type="button"
                onClick={() => setMethod("email_otp")}
                className="text-xs text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1"
              >
                Forgot old password?
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white hover:bg-[#F3F0EA] border border-[#E0DCD3] text-[#1F2022] font-semibold rounded-lg text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !oldPassword || !newPassword || !confirmPassword}
                  className="px-4 py-2 bg-[#1F2022] hover:bg-[#343538] text-white font-semibold rounded-lg text-xs transition shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* METHOD 2: EMAIL OTP VERIFICATION FLOW */}
        {method === "email_otp" && (
          <div className="space-y-4">
            {!otpVerified ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2 text-xs text-blue-950">
                  <div className="font-semibold flex items-center gap-1.5 text-blue-900">
                    <Shield className="w-4 h-4 text-blue-700" />
                    Two-Factor Email OTP Verification
                  </div>
                  <p className="text-[11px] leading-relaxed text-blue-800">
                    We will generate a secure 6-digit one-time password (OTP) for your registered account (<strong>{currentUser.email}</strong>).
                  </p>
                </div>

                {!otpSent ? (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Request 6-Digit Security OTP
                  </button>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-3">
                    {/* Simulated live email dispatch notification banner */}
                    {generatedOtp && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-950">
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1 text-amber-900">
                            <Sparkles className="w-3.5 h-3.5 text-amber-700" /> Simulated Dispatch
                          </span>
                          <button
                            type="button"
                            onClick={() => setEnteredOtp(generatedOtp)}
                            className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-900 text-[10px] font-bold rounded font-mono transition"
                          >
                            Autofill OTP
                          </button>
                        </div>
                        <p className="text-[11px] text-amber-800">
                          Your simulation security code is: <strong className="font-mono text-base tracking-widest text-amber-950">{generatedOtp}</strong>
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5A5C60] mb-1.5">
                        Enter 6-Digit OTP Code
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={enteredOtp}
                        onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="••••••"
                        className="w-full text-center tracking-[0.5em] text-lg font-mono font-bold py-2 bg-white border border-[#E0DCD3] rounded-lg text-[#1F2022] focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        disabled={otpCountdown > 0}
                        onClick={handleSendOtp}
                        className="text-xs text-blue-700 hover:text-blue-900 disabled:text-slate-400 font-medium"
                      >
                        {otpCountdown > 0 ? `Resend OTP in ${otpCountdown}s` : "Resend OTP Code"}
                      </button>

                      <button
                        type="submit"
                        disabled={enteredOtp.length !== 6}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-xs transition shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verify OTP
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              /* OTP is Verified -> Now Set New Password */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Email verified! Enter your new password below.</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5A5C60]">
                      New Password
                    </label>
                    {newPassword && (
                      <span className={`text-[10px] font-bold font-mono ${strength.text}`}>
                        {strength.label}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-3 text-[#8A8C90]" />
                    <input
                      type={showNewPass ? "text" : "password"}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min. 6 chars)"
                      className="w-full pl-9 pr-10 py-2.5 bg-white border border-[#E0DCD3] rounded-lg text-xs font-mono text-[#1F2022] focus:outline-none focus:border-[#1F2022]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-3 text-[#8A8C90] hover:text-[#1F2022]"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#5A5C60] mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-3 text-[#8A8C90]" />
                    <input
                      type={showConfirmPass ? "text" : "password"}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full pl-9 pr-10 py-2.5 bg-white border border-[#E0DCD3] rounded-lg text-xs font-mono text-[#1F2022] focus:outline-none focus:border-[#1F2022]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-3 text-[#8A8C90] hover:text-[#1F2022]"
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E1D8]">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-white hover:bg-[#F3F0EA] border border-[#E0DCD3] text-[#1F2022] font-semibold rounded-lg text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newPassword || !confirmPassword}
                    className="px-4 py-2 bg-[#1F2022] hover:bg-[#343538] text-white font-semibold rounded-lg text-xs transition shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Update Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
