import React, { useEffect, useState } from "react";
import { User } from "../types/auth";
import { authApi } from "../lib/apiClient";
import { AlertCircle, Eye, EyeOff, KeyRound, RefreshCw, X } from "lucide-react";

interface ChangePasswordModalProps {
  currentUser: User;
  isOpen: boolean;
  /** When true the account still uses a default password and the modal explains why it opened. */
  required?: boolean;
  onClose: () => void;
  onSuccess: (updatedUser: User) => void;
  onNotify: (msg: string) => void;
}

function strengthOf(pass: string) {
  let score = 0;
  if (pass.length >= 8) score += 1;
  if (pass.length >= 12) score += 1;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;
  if (score <= 2) return { width: "33%", label: "Weak", color: "bg-red-500", text: "text-red-700" };
  if (score <= 3) return { width: "66%", label: "Fair", color: "bg-amber-500", text: "text-amber-700" };
  return { width: "100%", label: "Strong", color: "bg-emerald-500", text: "text-emerald-700" };
}

const inputClass = "w-full px-3 py-2.5 bg-white border border-[#E0DCD3] rounded-lg text-sm focus:outline-none focus:border-[#1F2022]";
const labelClass = "block text-[11px] uppercase tracking-wider font-semibold text-[#5A5C60] mb-1.5";

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ currentUser, isOpen, required, onClose, onSuccess, onNotify }) => {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrent("");
      setNext("");
      setConfirm("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;
  const strength = strengthOf(next);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next.length < 8) return setError("New password must be at least 8 characters.");
    if (next !== confirm) return setError("The new passwords do not match.");
    setBusy(true);
    try {
      await authApi.changePassword(current, next);
      onNotify("Password changed. Other devices have been signed out.");
      onSuccess(currentUser);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Could not change the password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
      <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-2xl shadow-2xl max-w-md w-full p-6 text-[#1F2022] space-y-5">
        <div className="flex items-center justify-between border-b border-[#E5E1D8] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white rounded-xl border border-[#E0DCD3] text-[#C83E2B]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 id="change-password-title" className="font-bold text-base">Change password</h3>
              <p className="text-xs text-[#5A5C60]">{currentUser.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#8A8C90] hover:text-[#1F2022] hover:bg-[#F3F0EA]" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {required && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
            This account still uses a default password that anyone could guess. Please choose a new one now.
          </div>
        )}
        {error && (
          <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cp-current" className={labelClass}>Current password</label>
            <input id="cp-current" type={show ? "text" : "password"} autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="cp-new" className={labelClass.replace(" mb-1.5", "")}>New password</label>
              <button type="button" onClick={() => setShow(!show)} className="text-[11px] text-[#5A5C60] hover:text-[#1F2022] flex items-center gap-1">
                {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} {show ? "Hide" : "Show"}
              </button>
            </div>
            <input id="cp-new" type={show ? "text" : "password"} autoComplete="new-password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} placeholder="At least 8 characters" className={inputClass} />
            {next && (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-[#EEEAE2] overflow-hidden"><div className={`h-full ${strength.color}`} style={{ width: strength.width }} /></div>
                <span className={`text-[11px] font-semibold ${strength.text}`}>{strength.label}</span>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="cp-confirm" className={labelClass}>Confirm new password</label>
            <input id="cp-confirm" type={show ? "text" : "password"} autoComplete="new-password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-[#E0DCD3] text-xs font-semibold hover:bg-[#F3F0EA]">
              {required ? "Later" : "Cancel"}
            </button>
            <button type="submit" disabled={busy} className="flex-1 py-2.5 rounded-lg bg-[#1F2022] hover:bg-[#343538] text-white text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              {busy && <RefreshCw className="w-3.5 h-3.5 animate-spin" />} Save password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
