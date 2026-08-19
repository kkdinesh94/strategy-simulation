import React from "react";
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
  CheckCircle2
} from "lucide-react";

interface CharterTabProps {
  team: TeamState;
  gameState: GameState;
  currentUser?: User | null;
  allUsers?: User[];
  universe?: Universe | null;
  onChange: (updatedTeam: TeamState) => void;
  onNotify?: (msg: string) => void;
}

export const CharterTab: React.FC<CharterTabProps> = ({
  team,
  gameState,
  currentUser,
  allUsers: passedUsers,
  universe,
  onChange,
  onNotify
}) => {
  const isLocked = team.dec.locked;
  const isQ1 = gameState.quarter === 1;

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

  const currentRoles = team.roles || {};

  // Retrieve enrolled student team members for this team
  const allUsersList = passedUsers && passedUsers.length > 0 ? passedUsers : loadUsers();
  const currentUnivId = universe?.id || currentUser?.universeId || "";
  const teamMembers = allUsersList.filter(
    (u) =>
      u.role === "player" &&
      (currentUnivId ? u.universeId === currentUnivId : true) &&
      u.teamI === team.i
  );

  const handleTeamNameChange = (newName: string) => {
    if (isLocked || !isQ1) return;
    onChange({
      ...team,
      name: newName
    });
  };

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

    // Clear any prior role this member held
    Object.keys(updated).forEach((k) => {
      if (updated[k] && String(updated[k]).toLowerCase().trim() === trimmed.toLowerCase()) {
        delete updated[k];
      }
    });

    // Assign new role
    updated[roleKey] = trimmed;

    onChange({
      ...team,
      roles: updated
    });

    if (onNotify) onNotify(`Assigned ${trimmed} to ${roleKey}`);
  };

  const handleTextChange = (field: "vision" | "mission" | "goals", value: string) => {
    onChange({
      ...team,
      [field]: value
    });
  };

  const handleSegmentChange = (field: "prim" | "sec", value: string) => {
    onChange({
      ...team,
      [field]: value
    });
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

  return (
    <div className="space-y-6 text-[#1F2022] font-sans">
      {/* Intro Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#F3F0EA] rounded-xl text-[#1F2022] border border-[#E0DCD3]">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1F2022]">
                Executive Organization & Strategic Charter
              </h2>
              <p className="text-xs text-[#5A5C60] mt-0.5">
                Establish corporate identity, select executive roles, define vision & mission, and set strategic market priorities.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {isQ1 ? (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-bold rounded-lg flex items-center gap-1.5 shadow-2xs">
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

      {/* Corporate Name & Brand Identity */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E5E1D8] pb-3">
          <Building className="w-5 h-5 text-[#C83E2B]" />
          <div>
            <h3 className="text-base font-bold text-[#1F2022]">
              Corporate & Venture Brand Name
            </h3>
            <p className="text-xs text-[#5A5C60]">
              {isQ1
                ? "Define your company's official name for the simulation duration."
                : "The corporate name was established in Quarter 1 and is now permanently frozen."}
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
              disabled={isLocked || !isQ1}
              onChange={(e) => handleTeamNameChange(e.target.value)}
              placeholder="e.g. Apex EV Motors, Athera Dynamics, Zenith Mobility"
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
      </div>

      {/* Team Composition & Role Selection */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E1D8] pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            <div>
              <h3 className="text-base font-bold text-[#1F2022]">
                Team Composition & Member Roster
              </h3>
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
            <div className="text-xs font-bold text-[#1F2022]">
              No enrolled members currently listed for Team {team.i + 1}
            </div>
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
                    isCurrent
                      ? "bg-purple-50/50 border-purple-300 shadow-xs"
                      : "bg-[#FAF8F5] border-[#E0DCD3]"
                  }`}
                >
                  {/* Member Name */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#1F2022] truncate">
                        {member.name}
                      </span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-600 text-white text-[9px] font-mono font-bold shrink-0">
                          YOU
                        </span>
                      )}
                    </div>
                    <div>
                      {assignedRole ? (
                        <span className="text-[11px] font-semibold text-purple-900">
                          {assignedRole.title.split(" (")[0]}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#8A8C90] italic">
                          No role assigned
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Role Dropdown */}
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
                        const isHeldByOther =
                          holder && String(holder).toLowerCase().trim() !== member.name.toLowerCase().trim();
                        return (
                          <option
                            key={r.key}
                            value={r.key}
                            className="text-gray-900"
                          >
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

      {/* Target Segment Selection */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E5E1D8] pb-3">
          <Target className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-bold text-[#1F2022]">
            Target Market Selection
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-mono font-bold uppercase text-[#5A5C60] mb-2">
              Primary Target Segment (Rank #1 Focus)
            </label>
            <select
              value={team.prim}
              disabled={isLocked || !isQ1}
              onChange={(e) => handleSegmentChange("prim", e.target.value)}
              className="w-full p-2.5 text-sm bg-[#FAF8F5] border border-[#E0DCD3] rounded-xl font-bold text-[#1F2022]"
            >
              {SEGMENTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({Math.round(s.pct * 100)}% of Total Market)
                </option>
              ))}
            </select>
            <p className="text-xs text-[#5A5C60] mt-2">
              {SEGMENTS.find((s) => s.id === team.prim)?.name} requires a dedicated marketing mix and product line tailored to its specific needs.
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase text-[#5A5C60] mb-2">
              Secondary Target Segment (Rank #2 Focus)
            </label>
            <select
              value={team.sec}
              disabled={isLocked || !isQ1}
              onChange={(e) => handleSegmentChange("sec", e.target.value)}
              className="w-full p-2.5 text-sm bg-[#FAF8F5] border border-[#E0DCD3] rounded-xl font-bold text-[#1F2022]"
            >
              {SEGMENTS.map((s) => (
                <option key={s.id} value={s.id} disabled={s.id === team.prim}>
                  {s.name} ({Math.round(s.pct * 100)}% of Total Market)
                </option>
              ))}
            </select>
            <p className="text-xs text-[#5A5C60] mt-2">
              Must be different from primary segment. Provides additional volume and diversifies market risk.
            </p>
          </div>
        </div>
      </div>

      {/* Vision & Mission Charter */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E5E1D8] pb-3">
          <Award className="w-5 h-5 text-amber-600" />
          <h3 className="text-base font-bold text-[#1F2022]">
            Corporate Charter & Mission Statements
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold uppercase text-[#5A5C60] mb-1">
              Corporate Vision Statement
            </label>
            <textarea
              rows={2}
              value={team.vision}
              disabled={isLocked || !isQ1}
              onChange={(e) => handleTextChange("vision", e.target.value)}
              placeholder="e.g. To become the most trusted, sustainable electric two-wheeler manufacturer in Asia..."
              className="w-full p-3 text-sm bg-[#FAF8F5] border border-[#E0DCD3] rounded-xl text-[#1F2022]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase text-[#5A5C60] mb-1">
              Corporate Mission Statement
            </label>
            <textarea
              rows={2}
              value={team.mission}
              disabled={isLocked || !isQ1}
              onChange={(e) => handleTextChange("mission", e.target.value)}
              placeholder="e.g. We design, manufacture, and distribute high-efficiency electric scooters engineered for urban commuters and daily fleet riders..."
              className="w-full p-3 text-sm bg-[#FAF8F5] border border-[#E0DCD3] rounded-xl text-[#1F2022]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase text-[#5A5C60] mb-1">
              Top Ranked Corporate Objectives
            </label>
            <input
              type="text"
              value={team.goals}
              disabled={isLocked || !isQ1}
              onChange={(e) => handleTextChange("goals", e.target.value)}
              placeholder="e.g. 1) Market share leadership in Commuters, 2) Positive EBITDA by Q6, 3) 95%+ Reliability"
              className="w-full p-3 text-sm font-medium bg-[#FAF8F5] border border-[#E0DCD3] rounded-xl text-[#1F2022]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
