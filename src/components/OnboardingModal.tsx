import React, { useState } from "react";
import { User } from "../types/auth";
import { TeamState, GameState } from "../types/simulation";
import { quarterItems } from "./QuarterChecklist";
import {
  Sparkles,
  Users2,
  ClipboardList,
  Rocket,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Wrench,
  Wallet,
  CheckCircle2
} from "lucide-react";

interface OnboardingModalProps {
  isOpen: boolean;
  user: User;
  team: TeamState;
  gameState: GameState;
  onComplete: () => void;
}

const ROLE_DEFS = [
  {
    key: "CEO",
    title: "President & Chief Executive Officer (CEO)",
    desc: "Overall Strategic Direction, Corporate Identity & Balanced Scorecard Leadership"
  },
  {
    key: "CFO",
    title: "VP Finance & Chief Financial Officer (CFO)",
    desc: "Cash Budgeting, Plant Capex, Debt Financing, Pro Forma Statements & VC Pitch"
  },
  {
    key: "CMO",
    title: "Chief Marketing Officer (CMO)",
    desc: "Product Lineup, Pricing Architecture, Advertising & Target Segment Allocations"
  },
  {
    key: "VPO",
    title: "VP Operations & Manufacturing",
    desc: "Factory Capacity Expansion, Quality Improvement & Production Scheduling"
  },
  {
    key: "RND",
    title: "Head of R&D & Tech Innovation",
    desc: "R&D Technology Licensing, Battery/Tech Breakthroughs & Next-Gen Specs"
  },
  {
    key: "VPS",
    title: "VP Sales & Distribution",
    desc: "Experience Center Expansion, E-Commerce Sales Strategy & Sales Force Sizing"
  }
];

const TOTAL_STEPS = 5;

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  user,
  team,
  gameState,
  onComplete
}) => {
  const [step, setStep] = useState<number>(1);

  if (!isOpen) return null;

  const rivalCount = Math.max(gameState.teams.length - 1, 0);

  const roles = team.roles || {};
  const assignedRoleKey = Object.keys(roles).find(
    (key) => String(roles[key]).toLowerCase().trim() === user.name.toLowerCase().trim()
  );
  const assignedRole = assignedRoleKey ? ROLE_DEFS.find((r) => r.key === assignedRoleKey) : null;

  const quarter = gameState.quarter;
  const priorityItems = quarterItems(Number(quarter)).slice(0, 3);
  const priorityTitle =
    quarter >= 9 ? "Final board report" : quarter >= 6 ? "Continuous improvement" : `Quarter ${quarter} priorities`;

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-2xl shadow-2xl max-w-lg w-full p-6 text-[#1F2022] space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Step dots */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((dot) => (
            <span
              key={dot}
              className={`h-1.5 rounded-full transition-all ${
                dot === step ? "w-6 bg-[#1F2022]" : "w-1.5 bg-[#E0DCD3]"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="space-y-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-[#F3F0EA] border border-[#E0DCD3] flex items-center justify-center text-[#C83E2B]">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold">Welcome to {team.name}!</h3>
            <p className="text-xs text-[#5A5C60] leading-relaxed">
              You're about to lead this venture through a competitive electric vehicle market simulation.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-white border border-[#E5E1D8] rounded-xl">
                <div className="text-[10px] font-mono uppercase text-[#8A8C90]">Rival Companies</div>
                <div className="text-xl font-bold">{rivalCount}</div>
              </div>
              <div className="p-3 bg-white border border-[#E5E1D8] rounded-xl">
                <div className="text-[10px] font-mono uppercase text-[#8A8C90]">Starting Capital</div>
                <div className="text-xl font-bold">Rs. {team.paidIn} L</div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Your role */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users2 className="w-5 h-5 text-purple-600" />
              <h3 className="text-base font-bold">Your Role</h3>
            </div>
            {assignedRole ? (
              <div className="p-4 bg-white border border-purple-200 rounded-xl space-y-1">
                <div className="text-sm font-bold text-purple-900">{assignedRole.title}</div>
                <p className="text-xs text-[#5A5C60] leading-relaxed">{assignedRole.desc}</p>
              </div>
            ) : (
              <div className="p-4 bg-[#F3F0EA] border border-dashed border-[#E0DCD3] rounded-xl text-xs text-[#5A5C60] text-center">
                Roles will be assigned in Executive Charter
              </div>
            )}
          </div>
        )}

        {/* Step 3: How it works */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold">How It Works</h3>
            </div>
            <div className="space-y-2.5">
              <div className="p-3 bg-white border border-[#E5E1D8] rounded-xl flex items-start gap-3">
                <BarChart3 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">Read the market</div>
                  <p className="text-[11px] text-[#5A5C60]">
                    Purchase the MOA survey to understand customer segments and buying behavior.
                  </p>
                </div>
              </div>
              <div className="p-3 bg-white border border-[#E5E1D8] rounded-xl flex items-start gap-3">
                <Wrench className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">Design your EV</div>
                  <p className="text-[11px] text-[#5A5C60]">
                    Configure models — powertrain, battery, features — to match segment demand.
                  </p>
                </div>
              </div>
              <div className="p-3 bg-white border border-[#E5E1D8] rounded-xl flex items-start gap-3">
                <Wallet className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">Manage cash</div>
                  <p className="text-[11px] text-[#5A5C60]">
                    Balance production, marketing, and financing decisions to stay solvent and grow.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: This quarter's priorities */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold">{priorityTitle}</h3>
            </div>
            <div className="space-y-2.5">
              {priorityItems.map(([label]: [string, string, string], idx: number) => (
                <div key={label} className="p-3 bg-white border border-[#E5E1D8] rounded-xl flex items-start gap-3">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-[#1F2022] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-medium text-[#1F2022]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Ready */}
        {step === 5 && (
          <div className="space-y-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold">You're all set!</h3>
            <p className="text-xs text-[#5A5C60] leading-relaxed">
              Head into the Executive Charter to get your team started.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E5E1D8]">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1}
            className="px-3 py-2 bg-white hover:bg-[#F3F0EA] border border-[#E0DCD3] text-[#1F2022] font-semibold rounded-lg text-xs transition disabled:opacity-40 flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={goNext}
              className="px-4 py-2 bg-[#1F2022] hover:bg-[#343538] text-white font-semibold rounded-lg text-xs transition shadow-2xs flex items-center gap-1.5"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onComplete}
              className="px-4 py-2 bg-[#1F2022] hover:bg-[#343538] text-white font-semibold rounded-lg text-xs transition shadow-2xs flex items-center gap-1.5"
            >
              Start playing <Rocket className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
