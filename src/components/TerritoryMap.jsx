import React, { useState } from "react";
import { Globe2, MapPin, Radio, Users } from "lucide-react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import worldTopoJson from "world-atlas/countries-110m.json";
import { MARKETS } from "../engine/catalog";

const regions = ["All regions", ...new Set(MARKETS.map((m) => m.region))];
const colors = { owned: "#17804f", competitor: "#c83e2b", pending: "#c77d0a", open: "#7b8585" };

export default function TerritoryMap({ team, gameState }) {
  const [selected, setSelected] = useState(MARKETS[0]);
  const [region, setRegion] = useState("All regions");

  const teams = gameState?.teams || (team ? [team] : []);
  const visibleMarkets = MARKETS.filter((m) => region === "All regions" || m.region === region);

  const ownersOf = (marketId) => teams.filter((t) => (t.storeCities || []).includes(marketId));
  const statusOf = (market) => {
    if ((team?.storeCities || []).includes(market.id)) return "owned";
    if ((team?.dec?.newCentreCities || []).includes(market.id)) return "pending";
    return ownersOf(market.id).length > 0 ? "competitor" : "open";
  };

  const selectedOwners = ownersOf(selected.id).filter((t) => t !== team);
  const statusLabel = { owned: "Your store", pending: "Opening this quarter", competitor: "Rival store present", open: "Unoccupied territory" };

  return <section className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5E1D8] pb-3">
      <div className="flex items-center gap-2"><Globe2 className="w-5 h-5 text-indigo-600" /><div><h3 className="text-base font-bold text-[#1F2022]">Global Territory Map</h3><p className="text-xs text-[#5A5C60]">Live view of your stores and real rival teams' stores. Select a market to inspect it.</p></div></div>
      <select value={region} onChange={(event) => setRegion(event.target.value)} className="rounded-lg border border-[#E0DCD3] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold text-[#1F2022]">{regions.map((item) => <option key={item}>{item}</option>)}</select>
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_260px] gap-4">
      <div className="overflow-hidden rounded-xl border border-[#D8E0DE] bg-[#FAF8F5]">
        <div role="img" aria-label="Interactive world map of EV store territories" className="w-full min-h-[280px]">
          <ComposableMap projection="geoNaturalEarth1" projectionConfig={{ scale: 150 }} style={{ width: "100%", height: "auto" }}>
            <Geographies geography={worldTopoJson}>
              {({ geographies }) => geographies.map((geo) => <Geography key={geo.rsmKey} geography={geo} fill="#EDE9DD" stroke="#E5E1D8" strokeWidth={0.6} style={{ default: { outline: "none" }, hover: { outline: "none", fill: "#E5E1D8" }, pressed: { outline: "none" } }} />)}
            </Geographies>
            {visibleMarkets.map((market) => { const status = statusOf(market); const isSelected = selected.id === market.id; return <Marker key={market.id} coordinates={[market.lon, market.lat]} onClick={() => setSelected(market)} style={{ default: { cursor: "pointer" }, hover: { cursor: "pointer" }, pressed: { cursor: "pointer" } }}><circle r={isSelected ? 6 : 4.5} fill={colors[status]} stroke="white" strokeWidth={1.5} /><circle r={9} fill="none" stroke={colors[status]} strokeWidth={1.5} opacity={isSelected ? 0.7 : 0} /><title>{market.city}: {statusLabel[status]}</title></Marker>; })}
          </ComposableMap>
        </div>
        <div className="flex flex-wrap gap-4 border-t border-[#D8E0DE] bg-white px-4 py-3 text-[11px] font-semibold text-[#5A5C60]"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#17804f]" />Owned</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#c77d0a]" />Opening</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#7b8585]" />Unoccupied</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#c83e2b]" />Rival present</span></div>
      </div>
      <div className="rounded-xl border border-[#E0DCD3] bg-[#FAF8F5] p-4 space-y-4" aria-live="polite">
        <div><div className="text-[10px] font-mono font-bold uppercase tracking-wide text-[#7B8585]">{selected.region}</div><h4 className="mt-1 text-lg font-bold text-[#1F2022]">{selected.city}</h4></div>
        <div className="flex items-center gap-2 text-xs font-bold" style={{ color: colors[statusOf(selected)] }}><Radio className="h-4 w-4" />{statusLabel[statusOf(selected)]}</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white p-3"><div className="text-[10px] text-[#7B8585]">Market size</div><div className="mt-1 font-mono text-sm font-bold text-[#1F2022]">{(selected.marketSize / 1000).toFixed(0)}k</div><div className="text-[10px] text-[#7B8585]">EV units / year</div></div>
          <div className="rounded-lg bg-white p-3"><div className="text-[10px] text-[#7B8585]">Entry cost</div><div className="mt-1 font-mono text-sm font-bold text-[#1F2022]">Rs. {selected.entryCost} L</div><div className="text-[10px] text-[#7B8585]">one-time</div></div>
        </div>
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase text-[#7B8585] flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Teams present ({ownersOf(selected.id).length})</div>
          {ownersOf(selected.id).length === 0 ? <p className="text-xs text-[#5A5C60]">No team has opened a store here yet.</p> : <ul className="text-xs text-[#3f4545] space-y-1">
            {ownersOf(selected.id).map((t) => <li key={t.i} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: t.color }} />{t === team ? "Your team" : t.name}</li>)}
          </ul>}
        </div>
        <div className="flex items-center gap-2 border-t border-[#E0DCD3] pt-3 text-[11px] text-[#5A5C60]"><MapPin className="h-4 w-4 text-indigo-600" />Open new stores from the Distribution tab decision panel.</div>
      </div>
    </div>
  </section>;
}
