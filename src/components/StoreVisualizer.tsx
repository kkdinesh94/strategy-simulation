import React from "react";
import { TeamState, GameState } from "../types/simulation";
import { reachOf, hrMults, marketBonusOf } from "../engine/simulationEngine";
import { MARKETS } from "../engine/catalog";
import { Store, MapPin, Users, Globe, Smartphone, ShoppingBag, CheckCircle2, ArrowUpRight } from "lucide-react";

interface StoreVisualizerProps {
  team: TeamState;
  gameState: GameState;
}

export const StoreVisualizer: React.FC<StoreVisualizerProps> = ({ team, gameState }) => {
  const newCentres = team.dec.newCentres || 0;
  const totalCentres = team.centres + newCentres;
  const isWebStoreActive = !!team.dec.webStore;
  const hrM = hrMults(gameState, team);
  const marketBonus = marketBonusOf(gameState, team);
  let netReach = reachOf({ centres: totalCentres, staff: team.staff + (team.dec.hire || 0) }, hrM.sales, marketBonus);
  if (isWebStoreActive) {
    netReach = Math.min(0.98, netReach + 0.12);
  }

  // Real owned/opening markets, drawn from this team's actual store decisions
  const ownedCities = team.storeCities || [];
  const pendingCities = team.dec.newCentreCities || [];
  const regionHubs = MARKETS.filter((m) => ownedCities.includes(m.id) || pendingCities.includes(m.id)).map((m) => ({
    name: m.city,
    city: m.region,
    code: m.id.toUpperCase(),
    active: ownedCities.includes(m.id),
    isNew: pendingCities.includes(m.id),
  }));

  return (
    <div className="bg-[#FAF8F5] border border-[#E5E1D8] rounded-2xl p-5 shadow-2xs space-y-5 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E1D8] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-100 text-indigo-900 border border-indigo-200">
            <Store className="w-5 h-5 text-indigo-800" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[#1F2022]">Retail Network & Showroom Floorplan Visualizer</h3>
            <p className="text-xs text-[#5A5C60]">Experience Center coverage map & D2C digital web storefront</p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="px-3 py-1.5 bg-white border border-[#E0DCD3] rounded-xl font-bold text-indigo-700 shadow-2xs">
            Operational Outlets: {totalCentres} Centers
          </div>
          <div className="px-3 py-1.5 bg-white border border-[#E0DCD3] rounded-xl font-bold text-emerald-700 shadow-2xs">
            Market Reach: {(netReach * 100).toFixed(0)}% Coverage
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Indian & Global Territory Map Network Node Visualizer */}
        <div className="bg-white p-4 rounded-xl border border-[#E0DCD3] space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-[#1F2022] flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-indigo-600" /> Geographic Territory Network Map
            </div>
            <span className="text-[10px] font-mono text-[#8A8C90]">{ownedCities.length} Active · {pendingCities.length} Opening</span>
          </div>

          {/* Map Node Diagram */}
          <div className="relative w-full bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg p-4 space-y-3 overflow-hidden">
            {regionHubs.length === 0 ? (
              <p className="text-xs text-[#5A5C60]">No stores opened yet. Pick markets in the panel below.</p>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {regionHubs.map((hub, idx) => (
                <div
                  key={hub.code}
                  className={`p-3 rounded-xl border flex items-center justify-between transition ${
                    hub.active
                      ? "bg-indigo-50/80 border-indigo-300 text-indigo-950 font-semibold"
                      : "bg-white border-[#E0DCD3] text-[#8A8C90]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                        hub.active ? "bg-indigo-600 text-white shadow-xs" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {hub.code}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1F2022]">{hub.name}</div>
                      <div className="text-[10px] text-[#5A5C60]">{hub.city}</div>
                    </div>
                  </div>

                  <div>
                    {hub.active ? (
                      <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-100 text-amber-800 border border-amber-300 rounded-full">
                        Opening
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>

        {/* 2. Experience Center Floorplan & D2C Kiosk Diagram */}
        <div className="bg-white p-4 rounded-xl border border-[#E0DCD3] space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-[#1F2022] flex items-center gap-1.5">
              <Store className="w-4 h-4 text-emerald-600" /> Showroom Layout & D2C Direct Web Kiosk
            </div>
            <span className="text-[10px] font-mono text-[#8A8C90]">Flagship Experience Store</span>
          </div>

          {/* SVG 2D Showroom Architectural Floorplan */}
          <div className="relative w-full bg-[#FAF8F5] border border-[#E0DCD3] rounded-lg p-3 flex flex-col items-center justify-center overflow-hidden">
            <svg viewBox="0 0 340 180" className="w-full h-auto drop-shadow-xs">
              <defs>
                <linearGradient id="floorplanPodiumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FBF9F5" />
                  <stop offset="100%" stopColor="#EDE4D8" />
                </linearGradient>
                <linearGradient id="floorplanChargeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F0FDF9" />
                  <stop offset="100%" stopColor="#D1FAE5" />
                </linearGradient>
                <linearGradient id="floorplanKioskGradActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EEF2FF" />
                  <stop offset="100%" stopColor="#DDE1FB" />
                </linearGradient>
                <linearGradient id="floorplanKioskGradInactive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F9FAFB" />
                  <stop offset="100%" stopColor="#E5E7EB" />
                </linearGradient>
                <linearGradient id="floorplanLoungeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FCFDFE" />
                  <stop offset="100%" stopColor="#EEF2F6" />
                </linearGradient>
                <pattern id="floorplanHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#DBD6C9" strokeWidth="1" opacity="0.5" />
                </pattern>
              </defs>

              {/* Outer Showroom Walls */}
              <rect x="10" y="10" width="320" height="160" rx="12" fill="#FFFFFF" stroke="#1F2022" strokeWidth="2" />
              {/* Floor texture */}
              <rect x="12" y="12" width="316" height="156" rx="10" fill="url(#floorplanHatch)" />

              {/* Glass Entrance */}
              <line x1="120" y1="170" x2="220" y2="170" stroke="#0284C7" strokeWidth="4" strokeLinecap="round" />
              <text x="170" y="165" textAnchor="middle" fill="#0284C7" fontSize="8" fontFamily="monospace" fontWeight="bold">
                GLASS ENTRANCE
              </text>

              {/* Display Podium 1 (Primary Model) */}
              <rect x="34" y="34" width="110" height="70" rx="8" fill="#1F2022" opacity="0.07" />
              <rect x="30" y="30" width="110" height="70" rx="8" fill="url(#floorplanPodiumGrad)" stroke="#C83E2B" strokeWidth="1.5" strokeDasharray="3 2" />
              <circle cx="85" cy="65" r="18" fill="#C83E2B" opacity="0.15" />
              <foreignObject x="35" y="35" width="14" height="14">
                <ShoppingBag className="w-3.5 h-3.5 text-[#C83E2B]" />
              </foreignObject>
              <text x="85" y="60" textAnchor="middle" fill="#1F2022" fontSize="9" fontWeight="bold">
                EV PODIUM
              </text>
              <text x="85" y="72" textAnchor="middle" fill="#C83E2B" fontSize="8" fontFamily="monospace">
                {team.models[0]?.name || "Scooter"}
              </text>

              {/* Fast Charging Station Bay */}
              <rect x="164" y="34" width="70" height="50" rx="6" fill="#1F2022" opacity="0.07" />
              <rect x="160" y="30" width="70" height="50" rx="6" fill="url(#floorplanChargeGrad)" stroke="#10B981" strokeWidth="1.5" />
              <foreignObject x="165" y="35" width="14" height="14">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-700" />
              </foreignObject>
              <text x="200" y="52" textAnchor="middle" fill="#047857" fontSize="8" fontFamily="monospace" fontWeight="bold">
                FAST CHARGE
              </text>
              <text x="195" y="64" textAnchor="middle" fill="#059669" fontSize="7">
                HyperCharger 150kW
              </text>

              {/* D2C Digital Web Kiosk */}
              <rect x="249" y="34" width="70" height="110" rx="6" fill="#1F2022" opacity="0.07" />
              <rect x="245" y="30" width="70" height="110" rx="6" fill={isWebStoreActive ? "url(#floorplanKioskGradActive)" : "url(#floorplanKioskGradInactive)"} stroke={isWebStoreActive ? "#6366F1" : "#9CA3AF"} strokeWidth="1.5" />
              <foreignObject x="250" y="35" width="14" height="14">
                <Smartphone className={`w-3.5 h-3.5 ${isWebStoreActive ? "text-indigo-700" : "text-gray-500"}`} />
              </foreignObject>
              <text x="280" y="55" textAnchor="middle" fill={isWebStoreActive ? "#4338CA" : "#6B7280"} fontSize="8" fontFamily="monospace" fontWeight="bold">
                D2C KIOSK
              </text>
              <text x="280" y="70" textAnchor="middle" fill={isWebStoreActive ? "#4F46E5" : "#9CA3AF"} fontSize="7">
                {isWebStoreActive ? "Online Store Active" : "Store Offline"}
              </text>
              {isWebStoreActive && (
                <circle cx="280" cy="95" r="10" fill="#6366F1" className="animate-ping" opacity="0.4" />
              )}

              {/* Customer Lounge & Sales Desk */}
              <rect x="34" y="114" width="200" height="40" rx="6" fill="#1F2022" opacity="0.05" />
              <rect x="30" y="110" width="200" height="40" rx="6" fill="url(#floorplanLoungeGrad)" stroke="#94A3B8" strokeWidth="1" />
              <foreignObject x="35" y="120" width="14" height="14">
                <Users className="w-3.5 h-3.5 text-slate-600" />
              </foreignObject>
              <text x="135" y="132" textAnchor="middle" fill="#334155" fontSize="8" fontFamily="monospace" fontWeight="bold">
                CUSTOMER LOUNGE & EXECUTIVE SALES DESK ({team.staff + (team.dec.hire || 0)} Staff)
              </text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
