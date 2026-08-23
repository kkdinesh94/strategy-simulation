import React, { useState, useEffect, useReducer } from "react";
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
import { newState, auditTeam, simulateQuarter } from "./engine/simulationEngine";
import { LoginPage } from "./components/LoginPage";
import { ExecutiveHeader } from "./components/ExecutiveHeader";
import { Navbar, TabKey } from "./components/Navbar";
import { UniverseRosterManager } from "./components/UniverseRosterManager";
import { CharterTab } from "./components/tabs/CharterTab";
import { ProductDesignTab } from "./components/tabs/ProductDesignTab";
import { RnDTab } from "./components/tabs/RnDTab";
import { MarketingTab } from "./components/tabs/MarketingTab";
import { SalesDistributionTab } from "./components/tabs/SalesDistributionTab";
import HRDashboard from "./components/HRDashboard";
import { OperationsTab } from "./components/tabs/OperationsTab";
import { FinanceTab } from "./components/tabs/FinanceTab";
import { PerformanceTab } from "./components/tabs/PerformanceTab";
import { InstructorConsoleTab } from "./components/tabs/InstructorConsoleTab";
import { AdminDatabaseTab } from "./components/tabs/AdminDatabaseTab";
import { HelpManualTab } from "./components/tabs/HelpManualTab";
import { AIConsultantModal } from "./components/AIConsultantModal";
import { PreSubmissionSummaryModal } from "./components/PreSubmissionSummaryModal";
import { ChangePasswordModal } from "./components/ChangePasswordModal";
import QuarterChecklist from "./components/QuarterChecklist";
import StrategyWizard, { StrategySummary } from "./components/StrategyWizard";
import { CheckCircle, AlertTriangle } from "lucide-react";
import PolicyEvents from "./components/PolicyEvents";
import ChargingStrategy from "./components/ChargingStrategy";
import BatteryLifecycle from "./components/BatteryLifecycle";
import { ProFormaPanel } from "./components/tabs/ProFormaPanel";

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

  const [activeTab, setActiveTab] = useState<TabKey>("charter");
  const [isInstructorMode, setIsInstructorMode] = useState<boolean>(false);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState<boolean>(false);
  const [showPreSubmissionModal, setShowPreSubmissionModal] = useState<boolean>(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [auditErrors, setAuditErrors] = useState<string[]>([]);
  const [decisionDashboard, dispatchDecisionDashboard] = useReducer(decisionDashboardReducer, {
    revision: 0,
    lastChangedAt: Date.now()
  });
  const policyAlertQuarter = React.useRef<number | null>(null);

  useEffect(() => {
    if (!universe?.id || policyAlertQuarter.current === gameState.quarter) return;
    fetch(`/api/policy-events?quarter=${encodeURIComponent(gameState.quarter)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        const events = Array.isArray(payload?.events) ? payload.events : [];
        if (events.length) showNotification(`Policy Alert: ${events.map((event: any) => event.event_type).join(", ")} active in Q${gameState.quarter}.`);
        policyAlertQuarter.current = gameState.quarter;
      })
      .catch(() => { policyAlertQuarter.current = gameState.quarter; });
  }, [universe?.id, gameState.quarter]);

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

  // Initial cloud fetch on mount
  useEffect(() => {
    refreshAllData();
  }, []);

  // Update GameState when Universe changes
  useEffect(() => {
    if (universe && universe.gameState) {
      setGameState(universe.gameState);
    }
  }, [universe]);


  // Ensure team index is valid
  const currentTeam = gameState.teams[activeTeamIdx] || gameState.teams[0] || {
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
    cash: 1900,
    paidIn: 2500,
    rep: 0.5,
    cumProfit: 0,
    aw: {},
    base: {},
    models: [],
    capacity: 2500,
    ppe: 600,
    hr: { sales: 100, plant: 100 },
    centres: 4,
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

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

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

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.role === "player") {
      setActiveTeamIdx(user.teamI);
      setIsInstructorMode(false);
    } else {
      setIsInstructorMode(true);
    }

    const accessible = getAccessibleUniverses(user, allUniverses.length > 0 ? allUniverses : [universe]);
    let targetUniv = accessible.find((u) => u.id === user.universeId);
    if (!targetUniv) {
      targetUniv = accessible[0] || loadActiveUniverse();
    }

    setUniverse(targetUniv);
    setGameState(targetUniv.gameState);
    dispatchDecisionDashboard({ type: "RESET" });
    saveActiveUniverse(targetUniv);
  };

  const handleLogout = () => {
    if (currentUser) {
      const offlineUser: User = {
        ...currentUser,
        isOnline: false,
        lastActiveAt: new Date().toISOString()
      };
      saveUserUnified(offlineUser).catch(() => {});
    }
    saveCurrentUser(null);
    setCurrentUser(null);
  };

  const handleUpdateGameState = (newGs: GameState) => {
    setGameState(newGs);
    const updatedUniv: Universe = {
      ...universe,
      gameState: newGs
    };
    setUniverse(updatedUniv);
    saveActiveUniverse(updatedUniv);
  };

  const handleUpdateCurrentTeam = (updatedTeam: TeamState) => {
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
        body: JSON.stringify({ teamId: updatedTeam.i, quarter: gameState.quarter, changes })
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
      if (fee <= 120 && buyer.cash > fee + 200) {
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
    if (confirm("Reset simulation to Quarter 1 initial state for this universe?")) {
      const resetState = newState(
        gameState.teams.map((t) => ({ name: t.name, arch: t.arch, isBot: t.isBot })),
        12,
        25000,
        5
      );
      handleUpdateGameState(resetState);
      setActiveTeamIdx(currentUser?.role === "player" ? currentUser.teamI : 0);
      setActiveTab("charter");
      setAuditErrors([]);
      showNotification("Simulation reset to Quarter 1.");
    }
  };

  const handleUpdateDeadline = async (deadlineISO: string | null) => {
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

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1F2022] flex flex-col font-sans">
      {/* Executive Header Ticker */}
      <ExecutiveHeader
        team={currentTeam}
        gameState={gameState}
        currentUser={currentUser}
        universe={universe}
        allUniverses={allUniverses}
        activeTeamIdx={activeTeamIdx}
        onSelectTeam={setActiveTeamIdx}
        onSelectUniverse={handleSelectUniverse}
        onLockToggle={handleLockToggle}
        onOpenAdvisor={() => setIsAdvisorOpen(true)}
        onLogout={handleLogout}
        onOpenRoster={() => setActiveTab("roster")}
        onUpdateDeadline={handleUpdateDeadline}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
      />

      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onResetGame={handleResetGame}
        isInstructorMode={isInstructorMode}
        onToggleInstructorMode={() => {
          setIsInstructorMode(!isInstructorMode);
          if (!isInstructorMode) setActiveTab("instructor");
        }}
        canManageRoster={currentUser.role === "instructor" || currentUser.role === "admin"}
        isAdmin={currentUser.role === "admin"}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-start">
          <QuarterChecklist
            universeId={universe.id}
            teamId={currentTeam.i}
            quarter={gameState.quarter}
            onNavigate={setActiveTab}
          />
          <div className="min-w-0 flex-1 space-y-6">
        {/* Toast Notification */}
        {notification && (
          <div className="p-3 bg-[#1F2022] text-white rounded-xl shadow-lg border border-slate-700 flex items-center justify-between text-xs font-semibold animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>{notification}</span>
            </div>
          </div>
        )}

        {/* Auditor Validation Errors Box */}
        {auditErrors.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
            <div className="font-bold text-sm text-red-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Auditor Decision Check Failed:
            </div>
            <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
              {auditErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tab Switcher Body */}
        <StrategySummary
          universeId={universe.id}
          teamId={currentTeam.i}
          quarter={gameState.quarter}
          onOpen={() => setActiveTab("strategy")}
        />

        {activeTab === "strategy" && (
          <StrategyWizard
            universeId={universe.id}
            teamId={currentTeam.i}
            quarter={gameState.quarter}
            teamName={currentTeam.name}
            onNotify={showNotification}
          />
        )}

        {activeTab === "charter" && (
          <CharterTab
            team={currentTeam}
            gameState={gameState}
            currentUser={currentUser}
            allUsers={allUsers}
            universe={universe}
            onChange={handleUpdateCurrentTeam}
            onNotify={showNotification}
          />
        )}

        {activeTab === "product" && (
          <ProductDesignTab
            team={currentTeam}
            onChange={handleUpdateCurrentTeam}
            onNotify={showNotification}
          />
        )}

        {activeTab === "rnd" && (
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

        {activeTab === "marketing" && (
          <MarketingTab
            team={currentTeam}
            gameState={gameState}
            onChange={handleUpdateCurrentTeam}
            onNotify={showNotification}
          />
        )}

        {activeTab === "sales" && (
          <SalesDistributionTab
            team={currentTeam}
            gameState={gameState}
            onChange={handleUpdateCurrentTeam}
            universeId={universe.id}
            onNotify={showNotification}
          />
        )}

        {activeTab === "hr" && (
          <HRDashboard
            team={currentTeam}
            gameState={gameState}
            universeId={universe.id}
            onChange={handleUpdateCurrentTeam}
            onNotify={showNotification}
          />
        )}

        {activeTab === "operations" && (
          <OperationsTab
            team={currentTeam}
            gameState={gameState}
            onChange={handleUpdateCurrentTeam}
          />
        )}

        {activeTab === "finance" && (
          <FinanceTab
            team={currentTeam}
            gameState={gameState}
            onChange={handleUpdateCurrentTeam}
            onNotify={showNotification}
            universeId={universe.id}
          />
        )}

        {activeTab === "charging" && (
          <ChargingStrategy teamId={currentTeam.i} quarter={gameState.quarter} onNotify={showNotification} />
        )}

        {activeTab === "battery" && (
          <BatteryLifecycle universeId={universe.id} teamId={currentTeam.i} quarter={gameState.quarter} onNotify={showNotification} />
        )}

        {activeTab === "performance" && (
          <PerformanceTab team={currentTeam} gameState={gameState} universeId={universe.id} onNotify={showNotification} functionalRole={Object.entries(currentTeam.roles || {}).find(([, memberName]) => memberName === currentUser?.name)?.[0] || "President"} />
        )}

        {activeTab === "policy" && (
          <PolicyEvents universeId={universe.id} quarter={gameState.quarter} onNotify={showNotification} />
        )}

        {activeTab === "roster" && (
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

        {activeTab === "instructor" && (
          <InstructorConsoleTab
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
          />
        )}

        {activeTab === "admin_db" && currentUser.role === "admin" && (
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

        {activeTab === "help" && <HelpManualTab />}
          </div>
          <aside className="w-full shrink-0 lg:sticky lg:top-4 lg:w-[23rem]">
            <ProFormaPanel
              team={currentTeam}
              gameState={gameState}
              universeId={universe.id}
              onNotify={showNotification}
              compact
              decisionRevision={decisionDashboard.revision}
            />
          </aside>
        </div>
      </main>

      {/* Pre-Submission Decision Summary Sheet Modal */}
      <PreSubmissionSummaryModal
        isOpen={showPreSubmissionModal}
        onClose={() => setShowPreSubmissionModal(false)}
        onConfirmLock={() => finalizeLockToggle(false)}
        team={currentTeam}
        gameState={gameState}
      />

      {/* AI Board Advisor Modal */}
      <AIConsultantModal
        isOpen={isAdvisorOpen}
        onClose={() => setIsAdvisorOpen(false)}
        team={currentTeam}
        gameState={gameState}
      />

      {/* Change Password Modal */}
      {currentUser && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          currentUser={currentUser}
          onClose={() => setIsChangePasswordOpen(false)}
          onSuccess={(updated) => {
            setCurrentUser(updated);
            setAllUsers(loadUsers());
          }}
          onNotify={showNotification}
        />
      )}

      {/* Footer */}
      <footer className="bg-[#F3F0EA] border-t border-[#E5E1D8] text-[#7A7C80] text-xs py-4 px-6 text-center font-mono">
        Strategic Executive Business Simulation Package • NIT Warangal
      </footer>
    </div>
  );
}
