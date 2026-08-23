import React from "react";
import { TeamState, GameState } from "../../types/simulation";
import { CENTRE, HR, fmtRs } from "../../engine/catalog";
import { reachOf, hrMults } from "../../engine/simulationEngine";
import { Store, Users, MapPin, DollarSign, Award, Globe, ShoppingBag, CheckCircle, Smartphone } from "lucide-react";
import { StoreVisualizer } from "../StoreVisualizer";
import TerritoryMap from "../TerritoryMap";
import SalesForceManager from "../SalesForceManager";
import SalesPricingPanel, { SALES_REGIONS } from "../SalesPricingPanel";

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

  const handleCentresChange = (val: number) => {
    if (isLocked) return;
    onChange({
      ...team,
      dec: {
        ...team.dec,
        newCentres: Math.max(0, Math.min(2, Math.round(val)))
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
  let netReach = reachOf({ centres: totalCentres, staff: totalStaff }, hrM.sales);
  if (isWebStoreActive) {
    netReach = Math.min(0.98, netReach + 0.12); // Digital web store expands reach
  }

  const territories = [
    { name: "Metro North (Delhi-NCR)", hub: "Delhi / Gurugram / Noida", demand: "High Volume, Winter Range & Commuters", cost: "Rs. 40 L / center", status: "Primary Regional Hub" },
    { name: "Metro South (Bengaluru/Chennai)", hub: "Bengaluru / Chennai / Hyd", demand: "High Tech Adoption & Premium Commuters", cost: "Rs. 50 L / center", status: "Primary Regional Hub" },
    { name: "Metro West (Mumbai/Pune)", hub: "Mumbai / Pune / Ahmedabad", demand: "Dense Urban Traffic & Commercial Fleets", cost: "Rs. 45 L / center", status: "Primary Regional Hub" },
    { name: "East & Tier-2 Hubs", hub: "Kolkata / Jaipur / Kochi", demand: "Price Sensitive & Emerging EV Adoption", cost: "Rs. 30 L / center", status: "Expansion Territory" },
    { name: "Global Export Gateway", hub: "Singapore / Dubai / EU Gateway", demand: "Premium Export Duty Cycles & High WTP", cost: "Rs. 80 L / center", status: "Global Export" }
  ];

  return (
    <div className="space-y-6 text-[#1F2022] font-sans">
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

      <TerritoryMap team={team} />

      <SalesForceManager team={team} gameState={gameState} onChange={onChange} />

      <div className="space-y-6">
        {SALES_REGIONS.map((region) => (
          <React.Fragment key={region.id}>
            <SalesPricingPanel team={team} region={region} onChange={onChange} />
          </React.Fragment>
        ))}
      </div>

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
            <div className="flex justify-between items-center py-1 border-b border-[#E5E1D8]">
              <span className="text-[#5A5C60]">Open New Centers This Qtr (Max 2):</span>
              <input
                type="number"
                min={0}
                max={2}
                value={team.dec.newCentres || 0}
                disabled={isLocked}
                onChange={(e) => handleCentresChange(+e.target.value)}
                className="w-20 p-1.5 text-right border border-[#E0DCD3] rounded-lg font-bold text-[#1F2022] bg-[#FAF8F5]"
              />
            </div>
            <div className="flex justify-between py-1 border-b border-[#E5E1D8]">
              <span className="text-[#5A5C60]">Opening Capex (Rs. 40 L / center avg):</span>
              <span className="font-bold text-emerald-700">
                Rs. {(team.dec.newCentres || 0) * CENTRE.open} L
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#5A5C60]">Quarterly Showroom Opex (Rs. 8 L / center):</span>
              <span className="font-bold text-[#1F2022]">
                Rs. {totalCentres * CENTRE.opex} L / qtr
              </span>
            </div>
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
            <div className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#E5E1D8]">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-mono font-bold uppercase text-[#5A5C60]">
                  Sales Staff Pay Package
                </label>
                <span className="text-xs font-bold font-mono text-emerald-700">
                  {team.hr.sales}%
                </span>
              </div>
              <input
                type="range"
                min={HR.min}
                max={HR.max}
                value={team.hr.sales}
                disabled={isLocked}
                onChange={(e) => handleHRChange("sales", +e.target.value)}
                className="w-full accent-emerald-700"
              />
              <div className="text-[11px] text-[#5A5C60] mt-1 font-mono">
                Sales Productivity Multiplier: <strong>x{hrM.sales.toFixed(2)}</strong>
              </div>
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

      {/* Regional Indian & Global Territory Map */}
      <div className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E5E1D8] pb-3">
          <Globe className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-base font-bold text-[#1F2022]">
              Regional Indian Market Territories & Global Export Hubs
            </h3>
            <p className="text-xs text-[#5A5C60]">
              Select territory locations when placing new Experience Centers based on regional demand characteristics.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {territories.map((t, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E5E1D8] space-y-2"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-[#1F2022]">
                  {t.name}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-indigo-50 text-indigo-800 border border-indigo-200 rounded font-semibold">
                  {t.status}
                </span>
              </div>
              <div className="text-xs text-[#1F2022] font-semibold">
                Hub Cities: {t.hub}
              </div>
              <div className="text-[11px] text-[#5A5C60]">{t.demand}</div>
              <div className="text-[10px] font-mono font-bold text-emerald-700 pt-1 border-t border-[#E0DCD3]">
                Setup Cost: {t.cost}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

