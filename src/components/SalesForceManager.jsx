import React from "react";
import { MapPin, Users, Info } from "lucide-react";
import { MARKETS } from "../engine/catalog";
import { hrMults, payPackageOf, payrollOf } from "../engine/simulationEngine";

const numberOr = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

/**
 * Where the sales force works and what it costs. Pay itself is set once, on the HR screen,
 * whose package drives both productivity and payroll.
 */
export default function SalesForceManager({ team, gameState }) {
  const totalStaff = Math.max(0, numberOr(team?.staff, 0) + numberOr(team?.dec?.hire, 0));
  const score = hrMults(gameState, team).sales;
  const payroll = payrollOf(team, totalStaff).sales;
  const pkg = payPackageOf(team, "sales");

  const ownedCities = team?.storeCities || [];
  const pendingCities = team?.dec?.newCentreCities || [];
  const offices = MARKETS.filter((m) => ownedCities.includes(m.id) || pendingCities.includes(m.id)).map((m) => ({
    ...m,
    status: ownedCities.includes(m.id) ? "Operating" : "Opening this quarter"
  }));
  const staffPerOffice = offices.length > 0 ? Math.round(totalStaff / offices.length) : totalStaff;

  return (
    <section className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-5">
      <div className="flex items-start justify-between gap-4 border-b border-[#E5E1D8] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#5A5C60]" />
            <h3 className="text-base font-bold">Sales force</h3>
          </div>
          <p className="text-xs text-[#5A5C60] mt-1">
            {totalStaff} salespeople across {offices.length} store{offices.length === 1 ? "" : "s"}, about {staffPerOffice} a store.
          </p>
        </div>
        <div className="flex gap-4 text-right font-mono">
          <div>
            <div className="text-[10px] text-[#5A5C60]">Productivity</div>
            <div className={`text-xl font-bold ${score >= 1 ? "text-emerald-700" : "text-amber-700"}`}>{score.toFixed(2)}x</div>
          </div>
          <div>
            <div className="text-[10px] text-[#5A5C60]">Payroll / qtr</div>
            <div className="text-xl font-bold text-[#1F2022]">Rs. {payroll.toFixed(1)} L</div>
          </div>
        </div>
      </div>

      {offices.length === 0 ? (
        <p className="text-xs text-[#5A5C60]">No stores opened yet. Pick markets on the map above.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {offices.map((office) => (
            <div key={office.id} className={`p-3 rounded-xl border text-xs ${office.status === "Operating" ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-300"}`}>
              <div className="font-bold text-[#1F2022] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                {office.city}
              </div>
              <div className="text-[10px] text-[#5A5C60]">{office.region}</div>
              <div className="text-[10px] font-semibold mt-1" style={{ color: office.status === "Operating" ? "#047857" : "#B45309" }}>
                {office.status}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-3 bg-[#FAF8F5] border border-[#E5E1D8] rounded-xl text-xs text-[#3F4145] flex gap-2">
        <Info className="w-4 h-4 shrink-0 text-[#5A5C60]" />
        <span>
          Pay package: Rs. {numberOr(pkg.salary, 0).toFixed(1)} L base, {pkg.benefits}% benefits, {pkg.bonus}% bonus, {pkg.vacation} days' leave. Set it on the <strong>HR</strong> screen:
          it decides both how much reach each salesperson adds and what the payroll costs.
        </span>
      </div>
    </section>
  );
}
