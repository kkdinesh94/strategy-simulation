import React from "react";
import { TeamState, GameState } from "../../types/simulation";
import { CENTRE, HR, MARKETS, fmtRs } from "../../engine/catalog";
import { reachOf, hrMults, centreOpenCost, marketBonusOf } from "../../engine/simulationEngine";
import { Store, Users, MapPin, DollarSign, Award, ShoppingBag, CheckCircle, Smartphone } from "lucide-react";
import { StoreVisualizer } from "../StoreVisualizer";
import TerritoryMap from "../TerritoryMap";
import SalesForceManager from "../SalesForceManager";
import SalesPricingPanel from "../SalesPricingPanel";
import WebSalesCenter from "../WebSalesCenter";

interface SalesDistributionTabProps {
  team: TeamState;
  gameState: GameState;
  onChange: (updatedTeam: TeamState) => void;
}

export const SalesDistributionTab: React.FC<SalesDistributionTabProps> = ({
  team,
  gameState,
  onChange
}) => {
  const isLocked = team.dec.locked;

  const ownedCities = team.storeCities || [];
  const pendingCities = team.dec.newCentreCities || [];

  const handleToggleCity = (cityId: string) => {
    if (isLocked || ownedCities.includes(cityId)) return;
    const already = pendingCities.includes(cityId);
    const next = already
      ? pendingCities.filter((id) => id !== cityId)
      : pendingCities.length < 2
      ? [...pendingCities, cityId]
      : pendingCities;
    onChange({
      ...team,
      dec: {
        ...team.dec,
        newCentreCities: next,
        newCentres: next.length
      }
    });
  };

  const handleWebStoreToggle = (active: boolean) => {
    if (isLocked) return;
    onChange({
      ...team,
      dec: {
        ...team.dec,
        webStore: active
      }
    });
  };

  const handleHireChange = (val: number) => {
    if (isLocked) return;
    onChange({
      ...team,
      dec: {
        ...team.dec,
        hire: Math.max(-team.staff, Math.min(60, Math.round(val)))
      }
    });
  };

  const handleHRChange = (field: "sales" | "plant", val: number) => {
    if (isLocked) return;
    onChange({
      ...team,
      hr: {
        ...team.hr,
        [field]: Math.max(HR.min, Math.min(HR.max, Math.round(val)))
      }
    });
  };

  const totalCentres = team.centres + (team.dec.newCentres || 0);
  const totalStaff = team.staff + (team.dec.hire || 0);
  const maxStaffAllowed = 8 * totalCentres;

  const isWebStoreActive = !!team.dec.webStore;
  const hrM = hrMults(gameState, team);
  const marketBonus = marketBonusOf(gameState, team);
  let netReach = reachOf({ centres: totalCentres, staff: totalStaff }, hrM.sales, marketBonus);
  if (isWebStoreActive) {
    netReach = Math.min(0.98, netReach + 0.12); // Digital web store expands reach
  }

  const newCentreCost = centreOpenCost(pendingCities);
  const otherTeams = gameState.teams.filter((t) => t !== team);

  return (
    <div className="space-y-6 text-[#1F2022] font-sans">
      {gameState.quarter === 1 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
          <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong>Quarter 1 is a setup quarter.</strong> Pick the markets you're entering, size your sales staff, and lock in production capacity now.
            Store opex, payroll and capex still apply this quarter, but no revenue is generated yet — actual market entry and sales begin in Quarter 2.
          </div>
        </div>
      )}

      {/* Network Overview Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Store className="w-6 h-6 text-emerald-700" />
            <h2 className="text-xl font-bold text-[#1F2022]">
              Distribution, Retail Outlets & E-Commerce Channels
            </h2>
          </div>
          <p className="text-xs text-[#5A5C60]">
            Expand regional Experience Centers (Showrooms) and activate D2C E-Commerce storefronts to maximize retail coverage across Indian regional territories and export gateways.
          </p>
        </div>

        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
          <div className="text-[10px] font-mono font-bold uppercase text-emerald-800">
            Projected Service & Distribution Reach
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {(netReach * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Store & Outlet Visualizer */}
      <StoreVisualizer team={team} gameState={gameState} />

      <WebSalesCenter team={team} gameState={gameState} />

      <TerritoryMap team={team} gameState={gameState} />

      <SalesForceManager team={team} gameState={gameState} onChange={onChange} />

      <SalesPricingPanel team={team} />

      {/* Experience Centers & D2C E-Commerce */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Physical Experience Centers */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E5E1D8] pb-3">
            <MapPin className="w-5 h-5 text-emerald-700" />
            <h3 className="text-base font-bold text-[#1F2022]">
              Physical Experience Centers (Showrooms)
            </h3>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-[#E5E1D8]">
              <span className="text-[#5A5C60]">Currently Operational Centers:</span>
              <span className="font-bold text-[#1F2022]">{team.centres}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E5E1D8]">
              <span className="text-[#5A5C60]">Opening Capex ({pendingCities.length}/2 cities selected):</span>
              <span className="font-bold text-emerald-700">
                Rs. {newCentreCost} L
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#5A5C60]">Quarterly Showroom Opex (Rs. 8 L / center):</span>
              <span className="font-bold text-[#1F2022]">
                Rs. {totalCentres * CENTRE.opex} L / qtr
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="text-[10px] font-bold uppercase text-[#7B8585]">
              Pick up to 2 markets to enter this quarter
            </div>
            {MARKETS.map((market) => {
              const owned = ownedCities.includes(market.id);
              const pending = pendingCities.includes(market.id);
              const rivals = otherTeams.filter((t) => (t.storeCities || []).includes(market.id));
              const disabled = isLocked || owned || (!pending && pendingCities.length >= 2);
              return (
                <label
                  key={market.id}
                  className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border text-xs ${
                    owned
                      ? "bg-emerald-50 border-emerald-200"
                      : pending
                      ? "bg-amber-50 border-amber-300"
                      : "bg-[#FAF8F5] border-[#E0DCD3]"
                  } ${disabled && !owned && !pending ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={owned || pending}
                      disabled={disabled}
                      onChange={() => handleToggleCity(market.id)}
                      className="accent-emerald-700"
                    />
                    <div>
                      <div className="font-bold text-[#1F2022]">{market.city}</div>
                      <div className="text-[10px] text-[#5A5C60]">
                        {market.region} · {(market.marketSize / 1000).toFixed(0)}k units/yr
                        {rivals.length > 0 && <span className="text-red-600 font-semibold"> · {rivals.length} rival{rivals.length > 1 ? "s" : ""} here</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {owned ? (
                      <span className="text-[10px] font-bold text-emerald-700">Owned</span>
                    ) : (
                      <span className="font-bold text-[#1F2022]">Rs. {market.entryCost} L</span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* D2C E-Commerce Direct Channel */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E5E1D8] pb-3">
            <Smartphone className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-[#1F2022]">
              Direct-to-Consumer (D2C) Digital Web Store
            </h3>
          </div>

          <p className="text-xs text-[#5A5C60]">
            Enable direct online vehicle reservations, customized configuration, and digital order processing.
          </p>

          <div className="p-4 bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-bold text-[#1F2022] flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-indigo-600" /> Online Web Storefront
              </div>
              <div className="text-[11px] text-[#5A5C60]">
                Setup: Rs. 15 L one-time / Opex: Rs. 5 L / Qtr (+12% Reach Boost)
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isWebStoreActive}
                disabled={isLocked}
                onChange={(e) => handleWebStoreToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#E0DCD3] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="text-xs font-mono text-[#5A5C60] flex justify-between py-1">
            <span>Digital Channel Status:</span>
            <span className={`font-bold ${isWebStoreActive ? "text-indigo-600" : "text-[#5A5C60]"}`}>
              {isWebStoreActive ? "Active (D2C Direct Orders Enabled)" : "Disabled"}
            </span>
          </div>
        </div>
      </div>

      {/* Sales Staffing & Compensation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sales Staff Headcount */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E5E1D8] pb-3">
            <Users className="w-5 h-5 text-emerald-700" />
            <h3 className="text-base font-bold text-[#1F2022]">
              Sales & Service Staff Headcount
            </h3>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-[#E5E1D8]">
              <span className="text-[#5A5C60]">Current Sales Headcount:</span>
              <span className="font-bold text-[#1F2022]">{team.staff}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#E5E1D8]">
              <span className="text-[#5A5C60]">Hire (+) or Release (-) Staff:</span>
              <input
                type="number"
                min={-team.staff}
                max={60}
                value={team.dec.hire || 0}
                disabled={isLocked}
                onChange={(e) => handleHireChange(+e.target.value)}
                className="w-20 p-1.5 text-right border border-[#E0DCD3] rounded-lg font-bold text-[#1F2022] bg-[#FAF8F5]"
              />
            </div>
            <div className="flex justify-between py-1 border-b border-[#E5E1D8]">
              <span className="text-[#5A5C60]">Projected Total Headcount:</span>
              <span className={`font-bold ${totalStaff > maxStaffAllowed ? "text-red-600" : "text-emerald-700"}`}>
                {totalStaff} / Max {maxStaffAllowed} allowed (8 per center)
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#5A5C60]">Payroll Cost (Rs. 3.5 L/head):</span>
              <span className="font-bold text-[#1F2022]">
                Rs. {(totalStaff * HR.salesCost * (team.hr.sales / 100)).toFixed(1)} L / qtr
              </span>
            </div>
          </div>
        </div>

        {/* HR Compensation Packages */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E5E1D8] pb-3">
            <Award className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-[#1F2022]">
              HR Compensation Packages (% Benchmark)
            </h3>
          </div>

          <div className="space-y-4">
            <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E5E1D8] text-[11px] text-[#5A5C60]">
              Sales staff pay ({team.hr.sales}% · x{hrM.sales.toFixed(2)} productivity) is set via the compensation package builder in Sales Force Manager above.
            </div>

            <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E5E1D8]">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono font-bold uppercase text-[#5A5C60]">
                  Plant Workers Pay Package
                </label>
                <span className="text-xs font-bold font-mono text-emerald-700">
                  {team.hr.plant}%
                </span>
              </div>
              <input
                type="range"
                min={HR.min}
                max={HR.max}
                value={team.hr.plant}
                disabled={isLocked}
                onChange={(e) => handleHRChange("plant", +e.target.value)}
                className="w-full accent-emerald-700"
              />
              <div className="text-[11px] text-[#5A5C60] mt-1 font-mono">
                Plant Productivity Multiplier: <strong>x{hrM.plant.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

