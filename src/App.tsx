import React, { useState, useEffect, useReducer, lazy, Suspense } from "react";
import { GameState, TeamState, LicenceContract } from "./types/simulation";
import { User, Universe } from "./types/auth";
import {
  loadCurrentUser,
  saveCurrentUser,
  loadActiveUniverse,
  saveActiveUniverse,
  loadUsers,
  loadUniverses,
  saveUsers,
  saveUniverses,
  getAccessibleUniverses
} from "./lib/authStore";
import {
  fetchUsersUnified,
  fetchUniversesUnified,
  saveUserUnified,
  getActiveDatabaseProvider
} from "./lib/dbProvider";
import { newState, auditTeam, botDecideLicence } from "./engine/simulationEngine";
import { authApi, getSessionToken, type SaveErrorDetail } from "./lib/apiClient";
import { DEFAULT_MARKET_IDS, BALANCE } from "./engine/catalog";
import { LoginPage } from "./components/LoginPage";
import { ExecutiveHeader } from "./components/ExecutiveHeader";
import { Navbar, SubTabs, TabKey, TAB_LABELS, areaOf, visibleAreas } from "./components/Navbar";
import { HomeDashboard } from "./components/HomeDashboard";
import { PreSubmissionSummaryModal } from "./components/PreSubmissionSummaryModal";
import { ChangePasswordModal } from "./components/ChangePasswordModal";
import { OnboardingModal } from "./components/OnboardingModal";
import { hasCompletedOnboarding, markOnboardingComplete } from "./lib/onboarding";
import { StrategySummary } from "./components/StrategyWizard";
import { CheckCircle, AlertTriangle, X } from "lucide-react";
import RightPanel from "./components/RightPanel";
import { QuarterAdvancedBanner } from "./components/QuarterAdvancedBanner";
import { useQuarterPoller } from "./hooks/useQuarterPoller";

// Each area's screens load on first visit, keeping the initial download small.
const UniverseRosterManager = lazy(() => import("./components/UniverseRosterManager").then((m) => ({ default: m.UniverseRosterManager })));
const ProductDesignTab = lazy(() => import("./components/tabs/ProductDesignTab").then((m) => ({ default: m.ProductDesignTab })));
const RnDTab = lazy(() => import("./components/tabs/RnDTab").then((m) => ({ default: m.RnDTab })));
const MarketingTab = lazy(() => import("./components/tabs/MarketingTab").then((m) => ({ default: m.MarketingTab })));
const SalesDistributionTab = lazy(() => import("./components/tabs/SalesDistributionTab").then((m) => ({ default: m.SalesDistributionTab })));
const OperationsTab = lazy(() => import("./components/tabs/OperationsTab").then((m) => ({ default: m.OperationsTab })));
const FinanceTab = lazy(() => import("./components/tabs/FinanceTab").then((m) => ({ default: m.FinanceTab })));
const PerformanceTab = lazy(() => import("./components/tabs/PerformanceTab").then((m) => ({ default: m.PerformanceTab })));
const InstructorConsoleTab = lazy(() => import("./components/tabs/InstructorConsoleTab").then((m) => ({ default: m.InstructorConsoleTab })));
const AdminDatabaseTab = lazy(() => import("./components/tabs/AdminDatabaseTab").then((m) => ({ default: m.AdminDatabaseTab })));
const HelpManualTab = lazy(() => import("./components/tabs/HelpManualTab").then((m) => ({ default: m.HelpManualTab })));
const AIConsultantModal = lazy(() => import("./components/AIConsultantModal").then((m) => ({ default: m.AIConsultantModal })));
const CompanySetupTab = lazy(() => import("./components/tabs/CompanySetupTab"));
const HRDashboard = lazy(() => import("./components/HRDashboard"));
const PolicyEvents = lazy(() => import("./components/PolicyEvents"));
const ChargingStrategy = lazy(() => import("./components/ChargingStrategy"));
const BatteryLifecycle = lazy(() => import("./components/BatteryLifecycle"));

type DecisionDashboardState = {
  revision: number;
  lastChangedAt: number;
};

type DecisionDashboardAction = { type: "TEAM_UPDATED" } | { type: "RESET" };

function decisionDashboardReducer(
  state: DecisionDashboardState,
  action: DecisionDashboardAction
): DecisionDashboardState {
  if (action.type === "RESET") return { revision: 0, lastChangedAt: Date.now() };
  return { revision: state.revision + 1, lastChangedAt: Date.now() };
}

function decisionAreaForField(field: string): string {
  if (/price|ad|media|campaign|claim|segment/i.test(field)) return "Marketing";
  if (/prod|capacity|plant|quality|facility|outlet|centre/i.test(field)) return "Operations";
  if (/debt|loan|cash|budget|finance|dividend|equity/i.test(field)) return "Finance";
  if (/hr|hire|training|salary|staff|productivity/i.test(field)) return "Human Resources";
  if (/sales|channel|distribution|territory/i.test(field)) return "Sales";
  if (/rd|research|license|technology|battery|charging/i.test(field)) return "R&D";
  return "Strategy";
}

export default function App() {
  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState<User | null>(() => loadCurrentUser());
  const [universe, setUniverse] = useState<Universe>(() => loadActiveUniverse());
  const [allUsers, setAllUsers] = useState<User[]>(() => loadUsers());
  const [allUniverses, setAllUniverses] = useState<Universe[]>(() => loadUniverses());

  const [gameState, setGameState] = useState<GameState>(() => universe.gameState);
  const [activeTeamIdx, setActiveTeamIdx] = useState<number>(() => {
    const usr = loadCurrentUser();
    return usr && usr.role === "player" ? usr.teamI : 0;
  });
  const [observingTeamIdx, setObservingTeamIdx] = useState<number | null>(null);
  const displayedTeamIdx =
    (currentUser?.role === "instructor" || currentUser?.role === "admin") && observingTeamIdx !== null
      ? observingTeamIdx
      : activeTeamIdx;

  const isStaffUser = currentUser?.role === "instructor" || currentUser?.role === "admin";
  const [activeTab, setActiveTabRaw] = useState<TabKey>(() => (loadCurrentUser()?.role === "player" ? "home" : "instructor"));
  // Checklist items and older links may name areas that are not tabs; fall back sensibly.
  const setActiveTab = (tab: string) => setActiveTabRaw((tab in TAB_LABELS ? tab : tab === "strategy" ? "charter" : "home") as TabKey);
  const [navOpen, setNavOpen] = useState<boolean>(false);
  const [forecastOpen, setForecastOpen] = useState<boolean>(false);
  const [advisorAvailable, setAdvisorAvailable] = useState<boolean>(false);
  const [notificationTone, setNotificationTone] = useState<"info" | "error">("info");
  const [isAdvisorOpen, setIsAdvisorOpen] = useState<boolean>(false);
  const [showPreSubmissionModal, setShowPreSubmissionModal] = useState<boolean>(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [auditErrors, setAuditErrors] = useState<string[]>([]);
  const [decisionDashboard, dispatchDecisionDashboard] = useReducer(decisionDashboardReducer, {
    revision: 0,
    lastChangedAt: Date.now()
  });
  const policyAlertQuarter = React.useRef<number | null>(null);

  useEffect(() => {
    if (!currentUser || !universe?.id || policyAlertQuarter.current === gameState.quarter) return;
    fetch(`/api/policy-events?quarter=${encodeURIComponent(gameState.quarter)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        const events = Array.isArray(payload?.events) ? payload.events : [];
        if (events.length) showNotification(`Policy Alert: ${events.map((event: any) => event.event_type).join(", ")} active in Q${gameState.quarter}.`);
        policyAlertQuarter.current = gameState.quarter;
      })
      .catch(() => { policyAlertQuarter.current = gameState.quarter; });
  }, [currentUser?.id, universe?.id, gameState.quarter]);

  // Active user telemetry heartbeat & presence tracking
  useEffect(() => {
    if (!currentUser) return;

    // Immediately record active online state on mount
    const pingPresence = (incrementTime: boolean = false) => {
      const stored = loadCurrentUser();
      if (!stored) return;
      const nowISO = new Date().toISOString();
      const updatedUser: User = {
        ...stored,
        activeMinutes: incrementTime ? (stored.activeMinutes || 0) + 1 : (stored.activeMinutes || 0),
        lastActiveAt: nowISO,
        isOnline: true
      };
      saveCurrentUser(updatedUser);
      setCurrentUser(updatedUser);
      saveUserUnified(updatedUser).catch((e) => console.warn("Presence ping error:", e));
    };

    pingPresence(false);

    // Heartbeat every 45 seconds (increments active time by 1 minute every 60s)
    const interval = setInterval(() => {
      pingPresence(true);
    }, 45000);

    // Throttled user activity listener (click, keypress)
    let lastActivityTime = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastActivityTime > 20000) {
        lastActivityTime = now;
        pingPresence(false);
      }
    };

    window.addEventListener("click", handleUserActivity, { passive: true });
    window.addEventListener("keydown", handleUserActivity, { passive: true });

    // Handle tab visibility change
    const handleVisibilityChange = () => {
      const stored = loadCurrentUser();
      if (!stored) return;
      const nowISO = new Date().toISOString();
      if (document.visibilityState === "hidden") {
        const offlineUser: User = {
          ...stored,
          lastActiveAt: nowISO,
          isOnline: false
        };
        saveCurrentUser(offlineUser);
        saveUserUnified(offlineUser).catch(() => {});
      } else if (document.visibilityState === "visible") {
        const onlineUser: User = {
          ...stored,
          lastActiveAt: nowISO,
          isOnline: true
        };
        saveCurrentUser(onlineUser);
        setCurrentUser(onlineUser);
        saveUserUnified(onlineUser).catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("click", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUser?.id]);

  const [quarterAdvancedTo, setQuarterAdvancedTo] = useState<number | null>(null);
  useQuarterPoller(
    currentUser?.role === "player" ? universe.id : "",
    gameState.quarter,
    setQuarterAdvancedTo,
    30000
  );

  const refreshAllData = async () => {
    try {
      const remoteUsers = await fetchUsersUnified();
      if (Array.isArray(remoteUsers)) {
        setAllUsers(remoteUsers);
        saveUsers(remoteUsers);
      }

      const remoteUniverses = await fetchUniversesUnified();
      if (Array.isArray(remoteUniverses) && remoteUniverses.length > 0) {
        setAllUniverses(remoteUniverses);
        saveUniverses(remoteUniverses);
        // Only update active universe if current universe is missing or needs refresh
        setUniverse((prev) => {
          if (!prev) return remoteUniverses[0];
          const found = remoteUniverses.find((u) => u.id === prev.id);
          if (found) {
            return found;
          }
          const fallback = remoteUniverses[0];
          saveActiveUniverse(fallback);
          return fallback;
        });
      }
    } catch (e) {
      console.warn("Error refreshing unified database data:", e);
    }
  };

  // Validate the stored session, then load this account's data from the server.
  useEffect(() => {
    if (!currentUser) return;
    if (!getSessionToken()) {
      saveCurrentUser(null);
      setCurrentUser(null);
      return;
    }
    authApi
      .me()
      .then(({ user }) => {
        saveCurrentUser(user);
        setCurrentUser((prev) => (prev ? { ...prev, ...user } : user));
        refreshAllData();
      })
      .catch(() => {
        /* a 401 is handled by the ev:unauthorized listener; network errors keep the cached view */
      });
  }, [currentUser?.id]);

  useEffect(() => {
    const onUnauthorized = () => {
      saveCurrentUser(null);
      setCurrentUser(null);
    };
    const onSaveError = (event: Event) => {
      const { status, message, details } = (event as CustomEvent<SaveErrorDetail>).detail;
      if (status === 422) {
        setAuditErrors(details.length ? details : [message]);
        showNotification("The auditor blocked this lock-in. Fix the items listed and try again.");
      } else {
        showNotification(message);
      }
      // The server copy is authoritative: reload it so the screen matches what was saved.
      refreshAllData();
    };
    window.addEventListener("ev:unauthorized", onUnauthorized);
    window.addEventListener("ev:save-error", onSaveError);
    return () => {
      window.removeEventListener("ev:unauthorized", onUnauthorized);
      window.removeEventListener("ev:save-error", onSaveError);
    };
  }, []);

  // Update GameState when Universe changes
  useEffect(() => {
    if (universe && universe.gameState) {
      setGameState(universe.gameState);
    }
  }, [universe]);

  // First-time player onboarding
  useEffect(() => {
    if (currentUser && currentUser.role === "player" && !hasCompletedOnboarding(currentUser.id)) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [currentUser?.id, currentUser?.role]);


  // Ensure team index is valid
  const currentTeam = gameState.teams[displayedTeamIdx] || gameState.teams[0] || {
    i: 0,
    name: "Aurora EV Motors",
    color: "#2563eb",
    isBot: false,
    arch: "premium",
    vision: "",
    mission: "",
    goals: "",
    prim: "S1",
    sec: "S3",
    charterDone: false,
    cash: 3200,
    paidIn: 3200,
    rep: 0.5,
    cumProfit: 0,
    aw: {},
    base: {},
    models: [],
    capacity: 2500,
    ppe: 600,
    hr: { sales: 100, plant: 100 },
    centres: DEFAULT_MARKET_IDS.length,
    storeCities: [...DEFAULT_MARKET_IDS],
    staff: 20,
    qualityCum: 20,
    techs: [],
    rnd: [],
    debt: { bank: 0, lt: 0, ltLeft: 0, shark: 0 },
    cumFuture: 0,
    cumRevenue: 0,
    equityVC: 0,
    equityEm: 0,
    vcRaised: 0,
    bankrupt: false,
    dec: {
      ad: 200,
      alloc: {},
      claims: [],
      buyIntel: false,
      buyClinic: false,
      prod: {},
      quality: 20,
      hire: 0,
      newCentres: 0,
      newCentreCities: [],
      rndStartCost: 0,
      bankTarget: 0,
      expBlocks: 0,
      ltIssue: 0,
      vc: null,
      devCost: 0,
      locked: false,
      lockedBy: ""
    },
    hist: []
  };

  const notificationTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const showNotification = (msg: string, tone: "info" | "error" = /could not|failed|blocked|refused|cannot|can only|not allowed|error/i.test(msg) ? "error" : "info") => {
    setNotification(msg);
    setNotificationTone(tone);
    if (notificationTimer.current) clearTimeout(notificationTimer.current);
    notificationTimer.current = setTimeout(() => setNotification(null), tone === "error" ? 7000 : 4000);
  };

  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : null))
      .then((h) => setAdvisorAvailable(Boolean(h?.features?.advisor)))
      .catch(() => setAdvisorAvailable(false));
  }, []);

  const handleSelectUniverse = (selectedUniv: Universe) => {
    setUniverse(selectedUniv);
    setGameState(selectedUniv.gameState);
    dispatchDecisionDashboard({ type: "RESET" });
    saveActiveUniverse(selectedUniv);
    if (currentUser) {
      const updatedUser: User = { ...currentUser, universeId: selectedUniv.id };
      setCurrentUser(updatedUser);
      saveCurrentUser(updatedUser);
      saveUserUnified(updatedUser).catch(() => {});
    }
    showNotification(`Switched active universe cohort to '${selectedUniv.name}' (${selectedUniv.code})`);
  };

  const handleLoginSuccess = async (user: User, opts?: { mustChangePassword?: boolean }) => {
    if (user.role === "player") {
      setActiveTeamIdx(user.teamI);
      setActiveTab("home");
    } else {
      setObservingTeamIdx(null);
      setActiveTab("instructor");
    }
    setPasswordChangeRequired(Boolean(opts?.mustChangePassword));
    setIsChangePasswordOpen(Boolean(opts?.mustChangePassword));

    const [remoteUniverses, remoteUsers] = await Promise.all([fetchUniversesUnified(), fetchUsersUnified()]);
    setAllUniverses(remoteUniverses);
    setAllUsers(remoteUsers);
    const accessible = getAccessibleUniverses(user, remoteUniverses);
    const targetUniv = accessible.find((u) => u.id === user.universeId) || accessible[0] || loadActiveUniverse();

    saveUniverses(remoteUniverses);
    try { localStorage.setItem("ev_venture_league_active_univ_id_v2", targetUniv.id); } catch {}
    setUniverse(targetUniv);
    setGameState(targetUniv.gameState);
    dispatchDecisionDashboard({ type: "RESET" });
    setCurrentUser(user);
  };

  const handleLogout = () => {
    authApi.logout().catch(() => {});
    // Shared lab computers: do not leave the cohort's data cached for the next person.
    saveUsers([]);
    saveUniverses([]);
    saveCurrentUser(null);
    setCurrentUser(null);
  };

  const handleUpdateGameState = (newGs: GameState) => {
    if (observingTeamIdx !== null) return;
    setGameState(newGs);
    const updatedUniv: Universe = {
      ...universe,
      gameState: newGs
    };
    setUniverse(updatedUniv);
    saveActiveUniverse(updatedUniv);
  };

  const handleUpdateCurrentTeam = (updatedTeam: TeamState) => {
    if (observingTeamIdx !== null) return;
    const changes = Object.keys({ ...(currentTeam.dec || {}), ...(updatedTeam.dec || {}) })
      .filter((field) => JSON.stringify(currentTeam.dec?.[field]) !== JSON.stringify(updatedTeam.dec?.[field]))
      .map((field) => ({
        decisionArea: decisionAreaForField(field),
        fieldChanged: field,
        oldValue: currentTeam.dec?.[field] ?? "",
        newValue: updatedTeam.dec?.[field] ?? ""
      }));
    if (changes.length) {
      fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universeId: universe.id, teamId: updatedTeam.i, quarter: gameState.quarter, changes })
      }).catch(() => {});
    }
    const updatedTeams = [...gameState.teams];
    updatedTeams[activeTeamIdx] = updatedTeam;
    const newGs: GameState = {
      ...gameState,
      teams: updatedTeams
    };
    dispatchDecisionDashboard({ type: "TEAM_UPDATED" });
    handleUpdateGameState(newGs);
  };

  const handleLockToggle = () => {
    if (observingTeamIdx !== null) return;
    const isCurrentlyLocked = currentTeam.dec.locked;

    if (!isCurrentlyLocked) {
      // Run auditor check before showing summary
      const errs = auditTeam(gameState, currentTeam);
      if (errs.length > 0) {
        setAuditErrors(errs);
        showNotification("Auditor blocked decision lock-in due to validation errors.");
        return;
      }
      // Show Pre-Submission Decision Summary Sheet Modal first
      setShowPreSubmissionModal(true);
    } else {
      // Unlocking directly
      finalizeLockToggle(true);
    }
  };

  const finalizeLockToggle = (isCurrentlyLocked: boolean) => {
    if (observingTeamIdx !== null) return;
    setAuditErrors([]);
    setShowPreSubmissionModal(false);
    const updatedTeam = {
      ...currentTeam,
      dec: {
        ...currentTeam.dec,
        locked: !isCurrentlyLocked,
        lockedBy: currentUser ? currentUser.name : "Executive Team Lead"
      }
    };

    handleUpdateCurrentTeam(updatedTeam);
    showNotification(
      isCurrentlyLocked
        ? "Decisions unlocked for modifications."
        : "Decisions locked in! Awaiting quarter simulation."
    );
  };

  const handleOfferLicence = async (techId: string, buyerI: number, fee: number) => {
    if (observingTeamIdx !== null) return;
    const seller = currentTeam;
    const buyer = gameState.teams[buyerI];
    if (!buyer || buyer.i === seller.i) return;

    const newContract: LicenceContract = {
      id: gameState.contractSeq,
      sellerI: seller.i,
      buyerI: buyer.i,
      techId,
      fee,
      status: "offered",
      qOffered: gameState.quarter
    };

    if (buyer.isBot) {
      if (botDecideLicence(buyer, newContract)) {
        newContract.status = "accepted";
        showNotification(`${buyer.name} accepted your licence offer of Rs. ${fee} L! Contract executed.`);
      } else {
        newContract.status = "rejected";
        showNotification(`${buyer.name} rejected your licence offer.`);
      }
    } else {
      showNotification(`Licence offer of Rs. ${fee} L sent to ${buyer.name}.`);
    }

    const newGs: GameState = {
      ...gameState,
      contractSeq: gameState.contractSeq + 1,
      contracts: [...gameState.contracts, newContract]
    };
    handleUpdateGameState(newGs);
  };

  const handleRespondLicence = async (contractId: number, accept: boolean) => {
    if (observingTeamIdx !== null) return;
    const updatedContracts = gameState.contracts.map((c) => {
      if (c.id === contractId) {
        return { ...c, status: accept ? ("accepted" as const) : ("rejected" as const) };
      }
      return c;
    });

    const newGs: GameState = {
      ...gameState,
      contracts: updatedContracts
    };
    handleUpdateGameState(newGs);
    showNotification(accept ? "Licence contract accepted." : "Licence contract rejected.");
  };

  const handleResetGame = () => {
    if (observingTeamIdx !== null) return;
    if (confirm(`Restart "${universe.name}" from Quarter 1? Every team's results so far will be erased. This cannot be undone.`)) {
      const resetState = newState(
        gameState.teams.map((t) => ({ name: t.name, arch: t.arch, isBot: t.isBot })),
        12,
        BALANCE.tam0,
        5
      );
      handleUpdateGameState(resetState);
      setActiveTeamIdx(currentUser?.role === "player" ? currentUser.teamI : 0);
      setActiveTab("home");
      setAuditErrors([]);
      showNotification("Simulation reset to Quarter 1.");
    }
  };

  const handleUpdateDeadline = async (deadlineISO: string | null) => {
    if (observingTeamIdx !== null) return;
    const updatedUniv: Universe = {
      ...universe,
      deadlineISO: deadlineISO || undefined
    };
    setUniverse(updatedUniv);
    saveActiveUniverse(updatedUniv);
    showNotification(deadlineISO ? `Quarter ${gameState.quarter} submission deadline updated!` : "Quarter deadline cleared.");
  };

  // If user is not logged in, show Login Page
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const hasTeam = !isStaffUser || observingTeamIdx !== null;
  const readOnly = isStaffUser;
  // Staff who stop observing a team are moved off team-only pages.
  const areaVisible = visibleAreas({ isStaff: isStaffUser, isAdmin: currentUser.role === "admin", hasTeam }).some((a) => a.id === areaOf(activeTab).id);
  const currentTab: TabKey = areaVisible ? activeTab : isStaffUser ? "instructor" : "home";
  const showForecast = hasTeam && !["instructor", "roster", "admin_db", "help"].includes(currentTab);

  return (
    <div className="h-screen bg-[#FAF8F5] text-[#1F2022] flex flex-col font-sans">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:px-3 focus:py-2 focus:bg-white focus:rounded-lg focus:shadow">
        Skip to content
      </a>
      <ExecutiveHeader
        team={currentTeam}
        gameState={gameState}
        currentUser={currentUser}
        universe={universe}
        allUniverses={allUniverses}
        observedTeamIdx={isStaffUser ? observingTeamIdx : currentUser.teamI}
        onObserveTeam={(idx) => {
          setObservingTeamIdx(idx);
          if (idx !== null && ["instructor", "roster", "admin_db"].includes(activeTab)) setActiveTab("home");
        }}
        onSelectUniverse={handleSelectUniverse}
        onLockToggle={handleLockToggle}
        onOpenAdvisor={advisorAvailable ? () => setIsAdvisorOpen(true) : undefined}
        onLogout={handleLogout}
        onUpdateDeadline={handleUpdateDeadline}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        onToggleNav={() => setNavOpen(true)}
        onToggleForecast={() => setForecastOpen((open) => !open)}
      />

      {observingTeamIdx !== null && isStaffUser && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
          <span>
            Viewing <strong>{currentTeam.name}</strong> as an observer. Changes are disabled.
          </span>
          <button onClick={() => setObservingTeamIdx(null)} className="px-3 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-semibold rounded-lg transition">
            Stop observing
          </button>
        </div>
      )}

      {quarterAdvancedTo !== null && (
        <QuarterAdvancedBanner
          newQuarter={quarterAdvancedTo}
          onRefresh={() => {
            refreshAllData();
            setQuarterAdvancedTo(null);
          }}
          onDismiss={() => setQuarterAdvancedTo(null)}
        />
      )}

      <div className="flex flex-1 min-h-0">
        <Navbar
          activeTab={currentTab}
          onTabChange={setActiveTab}
          isStaff={isStaffUser}
          isAdmin={currentUser.role === "admin"}
          hasTeam={hasTeam}
          teamName={currentTeam.name}
          teamColor={currentTeam.color || "#1F2022"}
          quarter={gameState.quarter}
          totalQuarters={gameState.cfg.quarters}
          open={navOpen}
          onClose={() => setNavOpen(false)}
        />

        <main id="main-content" className="flex-1 min-w-0 overflow-y-auto">
          <div className="px-4 sm:px-6 py-5 space-y-5 max-w-[1400px]">
            {auditErrors.length > 0 && (
              <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold text-sm text-red-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    The auditor needs these fixed before you can submit
                  </div>
                  <button onClick={() => setAuditErrors([])} className="p-1 rounded text-red-700 hover:bg-red-100" aria-label="Dismiss">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <ul className="mt-2 list-disc pl-5 text-sm text-red-800 space-y-1">
                  {auditErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <SubTabs activeTab={currentTab} onTabChange={setActiveTab} />

            <Suspense fallback={<div role="status" className="py-16 text-center text-sm text-[#6C6D70]">Loading…</div>}>

            {currentTab === "home" && (
              <HomeDashboard
                team={currentTeam}
                gameState={gameState}
                universe={universe}
                readOnly={readOnly}
                onNavigate={setActiveTab}
                onLockToggle={handleLockToggle}
              />
            )}

            {currentTab === "charter" && (
              <StrategySummary universeId={universe.id} teamId={currentTeam.i} quarter={gameState.quarter} onOpen={() => setActiveTab("charter")} />
            )}

        {currentTab === "charter" && (
          <CompanySetupTab
            team={currentTeam}
            gameState={gameState}
            currentUser={currentUser}
            allUsers={allUsers}
            universe={universe}
            onChange={handleUpdateCurrentTeam}
            onNotify={showNotification}
            universeId={universe.id}
            initialStep={1}
          />
        )}

        {currentTab === "product" && (
          <ProductDesignTab
            team={currentTeam}
            onChange={handleUpdateCurrentTeam}
            onNotify={showNotification}
          />
        )}

        {currentTab === "rnd" && (
          <RnDTab
            team={currentTeam}
            gameState={gameState}
            onChange={handleUpdateCurrentTeam}
            onOfferLicence={handleOfferLicence}
            onRespondLicence={handleRespondLicence}
            onNotify={showNotification}
            universeId={universe.id}
          />
        )}

        {currentTab === "marketing" && (
          <MarketingTab
            team={currentTeam}
            gameState={gameState}
            onChange={handleUpdateCurrentTeam}
            onNotify={showNotification}
            universeId={universe.id}
          />
        )}

        {currentTab === "sales" && (
          <SalesDistributionTab
            team={currentTeam}
            gameState={gameState}
            onChange={handleUpdateCurrentTeam}
          />
        )}

        {currentTab === "hr" && (
          <HRDashboard
            team={currentTeam}
            gameState={gameState}
            universeId={universe.id}
            onChange={handleUpdateCurrentTeam}
            onNotify={showNotification}
          />
        )}

        {currentTab === "operations" && (
          <OperationsTab
            team={currentTeam}
            gameState={gameState}
            onChange={handleUpdateCurrentTeam}
          />
        )}

        {currentTab === "finance" && (
          <FinanceTab
            team={currentTeam}
            gameState={gameState}
            onChange={handleUpdateCurrentTeam}
            onNotify={showNotification}
            universeId={universe.id}
          />
        )}

        {currentTab === "charging" && (
          <ChargingStrategy teamId={currentTeam.i} quarter={gameState.quarter} onNotify={showNotification} team={currentTeam} />
        )}

        {currentTab === "battery" && (
          <BatteryLifecycle universeId={universe.id} teamId={currentTeam.i} quarter={gameState.quarter} onNotify={showNotification} team={currentTeam} totalQuarters={gameState.cfg.quarters} />
        )}

        {currentTab === "performance" && (
          <PerformanceTab team={currentTeam} gameState={gameState} universeId={universe.id} onNotify={showNotification} functionalRole={Object.entries(currentTeam.roles || {}).find(([, memberName]) => memberName === currentUser?.name)?.[0] || "President"} />
        )}

        {currentTab === "policy" && (
          <PolicyEvents universeId={universe.id} quarter={gameState.quarter} onNotify={showNotification} team={currentTeam} />
        )}

        {currentTab === "roster" && (
          <UniverseRosterManager
            universe={universe}
            currentUser={currentUser}
            allUsers={allUsers}
            allUniverses={allUniverses}
            onUniverseUpdate={(updated) => {
              setUniverse(updated);
              setGameState(updated.gameState);
            }}
            onUsersUpdate={(updatedUsers) => {
              setAllUsers(updatedUsers);
              saveUsers(updatedUsers);
            }}
            onRefreshAll={refreshAllData}
          />
        )}

        {currentTab === "instructor" && (
          <InstructorConsoleTab
            onResetGame={handleResetGame}
            gameState={gameState}
            universe={universe}
            currentUser={currentUser}
            allUniverses={allUniverses}
            allUsers={allUsers}
            onUpdateState={handleUpdateGameState}
            onUpdateUniverse={(updatedUniv) => {
              setUniverse(updatedUniv);
              setGameState(updatedUniv.gameState);
            }}
            onSelectUniverse={handleSelectUniverse}
            onNotify={showNotification}
            onObserveTeam={(idx) => {
              setObservingTeamIdx(idx);
              setActiveTab("home");
            }}
          />
        )}

        {currentTab === "admin_db" && currentUser.role === "admin" && (
          <AdminDatabaseTab
            currentUser={currentUser}
            activeUniverse={universe}
            allUsers={allUsers}
            allUniverses={allUniverses}
            onRefreshAll={refreshAllData}
            onSelectActiveUniverse={handleSelectUniverse}
            onUsersUpdate={(updatedUsers) => {
              setAllUsers(updatedUsers);
              saveUsers(updatedUsers);
            }}
            onUniversesUpdate={(updatedUnivs) => {
              setAllUniverses(updatedUnivs);
              saveUniverses(updatedUnivs);
            }}
            onNotify={showNotification}
          />
        )}

        {currentTab === "help" && <HelpManualTab />}
            </Suspense>
          </div>
        </main>

        {showForecast && (
          <>
            <div className="hidden xl:block">
              <RightPanel
                showChecklist={currentTab !== "home"}
                team={currentTeam}
                gameState={gameState}
                universeId={universe.id}
                onNotify={showNotification}
                onNavigate={setActiveTab}
                decisionRevision={decisionDashboard.revision}
              />
            </div>
            {forecastOpen && (
              <div className="xl:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Cash forecast and checklist">
                <div className="absolute inset-0 bg-black/40" onClick={() => setForecastOpen(false)} />
                <div className="absolute inset-y-0 right-0 w-[300px] max-w-[90vw] bg-[#FAF8F5] shadow-xl flex flex-col">
                  <div className="h-12 px-4 flex items-center justify-between border-b border-[#E5E1D8] bg-white">
                    <span className="text-sm font-semibold">Cash forecast</span>
                    <button onClick={() => setForecastOpen(false)} className="p-1.5 rounded-lg hover:bg-[#F3F0EA]" aria-label="Close">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <RightPanel
                    fill
                    team={currentTeam}
                    gameState={gameState}
                    universeId={universe.id}
                    onNotify={showNotification}
                    onNavigate={(tab) => {
                      setActiveTab(tab);
                      setForecastOpen(false);
                    }}
                    decisionRevision={decisionDashboard.revision}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {notification && (
        <div
          role={notificationTone === "error" ? "alert" : "status"}
          className={`fixed z-50 bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md px-4 py-3 rounded-xl shadow-lg border text-sm flex items-start gap-2.5 ${
            notificationTone === "error" ? "bg-red-50 border-red-200 text-red-900" : "bg-[#1F2022] border-[#1F2022] text-white"
          }`}
        >
          {notificationTone === "error" ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" /> : <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />}
          <span className="flex-1">{notification}</span>
          <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pre-Submission Decision Summary Sheet Modal */}
      <PreSubmissionSummaryModal
        isOpen={showPreSubmissionModal}
        onClose={() => setShowPreSubmissionModal(false)}
        onConfirmLock={() => finalizeLockToggle(false)}
        team={currentTeam}
        gameState={gameState}
      />

      {/* AI Board Advisor Modal */}
      {isAdvisorOpen && <Suspense fallback={null}><AIConsultantModal
        isOpen={isAdvisorOpen}
        onClose={() => setIsAdvisorOpen(false)}
        universeId={universe.id}
        team={currentTeam}
        gameState={gameState}
      /></Suspense>}

      {/* Change Password Modal */}
      {currentUser && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          required={passwordChangeRequired}
          currentUser={currentUser}
          onClose={() => setIsChangePasswordOpen(false)}
          onSuccess={() => setPasswordChangeRequired(false)}
          onNotify={showNotification}
        />
      )}

      {/* First-time Player Onboarding Modal */}
      {currentUser && currentUser.role === "player" && (
        <OnboardingModal
          isOpen={showOnboarding && !isChangePasswordOpen}
          user={currentUser}
          team={currentTeam}
          gameState={gameState}
          onComplete={() => {
            markOnboardingComplete(currentUser.id);
            setShowOnboarding(false);
          }}
        />
      )}

    </div>
  );
}
