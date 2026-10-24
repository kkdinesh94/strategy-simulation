import React, { useEffect } from "react";
import {
  LayoutDashboard,
  Compass,
  Bike,
  Megaphone,
  Factory,
  Wallet,
  BarChart3,
  BookOpen,
  GraduationCap,
  Database,
  X
} from "lucide-react";

export type TabKey =
  | "home"
  | "charter"
  | "product"
  | "rnd"
  | "marketing"
  | "sales"
  | "hr"
  | "operations"
  | "finance"
  | "charging"
  | "battery"
  | "performance"
  | "policy"
  | "instructor"
  | "roster"
  | "admin_db"
  | "help";

export interface Area {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tabs: TabKey[];
  audience?: "staff" | "admin";
}

/** Areas in the sidebar; areas with several tabs show them as sub-tabs above the content. */
export const AREAS: Area[] = [
  { id: "teach", label: "Instructor", icon: GraduationCap, tabs: ["instructor", "roster"], audience: "staff" },
  { id: "admin", label: "Administration", icon: Database, tabs: ["admin_db"], audience: "admin" },
  { id: "home", label: "Home", icon: LayoutDashboard, tabs: ["home"] },
  { id: "strategy", label: "Strategy", icon: Compass, tabs: ["charter"] },
  { id: "product", label: "Product", icon: Bike, tabs: ["product", "rnd"] },
  { id: "market", label: "Market & Sales", icon: Megaphone, tabs: ["marketing", "sales", "charging"] },
  { id: "operations", label: "Operations", icon: Factory, tabs: ["operations", "hr", "battery"] },
  { id: "finance", label: "Finance", icon: Wallet, tabs: ["finance"] },
  { id: "results", label: "Results", icon: BarChart3, tabs: ["performance", "policy"] },
  { id: "help", label: "Help", icon: BookOpen, tabs: ["help"] }
];

export const TAB_LABELS: Record<TabKey, string> = {
  home: "Home",
  charter: "Company charter",
  product: "Product design",
  rnd: "R&D and licensing",
  marketing: "Marketing",
  sales: "Sales and stores",
  charging: "Charging network",
  operations: "Production and quality",
  hr: "People",
  battery: "Battery lifecycle",
  finance: "Finance",
  performance: "Scorecard and reports",
  policy: "Policy events",
  instructor: "Console",
  roster: "Teams and students",
  admin_db: "Database",
  help: "Help"
};

export function areaOf(tab: TabKey): Area {
  return AREAS.find((a) => a.tabs.includes(tab)) || AREAS[2];
}

export function visibleAreas(opts: { isStaff: boolean; isAdmin: boolean; hasTeam: boolean }): Area[] {
  return AREAS.filter((a) => {
    if (a.audience === "admin") return opts.isAdmin;
    if (a.audience === "staff") return opts.isStaff;
    if (a.id === "help") return true;
    return opts.hasTeam;
  });
}

interface NavbarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  isStaff: boolean;
  isAdmin: boolean;
  /** False for staff who are not observing a team: team areas are hidden. */
  hasTeam: boolean;
  teamName: string;
  teamColor: string;
  quarter: number;
  totalQuarters: number;
  /** Mobile drawer state; the sidebar is always visible from the lg breakpoint up. */
  open: boolean;
  onClose: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange, isStaff, isAdmin, hasTeam, teamName, teamColor, quarter, totalQuarters, open, onClose }) => {
  const current = areaOf(activeTab);
  const areas = visibleAreas({ isStaff, isAdmin, hasTeam });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const nav = (
    <nav aria-label="Main" className="flex flex-col h-full bg-white">
      <div className="lg:hidden h-14 px-4 flex items-center justify-between border-b border-[#E5E1D8]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-sm bg-[#C83E2B] text-white flex items-center justify-center font-serif font-bold text-[11px] tracking-widest">EV</div>
          <span className="text-sm font-semibold">EV Venture League</span>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F3F0EA]" aria-label="Close navigation">
          <X className="w-5 h-5" />
        </button>
      </div>

      {hasTeam && (
        <div className="lg:hidden px-4 py-4 border-b border-[#EEEAE2] flex items-center gap-2.5">
          <div className="w-2 h-8 rounded-full shrink-0" style={{ background: teamColor }} aria-hidden="true" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[#1F2022]">{teamName}</div>
            <div className="text-xs text-[#6C6D70]">Quarter {Math.min(quarter, totalQuarters)} of {totalQuarters}</div>
          </div>
        </div>
      )}

      <ul className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {areas.map((area) => {
          const Icon = area.icon;
          const active = current.id === area.id;
          return (
            <li key={area.id}>
              <button
                onClick={() => {
                  onTabChange(area.tabs[0]);
                  onClose();
                }}
                aria-current={active ? "page" : undefined}
                className={`w-full min-h-[40px] px-3 rounded-lg flex items-center gap-3 text-left text-sm transition-colors ${
                  active ? "bg-[#F1EEE7] text-[#1F2022] font-semibold" : "text-[#4A4C50] hover:bg-[#F7F5F0] hover:text-[#1F2022]"
                }`}
              >
                <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? "text-[#C83E2B]" : "text-[#8A8C90]"}`} />
                <span className="truncate">{area.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="px-4 py-3 border-t border-[#EEEAE2] text-[11px] text-[#8A8C90] leading-relaxed">
        Department of Management Studies
        <br />
        NIT Warangal
      </div>
    </nav>
  );

  return (
    <>
      <aside className="hidden lg:block w-[216px] shrink-0 border-r border-[#E5E1D8]">{nav}</aside>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-xl">{nav}</aside>
        </div>
      )}
    </>
  );
};

/** Sub-tabs for the current area, shown above the page content. */
export function SubTabs({ activeTab, onTabChange }: { activeTab: TabKey; onTabChange: (tab: TabKey) => void }) {
  const area = areaOf(activeTab);
  if (area.tabs.length < 2) return null;
  return (
    <div role="tablist" aria-label={area.label} className="flex gap-1 overflow-x-auto border-b border-[#E5E1D8] -mx-4 px-4 sm:mx-0 sm:px-0">
      {area.tabs.map((tab) => {
        const active = tab === activeTab;
        return (
          <button
            key={tab}
            role="tab"
            aria-selected={active}
            onClick={() => onTabChange(tab)}
            className={`shrink-0 px-3 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
              active ? "border-[#C83E2B] text-[#1F2022] font-semibold" : "border-transparent text-[#5A5C60] hover:text-[#1F2022]"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        );
      })}
    </div>
  );
}
