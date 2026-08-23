import React, { useState } from "react";
import { Globe2, MapPin, Radio, Users } from "lucide-react";

const offices = [
  ["Shanghai", "Asia-Pacific", 121.47, 31.23, 420000, "urban commuter 38%, fleet operator 24%, tech pioneer 16%", "0"],
  ["Tokyo", "Asia-Pacific", 139.69, 35.68, 360000, "urban commuter 30%, tech pioneer 24%, fleet operator 20%", null],
  ["Seoul", "Asia-Pacific", 126.98, 37.57, 280000, "tech pioneer 25%, urban commuter 32%, fleet operator 18%", "2"],
  ["Singapore", "Asia-Pacific", 103.82, 1.35, 90000, "fleet operator 28%, urban commuter 26%, eco advocate 16%", null],
  ["Sydney", "Asia-Pacific", 151.21, -33.87, 145000, "eco advocate 22%, urban commuter 28%, tech pioneer 18%", null],
  ["San Francisco", "North America", -122.42, 37.77, 180000, "tech pioneer 28%, eco advocate 20%, performance enthusiast 18%", null],
  ["Los Angeles", "North America", -118.24, 34.05, 310000, "performance enthusiast 20%, tech pioneer 20%, urban commuter 24%", "0"],
  ["Austin", "North America", -97.74, 30.27, 120000, "tech pioneer 22%, fleet operator 20%, eco advocate 18%", null],
  ["New York", "North America", -74.01, 40.71, 440000, "urban commuter 34%, tech pioneer 18%, fleet operator 16%", null],
  ["Toronto", "North America", -79.38, 43.65, 190000, "eco advocate 22%, urban commuter 30%, tech pioneer 18%", "2"],
  ["Amsterdam", "Europe", 4.9, 52.37, 110000, "eco advocate 25%, urban commuter 28%, tech pioneer 18%", null],
  ["Oslo", "Europe", 10.75, 59.91, 70000, "eco advocate 30%, urban commuter 24%, tech pioneer 18%", "0"],
  ["Munich", "Europe", 11.58, 48.14, 170000, "fleet operator 24%, eco advocate 20%, urban commuter 24%", null],
  ["London", "Europe", -0.13, 51.51, 390000, "urban commuter 32%, fleet operator 18%, tech pioneer 18%", null],
  ["Paris", "Europe", 2.35, 48.86, 280000, "urban commuter 30%, eco advocate 24%, performance enthusiast 16%", "2"],
  ["Mumbai", "Emerging Markets", 72.88, 19.08, 520000, "urban commuter 44%, fleet operator 26%, tech pioneer 10%", "0"],
  ["Dubai", "Emerging Markets", 55.27, 25.2, 130000, "performance enthusiast 24%, fleet operator 24%, tech pioneer 20%", null],
  ["São Paulo", "Emerging Markets", -46.63, -23.55, 460000, "urban commuter 40%, fleet operator 25%, tech pioneer 12%", null],
  ["Nairobi", "Emerging Markets", 36.82, -1.29, 85000, "urban commuter 42%, fleet operator 28%, eco advocate 14%", null],
  ["Jakarta", "Emerging Markets", 106.85, -6.21, 390000, "urban commuter 45%, fleet operator 24%, tech pioneer 12%", "2"]
].map(([city, region, lon, lat, marketSize, profile, teamId]) => ({ city, region, lon, lat, marketSize, profile, teamId }));

const regions = ["All regions", "Asia-Pacific", "North America", "Europe", "Emerging Markets"];
const colors = { owned: "#17804f", competitor: "#c83e2b", open: "#7b8585" };
const continents = [
  "M 105 95 L 210 58 L 320 82 L 370 132 L 320 178 L 240 172 L 190 140 L 125 150 Z",
  "M 390 78 L 475 53 L 555 78 L 588 130 L 545 170 L 450 160 L 410 125 Z",
  "M 565 190 L 665 175 L 760 208 L 780 280 L 725 345 L 650 330 L 620 275 L 570 245 Z",
  "M 160 225 L 235 215 L 275 275 L 255 355 L 205 405 L 160 340 L 175 285 Z",
  "M 790 340 L 875 320 L 965 345 L 940 390 L 820 385 Z"
];

export default function TerritoryMap({ team }) {
  const [selected, setSelected] = useState(offices[0]);
  const [region, setRegion] = useState("All regions");
  const activeTeamId = String(team?.i ?? 0);
  const visibleOffices = offices.filter((office) => region === "All regions" || office.region === region);
  const statusOf = (office) => office.teamId === activeTeamId ? "owned" : office.teamId ? "competitor" : "open";
  const point = (office) => ({ x: ((office.lon + 180) / 360) * 1000, y: ((90 - office.lat) / 180) * 440 });

  return <section className="bg-white p-6 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5E1D8] pb-3">
      <div className="flex items-center gap-2"><Globe2 className="w-5 h-5 text-indigo-600" /><div><h3 className="text-base font-bold text-[#1F2022]">Global Territory Map</h3><p className="text-xs text-[#5A5C60]">Select a city to inspect EV market opportunity and office status.</p></div></div>
      <select value={region} onChange={(event) => setRegion(event.target.value)} className="rounded-lg border border-[#E0DCD3] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold text-[#1F2022]">{regions.map((item) => <option key={item}>{item}</option>)}</select>
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_260px] gap-4">
      <div className="overflow-hidden rounded-xl border border-[#D8E0DE] bg-[#eaf2f0]">
        <svg viewBox="0 0 1000 440" role="img" aria-label="Interactive world map of EV sales office territories" className="w-full h-auto min-h-[280px]">
          <rect width="1000" height="440" fill="#eaf2f0" />{continents.map((path) => <path key={path} d={path} fill="#cbd8d3" stroke="#aebdb7" strokeWidth="2" />)}
          {visibleOffices.map((office) => { const { x, y } = point(office); const status = statusOf(office); return <g key={office.city} transform={`translate(${x} ${y})`} onClick={() => setSelected(office)} className="cursor-pointer"><circle r={selected.city === office.city ? 10 : 7} fill={colors[status]} stroke="white" strokeWidth="3" /><circle r="13" fill="none" stroke={colors[status]} strokeWidth="2" opacity={selected.city === office.city ? 0.7 : 0} /><title>{office.city}: {status}</title></g>; })}
        </svg>
        <div className="flex flex-wrap gap-4 border-t border-[#D8E0DE] bg-white px-4 py-3 text-[11px] font-semibold text-[#5A5C60]"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#17804f]" />Owned</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#7b8585]" />Unoccupied</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#c83e2b]" />Competitor</span></div>
      </div>
      <div className="rounded-xl border border-[#E0DCD3] bg-[#FAF8F5] p-4 space-y-4" aria-live="polite"><div><div className="text-[10px] font-mono font-bold uppercase tracking-wide text-[#7B8585]">{selected.region}</div><h4 className="mt-1 text-lg font-bold text-[#1F2022]">{selected.city}</h4></div><div className="flex items-center gap-2 text-xs font-bold" style={{ color: colors[statusOf(selected)] }}><Radio className="h-4 w-4" />{statusOf(selected) === "owned" ? "Owned office" : statusOf(selected) === "competitor" ? "Competitor office" : "Unoccupied territory"}</div><div className="grid grid-cols-2 gap-2"><div className="rounded-lg bg-white p-3"><div className="text-[10px] text-[#7B8585]">Market size</div><div className="mt-1 font-mono text-sm font-bold text-[#1F2022]">{(selected.marketSize / 1000).toFixed(0)}k</div><div className="text-[10px] text-[#7B8585]">EV units / year</div></div><div className="rounded-lg bg-white p-3"><div className="text-[10px] text-[#7B8585]">Sales team</div><div className="mt-1 flex items-center gap-1 font-mono text-sm font-bold text-[#1F2022]"><Users className="h-3.5 w-3.5" />{selected.teamId ? selected.teamId === activeTeamId ? "Your team" : "Rival" : "Open"}</div></div></div><div><div className="mb-1 text-[10px] font-bold uppercase text-[#7B8585]">Segment composition</div><p className="text-xs leading-5 text-[#3f4545]">{selected.profile}</p></div><div className="flex items-center gap-2 border-t border-[#E0DCD3] pt-3 text-[11px] text-[#5A5C60]"><MapPin className="h-4 w-4 text-indigo-600" />{selected.teamId ? "Active office network" : "Available for expansion"}</div></div>
    </div>
  </section>;
}