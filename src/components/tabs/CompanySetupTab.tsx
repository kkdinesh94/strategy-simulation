import React, { useEffect, useMemo, useState } from "react";
import { TeamState, GameState } from "../../types/simulation";
import { User, Universe } from "../../types/auth";
import { SEGMENTS } from "../../engine/catalog";
import { loadUsers } from "../../lib/authStore";
import {
  Users,
  Target,
  Compass,
  Award,
  Building,
  Lock,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Save,
  Sparkles
} from "lucide-react";

interface CompanySetupTabProps {
  team: TeamState;
  gameState: GameState;
  currentUser?: User | null;
  allUsers?: User[];
  universe?: Universe | null;
  onChange: (updatedTeam: TeamState) => void;
  onNotify?: (msg: string) => void;
  initialStep?: number; // default 1, used when "charter" routes here
  universeId: string;
}

const STEP_LABELS = ["Identity", "Team & Roles", "Segments", "Strategy", "Goals"];

const CULTURE_VALUES = [
  "Innovation",
  "Sustainability",
  "Customer Obsession",
  "Cost Leadership",
  "Integrity",
  "Operational Excellence",
  "People Development",
  "Entrepreneurial Spirit"
];

const OBJECTIVES = ["Market Presence", "Profit", "Cash", "Shareholder Value"];
const FUNCTIONS = ["Marketing", "Sales", "Manufacturing", "R&D", "Human Resources"];

const draftKey = (universeId: string, teamId: number, quarter: number) =>
  `ev_strategy_draft_${universeId}_${teamId}_${quarter}`;

const EMPTY_PLAN = {
  problemStatement: "",
  culture: [] as string[],
  objectives: OBJECTIVES,
  advantage: "Differentiation",
  focus: "Broad",
  priorities: { Marketing: 20, Sales: 20, Manufacturing: 20, "R&D": 20, "Human Resources": 20 } as Record<string, number>,
  kpis: { marketShare: "", netIncome: "", endingCash: "", netEquity: "" }
};

function wordCount(value: string) {
  return value && value.trim() ? value.trim().split(/\s+/).length : 0;
}

function normalizePlan(value: any) {
  return {
    ...EMPTY_PLAN,
    ...value,
    culture: Array.isArray(value?.culture) ? value.culture : [],
    objectives: Array.isArray(value?.objectives) && value.objectives.length === 4 ? value.objectives : OBJECTIVES,
    priorities: { ...EMPTY_PLAN.priorities, ...(value?.priorities || {}) },
    kpis: { ...EMPTY_PLAN.kpis, ...(value?.kpis || {}) }
  };
}

const defaultRoles = [
  {
    key: "CEO",
    title: "President & Chief Executive Officer (CEO)",
    short: "CEO",
    desc: "Overall Strategic Direction, Corporate Identity & Balanced Scorecard Leadership"
  },
  {
    key: "CFO",
    title: "VP Finance & Chief Financial Officer (CFO)",
    short: "CFO",
    desc: "Cash Budgeting, Plant Capex, Debt Financing, Pro Forma Statements & VC Pitch"
  },
  {
    key: "CMO",
    title: "Chief Marketing Officer (CMO)",
    short: "CMO",
    desc: "Product Lineup, Pricing Architecture, Advertising & Target Segment Allocations"
  },
  {
    key: "VPO",
    title: "VP Operations & Manufacturing",
    short: "VP Ops",
    desc: "Factory Capacity Expansion, Quality Improvement & Production Scheduling"
  },
  {
    key: "RND",
    title: "Head of R&D & Tech Innovation",
    short: "Head R&D",
    desc: "R&D Technology Licensing, Battery/Tech Breakthroughs & Next-Gen Specs"
  },
  {
    key: "VPS",
    title: "VP Sales & Distribution",
    short: "VP Sales",
    desc: "Experience Center Expansion, E-Commerce Sales Strategy & Sales Force Sizing"
  }
];

export default function CompanySetupTab({
  team,
  gameState,
  currentUser,
  allUsers: passedUsers,
  universe,
  onChange,
  onNotify,
  initialStep,
  universeId
}: CompanySetupTabProps) {
  const [step, setStep] = useState(initialStep ?? 1);
  const [plan, setPlan] = useState(EMPTY_PLAN);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("idle");

  const isLocked = team.dec.locked;
  const isQ1 = gameState.quarter === 1;
  const teamId = team.i;
  const quarter = gameState.quarter;

  const priorityTotal = useMemo(
    () => FUNCTIONS.reduce((sum, name) => sum + Number(plan.priorities[name] || 0), 0),
    [plan.priorities]
  );
  const missionWords = wordCount(team.mission || "");
  const taglineWords = wordCount(team.tagline || "");

  const updatePlan = (changes: Partial<typeof EMPTY_PLAN>) =>
    setPlan((current) => {
      const next = { ...current, ...changes };
      localStorage.setItem(draftKey(universeId, teamId, quarter), JSON.stringify(next));
      return next;
    });

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    fetch(`/api/strategy-plans?universeId=${encodeURIComponent(universeId)}&teamId=${encodeURIComponent(String(teamId))}&quarter=${quarter}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.plan) {
          setPlan(normalizePlan(data.plan));
          localStorage.removeItem(draftKey(universeId, teamId, quarter));
        } else {
          const draft = localStorage.getItem(draftKey(universeId, teamId, quarter));
          if (draft) setPlan(normalizePlan(JSON.parse(draft)));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [universeId, teamId, quarter]);

  const saveDraft = async (currentPlan: typeof EMPTY_PLAN) => {
    try {
      await fetch("/api/strategy-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universeId, teamId, quarter, plan: currentPlan, isDraft: true })
      });
    } catch (_) {}
  };

  const savePlan = async () => {
    if (priorityTotal !== 100) {
      onNotify?.("Adjust priority sliders to total exactly 100 before saving.");
      setStep(4);
      return;
    }
    if (missionWords > 200) {
      onNotify?.("Mission statement exceeds 200 words.");
      setStep(4);
      return;
    }
    setStatus("saving");
    try {
      const response = await fetch("/api/strategy-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universeId, teamId, quarter, plan })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Strategy plan could not be saved.");
      }
      setStatus("saved");
      localStorage.removeItem(draftKey(universeId, teamId, quarter));
      onNotify?.("Strategy plan saved successfully.");
    } catch (error: any) {
      setStatus("error");
      onNotify?.(`Save failed: ${error.message}. Your draft is preserved locally.`);
    }
  };

  const moveObjective = (index: number, direction: number) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= plan.objectives.length) return;
    const objectives = [...plan.objectives];
    [objectives[index], objectives[nextIndex]] = [objectives[nextIndex], objectives[index]];
    updatePlan({ objectives });
  };

  const setPriority = (name: string, value: string) => {
    const nextValue = Number(value);
    const currentValue = Number(plan.priorities[name] || 0);
    const remainder = 100 - (priorityTotal - currentValue);
    updatePlan({ priorities: { ...plan.priorities, [name]: Math.max(0, Math.min(nextValue, remainder)) } });
  };

  // ---- Team roster helpers (from CharterTab) ----
  const currentRoles = team.roles || {};
  const allUsersList = passedUsers && passedUsers.length > 0 ? passedUsers : loadUsers();
  const currentUnivId = universe?.id || currentUser?.universeId || "";
  const teamMembers = allUsersList.filter(
    (u) => u.role === "player" && (currentUnivId ? u.universeId === currentUnivId : true) && u.teamI === team.i
  );

  const handleMemberRolePick = (memberName: string, roleKey: string) => {
    if (isLocked) return;
    const updated = { ...currentRoles };
    const trimmed = memberName.trim();

    if (!roleKey) {
      Object.keys(updated).forEach((k) => {
        if (updated[k]?.toLowerCase().trim() === memberName.toLowerCase().trim()) {
          delete updated[k];
        }
      });
      onChange({ ...team, roles: updated });
      if (onNotify) onNotify(`Cleared role assignment for ${memberName}`);
      return;
    }

    Object.keys(updated).forEach((k) => {
      if (updated[k] && String(updated[k]).toLowerCase().trim() === trimmed.toLowerCase()) {
        delete updated[k];
      }
    });

    updated[roleKey] = trimmed;
    onChange({ ...team, roles: updated });
    if (onNotify) onNotify(`Assigned ${trimmed} to ${roleKey}`);
  };

  const getMemberRole = (memberName: string) => {
    const trimmed = memberName.toLowerCase().trim();
    for (const [rKey, name] of Object.entries(currentRoles)) {
      if (name && String(name).toLowerCase().trim() === trimmed) {
        return defaultRoles.find((r) => r.key === rKey);
      }
    }
    return null;
  };

  const handleSegmentChange = (field: "prim" | "sec", value: string) => {
    onChange({ ...team, [field]: value });
  };

  const primarySegment = SEGMENTS.find((s) => s.id === team.prim);
  const topBenefits = primarySegment
    ? Object.entries(primarySegment.w)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
    : [];

  const BENEFIT_LABELS: Record<string, string> = {
    perf: "Performance",
    range: "Range & Efficiency",
    charge: "Fast Charging",
    tech: "Smart Tech & Connectivity",
    build: "Premium Build",
    comfort: "Comfort",
    safety: "Safety",
    econ: "Total Cost of Ownership"
  };

  const isStepComplete = (index: number) => index < step;

  const renderStepIndicator = () => (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      {STEP_LABELS.map((label, idx) => {
        const stepNum = idx + 1;
        const active = stepNum === step;
        const complete = isStepComplete(stepNum);
        return (
          <React.Fragment key={label}>
            <button
              type="button"
              onClick={() => setStep(stepNum)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-bold transition ${
                active
                  ? "bg-[#1F2022] text-white border-[#1F2022]"
                  : complete
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-[#F3F0EA] text-[#5A5C60] border-[#E0DCD3]"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  active ? "bg-white text-[#1F2022]" : complete ? "bg-emerald-600 text-white" : "bg-white text-[#8A8C90] border border-[#E0DCD3]"
                }`}
              >
                {complete ? <Check className="w-3 h-3" /> : stepNum}
              </span>
              {label}
            </button>
            {idx < STEP_LABELS.length - 1 && <div className="w-4 h-px bg-[#E0DCD3]" />}
          </React.Fragment>
        );
      })}
    </div>
  );

  const renderStep1Identity = () => (
    <div className="space-y-5">
      <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E5E1D8] pb-3">
          <Building className="w-5 h-5 text-[#C83E2B]" />
          <div>
            <h3 className="text-base font-bold text-[#1F2022]">Corporate & Venture Brand Name</h3>
            <p className="text-xs text-[#5A5C60]">
              {isQ1 ? "Define your company's official name for the simulation duration." : "The corporate name was established in Quarter 1 and is now permanently frozen."}
            </p>
          </div>
        </div>
        <div className="max-w-xl">
          <label className="block text-xs font-mono font-bold uppercase text-[#5A5C60] mb-1.5">
            Company Name {isQ1 ? "(Editable in Q1)" : "(Frozen)"}
          </label>
          <div className="relative">
            <input
              type="text"
              value={team.name}
              disabled={isLocked || gameState.quarter > 1}
              onChange={(e) => onChange({ ...team, name: e.target.value })}
              placeholder="e.g. Apex EV Motors, Zenith Mobility"
              className={`w-full p-3 text-sm font-bold rounded-xl border transition ${
                isQ1 && !isLocked
                  ? "bg-[#FAF8F5] border-[#E0DCD3] text-[#1F2022] focus:border-[#1F2022] focus:bg-white"
                  : "bg-[#F3F0EA] border-[#E0DCD3] text-[#5A5C60] cursor-not-allowed"
              }`}
            />
            {!isQ1 && (
              <div className="absolute right-3 top-3 text-xs font-mono text-[#5A5C60] flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Frozen
              </div>
            )}
          </div>
        </div>
        <div className="max-w-xl">
          <label className="block text-xs font-mono font-bold uppercase text-[#5A5C60] mb-1.5">
            Brand Tagline
          </label>
          <input
            type="text"
            value={team.tagline || ""}
            disabled={isLocked}
            onChange={(e) => {
              const words = e.target.value.trim() ? e.target.value.trim().split(/\s+/) : [];
              if (words.length > 10) return;
              onChange({ ...team, tagline: e.target.value });
            }}
            placeholder="e.g. Driving India's clean commute forward"
            className="w-full p-3 text-sm bg-[#FAF8F5] border border-[#E0DCD3] rounded-xl text-[#1F2022]"
          />
          <div className={`text-xs mt-1 ${taglineWords > 10 ? "text-red-600" : "text-[#8A8C90]"}`}>{taglineWords}/10 words</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E5E1D8] pb-3">
          <Sparkles className="w-5 h-5 text-amber-600" />
          <div>
            <h3 className="text-base font-bold text-[#1F2022]">Corporate Values</h3>
            <p className="text-xs text-[#5A5C60]">Choose the values your team will use to make trade-offs this quarter.</p>
          </div>
        </div>
        <div className="strategy-option-grid">
          {CULTURE_VALUES.map((value) => (
            <label key={value} className={`strategy-check ${plan.culture.includes(value) ? "is-selected" : ""}`}>
              <input
                type="checkbox"
                checked={plan.culture.includes(value)}
                onChange={() =>
                  updatePlan({
                    culture: plan.culture.includes(value) ? plan.culture.filter((item) => item !== value) : [...plan.culture, value]
                  })
                }
              />
              <span>{value}</span>
            </label>
          ))}
        </div>
        {plan.culture.length === 0 && <p className="text-xs text-red-600">Select at least one corporate value.</p>}
      </div>
    </div>
  );

  const renderStep2TeamRoles = () => (
    <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E1D8] pb-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          <div>
            <h3 className="text-base font-bold text-[#1F2022]">Team Composition & Member Roster</h3>
            <p className="text-xs text-[#5A5C60]">
              Team members assigned to <strong className="text-[#1F2022]">{team.name}</strong> (Team {team.i + 1}). Select your preferred functional role.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 bg-purple-50 text-purple-800 text-xs font-mono font-bold rounded-lg border border-purple-200">
            {teamMembers.length} Team Member{teamMembers.length === 1 ? "" : "s"}
          </span>
          <span className="px-3 py-1 bg-[#F3F0EA] text-[#5A5C60] text-xs font-mono font-semibold rounded-lg border border-[#E0DCD3]">
            {Object.keys(currentRoles).filter((k) => currentRoles[k]).length} of 6 Roles Selected
          </span>
        </div>
      </div>

      {teamMembers.length === 0 ? (
        <div className="p-6 bg-[#FAF8F5] border border-dashed border-[#E0DCD3] rounded-xl text-center space-y-2">
          <div className="text-xs font-bold text-[#1F2022]">No enrolled members currently listed for Team {team.i + 1}</div>
          <p className="text-[11px] text-[#5A5C60] max-w-md mx-auto">
            When students are assigned to Team {team.i + 1} in the roster, their names will automatically appear here with role selection options.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {teamMembers.map((member) => {
            const isCurrent = currentUser?.id === member.id;
            const assignedRole = getMemberRole(member.name);

            return (
              <div
                key={member.id}
                className={`p-4 rounded-xl border transition flex items-center justify-between gap-3 ${
                  isCurrent ? "bg-purple-50/50 border-purple-300 shadow-xs" : "bg-[#FAF8F5] border-[#E0DCD3]"
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#1F2022] truncate">{member.name}</span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-600 text-white text-[9px] font-mono font-bold shrink-0">YOU</span>
                    )}
                  </div>
                  <div>
                    {assignedRole ? (
                      <span className="text-[11px] font-semibold text-purple-900">{assignedRole.title.split(" (")[0]}</span>
                    ) : (
                      <span className="text-[11px] text-[#8A8C90] italic">No role assigned</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 w-48 sm:w-56">
                  <select
                    value={assignedRole?.key || ""}
                    disabled={isLocked}
                    onChange={(e) => handleMemberRolePick(member.name, e.target.value)}
                    className={`w-full text-xs font-mono font-medium px-3 py-2 rounded-lg border transition ${
                      isLocked
                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                        : isCurrent
                        ? "bg-white text-purple-900 border-purple-300 font-bold hover:border-purple-600 shadow-2xs"
                        : "bg-white text-[#1F2022] border-[#E0DCD3] hover:border-[#1F2022]"
                    }`}
                  >
                    <option value="" className="text-gray-500">
                      {assignedRole ? "Unassign Role" : isCurrent ? "★ Select My Role..." : "Select Role..."}
                    </option>
                    {defaultRoles.map((r) => {
                      const holder = currentRoles[r.key];
                      const isHeldByOther = holder && String(holder).toLowerCase().trim() !== member.name.toLowerCase().trim();
                      return (
                        <option key={r.key} value={r.key} className="text-gray-900">
                          {r.short} – {r.title.split(" (")[0]} {isHeldByOther ? `(Held by ${holder})` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderStep3Segments = () => (
    <div className="space-y-5">
      <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E5E1D8] pb-3">
          <Target className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-bold text-[#1F2022]">Target Market Selection</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono font-bold uppercase text-[#5A5C60] mb-2">Primary Target Segment</label>
            <div className="flex flex-wrap gap-2">
              {SEGMENTS.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  disabled={isLocked || !isQ1}
                  onClick={() => handleSegmentChange("prim", s.id)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition ${
                    team.prim === s.id
                      ? "bg-[#1F2022] text-white border-[#1F2022]"
                      : "bg-[#FAF8F5] text-[#1F2022] border-[#E0DCD3] hover:border-[#1F2022]"
                  }`}
                >
                  {s.name} ({Math.round(s.pct * 100)}%)
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase text-[#5A5C60] mb-2">Secondary Target Segment</label>
            <div className="flex flex-wrap gap-2">
              {SEGMENTS.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  disabled={isLocked || !isQ1 || s.id === team.prim}
                  onClick={() => handleSegmentChange("sec", s.id)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition ${
                    s.id === team.prim
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : team.sec === s.id
                      ? "bg-[#1F2022] text-white border-[#1F2022]"
                      : "bg-[#FAF8F5] text-[#1F2022] border-[#E0DCD3] hover:border-[#1F2022]"
                  }`}
                >
                  {s.name} ({Math.round(s.pct * 100)}%)
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {primarySegment && (
        <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
          <h3 className="text-base font-bold text-[#1F2022]">
            What {primarySegment.name} customers value most — design your product to match
          </h3>
          <div className="space-y-3">
            {topBenefits.map(([key, weight]) => (
              <div key={key}>
                <div className="flex justify-between text-xs font-semibold text-[#1F2022] mb-1">
                  <span>{BENEFIT_LABELS[key] || key}</span>
                  <span>{weight}</span>
                </div>
                <div className="w-full h-2 bg-[#F3F0EA] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${Math.min(100, Number(weight))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderStep4Strategy = () => (
    <div className="space-y-5">
      <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E5E1D8] pb-3">
          <Award className="w-5 h-5 text-amber-600" />
          <h3 className="text-base font-bold text-[#1F2022]">Corporate Charter & Mission Statements</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold uppercase text-[#5A5C60] mb-1">Corporate Vision Statement</label>
            <textarea
              rows={2}
              value={team.vision}
              disabled={isLocked || !isQ1}
              onChange={(e) => onChange({ ...team, vision: e.target.value })}
              placeholder="e.g. To become the most trusted, sustainable electric two-wheeler manufacturer in Asia..."
              className="w-full p-3 text-sm bg-[#FAF8F5] border border-[#E0DCD3] rounded-xl text-[#1F2022]"
            />
          </div>
          <div>
            <label className="block text-xs font-mono font-bold uppercase text-[#5A5C60] mb-1">Corporate Mission Statement</label>
            <textarea
              rows={4}
              value={team.mission}
              disabled={isLocked}
              onChange={(e) => onChange({ ...team, mission: e.target.value })}
              maxLength={1400}
              placeholder="We exist to..."
              className="w-full p-3 text-sm bg-[#FAF8F5] border border-[#E0DCD3] rounded-xl text-[#1F2022]"
            />
            <div className={`text-xs mt-1 ${missionWords > 200 ? "text-red-600" : "text-[#8A8C90]"}`}>{missionWords}/200 words</div>
          </div>
        </div>
      </div>

      <div className="strategy-field">
        <div className="strategy-field-heading">
          <div>
            <h2>Problem statement</h2>
            <p>Name the key challenge that needs a strategic response this quarter.</p>
          </div>
        </div>
        <textarea
          value={plan.problemStatement}
          onChange={(e) => updatePlan({ problemStatement: e.target.value })}
          rows={6}
          placeholder="Our most important challenge is..."
          className="strategy-textarea"
        />
      </div>

      <div className="strategy-field">
        <div className="strategy-field-heading">
          <div>
            <h2>Basis for competitive advantage</h2>
            <p>Choose how you will win and where you will focus.</p>
          </div>
        </div>
        <div className="strategy-split-options">
          <OptionGroup label="How we win" options={["Cost Leadership", "Differentiation", "Hybrid"]} value={plan.advantage} onChange={(advantage) => updatePlan({ advantage })} />
          <OptionGroup label="Where we play" options={["Broad", "Niche"]} value={plan.focus} onChange={(focus) => updatePlan({ focus })} />
        </div>
      </div>

      <div className="strategy-field">
        <div className="strategy-field-heading">
          <div>
            <h2>Functional strategy priorities</h2>
            <p>Allocate exactly 100 points across the functions. These points express where leadership attention and resources go.</p>
          </div>
        </div>
        <div className="strategy-budget-total">
          <span>Allocated</span>
          <strong className={priorityTotal === 100 ? "is-good" : "is-error"}>{priorityTotal}/100</strong>
        </div>
        <div className="strategy-slider-list">
          {FUNCTIONS.map((name) => (
            <label key={name} className="strategy-slider-row">
              <span>
                <strong>{name}</strong>
                <output>{plan.priorities[name]} pts</output>
              </span>
              <input type="range" min="0" max="100" value={plan.priorities[name]} onChange={(e) => setPriority(name, e.target.value)} />
            </label>
          ))}
        </div>
        {priorityTotal !== 100 && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "var(--bg-danger, #FCEBEB)",
              border: "0.5px solid var(--border-danger, #F09595)",
              color: "var(--text-danger, #A32D2D)",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <strong>Total: {priorityTotal}/100</strong>
            — adjust sliders until the total equals exactly 100 before saving.
            {priorityTotal > 100 ? ` Reduce by ${priorityTotal - 100} pts.` : ` Add ${100 - priorityTotal} pts.`}
          </div>
        )}
      </div>
    </div>
  );

  const renderStep5Goals = () => (
    <div className="space-y-5">
      <div className="strategy-field">
        <div className="strategy-field-heading">
          <div>
            <h2>Corporate objectives</h2>
            <p>Rank these objectives from most important to least important.</p>
          </div>
        </div>
        <div className="strategy-rank-list">
          {plan.objectives.map((objective, index) => (
            <div className="strategy-rank-row" key={objective}>
              <span className="strategy-rank-number">{index + 1}</span>
              <strong>{objective}</strong>
              <span className="strategy-rank-actions">
                <button type="button" title="Move up" aria-label={`Move ${objective} up`} disabled={index === 0} onClick={() => moveObjective(index, -1)}>
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  title="Move down"
                  aria-label={`Move ${objective} down`}
                  disabled={index === plan.objectives.length - 1}
                  onClick={() => moveObjective(index, 1)}
                >
                  <ChevronDown size={16} />
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="strategy-field">
        <div className="strategy-field-heading">
          <div>
            <h2>Goals with KPIs</h2>
            <p>Set the target values your team will use to evaluate the quarter.</p>
          </div>
        </div>
        <div className="strategy-kpi-grid">
          <KpiInput label="Market Share" suffix="%" value={plan.kpis.marketShare} onChange={(marketShare) => updatePlan({ kpis: { ...plan.kpis, marketShare } })} />
          <KpiInput label="Net Income" suffix="Rs. L" value={plan.kpis.netIncome} onChange={(netIncome) => updatePlan({ kpis: { ...plan.kpis, netIncome } })} />
          <KpiInput label="Ending Cash" suffix="Rs. L" value={plan.kpis.endingCash} onChange={(endingCash) => updatePlan({ kpis: { ...plan.kpis, endingCash } })} />
          <KpiInput label="Net Equity" suffix="Rs. L" value={plan.kpis.netEquity} onChange={(netEquity) => updatePlan({ kpis: { ...plan.kpis, netEquity } })} />
        </div>
      </div>
    </div>
  );

  const renderStep = () => {
    if (step === 1) return renderStep1Identity();
    if (step === 2) return renderStep2TeamRoles();
    if (step === 3) return renderStep3Segments();
    if (step === 4) return renderStep4Strategy();
    return renderStep5Goals();
  };

  const handleNext = async () => {
    await saveDraft(plan);
    setStep((s) => Math.min(5, s + 1));
  };

  return (
    <div className="space-y-6 text-[#1F2022] font-sans">
      <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#F3F0EA] rounded-xl text-[#1F2022] border border-[#E0DCD3]">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1F2022]">Company Setup</h2>
              <p className="text-xs text-[#5A5C60] mt-0.5">
                Establish corporate identity, team roles, target segments, and the strategic plan behind your numbers.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-[11px] font-mono text-[#8A8C90]">{loaded ? "Draft synced" : "Loading draft..."}</span>
            {isQ1 ? (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-bold rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Quarter 1 Setup Active
              </span>
            ) : (
              <span className="px-3 py-1 bg-[#F3F0EA] text-[#5A5C60] border border-[#E0DCD3] text-xs font-mono font-semibold rounded-lg flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Identity Frozen (Q{gameState.quarter})
              </span>
            )}
            {isLocked && (
              <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-mono font-bold rounded-lg flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-700" /> Decisions Locked ({team.dec.lockedBy || "Lead"})
              </span>
            )}
          </div>
        </div>
      </div>

      {renderStepIndicator()}

      {renderStep()}

      <div className="strategy-footer flex items-center justify-between bg-white p-4 rounded-2xl border border-[#E5E1D8] shadow-sm">
        <button type="button" className="strategy-secondary" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="strategy-footer-right flex items-center gap-3">
          {status === "saved" && (
            <div
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                background: "var(--bg-success)",
                color: "var(--text-success)",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              ✓ Strategy plan saved to server. You can safely navigate away.
            </div>
          )}
          {step < 5 ? (
            <button type="button" className="strategy-primary" onClick={handleNext}>
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <>
              {priorityTotal !== 100 && (
                <p style={{ fontSize: "12px", color: "var(--text-danger)", margin: "0 12px 0 0" }}>
                  Fix priorities (currently {priorityTotal}/100) to enable save.
                </p>
              )}
              <button
                type="button"
                className="strategy-primary"
                disabled={missionWords > 200 || priorityTotal !== 100 || status === "saving"}
                onClick={savePlan}
              >
                <Save size={16} /> {status === "saving" ? "Saving..." : "Save strategy"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OptionGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <h3 className="strategy-group-label">{label}</h3>
      <div className="strategy-radio-list">
        {options.map((option) => (
          <label key={option} className={`strategy-radio ${value === option ? "is-selected" : ""}`}>
            <input type="radio" name={label} checked={value === option} onChange={() => onChange(option)} />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function KpiInput({ label, suffix, value, onChange }: { label: string; suffix: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="strategy-kpi">
      <span>{label}</span>
      <div>
        <input type="number" min="0" step="any" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" />
        <small>{suffix}</small>
      </div>
    </label>
  );
}
