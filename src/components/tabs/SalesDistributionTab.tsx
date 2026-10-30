import React from "react";
import { TeamState, GameState } from "../../types/simulation";
import { CENTRE, MARKETS, WEB_STORE, fmtRs } from "../../engine/catalog";
import { reachOf, hrMults, centreOpenCost, withWebStore, cityOccupancy, payrollOf, payFactorsOf } from "../../engine/simulationEngine";
import { Store, Users, MapPin, DollarSign, Award, ShoppingBag, CheckCircle, Smartphone } from "lucide-react";
import { SectionTabs } from "../SectionTabs";
import MarketNetworkMap from "../MarketNetworkMap";
import SalesForceManager from "../SalesForceManager";
import SalesPricingPanel from "../SalesPricingPanel";

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

  const totalCentres = team.centres + (team.dec.newCentres || 0);
  const totalStaff = team.staff + (team.dec.hire || 0);
  const maxStaffAllowed = 8 * totalCentres;

  const isWebStoreActive = !!team.dec.webStore;
  const hrM = hrMults(gameState, team);

  const newCentreCost = centreOpenCost(pendingCities);

  // Reach the engine will compute once pending cities open: every store counts as a centre,
  // and each city's bonus is split between all teams present (this one included).
  const reachFor = (cities: string[]) => {
    const all = [...ownedCities, ...cities.filter((id) => !ownedCities.includes(id))];
    const bonus = all.reduce((sum, id) => {
      const m = MARKETS.find((x) => x.id === id);
      if (!m) return sum;
      const occupants = cityOccupancy(gameState, id) + (ownedCities.includes(id) ? 0 : 1);
      return sum + m.demandBonus / Math.max(1, occupants);
    }, 0);
    return withWebStore(reachOf({ centres: all.length, staff: totalStaff }, hrM.sales, bonus), team);
  };
  const projectedReach = reachFor(pendingCities);
  const [drawer, setDrawer] = React.useState<"force" | "channels" | "staffing">("force");

  const kpis = [
    { label: "Projected reach", value: `${(projectedReach * 100).toFixed(0)}%`, note: "share of buyers who can find you", tone: "text-emerald-700" },
    { label: "Stores", value: `${ownedCities.length}${pendingCities.length ? ` + ${pendingCities.length}` : ""}`, note: pendingCities.length ? "opening this quarter" : "experience centres", tone: "text-[#1F2022]" },
    { label: "Sales staff", value: `${totalStaff}`, note: `max ${maxStaffAllowed} (8 per store)`, tone: totalStaff > maxStaffAllowed ? "text-red-600" : "text-[#1F2022]" },
    { label: "Entry capex", value: `Rs. ${newCentreCost} L`, note: `+ Rs. ${totalCentres * CENTRE.opex} L store opex a quarter`, tone: "text-[#1F2022]" }
  ];

  return (
    <div className="space-y-4 text-[#1F2022] font-sans">
      {gameState.quarter === 1 && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-xs text-amber-900">
          <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong>Quarter 1 is a setup quarter.</strong> Pick the markets you're entering, size your sales staff, and lock in production capacity now.
            Store opex, payroll and capex still apply this quarter, but no revenue is generated yet — actual market entry and sales begin in Quarter 2.
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {kpis.map((k) => (
          <div key={k.label} className="px-3 py-2.5 bg-white rounded-xl border border-[#E5E1D8] shadow-sm">
            <div className="text-[11px] text-[#6C6D70]">{k.label}</div>
            <div className={`text-base font-bold font-mono ${k.tone}`}>{k.value}</div>
            <div className="text-[10px] text-[#8A8C90] truncate">{k.note}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm p-3 space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Store className="w-4 h-4 text-[#5A5C60]" />
          <h3 className="text-sm font-bold text-[#1F2022]">Market network</h3>
          <span className="text-[11px] text-[#6C6D70]">Select a city to inspect it and enter up to two new markets a quarter.</span>
        </div>
        <MarketNetworkMap
          team={team}
          gameState={gameState}
          isLocked={isLocked}
          onToggleCity={handleToggleCity}
          reachWith={(id: string) => reachFor(pendingCities.includes(id) ? pendingCities : [...pendingCities, id])}
          reachWithout={(id: string) => reachFor(pendingCities.filter((x) => x !== id))}
        />
      </div>

      <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-sm">
        <div className="px-4 pt-3">
          <SectionTabs
            ariaLabel="Sales decisions"
            active={drawer}
            onChange={setDrawer}
            groups={[
              { label: "People", tabs: [{ key: "force", label: "Sales force" }, { key: "staffing", label: "Headcount & pay" }] },
              { label: "Channels", tabs: [{ key: "channels", label: "Web store & pricing" }] }
            ]}
          />
        </div>
        <div className="p-4 drawer-flat">
          {drawer === "force" && <SalesForceManager team={team} gameState={gameState} />}
          {drawer === "channels" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-[#E5E1D8] space-y-4">
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
                {team.webStoreSetupPaid ? "Setup paid" : `Setup: Rs. ${WEB_STORE.setup} L one-time`} / Running cost: Rs. {WEB_STORE.opex} L / Qtr (+{Math.round(WEB_STORE.reach * 100)} points of reach)
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
              <SalesPricingPanel team={team} />
            </div>
          )}
          {drawer === "staffing" && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sales Staff Headcount */}
        <div className="p-4 rounded-xl border border-[#E5E1D8] space-y-4">
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
              <span className="text-[#5A5C60]">Payroll cost (from your HR package):</span>
              <span className="font-bold text-[#1F2022]">
                Rs. {payrollOf(team, totalStaff).sales.toFixed(1)} L / qtr
              </span>
            </div>
          </div>
        </div>

        {/* Pay is set once, on the HR screen */}
        <div className="p-4 rounded-xl border border-[#E5E1D8] space-y-3">
          <div className="flex items-center gap-2 border-b border-[#E5E1D8] pb-3">
            <Award className="w-5 h-5 text-[#5A5C60]" />
            <h3 className="text-base font-bold text-[#1F2022]">Pay and productivity</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { label: "Sales force", mult: hrM.sales, factor: payFactorsOf(team).sales, cost: payrollOf(team, totalStaff).sales },
              { label: "Plant workforce", mult: hrM.plant, factor: payFactorsOf(team).plant, cost: payrollOf(team, totalStaff).plant }
            ].map((r) => (
              <div key={r.label} className="p-3 rounded-lg bg-[#FAF8F5] border border-[#EFEBE3]">
                <div className="text-[11px] text-[#6C6D70]">{r.label}</div>
                <div className={`text-lg font-bold font-mono ${r.mult >= 1 ? "text-emerald-700" : "text-amber-700"}`}>x{r.mult.toFixed(2)}</div>
                <div className="text-[10px] text-[#8A8C90]">
                  pay {Math.round(r.factor * 100)}% of default · Rs. {r.cost.toFixed(1)} L / qtr
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#5A5C60]">
            Both packages are set on the <strong>HR</strong> screen. A package drives productivity relative to the industry and its payroll cost.
          </p>
        </div>
      </div>
          )}
        </div>
      </div>
    </div>
  );
};
