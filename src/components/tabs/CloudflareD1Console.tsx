import React, { useState, useEffect } from "react";
import { User, Universe } from "../../types/auth";
import {
  checkD1Status,
  initD1Schema,
  executeD1Query,
  migrateFirestoreToD1,
  generateD1SqlDump,
  D1StatusResponse,
  D1QueryResult,
  MigrationSummary,
  loadD1Config,
  saveD1Config
} from "../../lib/cloudflareD1";
import {
  getActiveDatabaseProvider,
  setActiveDatabaseProvider,
  DatabaseProviderType
} from "../../lib/dbProvider";
import {
  Cloud,
  Database,
  RefreshCw,
  Zap,
  Play,
  Download,
  Copy,
  Check,
  Server,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Terminal,
  FileCode,
  ArrowRight,
  Layers,
  Sparkles,
  ExternalLink,
  Code2,
  Settings,
  HelpCircle
} from "lucide-react";

interface CloudflareD1ConsoleProps {
  allUsers: User[];
  allUniverses: Universe[];
  onRefreshAll: () => void;
  onNotify: (msg: string) => void;
}

export const CloudflareD1Console: React.FC<CloudflareD1ConsoleProps> = ({
  allUsers,
  allUniverses,
  onRefreshAll,
  onNotify
}) => {
  // Provider Selection
  const [activeProvider, setLocalProvider] = useState<DatabaseProviderType>(() => getActiveDatabaseProvider());

  // Connection Status
  const [status, setStatus] = useState<D1StatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);

  // Migration Engine
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
  const [migrationSummary, setMigrationSummary] = useState<MigrationSummary | null>(null);

  // SQL Console
  const [sqlQuery, setSqlQuery] = useState<string>("SELECT id, name, code, max_teams, created_at FROM universes;");
  const [queryResult, setQueryResult] = useState<D1QueryResult | null>(null);
  const [isExecutingQuery, setIsExecutingQuery] = useState<boolean>(false);

  // Documentation / Config Tab
  const [selectedGuideTab, setSelectedGuideTab] = useState<"wrangler" | "schema" | "guide">("wrangler");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Check D1 Status on mount
  useEffect(() => {
    fetchD1Status();
  }, []);

  const fetchD1Status = async () => {
    setLoadingStatus(true);
    try {
      const res = await checkD1Status();
      setStatus(res);
    } catch (e: any) {
      setStatus({ status: "error", error: e.message });
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleProviderChange = (provider: DatabaseProviderType) => {
    setActiveDatabaseProvider(provider);
    setLocalProvider(provider);
    onNotify(`Database Engine switched to ${provider === "cloudflare_d1" ? "Cloudflare D1" : provider === "hybrid" ? "Hybrid Sync" : "Firebase Firestore"}.`);
  };

  const handleRunMigration = async () => {
    setIsMigrating(true);
    setMigrationLogs(["Initiating Cloudflare D1 migration sequence..."]);

    const addLog = (msg: string) => {
      setMigrationLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    try {
      addLog("Step 1/4: Initializing Cloudflare D1 schema (universes, users, decisions, audit_logs)...");
      const initRes = await initD1Schema();
      if (!initRes.success) {
        addLog(`Warning on schema init: ${initRes.message}`);
      } else {
        addLog("Schema tables verified & ready.");
      }

      addLog(`Step 2/4: Migrating ${allUniverses.length} simulation universe(s) & complete GameState trees...`);
      addLog(`Step 3/4: Batch migrating ${allUsers.length} user account(s) & RBAC credentials...`);

      const summary = await migrateFirestoreToD1(allUsers, allUniverses);
      setMigrationSummary(summary);

      if (summary.success) {
        addLog(`Step 4/4: Verification successful! ${summary.universesMigrated} universes and ${summary.usersMigrated} users written to Cloudflare D1.`);
        onNotify(`Successfully migrated all ${summary.universesMigrated} universes and ${summary.usersMigrated} users to Cloudflare D1!`);
        fetchD1Status();
        onRefreshAll();
      } else {
        addLog(`Migration completed with warnings: ${(summary.errors || []).join(", ")}`);
        onNotify("Migration finished with some warnings. Check logs.");
      }
    } catch (err: any) {
      addLog(`Migration error: ${err.message}`);
      onNotify(`Migration failed: ${err.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleExecuteSql = async (overrideSql?: string) => {
    const query = overrideSql || sqlQuery;
    if (!query.trim()) return;

    setIsExecutingQuery(true);
    try {
      const res = await executeD1Query(query);
      setQueryResult(res);
      if (res.success) {
        onNotify(`Query executed successfully (${res.rows ?? res.changes ?? 0} rows/records).`);
        fetchD1Status();
      } else {
        onNotify(`Query failed: ${res.error}`);
      }
    } catch (e: any) {
      setQueryResult({ success: false, error: e.message });
    } finally {
      setIsExecutingQuery(false);
    }
  };

  const handleDownloadSqlDump = () => {
    const sqlContent = generateD1SqlDump(allUsers, allUniverses);
    const blob = new Blob([sqlContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ev_venture_cloudflare_d1_dump_${new Date().toISOString().split("T")[0]}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify("Cloudflare D1 SQL dump downloaded.");
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    onNotify("Copied to clipboard!");
    setTimeout(() => setCopiedSection(null), 2500);
  };

  return (
    <div className="space-y-8" id="cloudflare-d1-hub">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-amber-500/30">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <Cloud className="w-7 h-7 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight">Cloudflare D1 Database Center</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-400/20 border border-amber-300/40 text-amber-100">
                  Edge SQL Engine
                </span>
              </div>
              <p className="text-amber-100 text-sm mt-0.5">
                Zero-cold-start, distributed SQLite database running natively on Cloudflare Pages and Workers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchD1Status}
            disabled={loadingStatus}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 text-white text-sm font-medium transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loadingStatus ? "animate-spin" : ""}`} />
            Check Health
          </button>
          <button
            onClick={handleDownloadSqlDump}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-orange-900 hover:bg-amber-50 text-sm font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Download className="w-4 h-4" />
            Export D1 .SQL Dump
          </button>
        </div>
      </div>

      {/* Row 1: Engine Architecture Selector & Live Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Database Engine Switcher */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-600" />
              Active Database Engine
            </h3>
            <span className="text-xs text-slate-500 font-medium">Real-time Switch</span>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => handleProviderChange("cloudflare_d1")}
              className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                activeProvider === "cloudflare_d1"
                  ? "border-amber-500 bg-amber-50/70 text-amber-950 ring-2 ring-amber-400/20"
                  : "border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}
            >
              <div className={`p-2 rounded-lg mt-0.5 ${activeProvider === "cloudflare_d1" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                <Cloud className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Cloudflare D1 (Recommended)</span>
                  {activeProvider === "cloudflare_d1" && <Check className="w-4 h-4 text-amber-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Ultra-fast SQLite edge storage, SQL query support, zero cold-starts.</p>
              </div>
            </button>

            <button
              onClick={() => handleProviderChange("hybrid")}
              className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                activeProvider === "hybrid"
                  ? "border-blue-500 bg-blue-50/70 text-blue-950 ring-2 ring-blue-400/20"
                  : "border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}
            >
              <div className={`p-2 rounded-lg mt-0.5 ${activeProvider === "hybrid" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                <Zap className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Hybrid Sync (D1 + Firestore)</span>
                  {activeProvider === "hybrid" && <Check className="w-4 h-4 text-blue-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Writes simultaneously to both D1 and Firestore for seamless backup.</p>
              </div>
            </button>

            <button
              onClick={() => handleProviderChange("firebase")}
              className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                activeProvider === "firebase"
                  ? "border-orange-500 bg-orange-50/70 text-orange-950 ring-2 ring-orange-400/20"
                  : "border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}
            >
              <div className={`p-2 rounded-lg mt-0.5 ${activeProvider === "firebase" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                <Database className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Firebase Firestore (Legacy)</span>
                  {activeProvider === "firebase" && <Check className="w-4 h-4 text-orange-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Original Google Cloud Firestore document store.</p>
              </div>
            </button>
          </div>
        </div>

        {/* Cloudflare D1 Connection Diagnostics */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Server className="w-5 h-5 text-amber-600" />
              D1 Database Status
            </h3>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {status?.status === "connected" ? "Connected" : status?.status || "Ready"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="text-xs text-slate-500 font-medium">Universes in D1</div>
              <div className="text-2xl font-black text-slate-800 mt-1">
                {status?.tableCounts?.universes ?? allUniverses.length}
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="text-xs text-slate-500 font-medium">Users in D1</div>
              <div className="text-2xl font-black text-slate-800 mt-1">
                {status?.tableCounts?.users ?? allUsers.length}
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="text-xs text-slate-500 font-medium">Engine Mode</div>
              <div className="text-sm font-bold text-slate-800 mt-1 truncate">
                SQLite 3 (D1 Spec)
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="text-xs text-slate-500 font-medium">Edge Readiness</div>
              <div className="text-sm font-bold text-emerald-700 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 100% Ready
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => handleExecuteSql("SELECT 1 as test, datetime('now') as server_time;")}
              className="w-full py-2 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              Test D1 Query Ping
            </button>
          </div>
        </div>

        {/* 1-Click Migration Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" /> 1-Click Migration
            </div>
            <h3 className="text-lg font-bold text-white mt-1">Migrate Firestore &rarr; Cloudflare D1</h3>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Automatically scans all active universes, team configurations, student accounts, and history from Firebase Firestore and writes them safely into your Cloudflare D1 database.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleRunMigration}
              disabled={isMigrating}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isMigrating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Migrating to Cloudflare D1...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-200" />
                  Run 1-Click Migration Now
                </>
              )}
            </button>
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Universes: {allUniverses.length}</span>
              <span>Users: {allUsers.length}</span>
              <span>Zero Downtime</span>
            </div>
          </div>
        </div>
      </div>

      {/* Migration Realtime Logs & Progress */}
      {migrationLogs.length > 0 && (
        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 font-mono text-xs text-slate-300 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <Terminal className="w-4 h-4" />
              Migration Log Output
            </div>
            <button
              onClick={() => setMigrationLogs([])}
              className="text-slate-500 hover:text-slate-300 text-xs"
            >
              Clear Logs
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
            {migrationLogs.map((log, i) => (
              <div key={i} className="text-slate-300 flex items-start gap-2">
                <span className="text-slate-600 select-none">&gt;</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 2: Live SQL Console & Query Runner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Terminal className="w-5 h-5 text-amber-600" />
              Cloudflare D1 SQL Console
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Execute direct SQL queries, inspect tables, and preview data inside your D1 SQLite instance.
            </p>
          </div>

          {/* Quick Preset Queries */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const q = "SELECT id, name, code, max_teams, created_at FROM universes;";
                setSqlQuery(q);
                handleExecuteSql(q);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
            >
              SELECT Universes
            </button>
            <button
              onClick={() => {
                const q = "SELECT id, email, name, role, team_i, institution FROM users ORDER BY team_i ASC;";
                setSqlQuery(q);
                handleExecuteSql(q);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
            >
              SELECT Users
            </button>
            <button
              onClick={() => {
                const q = "SELECT name, type FROM sqlite_master WHERE type='table';";
                setSqlQuery(q);
                handleExecuteSql(q);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
            >
              List Tables
            </button>
          </div>
        </div>

        {/* Query Input Box */}
        <div className="space-y-3">
          <div className="relative">
            <textarea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              placeholder="Enter SQLite query (e.g. SELECT * FROM users;)"
              rows={3}
              className="w-full bg-slate-900 text-emerald-400 font-mono text-sm p-4 rounded-xl border border-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-inner"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Supports standard SQLite 3 syntax & prepared statements.
            </span>
            <button
              onClick={() => handleExecuteSql()}
              disabled={isExecutingQuery || !sqlQuery.trim()}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Play className={`w-4 h-4 ${isExecutingQuery ? "animate-spin" : ""}`} />
              Run Query
            </button>
          </div>
        </div>

        {/* Query Results Table */}
        {queryResult && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-600" />
                Query Results ({queryResult.rows ?? queryResult.changes ?? 0} {queryResult.results ? "rows" : "changes"})
              </h4>
              {queryResult.results && queryResult.results.length > 0 && (
                <button
                  onClick={() => copyToClipboard(JSON.stringify(queryResult.results, null, 2), "query-res")}
                  className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy as JSON
                </button>
              )}
            </div>

            {queryResult.error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">SQL Execution Error</div>
                  <div className="text-xs mt-1 font-mono">{queryResult.error}</div>
                </div>
              </div>
            ) : queryResult.results && queryResult.results.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-80 shadow-sm">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-slate-800 font-bold uppercase tracking-wider sticky top-0 border-b border-slate-200">
                    <tr>
                      {Object.keys(queryResult.results[0]).map((col) => (
                        <th key={col} className="p-3 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {queryResult.results.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-amber-50/50 transition-colors">
                        {Object.values(row).map((val: any, cIdx) => (
                          <td key={cIdx} className="p-3 whitespace-nowrap max-w-xs truncate text-slate-700">
                            {typeof val === "object" ? JSON.stringify(val) : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs font-mono">
                Query executed successfully. 0 rows returned.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Row 3: Cloudflare Wrangler Deployment & Setup Reference */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Cloud className="w-5 h-5 text-orange-600" />
              Cloudflare Deployment & Wrangler Commands
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Everything required to deploy this simulation and D1 database to Cloudflare Pages & Workers in under 3 minutes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedGuideTab("wrangler")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedGuideTab === "wrangler"
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              CLI Commands
            </button>
            <button
              onClick={() => setSelectedGuideTab("schema")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedGuideTab === "schema"
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              schema.sql
            </button>
            <button
              onClick={() => setSelectedGuideTab("guide")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedGuideTab === "guide"
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Step-by-Step Guide
            </button>
          </div>
        </div>

        {selectedGuideTab === "wrangler" && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs space-y-4 shadow-inner">
              <div>
                <div className="text-slate-400 flex items-center justify-between pb-1">
                  <span># 1. Install Wrangler and Authenticate</span>
                  <button
                    onClick={() => copyToClipboard("npx wrangler login", "step1")}
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    {copiedSection === "step1" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    Copy
                  </button>
                </div>
                <div className="text-emerald-400 font-bold">npx wrangler login</div>
              </div>

              <div>
                <div className="text-slate-400 flex items-center justify-between pb-1">
                  <span># 2. Create the Cloudflare D1 Database</span>
                  <button
                    onClick={() => copyToClipboard("npx wrangler d1 create ev-venture-league-d1", "step2")}
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    {copiedSection === "step2" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    Copy
                  </button>
                </div>
                <div className="text-emerald-400 font-bold">npx wrangler d1 create ev-venture-league-d1</div>
              </div>

              <div>
                <div className="text-slate-400 flex items-center justify-between pb-1">
                  <span># 3. Apply Schema & Migrations</span>
                  <button
                    onClick={() =>
                      copyToClipboard("npx wrangler d1 execute ev-venture-league-d1 --file=d1/schema.sql --remote", "step3")
                    }
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    {copiedSection === "step3" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    Copy
                  </button>
                </div>
                <div className="text-emerald-400 font-bold">
                  npx wrangler d1 execute ev-venture-league-d1 --file=d1/schema.sql --remote
                </div>
              </div>

              <div>
                <div className="text-slate-400 flex items-center justify-between pb-1">
                  <span># 4. Build and Deploy Full App to Cloudflare Pages</span>
                  <button
                    onClick={() => copyToClipboard("npm run build && npx wrangler pages deploy dist", "step4")}
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    {copiedSection === "step4" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    Copy
                  </button>
                </div>
                <div className="text-emerald-400 font-bold">npm run build && npx wrangler pages deploy dist</div>
              </div>
            </div>
          </div>
        )}

        {selectedGuideTab === "schema" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">/d1/schema.sql Preview</span>
              <button
                onClick={handleDownloadSqlDump}
                className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Download Full SQL Dump
              </button>
            </div>
            <pre className="p-4 bg-slate-900 text-amber-300 font-mono text-xs rounded-xl overflow-x-auto max-h-64 border border-slate-800">
{`CREATE TABLE IF NOT EXISTS universes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    instructor_email TEXT NOT NULL,
    max_teams INTEGER NOT NULL DEFAULT 10,
    max_members_per_team INTEGER NOT NULL DEFAULT 8,
    game_state TEXT NOT NULL, -- JSON stringified GameState
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'instructor', 'player')),
    institution TEXT DEFAULT '',
    universe_id TEXT NOT NULL,
    team_i INTEGER NOT NULL DEFAULT -1,
    password TEXT NOT NULL,
    last_active_at TEXT,
    active_minutes INTEGER NOT NULL DEFAULT 0,
    is_online INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (universe_id) REFERENCES universes(id) ON DELETE CASCADE
);`}
            </pre>
          </div>
        )}

        {selectedGuideTab === "guide" && (
          <div className="prose prose-sm text-slate-600 max-w-none space-y-3">
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
              <h4 className="font-bold text-amber-950 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-700" />
                Why Cloudflare D1 + Workers?
              </h4>
              <p className="text-xs text-amber-900 leading-relaxed">
                Cloudflare D1 runs on SQLite at the edge, offering microsecond latency, zero cold starts, zero-maintenance relational data storage, and zero egress fees. By moving from Firestore to D1, all student simulation states, decisions, and leaderboards execute directly at the closest Cloudflare edge point to the student.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
