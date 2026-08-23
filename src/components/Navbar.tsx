import React, { useRef, useState } from "react";
import {
  Compass,
  Target,
  Bike,
  Cpu,
  Megaphone,
  Store,
  Factory,
  DollarSign,
  BarChart3,
  BookOpen,
  UserCheck,
  Users,
  RotateCcw,
  Database,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List
} from "lucide-react";

export type TabKey =
  | "strategy"
  | "charter"
  | "product"
  | "rnd"
  | "marketing"
  | "sales"
  | "hr"
  | "operations"
  | "finance"
  | "performance"
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
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onResetGame,
  isInstructorMode,
  onToggleInstructorMode,
  canManageRoster = true,
  isAdmin = false
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isWrapView, setIsWrapView] = useState<boolean>(false);

  const tabs: { id: TabKey; label: string; icon: React.ReactNode; show?: boolean }[] = [
    { id: "strategy", label: "Strategy Wizard", icon: <Target className="w-4 h-4 text-rose-500" /> },
    { id: "charter", label: "Executive Charter", icon: <Compass className="w-4 h-4" /> },
    { id: "product", label: "Product & Specs", icon: <Bike className="w-4 h-4" /> },
    { id: "rnd", label: "R&D & Licensing", icon: <Cpu className="w-4 h-4 text-purple-400" /> },
    { id: "marketing", label: "Marketing & Claims", icon: <Megaphone className="w-4 h-4" /> },
    { id: "sales", label: "Sales & Outlets", icon: <Store className="w-4 h-4" /> },
    { id: "hr", label: "HR & Productivity", icon: <Users className="w-4 h-4" /> },
    { id: "operations", label: "Operations & Quality", icon: <Factory className="w-4 h-4" /> },
    { id: "finance", label: "Finance & Pro Forma", icon: <DollarSign className="w-4 h-4 text-emerald-400" /> },
    { id: "performance", label: "Scorecard & Reports", icon: <BarChart3 className="w-4 h-4 text-amber-400" /> },
    { id: "roster", label: "Universe Roster (10 Teams)", icon: <Users className="w-4 h-4 text-blue-400" />, show: canManageRoster },
    { id: "instructor", label: "Instructor Console", icon: <UserCheck className="w-4 h-4 text-purple-400" />, show: canManageRoster },
    { id: "admin_db", label: "Admin DB & Console", icon: <Database className="w-4 h-4 text-emerald-500" />, show: isAdmin },
    { id: "help", label: "Executive Help Manual", icon: <BookOpen className="w-4 h-4" /> }
  ];

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -240 : 240;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const visibleTabs = tabs.filter((t) => t.show !== false);

  return (
    <nav className="bg-[#FAF8F5] border-b border-[#E5E1D8] text-[#5A5C60] sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-1.5 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          {/* Scroll Left Button */}
          {!isWrapView && (
            <button
              onClick={() => handleScroll("left")}
              className="p-1.5 rounded-lg bg-white border border-[#E0DCD3] hover:bg-[#F3F0EA] text-[#1F2022] shadow-2xs transition shrink-0"
              title="Scroll tabs left"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Tab Buttons Container */}
          <div
            ref={scrollContainerRef}
            className={`flex-1 transition-all ${
              isWrapView
                ? "flex flex-wrap gap-1.5 py-1"
                : "flex items-center gap-1.5 overflow-x-auto py-1 scroll-smooth no-scrollbar"
            }`}
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#A0A2A6 #FAF8F5"
            }}
          >
            {visibleTabs.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onTabChange(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? "bg-[#1F2022] text-white shadow-sm font-semibold ring-1 ring-[#1F2022]"
                      : "bg-white/80 hover:bg-white border border-[#E0DCD3] text-[#4A4C50] hover:text-[#1F2022] shadow-2xs"
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Scroll Right Button */}
          {!isWrapView && (
            <button
              onClick={() => handleScroll("right")}
              className="p-1.5 rounded-lg bg-white border border-[#E0DCD3] hover:bg-[#F3F0EA] text-[#1F2022] shadow-2xs transition shrink-0"
              title="Scroll tabs right"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* Toggle Wrap/Scroll View & Controls */}
          <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-[#E5E1D8]">
            <button
              onClick={() => setIsWrapView(!isWrapView)}
              className={`p-1.5 rounded-lg border text-xs font-mono transition flex items-center gap-1 ${
                isWrapView
                  ? "bg-indigo-50 border-indigo-300 text-indigo-800"
                  : "bg-white border-[#E0DCD3] text-[#5A5C60] hover:bg-[#F3F0EA]"
              }`}
              title={isWrapView ? "Switch to single-line scroll" : "Wrap all tabs in grid"}
            >
              {isWrapView ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            </button>

            {canManageRoster && (
              <>
                <button
                  onClick={onToggleInstructorMode}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                    isInstructorMode
                      ? "bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs"
                      : "bg-white text-[#5A5C60] border border-[#E0DCD3] hover:bg-[#F3F0EA]"
                  }`}
                >
                  {isInstructorMode ? "Instructor" : "Student"}
                </button>

                <button
                  onClick={onResetGame}
                  title="Reset simulation scenario"
                  className="p-1.5 text-[#5A5C60] hover:text-[#1F2022] bg-white hover:bg-[#F3F0EA] border border-[#E0DCD3] rounded-lg transition"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

