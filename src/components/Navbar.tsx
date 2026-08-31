import React from "react";
import {
  Compass,
  Bike,
  Cpu,
  Megaphone,
  Store,
  Factory,
  DollarSign,
  BatteryCharging,
  BarChart3,
  Landmark,
  BookOpen,
  UserCheck,
  Users,
  RotateCcw,
  Database
} from "lucide-react";

export type TabKey =
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

interface NavbarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onResetGame: () => void;
  isInstructorMode: boolean;
  onToggleInstructorMode: () => void;
  canManageRoster?: boolean;
  isAdmin?: boolean;
  teamName: string;
  teamIndex: number;
  quarter: number;
}

const NAV_GROUPS: { label: string; tabs: TabKey[]; adminOnly?: boolean }[] = [
  { label: "Setup", tabs: ["charter"] },
  {
    label: "Decisions",
    tabs: ["product", "rnd", "marketing", "sales", "hr", "operations", "finance", "charging", "battery"]
  },
  { label: "Analytics", tabs: ["performance", "policy", "help"] },
  { label: "Instructor", tabs: ["instructor", "roster", "admin_db"], adminOnly: true }
];

const TEAM_COLORS = [
  "#22C55E",
  "#3B82F6",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#06B6D4",
  "#84CC16"
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onResetGame,
  isInstructorMode,
  onToggleInstructorMode,
  canManageRoster = true,
  isAdmin = false,
  teamName,
  teamIndex,
  quarter
}) => {
  const tabs: { id: TabKey; label: string; icon: React.ReactNode; show?: boolean }[] = [
    { id: "charter", label: "Executive Charter", icon: <Compass className="w-[15px] h-[15px]" /> },
    { id: "product", label: "Product & Specs", icon: <Bike className="w-[15px] h-[15px]" /> },
    { id: "rnd", label: "R&D & Licensing", icon: <Cpu className="w-[15px] h-[15px] text-purple-400" /> },
    { id: "marketing", label: "Marketing & Claims", icon: <Megaphone className="w-[15px] h-[15px]" /> },
    { id: "sales", label: "Sales & Outlets", icon: <Store className="w-[15px] h-[15px]" /> },
    { id: "hr", label: "HR & Productivity", icon: <Users className="w-[15px] h-[15px]" /> },
    { id: "operations", label: "Operations & Quality", icon: <Factory className="w-[15px] h-[15px]" /> },
    { id: "finance", label: "Finance & Pro Forma", icon: <DollarSign className="w-[15px] h-[15px] text-emerald-400" /> },
    { id: "charging", label: "Charging Network", icon: <BatteryCharging className="w-[15px] h-[15px] text-rose-500" /> },
    { id: "battery", label: "Battery Lifecycle", icon: <BatteryCharging className="w-[15px] h-[15px] text-emerald-600" /> },
    { id: "performance", label: "Scorecard & Reports", icon: <BarChart3 className="w-[15px] h-[15px] text-amber-400" /> },
    { id: "policy", label: "Policy Events", icon: <Landmark className="w-[15px] h-[15px] text-amber-600" /> },
    { id: "roster", label: "Universe Roster (10 Teams)", icon: <Users className="w-[15px] h-[15px] text-blue-400" />, show: canManageRoster },
    { id: "instructor", label: "Instructor Console", icon: <UserCheck className="w-[15px] h-[15px] text-purple-400" />, show: canManageRoster },
    { id: "admin_db", label: "Admin DB & Console", icon: <Database className="w-[15px] h-[15px] text-emerald-500" />, show: isAdmin },
    { id: "help", label: "Executive Help Manual", icon: <BookOpen className="w-[15px] h-[15px]" /> }
  ];

  const tabById = (id: TabKey) => tabs.find((t) => t.id === id);
  const teamColor = TEAM_COLORS[teamIndex % TEAM_COLORS.length];

  return (
    <nav
      className="flex flex-col bg-white overflow-y-auto"
      style={{
        width: 200,
        flexShrink: 0,
        borderRight: "0.5px solid #E5E1D8",
        height: "100%"
      }}
    >
      {/* Team Identity Block */}
      <div className="px-3 py-4 border-b border-[#E5E1D8] flex items-center gap-2">
        <div
          className="shrink-0"
          style={{ width: 28, height: 28, borderRadius: 6, background: teamColor }}
        />
        <div className="min-w-0">
          <div className="truncate text-[12px] font-medium text-[#1F2022]">{teamName}</div>
          <div className="text-[10px] text-[#8A8C90] truncate">
            Team {teamIndex + 1} · Q{quarter} Planning
          </div>
        </div>
      </div>

      {/* Grouped Navigation */}
      {NAV_GROUPS.map((group) => {
        if (group.adminOnly && !(isAdmin || canManageRoster)) return null;

        const groupTabs = group.tabs
          .map(tabById)
          .filter((t): t is { id: TabKey; label: string; icon: React.ReactNode; show?: boolean } =>
            Boolean(t) && t!.show !== false
          );
        if (groupTabs.length === 0) return null;

        return (
          <div key={group.label}>
            <div className="text-[10px] uppercase font-mono text-[#8A8C90] px-3 pt-4 pb-1 tracking-wider">
              {group.label}
            </div>
            {groupTabs.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onTabChange(t.id)}
                  title={t.label}
                  className={`w-[calc(100%-1rem)] mx-2 min-h-[36px] px-2 rounded-lg flex items-center gap-2 text-left text-[12px] transition-colors ${
                    isActive
                      ? "bg-[#F0F0EE] text-[#1F2022] font-medium"
                      : "text-[#5A5C60] hover:bg-[#F5F4F2] hover:text-[#1F2022]"
                  }`}
                >
                  <span className="shrink-0 flex items-center">{t.icon}</span>
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>
        );
      })}

      {/* Bottom Controls */}
      {canManageRoster && (
        <div className="mt-auto px-2 py-3 border-t border-[#E5E1D8] flex items-center gap-1.5">
          <button
            onClick={onToggleInstructorMode}
            className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-mono font-semibold transition ${
              isInstructorMode
                ? "bg-purple-100 text-purple-900 border border-purple-300"
                : "bg-white text-[#5A5C60] border border-[#E0DCD3] hover:bg-[#F3F0EA]"
            }`}
          >
            {isInstructorMode ? "Instructor" : "Student"}
          </button>

          <button
            onClick={onResetGame}
            title="Reset simulation scenario"
            aria-label="Reset simulation scenario"
            className="p-1.5 shrink-0 text-[#5A5C60] hover:text-[#1F2022] bg-white hover:bg-[#F3F0EA] border border-[#E0DCD3] rounded-lg transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      )}
    </nav>
  );
};
