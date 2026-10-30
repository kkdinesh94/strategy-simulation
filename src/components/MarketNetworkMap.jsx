import React, { useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import worldTopoJson from "world-atlas/countries-110m.json";
import { Lock, MapPin, Plus, Users, X } from "lucide-react";
import { CENTRE, MARKETS } from "../engine/catalog";

const COLORS = { owned: "#17804f", pending: "#c77d0a", competitor: "#c83e2b", open: "#7b8585" };
const STATUS_LABEL = { owned: "Your store", pending: "Opening this quarter", competitor: "Rivals here, you are not", open: "No one here yet" };
const REGIONS = ["All", ...new Set(MARKETS.map((m) => m.region))];
const maxSize = Math.max(...MARKETS.map((m) => m.marketSize));

// Frame the map on a region: centre on its markets and zoom to their spread
function framing(region) {
  if (region === "All") return { rotate: [-12, 0, 0], center: [0, 12], scale: 165 };
  const ms = MARKETS.filter((m) => m.region === region);
  const lon = ms.reduce((x, m) => x + m.lon, 0) / ms.length;
  const lat = ms.reduce((x, m) => x + m.lat, 0) / ms.length;
  const span = Math.max(14, ...ms.map((m) => Math.abs(m.lon - lon) * 2), ...ms.map((m) => Math.abs(m.lat - lat) * 3));
  return { rotate: [-lon, 0, 0], center: [0, lat], scale: Math.min(1100, 9000 / span) };
}

/**
 * World map where market entry is decided. Markers are sized by market volume and ringed by the
 * teams already present; the inspector shows what entering would add to reach, using the engine's
 * own rule that a city's reach bonus is split between every team in it.
 */
export default function MarketNetworkMap({ team, gameState, isLocked, maxNew = 2, onToggleCity, reachWith, reachWithout }) {
  const owned = team.storeCities || [];
  const pending = team.dec.newCentreCities || [];
  const [selectedId, setSelectedId] = useState(() => pending[0] || MARKETS.find((m) => !owned.includes(m.id))?.id || MARKETS[0].id);
  const [region, setRegion] = useState("All");
  const selected = MARKETS.find((m) => m.id === selectedId) || MARKETS[0];
  const teams = gameState.teams || [];

  const ownersOf = (id) => teams.filter((t) => (t.storeCities || []).includes(id));
  const statusOf = (m) => (owned.includes(m.id) ? "owned" : pending.includes(m.id) ? "pending" : ownersOf(m.id).length ? "competitor" : "open");
  const status = statusOf(selected);
  const rivalsHere = ownersOf(selected.id).filter((t) => t.i !== team.i);
  const occupantsAfter = ownersOf(selected.id).length + (owned.includes(selected.id) ? 0 : 1);
  const bonusShare = selected.demandBonus / Math.max(1, occupantsAfter);
  const reachBefore = reachWithout(selected.id);
  const reachAfter = reachWith(selected.id);
  const slotsLeft = maxNew - pending.length;
  const canEnter = !isLocked && status !== "owned" && (status === "pending" || slotsLeft > 0);


  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-3">
      <div className="rounded-xl border border-[#E5E1D8] bg-[#F4F7F8] overflow-hidden min-w-0">
        <div className="flex flex-wrap items-center gap-1 px-3 pt-3">
          {REGIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRegion(r)}
              className={`px-2.5 py-1 rounded-full text-[11px] border transition ${region === r ? "bg-[#1F2022] text-white border-[#1F2022]" : "bg-white text-[#5A5C60] border-[#E0DCD3] hover:text-[#1F2022]"}`}
            >
              {r}
            </button>
          ))}
        </div>
        <ComposableMap key={region} projection="geoNaturalEarth1" width={800} height={420} projectionConfig={framing(region)} style={{ width: "100%", height: "auto" }} aria-label="World map of markets">
          <Geographies geography={worldTopoJson}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#E4E0D6"
                  stroke="#F4F7F8"
                  strokeWidth={0.5}
                  style={{ default: { outline: "none" }, hover: { outline: "none", fill: "#DAD5C9" }, pressed: { outline: "none" } }}
                />
              ))
            }
          </Geographies>
          {MARKETS.map((m) => {
            const st = statusOf(m);
            const zoom = framing(region).scale / 165;
            const r = (4 + 8 * Math.sqrt(m.marketSize / maxSize)) * Math.min(1.6, Math.max(1, zoom / 3));
            const showLabel = region !== "All" || m.id === selected.id;
            const isSel = m.id === selected.id;
            const present = ownersOf(m.id);
            return (
              <Marker key={m.id} coordinates={[m.lon, m.lat]} onClick={() => setSelectedId(m.id)} style={{ default: { cursor: "pointer" }, hover: { cursor: "pointer" }, pressed: { cursor: "pointer" } }}>
                {isSel && <circle r={r + 7} fill="none" stroke="#1F2022" strokeWidth={1.5} strokeDasharray="3 2" />}
                <circle r={r} fill={COLORS[st]} fillOpacity={st === "open" ? 0.55 : 0.9} stroke="white" strokeWidth={1.5} />
                {st === "pending" && <circle r={r + 3} fill="none" stroke={COLORS.pending} strokeWidth={1.5} className="animate-ping" style={{ transformOrigin: "center", transformBox: "fill-box" }} />}
                {present.map((t, i) => {
                  const a = (i / Math.max(1, present.length)) * Math.PI * 2 - Math.PI / 2;
                  return <circle key={t.i} cx={(r + 3.5) * Math.cos(a)} cy={(r + 3.5) * Math.sin(a)} r={2.4} fill={t.color} stroke="white" strokeWidth={0.8} />;
                })}
                {showLabel && <text y={-r - 6} textAnchor="middle" style={{ fontSize: region === "All" ? 9 : 11, fontWeight: isSel ? 700 : 500, fill: "#1F2022", pointerEvents: "none" }}>
                  {m.city}
                </text>}
                <title>
                  {m.city}: {STATUS_LABEL[st]}
                </title>
              </Marker>
            );
          })}
        </ComposableMap>
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[#E5E1D8] bg-white px-3 py-2 text-[11px] text-[#5A5C60]">
          {Object.entries(COLORS).map(([k, c]) => (
            <span key={k} className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
              {{ owned: "Yours", pending: "Opening", competitor: "Rivals only", open: "Unoccupied" }[k]}
            </span>
          ))}
          <span className="ml-auto">Size = EV units a year · small dots = teams present</span>
        </div>
      </div>

      {/* Inspector */}
      <div className="rounded-xl border border-[#E5E1D8] bg-white p-4 flex flex-col gap-3" aria-live="polite">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-[#8A8C90]">{selected.region}</div>
          <h4 className="text-lg font-bold text-[#1F2022] leading-tight">{selected.city}</h4>
          <div className="text-xs font-semibold mt-0.5" style={{ color: COLORS[status] }}>
            {STATUS_LABEL[status]}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-[#FAF8F5] p-2">
            <dt className="text-[10px] text-[#8A8C90]">Market size</dt>
            <dd className="font-mono font-bold">{(selected.marketSize / 1000).toFixed(0)}k / yr</dd>
          </div>
          <div className="rounded-lg bg-[#FAF8F5] p-2">
            <dt className="text-[10px] text-[#8A8C90]">Entry cost</dt>
            <dd className="font-mono font-bold">Rs. {selected.entryCost} L</dd>
          </div>
          <div className="rounded-lg bg-[#FAF8F5] p-2 col-span-2">
            <dt className="text-[10px] text-[#8A8C90]">Bonus per Rs. 10 L of entry cost</dt>
            <dd className="font-mono font-bold">{((bonusShare * 100 * 10) / selected.entryCost).toFixed(2)} pts</dd>
          </div>
          <div className="rounded-lg bg-[#FAF8F5] p-2 col-span-2">
            <dt className="text-[10px] text-[#8A8C90]">Your share of the city's reach bonus</dt>
            <dd className="font-mono font-bold">
              +{(bonusShare * 100).toFixed(1)} pts
              <span className="font-sans font-normal text-[10px] text-[#6C6D70]">
                {" "}
                (+{(selected.demandBonus * 100).toFixed(1)} split {occupantsAfter} way{occupantsAfter > 1 ? "s" : ""})
              </span>
            </dd>
          </div>
        </dl>
        <div className="text-xs">
          <div className="flex items-center justify-between text-[11px] text-[#6C6D70] mb-1">
            <span>{status === "owned" ? "Distribution reach" : "Reach without → with this city"}</span>
            <span className="font-mono">
              {(reachBefore * 100).toFixed(0)}%{reachAfter !== reachBefore && <span className="text-emerald-700"> → {(reachAfter * 100).toFixed(0)}%</span>}
            </span>
          </div>
          <div className="relative h-2 rounded-full bg-[#EDE9E1] overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-emerald-300" style={{ width: `${reachAfter * 100}%` }} />
            <div className="absolute inset-y-0 left-0 bg-emerald-700" style={{ width: `${reachBefore * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-1 text-[11px] text-[#6C6D70] flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> Rivals here ({rivalsHere.length})
          </div>
          {rivalsHere.length === 0 ? (
            <p className="text-[11px] text-[#5A5C60]">None. First in keeps the whole bonus until someone follows.</p>
          ) : (
            <ul className="flex flex-wrap gap-1">
              {rivalsHere.map((t) => (
                <li key={t.i} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FAF8F5] text-[11px]">
                  <i className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                  {t.name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-auto">
          {status === "owned" ? (
            <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Store open since an earlier quarter
            </div>
          ) : (
            <button
              type="button"
              disabled={!canEnter}
              onClick={() => onToggleCity(selected.id)}
              className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-40 ${
                status === "pending" ? "bg-white border border-[#E0DCD3] text-[#1F2022] hover:bg-[#FAF8F5]" : "bg-[#1F2022] text-white hover:bg-[#343538]"
              }`}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : status === "pending" ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {status === "pending" ? "Cancel this entry" : `Enter market · Rs. ${selected.entryCost} L`}
            </button>
          )}
          <p className="text-[10px] text-[#8A8C90] mt-1.5 text-center">
            {pending.length}/{maxNew} new markets this quarter · Rs. {CENTRE.opex} L a quarter to run each store
          </p>
        </div>
      </div>
    </div>
  );
}
